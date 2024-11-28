import { globalOasTlmConfig } from "../config.js";
import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
    const apiKey = req.cookies.apiKey;
    if (apiKey) {
        const decoded = jwt.verify(apiKey, globalOasTlmConfig.jwtSecret);
        if (decoded.password === globalOasTlmConfig.password) {
            return next();
        }
    }
    res.status(401).redirect(globalOasTlmConfig.baseURL + '/login');

}