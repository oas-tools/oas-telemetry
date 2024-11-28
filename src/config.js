import DynamicExporter from "./exporters/dynamicExporter.js";

//Environment variables
//OASTLM_API_KEY = 'oas-telemetry-api-key' //Cookie value for the API key
//OASTLM_MODULE_DISABLED = 'true' //Disables the module (empty middleware and no tracing)

export const globalOasTlmConfig = {
    dynamicExporter: new DynamicExporter(),
    baseURL: "/telemetry4",
    spec: null,
    specFileName: "",
    autoActivate: true,
    apiKeyMaxAge: 1000 * 60 * 60, // 1 hour
    password: "oas-telemetry-password",
    jwtSecret: "oas-telemetry-secret",
};
//5 name alternatives. one for globals 

export default {globalOasTlmConfig}