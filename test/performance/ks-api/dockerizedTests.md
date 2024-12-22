# Dockerized Tests

We originally conducted tests locally using Node.js and a bash script. However, for more control, we created a TypeScript framework for testing. You can find the framework in the [oas-tools/oas-telemetry-tester](https://github.com/oas-tools/oas-telemetry-tester) GitHub repository.

## Variations

The first file to be executed is `indexSelector.js`. This file selects the correct index.js to run based on the environment variable `INDEX_SELECTOR`:

```javascript
const indexSelector = process.env.INDEX_SELECTOR || '';
console.log(`indexSelector: ${indexSelector}`);
let fileToRun = `./index${indexSelector}.js`;

require(fileToRun);
```
We use environment the variable `INDEX_SELECTOR` to select the index file to run. The available options are:
- `""` (empty): Uses the original `index.js` file (default, no need to set `INDEX_SELECTOR`).
- `Db`: Uses the `indexDb.js` file. Used for detecting a prblem with node:20-alpine and nedb.
- `Jaeger`: Uses the `indexJaeger.js` file. Used for integrating with Jaeger for distributed tracing.
- `Telemetry`: Uses the `indexTelemetry.js` file. This file imports the `oas-telemetry` module and enables telemetry.
- `TelemetryDisabled`: Uses the `indexTelemetryDisabled.js` file. Tests the `oas-telemetry` option to disable telemetry and return an empty Router.
- `TelemetryNoAuth`: Uses the `indexTelemetryNoAuth.js` file. Tests the `oas-telemetry` option to disable authentication for telemetry.
- `TelemetryRouterLast`: Uses the `indexTelemetryRouterLast.js` file. Places the telemetry router at the end of the middleware stack.



## Dockerfile

```Dockerfile
# Use node:20 instead of node20:alpine
# Alpine version will make nedb slow the system by 20ms per request (8h of tedious debugging)
FROM node:20 

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

WORKDIR /app/test/performance/ks-api
COPY test/performance/ks-api/package.json test/performance/ks-api/package-lock.json ./
RUN npm install
COPY ./test/performance/ks-api .

WORKDIR /app
COPY ./dist ./dist

ENV OASTLM_MODULE_DISABLED=false
ENV INDEX_SELECTOR=
ENV DOCKER_ENV=true

WORKDIR /app/test/performance/ks-api
CMD ["node", "indexSelector.js"]
```

The Alpine version of Node.js can cause `nedb` to slow the system by 20ms per request, which led to 8 hours of tedious debugging. Therefore, we use the standard `node:20` image.

## Build and Run

To build and run the Docker image, use the following commands:

> Note: Docker build needs to have dist folder in the root directory. Alternatively, use:
```sh
npm run build:dockerTest
```
This command internally executes:

```sh
npm run build && docker build -t oastlm-test-ks-api -f ./test/performance/ks-api/Dockerfile .
```

To run the image, use the following command:
```sh
docker run -d -e INDEX_SELECTOR=Telemetry -p 8080:8080 oastlm-test-ks-api
```

For easier testing, you can use the [oas-tools/oas-telemetry-tester](https://github.com/oas-tools/oas-telemetry-tester), which has a ks-api implementation. It executes this run command and measures CPU and memory usage with `docker stats` and response times using the `api-pecker` library.

The exported CSVs can be analyzed using Jupyter Notebook or similar tools.