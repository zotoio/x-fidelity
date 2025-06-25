/**
 * CLI-VSCode Consistency Testing Framework
 * 
 * This framework provides tools to:
 * 1. Create reproducible test repositories
 * 2. Run analysis via both CLI and VSCode simulation
 * 3. Compare results and identify discrepancies
 * 4. Generate detailed consistency reports
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { analyzeCodebase } from '../core/engine/analyzer';
import { setOptions, getOptions } from '../core/options';
import type { 
  ResultMetadata, 
  RuleFailure, 
  IssueDetail, 
  ErrorLevel,
  ILogger,
  LogLevel
} from '@x-fidelity/types';

// ================================
// TEST REPOSITORY DEFINITIONS
// ================================

export interface TestRepository {
  name: string;
  archetype: string;
  files: TestFile[];
  expectedIssues: ExpectedIssue[];
  description: string;
}

export interface TestFile {
  path: string;
  content: string;
}

export interface ExpectedIssue {
  filePath: string;
  ruleFailure: string;
  level: ErrorLevel;
  description: string;
}

// ================================
// ANALYSIS RESULTS COMPARISON
// ================================

export interface ConsistencyTestResult {
  testName: string;
  archetype: string;
  cliResult: ResultMetadata;
  vscodeResult: ResultMetadata;
  comparison: ResultComparison;
  isConsistent: boolean;
  report: string;
  timestamp: number;
  duration: number;
}

export interface ResultComparison {
  totalIssuesDiff: number;
  missingInCLI: IssueDetail[];
  missingInVSCode: IssueDetail[];
  configurationDifferences: ConfigDifference[];
  levelMismatches: LevelMismatch[];
  summary: ComparisonSummary;
}

export interface ConfigDifference {
  key: string;
  cliValue: any;
  vscodeValue: any;
  impact: 'high' | 'medium' | 'low';
}

export interface LevelMismatch {
  filePath: string;
  ruleFailure: string;
  cliLevel: ErrorLevel;
  vscodeLevel: ErrorLevel;
}

export interface ComparisonSummary {
  totalDiscrepancies: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  affectedFiles: string[];
  affectedRules: string[];
}

// ================================
// MOCK LOGGER IMPLEMENTATIONS
// ================================

class MockPinoLogger implements ILogger {
  private logFile?: string;
  private currentLevel: LogLevel = 'info';

  constructor(config: { filePath?: string; enableConsole?: boolean } = {}) {
    this.logFile = config.filePath;
  }

  debug(message: string, ...args: any[]): void {
    this.writeLog('DEBUG', message, args);
  }

  info(message: string, ...args: any[]): void {
    this.writeLog('INFO', message, args);
  }

  warn(message: string, ...args: any[]): void {
    this.writeLog('WARN', message, args);
  }

  error(message: string, ...args: any[]): void {
    this.writeLog('ERROR', message, args);
  }

  trace(message: string, ...args: any[]): void {
    this.writeLog('TRACE', message, args);
  }

  fatal(message: string, ...args: any[]): void {
    this.writeLog('FATAL', message, args);
  }

  child(bindings: any): ILogger {
    // Return a new instance with the same configuration
    return new MockPinoLogger({ filePath: this.logFile });
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }

  isLevelEnabled(level: LogLevel): boolean {
    const levelValues = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };
    return levelValues[level] >= levelValues[this.currentLevel];
  }

  private writeLog(level: string, message: string, args: any[]): void {
    const logLine = `[${new Date().toISOString()}] ${level}: ${message} ${args.length > 0 ? JSON.stringify(args) : ''}`;
    if (this.logFile) {
      // In a real implementation, this would write to file
      // For testing, we'll just store in memory or skip
    }
  }
}

class MockVSCodeLogger implements ILogger {
  private logFile?: string;
  private currentLevel: LogLevel = 'info';
  private name: string;

  constructor(name: string, logFile?: string) {
    this.name = name;
    this.logFile = logFile;
  }

  debug(message: string, ...args: any[]): void {
    this.writeLog('DEBUG', message, args);
  }

  info(message: string, ...args: any[]): void {
    this.writeLog('INFO', message, args);
  }

  warn(message: string, ...args: any[]): void {
    this.writeLog('WARN', message, args);
  }

  error(message: string, ...args: any[]): void {
    this.writeLog('ERROR', message, args);
  }

  trace(message: string, ...args: any[]): void {
    this.writeLog('TRACE', message, args);
  }

  fatal(message: string, ...args: any[]): void {
    this.writeLog('FATAL', message, args);
  }

  child(bindings: any): ILogger {
    return new MockVSCodeLogger(this.name, this.logFile);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  getLevel(): LogLevel {
    return this.currentLevel;
  }

  isLevelEnabled(level: LogLevel): boolean {
    return true;
  }

  private writeLog(level: string, message: string, args: any[]): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: [${this.name}] ${message}`;
    
    // Write to console for debugging
    console.log(`VSCODE_LOG: ${logMessage}`, ...args);
    
    // Also write to file if specified
    if (this.logFile) {
      try {
        const fs = require('fs');
        fs.appendFileSync(this.logFile, logMessage + '\n');
      } catch (error) {
        // Ignore file write errors
      }
    }
  }
}

// ================================
// TEST REPOSITORY TEMPLATES
// ================================

export const TEST_REPOSITORIES: TestRepository[] = [
  {
    name: 'node-fullstack-basic',
    archetype: 'node-fullstack',
    description: 'Basic Node.js fullstack project with common issues',
    files: [
      {
        path: 'package.json',
        content: `{
  "name": "test-fullstack-app",
  "version": "1.0.0",
  "description": "Test fullstack application",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "jest": "^28.0.0"
  }
}`
      },
      {
        path: 'index.js',
        content: `const express = require('express');
const app = express();
const port = 3000;

// Missing error handling
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(\`Server running at http://localhost:\${port}\`);
});
`
      },
      {
        path: 'src/components/App.jsx',
        content: `import React from 'react';

// Class component that should be migrated to hooks
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0
    };
  }

  componentDidMount() {
    console.log('Component mounted');
  }

  render() {
    return (
      <div>
        <h1>Count: {this.state.count}</h1>
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          Increment
        </button>
      </div>
    );
  }
}

export default App;
`
      },
      {
        path: 'src/utils/helper.js',
        content: `// Missing processUserData function that should be using new SDK
export function processOldData(data) {
  return data.map(item => item.value);
}

// Legacy component library usage
import { Button } from 'antd';

export function OldButton(props) {
  return <Button {...props} />;
}
`
      }
    ],
    expectedIssues: [
      {
        filePath: 'index.js',
        ruleFailure: 'missing-error-handling',
        level: 'warning',
        description: 'Express route missing error handling'
      },
      {
        filePath: 'src/components/App.jsx',
        ruleFailure: 'reactHooksMigration-global',
        level: 'warning',
        description: 'Class component should be migrated to hooks'
      },
      {
        filePath: 'src/utils/helper.js',
        ruleFailure: 'newSdkFeatureNotAdoped-global',
        level: 'warning',
        description: 'Should use processUserData from new SDK'
      },
      {
        filePath: 'src/utils/helper.js',
        ruleFailure: 'lowMigrationToNewComponentLib-global',
        level: 'warning',
        description: 'Should migrate from antd to @mui/material'
      }
    ]
  },
  {
    name: 'java-microservice-basic',
    archetype: 'java-microservice',
    description: 'Basic Java microservice project with common issues',
    files: [
      {
        path: 'pom.xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>test-service</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>2.7.0</version>
        </dependency>
    </dependencies>
</project>`
      },
      {
        path: 'src/main/java/com/example/Application.java',
        content: `package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
`
      },
      {
        path: 'src/main/java/com/example/controller/TestController.java',
        content: `package com.example.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {
    
    @GetMapping("/test")
    public String test() {
        // Missing error handling
        return "Hello World";
    }
}
`
      }
    ],
    expectedIssues: [
      {
        filePath: 'src/main/java/com/example/controller/TestController.java',
        ruleFailure: 'missing-error-handling',
        level: 'warning',
        description: 'Controller method missing error handling'
      }
    ]
  },
  {
    name: 'java-microservice-complex',
    archetype: 'java-microservice',
    description: 'Java microservice with more complex structure',
    files: [
      {
        path: 'pom.xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>complex-service</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>2.7.0</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
            <version>2.7.0</version>
        </dependency>
    </dependencies>
</project>`
      },
      {
        path: 'src/main/java/com/example/Application.java',
        content: `package com.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
`
      },
      {
        path: 'src/main/java/com/example/service/DataService.java',
        content: `package com.example.service;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.ArrayList;

@Service
public class DataService {
    
    // Complex method with high cyclomatic complexity
    public String processData(String input, int type, boolean validate) {
        if (input == null) {
            if (type == 1) {
                if (validate) {
                    return "null_validated_type1";
                } else {
                    return "null_unvalidated_type1";
                }
            } else if (type == 2) {
                if (validate) {
                    return "null_validated_type2";
                } else {
                    return "null_unvalidated_type2";
                }
            } else {
                return "null_unknown_type";
            }
        } else {
            if (type == 1) {
                if (validate) {
                    if (input.length() > 10) {
                        return "long_validated_type1";
                    } else {
                        return "short_validated_type1";
                    }
                } else {
                    return "unvalidated_type1";
                }
            } else if (type == 2) {
                if (validate) {
                    return "validated_type2";
                } else {
                    return "unvalidated_type2";
                }
            } else {
                return "unknown_type";
            }
        }
    }
}
`
      }
    ],
    expectedIssues: [
      {
        filePath: 'src/main/java/com/example/service/DataService.java',
        ruleFailure: 'high-complexity',
        level: 'warning',
        description: 'Method exceeds complexity threshold'
      }
    ]
  }
];

// ================================
// CONSISTENCY TESTER CLASS
// ================================

export class ConsistencyTester {
  private tempDir: string | null = null;
  private readonly CLI_TIMEOUT = 300000; // 300 seconds (5 minutes)
  private readonly VSCODE_TIMEOUT = 60000; // 60 seconds

  constructor() {
    // Empty constructor - initialization happens in individual methods
  }

  /**
   * Find the workspace root directory
   * @private
   */
  private findWorkspaceRoot(): string {
    let currentDir = __dirname;
    
    // Navigate up until we find the workspace root (contains packages/ and package.json)
    while (currentDir !== path.dirname(currentDir)) {
      try {
        const packageJsonPath = path.join(currentDir, 'package.json');
        const packagesPath = path.join(currentDir, 'packages');
        
        if (require('fs').existsSync(packageJsonPath) && require('fs').existsSync(packagesPath)) {
          const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8'));
          // Check if this looks like the monorepo root
          if (packageJson.workspaces && packageJson.name === 'x-fidelity-monorepo') {
            return currentDir;
          }
        }
      } catch {
        // Continue searching up
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Fallback to current working directory if workspace root not found
    console.warn('Could not find workspace root, using current directory');
    return process.cwd();
  }

  /**
   * IMPORTANT: Consistency Testing Philosophy
   * 
   * This tester compares the RAW analysis results from CLI vs VSCode core engine,
   * NOT the UI-filtered diagnostics that VSCode shows to users.
   * 
   * Why? Because:
   * 1. VSCode intentionally filters out REPO_GLOBAL_CHECK issues from diagnostics
   *    (since they don't belong to specific files)
   * 2. But these global issues ARE still found by the analysis engine
   * 3. Consistency means both CLI and VSCode find the same issues
   * 4. UI filtering is a separate concern from analysis accuracy
   * 
   * This ensures we test the core analysis consistency, not UI presentation differences.
   */

  /**
   * Run a comprehensive consistency test
   */
  async runConsistencyTest(options: {
    testRepository?: TestRepository;
    archetype?: string;
    testName?: string;
    customRepoPath?: string;
  }): Promise<ConsistencyTestResult> {
    const startTime = Date.now();
    
    try {
      // Setup test repository
      const repo = options.testRepository || 
                   TEST_REPOSITORIES.find(r => r.archetype === options.archetype) ||
                   TEST_REPOSITORIES[0];
      
      const testPath = options.customRepoPath || await this.createTestRepository(repo);
      
      console.log(`🧪 Running consistency test: ${repo.name}`);
      console.log(`📁 Test path: ${testPath}`);
      
      // Run CLI analysis
      console.log('🖥️  Running CLI analysis...');
      const cliResult = await this.runCLIAnalysis(testPath, repo.archetype);
      
      // Run VSCode analysis
      console.log('🎨 Running VSCode analysis...');
      const vscodeResult = await this.runVSCodeAnalysis(testPath, repo.archetype);
      
      // Compare results
      console.log('🔍 Comparing results...');
      const comparison = this.compareResults(cliResult, vscodeResult);
      
      // Generate report
      const report = this.generateReport(repo, cliResult, vscodeResult, comparison);
      
      const result: ConsistencyTestResult = {
        testName: options.testName || repo.name,
        archetype: repo.archetype,
        cliResult,
        vscodeResult,
        comparison,
        isConsistent: comparison.summary.totalDiscrepancies === 0,
        report,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
      
      // Clean up unless using custom repo path
      if (!options.customRepoPath && this.tempDir) {
        await this.cleanup();
      }
      
      return result;
      
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Run multiple consistency tests
   */
  async runConsistencyTestSuite(options?: {
    archetypes?: string[];
    includeCustomTests?: boolean;
  }): Promise<ConsistencyTestResult[]> {
    const archetypes = options?.archetypes || ['node-fullstack', 'java-microservice'];
    const results: ConsistencyTestResult[] = [];
    
    console.log(`🧪 Running consistency test suite for ${archetypes.length} archetypes`);
    
    for (const archetype of archetypes) {
      const testRepos = TEST_REPOSITORIES.filter(r => r.archetype === archetype);
      
      for (const repo of testRepos) {
        try {
          const result = await this.runConsistencyTest({ testRepository: repo });
          results.push(result);
          
          // Log immediate results
          const status = result.isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT';
          console.log(`${status} - ${repo.name}: ${result.comparison.summary.totalDiscrepancies} discrepancies`);
          
        } catch (error) {
          console.error(`❌ Failed to test ${repo.name}:`, error);
        }
      }
    }
    
    // Generate summary report
    this.printSuiteReport(results);
    
    return results;
  }

  /**
   * Create a test repository on disk
   */
  private async createTestRepository(repo: TestRepository): Promise<string> {
    // Use workspace-relative temp directory instead of system /tmp
    const workspaceRoot = this.findWorkspaceRoot();
    const tempDirBase = path.join(workspaceRoot, '.temp', 'consistency-tests');
    await fs.mkdir(tempDirBase, { recursive: true });
    this.tempDir = await fs.mkdtemp(path.join(tempDirBase, 'xfi-consistency-test-'));
    
    // Create directory structure and files
    for (const file of repo.files) {
      const filePath = path.join(this.tempDir, file.path);
      const dirPath = path.dirname(filePath);
      
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, file.content);
    }
    
    // Initialize git repository to avoid CLI errors
    try {
      const { spawn } = await import('child_process');
      
      if (!this.tempDir) {
        throw new Error('Temp directory not initialized');
      }
      
      // Initialize git repo
      await new Promise<void>((resolve, reject) => {
        const gitInit = spawn('git', ['init'], { cwd: this.tempDir! });
        gitInit.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`git init failed with code ${code}`));
        });
      });
      
      // Add a remote origin to satisfy CLI repo detection
      await new Promise<void>((resolve, reject) => {
        const gitRemote = spawn('git', ['remote', 'add', 'origin', 'https://github.com/test/test-repo.git'], { cwd: this.tempDir! });
        gitRemote.on('close', (code: number) => {
          if (code === 0) resolve();
          else reject(new Error(`git remote add failed with code ${code}`));
        });
      });
      
    } catch (error) {
      console.warn('Failed to initialize git repository, CLI may have issues:', error);
    }
    
    return this.tempDir;
  }

  /**
   * Run actual CLI analysis using structured output mode (super reliable)
   */
  private async runCLIAnalysis(repoPath: string, archetype: string): Promise<ResultMetadata> {
    // Get the CLI package path
    const cliPath = path.join(__dirname, '..', '..', '..', 'x-fidelity-cli');
    
    // Define structured output file path
    const structuredOutputFile = path.join(repoPath, '.xfiResults', 'structured-output.json');
    
    try {
      // Clean up any existing structured output file
      try {
        await fs.unlink(structuredOutputFile);
      } catch {
        // File doesn't exist, that's fine
      }
      
      // Run CLI with structured output mode - this is the new reliable approach
      const cliProcess = spawn('node', [
        '.', 
        '--dir', repoPath, 
        '--archetype', archetype,
        '--output-format', 'json',
        '--output-file', structuredOutputFile
      ], {
        cwd: cliPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Capture stdout and stderr for debugging
      let stdout = '';
      let stderr = '';
      
      cliProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      cliProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Wait for CLI to complete
      await new Promise<void>((resolve, reject) => {
        let isResolved = false;
        
        cliProcess.on('close', (code: number) => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(timeout);
          
          // CLI should work normally, structured output is just a bonus
          if (code === 0 || code === 1) {
            // Code 0 = no issues, Code 1 = issues found (both are success for our purposes)
            resolve();
          } else {
            // Include stdout/stderr in error for debugging
            const errorMessage = [
              `CLI failed with exit code ${code}`,
              stdout ? `STDOUT: ${stdout.trim()}` : '',
              stderr ? `STDERR: ${stderr.trim()}` : ''
            ].filter(Boolean).join('\n');
            reject(new Error(errorMessage));
          }
        });
        
        cliProcess.on('error', (error: Error) => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(timeout);
          reject(new Error(`Failed to start CLI process: ${error.message}`));
        });
        
        // Set timeout with better error handling
        const timeout = setTimeout(() => {
          if (isResolved) return;
          isResolved = true;
          cliProcess.kill('SIGTERM');
          
          // Give a moment for graceful shutdown
          setTimeout(() => {
            if (cliProcess.pid && !cliProcess.killed) {
              cliProcess.kill('SIGKILL');
            }
          }, 5000);
          
          const timeoutMessage = [
            `CLI analysis timeout after ${this.CLI_TIMEOUT}ms`,
            stdout ? `STDOUT: ${stdout.trim()}` : '',
            stderr ? `STDERR: ${stderr.trim()}` : ''
          ].filter(Boolean).join('\n');
          reject(new Error(timeoutMessage));
        }, this.CLI_TIMEOUT);
      });
      
      // Read the structured output file - this is super reliable!
      try {
        // First check if the file exists
        try {
          await fs.access(structuredOutputFile);
        } catch (accessError) {
          // File doesn't exist, let's debug what was created
          const xfiResultsDir = path.join(repoPath, '.xfiResults');
          let dirContents = '';
          try {
            const files = await fs.readdir(xfiResultsDir);
            dirContents = `Contents of ${xfiResultsDir}: ${files.join(', ')}`;
          } catch {
            dirContents = `Directory ${xfiResultsDir} does not exist`;
          }
          
          throw new Error(`Structured output file ${structuredOutputFile} does not exist. ${dirContents}. CLI stdout: ${stdout.trim()}. CLI stderr: ${stderr.trim()}`);
        }
        
        const outputContent = await fs.readFile(structuredOutputFile, 'utf8');
        const result = JSON.parse(outputContent);
        
        // Clean up the structured output file
        try {
          await fs.unlink(structuredOutputFile);
        } catch {
          // Ignore cleanup errors
        }
        
        return result;
      } catch (error) {
        throw new Error(`Failed to read structured output from ${structuredOutputFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
    } catch (error) {
      throw new Error(`CLI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Simulate VSCode analysis
   */
  private async runVSCodeAnalysis(repoPath: string, archetype: string): Promise<ResultMetadata> {
    // Save current options
    const originalOptions = getOptions();
    
    try {
      // Simulate VSCode's config resolution behavior  
      const resolvedLocalConfigPath = this.simulateVSCodeConfigResolution(repoPath);
      
      // Set VSCode-specific options
      setOptions({
        dir: repoPath,
        archetype,
        localConfigPath: resolvedLocalConfigPath, // Use resolved path, not undefined!
        configServer: undefined,
        mode: 'client',
        extraPlugins: [],
        openaiEnabled: false,
        telemetryEnabled: false
      });
      
      // Create VSCode-style logger
      const logFilePath = path.join(repoPath, '.xfiResults', 'x-fidelity-vscode-test.log');
      await fs.mkdir(path.dirname(logFilePath), { recursive: true });
      
      const vscodeLogger = new MockVSCodeLogger('X-Fidelity Consistency Test', logFilePath);
      
      // Run analysis as VSCode would - get RAW results before diagnostic filtering
      const result = await Promise.race([
        analyzeCodebase({
          repoPath,
          archetype,
          configServer: undefined,
          localConfigPath: resolvedLocalConfigPath,
          executionLogPrefix: 'vscode-consistency-test',
          logger: vscodeLogger
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('VSCode analysis timeout')), this.VSCODE_TIMEOUT)
        )
      ]);
      
      // NOTE: We return the RAW result here, not the filtered diagnostics
      // This ensures consistency testing compares the actual analysis results,
      // not the UI filtering that VSCode applies (which skips REPO_GLOBAL_CHECK)
      return result;
      
    } finally {
      // Restore original options
      setOptions(originalOptions);
    }
  }

  /**
   * Get CLI config path (simulates CLI behavior)
   */
  private getCLIConfigPath(): string {
    // This simulates the CLI's DEMO_CONFIG_PATH fallback
    return path.join(__dirname, '..', '..', 'packages', 'x-fidelity-democonfig', 'src');
  }

  /**
   * Simulate VSCode's configuration resolution logic
   */
  private simulateVSCodeConfigResolution(repoPath: string): string {
    // Simulate the VSCode extension's config resolution order
    
    // 1. Check for XDG_CONFIG_HOME/x-fidelity
    const xdgConfigHome = process.env.XDG_CONFIG_HOME;
    if (xdgConfigHome) {
      const xdgPath = path.join(xdgConfigHome, 'x-fidelity');
      try {
        if (require('fs').statSync(xdgPath).isDirectory()) {
          return xdgPath;
        }
      } catch {
        // Directory doesn't exist, continue
      }
    }
    
    // 2. Check for ~/.config/x-fidelity
    const homeConfigPath = path.join(require('os').homedir(), '.config', 'x-fidelity');
    try {
      if (require('fs').statSync(homeConfigPath).isDirectory()) {
        return homeConfigPath;
      }
    } catch {
      // Directory doesn't exist, continue
    }
    
    // 3. Check for XFI_CONFIG_PATH environment variable
    const envConfigPath = process.env.XFI_CONFIG_PATH;
    if (envConfigPath) {
      try {
        if (require('fs').statSync(envConfigPath).isDirectory()) {
          return envConfigPath;
        }
      } catch {
        // Path doesn't exist, continue
      }
    }
    
    // 4. Fallback to x-fidelity-democonfig package (same as CLI)
    // This simulates how VSCode extension resolves its configuration
    // Find the workspace root by looking for package.json
    let workspaceRoot = process.cwd();
    let currentDir = __dirname;
    
    // Navigate up until we find the workspace root (contains packages/x-fidelity-democonfig)
    while (currentDir !== path.dirname(currentDir)) {
      const demoConfigPackagePath = path.join(currentDir, 'packages', 'x-fidelity-democonfig');
      try {
        if (require('fs').statSync(demoConfigPackagePath).isDirectory()) {
          workspaceRoot = currentDir;
          break;
        }
      } catch {
        // Continue searching up
      }
      currentDir = path.dirname(currentDir);
    }
    
    return path.join(workspaceRoot, 'packages', 'x-fidelity-democonfig', 'src');
  }

  /**
   * Compare CLI and VSCode results
   */
  private compareResults(cliResult: ResultMetadata, vscodeResult: ResultMetadata): ResultComparison {
    const cliIssues = cliResult.XFI_RESULT.issueDetails;
    const vscodeIssues = vscodeResult.XFI_RESULT.issueDetails;
    
    // Find issues missing in CLI
    const missingInCLI = this.findMissingIssues(vscodeIssues, cliIssues);
    
    // Find issues missing in VSCode
    const missingInVSCode = this.findMissingIssues(cliIssues, vscodeIssues);
    
    // Find level mismatches
    const levelMismatches = this.findLevelMismatches(cliIssues, vscodeIssues);
    
    // Compare configurations
    const configDifferences = this.compareConfigurations(cliResult, vscodeResult);
    
    // Calculate summary
    const summary = this.calculateSummary(missingInCLI, missingInVSCode, levelMismatches, configDifferences);
    
    return {
      totalIssuesDiff: vscodeResult.XFI_RESULT.totalIssues - cliResult.XFI_RESULT.totalIssues,
      missingInCLI,
      missingInVSCode,
      configurationDifferences: configDifferences,
      levelMismatches,
      summary
    };
  }

  /**
   * Find issues that exist in one result but not the other
   */
  private findMissingIssues(sourceIssues: IssueDetail[], targetIssues: IssueDetail[]): IssueDetail[] {
    const missing: IssueDetail[] = [];
    
    for (const sourceIssue of sourceIssues) {
      const found = targetIssues.some(targetIssue => 
        targetIssue.filePath === sourceIssue.filePath &&
        this.issuesMatch(sourceIssue.errors, targetIssue.errors)
      );
      
      if (!found) {
        missing.push(sourceIssue);
      }
    }
    
    return missing;
  }

  /**
   * Check if two error arrays represent the same issues
   */
  private issuesMatch(errors1: RuleFailure[], errors2: RuleFailure[]): boolean {
    if (errors1.length !== errors2.length) return false;
    
    return errors1.every(error1 => 
      errors2.some(error2 => 
        error1.ruleFailure === error2.ruleFailure &&
        error1.level === error2.level
      )
    );
  }

  /**
   * Find issues where the same rule has different severity levels
   */
  private findLevelMismatches(cliIssues: IssueDetail[], vscodeIssues: IssueDetail[]): LevelMismatch[] {
    const mismatches: LevelMismatch[] = [];
    
    for (const cliIssue of cliIssues) {
      const correspondingVSCodeIssue = vscodeIssues.find(v => v.filePath === cliIssue.filePath);
      
      if (correspondingVSCodeIssue) {
        for (const cliError of cliIssue.errors) {
          const correspondingVSCodeError = correspondingVSCodeIssue.errors.find(
            e => e.ruleFailure === cliError.ruleFailure
          );
          
          if (correspondingVSCodeError && 
              cliError.level && 
              correspondingVSCodeError.level && 
              cliError.level !== correspondingVSCodeError.level) {
            mismatches.push({
              filePath: cliIssue.filePath,
              ruleFailure: cliError.ruleFailure,
              cliLevel: cliError.level,
              vscodeLevel: correspondingVSCodeError.level
            });
          }
        }
      }
    }
    
    return mismatches;
  }

  /**
   * Compare configuration differences that might affect results
   */
  private compareConfigurations(cliResult: ResultMetadata, vscodeResult: ResultMetadata): ConfigDifference[] {
    const differences: ConfigDifference[] = [];
    
    // Compare basic metadata
    if (cliResult.XFI_RESULT.archetype !== vscodeResult.XFI_RESULT.archetype) {
      differences.push({
        key: 'archetype',
        cliValue: cliResult.XFI_RESULT.archetype,
        vscodeValue: vscodeResult.XFI_RESULT.archetype,
        impact: 'high'
      });
    }
    
    if (cliResult.XFI_RESULT.repoPath !== vscodeResult.XFI_RESULT.repoPath) {
      differences.push({
        key: 'repoPath',
        cliValue: cliResult.XFI_RESULT.repoPath,
        vscodeValue: vscodeResult.XFI_RESULT.repoPath,
        impact: 'medium'
      });
    }
    
    // Compare file counts (indicates different file discovery)
    if (cliResult.XFI_RESULT.fileCount !== vscodeResult.XFI_RESULT.fileCount) {
      differences.push({
        key: 'fileCount',
        cliValue: cliResult.XFI_RESULT.fileCount,
        vscodeValue: vscodeResult.XFI_RESULT.fileCount,
        impact: 'high'
      });
    }
    
    return differences;
  }

  /**
   * Calculate comparison summary statistics
   */
  private calculateSummary(
    missingInCLI: IssueDetail[], 
    missingInVSCode: IssueDetail[], 
    levelMismatches: LevelMismatch[],
    configDifferences: ConfigDifference[]
  ): ComparisonSummary {
    const totalDiscrepancies = missingInCLI.length + missingInVSCode.length + levelMismatches.length;
    
    // Calculate severity breakdown
    const severityBreakdown = {
      critical: configDifferences.filter(d => d.impact === 'high').length,
      high: missingInCLI.length + missingInVSCode.length,
      medium: levelMismatches.length,
      low: configDifferences.filter(d => d.impact === 'low').length
    };
    
    // Get affected files
    const affectedFiles = new Set<string>();
    missingInCLI.forEach(issue => affectedFiles.add(issue.filePath));
    missingInVSCode.forEach(issue => affectedFiles.add(issue.filePath));
    levelMismatches.forEach(mismatch => affectedFiles.add(mismatch.filePath));
    
    // Get affected rules
    const affectedRules = new Set<string>();
    missingInCLI.forEach(issue => issue.errors.forEach(e => affectedRules.add(e.ruleFailure)));
    missingInVSCode.forEach(issue => issue.errors.forEach(e => affectedRules.add(e.ruleFailure)));
    levelMismatches.forEach(mismatch => affectedRules.add(mismatch.ruleFailure));
    
    return {
      totalDiscrepancies,
      severityBreakdown,
      affectedFiles: Array.from(affectedFiles),
      affectedRules: Array.from(affectedRules)
    };
  }

  /**
   * Generate a detailed consistency report
   */
  private generateReport(
    repo: TestRepository, 
    cliResult: ResultMetadata, 
    vscodeResult: ResultMetadata, 
    comparison: ResultComparison
  ): string {
    const lines: string[] = [];
    
    lines.push('========================================');
    lines.push('  X-FIDELITY CONSISTENCY TEST REPORT');
    lines.push('========================================');
    lines.push('');
    lines.push(`Test: ${repo.name}`);
    lines.push(`Archetype: ${repo.archetype}`);
    lines.push(`Description: ${repo.description}`);
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push('');
    
    // Overall Status
    const status = comparison.summary.totalDiscrepancies === 0 ? '✅ CONSISTENT' : '❌ INCONSISTENT';
    lines.push(`Status: ${status}`);
    lines.push(`Total Discrepancies: ${comparison.summary.totalDiscrepancies}`);
    lines.push('');
    
    // Results Summary
    lines.push('RESULTS SUMMARY:');
    lines.push(`CLI Total Issues: ${cliResult.XFI_RESULT.totalIssues}`);
    lines.push(`VSCode Total Issues: ${vscodeResult.XFI_RESULT.totalIssues}`);
    lines.push(`Difference: ${comparison.totalIssuesDiff}`);
    lines.push('');
    
    // Issue Breakdown
    if (comparison.summary.totalDiscrepancies > 0) {
      lines.push('DISCREPANCY BREAKDOWN:');
      lines.push(`Critical: ${comparison.summary.severityBreakdown.critical}`);
      lines.push(`High: ${comparison.summary.severityBreakdown.high}`);
      lines.push(`Medium: ${comparison.summary.severityBreakdown.medium}`);
      lines.push(`Low: ${comparison.summary.severityBreakdown.low}`);
      lines.push('');
      
      // Missing in CLI
      if (comparison.missingInCLI.length > 0) {
        lines.push('ISSUES MISSING IN CLI:');
        comparison.missingInCLI.forEach(issue => {
          lines.push(`  📄 ${issue.filePath}:`);
          issue.errors.forEach(error => {
            lines.push(`    ❌ ${error.ruleFailure} [${error.level}]`);
          });
        });
        lines.push('');
      }
      
      // Missing in VSCode
      if (comparison.missingInVSCode.length > 0) {
        lines.push('ISSUES MISSING IN VSCODE:');
        comparison.missingInVSCode.forEach(issue => {
          lines.push(`  📄 ${issue.filePath}:`);
          issue.errors.forEach(error => {
            lines.push(`    ❌ ${error.ruleFailure} [${error.level}]`);
          });
        });
        lines.push('');
      }
      
      // Level Mismatches
      if (comparison.levelMismatches.length > 0) {
        lines.push('SEVERITY LEVEL MISMATCHES:');
        comparison.levelMismatches.forEach(mismatch => {
          lines.push(`  📄 ${mismatch.filePath}:`);
          lines.push(`    ⚠️  ${mismatch.ruleFailure}: CLI[${mismatch.cliLevel}] vs VSCode[${mismatch.vscodeLevel}]`);
        });
        lines.push('');
      }
      
      // Configuration Differences
      if (comparison.configurationDifferences.length > 0) {
        lines.push('CONFIGURATION DIFFERENCES:');
        comparison.configurationDifferences.forEach(diff => {
          lines.push(`  🔧 ${diff.key} [${diff.impact} impact]:`);
          lines.push(`    CLI: ${JSON.stringify(diff.cliValue)}`);
          lines.push(`    VSCode: ${JSON.stringify(diff.vscodeValue)}`);
        });
        lines.push('');
      }
    }
    
    // Performance Comparison
    lines.push('PERFORMANCE COMPARISON:');
    lines.push(`CLI Duration: ${cliResult.XFI_RESULT.durationSeconds}s`);
    lines.push(`VSCode Duration: ${vscodeResult.XFI_RESULT.durationSeconds}s`);
    lines.push(`CLI Files Analyzed: ${cliResult.XFI_RESULT.fileCount}`);
    lines.push(`VSCode Files Analyzed: ${vscodeResult.XFI_RESULT.fileCount}`);
    lines.push('');
    
    // Recommendations
    if (comparison.summary.totalDiscrepancies > 0) {
      lines.push('RECOMMENDATIONS:');
      
      if (comparison.configurationDifferences.some(d => d.key === 'fileCount')) {
        lines.push(`  🔍 File discovery differences detected - check exclude/include patterns`);
      }
      
      if (comparison.configurationDifferences.some(d => d.key === 'archetype')) {
        lines.push(`  ⚙️  Archetype mismatch detected - verify configuration resolution`);
      }
      
      if (comparison.missingInCLI.length > 0 || comparison.missingInVSCode.length > 0) {
        lines.push(`  🔧 Rule execution differences - check plugin loading order`);
      }
      
      if (comparison.levelMismatches.length > 0) {
        lines.push(`  ⚖️  Severity level mismatches - check rule configuration consistency`);
      }
      
      lines.push('');
    }
    
    lines.push('========================================');
    
    return lines.join('\n');
  }

  /**
   * Print a summary report for multiple tests
   */
  private printSuiteReport(results: ConsistencyTestResult[]): void {
    console.log('\n========================================');
    console.log('  CONSISTENCY TEST SUITE SUMMARY');
    console.log('========================================');
    
    const consistent = results.filter(r => r.isConsistent);
    const inconsistent = results.filter(r => !r.isConsistent);
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Consistent: ${consistent.length}`);
    console.log(`❌ Inconsistent: ${inconsistent.length}`);
    console.log(`Success Rate: ${((consistent.length / results.length) * 100).toFixed(1)}%`);
    
    if (inconsistent.length > 0) {
      console.log('\nINCONSISTENT TESTS:');
      inconsistent.forEach(result => {
        console.log(`  ❌ ${result.testName}: ${result.comparison.summary.totalDiscrepancies} discrepancies`);
      });
    }
    
    // Calculate aggregate statistics
    const totalDiscrepancies = results.reduce((sum, r) => sum + r.comparison.summary.totalDiscrepancies, 0);
    console.log(`\nTotal Discrepancies Across All Tests: ${totalDiscrepancies}`);
    
    console.log('========================================\n');
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(): Promise<void> {
    if (this.tempDir) {
      try {
        await fs.rm(this.tempDir, { recursive: true, force: true });
        this.tempDir = null;
      } catch (error) {
        console.warn('Failed to clean up temporary directory:', error);
      }
    }
  }
}

// ================================
// CONVENIENCE FUNCTIONS
// ================================

/**
 * Run a quick consistency check for a specific archetype
 */
export async function quickConsistencyCheck(archetype: string): Promise<ConsistencyTestResult> {
  const tester = new ConsistencyTester();
  return await tester.runConsistencyTest({ archetype });
}

/**
 * Run consistency tests on an existing repository
 */
export async function testExistingRepository(repoPath: string, archetype: string): Promise<ConsistencyTestResult> {
  const tester = new ConsistencyTester();
  return await tester.runConsistencyTest({ 
    customRepoPath: repoPath, 
    archetype,
    testName: `existing-repo-${path.basename(repoPath)}`
  });
}

/**
 * Run full consistency test suite
 */
export async function runFullConsistencyTestSuite(): Promise<ConsistencyTestResult[]> {
  const tester = new ConsistencyTester();
  return await tester.runConsistencyTestSuite();
}

/**
 * Manual test runner for development and debugging
 * Run this directly to get immediate feedback on consistency
 */
export async function runManualConsistencyTest() {
  console.log('🧪 Starting Manual Consistency Test...\n');
  
  try {
    // Test 1: Basic Node.js fullstack
    console.log('🔍 Testing Node.js Fullstack...');
    const nodeResult = await quickConsistencyCheck('node-fullstack');
    console.log(`Result: ${nodeResult.isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
    console.log(`CLI Issues: ${nodeResult.cliResult.XFI_RESULT.totalIssues}`);
    console.log(`VSCode Issues: ${nodeResult.vscodeResult.XFI_RESULT.totalIssues}`);
    console.log(`Discrepancies: ${nodeResult.comparison.summary.totalDiscrepancies}`);
    
    if (!nodeResult.isConsistent) {
      console.log('\n📋 Node.js Fullstack Test Report:');
      console.log(nodeResult.report);
    }
    
    // Test 2: Basic Java microservice
    console.log('\n🔍 Testing Java Microservice...');
    const javaResult = await quickConsistencyCheck('java-microservice');
    console.log(`Result: ${javaResult.isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
    console.log(`CLI Issues: ${javaResult.cliResult.XFI_RESULT.totalIssues}`);
    console.log(`VSCode Issues: ${javaResult.vscodeResult.XFI_RESULT.totalIssues}`);
    console.log(`Discrepancies: ${javaResult.comparison.summary.totalDiscrepancies}`);
    
    if (!javaResult.isConsistent) {
      console.log('\n📋 Java Microservice Test Report:');
      console.log(javaResult.report);
    }
    
    // Test 3: Full suite
    console.log('\n🔍 Running Full Test Suite...');
    const suiteResults = await runFullConsistencyTestSuite();
    
    // Summary
    console.log('\n📊 FINAL SUMMARY:');
    console.log(`Total Individual Tests: 2`);
    console.log(`Total Suite Tests: ${suiteResults.length}`);
    console.log(`Node.js Test: ${nodeResult.isConsistent ? '✅' : '❌'}`);
    console.log(`Java Test: ${javaResult.isConsistent ? '✅' : '❌'}`);
    console.log(`Suite Success Rate: ${((suiteResults.filter(r => r.isConsistent).length / suiteResults.length) * 100).toFixed(1)}%`);
    
    // Generate baseline report
    const totalDiscrepancies = suiteResults.reduce((sum, r) => sum + r.comparison.summary.totalDiscrepancies, 0);
    console.log(`\n🎯 BASELINE METRICS:`);
    console.log(`Total Discrepancies: ${totalDiscrepancies}`);
    console.log(`Average per Test: ${(totalDiscrepancies / suiteResults.length).toFixed(1)}`);
    console.log(`Tests with Issues: ${suiteResults.filter(r => !r.isConsistent).length}`);
    
    return {
      nodeResult,
      javaResult,
      suiteResults,
      totalDiscrepancies,
      consistentTests: suiteResults.filter(r => r.isConsistent).length,
      inconsistentTests: suiteResults.filter(r => !r.isConsistent).length
    };
    
  } catch (error) {
    console.error('❌ Manual test failed:', error);
    throw error;
  }
}

/**
 * Generate a baseline report for current consistency state
 */
export async function generateBaselineReport(): Promise<string> {
  console.log('📊 Generating baseline consistency report...');
  
  try {
    const results = await runFullConsistencyTestSuite();
    const timestamp = new Date().toISOString();
    
    const lines: string[] = [];
    lines.push('==========================================');
    lines.push('  X-FIDELITY CONSISTENCY BASELINE');
    lines.push('==========================================');
    lines.push('');
    lines.push('This report documents the current state of');
    lines.push('consistency between CLI and VSCode extension.');
    lines.push('Use this as a baseline to measure improvements.');
    lines.push('');
    lines.push(`Generated: ${timestamp}`);
    lines.push('');
    
    // Summary statistics
    const consistent = results.filter(r => r.isConsistent);
    const inconsistent = results.filter(r => !r.isConsistent);
    const totalDiscrepancies = results.reduce((sum, r) => sum + r.comparison.summary.totalDiscrepancies, 0);
    
    lines.push('BASELINE METRICS:');
    lines.push(`Total Tests: ${results.length}`);
    lines.push(`✅ Consistent: ${consistent.length}`);
    lines.push(`❌ Inconsistent: ${inconsistent.length}`);
    lines.push(`Success Rate: ${((consistent.length / results.length) * 100).toFixed(1)}%`);
    lines.push(`Total Discrepancies: ${totalDiscrepancies}`);
    lines.push(`Average per Test: ${(totalDiscrepancies / results.length).toFixed(1)}`);
    lines.push('');
    
    // Detailed breakdown
    if (inconsistent.length > 0) {
      lines.push('INCONSISTENT TESTS:');
      inconsistent.forEach(result => {
        lines.push(`❌ ${result.testName} (${result.archetype}):`);
        lines.push(`   Discrepancies: ${result.comparison.summary.totalDiscrepancies}`);
        lines.push(`   Missing in CLI: ${result.comparison.missingInCLI.length}`);
        lines.push(`   Missing in VSCode: ${result.comparison.missingInVSCode.length}`);
        lines.push(`   Level Mismatches: ${result.comparison.levelMismatches.length}`);
        lines.push(`   Config Differences: ${result.comparison.configurationDifferences.length}`);
      });
      lines.push('');
    }
    
    // Archetype breakdown
    const archetypes = Array.from(new Set(results.map(r => r.archetype)));
    lines.push('ARCHETYPE BREAKDOWN:');
    archetypes.forEach(archetype => {
      const archetypeResults = results.filter(r => r.archetype === archetype);
      const archetypeConsistent = archetypeResults.filter(r => r.isConsistent);
      const archetypeDiscrepancies = archetypeResults.reduce((sum, r) => sum + r.comparison.summary.totalDiscrepancies, 0);
      
      lines.push(`${archetype}:`);
      lines.push(`   Tests: ${archetypeResults.length}`);
      lines.push(`   Consistent: ${archetypeConsistent.length}/${archetypeResults.length}`);
      lines.push(`   Discrepancies: ${archetypeDiscrepancies}`);
    });
    lines.push('');
    
    lines.push('==========================================');
    lines.push('');
    
    // Append individual test reports
    results.forEach(result => {
      if (!result.isConsistent) {
        lines.push(result.report);
        lines.push('');
      }
    });
    
    return lines.join('\n');
    
  } catch (error) {
    console.error('❌ Baseline report generation failed:', error);
    throw error;
  }
} 