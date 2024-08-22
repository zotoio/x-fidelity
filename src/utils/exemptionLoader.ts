import { axiosClient } from "./axiosClient";
import { logger } from "./logger";
import { Exemption } from "../types/typeDefs";

export async function loadExemptions(configServer: string, logPrefix?: string): Promise<Exemption[]> {
    try {
        const exemptionsUrl = new URL(`/exemptions`, configServer).toString();
        logger.info(`Fetching remote exemptions from: ${exemptionsUrl}`);
        const response = await axiosClient.get(exemptionsUrl, {
            headers: {
                'X-Log-Prefix': logPrefix || ''
            },
            validateStatus: (status) => status === 200
        });
        const fetchedExemptions = response.data;
        logger.info(`Remote exemptions fetched successfully ${JSON.stringify(fetchedExemptions)}`);
        return fetchedExemptions;
    } catch (error) {
        logger.error(`Error loading remote exemptions: ${error}`);
        return [];
    }
}
