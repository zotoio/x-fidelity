import { RuleDefn } from '../typeDefs';
import { currentDependencies } from './currentDependencies';
import { fileContains } from './fileContains';
import { directoryStructureMatches } from './directoryStructureMatches';
let operators: RuleDefn[] = [];
operators.push(currentDependencies);
operators.push(fileContains);
operators.push(directoryStructureMatches);

export { operators };
