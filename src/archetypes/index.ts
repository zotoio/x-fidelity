import { ArchetypeConfig } from '../types/typeDefs';

export const archetypes: Record<string, ArchetypeConfig> = {
    'node-fullstack': {
        rules: ['sensitiveLogging-iterative', 'outdatedFramework-global', 'noDatabases-iterative', 'nonStandardDirectoryStructure-global', 'openaiAnalysisTop5-global', 'openaiAnalysisA11y-global'],
        operators: ['fileContains', 'outdatedFramework', 'nonStandardDirectoryStructure', 'openaiAnalysisHighSeverity'],
        facts: ['repoFilesystemFacts', 'repoDependencyFacts', 'openaiAnalysisFacts'],
        config: {
            minimumDependencyVersions: {
                commander: '^2.0.0',
                nodemon: '^3.9.0'
            },
            standardStructure: {
                app: {
                    frontend: null,
                    server: null
                }
            },
            blacklistPatterns: [
                '.*\\/\\..*', // dot files
                '.*\\.(log|lock)$', // file extensions blacklisted
                '.*\\/(dist|coverage|build|node_modules)(\\/.*|$)' // directory names blacklisted
            ],
            whitelistPatterns: [
                '.*\\.(ts|tsx|js|jsx|md)$' // file extensions whitelisted
            ]
        }
    },
    'java-microservice': {
        rules: ['sensitiveLogging-iterative', 'outdatedFramework-global', 'noDatabases-iterative', 'nonStandardDirectoryStructure-global'],
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
            },
            blacklistPatterns: [
                '.*\\/\\..*', // dot files
                '.*\\.(log|lock)$', // file extensions blacklisted
                '.*\\/(target|build|out|dist|coverage|build|node_modules)(\\/.*|$)' // directory names blacklisted
            ],
            whitelistPatterns: [
                '.*\\.(java|xml|properties|yml)$',
                '.*\\/pom\\.xml$'
            ]
        }
    }
};
