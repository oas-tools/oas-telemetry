// telemetryMiddleware.js
import { inMemoryExporter } from './telemetry.js';
import { Router } from 'express';
import v8 from 'v8';
import {readFileSync,existsSync} from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import ui from './ui.js'

let telemetryStatus = {
    active : true
};

let baseURL = '/telemetry';

let telemetryConfig = {
    exporter: inMemoryExporter,
    specFileName: ""
};

export default function oasTelemetry(tlConfig) {
    if(tlConfig) {
        console.log('Telemetry config provided');
        telemetryConfig = tlConfig;
        if(telemetryConfig.exporter == undefined)
            telemetryConfig.exporter = inMemoryExporter;
    }

    if(telemetryConfig.spec)
    console.log(`Spec content provided`);
 else{
     if(telemetryConfig.specFileName != "")
         console.log(`Spec file used for telemetry: ${telemetryConfig.specFileName}`);
    else{
          console.log("No spec available !");
  }
 }

    
    
    const router = Router();
    
    //const baseURL = telemetryConfig.baseURL;
    
    router.get(baseURL, mainPage);
    router.get(baseURL+"/detail/*", detailPage);
    router.get(baseURL+"/spec", specLoader);
    router.get(baseURL+"/api", apiPage);
    router.get(baseURL+"/start", startTelemetry);
    router.get(baseURL+"/stop", stopTelemetry);
    router.get(baseURL+"/status", statusTelemetry);
    router.get(baseURL+"/reset", resetTelemetry);
    router.get(baseURL+"/list", listTelemetry);
    router.post(baseURL+"/find", findTelemetry);
    router.get(baseURL+"/heapStats", heapStats);
 
    return router;
}

const apiPage = (req, res) => {
    let text = `
    <h1>Telemetry API routes:</h1>
    <ul>
        <li><a href="/telemetry/start">/telemetry/start</a></li>
        <li><a href="/telemetry/stop">/telemetry/stop</a></li>
        <li><a href="/telemetry/status">/telemetry/status</a></li>
        <li><a href="/telemetry/reset">/telemetry/reset</a></li>
        <li><a href="/telemetry/list">/telemetry/list</a></li>
        <li><a href="/telemetry/heapStats">/telemetry/heapStats</a></li>
        <li>/telemetry/find [POST]</li>
    </ul>
    `;
    res.send(text);
}

const mainPage = (req, res) => {
    res.set('Content-Type', 'text/html');
    res.send(ui().main);
}
const detailPage = (req, res) => {
    res.set('Content-Type', 'text/html');
    res.send(ui().detail);
}

const specLoader = (req, res) => {
    if(telemetryConfig.specFileName){
        try{
            const data = readFileSync(telemetryConfig.specFileName,
                { encoding: 'utf8', flag: 'r' });
        
                const extension = path.extname(telemetryConfig.specFileName);
                
                let json = data;
        
                if(extension == yaml)
                    json = JSON.stringify(yaml.SafeLoad(data),null,2);

                res.setHeader('Content-Type', 'application/json');
                res.send(json);
                    
        }catch(e){
            console.log(`ERROR loading spec file ${telemetryConfig.specFileName}: ${e}`)
        }
    }else{
        if (telemetryConfig.spec){
            let spec = false;

            try{
                spec = JSON.parse(telemetryConfig.spec);
            }catch (ej) {
                try {
                    spec = JSON.stringify(yaml.load(telemetryConfig.spec),null,2);
                }catch(ey) {
                    console.log(`Error parsing spec: ${ej} - ${ey}`);
                }
            }

            if (!spec) {
                res.status(404);
            }else{
                res.setHeader('Content-Type', 'application/json');
                res.send(spec);
            }

        }
    }
}


const startTelemetry = (req, res) => {
    telemetryConfig.exporter.start();
    telemetryStatus.active = true;
    res.send('Telemetry started');
}
const stopTelemetry = (req, res) => {
    telemetryConfig.exporter.stop();
    telemetryStatus.active = false;

    res.send('Telemetry stopped');
}
const statusTelemetry = (req, res) => {
    res.send(telemetryStatus);
}


const resetTelemetry = (req, res) => {
    telemetryConfig.exporter.reset();
    res.send('Telemetry reset');
}
const listTelemetry = (req, res) => {
    const spansDB = telemetryConfig.exporter.getFinishedSpans();
    spansDB.find({},(err, docs) => {
        if (err) {
            console.error(err);
            return;
        }
        const spans = docs;
        res.send({ spansCount: spans.length, spans: spans });
    });
}

const findTelemetry = (req, res) => {
    const spansDB = telemetryConfig.exporter.getFinishedSpans();
    const search = req.body;
    spansDB.find(search,(err, docs) => {
        if (err) {
            console.error(err);
            res.send({ spansCount: "error", spans: [] });
            return;
        }
        const spans = docs;
        res.send({ spansCount: spans.length, spans: spans });
    });
}

const heapStats = (req, res) => {
    var heapStats = v8.getHeapStatistics();

    // Round stats to MB
    var roundedHeapStats = Object.getOwnPropertyNames(heapStats).reduce(function (map, stat) {
      map[stat] = Math.round((heapStats[stat] / 1024 / 1024) * 1000) / 1000;
      return map;
    }, {});
    roundedHeapStats['units'] = 'MB';

    res.send(roundedHeapStats);
}


