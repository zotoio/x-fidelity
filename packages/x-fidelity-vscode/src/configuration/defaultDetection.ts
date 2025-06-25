// vscode import removed as it's not used in this utility module
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProjectDetection {
  archetype: string;
  confidence: number;
  indicators: string[];
}

export class DefaultDetectionService {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  async detectArchetype(): Promise<ProjectDetection[]> {
    try {
      // Add timeout to prevent hanging
      const detectionPromise = this.performDetections();
      const timeoutPromise = new Promise<ProjectDetection[]>((_, reject) => {
        setTimeout(
          () => reject(new Error('Archetype detection timeout')),
          10000
        ); // 10 second timeout
      });

      const results = await Promise.race([detectionPromise, timeoutPromise]);
      return results.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.warn('Archetype detection failed:', error);
      // Return default fallback detection
      return [
        {
          archetype: 'node-fullstack',
          confidence: 30,
          indicators: ['fallback - detection failed']
        }
      ];
    }
  }

  private async performDetections(): Promise<ProjectDetection[]> {
    const detections: ProjectDetection[] = [];

    // Detect Node.js projects
    try {
      const nodeDetection = await this.detectNodeProject();
      if (nodeDetection) {
        detections.push(nodeDetection);
      }
    } catch (error) {
      console.warn('Node.js detection failed:', error);
    }

    // Detect Java projects
    try {
      const javaDetection = await this.detectJavaProject();
      if (javaDetection) {
        detections.push(javaDetection);
      }
    } catch (error) {
      console.warn('Java detection failed:', error);
    }

    // Detect Python projects
    try {
      const pythonDetection = await this.detectPythonProject();
      if (pythonDetection) {
        detections.push(pythonDetection);
      }
    } catch (error) {
      console.warn('Python detection failed:', error);
    }

    // Detect .NET projects
    try {
      const dotnetDetection = await this.detectDotNetProject();
      if (dotnetDetection) {
        detections.push(dotnetDetection);
      }
    } catch (error) {
      console.warn('.NET detection failed:', error);
    }

    return detections;
  }

