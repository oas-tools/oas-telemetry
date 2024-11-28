
import { globalOasTlmConfig } from '../config.js';
import axios from 'axios';
import { importFromString, requireFromString } from 'import-from-string';
import { installDependencies } from 'dynamic-installer';

let dbglog = () => { };

if (process.env.OTDEBUG == "true")
    dbglog = console.log;
export const listPlugins = (req, res) => {
    res.send(globalOasTlmConfig.dynamicExporter.getPlugins().map((p) => {
        return {
            id: p.id,
            name: p.name,
            url: p.url,
            active: p.active
        };
    }));
}

export const registerPlugin = async (req, res) => {
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
        dbglog("Plugin format: " + pluginResource?.moduleFormat);
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

    const plugin = module.default?.plugin ?? module.plugin;

    if (plugin == undefined) {
        res.status(400).send(`Plugin code should export a "plugin" object`);
        console.log("Error in plugin code: no plugin object exported");
        return;
    }
    for (let requiredFunction of ["load", "getName", "isConfigured"]) {
        if (plugin[requiredFunction] == undefined) {
            res.status(400).send(`The plugin code exports a "plugin" object, however it should have a "${requiredFunction}" method`);
            console.log("Error in plugin code: some required functions are missing");
            return;
        }
    }

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
        globalOasTlmConfig.dynamicExporter.pushPlugin(pluginResource);
        globalOasTlmConfig.dynamicExporter.activatePlugin(pluginResource.plugin);
        res.status(201).send(`Plugin registered`);
    } else {
        console.error(`Plugin <${plugin.getName()}> can not be configured`);
        res.status(400).send(`Plugin configuration problem`);
    }
}

export const checkApiKey = (req, res) => {
    const apiKey = req.query.apiKey || req.body.apiKey;
    if (apiKey === process.env.APIKEY) {
        res.status(200).send({ valid: true });
    } else {
        res.status(401).send({ valid: false });
    }
}