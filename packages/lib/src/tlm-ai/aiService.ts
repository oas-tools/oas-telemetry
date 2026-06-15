import OpenAI from 'openai';
import { OasTlmConfig } from '../config/config.types.js';
import { agent } from './agent.js';
import { ConversationNotFoundError } from './exceptions.js';

type Message = { role: 'user' | 'assistant' | 'function' | 'system'; content: string; name?: string; timestamp: string };
type Conversation = { id: string; messages: Message[]; name?: string };

class AIService {
    private conversations: Map<string, Conversation> = new Map();
    private openai: OpenAI;
    private model: string;
    private extraPrompts: string[];

    constructor(private config: { apiKey: string; model: string; extraPrompts?: string[] }) {
        this.openai = new OpenAI({
            apiKey: this.config.apiKey,
        });
        this.model = config.model;
        this.extraPrompts = config.extraPrompts || [];
    }

    createConversation(): Conversation {
        const id = Math.random().toString(36).substring(2, 15);
        const conversation: Conversation = { id, messages: [] };
        this.conversations.set(id, conversation);
        return conversation;
    }

    listConversations(): Conversation[] {
        return Array.from(this.conversations.values());
    }

    getConversation(id: string): Conversation | undefined {
        return this.conversations.get(id);
    }

    deleteConversation(id: string): boolean {
        return this.conversations.delete(id);
    }

    async sendMessage(conversationId: string, content: string, model?: string): Promise<Message[]> {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) throw new ConversationNotFoundError();
        conversation.messages.push({
            role: 'system',
            timestamp: new Date().toISOString(),
            content: "This is a telemetry chat. Focus your replies strictly on the topics and instructions defined by the system prompts and the available tools. Do not answer outside of these boundaries. Reply in the same language as the question."
        });
        if (this.extraPrompts.length > 0) {
            this.extraPrompts.forEach(prompt => {
                conversation.messages.push({ role: 'system', content: prompt, timestamp: new Date().toISOString() });
            });
        }

        conversation.messages.push({ role: 'user', content, timestamp: new Date().toISOString() });
        // Set conversation name if not set
        if (!('name' in conversation) || !conversation.name) {
            conversation.name = content.slice(0, 30);
        }
        
        // Use the agent function with tools
        // Internaly pushes new messages to conversation.messages
        const currentMessagesCount = conversation.messages.length
        await agent(this.openai, conversation.messages, model || this.model);

        // Return the last assistant message (the one just added by agent)
        const generatedMessages = conversation.messages.slice(currentMessagesCount);
        return generatedMessages;
    }

    listConversationsMinimal(): { id: string; name?: string }[] {
        return Array.from(this.conversations.values()).map(c => ({
            id: c.id,
            name: c.name,
        }));
    }

    async listModels(): Promise<string[]> {
        const { data } = await this.openai.models.list();
        return data
            .map(m => m.id)
            .sort();
    }


    async isValidModel(modelId: string): Promise<boolean> {
        try {
            await this.openai.models.retrieve(modelId);
            return true;
        } catch {
            return false;
        }
    }

}

let aiService: AIService;

export function configureAiService(config: OasTlmConfig) {
    const openAIKey = config.ai?.openAIKey;
    const model = config.ai.openAIModel;
    const extraPrompts = config.ai.extraContextPrompts;
    if (!openAIKey) throw new Error('OpenAI API key is required');
    aiService = new AIService({
        apiKey: openAIKey,
        model,
        extraPrompts
    });
}

export function getAiService() {
    if (!aiService) throw new Error('AI Service not configured');
    return aiService;
}
