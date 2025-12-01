import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { LogsInstrumentation } from "../../../src/telemetry/custom-implementations/instrumentations/logsInstrumentation";



export const customInstrumentations = [
    // ...getNodeAutoInstrumentations(),

    new LogsInstrumentation()
]

registerInstrumentations({
    instrumentations: customInstrumentations,
});