# OAS TELEMETRY

**OAS Telemetry** offers an express middleware designed for collecting telemetry data using **Open Telemetry** in applications built using the **OpenAPI Specification (OAS)**. This middleware allows developers to easily incorporate telemetry functionality into their APIs.

**OAS Telemetry** provides a set of endpoints that can be accessed to perform various actions related to telemetry data, such as starting and stopping data collection, resetting telemetry data, listing collected data, and searching for specific telemetry records. These endpoints can be easily integrated into an **Express.js** application, providing developers with a convenient way to manage and analyze telemetry data.

Additionally, **OAS Telemetry** offers customization options, allowing developers to configure the telemetry middleware according to their specific requirements.

Overall, **OAS Telemetry** will serve as a valuable tool for developers looking to gain insights into the operation and performance of their **OAS-based APIs**, enabling them to monitor, debug, and optimize their applications effectively.

The package now supports both **ES Module (ESM)** and **CommonJS (CJS)** formats, making it compatible with a wide range of applications. Furthermore, **OAS Telemetry** provides a range of plugins to extend its functionality, enabling developers to tailor telemetry data collection, alerting, and reporting to meet specific requirements. See the [Telemetry Plugins](#telemetry-plugins) section for more information.

## Usage

This section provides an overview of how to install and integrate **OAS Telemetry** into your EXISTING **Express.js** application. If you want to create a new example express application with **OAS Telemetry** integrated, refer to the [Full Examples](#full-examples) section at the end of this document.

First, install the package using npm:

```sh
npm install @oas-tools/oas-telemetry
```

You can integrate the middleware into your Express application. The `spec` option is the OpenAPI Specification (OAS) content in JSON or YAML format. While this configuration is optional, it is recommended for the UI to function correctly.

### Using ES Modules (ESM)

Add the following lines to your `index.js` file:

```js
// This import MUST be at the top of the file
import oasTelemetry from '@oas-tools/oas-telemetry';
import { readFileSync } from 'fs';

// ...rest of your code here creating an express app

app.use(oasTelemetry({
    spec: readFileSync('./spec/oas.yaml', { encoding: 'utf8', flag: 'r' })
}));
```

### Using CommonJS

Add the following lines to your `index.js` file:

```js
// This require MUST be at the top of the file
const oasTelemetry = require('@oas-tools/oas-telemetry');
const { readFileSync } = require('fs');

// ...rest of your code here creating an express app

app.use(oasTelemetry({
    spec: readFileSync('./spec/oas.yaml', { encoding: 'utf8', flag: 'r' })
}));
```

For complete examples of a working API with OAS Telemetry enabled, refer to the [Full Examples](#full-examples) section at the end of this document.

## Custom Configuration

You can also customize the telemetry configuration by passing options to the middleware function. For example:

```js
const customTelemetryConfig = {
    spec: /* OAS content in json or yaml */, // Highly recommended
    baseURL: "/custom-telemetry", //default is "/telemetry"
    autoActivate: false, //default is true, whether to start telemetry data collection automatically
    authEnabled: true, //default is false
    apiKeyMaxAge: 1000 * 60 * 30, // 30 minutes
    password: "custom-password", //default is "oas-telemetry-password"
    jwtSecret: "custom-secret", //default is "oas-telemetry-secret"
    exporter: myCustomExporter, // Experimental, just for devs
};

app.use(oasTelemetry(customTelemetryConfig));
```

**Note:** To disable the module, set the environment variable `OASTLM_MODULE_DISABLED` to `'true'`.

## Telemetry UI

You can access the telemetry UI in the endpoint `/telemetry` (or `/custom-telemetry` if you set the `baseURL` option). This UI provides a user-friendly interface to interact with the telemetry data collected by the middleware.

## Metrics Development (Temporary)

This feature is currently in development. The following endpoints are available under <baseURL>/metrics (e.g., /telemetry/metrics):

- GET /
- POST /find
- GET /reset

Expect an array of metrics objects. Each object includes data like a timestamp, cpuUsageData, processCpuUsageData, memoryData, and processMemoryData. Example snippet for one CPU core (followed by others in the array):

```json
{
    "timestamp": 1741717005911,
    "cpuUsageData": [
        {
            "cpuNumber": "0",
            "idle": 60486.234000000004,
            "user": 1364.515,
            "system": 1246.796,
            "interrupt": 167,
            "nice": 0,
            "userP": 0.009375623379214043,
            "systemP": 0.002992220227408737,
            "idleP": 0.9850388988629563,
            "interruptP": 0,
            "niceP": 0
        }
    ],
    "processCpuUsageData": {
        "user": 0.968,
        "system": 0.32799999999999996,
        "userP": 0,
        "systemP": 0
    },
    "memoryData": {
        "used": 15726522368,
        "free": 18437427200,
        "usedP": 0.4603250668280579,
        "freeP": 0.539674933171942
    },
    "processMemoryData": 75988992,
    "_id": "6mXKM8uK7xSOqJVT"
}
```

The shape of these objects may change as development continues.

## API Telemetry Endpoints

OAS Telemetry middleware adds the following endpoints to your Express application:

- /telemetry/start: Start telemetry data collection.
- /telemetry/stop: Stop telemetry data collection.
- /telemetry/status: Get status of telemetry.
- /telemetry/reset: Reset telemetry data.
- /telemetry/list: List all telemetry data.
- /telemetry/find (POST): Search telemetry data.
- /telemetry/heapStats: Shows v8 heapStats.
- /telemetry/plugins: List all plugins.
- /telemetry/plugins (POST): Add a plugin.

## Telemetry Plugins

OAS Telemetry supports a range of plugins to extend its functionality, allowing developers to tailor telemetry data collection, alerting, and reporting to meet specific requirements. Plugins enable additional features, such as integration with alerting systems, custom data exporters, and data visualization tools.

One example plugin is the **Outlier Alert Over Messaging** plugin, which can be configured to send anomaly alerts to messaging platforms like Telegram. This plugin is especially useful for monitoring abnormal response times in your API, notifying selected channels to allow rapid responses to potential issues. For setup details, refer to its [README documentation](https://github.com/oas-tools/oas-telemetry-plugin-outlier-messaging/blob/main/README.md).

OAS Telemetry plugins are flexible and support both ES Modules (ESM) and CommonJS (CJS) formats, regardless of whether your application is using ESM or CJS. This compatibility ensures that plugins work seamlessly in all configurations:

- ESM applications can use plugins in either ESM or CJS format.
- CJS applications can use plugins in either CJS or ESM format.

This flexibility makes it easy to incorporate a wide variety of plugins in your preferred module system.

## Accessing Telemetry Data

Using OAS Telemetry, you can access telemetry data through the UI, the `/telemetry/list` endpoint, or the `/telemetry/find` endpoint with a POST request using a MongoDB search syntax.

Note: if authentication is enabled, you must provide the correct credentials to access the telemetry data.

### Simple Search Example

To perform a simple search, send a POST request to the `/telemetry/find` endpoint with the following JSON payload:

```json
{
    "search": {
        "attributes.http.target": "/api/v1/pets",
        "attributes.http.method": "GET",
        "$or": [
            {"attributes.http.status_code": 200},
            {"attributes.http.status_code": 304}
        ]
    }
}
```

### Complex Search Example

For more complex searches using regex, additional parsing on the server and extra attributes in the POST request are required. Send a POST request to the `/telemetry/find` endpoint with the following JSON payload:

```json
{
    "flags": {
        "containsRegex": true
    },
    "config": {
        "regexIds": ["attributes.http.target"]
    },
    "search": {
        "attributes.http.target": "^/api/v1/pets.*$",
        "attributes.http.method": "GET",
        "$or": [
            {"attributes.http.status_code": 200},
            {"attributes.http.status_code": 304}
        ]
    }
}
```

## Full Examples

To run these examples, follow these steps:

1. Create a new folder for your project.
2. Navigate to the folder and initialize a new Node.js project:

    ```sh
    npm init -y
    ```

3. Install the **OAS Telemetry** package:

    ```sh
    npm install @oas-tools/oas-telemetry
    ```

4. Save the example code as `index.js` in the project folder.
5. Run the application:

    ```sh
    node index.js
    ```

Your project folder should now contain the necessary files to run the example with **OAS Telemetry** integrated.

### Simple Example [ES Module](https://nodejs.org/docs/latest/api/esm.html) (*.mjs)

```js index.mjs
import oasTelemetry from '@oas-tools/oas-telemetry';
import express from 'express';

const app = express();
const port = 3000;

const spec = { "paths": {
                    "/api/v1/pets": {
                        "get": {
                            "summary": "Get pets",
                            "responses":{
                                "200": {
                                    "description": "Success"
                                }
                            }
                        },
                        "post": {
                            "summary": "Insert a pet",
                            "responses":{
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
                            "responses":{
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
                            "responses":{
                                "200": {
                                    "description": "Success"
                                }
                            }
                        }
                    }
                }
            }

const oasTlmConfig = {
    spec : JSON.stringify(spec),
    baseURL: "/telemetry",
}
app.use(oasTelemetry(oasTlmConfig));

app.use(express.json());

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
    console.log(`Telemetry portal available at http://localhost:${port}${oasTlmConfig.baseURL}`);
});

let pets =[{ name: "rocky"},{ name: "pikachu"}];
let clinics =[{ name: "Pet Heaven"},{ name: "Pet Care"}];

app.get("/api/v1/pets", (req, res) => {
    res.send(pets);
});
app.post("/api/v1/pets", (req, res) => {
    if(req.body && req.body.name){    
        pets.push(req.body);
        res.sendStatus(201);
    }else{
        res.sendStatus(400);
    }
});
app.get("/api/v1/pets/:name", (req, res) => {
    let name = req.params.name;
    let filterdPets = pets.filter((p)=>(p.name==name));
    if(filterdPets.length > 0)
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

const app = express();
const port = 3000;

const spec = { "paths": {
                    "/api/v1/pets": {
                        "get": {
                            "summary": "Get pets",
                            "responses":{
                                "200": {
                                    "description": "Success"
                                }
                            }
                        },
                        "post": {
                            "summary": "Insert a pet",
                            "responses":{
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
                            "responses":{
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
                            "responses":{
                                "200": {
                                    "description": "Success"
                                }
                            }
                        }
                    }
                }
            }

app.use(oasTelemetry({
    spec : JSON.stringify(spec)
}))

app.use(express.json());

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
    console.log(`Telemetry portal available at http://localhost:${port}/telemetry`);
});

let pets =[{ name: "rocky"},{ name: "pikachu"}];
let clinics =[{ name: "Pet Heaven"},{ name: "Pet Care"}];

app.get("/api/v1/pets", (req, res) => {
    res.send(pets);
});
app.post("/api/v1/pets", (req, res) => {
    if(req.body && req.body.name){    
        pets.push(req.body);
        res.sendStatus(201);
    }else{
        res.sendStatus(400);
    }
});
app.get("/api/v1/pets/:name", (req, res) => {
    let name = req.params.name;
    let filterdPets = pets.filter((p)=>(p.name==name));
    if(filterdPets.length > 0)
        return res.send(filterdPets[0]);
    else
        return res.sendStatus(404);
});
app.get("/api/v1/clinics", (req, res) => {
    res.send(clinics);
});
```
