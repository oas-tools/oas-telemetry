import { type GlobalOasTlmConfig } from "./types/index.js";
import DynamicExporter from "./exporters/dynamicExporter.js";
import { InMemoryDBMetricsExporter } from "./exporters/InMemoryDBMetricsExporter.js";
import { InMemoryLogRecordExporter } from "./exporters/InMemoryLogRecordExporter.js";

//Environment variables
//OASTLM_MODULE_DISABLED = 'true' //Disables the module (empty middleware and no tracing)



export const globalOasTlmConfig: GlobalOasTlmConfig = {
    dynamicSpanExporter: new DynamicExporter(),
    metricsExporter: new InMemoryDBMetricsExporter(),
    logExporter: new InMemoryLogRecordExporter(), 
    metricsExporterInterval: 1000 * 30, // milliseconds
    baseURL: "/telemetry",
    spec: null,
    specFileName: "",
    autoActivate: true,
    authEnabled: false,
    apiKeyMaxAge: 1000 * 60 * 60, // 1 hour
    password: "oas-telemetry-password",
    jwtSecret: "oas-telemetry-secret",
};

export default { globalOasTlmConfig };