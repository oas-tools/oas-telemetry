# OAS TELEMETRY

OAS Telemetry offers an express middleware designed for collecting telemetry data using Open Telemetry in applications built using the OpenAPI Specification (OAS). This middleware allows developers to easily incorporate telemetry functionality into their APIs.

OAS Telemetry provides a set of endpoints that can be accessed to perform various actions related to telemetry data, such as starting and stopping data collection, resetting telemetry data, listing collected data, and searching for specific telemetry records. These endpoints can be easily integrated into an Express.js application, providing developers with a convenient way to manage and analyze telemetry data.

Additionally, OAS Telemetry offers customization options, allowing developers to configure the telemetry middleware according to their specific requirements.

Overall, OAS Telemetry will serve as a valuable tool for developers looking to gain insights into the operation and performance of their OAS-based APIs, enabling them to monitor, debug, and optimize their applications effectively.





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


## Simple Example
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

