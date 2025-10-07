# OAS TELEMETRY


**OAS Telemetry** is a library that automatically configures telemetry in your Express application based on OpenAPI, with no extra code required. Simply use the middleware to instantly access endpoints for viewing recent requests, system logs, and metrics—all stored in memory. This allows you to analyze your API’s behavior and debug issues easily, without manual setup or complex integration. OpenTelemetry is used under the hood to collect traces, metrics, and logs.

The middleware is highly configurable and supports both **ES Module (ESM-ES2020)** and **CommonJS (CJS)** formats. Its functionality can be extended via plugins; see [Telemetry Plugins](#telemetry-plugins) for details.

> ⚠️ **Warning: Early Development Notice**
>
> **OAS Telemetry** is a functional and working package currently progressing toward version **1.0**.  
> While the core architecture is solid, features and APIs may still receive refinements or minor changes before the first stable release.  
> Below is the current module status and roadmap:
>
> - **Logs:** Fully functional and stable for general use. Only minor changes are expected before version 1.0.  
>   Supports fast search by message content and Mongo-like query syntax (similar to traces).
>
> - **AI Chat:** Fully functional and stable. Integrated with OpenAI, requiring an API key set via environment variable or in the `.env` file.  
>   Only small improvements or new provider integrations are planned.
>
> - **Plugin System:** Operational and stable. Only minor adjustments may occur before 1.0.  
>   The plugin management page in the UI is already functional.
>
> - **Configuration:** The configuration system is considered stable in design.  
>   Using environment variables and initialization parameters has proven to be convenient and flexible.  
>   We do not expect breaking changes — new configuration options will be added only when new functionality is introduced, and all updates will always be documented in the `.env.example` file and official documentation.
>
> - **UI:** Under active development. Major changes to React have already been completed.  
>   Logs, Plugin, and ChatAI pages are available and functional.  
>   Next, we will work on the **Traces** and **Metrics** pages.
>
> - **Traces:** Currently functional with HTTP instrumentation.  
>   We are evaluating a possible switch to auto-instrumentation, depending on memory and performance testing results.
>
> - **Metrics:** Functional but expected to change.  
>   We are exploring optimizations to reduce memory usage and improve data handling before 1.0.
>
> Please, if you want to use this package or collaborate, contact us via **motero6@us.es**.


## Usage

This section provides an overview of how to install and integrate **OAS Telemetry** into your EXISTING **Express.js** application. If you want to create a new example express application with **OAS Telemetry** integrated, refer to the [Full Examples](#full-examples) section at the end of this document.

First, install the package using npm:

```sh
npm install @oas-tools/oas-telemetry
```

Then add the `.env` file to your project root directory. This file contains the environment variables used by the telemetry middleware. You can find an example of the `.env` file in the [`.env.example`](.env.example) file in the root of the repository. The `.env` file is optional, but it is needed for the AI chat.

You can integrate the middleware into your Express application. The `spec` option is the OpenAPI Specification (OAS) content in JSON or YAML format. While this configuration is optional, it is recommended for the UI to function correctly.

### Using ES Modules (ESM)

Add the following lines to your `index.js` file:

```js
// This import MUST be at the top of the file
import oasTelemetry from '@oas-tools/oas-telemetry';

// ...rest of your code here creating an express app and importing the OpenAPI spec
// NOTE: Do not add express.json() before oasTelemetry, or set its limit to at least "10mb" to avoid issues with large files.

app.use(oasTelemetry({ general: { spec: JSON.stringify(spec) } }));

```

### Using CommonJS

Add the following lines to your `index.js` file:

```js
// This require MUST be at the top of the file
const oasTelemetry = require('@oas-tools/oas-telemetry');

// ...rest of your code here creating an express app and importing the OpenAPI spec
// NOTE: Do not add express.json() before oasTelemetry, or set its limit to at least "10mb" to avoid issues with large files.

app.use(oasTelemetry({ general: { spec: JSON.stringify(spec) } }));

```

For complete examples of a working API with OAS Telemetry enabled, refer to the [Full Examples](#full-examples) section at the end of this document.

## Custom Configuration

You can also customize the telemetry configuration by passing options to the middleware function. For example:

> **Note:** Although you can set configuration options programmatically, it is recommended to use the provided `.env.example` file as a template for your environment variables. Values set in the `.env` file will override any options passed directly to the middleware.

```js
export const customTelemetryConfig = {
  general: {
    baseUrl: "/custom-telemetry",
    specFileName: "oas.json",
    spec: null,
  },

  auth: {
    enabled: true,
    apiKeyMaxAge: 1000 * 60 * 30, // 30 minutes
    password: "my-custom-password",
    jwtSecret: "my-super-secret",
  },

  ai: {
    openAIKey: process.env.YOUR_OPENAI_API_KEY, // Seteable via environment variable
    openAIModel: "gpt-4o",
    extraContextPrompts: [
      "Provide clear, concise answers",
      "Use professional tone",
    ],
  },

  traces: {
    extraExporters: [],
    extraProcessors: [],
    mainProcessorOptions: {
      config: undefined,
    },
    memoryExporter: {
      enabled: true,
      retentionTimeInSeconds: 1000 * 60 * 120, // 2 hours
    },
    filters: [],
  },

  metrics: {
    mainMetricReaderOptions: {
      exportIntervalMillis: 1000 * 60,
      metricProducers: [],
    },
    extraReaders: [],
    memoryExporter: {
      enabled: true,
      retentionTimeInSeconds: 1000 * 60 * 120, // 2 hours
    },
    filters: [],
  },

  logs: {
    extraExporters: [],
    extraProcessors: [],
    memoryExporter: {
      enabled: true,
      retentionTimeInSeconds: 1000 * 60 * 120, // 2 hours
    },
    filters: [],
  },

  plugins: {
    enabled: true,
    extraPlugins: [],
  },
};

app.use(oasTelemetry(customTelemetryConfig));
```

**Note:** To disable the module, set the environment variable `OASTLM_BOOT_MODULE_DISABLED` to `'true'`.

## Telemetry UI

You can access the telemetry UI at the endpoint `/telemetry` (or `/custom-telemetry` if you set the `baseURL` option). This UI provides a user-friendly interface to interact with the telemetry data collected by the middleware.

## Rest API Endpoints Overview

### Authentication Endpoints

- `POST /login`: Log in to the system.
- `GET /logout`: Log out of the system.
- `GET /check`: Check authentication status.

### Metrics Endpoints

- `GET /metrics`: List all metrics.
- `POST /metrics`: Insert metrics into the database.
- `POST /metrics/find`: Search metrics.
- `POST /metrics/start`: Start metrics data collection.
- `POST /metrics/stop`: Stop metrics data collection.
- `GET /metrics/status`: Get metrics status.
- `POST /metrics/reset`: Reset metrics data.

### Logs Endpoints

- `GET /logs`: List all logs.
- `POST /logs`: Insert logs into the database.
- `POST /logs/find`: Search logs.
- `POST /logs/start`: Start logs data collection.
- `POST /logs/stop`: Stop logs data collection.
- `GET /logs/status`: Get logs status.
- `POST /logs/reset`: Reset logs data.

### Traces Endpoints

- `GET /traces`: List all traces.
- `POST /traces`: Insert traces into the database.
- `POST /traces/find`: Search traces.
- `POST /traces/start`: Start traces data collection.
- `POST /traces/stop`: Stop traces data collection.
- `GET /traces/status`: Get traces status.
- `POST /traces/reset`: Reset traces data.

### AI Endpoints

- `POST /ai/chat`: Interact with the AI agent.
- `POST /ai/microservices`: Configure known microservices.
- `GET /ai/microservices`: Retrieve the list of known microservices.

### Plugins Endpoints

- `GET /plugins/list`: List all registered plugins.
- `POST /plugins/register`: Register a new plugin.

### Utility Endpoints

- `GET /utils/spec`: Load the OpenAPI specification.
- `GET /utils/heapStats`: Show v8 heap statistics.
- `GET /utils/generate-log`: Generate a log message.
- `GET /utils/generate-wait/:seconds?`: Wait for a specified number of seconds.
- `GET /utils/health`: Perform a health check.

## Telemetry Plugins

> **Note:** Plugins are currently only supported for traces. Support for logs and metrics plugins will be added in future releases.

OAS Telemetry supports a range of plugins to extend its functionality, allowing developers to tailor telemetry data collection, alerting, and reporting to meet specific requirements. Plugins enable additional features, such as integration with alerting systems, custom data exporters, and data visualization tools.

One example plugin is the **Outlier Alert Over Messaging** plugin, which can be configured to send anomaly alerts to messaging platforms like Telegram. This plugin is especially useful for monitoring abnormal response times in your API, notifying selected channels to allow rapid responses to potential issues. For setup details, refer to its [README documentation](https://github.com/oas-tools/oas-telemetry-plugin-outlier-messaging/blob/main/README.md).

OAS Telemetry plugins are flexible and support both ES Modules (ESM) and CommonJS (CJS) formats, regardless of whether your application is using ESM or CJS. This compatibility ensures that plugins work seamlessly in all configurations:

- ESM applications can use plugins in either ESM or CJS format.
- CJS applications can use plugins in either CJS or ESM format.

This flexibility makes it easy to incorporate a wide variety of plugins in your preferred module system.

## Accessing Telemetry Data

Using OAS Telemetry, you can access telemetry data through the UI (WIP), the `/telemetry/traces` endpoint, or the `/telemetry/traces/find` endpoint with a POST request using a MongoDB search syntax.

Note: if authentication is enabled, you must provide the correct credentials to access the telemetry data.

### Search Example

To perform a simple search, send a POST request to the `/telemetry/traces/find` endpoint with the following JSON payload:

```json
{
    "query": {
        "attributes.http.target": "/api/v1/pets",
        "attributes.http.method": "GET",
        "$or": [
            {"attributes.http.status_code": 200},
            {"attributes.http.status_code": 304}
        ]
    }
}
```

You can also use regular expressions and comparison operators for more complex searches. For example, to find all GET requests to paths starting with `/api/v1/pets` that returned a status code less than or equal to 400, you can use the following query:

```json
{
    "query": {
        "attributes.http.target": {
            "$regex": "^\/api\/v1\/pets.*$"
        },
        "attributes.http.method": "GET",
        "$or": [
            {
                "attributes.http.status_code": {
                    "$lte": 400
                }
            }
        ]
    }
}
```

## Full Examples

To run these examples, follow these steps:

0. You will need Node.js >= v18 and npm. You can install them using [nvm](https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/)
1. Create a new folder for your project.
2. Navigate to the folder and initialize a new Node.js project:

    ```sh
    npm init -y
    ```

3. Install the **OAS Telemetry** package and other dependencies:

    ```sh
    npm install @oas-tools/oas-telemetry@alpha express dotenv
    ```

4. Save the example cjs code as `index.js` in the project folder. You can add in the .env necessary variables like your openAI api key. (see .env.example)
5. Run the application:

    ```sh
    node index.js
    ```
6. Go to `/telemetry` (currently UI, is a placeholder except for the AI chat, we are migrating to a component based UI, but you can use the API like GET: `/telemetry/logs` `/telemetry/traces` `/telemetry/traces`)

Your project folder should now contain the necessary files to run the example with **OAS Telemetry** integrated.

### Simple Example [ES Module](https://nodejs.org/docs/latest/api/esm.html) (*.mjs)

```js index.mjs
import oasTelemetry from '@oas-tools/oas-telemetry';
import express from 'express';
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'test') {
    dotenv.config();
}
const app = express();
const port = process.env.PORT || 3000;

const spec = {
    "paths": {
        "/api/v1/pets": {
            "get": {
                "summary": "Get pets",
                "responses": {
                    "200": {
                        "description": "Success"
                    }
                }
            },
            "post": {
                "summary": "Insert a pet",
                "responses": {
                    "201": {
                        "description": "Pet Created"
                    },
                    "400": {
                        "description": "Bad Request"
                    }
                }
            }
        },
        "/api/v1/pets/{petName}": {
            "get": {
                "summary": "Get a pet",
                "parameters": [
                    {
                        "name": "petName",
                        "in": "path",
                        "required": true,
                        "description": "The name of the pet to retrieve",
                        "schema": {
                            "type": "string"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Success"
                    },
                    "404": {
                        "description": "Not Found"
                    }
                }
            }
        },
        "/api/v1/clinics": {
            "get": {
                "summary": "Get pets",
                "responses": {
                    "200": {
                        "description": "Success"
                    }
                }
            }
        }
    }
}

app.use(oasTelemetry({ general: { spec: JSON.stringify(spec) } }));

app.use(express.json());

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

let pets = [{ name: "rocky" }, { name: "pikachu" }];
let clinics = [{ name: "Pet Heaven" }, { name: "Pet Care" }];

app.get("/api/v1/pets", (req, res) => {
    res.send(pets);
});
app.post("/api/v1/pets", (req, res) => {
    if (req.body && req.body.name) {
        pets.push(req.body);
        res.sendStatus(201);
    } else {
        res.sendStatus(400);
    }
});
app.get("/api/v1/pets/:name", (req, res) => {
    let name = req.params.name;
    let filterdPets = pets.filter((p) => (p.name == name));
    if (filterdPets.length > 0)
        return res.send(filterdPets[0]);
    else
        return res.sendStatus(404);
});
app.get("/api/v1/clinics", (req, res) => {
    res.send(clinics);
});
```

### Simple Example [Common.js Module](https://nodejs.org/docs/latest/api/modules.html) (*.cjs)

```js index.cjs
let oasTelemetry = require('@oas-tools/oas-telemetry');
let express = require('express');
let dotenv = require('dotenv');
if (process.env.NODE_ENV !== 'test') {
    dotenv.config();
}
const app = express();
const port = process.env.PORT || 3000;

const spec = {
    "paths": {
        "/api/v1/pets": {
            "get": {
                "summary": "Get pets",
                "responses": {
                    "200": {
                        "description": "Success"
                    }
                }
            },
            "post": {
                "summary": "Insert a pet",
                "responses": {
                    "201": {
                        "description": "Pet Created"
                    },
                    "400": {
                        "description": "Bad Request"
                    }
                }
            }
        },
        "/api/v1/pets/{petName}": {
            "get": {
                "summary": "Get a pet",
                "parameters": [
                    {
                        "name": "petName",
                        "in": "path",
                        "required": true,
                        "description": "The name of the pet to retrieve",
                        "schema": {
                            "type": "string"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Success"
                    },
                    "404": {
                        "description": "Not Found"
                    }
                }
            }
        },
        "/api/v1/clinics": {
            "get": {
                "summary": "Get pets",
                "responses": {
                    "200": {
                        "description": "Success"
                    }
                }
            }
        }
    }
}


app.use(oasTelemetry({ general: { spec: JSON.stringify(spec) } }));

app.use(express.json());

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

let pets = [{ name: "rocky" }, { name: "pikachu" }];
let clinics = [{ name: "Pet Heaven" }, { name: "Pet Care" }];

app.get("/api/v1/pets", (req, res) => {
    res.send(pets);
});
app.post("/api/v1/pets", (req, res) => {
    if (req.body && req.body.name) {
        pets.push(req.body);
        res.sendStatus(201);
    } else {
        res.sendStatus(400);
    }
});
app.get("/api/v1/pets/:name", (req, res) => {
    let name = req.params.name;
    let filterdPets = pets.filter((p) => (p.name == name));
    if (filterdPets.length > 0)
        return res.send(filterdPets[0]);
    else
        return res.sendStatus(404);
});
app.get("/api/v1/clinics", (req, res) => {
    res.send(clinics);
});
```
