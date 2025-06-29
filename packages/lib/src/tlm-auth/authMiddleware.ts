import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { OasTlmConfig } from "../config/config.types.js";


export function getAuthMiddleware(oasTlmConfig: OasTlmConfig) {
    return function authMiddleware(req: Request, res: Response, next: NextFunction) {
        const apiKey = req.cookies.apiKey;
        if (apiKey) {
            const decoded = jwt.verify(apiKey, oasTlmConfig.auth.jwtSecret) as JwtPayload;
            if (decoded.password === oasTlmConfig.auth.password) {
                return next();
            }
        }
        res.status(401).redirect(oasTlmConfig.general.baseUrl + oasTlmConfig.general.uiPath + '/login');
    };
}