import axios from 'axios';

const archetypes = {
    'node-fullstack': {
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
            },
            blacklistPatterns: [
                /.*\/\..*/, // dot files
                /.*\.(log|lock)$/, // file extensions blacklisted
                /.*\/(dist|coverage|build|node_modules)(\/.*|$)/ // directory names blacklisted
            ],
            whitelistPatterns: [
                /.*\.(ts|tsx|js|jsx|md)$/ // file extensions whitelisted
            ]
        }
    },
    'java-microservice': {
        rules: ['sensitivefLogging', 'outdatedFramework', 'noDatabases', 'nonStandardDirectoryStructure'],
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
                /.*\/\..*/, // dot files
                /.*\.(log|lock)$/, // file extensions blacklisted
                /.*\/(target|build|out)(\/.*|$)/ // directory names blacklisted
            ],
            whitelistPatterns: [
                /.*\.(java|xml|properties|yml)$/,
                /.*\/pom\.xml$/
            ]
        }
    }
};

export async function getArchetypeConfig(archetype = 'node-fullstack', configUrl) {
    let config = archetypes[archetype] || archetypes['node-fullstack'];

    if (configUrl) {
        try {
            const response = await axios.get(configUrl);
            config = {
                ...config,
                config: {
                    ...config.config,
                    ...response.data
                }
            };
        } catch (error) {
            console.error(`Error fetching remote config: ${error}`);
        }
    }

    return config;
}

export function getMinimumDependencyVersions(config) {
    return config.config.minimumDependencyVersions;
}

export function getStandardStructure(config) {
    return config.config.standardStructure;
}

export function getBlacklistPatterns(config) {
    return config.config.blacklistPatterns;
}

export function getWhitelistPatterns(config) {
    return config.config.whitelistPatterns;
}
