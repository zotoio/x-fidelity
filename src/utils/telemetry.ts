import axios from 'axios';
import { logger } from './logger';
import { options } from "../core/cli";
import { TelemetryEvent } from '../types/typeDefs';

const TELEMETRY_ENDPOINT = process.env.TELEMETRY_ENDPOINT || options.telemetryCollector || (options.configServer ? `${options.configServer}/telemetry` : null);
const SHARED_SECRET = process.env.XFI_SHARED_SECRET;

export async function sendTelemetry(event: TelemetryEvent, logPrefix: string): Promise<void> {
    if (!TELEMETRY_ENDPOINT || !SHARED_SECRET) {
        logger.debug('Telemetry endpoint not set or shared secret missing. Skipping telemetry.');
        return;
    }
    try {
        await axios.post(TELEMETRY_ENDPOINT, event, {
            timeout: 5000, // 5 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'x-fidelity-telemetry',
                'X-Log-Prefix': logPrefix,
                'X-Shared-Secret': SHARED_SECRET
            }
        });
        logger.debug(`Telemetry sent: ${JSON.stringify(event)}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            logger.debug(`Failed to send telemetry: ${error.message}`);
            if (error.response) {
                logger.debug(`Response status: ${error.response.status}`);
            }
        } else {
            logger.debug(`Failed to send telemetry: ${error}`);
        }
    }
}
