import axios from 'axios';
// @ts-expect-error: import-from-string does not have proper type declarations
import { importFromString, requireFromString } from 'import-from-string';
// @ts-expect-error: dynamic-installer does not have proper type declarations
import { installDependencies } from 'dynamic-installer';
import logger from '../utils/logger.js';
import { Request, Response } from 'express';
import { PluginResource } from '../types/index.js';
import { pluginService } from './pluginService.js';

export const listPlugins = (req: Request, res: Response) => {
    const plugins = pluginService.getPlugins().map((plugin: PluginResource) => {
        return {
            id: plugin.id,
            name: plugin.name,
            url: plugin.url,
            active: plugin.active
        };
    })
    res.send({
        pluginsCount: plugins.length,
        plugins: plugins
    });
}

export const registerPlugin = async (req: Request, res: Response) => {
    let pluginCode;
    const pluginResource = req.body as PluginResource;
    logger.debug(`Plugin Registration Request: = ${JSON.stringify(req.body, null, 2)}...`);

    // Validate plugin id
    if (!pluginResource.id || typeof pluginResource.id !== "string") {
        res.status(400).send(`Plugin id must be provided and must be a string`);
        return;
    }

    // Check for duplicate plugin id
    const existingPlugin = pluginService.getPlugins().find((plugin: PluginResource) => plugin.id === pluginResource.id);
    if (existingPlugin) {
        res.status(400).send(`A plugin with id "${pluginResource.id}" already exists.`);
        return;
    }

    if (!pluginResource.url && !pluginResource.code) {
        res.status(400).send(`Plugin code or URL must be provided`);
        return;
    }

    if (!pluginResource.moduleFormat) {
        res.status(400).send(`Plugin moduleFormat must be provided (e.g., "cjs" or "esm")`);
        return;
    }

    if (!["cjs", "esm"].includes(pluginResource.moduleFormat.toLowerCase())) {
        res.status(400).send(`Invalid moduleFormat "${pluginResource.moduleFormat}". Supported formats are "cjs" and "esm".`);
        return;
    }

    let module;
    try {
        if (pluginResource.code) {
            pluginCode = pluginResource.code;
        } else {
            const response = await axios.get(pluginResource.url);
            pluginCode = response.data;
        }

        if (!pluginCode) {
            res.status(400).send(`Plugin code could not be loaded`);
            return;
        }

        if (pluginResource.install) {
            logger.info("Installing dependencies for plugin: " + pluginResource.name);
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

        logger.debug("Plugin format (provided): " + pluginResource?.moduleFormat);
        if (pluginResource.moduleFormat.toLowerCase() === "esm") {
            logger.info("ESM detected");
            module = await importFromString(pluginCode);
        } else {
            logger.info("CJS detected (default)");
            module = await requireFromString(pluginCode);
        }
    } catch (error) {
        logger.error(`Error loading plugin: ${error}`);
        res.status(400).send(`Error loading plugin: ${error}`);
        return;
    }

    const plugin = module.default?.plugin ?? module.plugin;

    if (!plugin) {
        res.status(400).send(`Plugin code should export a valid "plugin" object or static class`);
        logger.info("Error in plugin code: no valid plugin object exported");
        return;
    }
    for (const requiredFunction of ["load", "getName", "isConfigured"]) {
        if (typeof plugin[requiredFunction] !== "function") {
            res.status(400).send(`The plugin code exports a "plugin" object, but it must have a "${requiredFunction}" method`);
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
        pluginResource.pluginImplementation = plugin;
        pluginResource.name = plugin.getName();
        pluginResource.active = true;
        pluginService.pushPlugin(pluginResource);
        pluginService.activatePlugin(pluginResource);
        res.status(201).send(`Plugin registered`);
    } else {
        logger.error(`Plugin <${plugin.getName()}> cannot be configured`);
        res.status(400).send(`Plugin configuration problem`);
    }
};