  private async detectNodeProject(): Promise<ProjectDetection | null> {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');

    try {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8')
      );
      const indicators: string[] = ['package.json'];
      let confidence = 60;

      // Check for specific frameworks
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      // React-based projects
      if (dependencies.react || dependencies['@types/react']) {
        indicators.push('React dependencies');
        confidence += 20;

        if (dependencies.next || dependencies['next']) {
          return {
            archetype: 'next-fullstack',
            confidence: confidence + 10,
            indicators: [...indicators, 'Next.js']
          };
        }

        if (dependencies['react-native']) {
          return {
            archetype: 'react-native',
            confidence: confidence + 5,
            indicators: [...indicators, 'React Native']
          };
        }

        return {
          archetype: 'node-fullstack',
          confidence,
          indicators: [...indicators, 'React SPA']
        };
      }

      // Vue.js projects
      if (dependencies.vue || dependencies['@vue/cli']) {
        return {
          archetype: 'vue-spa',
          confidence: confidence + 15,
          indicators: [...indicators, 'Vue.js']
        };
      }

      // Angular projects
      if (dependencies['@angular/core']) {
        return {
          archetype: 'angular-spa',
          confidence: confidence + 15,
          indicators: [...indicators, 'Angular']
        };
      }

      // Backend frameworks
      if (dependencies.express || dependencies.fastify || dependencies.koa) {
        indicators.push('Backend framework');
        confidence += 15;
      }

      // Electron projects
      if (dependencies.electron) {
        return {
          archetype: 'electron-app',
          confidence: confidence + 10,
          indicators: [...indicators, 'Electron']
        };
      }

      // TypeScript projects
      if (
        dependencies.typescript ||
        (await this.fileExists(path.join(this.workspaceRoot, 'tsconfig.json')))
      ) {
        indicators.push('TypeScript');
        confidence += 10;
      }

      // Test frameworks
      if (
        packageJson.scripts?.test ||
        dependencies.jest ||
        dependencies.mocha
      ) {
        indicators.push('Test scripts');
        confidence += 5;
      }

      return {
        archetype: 'node-fullstack',
        confidence,
        indicators
      };
    } catch {
      return null;
    }
  }

  private async detectJavaProject(): Promise<ProjectDetection | null> {
    const indicators: string[] = [];
    let confidence = 0;

    // Check for Maven
    const pomPath = path.join(this.workspaceRoot, 'pom.xml');
    if (await this.fileExists(pomPath)) {
      indicators.push('pom.xml');
      confidence += 40;

      try {
        const pomContent = await fs.readFile(pomPath, 'utf8');

        // Check for Spring Boot
        if (pomContent.includes('spring-boot')) {
          indicators.push('Spring Boot');
          confidence += 20;
        }

        // Check for microservices patterns
        if (
          pomContent.includes('spring-cloud') ||
          pomContent.includes('eureka')
        ) {
          indicators.push('Microservices');
          confidence += 10;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    // Check for Gradle
    const gradlePath = path.join(this.workspaceRoot, 'build.gradle');
    const gradleKtsPath = path.join(this.workspaceRoot, 'build.gradle.kts');
    if (
      (await this.fileExists(gradlePath)) ||
      (await this.fileExists(gradleKtsPath))
    ) {
      indicators.push('Gradle build');
      confidence += 40;
    }

    // Check for Spring Boot application properties
    const applicationProps = path.join(
      this.workspaceRoot,
      'src/main/resources/application.properties'
    );
    const applicationYml = path.join(
      this.workspaceRoot,
      'src/main/resources/application.yml'
    );
    if (
      (await this.fileExists(applicationProps)) ||
      (await this.fileExists(applicationYml))
    ) {
      indicators.push('Spring Boot configuration');
      confidence += 20;
    }

    // Check for standard Maven/Gradle structure
    const srcMainJava = path.join(this.workspaceRoot, 'src/main/java');
    if (await this.directoryExists(srcMainJava)) {
      indicators.push('Standard Java structure');
      confidence += 15;
    }

    if (confidence > 30) {
      return {
        archetype: 'java-microservice',
        confidence,
        indicators
      };
    }

    return null;
  }

  private async detectPythonProject(): Promise<ProjectDetection | null> {
    const indicators: string[] = [];
    let confidence = 0;

    // Check for requirements.txt
    if (
      await this.fileExists(path.join(this.workspaceRoot, 'requirements.txt'))
    ) {
      indicators.push('requirements.txt');
      confidence += 30;
    }

    // Check for pyproject.toml
    if (
      await this.fileExists(path.join(this.workspaceRoot, 'pyproject.toml'))
    ) {
      indicators.push('pyproject.toml');
      confidence += 25;
    }

    // Check for setup.py
    if (await this.fileExists(path.join(this.workspaceRoot, 'setup.py'))) {
      indicators.push('setup.py');
      confidence += 20;
    }

    // Check for Pipfile (Pipenv)
    if (await this.fileExists(path.join(this.workspaceRoot, 'Pipfile'))) {
      indicators.push('Pipfile');
      confidence += 25;
    }

    // Check for common Python frameworks
    try {
      const requirementsPath = path.join(
        this.workspaceRoot,
        'requirements.txt'
      );
      if (await this.fileExists(requirementsPath)) {
        const requirements = await fs.readFile(requirementsPath, 'utf8');

        if (requirements.includes('django')) {
          indicators.push('Django framework');
          confidence += 15;
        }

        if (requirements.includes('flask')) {
          indicators.push('Flask framework');
          confidence += 15;
        }

        if (requirements.includes('fastapi')) {
          indicators.push('FastAPI framework');
          confidence += 15;
        }
      }
    } catch {
      // Ignore parsing errors
    }

    // Check for Python files in root
    try {
      const files = await fs.readdir(this.workspaceRoot);
      const pyFiles = files.filter(f => f.endsWith('.py'));
      if (pyFiles.length > 0) {
        indicators.push(`${pyFiles.length} Python files`);
        confidence += Math.min(pyFiles.length * 2, 10);
      }
    } catch {
      // Ignore directory read errors
    }

    if (confidence > 20) {
      return {
        archetype: 'python-service',
        confidence,
        indicators
      };
    }

    return null;
  }

  private async detectDotNetProject(): Promise<ProjectDetection | null> {
    const indicators: string[] = [];
    let confidence = 0;

    // Check for .csproj files
    try {
      const files = await fs.readdir(this.workspaceRoot);
      const csprojFiles = files.filter(f => f.endsWith('.csproj'));

      if (csprojFiles.length > 0) {
        indicators.push(`${csprojFiles.length} .csproj files`);
        confidence += 40;
      }
    } catch {
      // Ignore directory read errors
    }

    // Check for .sln files
    if (await this.hasFileWithExtension('.sln')) {
      indicators.push('Solution file');
      confidence += 30;
    }

    // Check for global.json
    if (await this.fileExists(path.join(this.workspaceRoot, 'global.json'))) {
      indicators.push('global.json');
      confidence += 15;
    }

    // Check for appsettings.json
    if (
      await this.fileExists(path.join(this.workspaceRoot, 'appsettings.json'))
    ) {
      indicators.push('appsettings.json');
      confidence += 15;
    }

    if (confidence > 30) {
      return {
        archetype: 'dotnet-service',
        confidence,
        indicators
      };
    }

    return null;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      // Only log if it's not a simple "file not found" error
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code !== 'ENOENT'
      ) {
        console.warn(`File access error for ${filePath}:`, error);
      }
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch (error) {
      // Only log if it's not a simple "file not found" error
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code !== 'ENOENT'
      ) {
        console.warn(`Directory access error for ${dirPath}:`, error);
      }
      return false;
    }
  }

  private async hasFileWithExtension(extension: string): Promise<boolean> {
    try {
      const files = await fs.readdir(this.workspaceRoot);
      return files.some(f => f.endsWith(extension));
    } catch {
      return false;
    }
  }
}
