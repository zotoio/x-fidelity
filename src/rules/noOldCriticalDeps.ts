import { RuleProperties } from 'json-rules-engine';

const noDatabases: RuleProperties = {
    name: 'noDatabases',
    conditions: {
        not: {
            any: [
                {
                    fact: 'fileContent',
                    operator: 'includesString',
                    value: 'oracle'
                }
            ]
        }
    },
    event: {
        type: 'violation',
        params: {
            message: 'noDatabases: code must not directly call databases'
        }
    }  
}

export { noDatabases };