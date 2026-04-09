import axios from "axios";
import { fork } from "child_process";
import path from "path";
import logger from "../utils/logger.js";
import { Request, Response } from "express";
import { pluginService } from "./pluginService.js";
import { PluginResource } from "../types/index.js";
import { fileURLToPath } from "url";

export const listPlugins = (req: Request, res: Response) => {
     
    const plugins = pluginService.getPlugins().map(({ process, ...rest }) => rest);
    res.send({
        pluginsCount: plugins.length,
        plugins,
    });
};

export const registerPlugin = async (req: Request, res: Response) => {
    const pluginResource = req.body as PluginResource;
    logger.debug(`Plugin Registration Request: ${JSON.stringify(req.body, null, 2)}...`);

    // Validate id
    if (!pluginResource.id || typeof pluginResource.id !== "string") {
        res.status(400).send("Plugin id must be provided and must be a string");
        return;
    }

    // Check duplicate
    if (pluginService.getPlugins().find((p) => p.id === pluginResource.id)) {
        res.status(400).send(`Plugin with id "${pluginResource.id}" already exists.`);
        return;
    }

    // Validate inputs
    if (!pluginResource.url && !pluginResource.code) {
        res.status(400).send("Plugin code or URL must be provided");
        return;
    }
    if (!pluginResource.moduleFormat) {
        res.status(400).send("Plugin moduleFormat must be provided (cjs|esm)");
        return;
    }

    // Fetch code
    let pluginCode: string;
    try {
        if (pluginResource.code) {
            pluginCode = pluginResource.code;
        } else {
            console.log(pluginResource.url)
            const response = await axios.get(pluginResource.url as string);
            pluginCode = response.data;
        }
        pluginResource.sourceCode = pluginCode;
    } catch (err) {
        res.status(400).send(`Error fetching plugin code: ${err}`);
        return;
    }

    if (!pluginCode) {
        res.status(400).send("Plugin code could not be loaded");
        return;
    }

    const isCjs = typeof __filename !== "undefined" && typeof __dirname !== "undefined";
    // @ts-ignore -- import.meta no existe en el build CJS
    const currentDirectory = isCjs ? __dirname : path.dirname(fileURLToPath(import.meta.url));

    const pluginProcessFile = isCjs
        ? "pluginProcess.cjs"
        : "pluginProcess.js";
    const child = fork(path.resolve(currentDirectory, pluginProcessFile), [], {
        stdio: ["pipe", "pipe", "pipe", "ipc"],
    });

    child.stdout?.on("data", (data) => {
        logger.info(`[Plugin ${pluginResource.id}] STDOUT: ${data.toString().trim()}`);
    });

    child.stderr?.on("data", (data) => {
        logger.error(`[Plugin ${pluginResource.id}] STDERR: ${data.toString().trim()}`);
    });



    child.on("message", (msg: any) => {
        if (msg.event === "loaded") {
            pluginResource.name = msg.name;
            pluginResource.active = true;
            pluginResource.process = child;
            pluginService.pushPlugin(pluginResource);
            res.status(201).send(`Plugin ${msg.name} registered`);
        } else if (msg.event === "error") {
            res.status(400).send(`Error loading plugin: ${msg.error}`);
        }
    });

    child.on("exit", (code) => {
        pluginResource.active = false;
        pluginResource.process = undefined;
        logger.warn(`Plugin ${pluginResource.id} exited (code: ${code})`);
    });

    child.on("disconnect", () => {
        pluginResource.active = false;
        pluginResource.process = undefined;
        logger.warn(`Plugin ${pluginResource.id} disconnected`);
    });

    child.on("error", (err) => {
        pluginResource.active = false;
        pluginResource.process = undefined;
        logger.error(`Plugin ${pluginResource.id} error: ${err.message}`);
    });

    // Send data to child
    child.send({
        type: "load",
        pluginResource,
    });
};

export const activatePlugin = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const plugin = pluginService.getPlugins().find((p) => p.id === id);
    if (!plugin) {
        res.status(404).send(`Plugin with id "${id}" not found.`);
        return;
    }
    pluginService.activatePlugin(id);
    res.status(200).send(`Plugin "${id}" activated.`);
};

export const deactivatePlugin = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const plugin = pluginService.getPlugins().find((p) => p.id === id);
    if (!plugin) {
        res.status(404).send(`Plugin with id "${id}" not found.`);
        return;
    }
    pluginService.deactivatePlugin(id); // This only sets active to false
    res.status(200).send(`Plugin "${id}" deactivated.`);
};

export const deletePlugin = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const plugin = pluginService.getPlugins().find((p) => p.id === id);
    if (!plugin) {
        res.status(404).send(`Plugin with id "${id}" not found.`);
        return;
    }
    pluginService.deletePlugin(id); // kills child inside service
    res.status(200).send(`Plugin "${id}" deleted.`);
};
