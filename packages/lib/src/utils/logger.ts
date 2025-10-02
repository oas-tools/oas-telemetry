import { bootEnvVariables } from "../config/bootConfig.js";
import { originalConsoleMethods } from "../telemetry/telemetryRegistry.js";

const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'];
const currentLogLevel = (bootEnvVariables.OASTLM_BOOT_LOG_LEVEL).toUpperCase();
const serviceName = 'OAS-TLM-@-' + bootEnvVariables.OASTLM_BOOT_SERVICE_NAME;

function shouldLog(level: string) {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(currentLogLevel);
}

export default {
  debug: (...messages: any[]) => {
    if (shouldLog('DEBUG')) {
      const timestamp = new Date().toISOString();
      originalConsoleMethods.debug(`${timestamp} [${serviceName}] [DEBUG]:`, ...messages);
    }
  },
  info: (...messages: any[]) => {
    if (shouldLog('INFO')) {
      const timestamp = new Date().toISOString();
      originalConsoleMethods.info(`${timestamp} [${serviceName}] [INFO]:`, ...messages);
    }
  },
  log: (...messages: any[]) => {
    if (shouldLog('INFO')) {
      const timestamp = new Date().toISOString();
      originalConsoleMethods.log(`${timestamp} [${serviceName}] [INFO]:`, ...messages);
    }
  },
  warn: (...messages: any[]) => {
    if (shouldLog('WARN')) {
      const timestamp = new Date().toISOString();
      originalConsoleMethods.warn(`${timestamp} [${serviceName}] [WARN]:`, ...messages);
    }
  },
  error: (...messages: any[]) => {
    if (shouldLog('ERROR')) {
      const timestamp = new Date().toISOString();
      originalConsoleMethods.error(`${timestamp} [${serviceName}] [ERROR]:`, ...messages);
    }
  },
  currentLogLevel
};
