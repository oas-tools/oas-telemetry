import { metrics, Histogram } from '@opentelemetry/api';
import { Request, Response, NextFunction } from 'express';
import { OasTlmConfig } from '../config/config.types.js';
import { bootEnvVariables } from '../config/bootConfig.js';
import { getPackageVersion } from '../utils/packageUtils.js';
import { loadApiSpec, normalizeSpecPath, normalizeExpressPath } from '../utils/oasUtils.js';

const histogramCache = new Map<string, Histogram>();

// Determine library version dynamically
// @ts-ignore -- import.meta is replaced in CJS builds but TypeScript requires it here
const packageVersion = getPackageVersion(import.meta.url);

export function getAutoEndpointMetricsMiddleware(config: OasTlmConfig) {
    // Load the spec at startup
    const spec = loadApiSpec(config);

    // Map of normalized path -> { originalPath, methods } for highly efficient O(1) matching
    const normalizedSpecMap = new Map<string, { originalPath: string; methods: string[] }>();
    if (spec && spec.paths) {
        for (const specPath of Object.keys(spec.paths)) {
            const normalized = normalizeSpecPath(specPath);
            const methods = Object.keys(spec.paths[specPath])
                .filter(key => ['get', 'post', 'put', 'delete', 'options', 'head', 'patch', 'trace'].includes(key.toLowerCase()))
                .map(m => m.toLowerCase());
            normalizedSpecMap.set(normalized, { originalPath: specPath, methods });
        }
    }

    let initialized = false;
    const initializeHistograms = () => {
        if (initialized) return;
        initialized = true;

        const meter = metrics.getMeter('oas-telemetry-auto-endpoint-metrics', packageVersion);
        for (const entry of normalizedSpecMap.values()) {
            for (const method of entry.methods) {
                const cleanEndpoint = entry.originalPath
                    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
                    .replace(/[{}]/g, '')      // Remove braces { }
                    .replace(/:/g, '')         // Remove colons if any
                    .replace(/\//g, '.')       // Replace slashes with dots
                    .replace(/\.\./g, '.')     // Prevent double dots
                    || 'root';
                const metricName = `oas-telemetry.auto.${method}.${cleanEndpoint}.ms`;

                if (!histogramCache.has(metricName)) {
                    const histogram = meter.createHistogram(metricName, {
                        description: `Auto-generated histogram for spec endpoint ${method.toUpperCase()} ${entry.originalPath}`,
                        unit: 'ms',
                    });
                    histogramCache.set(metricName, histogram);
                }
            }
        }
    };

    return function autoEndpointMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
        if (!config.metrics.autoGenerateEndpointHistograms) {
            return next();
        }

        // Initialize histograms on the first request to ensure the Telemetry SDK has started
        initializeHistograms();

        const telemetryBaseUrl = bootEnvVariables.OASTLM_BOOT_BASE_URL;
        const path = req.path || '';

        // Ignore internal telemetry routes to avoid self-profiling noise
        if (telemetryBaseUrl && path.includes(telemetryBaseUrl)) {
            return next();
        }

        const start = process.hrtime();

        res.on('finish', () => {
            const routePath = req.route?.path;
            if (!routePath) {
                return;
            }

            const verb = req.method.toLowerCase();
            const normalizedRoute = normalizeExpressPath(routePath);
            const matchedSpec = normalizedSpecMap.get(normalizedRoute);

            // If the endpoint or method is not defined in the API spec, do not record metric
            if (!matchedSpec || !matchedSpec.methods.includes(verb)) {
                return;
            }

            const diff = process.hrtime(start);
            const durationMs = (diff[0] * 1e3) + (diff[1] * 1e-6);

            const cleanEndpoint = matchedSpec.originalPath
                .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
                .replace(/[{}]/g, '')      // Remove braces { }
                .replace(/:/g, '')         // Remove colons if any
                .replace(/\//g, '.')       // Replace slashes with dots
                .replace(/\.\./g, '.')     // Prevent double dots
                || 'root';

            const metricName = `oas-telemetry.auto.${verb}.${cleanEndpoint}.ms`;

            const histogram = histogramCache.get(metricName);
            if (histogram) {
                histogram.record(durationMs, {
                    http_method: req.method,
                    http_route: matchedSpec.originalPath,
                    http_status_code: res.statusCode.toString(),
                });
            }
        });

        next();
    };
}
