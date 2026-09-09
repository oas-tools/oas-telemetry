import { Request, Response } from 'express';
import { getAiService, getVisibleConversationMessages } from './aiService.js';
import { ConversationNotFoundError } from './exceptions.js';
import logger from '../utils/logger.js';

export async function createConversation(req: Request, res: Response) {
    try {
        const conversation = getAiService().createConversation();
        res.status(201).json(conversation);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function listConversations(req: Request, res: Response) {
    try {
        // Only return id and name for each conversation
        const conversations = getAiService().listConversationsMinimal();
        res.json(conversations);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export function listAvailableTools(req: Request, res: Response) {
    try {
        res.json(getAiService().listAvailableTools());
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function getConversationHistory(req: Request, res: Response) {
    try {
        const conversationId = req.params.conversationId as string;
        const conversation = getAiService().getConversation(conversationId);
        if (!conversation) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        // Tool-call messages are internal model context. The UI only renders
        // user messages and assistant messages containing visible text.
        res.json({ ...conversation, messages: getVisibleConversationMessages(conversation.messages) });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function deleteConversation(req: Request, res: Response) {
    try {
        const conversationId = req.params.conversationId as string;
        const deleted = getAiService().deleteConversation(conversationId);
        if (!deleted) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.status(204).send();
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}

export async function sendMessage(req: Request, res: Response) {
    try {
        const conversationId = req.params.conversationId as string;
        const { content, allowedTools } = req.body;
        if (!content) {
            res.status(400).json({ error: 'Missing content' });
            return;
        }

        const messages = await getAiService().sendMessage(conversationId, content, undefined, allowedTools);
        res.json(messages);
    } catch (err: any) {
        if (err instanceof ConversationNotFoundError) {
            res.status(404).json({ error: err.message });
            return;
        }
        logger.error('AI chat request failed:', {
            message: err?.message || String(err),
            status: err?.status,
            code: err?.code,
        });
        res.status(500).json({ error: err.message });
    }
}
