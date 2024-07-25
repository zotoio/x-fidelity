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
        await axios.post(TELEMETRY_ENDPOINT, event);
        logger.debug(`Telemetry sent: ${JSON.stringify(event)}`);
    } catch (error) {
        logger.error(`Failed to send telemetry: ${error}`);
    }
}
