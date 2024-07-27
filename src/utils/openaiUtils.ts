import { options } from "../core/cli";

export function isOpenAIEnabled(): boolean {
    return !!process.env.OPENAI_API_KEY && !!options.openaiEnabled;
}
