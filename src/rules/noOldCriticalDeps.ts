import { RuleProperties } from 'json-rules-engine';

const noOldCriticalDeps: RuleProperties = {
    name: 'noOldCriticalDeps',
    conditions: {
        not: {
            any: [
                {
                    fact: 'fileContent',
                    operator: 'includesString',
                    value: 'todo new manifest operator'
                }
            ]
        }
    },
    event: {
        type: 'violation',
        params: {
            message: 'noOldCriticalDeps: some important dependencies have expired'
        }
    }  
}

export { noOldCriticalDeps };