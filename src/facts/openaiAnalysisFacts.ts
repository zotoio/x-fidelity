import { logger } from '../utils/logger';
import { OpenAI } from 'openai';
import { FileData } from './repoFilesystemFacts';
import { ChatCompletionCreateParams } from 'openai/resources/chat/completions';
import { Almanac } from 'json-rules-engine';

let openai: OpenAI | undefined;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_ENABLED === 'true') {
    const configuration = {
        apiKey: process.env.OPENAI_API_KEY,
    };
    openai = new OpenAI(configuration); 
}    

const openaiAnalysis = async function (params: any, almanac: Almanac) {
    let result: object = {'result': []};
    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    
    try {
        if (!openai) {
            throw new Error('OpenAI client is not initialized');
        }

        const openaiSystemPrompt: string = await almanac.factValue('openaiSystemPrompt');
        const fileData: FileData = await almanac.factValue('fileData');

        if (fileData.fileName !== 'REPO_GLOBAL_CHECK') {
            return result;
        }

        const payload: ChatCompletionCreateParams = {
            model,
            messages: [
                { role: 'system', content: openaiSystemPrompt },
                { role: 'user', content: `${params.prompt} 
                    IMPORTANT Guidelines:
                    1. respond with each suggestion as an object in an array that can be parsed. 
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
            ]
        };

        logger.debug(payload);
        logger.debug(`running global openaiAnalysis with prompt variant: ${params.prompt}..`);
        const response: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create(payload);
        logger.debug(response);

        if (!response.choices[0].message.content) {
            throw new Error('OpenAI response is empty');
        }

        const analysis = {
            'result': JSON.parse(response.choices[0].message.content)
        };

        almanac.addRuntimeFact(params.resultFact, analysis);

        result = analysis;
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`openaiAnalysis: Error analyzing facts with OpenAI: ${error.message}`);
        } else {
            logger.error(`openaiAnalysis: Unknown error occurred`);
        }
    }

    return result;
}

const collectOpenaiAnalysisFacts = async (fileData: FileData[]) => {

    const formattedFileData = fileData.map((file: FileData) => {     
        logger.debug(`formatting ${file.filePath} of length: ${file.fileContent.length}`);                                                                                                             
        if (!['REPO_GLOBAL_CHECK'].includes(file.fileName)) {
            // remove tabs and newlines
            //file.fileContent = file.fileContent.replace(/[\n\t]/g, "");
            // remove consecutive spaces
            file.fileContent = file.fileContent.replace(/ {2,}/g, " ");

            return file;
        } else {
            logger.debug(file.filePath + ' skipped.');
        }                                                                                                         
    }); 
    
    const systemPrompt = `You are an expert software engineer with extensive experience in 
        software development, code analysis, and problem-solving. You have a deep understanding 
        of various programming languages, frameworks, and best practices. Your task is to analyze 
        the provided codebase, offer insights, suggest improvements, and answer any questions 
        related to software engineering.

        A codebase is described by an array of json objects. Each file in the codebase is represented 
        as an object in the array with the following fields:

        fileName: The name of the file.
        filePath: The path to the file in the codebase.
        fileContent: The content of the file as a string.
        fileAst: The abstract syntax tree (AST) of the file.  (this one is optional)

        Here is the array of json objects representing the codebase:
        
        ${JSON.stringify(formattedFileData, null)}
        
        Based on the provided codebase and your expertise in software engineering: 
        `;

        logger.debug(`systemPrompt: ${systemPrompt}`);

    return systemPrompt;
}    

export { collectOpenaiAnalysisFacts, openaiAnalysis };
