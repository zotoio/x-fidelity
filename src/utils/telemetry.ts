import axios from 'axios';
import { logger } from './logger';

interface TelemetryEvent {
    eventType: string;
    metadata: {
        archetype: string;
        repoPath: string;
        [key: string]: any;
    };
    timestamp: string;
}

const TELEMETRY_ENDPOINT = process.env.TELEMETRY_ENDPOINT || 'https://example.com/telemetry';

export async function sendTelemetry(event: TelemetryEvent): Promise<void> {
    try {
        await axios.post(TELEMETRY_ENDPOINT, event);
        logger.debug(`Telemetry sent: ${JSON.stringify(event)}`);
    } catch (error) {
        logger.error(`Failed to send telemetry: ${error}`);
    }
}
