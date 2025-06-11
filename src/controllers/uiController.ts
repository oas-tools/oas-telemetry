import { globalOasTlmConfig } from '../config.js';
import { readFileSync } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import ui from '../services/uiService.js';

export const apiPage = (req, res) => {
    const baseURL = globalOasTlmConfig.baseURL;
    let text = `
    <h1>Telemetry API routes:</h1>
    <ul>
        <li><a href="${baseURL}/start">${baseURL}/start</a></li>
        <li><a href="${baseURL}/stop">${baseURL}/stop</a></li>
        <li><a href="${baseURL}/status">${baseURL}/status</a></li>
        <li><a href="${baseURL}/reset">${baseURL}/reset</a></li>
        <li><a href="${baseURL}/list">${baseURL}/list</a></li>
        <li><a href="${baseURL}/heapStats">${baseURL}/heapStats</a></li>
        <li>${baseURL}/find [POST]</li>
    </ul>
    `;
    res.send(text);
}

export const mainPage = (req, res) => {
    const baseURL = globalOasTlmConfig.baseURL;
    res.set('Content-Type', 'text/html');
    res.send(ui(baseURL).main);
}

export const detailPage = (req, res) => {
    const baseURL = globalOasTlmConfig.baseURL;
    res.set('Content-Type', 'text/html');
    res.send(ui(baseURL).detail);
}

export const specLoader = (req, res) => {
    if (globalOasTlmConfig.specFileName) {
        try {
            const data = readFileSync(globalOasTlmConfig.specFileName, { encoding: 'utf8', flag: 'r' });
            const extension = path.extname(globalOasTlmConfig.specFileName);
            let json = data;
            if (extension == yaml)
                json = JSON.stringify(yaml.SafeLoad(data), null, 2);
            res.setHeader('Content-Type', 'application/json');
            res.send(json);
        } catch (e) {
            console.error(`ERROR loading spec file ${globalOasTlmConfig.specFileName}: ${e}`);
        }
    } else if (globalOasTlmConfig.spec) {
            let spec = false;
            try {
                spec = JSON.parse(globalOasTlmConfig.spec);
            } catch (ej) {
                try {
                    spec = JSON.stringify(yaml.load(globalOasTlmConfig.spec), null, 2);
                } catch (ey) {
                    console.error(`Error parsing spec: ${ej} - ${ey}`);
                }
            }
            if (!spec) {
                res.status(404);
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.send(spec);
            }
    } else {
        res.status(404);
    }
}