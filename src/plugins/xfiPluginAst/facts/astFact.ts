import { FactDefn, FileData } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import Parser, { Language, SyntaxNode } from 'tree-sitter';
import * as JavaScript from 'tree-sitter-javascript';
import { default as TypeScript } from 'tree-sitter-typescript/typescript';

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

export const astFact: FactDefn = {
    name: 'ast',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            
            if (!fileData?.fileContent || fileData.fileName === 'REPO_GLOBAL_CHECK') {
                return { tree: null };
            }

            const parser = getParserForFile(fileData.fileName);
            const tree = parser.parse(fileData.fileContent);

            // Add the AST to the almanac for other facts/operators to use
            if (params?.resultFact) {
                almanac.addRuntimeFact(params.resultFact, { tree });
            }

            return { tree };
        } catch (error) {
            logger.error(`Error generating AST: ${error}`);
            return { tree: null };
        }
    }
};
