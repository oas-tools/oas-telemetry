import { Router } from 'express';

import { listPlugins, registerPlugin, activatePlugin, deactivatePlugin, deletePlugin } from './pluginController.js';

export const getPluginRoutes = () => {
    const router = Router();

    router.get('/', listPlugins);
    router.post('/', registerPlugin);
    router.post('/:id/activate', activatePlugin);
    router.post('/:id/deactivate', deactivatePlugin);
    router.delete('/:id', deletePlugin);

    return router;
};