import { Router } from 'express';
import { getLogin, getLogout, getRefresh, getAuthEnabled } from './authController.js';
import { OasTlmConfig } from "../config/config.types.js";

export const getAuthRoutes = (oasTlmConfig: OasTlmConfig) => {
    const router = Router();

    router.post('/login', getLogin(oasTlmConfig));
    router.post('/refresh', getRefresh(oasTlmConfig));
    router.post('/logout', getLogout(oasTlmConfig));
    router.get('/enabled', getAuthEnabled(oasTlmConfig));

    return router;
};
