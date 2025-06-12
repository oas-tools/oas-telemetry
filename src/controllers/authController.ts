import { Request, Response } from 'express';
import { globalOasTlmConfig } from '../config.js';
import ui from '../services/uiService.js';
import jwt from 'jsonwebtoken';

export const login = (req: Request, res: Response) => {
    try {
        const { password } = req.body;
        if (password === globalOasTlmConfig.password) {
            let options = {
                maxAge: globalOasTlmConfig.apiKeyMaxAge,
                httpOnly: true,
                secure: true,
                signed: false
            };
            const apiKey = jwt.sign({ password: globalOasTlmConfig.password }, globalOasTlmConfig.jwtSecret);
            res.cookie('apiKey', apiKey, options);
            res.status(200).json({ valid: true, message: 'API Key is valid' });
            return;
        }
        res.status(400).json({ valid: false, message: 'Invalid API Key' });
    } catch (error) {
        console.log("Error: ", error);
        res.status(500).json({ valid: false, message: 'Internal server error' });
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie('apiKey');
    res.redirect(globalOasTlmConfig.baseURL + '/login');
};

export const check = (req: Request, res: Response) => {
    if (!req.cookies.apiKey) {
        res.status(200).json({ valid: false, message: 'API Key is invalid' });
        return;
    }
    const decoded = jwt.verify(req.cookies.apiKey, globalOasTlmConfig.jwtSecret) as jwt.JwtPayload;
    if (decoded.password === globalOasTlmConfig.password) {
        res.status(200).json({ valid: true, message: 'API Key is valid' });
        return;
    }
    res.status(200).json({ valid: false, message: 'Invalid API Key' });
};

export const loginPage = (req: Request, res: Response) => {
    const baseURL = globalOasTlmConfig.baseURL;
    res.send(ui(baseURL).login);
};
