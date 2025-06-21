import dotenv from 'dotenv';

dotenv.config();

const LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE'];
const currentLogLevel = (process.env.OASTLM_LOG_LEVEL || 'INFO').toUpperCase();
const serviceName = process.env.OASTLM_SERVICE_NAME || 'OAS-TLM';

function log(level: string, ...messages: any[]) {
  if (LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(currentLogLevel)) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [${serviceName}] [${level}]:`, ...messages);
  }
}

export default {
  debug: (...messages: any) => log('DEBUG', ...messages),
  info: (...messages: any) => log('INFO', ...messages),
  log: (...messages: any) => log('INFO', ...messages), // Alias for info
  warn: (...messages: any) => log('WARN', ...messages),
  error: (...messages: any) => log('ERROR', ...messages),
  currentLogLevel
};