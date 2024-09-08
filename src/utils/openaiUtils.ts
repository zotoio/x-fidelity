import { options } from "../core/cli";
import { logger } from "./logger";

export function getOpenAIStatus(): { isEnabled: boolean; reason?: string } {
    if (!process.env.OPENAI_API_KEY) {
        logger.warn("OpenAI API key is missing");
        return { isEnabled: false, reason: "API key is missing" };
    }
    if (!options.openaiEnabled) {
        logger.info("OpenAI integration is disabled in options");
        return { isEnabled: false, reason: "Disabled in options" };
    }
    return { isEnabled: true };
}

export function isOpenAIEnabled(): boolean {
    return getOpenAIStatus().isEnabled;
}
