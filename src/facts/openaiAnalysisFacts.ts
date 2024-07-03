import { logger } from '../utils/logger';
import { OpenAI } from 'openai';
import { createSourceFile, ScriptTarget } from 'typescript';
import { FileData } from './repoFilesystemFacts';
import { ChatCompletionCreateParams } from 'openai/resources/chat/completions';
import { Almanac } from 'json-rules-engine';
import { ChatCompletionSystemMessageParam } from 'openai/resources';

const configuration = {
    apiKey: process.env.OPENAI_API_KEY,
};
const openai = new OpenAI(configuration);

let hasChecked = false;

const openaiAnalysis = async function (params: any, almanac: Almanac) {
    let result: object = {'result': []};
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const openaiSystemPrompt: string = await almanac.factValue('openaiSystemPrompt');
    const fileData: FileData = await almanac.factValue('fileData');

    //console.log(almanac.factValue('openaiSystemPrompt'));
    //console.log(almanac.factValue('fileData'));

    if (fileData.fileName !== 'yarn.lock' || hasChecked) {
        return result;
    }

    try {
        const payload: ChatCompletionCreateParams = {
            model,
            //response_format: { type: 'json_object' },
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
                        - codeSnippets: Array of code snippets that needs to be fixed in each file with line number and before and after code.
                    3. do not include strings or markdown around the array.` }
            ]
        };

        console.dir(payload, { depth: null });

        const response: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create(payload);
        console.log(response);

        const analysis = {'result': JSON.parse(response?.choices[0].message.content ?? '')};
        console.dir(analysis, { depth: null });

        result = analysis;
    } catch (error) {
        logger.error(`openaiAnalysis: Error analyzing facts with OpenAI: ${error}`);
    }

    hasChecked = true;
    return result;
}

const collectOpenaiAnalysisFacts = async (fileData: FileData[]) => {

    // const formattedFileData: FileData[] = fileData.map((file: FileData) => {                                                                                                                  
    //     try {
    //         file.fileAst = createSourceFile(file.fileName, file.fileContent, ScriptTarget.Latest, true);
    //     } catch (error: any) {
    //         console.error(`skip file: ${file.filePath} due to error: ${error.message}`);
    //     }
    //     return file;                                                                                                             
    // }); 
    const formattedFileData = fileData.map((file: FileData) => {     
        console.log(`formatting ${file.filePath} of length: ${file.fileContent.length}`);                                                                                                             
        if (!['yarn.lock'].includes(file.fileName)) {
            // remove tabs and newlines
            //file.fileContent = file.fileContent.replace(/[\n\t]/g, "");
            // remove consecutive spaces
            file.fileContent = file.fileContent.replace(/ {2,}/g, " ");

            return file;
        } else {
            console.log(file.filePath + ' skipped.');
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

        //logger.debug(`systemPrompt: ${systemPrompt}`);

    return systemPrompt;
}    

export { collectOpenaiAnalysisFacts, openaiAnalysis };
