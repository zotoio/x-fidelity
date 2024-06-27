import { RuleProperties } from 'json-rules-engine';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';

const noSensitiveLoggingRule: RuleProperties = {
    name: 'noSensitiveLogging',
    conditions: {
        all: [
            {
                fact: 'fileContent',
                operator: 'custom',
                value: (fileContent: string) => {
                    const ast = parser.parse(fileContent, {
                        sourceType: 'module',
                        plugins: ['typescript']
                    });

                    let hasSensitiveLogging = false;

                    traverse(ast, {
                        CallExpression(path) {
                            const callee = path.node.callee;
                            if (
                                callee.type === 'MemberExpression' &&
                                callee.object.type === 'Identifier' &&
                                callee.object.name === 'logger' &&
                                callee.property.type === 'Identifier' &&
                                ['log', 'info', 'warn', 'error', 'debug'].includes(callee.property.name)
                            ) {
                                const args = path.node.arguments;
                                for (const arg of args) {
                                    if (
                                        arg.type === 'StringLiteral' &&
                                        (arg.value.includes('token') || arg.value.includes('secret'))
                                    ) {
                                        hasSensitiveLogging = true;
                                    }
                                }
                            }
                        }
                    });

                    return !hasSensitiveLogging;
                }
            }
        ]
    },
    event: {
        type: 'noSensitiveLogging',
        params: {
            message: 'Sensitive data (token or secret) should not be logged.'
        }
    }
};

export default noSensitiveLoggingRule;
