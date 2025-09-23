import dotenv from 'dotenv';
//import oasTelemetry from '@oas-tools/oas-telemetry';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { UserConfig } from '../../../src/config/config.types.js';
import oasTelemetry from '../../../src/index.js';

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
            exportIntervalMillis: 1000 * 30, // 30 seconds
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
    }
}

app.use(oasTelemetry(oasTlmConfig));

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
