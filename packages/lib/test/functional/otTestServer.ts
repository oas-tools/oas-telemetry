//import oasTelemetry from '@oas-tools/oas-telemetry';
import oasTelemetry from '../../src/index.js';

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
    // authEnabled: true,
}
app.use(oasTelemetry(oasTlmConfig));

app.use(express.json());

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
    console.log(`Telemetry portal available at http://localhost:${port}${oasTlmConfig.baseURL}`);
});

const pets =[{ name: "rocky"},{ name: "pikachu"}];
const clinics =[{ name: "Pet Heaven"},{ name: "Pet Care"}];

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
    const name = req.params.name;
    const filterdPets = pets.filter((p)=>(p.name==name));
    if(filterdPets.length > 0)
        res.send(filterdPets[0]);
    else
        res.sendStatus(404);
});
app.get("/api/v1/clinics", (req, res) => {
    res.send(clinics);
});
