import { ExportResultCode } from '@opentelemetry/core';
import { ResourceMetrics, PushMetricExporter } from '@opentelemetry/sdk-metrics';
import logger from '../../../utils/logger.js';
import { Enabler } from '../wrappers.js';
import { pluginService } from '../../../tlm-plugin/pluginService.js';
import { applyNesting, removeCircularRefs } from '../utils/circular.js';

export class PluginMetricExporter extends Enabler implements PushMetricExporter {
    constructor() {
        super();
    }

    export(metrics: ResourceMetrics, resultCallback: (result: { code: ExportResultCode; error?: Error }) => void): void {
        logger.debug('PluginMetricExporter.export called');
        try {
            if (!this.isEnabled()) {
                logger.debug('PluginMetricExporter is not enabled. Skipping export.');
                return resultCallback({ code: ExportResultCode.SUCCESS });
            }
            const cleanMetrics = applyNesting(removeCircularRefs(metrics));
            pluginService.broadcastMetric(cleanMetrics);
            setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
        } catch (error: any) {
            logger.error('Error exporting metrics\n' + error.message + '\n' + error.stack);
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Error exporting metrics\n' + error.message + '\n' + error.stack),
            });
        }
    }

    shutdown(): Promise<void> {
        return Promise.resolve();
    }

    forceFlush(): Promise<void> {
        return Promise.resolve();
    }
}
