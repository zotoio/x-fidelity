import { OperatorEvaluator } from 'json-rules-engine';

export type RuleDefn = {
    name: string,
    fn: OperatorEvaluator<string, any>
}
export interface ScanResult {
    filePath: string;
    errors: RuleFailure[];
}
/**
 * Represents a rule failure.
 */
export interface RuleFailure {
    ruleFailure: string;
    details: Record<string, any> | undefined;
}/**
 * Represents the version data of a dependency.
 */

export interface VersionData {
    dep: string;
    ver: string;
    min: string;
}
/**
 * Represents the minimum dependency versions.
 */

export interface MinimumDepVersions {
    [propertyName: string]: string;
}
/**
 * Represents the local dependencies.
 */

export interface LocalDependencies {
    [propertyName: string]: { version: string; };
}

