import { Router } from 'express';
import { OasTlmConfig } from '../config/config.types.js';
import { createConversation, deleteConversation, getConversationHistory, listAvailableTools, listConversations, sendMessage } from './aiController.js';
import { configureAiService } from './aiService.js';

export const getAIRoutes = (oasTlmConfig: OasTlmConfig) => {

    const router = Router();

    configureAiService(oasTlmConfig); //oasTlmConfig.ai.openAIKey
    
    router.get('/chat/health', (req, res) => {
        res.status(200).send('AI service is healthy');
    });

    router.get('/chat', listConversations);
    router.get('/chat/tools', listAvailableTools);
    router.post('/chat', createConversation);
    router.get('/chat/:conversationId', getConversationHistory);
    router.post('/chat/:conversationId/message', sendMessage);
    router.delete('/chat/:conversationId', deleteConversation);
    
    return router;
};
