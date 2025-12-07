import { customInstrumentations } from './instrumentation.js';
import { oasTelemetry, getTracer, getMeter, getLogger } from '../../../src/index.js';
//import oasTelemetry from '@oas-tools/oas-telemetry';
import dotenv from 'dotenv';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { UserConfig } from '../../../src/config/config.types.js';

import express from 'express';
import { ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
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
// Lets register our own instrumentations to be used by oas-telemetry
// MUST set OASTLM_BOOT_AUTOINSTRUMENTATIONS_LOGS_DISABLED = "true"; in the .env file to avoid double registration of LogsInstrumentation
const myInstrumentations = customInstrumentations

const oasTlmConfig: UserConfig = {
    general: {
        baseUrl: "/telemetry",
        spec: JSON.stringify(spec),
    },
    traces: {
        // extraExporters: [new ConsoleSpanExporter()],
        // extraProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
    },
    metrics: {
        mainMetricReaderOptions: {
            exportIntervalMillis: 1000, // 5 seconds
        },
        // extraReaders: [ new PeriodicExportingMetricReader( {
        //     exportIntervalMillis: 1000 * 30, // 30 seconds
        //     exporter: new ConsoleMetricExporter()
        // })],
    },
    logs: {
        // extraExporters: [new ConsoleLogRecordExporter()],
        // extraProcessors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())],
    },
    auth: {
        // enabled: true, 
        // jwtSecret: "secret",
        // password: "password",
        // accessTokenMaxAge: 1000 * 60 * 2 , // 2 minutes
        // refreshTokenMaxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    },
    ai: {
        openAIModel: "gpt-3.5-turbo",

        extraContextPrompts: [
            "This server is a Pet Clinic API. It provides information about pets and clinics. You should have access to traces, metrics, and logs of the API. Use the tools provided to answer questions about the API.",
            "My name is Developer 146, you can call me Dev146. I am a developer working on this API.",
        ]
    },
    instrumentations: {
        alreadyRegistered: myInstrumentations
    }
}


// Use new API: configure and use global accessors
const telemetryRouter = oasTelemetry(oasTlmConfig);
app.use(telemetryRouter);

const logger = getLogger('PetClinic', '1.0.0');
const meter = getMeter('PetClinic', '1.0.0');
const tracer = getTracer('PetClinic', '1.0.0');

// Custom metric: count custom endpoint hits
const customCounter = meter.createCounter('telkops.custom.endpoint.hits', {
    description: 'Counts hits to /custom-metric endpoint',
});

// Custom trace: create a span for a custom endpoint
app.get('/custom-metric', (req, res) => {
    customCounter.add(1, { 'telkops.endpoint': '/custom-metric' });
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

const pets = [{ name: "rocky" }, { name: "pikachu" }];
const clinics = [{ name: "Pet Heaven" }, { name: "Pet Care" }];

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
    const name = req.params.name;
    const filterdPets = pets.filter((p) => (p.name == name));
    if (filterdPets.length > 0)
        res.send(filterdPets[0]);
    else
        res.sendStatus(404);
});
app.get("/api/v1/clinics", (req, res) => {
    res.send(clinics);
});
