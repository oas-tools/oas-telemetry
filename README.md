# OAS TELEMETRY

OAS Telemetry offers an express middleware designed for collecting telemetry data using Open Telemetry in applications built using the OpenAPI Specification (OAS). This middleware allows developers to easily incorporate telemetry functionality into their APIs.

OAS Telemetry provides a set of endpoints that can be accessed to perform various actions related to telemetry data, such as starting and stopping data collection, resetting telemetry data, listing collected data, and searching for specific telemetry records. These endpoints can be easily integrated into an Express.js application, providing developers with a convenient way to manage and analyze telemetry data.

Additionally, OAS Telemetry offers customization options, allowing developers to configure the telemetry middleware according to their specific requirements.

Overall, OAS Telemetry will serve as a valuable tool for developers looking to gain insights into the operation and performance of their OAS-based APIs, enabling them to monitor, debug, and optimize their applications effectively.





## Usage
OAS Telemetry is compatible with both CommonJS and ECMAScript Modules (ESM)

To use the middelware add this two lines in your index.js (ESM):
```js
// this MUST be the first line in your file (before any imports)
const oasTelemetry = require('oas-telemetry');

// ...Express app and other imports...

// Now you can use the oasTelemetry middleware, configured with the default options
app.use(oasTelemetry())
```

ESM version:
```js
import oasTelemetry from 'oas-telemetry';
app.use(oasTelemetry())
```

## Custom Configuration

You can also customize the telemetry configuration by passing options to the middleware function. For example:
```js
const customTelemetryConfig = {
    exporter: myCustomExporter,
    baseURL: '/custom-telemetry'
};

app.use(oasTelemetry(customTelemetryConfig));
```
## Some Telemetry Endpoints

OAS Telemetry middleware adds the following endpoints to your Express application:

- /telemetry: Landing page with links to available routes.
- /telemetry/start: Start telemetry data collection.
- /telemetry/stop: Stop telemetry data collection.
- /telemetry/reset: Reset telemetry data.
- /telemetry/list: List all telemetry data.
- /telemetry/find (POST): Search telemetry data.
- /telemetry/heapStats: Shows v8 heapStats.

## CommonJs Example
```js index.cjs
// this MUST be the first line in your file (before any imports)
const oasTelemetry = require('@oas-tools/oas-telemetry');

const express = require('express');
const app = express();
const port = 3001;
app.use(express.json());

// Now you can use the oasTelemetry middleware, configured with the default options
app.use(oasTelemetry())

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
```

## ESM Example
```js index.mjs
// simple express API in ES6 Syntax
import oasTelemetry from '@oas-tools/oas-telemetry';
import express from 'express';
const app = express();
const port = 3000;
app.use(express.json());

app.use(oasTelemetry())
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
```

