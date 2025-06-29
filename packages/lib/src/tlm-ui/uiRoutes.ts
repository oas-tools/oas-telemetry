import express, { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { bootEnvVariables } from '../config/bootConfig.js';

export const getUIRoutes = () => {
    // This is when this file is in /dist
    let relativePath = '../../ui';
    // This is when this file in in /src
    if (bootEnvVariables.OASTLM_BOOT_ENV === 'development') {
        relativePath = '../../dist/ui';
        logger.warn('🚧 This process is serving the OASTLM UI from the build directory, but you are in development mode. For live updates, run the React app separately and access it at http://localhost:5173/.');
    }

    const customFilename = fileURLToPath(import.meta.url);
    const customDirname = path.dirname(customFilename);
    const staticFilesPath = path.join(customDirname, relativePath);
    const router = Router();

    // This only works once the app is built: src/ --> dist/esm/
    // This file: dist/esm/routes/
    // UI bundle: dist/ui/
    // For development, the UI is served separately.
    router.use(express.static(staticFilesPath));

    router.get('*', (_req, res) => {
        // Serve the index.html file for all routes
        res.sendFile(path.join(staticFilesPath, 'index.html'));
    });

    return router;
};