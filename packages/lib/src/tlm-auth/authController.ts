import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { OasTlmConfig } from "../config/config.types.js";

export const getLogin = (oasTlmConfig: OasTlmConfig) => (req: Request, res: Response) => {
    try {
        const { password } = req.body;
        if (password === oasTlmConfig.auth.password) {
            const options = {
                maxAge: oasTlmConfig.auth.apiKeyMaxAge,
                httpOnly: true,
                secure: true,
                signed: false
            };
            const apiKey = jwt.sign({ password: oasTlmConfig.auth.password }, oasTlmConfig.auth.jwtSecret);
            res.cookie('apiKey', apiKey, options);
            res.status(200).json({ valid: true, message: 'API Key is valid' });
            return;
        }
        res.status(400).json({ valid: false, message: 'Invalid API Key' });
    } catch (error) {
        logger.log("Error: ", error);
        res.status(500).json({ valid: false, message: 'Internal server error' });
    }
};

export const getLogout = (oasTlmConfig: OasTlmConfig) => (req: Request, res: Response) => {
    res.clearCookie('apiKey');
    res.redirect(oasTlmConfig.general.baseUrl + oasTlmConfig.general.uiPath + '/login');
};

export const getCheck = (oasTlmConfig: OasTlmConfig) => (req: Request, res: Response) => {
    if (!req.cookies.apiKey) {
        res.status(200).json({ valid: false, message: 'API Key is invalid' });
        return;
    }
    const decoded = jwt.verify(req.cookies.apiKey, oasTlmConfig.auth.jwtSecret) as jwt.JwtPayload;
    if (decoded.password === oasTlmConfig.auth.password) {
        res.status(200).json({ valid: true, message: 'API Key is valid' });
        return;
    }
    res.status(200).json({ valid: false, message: 'Invalid API Key' });
};

