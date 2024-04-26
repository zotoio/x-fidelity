import { OperatorEvaluator } from 'json-rules-engine';

export type RuleDefn = {
    name: string,
    fn: OperatorEvaluator<string, string>
}