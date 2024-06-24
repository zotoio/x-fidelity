import { logger } from '../utils/logger';
import { RuleDefn } from '../typeDefs';
import { OpenAI } from 'openai';

const configuration = {
    apiKey: process.env.OPENAI_API_KEY,
};
const openai = new OpenAI(configuration);

const openaiAnalysisFacts = async function (params: any, engine: any) {
    let result;
    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo';

    const fullPrompt = `${params.prompt}\n\nFacts:\n${JSON.stringify(params.facts, null, 2)}`;

    try {
        const response = await openai.chat.completions.create({model: 'gpt-4o',
            response_format: { type: 'json_object' },
            messages: [{ role: 'user', content: fullPrompt }]
        });

        const analysis = response?.choices[0]?.message?.content?.trim();
        logger.debug(`openaiAnalysis: ${analysis}`);

        result = analysis;
    } catch (error) {
        logger.error(`openaiAnalysis: Error analyzing facts with OpenAI: ${error}`);
    }

    return result;
}

export { openaiAnalysisFacts };
