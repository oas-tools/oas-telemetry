// telemetryMiddleware.js
import { inMemoryExporter } from './telemetry.js';
import { Router } from 'express';
import v8 from 'v8';



let telemetryConfig = {
    exporter: inMemoryExporter,
    baseURL: '/telemetry'

};
export default function oasTelemetry(tlConfig) {
    if(tlConfig) {
        console.log('Telemetry config provided');
        telemetryConfig = tlConfig;
    }
    const router = Router();
    const baseURL = telemetryConfig.baseURL;
    router.get(baseURL, landingPage);
    router.get(baseURL+"/reset", resetTelemetry);
    router.get(baseURL+"/start", startTelemetry);
    router.get(baseURL+"/stop", stopTelemetry);
    router.get(baseURL+"/list", listTelemetry);
    router.post(baseURL+"/find", findTelemetry);
    router.get(baseURL+"/heapStats", heapStats);
    return router;
}
const landingPage = (req, res) => {
    let text = `
    <h1>Telemetry showcase</h1>s
    <h2>Available routes:</h2>
    <ul>
        <li><a href="/telemetry/start">/telemetry/start</a></li>
        <li><a href="/telemetry/stop">/telemetry/stop</a></li>
        <li><a href="/telemetry/reset">/telemetry/reset</a></li>
        <li><a href="/telemetry/list">/telemetry/list</a></li>
        <li>/telemetry/find [POST]</li>
    </ul>
    `;
    res.send(text);
}


const startTelemetry = (req, res) => {
    telemetryConfig.exporter.start();
    res.send('Telemetry started');
}
const stopTelemetry = (req, res) => {
    telemetryConfig.exporter.stop();
    res.send('Telemetry stopped');
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


