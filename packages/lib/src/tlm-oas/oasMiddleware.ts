import { metrics, trace } from '@opentelemetry/api';
import { Request, Response, NextFunction } from 'express';
import { OasTlmConfig } from '../config/config.types.js';
import { type CaptureBodyMode } from '../config/config.js';
import { bootEnvVariables } from '../config/bootConfig.js';
import { getPackageVersion } from '../utils/packageUtils.js';
import { loadApiSpec, normalizeSpecPath, normalizeExpressPath } from '../utils/oasUtils.js';

// Determine library version dynamically
// @ts-ignore -- import.meta is replaced in CJS builds but TypeScript requires it here
const packageVersion = getPackageVersion(import.meta.url);

/**
 * Patches res.write/res.end to collect the response body as it is streamed out, without altering
 * the response. Returns a getter for the captured body once the response has finished.
 */
function captureResponseBody(res: Response, maxSizeBytes: number): () => string | undefined {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    let truncated = false;

    const capture = (chunk: any) => {
        if (!chunk || truncated) return;
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (totalSize + buf.length > maxSizeBytes) {
            truncated = true;
            return;
        }
        chunks.push(buf);
        totalSize += buf.length;
    };

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: any, ...args: any[]) => {
        capture(chunk);
        return (originalWrite as any)(chunk, ...args);
    }) as any;

    res.end = ((chunk?: any, ...args: any[]) => {
        if (chunk) capture(chunk);
        return (originalEnd as any)(chunk, ...args);
    }) as any;

    return () => {
        if (chunks.length === 0) return undefined;
        const body = Buffer.concat(chunks).toString('utf8');
        return truncated ? body + '...[truncated]' : body;
    };
}

function truncate(value: string, maxSizeBytes: number): string {
    return Buffer.byteLength(value, 'utf8') > maxSizeBytes
        ? Buffer.from(value, 'utf8').subarray(0, maxSizeBytes).toString('utf8') + '...[truncated]'
        : value;
}

function shouldCaptureBody(mode: CaptureBodyMode, isError: boolean, isSpecMismatch: boolean): boolean {
    switch (mode) {
        case 'always': return true;
        case 'onError': return isError;
        case 'onMismatch': return isSpecMismatch;
        case 'onMismatchOrError': return isError || isSpecMismatch;
        case 'off': default: return false;
    }
}

function attachBodyToActiveSpan(req: Request, responseBody: string | undefined, maxSizeBytes: number): void {
    const span = trace.getActiveSpan();
    if (!span) return;

    if (req.body && Object.keys(req.body).length > 0) {
        span.setAttribute('http.request.body', truncate(JSON.stringify(req.body), maxSizeBytes));
    }
    if (responseBody) {
        span.setAttribute('http.response.body', responseBody);
    }
}

/**
 * Express middleware that adds the one signal OpenTelemetry's own auto-instrumentations can never
 * produce on their own: whether a request matches a documented operation in the loaded OpenAPI
 * spec. Optionally also attaches request/response bodies to the active span for debugging.
 */
export function getOasComplianceMiddleware(config: OasTlmConfig) {
    // Load the spec at startup
    const spec = loadApiSpec(config);

    // Map of normalized path -> { originalPath, methods } for highly efficient O(1) matching.
    // The spec is optional: if none is configured/loadable, this stays empty and "matched" below
    // is never computed - the schema-compliance counter is simply not recorded (nothing to compare
    // against), and body capture falls back to error-only, without needing this middleware to know why.
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
    const specLoaded = normalizedSpecMap.size > 0;

    // Resolved on the first request rather than here, since this middleware is built before
    // configureTelemetry() installs the real MeterProvider - getting the meter too early would
    // silently bind this counter to a no-op provider.
    let complianceCounter: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']> | undefined;

    return function oasComplianceMiddleware(req: Request, res: Response, next: NextFunction) {
        if (!complianceCounter) {
            const meter = metrics.getMeter('oas_telemetry_compliance_metrics', packageVersion);
            complianceCounter = meter.createCounter('oas.schema.compliance', {
                description: 'Counts requests to documented Express routes by whether they matched an operation in the loaded OpenAPI spec',
            });
        }
        const counter = complianceCounter;

        const telemetryBaseUrl = bootEnvVariables.OASTLM_BOOT_BASE_URL;
        const path = req.path || '';

        // Ignore internal telemetry routes to avoid self-profiling noise
        if (telemetryBaseUrl && path.includes(telemetryBaseUrl)) {
            return next();
        }

        const captureBodyConfig = config.traces.captureBody;
        const getResponseBody = captureBodyConfig.mode !== 'off'
            ? captureResponseBody(res, captureBodyConfig.maxSizeBytes)
            : undefined;

        res.on('finish', () => {
            const routePath = req.route?.path;
            if (!routePath) return; // unmatched by Express itself (e.g. 404) - nothing to compare against

            const normalizedRoute = normalizeExpressPath(routePath);
            const matchedSpec = normalizedSpecMap.get(normalizedRoute);
            const matched = specLoaded && !!matchedSpec && matchedSpec.methods.includes(req.method.toLowerCase());

            if (config.metrics.recordSchemaCompliance && specLoaded) {
                counter.add(1, {
                    http_method: req.method,
                    http_route: matchedSpec?.originalPath || routePath,
                    matched,
                });
            }

            if (getResponseBody) {
                const isError = res.statusCode >= 400;
                const isSpecMismatch = specLoaded && !matched;
                const shouldCapture = shouldCaptureBody(captureBodyConfig.mode, isError, isSpecMismatch);
                if (shouldCapture) {
                    attachBodyToActiveSpan(req, getResponseBody(), captureBodyConfig.maxSizeBytes);
                }
            }
        });

        next();
    };
}
