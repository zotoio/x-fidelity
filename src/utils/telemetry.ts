import axios from 'axios';
import { logger } from './logger';
import { options } from "../core/cli";

interface TelemetryEvent {
    eventType: string;
    metadata: {
        archetype: string;
        repoPath: string;
        [key: string]: any;
    };
    timestamp: string;
}

const TELEMETRY_ENDPOINT = process.env.TELEMETRY_ENDPOINT || (options.configServer ? `${options.configServer}/telemetry` : '');

export async function sendTelemetry(event: TelemetryEvent): Promise<void> {
    if (!TELEMETRY_ENDPOINT) {
        logger.debug('Telemetry endpoint not set. Skipping telemetry');
        return;
    }
    try {
        await axios.post(TELEMETRY_ENDPOINT, event, {
            timeout: 5000, // 5 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'x-fidelity-telemetry'
            }
        });
        logger.debug(`Telemetry sent: ${JSON.stringify(event)}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            logger.error(`Failed to send telemetry: ${error.message}`);
            if (error.response) {
                logger.error(`Response status: ${error.response.status}`);
            }
        } else {
            logger.error(`Failed to send telemetry: ${error}`);
        }
    }
}
