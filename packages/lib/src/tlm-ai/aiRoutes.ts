import { Router } from 'express';
import { OasTlmConfig } from '../config/config.types.js';
import { createConversation, deleteConversation, getConversationHistory, listAvailableTools, listConversations, sendMessage } from './aiController.js';
import { configureAiService } from './aiService.js';

export const getAIRoutes = (oasTlmConfig: OasTlmConfig) => {

    const router = Router();

    // The router is always mounted (see requireModuleEnabled in routesManager.ts); only
    // configure the underlying service when a key is actually present, so an empty/disabled
    // deployment doesn't crash at startup.
    if (oasTlmConfig.ai.openAIKey) {
        configureAiService(oasTlmConfig);
    }
    
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
