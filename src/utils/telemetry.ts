import { axiosClient, isAxiosError } from './axiosClient';
import { logger } from './logger';
import { options } from "../core/cli";
import { TelemetryEvent } from '../types/typeDefs';

const TELEMETRY_ENDPOINT = process.env.TELEMETRY_ENDPOINT || options.telemetryCollector || (options.configServer ? `${options.configServer}/telemetry` : null);
const SHARED_SECRET = process.env.XFI_SHARED_SECRET;

export async function sendTelemetry(event: TelemetryEvent, logPrefix: string): Promise<void> {
    if (!TELEMETRY_ENDPOINT) {
        logger.trace('Telemetry endpoint or config server not set. Skipping telemetry.');
        return;
    }
    try {
        await axiosClient.post(TELEMETRY_ENDPOINT, event, {
            timeout: 5000, // 5 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'x-fidelity-telemetry',
                'X-Log-Prefix': logPrefix,
                'X-Shared-Secret': SHARED_SECRET
            }
        });
        logger.debug({ 
            telemetryData: event,
            type: 'telemetry-received'
        }, 'Accepting telemetry data');
    } catch (error) {
        if (isAxiosError(error)) {
            logger.debug(`Failed to send telemetry: ${error.message}`);
            if (error.response) {
                logger.debug(`Response status: ${error.response.status}`);
            }
        } else {
            logger.debug(`Failed to send telemetry: ${error}`);
        }
    }
}
