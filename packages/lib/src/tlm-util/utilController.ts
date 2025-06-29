import { readFileSync } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Request, Response } from 'express';
import v8 from 'node:v8';
import { OasTlmConfig } from '../config/config.types.js';


export const specLoader = (_req: Request, res: Response, oasTlmConfig: OasTlmConfig) => {
    if (oasTlmConfig.general.specFileName) {
        try {
            const data = readFileSync(oasTlmConfig.general.specFileName, { encoding: 'utf8', flag: 'r' });
            const extension = path.extname(oasTlmConfig.general.specFileName);
            let json = data;
            if (extension == "yaml")
                //@ts-expect-error yes
                json = JSON.stringify(yaml.SafeLoad(data), null, 2);
            res.setHeader('Content-Type', 'application/json');
            res.send(json);
        } catch (e) {
            console.error(`ERROR loading spec file ${oasTlmConfig.general.specFileName}: ${e}`);
        }
    } else if (oasTlmConfig.general.spec) {
        let spec = null;
        try {
            spec = JSON.parse(oasTlmConfig.general.spec);
        } catch (ej) {
            try {
                spec = JSON.stringify(yaml.load(oasTlmConfig.general.spec), null, 2);
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