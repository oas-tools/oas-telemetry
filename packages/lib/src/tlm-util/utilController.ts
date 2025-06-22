import { globalOasTlmConfig } from '../config.js';
import { readFileSync } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Request, Response } from 'express';
import v8 from 'node:v8';


export const specLoader = (_req: Request, res: Response) => {
    if (globalOasTlmConfig.specFileName) {
        try {
            const data = readFileSync(globalOasTlmConfig.specFileName, { encoding: 'utf8', flag: 'r' });
            const extension = path.extname(globalOasTlmConfig.specFileName);
            let json = data;
            if (extension == "yaml")
                //@ts-expect-error yes
                json = JSON.stringify(yaml.SafeLoad(data), null, 2);
            res.setHeader('Content-Type', 'application/json');
            res.send(json);
        } catch (e) {
            console.error(`ERROR loading spec file ${globalOasTlmConfig.specFileName}: ${e}`);
        }
    } else if (globalOasTlmConfig.spec) {
        let spec = null;
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

export const heapStats = (req: Request, res: Response) => {
    const heapStats = v8.getHeapStatistics();
    const roundedHeapStats = Object.getOwnPropertyNames(heapStats).reduce(function (map, stat) {
        //@ts-expect-error yes
        map[stat] = Math.round((heapStats[stat] / 1024 / 1024) * 1000) / 1000;
        return map;
    }, {});
    // @ts-expect-error yes
    roundedHeapStats['units'] = 'MB';
    res.send(roundedHeapStats);
};