import { ArchetypeConfig } from '../typeDefs';

const nodeFullstack: ArchetypeConfig = {
    rules: ['sensitiveLogging', 'outdatedFramework', 'noDatabases', 'nonStandardDirectoryStructure', 'openaiAnalysisTop5', 'openaiAnalysisA11y'],
    operators: ['fileContains', 'outdatedFramework', 'nonStandardDirectoryStructure', 'openaiAnalysisHighSeverity'],
    facts: ['repoFilesystemFacts', 'repoDependencyFacts', 'openaiAnalysisFacts'],
    config: {
        minimumDependencyVersions: {
            commander: '^2.0.0',
            nodemon: '^3.9.0'
        },
        standardStructure: {
            src: {
                core: null,
                utils: null,
                operators: null,
                rules: null,
                facts: null
            }
        }
    }
};

const javaMicroservice: ArchetypeConfig = {
    rules: ['sensitiveLogging', 'outdatedFramework', 'noDatabases', 'nonStandardDirectoryStructure'],
    operators: ['fileContains', 'outdatedFramework', 'nonStandardDirectoryStructure'],
    facts: ['repoFilesystemFacts', 'repoDependencyFacts'],
    config: {
        minimumDependencyVersions: {
            'spring-boot-starter': '^2.5.0',
            'spring-boot-starter-web': '^2.5.0'
        },
        standardStructure: {
            src: {
                main: {
                    java: null,
                    resources: null
                },
                test: {
                    java: null,
                    resources: null
                }
            }
        }
    }
};

const archetypes: Record<string, ArchetypeConfig> = {
    'node-fullstack': nodeFullstack,
    'java-microservice': javaMicroservice
};

export { archetypes };
