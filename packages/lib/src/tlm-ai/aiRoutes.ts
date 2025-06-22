import { Router } from 'express';
import { answerQuestion, setKnownMicroservicesHandler, getKnownMicroservicesHandler } from './aiController.js';

export const aiRoutes = Router();

aiRoutes.post('/chat', answerQuestion);
aiRoutes.post('/microservices', setKnownMicroservicesHandler); // New route for configuring microservices
aiRoutes.get('/microservices', getKnownMicroservicesHandler); // Route to retrieve the list of known microservices

export default aiRoutes;