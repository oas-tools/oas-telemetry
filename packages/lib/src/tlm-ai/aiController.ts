import { Request, Response } from 'express';
import { getAgentResponse } from './agent.js';
import { setKnownMicroservices, getKnownMicroservices } from './knownMicroservices.js';
import logger from '../utils/logger.js';

export const answerQuestion = async (req: Request, res: Response) => {
    try {
        const { question } = req.body;
        if (!question) res.status(400).json({ error: 'Missing question' });

        const answer = await getAgentResponse(question);
        res.json({ answer });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal error' });
    }
};

export const setKnownMicroservicesHandler = (req: Request, res: Response) => {
    try {
        const { microservices } = req.body;
        if (!Array.isArray(microservices)) {
            res.status(400).json({ error: 'Invalid microservices format. Expected an array.' });
            return;
        }

        setKnownMicroservices(microservices);
        res.json({
            message: "Microservices configuration updated successfully.",
            knownMicroservices: getKnownMicroservices(),
            note: "In the future, OAS-Telemetry will support autodiscovery, making this configuration unnecessary.",
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal error' });
    }
};

export const getKnownMicroservicesHandler = (req: Request, res: Response) => {
    try {
        const microservices = getKnownMicroservices();
        res.json({ knownMicroservices: microservices });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: 'Internal error' });
    }
};
