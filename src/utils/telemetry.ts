import axios from 'axios';
import { logger } from './logger';
import { options } from "../core/cli";
import { TelemetryEvent } from '../types/typeDefs';

const TELEMETRY_ENDPOINT = process.env.TELEMETRY_ENDPOINT || options.telemetryCollector || (options.configServer ? `${options.configServer}/telemetry` : null);

export async function sendTelemetry(event: TelemetryEvent, logPrefix: string): Promise<void> {
    if (!TELEMETRY_ENDPOINT) {
        logger.debug('telemetry endpoint not set. skipping telemetry');
        return;
    }
    try {
        await axios.post(TELEMETRY_ENDPOINT, event, {
            timeout: 5000, // 5 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'x-fidelity-telemetry',
                'X-Log-Prefix': logPrefix
            }
        });
        logger.debug(`telemetry sent: ${JSON.stringify(event)}`);
        return;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            logger.debug(`failed to send telemetry: ${error.message}`);
            if (error.response) {
                logger.debug(`response status: ${error.response.status}`);
            }
        } else {
            logger.debug(`failed to send telemetry: ${error}`);
        }
        return;
    }
}
