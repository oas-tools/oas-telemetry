import { readFileSync } from 'fs';
import path from 'path';
import { Request, Response } from 'express';


// This only works once the app is built:
export const mainPage = (_req: Request, res: Response) => {
    const bundlePath = path.join(__dirname, '../../ui/dist');
    try {
        const indexHtml = readFileSync(path.join(bundlePath, 'index.html'), 'utf8');
        res.set('Content-Type', 'text/html');
        res.send(indexHtml);
    } catch (error) {
        console.error(`Error serving React bundle: ${error}`);
        res.status(500).send('Error loading the application.');
    }
};
