// Register instrumetations before anything else
import { customInstrumentations } from './instrumentation.js';
// This should be at the top of the file
import { oasTelemetry } from '../../../src/index.js';
//import oasTelemetry from '@oas-tools/oas-telemetry';
import dotenv from 'dotenv';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { UserConfig } from '../../../src/config/config.types.js';

import { ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { metrics, trace  } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import express from 'express';
if (process.env.NODE_ENV !== 'test') {
    dotenv.config();
}
// Lets register our own instrumentations to be used by oas-telemetry
// MUST set OASTLM_BOOT_AUTOINSTRUMENTATIONS_LOGS_DISABLED = "true"; in the .env file to avoid double registration of LogsInstrumentation
const myInstrumentations = customInstrumentations

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

let specValue = JSON.stringify(spec);
if (process.env.OASTLM_TEST_INVALID_SPEC) {
    specValue = ": : :";
}

const oasTlmConfig: UserConfig = {
    general: process.env.OASTLM_TEST_NO_SPEC ? {} : {
        spec: specValue,
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
        autoGenerateEndpointHistograms: true,
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
    instrumentations: myInstrumentations
}

const telemetryRouter = oasTelemetry(oasTlmConfig);

const app = express();
const port = process.env.PORT || 3000;





// Use new API: configure and use global accessors
app.use(telemetryRouter);

const meter = metrics.getMeter('PetClinic', '1.0.0');
const logger = logs.getLogger('PetClinic', '1.0.0');
const tracer = trace.getTracer('PetClinic', '1.0.0');

const autoHistogram = meter.createHistogram('oas-telemetry.auto.histogram.ms', {
    description: 'Automatic histogram values that change over time',
    unit: 'ms',
});

let autoHistogramTick = 0;
let autoHistogramLastValue = 0;
const AUTO_HISTOGRAM_INTERVAL_MS = 1000;

const recordAutoHistogramSample = () => {
    autoHistogramTick += 1;
    const wave = 80 + Math.sin(autoHistogramTick / 6) * 30;
    const noise = Math.random() * 20;
    autoHistogramLastValue = Math.max(5, wave + noise);

    autoHistogram.record(autoHistogramLastValue, {
        source: 'auto-generator',
    });
};

// Seed one value and keep recording periodically.
recordAutoHistogramSample();
const autoHistogramTimer = setInterval(recordAutoHistogramSample, AUTO_HISTOGRAM_INTERVAL_MS);
autoHistogramTimer.unref?.();

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

app.get('/custom-histogram-status', (req, res) => {
    res.json({
        metric: 'oas-telemetry.auto.histogram.ms',
        intervalMs: AUTO_HISTOGRAM_INTERVAL_MS,
        samplesGenerated: autoHistogramTick,
        lastValueMs: Number(autoHistogramLastValue.toFixed(2)),
    });
});

app.use(express.json({ limit: '500mb' }));

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

const pets = [{ name: "rocky" }, { name: "pikachu" }];
const clinics = [{ name: "Pet Heaven" }, { name: "Pet Care" }];

app.get("/api/v1/pets", (req, res) => {
    console.log("GET /api/v1/pets called, this log should be associated with the request in telemetry");
    getPets();
    res.send(pets);
});

const getPets = () => {
    return [...pets];
}
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
