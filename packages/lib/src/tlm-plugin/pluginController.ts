
import { globalOasTlmConfig } from '../config.js';
import axios from 'axios';
// @ts-expect-error: import-from-string does not have proper type declarations
import { importFromString, requireFromString } from 'import-from-string';
// @ts-expect-error: dynamic-installer does not have proper type declarations
import { installDependencies } from 'dynamic-installer';
import logger from '../utils/logger.js';
import { Request, Response } from 'express';
import { PluginResource } from '../types/index.js';

export const listPlugins = (req: Request, res: Response) => {
    res.send(globalOasTlmConfig.dynamicSpanExporter.getPlugins().map((plugin: PluginResource) => {
        return {
            id: plugin.id,
            name: plugin.name,
            url: plugin.url,
            active: plugin.active
        };
    }));
}

export const registerPlugin = async (req: Request, res: Response) => {
    const pluginResource = req.body;
    logger.info(`Plugin Registration Request: = ${JSON.stringify(req.body, null, 2)}...`);
    logger.info(`Getting plugin at ${pluginResource.url}...`);
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
                    logger.warn(`Warning: Error installing dependencies: ${JSON.stringify(dependenciesStatus.details)}`);
                } else {
                    res.status(400).send(`Error installing dependencies: ${JSON.stringify(dependenciesStatus.details)}`);
                    return;
                }
            }
        }

        logger.info("Plugin size: " + pluginCode?.length);
        logger.info("Plugin format: " + pluginResource?.moduleFormat);
        if (pluginResource?.moduleFormat && pluginResource.moduleFormat.toUpperCase() == "ESM") {
            logger.info("ESM detected")
            module = await importFromString(pluginCode)
        } else {
            logger.info("CJS detected (default)")
            module = await requireFromString(pluginCode)
            logger.info(module)
        }
    } catch (error) {
        logger.error(`Error loading plugin: ${error}`);
        res.status(400).send(`Error loading plugin: ${error}`);
        return;
    }

    const plugin = module.default?.plugin ?? module.plugin;

    if (plugin == undefined) {
        res.status(400).send(`Plugin code should export a "plugin" object`);
        logger.info("Error in plugin code: no plugin object exported");
        return;
    }
    for (const requiredFunction of ["load", "getName", "isConfigured"]) {
        if (plugin[requiredFunction] == undefined) {
            res.status(400).send(`The plugin code exports a "plugin" object, however it should have a "${requiredFunction}" method`);
            logger.info("Error in plugin code: some required functions are missing");
            return;
        }
    }

    try {
        await plugin.load(pluginResource.config);
    } catch (error) {
        logger.error(`Error loading plugin configuration: ${error}`);
        res.status(400).send(`Error loading plugin configuration: ${error}`);
        return;
    }
    if (plugin.isConfigured()) {
        logger.info(`Loaded plugin <${plugin.getName()}>`);
        pluginResource.plugin = plugin;
        pluginResource.name = plugin.getName();
        pluginResource.active = true;
        globalOasTlmConfig.dynamicSpanExporter.pushPlugin(pluginResource);
        globalOasTlmConfig.dynamicSpanExporter.activatePlugin(pluginResource.plugin);
        res.status(201).send(`Plugin registered`);
    } else {
        logger.error(`Plugin <${plugin.getName()}> can not be configured`);
        res.status(400).send(`Plugin configuration problem`);
    }
}
