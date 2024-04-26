import { RuleDefn } from '../typeDefs';

const includesString: RuleDefn = {
    'name': 'includesString', 
    'fn': (factValue:string, jsonValue:string) => {
        return factValue?.toLowerCase()?.includes(jsonValue.toLowerCase())
    }
}

export { includesString };