import axios, { AxiosError } from 'axios';
import { logger } from './logger';
import { TelemetryEvent } from '@x-fidelity/types';

export async function sendTelemetry(event: TelemetryEvent): Promise<void> {
    try {
        const response = await axios.post('https://telemetry.example.com/collect', event);
        logger.debug(`Telemetry sent successfully: ${response.status}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            logger.debug(`Failed to send telemetry: ${axiosError.message}`);
            if (axiosError.response) {
                logger.debug(`Response status: ${axiosError.response.status}`);
            }
        } else {
            logger.debug('Failed to send telemetry: Unknown error');
        }
    }
}
