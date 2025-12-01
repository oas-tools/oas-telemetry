import { LogRecordExporter, LogRecordProcessor } from "@opentelemetry/sdk-logs";
import { IMetricReader } from "@opentelemetry/sdk-metrics";
import { SpanExporter, SpanProcessor } from "@opentelemetry/sdk-trace-node";
import { defaultConfig } from "./config.js";
import { ViewOptions } from "@opentelemetry/sdk-metrics/build/src/view/View.js";

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

// All configuration options used by the OAS-TLM library MUST be included here.
export type OasTlmConfig = typeof defaultConfig;



export type UserConfig = {
  general?: Partial<OasTlmConfig["general"]>;
  auth?: Partial<OasTlmConfig["auth"]>;
  ai?: {
    // OpenAI API key cant be passed as user config, to avoid exposing it in the client-side code.
    extraContextPrompts?: string[];  // Extra context prompts for the AI agent
    openAIModel?: string;  // OpenAI model to use, default is "gpt-3.5-turbo"
  }
  traces?: {
    extraExporters?: SpanExporter[];
    extraProcessors?: SpanProcessor[];
    memoryExporter?: Partial<OasTlmConfig["traces"]["memoryExporter"]>;
  };
  metrics?: {
    mainMetricReaderOptions?: Partial<OasTlmConfig["metrics"]["mainMetricReaderOptions"]>;
    extraReaders?: IMetricReader[];  // required shape
    extraViews?: ViewOptions[];
    memoryExporter?: Partial<OasTlmConfig["metrics"]["memoryExporter"]>;
  };
  logs?: {
    extraExporters?: LogRecordExporter[];
    extraProcessors?: LogRecordProcessor[];
    memoryExporter?: Partial<OasTlmConfig["logs"]["memoryExporter"]>;
  };
  plugins?: Partial<OasTlmConfig["plugins"]>;
  /**
   * User can register its own instrumentations to be used by oas-telemetry. oas-telemetry will assign the providers to these instrumentations.
   * This is useful when the user wants to use instrumentations that are not included by default in oas-telemetry.
   */
  instrumentations?: {
    alreadyRegistered: any[];
  };
};