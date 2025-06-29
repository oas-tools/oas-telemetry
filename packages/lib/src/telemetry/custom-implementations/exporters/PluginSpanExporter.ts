import { ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import logger from '../../../utils/logger.js';
import { Enabler } from '../Wrappers.js';
import { PluginResource } from '../../../types/index.js';
import { pluginService } from '../../../tlm-plugin/pluginService.js';
import { applyNesting, removeCircularRefs } from '../utils/circular.js';

export class PluginSpanExporter extends Enabler implements SpanExporter {
    private _baseUrl = '/telemetry'; // Default base URL, can be overridden by the config

    constructor() {
        super();
    };

    public set baseUrl(baseUrl: string) {
        this._baseUrl = baseUrl;
    }
    export(readableSpans: ReadableSpan[], resultCallback: (result: { code: ExportResultCode; error?: Error }) => void): void {
        logger.debug('PluginSpanExporter.export called with spans: ', readableSpans.length);
        try {
            if (!this.isEnabled()) {
                logger.debug('PluginSpanExporter is not enabled. Skipping export.');
                return resultCallback({ code: ExportResultCode.SUCCESS });
            }
            // Prepare spans to be inserted into the in-memory database (remove circular references and convert to nested objects)
            const cleanSpans = readableSpans
                .map(nestedSpan => removeCircularRefs(nestedSpan)) // to avoid JSON parsing error
                .map(span => applyNesting(span)) // to avoid dot notation in keys (neDB does not support dot notation in keys)
                .filter(span => {
                    const target = span?.attributes?.http?.target;                        // Exclude spans where target includes 'telemetry' but NOT 'telemetry/utils'
                    if (target && target.includes(this._baseUrl)) {
                        return target.includes(this._baseUrl + '/utils');
                    }
                    return true;
                });
            pluginService.getPlugins().forEach((pluginResource: PluginResource, i) => {
                if (typeof pluginResource.pluginImplementation.newTrace === 'function') {
                    cleanSpans.forEach((span) => {
                        logger.debug(`Sending span to plugin (Plugin #${i}) <${pluginResource.name}>`);
                        //TODO: This should be called newSpan instead of newTrace
                        pluginResource.pluginImplementation.newTrace(span);
                    });
                } else {
                    logger.debug(`Plugin <${pluginResource.name}> does not implement newTrace method. Skipping span export.`);
                }
            });

            setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
        } catch (error: any) {
            logger.error('Error exporting spans\n' + error.message + '\n' + error.stack);
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Error exporting spans\n' + error.message + '\n' + error.stack),
            });
        }
    }

    shutdown(): Promise<void> {
        return this.forceFlush();
    }

    forceFlush(): Promise<void> {
        return Promise.resolve();
    }
}