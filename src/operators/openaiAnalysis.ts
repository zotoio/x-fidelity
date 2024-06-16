import { logger } from '../utils/logger';
import { RuleDefn } from '../typeDefs';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const openaiAnalysis: RuleDefn = {
    'name': 'openaiAnalysis',
    'fn': async (facts: any, prompt: string) => {
        let result = false;
        const model = process.env.OPENAI_MODEL || 'gpt-4-turbo';

        try {
            const response = await openai.createCompletion({
                model: model,
                prompt: prompt,
                max_tokens: 150,
                n: 1,
                stop: null,
                temperature: 0.7,
            });

            const analysis = response.data.choices[0].text.trim();
            logger.debug(`openaiAnalysis: ${analysis}`);

            // You can define your own logic to determine the result based on the analysis
            result = analysis.includes('pass'); // Example logic
        } catch (error) {
            logger.error(`openaiAnalysis: Error analyzing facts with OpenAI: ${error}`);
        }

        return result;
    }
}

export { openaiAnalysis };
