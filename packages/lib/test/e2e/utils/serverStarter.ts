import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { E2ETestConfig } from '../index.test';


export function startServer(config: E2ETestConfig): Promise<ChildProcess> {
    const { serverScript, port, telemetryPath: telemetryBaseUrl } = config;

    return new Promise<ChildProcess>((resolve, reject) => {
        const serverProcess = spawn('node', [serverScript], {
            cwd: process.cwd(),
            env: {
                ...process.env,
                PORT: port,
                OASTLM_BOOT_ENV: 'test',
                OASTLM_CONFIG_GENERAL_BASE_URL: telemetryBaseUrl,
            },
            stdio: 'ignore',
        });

        serverProcess.on('error', (err) => {
            console.error(`Failed to start server: ${err.message}`);
            reject(err);
        });

        const healthCheckUrl = `http://localhost:${port}${telemetryBaseUrl}/health`;
        let attempts = 0;
        const checkHealth = () => {
            axios.get(healthCheckUrl)
                .then(() => resolve(serverProcess))
                .catch(() => {
                    attempts++;
                    if (attempts >= 50) {
                        reject(new Error(`Server did not start within the expected time. Health check failed at ${healthCheckUrl}`));
                    }
                    setTimeout(checkHealth, 200);
                });
        };

        checkHealth();
    });
}
