// telemetryMiddleware.js
import { inMemoryExporter } from './telemetry.js';
import { Router, json } from 'express';
import v8 from 'v8';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import ui from './ui.js'
import axios from 'axios';
import { requireFromString, importFromString } from "import-from-string";
import { installDependencies } from "dynamic-installer"

let dbglog = () => { };

if (process.env.OTDEBUG == "true")
    dbglog = console.log;

let plugins = [];

let telemetryStatus = {
    active: true
};

let baseURL = '/telemetry';

let telemetryConfig = {
    exporter: inMemoryExporter,
    specFileName: ""
};

export default function oasTelemetry(tlConfig) {
    if (tlConfig) {
        dbglog('Telemetry config provided');
        telemetryConfig = tlConfig;
        if (telemetryConfig.exporter == undefined)
            telemetryConfig.exporter = inMemoryExporter;
    }

    if (telemetryConfig.spec)
        dbglog(`Spec content provided`);
    else {
        if (telemetryConfig.specFileName != "")
            dbglog(`Spec file used for telemetry: ${telemetryConfig.specFileName}`);
        else {
            console.error("No spec available !");
        }
    }

    const router = Router();

    if (telemetryConfig.baseURL)
        baseURL = telemetryConfig.baseURL;

    router.use(json());

    router.get(baseURL, mainPage);
    router.get(baseURL + "/detail/*", detailPage);
    router.get(baseURL + "/spec", specLoader);
    router.get(baseURL + "/api", apiPage);
    router.get(baseURL + "/start", startTelemetry);
    router.get(baseURL + "/stop", stopTelemetry);
    router.get(baseURL + "/status", statusTelemetry);
    router.get(baseURL + "/reset", resetTelemetry);
    router.get(baseURL + "/list", listTelemetry);
    router.post(baseURL + "/find", findTelemetry);
    router.get(baseURL + "/heapStats", heapStats);
    router.get(baseURL + "/plugins", listPlugins);
    router.post(baseURL + "/plugins", registerPlugin);
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
    if (telemetryConfig.specFileName) {
        try {
            const data = readFileSync(telemetryConfig.specFileName,
                { encoding: 'utf8', flag: 'r' });

            const extension = path.extname(telemetryConfig.specFileName);

            let json = data;

            if (extension == yaml)
                json = JSON.stringify(yaml.SafeLoad(data), null, 2);

            res.setHeader('Content-Type', 'application/json');
            res.send(json);

        } catch (e) {
            console.error(`ERROR loading spec file ${telemetryConfig.specFileName}: ${e}`)
        }
    } else {
        if (telemetryConfig.spec) {
            let spec = false;

            try {
                spec = JSON.parse(telemetryConfig.spec);
            } catch (ej) {
                try {
                    spec = JSON.stringify(yaml.load(telemetryConfig.spec), null, 2);
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

        }
    }
}

const startTelemetry = (req, res) => {
    telemetryConfig.exporter.start();
    res.send('Telemetry started');
}
const stopTelemetry = (req, res) => {
    telemetryConfig.exporter.stop();

    res.send('Telemetry stopped');
}
const statusTelemetry = (req, res) => {
    const status = !telemetryConfig.exporter._stopped || false;
    res.send({ active: status });
}

const resetTelemetry = (req, res) => {
    telemetryConfig.exporter.reset();
    res.send('Telemetry reset');
}
const listTelemetry = (req, res) => {
    const spansDB = telemetryConfig.exporter.getFinishedSpans();
    spansDB.find({}, (err, docs) => {
        if (err) {
            console.error(err);
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

const findTelemetry = (req, res) => {
    const spansDB = telemetryConfig.exporter.getFinishedSpans();
    const body = req.body;
    const search = body?.search ? body.search : {};
    if (body?.flags?.containsRegex) {
        try {
            body.config?.regexIds?.forEach(regexId => {
                search[regexId] = new RegExp(search[regexId]);
            });
        } catch (e) {
            console.error(e);
            res.status(404).send({ spansCount: 0, spans: [], error: e });
            return;
        }
        spansDB.find(search, (err, docs) => {
            if (err) {
                console.error(err);
                res.status(404).send({ spansCount: 0, spans: [], error: err });
                return;
            }

            const spans = docs;
            res.send({ spansCount: spans.length, spans: spans });
        });
    }
}

const listPlugins = (req, res) => {
    res.send(plugins.map((p) => {
        return {
            id: p.id,
            url: p.url,
            active: p.active
        };
    }));
}

const registerPlugin = async (req, res) => {
    let pluginResource = req.body;
    dbglog(`Plugin Registration Request: = ${JSON.stringify(req.body, null, 2)}...`);
    dbglog(`Getting plugin at ${pluginResource.url}...`);
    let pluginCode;
    if (!pluginResource.url && !pluginResource.code) {
        res.status(400).send(`Plugin code or URL must be provided`);
        return;
    }

    let module;
    try {
        if (pluginResource.code) {
            pluginCode = pluginResource.code
        } else {
            const response = await axios.get(pluginResource.url);
            pluginCode = response.data;
        }
        if (!pluginCode) {
            res.status(400).send(`Plugin code could not be loaded`);
            return;
        }
        //install dependencies if any
        if (pluginResource.install) {
            const dependenciesStatus = await installDependencies(pluginResource.install);
            if (!dependenciesStatus.success) {
                if (pluginResource.install.ignoreErrors === true) {
                    console.warn(`Warning: Error installing dependencies: ${JSON.stringify(dependenciesStatus.details)}`);
                } else {
                    res.status(400).send(`Error installing dependencies: ${JSON.stringify(dependenciesStatus.details)}`);
                    return;
                }
            }
        }

        dbglog("Plugin size: " + pluginCode?.length);
        if (pluginResource?.moduleFormat && pluginResource.moduleFormat.toUpperCase() == "ESM") {
            console.log("ESM detected")
            module = await importFromString(pluginCode)
        } else {
            console.log("CJS detected (default)")
            module = await requireFromString(pluginCode)
            console.log(module)
        }
    } catch (error) {
        console.error(`Error loading plugin: ${error}`);
        res.status(400).send(`Error loading plugin: ${error}`);
        return;
    }

    if (module.plugin == undefined) {
        res.status(400).send(`Plugin code should export a "plugin" object`);
        console.log("Error in plugin code: no plugin object exported")
        return;
    }
    for (let requiredFunction of ["load", "getName", "isConfigured"]) {
        if (module.plugin[requiredFunction] == undefined) {
            res.status(400).send(`The plugin code exports a "plugin" object, however it should have a "${requiredFunction}" method`);
            console.log("Error in plugin code: some required functions are missing")
            return;
        }
    }

    let plugin = module.plugin
    try {
        await plugin.load(pluginResource.config);
    } catch (error) {
        console.error(`Error loading plugin configuration: ${error}`);
        res.status(400).send(`Error loading plugin configuration: ${error}`);
        return;
    }
    if (plugin.isConfigured()) {
        dbglog(`Loaded plugin <${plugin.getName()}>`);
        pluginResource.plugin = plugin;
        pluginResource.name = plugin.getName();
        pluginResource.active = true;
        plugins.push(pluginResource);
        inMemoryExporter.activatePlugin(pluginResource.plugin);
        res.status(201).send(`Plugin registered`);
    } else {
        console.error(`Plugin <${plugin.getName()}> can not be configured`);
        res.status(400).send(`Plugin configuration problem`);
    }


}

