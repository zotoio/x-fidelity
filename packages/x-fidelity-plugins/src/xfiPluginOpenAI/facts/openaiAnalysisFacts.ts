import { logger, isOpenAIEnabled, aiSuggestionsSchema } from '@x-fidelity/core';
import { OpenAI } from 'openai';
import { FileData, FactDefn } from '@x-fidelity/types';
import { ChatCompletionCreateParams } from 'openai/resources/chat/completions';
import { Almanac } from 'json-rules-engine';
import { ResponseFormatJSONSchema } from 'openai/resources';

let openai: OpenAI | undefined;

// Initialize OpenAI client function
const initializeOpenAI = () => {
    if (!openai && isOpenAIEnabled() && process.env.OPENAI_API_KEY) {
        const configuration = {
            apiKey: process.env.OPENAI_API_KEY,
        };
        openai = new OpenAI(configuration);
    }
    return openai;
};

// ✅ Export the function for testing - defined first to avoid circular reference
export const openaiAnalysisFn = async (params: any, almanac: Almanac) => {
   
    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    const promptText = params?.prompt || 'unknown';
    
    try {
        // Check if OpenAI is enabled first
        if (!isOpenAIEnabled()) {
            logger.debug('OpenAI is not enabled');
            return { prompt: promptText, result: [] };
        }

        // Initialize OpenAI client
        const client = initializeOpenAI();
        if (!client) {
            logger.debug('OpenAI client not initialized (missing API key)');
            return { prompt: promptText, result: [] };
        }

        const openaiSystemPrompt: string = await almanac.factValue('openaiSystemPrompt');
        const fileData: FileData = await almanac.factValue('fileData');

        // Check if we have required facts
        if (!openaiSystemPrompt || !fileData) {
            logger.debug('Missing required facts: openaiSystemPrompt or fileData');
            return { prompt: promptText, result: [] };
        }

        const responseFormat: ResponseFormatJSONSchema.JSONSchema = {
            name: 'aiSuggestions', 
            schema: aiSuggestionsSchema
        };

        const payload: ChatCompletionCreateParams = {
            model,
            messages: [
                { role: 'system', content: openaiSystemPrompt },
                { role: 'user', content: `${promptText} 
                    IMPORTANT Guidelines:
                    1. respond with each suggestion as a valid JSON object in an array that can be parsed. 
                    2. each object should have the following fields:
                        - issue: The type of issue identified.
                        - severity: value between 1 and 10 where 1 is low and 10 is high.
                        - description: Detail of the issue.
                        - filePaths: Array of file paths involved. 
                        - suggestion: The suggestion for the fix.
                        - codeSnippets: Array of code snippets that needs to be fixed in each file with each snippet object containing:
                            - filePath affected
                            - lineNumber of the issue 
                            - before and after code snippet lines
                    3. do not include strings or markdown around the array.` }
            ],
            response_format: { type: "json_schema", json_schema: responseFormat }
        };

        logger.debug({ 
            payload,
            payloadLength: JSON.stringify(payload).length,
            prompt: promptText
        }, `Running OpenAI analysis for prompt "${promptText}"`);

        const response: OpenAI.Chat.Completions.ChatCompletion = await client.chat.completions.create(payload);
        logger.debug(response, `OpenAI response for prompt "${promptText}"`);

        logger.info(`openaiAnalysis: prompt: "${promptText}" OpenAI usage: ${JSON.stringify(response.usage)}`);

        if (!response.choices[0].message.content) {
            logger.debug('OpenAI response is empty');
            return { prompt: promptText, result: [] };
        }

        let issues = [];
        try {
            const parsed = JSON.parse(response.choices[0].message.content);
            issues = parsed.issues || [];
        } catch (parseError) {
            logger.error('Failed to parse OpenAI response JSON:', parseError);
            return { prompt: promptText, result: [] };
        }

        const analysis = {
            'prompt': promptText,
            'result': issues
        };

        almanac.addRuntimeFact(params.resultFact, analysis);

        return analysis;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Error analyzing facts with OpenAI: ${error.message}`);
        } else {
            logger.error(`Unknown error occurred`);
        }
        return { prompt: promptText, result: [] };
    }
}

const collectOpenaiAnalysisFacts = async (fileData: FileData[]) => {

    const formattedFileData = fileData.map((file: FileData) => {     
        logger.debug(`formatting ${file.filePath} of length: ${file.fileContent.length}`);                                                                                                             
        if (!['REPO_GLOBAL_CHECK'].includes(file.fileName)) {
            // Create a copy to avoid modifying the original
            const formattedFile = { ...file };
            // Remove consecutive spaces (but keep single spaces)
            formattedFile.fileContent = formattedFile.fileContent.replace(/ {2,}/g, " ");
            return formattedFile;
        } else {
            logger.debug(file.filePath + ' skipped.');
            return null;  // Return null for files to skip
        }                                                                                                         
    }).filter(file => file !== null);  // Filter out null values (skipped files)
    
    const systemPrompt = `You are an expert software engineer with extensive experience in 
        software development, code analysis, and problem-solving. You have a deep understanding 
        of various programming languages, frameworks, and best practices. Your task is to analyze 
        the provided codebase, offer insights, suggest improvements, and identify any code or techniques may 
        not be aligned with best practice patterns for security, performance and any more general priciples 
        such as separation of concerns.

        The codebase is provided as an array of valid json objects. Each file in the codebase is represented 
        as an object in the array with the following fields:

        fileName: The name of the file.
        filePath: The path to the file in the codebase.
        fileContent: The content of the file as a string.
        fileAst: The abstract syntax tree (AST) of the file.  (this one is optional)

        Here is the array of json objects representing the codebase:
        
        ${JSON.stringify(formattedFileData)}
        
        Based on the provided codebase and your expertise in software engineering, order your suggestions by 
        importance or severity decending and provide a detailed explanation for each suggestion. 
        `;

        logger.debug(`systemPrompt: ${systemPrompt}`);

    return systemPrompt;
}

// ✅ Define the FactDefn after the function to avoid circular reference
const openaiAnalysis: FactDefn = {
    name: 'openaiAnalysis',
    description: 'Analyzes the codebase using OpenAI',
    type: 'global-function',  // ✅ Global-function fact - runs once per repo with different params per rule
    priority: 3,              // ✅ Lower priority since it depends on other facts
    fn: openaiAnalysisFn
};

export { collectOpenaiAnalysisFacts, openaiAnalysis };
