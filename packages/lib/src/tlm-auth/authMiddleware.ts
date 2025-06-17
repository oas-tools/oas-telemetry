import { NextFunction, Request, Response } from "express";
import { globalOasTlmConfig } from "../config.js";
import jwt, { JwtPayload } from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.cookies.apiKey;
    if (apiKey) {
        const decoded = jwt.verify(apiKey, globalOasTlmConfig.jwtSecret) as JwtPayload;
        if (decoded.password === globalOasTlmConfig.password) {
            return next();
        }
    }
    res.status(401).redirect(globalOasTlmConfig.baseURL + '/login');

}