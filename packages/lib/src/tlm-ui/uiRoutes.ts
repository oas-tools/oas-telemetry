import express, { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

let relativePath = '../../ui';

if (process.env.OASTLM_ENV === 'development') {
    relativePath = '../../dist/ui';
    logger.warn('🚧 This process is serving the OASTLM UI from the build directory, but you are in development mode. For live updates, run the React app separately and access it at http://localhost:5173/.');
}

const customFilename = fileURLToPath(import.meta.url);
const customDirname = path.dirname(customFilename);
const staticFilesPath = path.join(customDirname, relativePath);
export const uiRoutes = Router();

// This only works once the app is built: src/ --> dist/esm/
// This file: dist/esm/routes/
// UI bundle: dist/ui/
// For development, the UI is served separately.
uiRoutes.use(express.static(staticFilesPath));


uiRoutes.get('*', (_req, res) => {
    // Serve the index.html file for all routes
    res.sendFile(path.join(staticFilesPath, 'index.html'));
});

export default uiRoutes;