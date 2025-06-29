import { Router } from 'express';
import { OasTlmConfig } from "../config/config.types.js";
import { answerQuestion, setKnownMicroservicesHandler, getKnownMicroservicesHandler } from './aiController.js';

export const getAIRoutes = (oasTlmConfig: OasTlmConfig) => {
    const router = Router();

    router.post('/chat', answerQuestion(oasTlmConfig));
    router.post('/microservices', setKnownMicroservicesHandler());
    router.get('/microservices', getKnownMicroservicesHandler());

    return router;
};