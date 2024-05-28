import { RuleDefn } from '../typeDefs';
import { currentDependencies } from './currentDependencies';
import { fileContains } from './fileContains';

let operators: RuleDefn[] = [];
operators.push(currentDependencies);
operators.push(fileContains);
//oracle

export { operators };