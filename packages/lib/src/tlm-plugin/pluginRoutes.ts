import { Router } from 'express';

import { listPlugins, registerPlugin } from './pluginController.js';

export const getPluginRoutes = () => {
    const router = Router();

    router.get('/', listPlugins);
    router.post('/', registerPlugin);

    return router;
};