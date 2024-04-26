import { RuleDefn } from '../typeDefs';
import { includesString } from './includesString';

let operators: RuleDefn[] = [];
operators.push(includesString);

export { operators };