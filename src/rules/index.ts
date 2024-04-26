import { RuleProperties } from 'json-rules-engine';
import { noDatabases } from './noDatabases';
import { noOldCriticalDeps } from './noOldCriticalDeps';

let rules: RuleProperties[] = [];
rules.push(noDatabases);
rules.push(noOldCriticalDeps);

export { rules };