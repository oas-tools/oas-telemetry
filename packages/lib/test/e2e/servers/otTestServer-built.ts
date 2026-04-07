/**
 * This test server imports from the COMPILED dist/ folder
 * This simulates importing from npm, so we can verify the build works correctly
 */
import { oasTelemetry, getTracer, getMeter, getLogger } from '../../../dist/esm/index.js';
import dotenv from 'dotenv';
import express from 'express';

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
            }
        }
    }
}

app.use(oasTelemetry({ general: { spec: JSON.stringify(spec) } }));

const logger = getLogger('PetClinic', '1.0.0');
const meter = getMeter('PetClinic', '1.0.0');
const tracer = getTracer('PetClinic', '1.0.0');

const customCounter = meter.createCounter('oas-telemetry.custom.endpoint.hits', {
    description: 'Counts hits to /custom-metric endpoint',
});

app.get('/custom-metric', (req, res) => {
    customCounter.add(1, { 'oas-telemetry.endpoint': '/custom-metric' });
    res.json({ message: 'Custom metric incremented' });
});

app.use(express.json());

app.listen(port, () => {
    console.log(`Test server (from built dist/) listening at http://localhost:${port}`);
});

const pets = [{ name: "rocky" }, { name: "pikachu" }];

app.get("/api/v1/pets", (req, res) => {
    console.log("GET /api/v1/pets called");
    res.send(pets);
});
