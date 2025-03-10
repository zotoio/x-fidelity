import Parser, { Language, SyntaxNode } from 'tree-sitter';
import * as JavaScript from 'tree-sitter-javascript';
import { default as TypeScript } from 'tree-sitter-typescript/typescript';
import { FileData } from '../types/typeDefs';
import { logger } from './logger';

// Initialize parsers
const jsParser = new Parser();
jsParser.setLanguage(JavaScript as unknown as Language);

const tsParser = new Parser();
tsParser.setLanguage(TypeScript as unknown as Language);

function getParserForFile(fileName: string): Parser {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
        return tsParser;
    }
    return jsParser;
}

export function generateAst(fileData: FileData) {
    try {
        logger.debug({ fileName: fileData?.fileName }, 'Processing file for AST generation');
        
        if (!fileData?.fileContent || fileData.fileName === 'REPO_GLOBAL_CHECK') {
            logger.debug('Skipping AST generation - no content or REPO_GLOBAL_CHECK');
            return { tree: null };
        }

        const parser = getParserForFile(fileData.fileName);
        logger.debug({ fileName: fileData.fileName, parserType: parser === jsParser ? 'JavaScript' : 'TypeScript' }, 'Selected parser for file');

        const tree = parser.parse(fileData.fileContent);
        logger.debug({ 
            fileName: fileData.fileName,
            rootType: tree.rootNode.type,
            childCount: tree.rootNode.childCount,
            startPosition: tree.rootNode.startPosition,
            endPosition: tree.rootNode.endPosition
        }, 'Generated AST');

        return { tree };
    } catch (error) {
        logger.error(`Error generating AST: ${error}`);
        return { tree: null };
    }
}
