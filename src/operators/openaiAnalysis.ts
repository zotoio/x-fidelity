import { logger } from '../utils/logger';
import { RuleDefn } from '../typeDefs';
import axios from 'axios';

const openaiAnalysis: RuleDefn = {
    'name': 'openaiAnalysis',
    'fn': async (facts: any, prompt: string) => {
        let result = false;

        try {
            const response = await axios.post('https://api.openai.com/v1/engines/davinci-codex/completions', {
                prompt: prompt,
                max_tokens: 150,
                n: 1,
                stop: null,
                temperature: 0.7,
                facts: facts
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
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
