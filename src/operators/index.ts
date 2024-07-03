import { OperatorDefn } from '../typeDefs';
import { currentDependencies } from './currentDependencies';
import { fileContains } from './fileContains';
import { directoryStructureMatches } from './directoryStructureMatches';
import { openaiAnalysisPasses } from './openaiAnalysisPasses';


let operators: OperatorDefn[] = [];
operators.push(currentDependencies);
operators.push(fileContains);
operators.push(directoryStructureMatches);
operators.push(openaiAnalysisPasses);

export { operators };
