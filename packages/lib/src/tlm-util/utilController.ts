import { readFileSync } from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { Request, Response } from 'express';
import v8 from 'node:v8';
import { OasTlmConfig } from '../config/config.types.js';
import { fileURLToPath } from 'node:url';


export const getModulesStatus = (_req: Request, res: Response, oasTlmConfig: OasTlmConfig) => {
    res.json({
        auth: oasTlmConfig.auth.enabled,
        ai: !!oasTlmConfig.ai.openAIKey,
        plugins: oasTlmConfig.plugins.enabled,
    });
};

export const specLoader = (_req: Request, res: Response, oasTlmConfig: OasTlmConfig) => {
    if (oasTlmConfig.general.specFileName) {
        try {
            const data = readFileSync(oasTlmConfig.general.specFileName, { encoding: 'utf8', flag: 'r' });
            const extension = path.extname(oasTlmConfig.general.specFileName);
            let json = data;
            if (extension == "yaml")
                json = JSON.stringify(load(data), null, 2);
            res.setHeader('Content-Type', 'application/json');
            res.send(json);
        } catch (e) {
          console.error(`ERROR loading spec file ${oasTlmConfig.general.specFileName}: ${e}`);
          res.status(404).send();
        }
    } else if (oasTlmConfig.general.spec) {
        let spec: null | string = null;
        try {
            spec = JSON.parse(oasTlmConfig.general.spec);
        } catch (ej) {
            try {
                spec = JSON.stringify(load(oasTlmConfig.general.spec), null, 2);
            } catch (ey) {
                console.error(`Error parsing spec: ${ej} - ${ey}`);
            }
        }
        if (!spec) {
            res.status(404).send();
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.send(spec);
        }
    } else {
        res.status(404).send();
    }
}

export const heapStats = (req: Request, res: Response) => {
    const heapStats = v8.getHeapStatistics();
    const roundedHeapStats = Object.getOwnPropertyNames(heapStats).reduce(function (map, stat) {
        map[stat] = Math.round((heapStats[stat] / 1024 / 1024) * 1000) / 1000;
        return map;
    }, {});
    roundedHeapStats['units'] = 'MB';
    res.send(roundedHeapStats);
};

const isCjs = typeof __filename !== "undefined" && typeof __dirname !== "undefined";
// @ts-ignore -- import.meta no existe en el build CJS
const currentDirectory = isCjs ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export const getOasTelemetrySpec = (_req: Request, res: Response) => {
    try {
        const specPath = path.join(currentDirectory, '../docs/openapi.yaml');
        const data = readFileSync(specPath, { encoding: 'utf8', flag: 'r' });
        let json = data;
        json = JSON.stringify(load(data), null, 2);
        res.setHeader('Content-Type', 'application/json');
        res.send(json);
    } catch (e) {
        console.error(`ERROR loading OAS Telemetry OpenAPI spec file: ${e}`);
        res.status(500).send(`ERROR loading OAS Telemetry OpenAPI spec file: ${e}`);
    }
}
