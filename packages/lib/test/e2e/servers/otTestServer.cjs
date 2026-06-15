//let oasTelemetry = require('@oas-tools/oas-telemetry');
let { oasTelemetry } = require('../../../dist/cjs/index.cjs');
let { metrics, trace } = require('@opentelemetry/api');
let { logs } = require('@opentelemetry/api-logs');
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


class TestExporter {
    static exported = [];
    export(resourceMetrics, resultCallback) {
        TestExporter.exported.push(JSON.parse(JSON.stringify(resourceMetrics)));
        resultCallback({ code: 0 });
    }
    async shutdown() {}
    async forceFlush() {}
}

app.use(oasTelemetry({
    general: { spec: JSON.stringify(spec) },
    metrics: {
        extraExporters: [new TestExporter()]
    }
}));

app.get('/test/exported-metrics', (req, res) => {
    res.json({
        exported: TestExporter.exported,
        count: TestExporter.exported.length
    });
});

app.post('/test/exported-metrics/reset', (req, res) => {
    TestExporter.exported = [];
    res.sendStatus(200);
});

const logger = logs.getLogger('PetClinic', '1.0.0');
const meter = metrics.getMeter('PetClinic', '1.0.0');
const tracer = trace.getTracer('PetClinic', '1.0.0');

// Custom metric: count custom endpoint hits
const customCounter = meter.createCounter('oas-telemetry.custom.endpoint.hits', {
    description: 'Counts hits to /custom-metric endpoint',
});

// Custom trace: create a span for a custom endpoint
app.get('/custom-metric', (req, res) => {
    customCounter.add(1, { 'oas-telemetry.endpoint': '/custom-metric' });
    res.json({ message: 'Custom metric incremented' });
});

app.get('/custom-trace', (req, res) => {
    const span = tracer.startSpan('custom-trace-span', {
        attributes: { endpoint: '/custom-trace' }
    });

    // Simulate some work
    setTimeout(() => {
        span.end();
        res.json({ message: 'Custom trace span created' });
    }, 50);
});

app.get('/custom-log', (req, res) => {
    logger.emit({
        severityNumber: 9, // INFO
        severityText: 'INFO',
        body: 'This is a custom log message from /custom-log endpoint',
        attributes: { endpoint: '/custom-log' }
    });
    res.json({ message: 'Custom log emitted' });
});

app.get('/custom-trace-log', (req, res) => {
    const span = tracer.startSpan('custom-trace-log-span', {
        attributes: { endpoint: '/custom-trace-log' }
    });

    // Simulate some work
    setTimeout(() => {
        logger.emit({
            severityNumber: 9, // INFO
            severityText: 'INFO',
            body: 'Log message from /custom-trace-log endpoint within trace span',
            attributes: { endpoint: '/custom-trace-log' }
        });
        span.end();
        res.json({ message: 'Custom trace span and log created' });
    }, 50);
});

app.use(express.json());

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

let pets = [{ name: "rocky" }, { name: "pikachu" }];
let clinics = [{ name: "Pet Heaven" }, { name: "Pet Care" }];

app.get("/api/v1/pets", (req, res) => {
    console.log("GET /api/v1/pets called, this log should be associated with the request in telemetry");
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