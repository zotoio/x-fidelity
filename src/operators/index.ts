import { OperatorDefn } from '../typeDefs';
import { outdatedFramework } from './outdatedFramework';
import { fileContains } from './fileContains';
import { nonStandardDirectoryStructure } from './nonStandardDirectoryStructure';
import { openaiAnalysisHighSeverity } from './openaiAnalysisHighSeverity';


let operators: OperatorDefn[] = [];
operators.push(outdatedFramework);
operators.push(fileContains);
operators.push(nonStandardDirectoryStructure);
operators.push(openaiAnalysisHighSeverity);

export { operators };
