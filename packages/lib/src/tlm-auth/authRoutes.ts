import { Router } from 'express';
import { getLogin, getLogout, getCheck } from './authController.js';
import { OasTlmConfig } from "../config/config.types.js";

export const getAuthRoutes = (oasTlmConfig: OasTlmConfig) => {
    const router = Router();

    router.post('/login', getLogin(oasTlmConfig));
    router.get('/logout', getLogout(oasTlmConfig));
    router.get('/check', getCheck(oasTlmConfig));

    return router;
};
