import "./config/bootConfig.js";
import './telemetry/initializeTelemetry.js';
import { Router } from 'express';
import { UserConfig } from './config/config.types.js';
/**
 * Returns the OAS-Telemetry middleware.
 * All parameters are optional. However, either `spec` or `specFileName` must be provided to enable endpoint filtering.
 */
declare function oasTelemetry(oasTlmInputConfig?: UserConfig): Router;
export = oasTelemetry;