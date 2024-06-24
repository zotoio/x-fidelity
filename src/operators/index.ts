import { RuleDefn } from '../typeDefs';
import { currentDependencies } from './currentDependencies';
import { fileContains } from './fileContains';
import { directoryStructureMatches } from './directoryStructureMatches';
import { codeComplexity } from './codeComplexity';
operators.push(currentDependencies);
operators.push(fileContains);
operators.push(directoryStructureMatches);
operators.push(codeComplexity);

export { operators };
