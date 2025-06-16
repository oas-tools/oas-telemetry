import express, { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const customFilename = fileURLToPath(import.meta.url);
const customDirname = path.dirname(customFilename);
const staticFilesPath = path.join(customDirname, "../../ui");
export const uiRoutes = Router();

// This only works once the app is built:
// This file: dist/esm/routes/
// UI bundle: dist/ui/
// For development, the UI is served separately.
uiRoutes.use(express.static(staticFilesPath));


uiRoutes.get('*', (req, res) => {
    // Serve the index.html file for all routes
    res.sendFile(path.join(staticFilesPath, 'index.html'));
});

export default uiRoutes;