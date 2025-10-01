import { bootEnvVariables } from "../config/bootConfig.js";

const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'];
const currentLogLevel = (bootEnvVariables.OASTLM_BOOT_LOG_LEVEL || 'INFO').toUpperCase();
const serviceName = 'OAS-Telemetry'; // TODO: Service name from config + OAS-TLM: e.g., AuthService(OAS-TLM)

function shouldLog(level: string) {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(currentLogLevel);
}

export default {
  debug: (...messages: any[]) => {
    if (shouldLog('DEBUG')) {
      const timestamp = new Date().toISOString();
      console.debug(`${timestamp} [${serviceName}] [DEBUG]:`, ...messages);
    }
  },
  info: (...messages: any[]) => {
    if (shouldLog('INFO')) {
      const timestamp = new Date().toISOString();
      console.info(`${timestamp} [${serviceName}] [INFO]:`, ...messages);
    }
  },
  log: (...messages: any[]) => {
    if (shouldLog('INFO')) {
      const timestamp = new Date().toISOString();
      console.log(`${timestamp} [${serviceName}] [INFO]:`, ...messages);
    }
  },
  warn: (...messages: any[]) => {
    if (shouldLog('WARN')) {
      const timestamp = new Date().toISOString();
      console.warn(`${timestamp} [${serviceName}] [WARN]:`, ...messages);
    }
  },
  error: (...messages: any[]) => {
    if (shouldLog('ERROR')) {
      const timestamp = new Date().toISOString();
      console.error(`${timestamp} [${serviceName}] [ERROR]:`, ...messages);
    }
  },
  currentLogLevel
};
