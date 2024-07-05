import { OperatorDefn } from '../typeDefs';
import { currentDependencies } from './currentDependencies';
import { fileContains } from './fileContains';
import { directoryStructureMatches } from './directoryStructureMatches';
import { openaiAnalysisHighSeverity } from './openaiAnalysisHighSeverity';


let operators: OperatorDefn[] = [];
operators.push(currentDependencies);
operators.push(fileContains);
operators.push(directoryStructureMatches);
operators.push(openaiAnalysisHighSeverity);

export { operators };
