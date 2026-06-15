import { Request, Response } from 'express';
import { getAiService } from './aiService.js';
import { ConversationNotFoundError } from './exceptions.js';

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

export async function getConversationHistory(req: Request, res: Response) {
    try {
        const conversationId = req.params.conversationId as string;
        const conversation = getAiService().getConversation(conversationId);
        if (!conversation) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.json(conversation);
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
        const { content } = req.body;
        if (!content) {
            res.status(400).json({ error: 'Missing content' });
            return;
        }

        const messages = await getAiService().sendMessage(conversationId, content);
        res.json(messages);
    } catch (err: any) {
        if (err instanceof ConversationNotFoundError) {
            res.status(404).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: err.message });
    }
}
