# OAS TELEMETRY

OAS Telemetry offers an express middleware designed for collecting telemetry data using Open Telemetry in applications built using the OpenAPI Specification (OAS). This middleware allows developers to easily incorporate telemetry functionality into their APIs.

OAS Telemetry provides a set of endpoints that can be accessed to perform various actions related to telemetry data, such as starting and stopping data collection, resetting telemetry data, listing collected data, and searching for specific telemetry records. These endpoints can be easily integrated into an Express.js application, providing developers with a convenient way to manage and analyze telemetry data.

Additionally, OAS Telemetry offers customization options, allowing developers to configure the telemetry middleware according to their specific requirements.

Overall, OAS Telemetry will serve as a valuable tool for developers looking to gain insights into the operation and performance of their OAS-based APIs, enabling them to monitor, debug, and optimize their applications effectively.

The package now supports both ES Module (ESM) and CommonJS (CJS) formats, making it compatible with a wide range of applications. Furthermore, OAS Telemetry provides a range of plugins to extend its functionality, enabling developers to tailor telemetry data collection, alerting, and reporting to meet specific requirements. See the [Telemetry Plugins](#telemetry-plugins) section for more information.





## Usage
To use the middelware add this two lines in your index.js (ESM):
```js
import oasTelemetry from 'oas-telemetry';
import {readFileSync} from 'fs';

app.use(oasTelemetry({
    spec : readFileSync('./spec/oas.yaml',{ encoding: 'utf8', flag: 'r' })
}))

```

## Custom Configuration

You can also customize the telemetry configuration by passing options to the middleware function. For example:
```js
const customTelemetryConfig = {
    exporter: myCustomExporter,
    spec: /* OAS content in json or yaml */
};

app.use(oasTelemetry(customTelemetryConfig));
```

## Telemetry UI

You can access the telemetry UI in the endpoint ``/telemetry``


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


## Simple Example [ES Module](https://nodejs.org/docs/latest/api/esm.html) (*.mjs)
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
                        }
                    }
                }
            }

app.use(oasTelemetry({
    spec : JSON.stringify(spec)
}))

app.use(express.json());

app.get("/api/v1/pets", (req, res) => {
    res.send([{ name: "rocky"},{ name: "pikachu"}]);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
    console.log(`Telemetry portal available at http://localhost:${port}/telemetry`);
});
```

## Simple Example [Common.js Module](https://nodejs.org/docs/latest/api/modules.html) (*.cjs)
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
                        }
                    }
                }
            }

app.use(oasTelemetry({
    spec : JSON.stringify(spec)
}))

app.use(express.json());

app.get("/api/v1/pets", (req, res) => {
    res.send([{ name: "rocky"},{ name: "pikachu"}]);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
    console.log(`Telemetry portal available at http://localhost:${port}/telemetry`);
});
```

## Telemetry Plugins

OAS Telemetry supports a range of plugins to extend its functionality, allowing developers to tailor telemetry data collection, alerting, and reporting to meet specific requirements. Plugins enable additional features, such as integration with alerting systems, custom data exporters, and data visualization tools.

One example plugin is the **Outlier Alert Over Messaging** plugin, which can be configured to send anomaly alerts to messaging platforms like Telegram. This plugin is especially useful for monitoring abnormal response times in your API, notifying selected channels to allow rapid responses to potential issues. For setup details, refer to its [README documentation](https://github.com/oas-tools/oas-telemetry-plugin-outlier-messaging/blob/main/README.md).

OAS Telemetry plugins are flexible and support both ES Modules (ESM) and CommonJS (CJS) formats, regardless of whether your application is using ESM or CJS. This compatibility ensures that plugins work seamlessly in all configurations:
- ESM applications can use plugins in either ESM or CJS format.
- CJS applications can use plugins in either CJS or ESM format.

This flexibility makes it easy to incorporate a wide variety of plugins in your preferred module system.


