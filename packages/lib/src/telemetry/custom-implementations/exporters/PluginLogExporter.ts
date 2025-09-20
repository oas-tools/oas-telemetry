import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { ReadableLogRecord, LogRecordExporter } from '@opentelemetry/sdk-logs';
import logger from '../../../utils/logger.js';
import { Enabler } from '../wrappers.js';
import { pluginService } from '../../../tlm-plugin/pluginService.js';
import { applyNesting, removeCircularRefs } from '../utils/circular.js';

export class PluginLogExporter extends Enabler implements LogRecordExporter {
    constructor() {
        super();
    }

    export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void {
        logger.debug('PluginLogExporter.export called with logs: ', logs.length);
        try {
            if (!this.isEnabled()) {
                logger.debug('PluginLogExporter is not enabled. Skipping export.');
                return resultCallback({ code: ExportResultCode.SUCCESS });
            }
            const cleanLogs = logs
                .map(log => removeCircularRefs(log))
                .map(log => applyNesting(log));
            cleanLogs.forEach(log => {
                pluginService.broadcastLog(log);
            }
            );
            setTimeout(() => resultCallback({ code: ExportResultCode.SUCCESS }), 0);
        } catch (error: any) {
            logger.error('Error exporting logs\n' + error.message + '\n' + error.stack);
            return resultCallback({
                code: ExportResultCode.FAILED,
                error: new Error('Error exporting logs\n' + error.message + '\n' + error.stack),
            });
        }
    }

    shutdown(): Promise<void> {
        return Promise.resolve();
    }
}
