import { archetypes } from './index';

describe('archetypes', () => {
  it('should have node-fullstack archetype', () => {
    expect(archetypes['node-fullstack']).toBeDefined();
  });

  it('should have java-microservice archetype', () => {
    expect(archetypes['java-microservice']).toBeDefined();
  });

  describe('node-fullstack archetype', () => {
    const nodeFullstack = archetypes['node-fullstack'];

    it('should have correct rules', () => {
      expect(nodeFullstack.rules).toContain('sensitiveLogging');
      expect(nodeFullstack.rules).toContain('outdatedFramework');
      expect(nodeFullstack.rules).toContain('noDatabases');
      expect(nodeFullstack.rules).toContain('nonStandardDirectoryStructure');
      expect(nodeFullstack.rules).toContain('openaiAnalysisTop5');
      expect(nodeFullstack.rules).toContain('openaiAnalysisA11y');
    });

    it('should have correct operators', () => {
      expect(nodeFullstack.operators).toContain('fileContains');
      expect(nodeFullstack.operators).toContain('outdatedFramework');
      expect(nodeFullstack.operators).toContain('nonStandardDirectoryStructure');
      expect(nodeFullstack.operators).toContain('openaiAnalysisHighSeverity');
    });

    it('should have correct facts', () => {
      expect(nodeFullstack.facts).toContain('repoFilesystemFacts');
      expect(nodeFullstack.facts).toContain('repoDependencyFacts');
      expect(nodeFullstack.facts).toContain('openaiAnalysisFacts');
    });

    it('should have correct minimum dependency versions', () => {
      expect(nodeFullstack.config.minimumDependencyVersions).toEqual({
        commander: '^2.0.0',
        nodemon: '^3.9.0'
      });
    });

    it('should have correct standard structure', () => {
      expect(nodeFullstack.config.standardStructure).toEqual({
        src: {
          core: null,
          utils: null,
          operators: null,
          rules: null,
          facts: null
        }
      });
    });

    it('should have correct blacklist patterns', () => {
      expect(nodeFullstack.config.blacklistPatterns).toContain('.*\\/\\..*');
      expect(nodeFullstack.config.blacklistPatterns).toContain('.*\\.(log|lock)$');
      expect(nodeFullstack.config.blacklistPatterns).toContain('.*\\/(dist|coverage|build|node_modules)(\\/.*|$)');
    });

    it('should have correct whitelist patterns', () => {
      expect(nodeFullstack.config.whitelistPatterns).toContain('.*\\.(ts|tsx|js|jsx|md)$');
    });
  });

  describe('java-microservice archetype', () => {
    const javaMicroservice = archetypes['java-microservice'];

    it('should have correct rules', () => {
      expect(javaMicroservice.rules).toContain('sensitiveLogging');
      expect(javaMicroservice.rules).toContain('outdatedFramework');
      expect(javaMicroservice.rules).toContain('noDatabases');
      expect(javaMicroservice.rules).toContain('nonStandardDirectoryStructure');
    });

    it('should have correct operators', () => {
      expect(javaMicroservice.operators).toContain('fileContains');
      expect(javaMicroservice.operators).toContain('outdatedFramework');
      expect(javaMicroservice.operators).toContain('nonStandardDirectoryStructure');
    });

    it('should have correct facts', () => {
      expect(javaMicroservice.facts).toContain('repoFilesystemFacts');
      expect(javaMicroservice.facts).toContain('repoDependencyFacts');
    });

    it('should have correct minimum dependency versions', () => {
      expect(javaMicroservice.config.minimumDependencyVersions).toEqual({
        'spring-boot-starter': '^2.5.0',
        'spring-boot-starter-web': '^2.5.0'
      });
    });

    it('should have correct standard structure', () => {
      expect(javaMicroservice.config.standardStructure).toEqual({
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
      });
    });

    it('should have correct blacklist patterns', () => {
      expect(javaMicroservice.config.blacklistPatterns).toContain('.*\\/\\..*');
      expect(javaMicroservice.config.blacklistPatterns).toContain('.*\\.(log|lock)$');
      expect(javaMicroservice.config.blacklistPatterns).toContain('.*\\/(target|build|out|dist|coverage|build|node_modules)(\\/.*|$)');
    });

    it('should have correct whitelist patterns', () => {
      expect(javaMicroservice.config.whitelistPatterns).toContain('.*\\.(java|xml|properties|yml)$');
      expect(javaMicroservice.config.whitelistPatterns).toContain('.*\\/pom\\.xml$');
    });
  });
});
