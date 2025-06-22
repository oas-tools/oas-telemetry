import { Router } from 'express';

import { listPlugins, registerPlugin } from './pluginController.js';

export const pluginRoutes = Router();


// Plugins
pluginRoutes.get('/plugins', listPlugins);
pluginRoutes.post('/plugins', registerPlugin);

export default pluginRoutes;