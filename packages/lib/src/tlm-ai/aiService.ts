import OpenAI from 'openai';
import { OasTlmConfig } from '../config/config.types.js';
import { agent } from './agent.js';
import { ConversationNotFoundError } from './exceptions.js';
import { configureAiTools, getAiToolMetadata, type AiToolInfo } from './tools.js';

export type Message = { role: 'user' | 'assistant' | 'function'; content: string; timestamp: string };
type Conversation = { id: string; messages: any[]; name?: string };

export function getVisibleConversationMessages(messages: any[]): Message[] {
    const visible: Message[] = [];
    messages.forEach((message, index) => {
        if (message.role === 'user' && typeof message.content === 'string') {
            visible.push({ role: 'user', content: message.content, timestamp: new Date().toISOString() });
            return;
        }

        if (message.type === 'message' && message.role === 'assistant') {
            const content = (message.content || [])
                .filter((part: any) => part.type === 'output_text')
                .map((part: any) => part.text)
                .join('');
            if (content) visible.push({ role: 'assistant', content, timestamp: new Date().toISOString() });
            return;
        }

        if (message.type !== 'function_call_output') return;

        const toolCall = [...messages].slice(0, index).reverse().find(candidate =>
            candidate.type === 'function_call' && candidate.call_id === message.call_id
        );
        let parameters: unknown = {};
        let result: unknown = message.output || null;

        try {
            parameters = toolCall?.arguments ? JSON.parse(toolCall.arguments) : {};
        } catch { /* Keep the raw arguments out of the UI if malformed. */ }
        try {
            result = message.output ? JSON.parse(message.output) : null;
        } catch { /* Keep non-JSON tool output as text. */ }

        visible.push({
            role: 'function',
            content: JSON.stringify({
                tool: toolCall?.name || 'telemetría',
                parameters,
                result,
            }),
            timestamp: new Date().toISOString(),
        });
    });
    return visible;
}

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

    async sendMessage(conversationId: string, content: string, model?: string, allowedTools?: string[]): Promise<Message[]> {
        const conversation = this.conversations.get(conversationId);
        if (!conversation) throw new ConversationNotFoundError();
        conversation.messages.push({
            role: 'system',
            content: `You are the OAS Telemetry assistant embedded inside a host API. OAS Telemetry is a library that monitors the host application; it is not the main application. Treat the host application's OpenAPI, traces, metrics, and logs as the primary subject. Use listApplicationEndpoints and getApplicationEndpointDetails for the host API. Use getMetricSummary once for a general overview and to find available metric names, then use getMetricData for values from one exact metric. Use getTraces for request/span questions and getLogs for log questions. When a log contains a traceId, call getLogs with that traceId and getTraces with that traceId; do not pass log fields such as message, severityText, or service to getTraces. When no date range is specified, pass null dates; never invent or copy dates from tool descriptions. For relative ranges, call getCurrentDate first. After collecting related logs and traces, explain what they show, correlate them, and give a cautious conclusion instead of only repeating the fields. If the request succeeded but an error was logged, say explicitly whether the error appears handled or whether the data is insufficient to know. When getTraces returns truncated=true, call it again with offset=nextOffset; never claim a page contains traces you did not receive. Use the telemetry status and control tools only when the user explicitly asks about telemetry collection. Do not repeat a tool call unless the previous result was empty, failed, or the user asks to try again. Clearly distinguish host application data from telemetry-library data. Do not invent telemetry values. Reply in the same language as the question. Conversation ID: ${conversationId}.`
        });
        if (this.extraPrompts.length > 0) {
            this.extraPrompts.forEach(prompt => {
                conversation.messages.push({ role: 'system', content: prompt });
            });
        }
        if (allowedTools?.length) {
            conversation.messages.push({
                role: 'system',
                content: `For this request, only use these explicitly enabled tools: ${allowedTools.join(', ')}. Do not use any other tool.`
            });
        }

        conversation.messages.push({ role: 'user', content });
        // Set conversation name if not set
        if (!('name' in conversation) || !conversation.name) {
            conversation.name = content.slice(0, 30);
        }
        
        // Use the agent function with tools
        // Internaly pushes new messages to conversation.messages
        const currentMessagesCount = conversation.messages.length
        await agent(this.openai, conversation.messages, model || this.model, allowedTools);

        // Hides some messages from the UI, like system messages and empty messages
        return getVisibleConversationMessages(conversation.messages.slice(currentMessagesCount));
    }

    listConversationsMinimal(): { id: string; name?: string }[] {
        return Array.from(this.conversations.values()).map(c => ({
            id: c.id,
            name: c.name,
        }));
    }

    listAvailableTools(): AiToolInfo[] {
        return getAiToolMetadata();
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
    configureAiTools(config);
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
