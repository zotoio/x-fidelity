import ts from 'typescript';
import { FileData } from '@x-fidelity/types';
import { logger } from './logger';

export interface AstResult {
    tree: ts.Node;
    sourceFile: ts.SourceFile;
}

export function generateAst(fileData: FileData): AstResult {
    const sourceFile = ts.createSourceFile(
        fileData.fileName,
        fileData.content,
        ts.ScriptTarget.Latest,
        true
    );

    return {
        tree: sourceFile,
        sourceFile
    };
}
