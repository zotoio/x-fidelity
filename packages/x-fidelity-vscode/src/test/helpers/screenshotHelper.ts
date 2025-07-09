import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ScreenshotOptions {
  delay?: number;
  quality?: number;
  description?: string;
}

/**
 * Screenshot Helper for VSCode Extension Tests
 * Captures screenshots during xvfb testing to verify UI functionality
 */
export class ScreenshotHelper {
  private static screenshotDir = path.resolve(
    process.cwd(),
    'test-screenshots'
  );
  private static testStartTime = Date.now();

  /**
   * Initialize screenshot directory
   */
  static async setupScreenshotDir(): Promise<void> {
    if (!this.isScreenshotEnabled()) {
      return;
    }

    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
      if (global.isVerboseMode) {
        global.testConsole.log(
          `📸 Screenshot directory created: ${this.screenshotDir}`
        );
      }

      // Create a test session directory
      const sessionDir = path.join(
        this.screenshotDir,
        `session-${this.testStartTime}`
      );
      await fs.mkdir(sessionDir, { recursive: true });
      this.screenshotDir = sessionDir;

      // Create an index file to track screenshots
      const indexFile = path.join(this.screenshotDir, 'index.html');
      await fs.writeFile(indexFile, this.generateIndexHTML());
    } catch (error) {
      console.warn(`⚠️ Failed to setup screenshot directory: ${error}`);
    }
  }

  /**
   * Capture a screenshot with context
   */
  static async captureScreen(
    testName: string,
    options: ScreenshotOptions = {}
  ): Promise<string> {
    if (!this.isScreenshotEnabled()) {
      return '';
    }

    const { delay = 1000, description = '' } = options;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTestName = testName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${sanitizedTestName}${description ? '-' + description.replace(/[^a-zA-Z0-9-_]/g, '_') : ''}-${timestamp}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    try {
      // Wait for UI to settle
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Use scrot for screenshot capture in xvfb environment
      await execFileAsync('scrot', ['--quality', '90', '--silent', filepath]);

      if (global.isVerboseMode) {
        global.testConsole.log(`📸 Screenshot captured: ${filename}`);
      }

      // Update index file
      await this.updateScreenshotIndex(filename, testName, description);

      return filepath;
    } catch (error) {
      console.warn(`⚠️ Failed to capture screenshot: ${error}`);
      return '';
    }
  }

  /**
   * Capture screenshot of VSCode window specifically
   */
  static async captureVSCodeWindow(
    testName: string,
    options: ScreenshotOptions = {}
  ): Promise<string> {
    if (!this.isScreenshotEnabled()) {
      return '';
    }

    // Focus VSCode window first
    try {
      await vscode.commands.executeCommand(
        'workbench.action.focusActiveEditorGroup'
      );
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch {
      // Ignore focus errors
    }

    return this.captureScreen(testName, {
      ...options,
      description: 'vscode-window'
    });
  }

  /**
   * Capture screenshot after opening a specific panel/view
   */
  static async captureAfterCommand(
    command: string,
    testName: string,
    options: ScreenshotOptions = {}
  ): Promise<string> {
    if (!this.isScreenshotEnabled()) {
      return '';
    }

    try {
      await vscode.commands.executeCommand(command);
      await new Promise(resolve => setTimeout(resolve, options.delay || 2000));

      return this.captureScreen(testName, {
        ...options,
        description: `after-${command.replace('xfidelity.', '').replace('.', '-')}`
      });
    } catch (error) {
      console.warn(`⚠️ Failed to execute command ${command}: ${error}`);
      return this.captureScreen(testName, {
        ...options,
        description: 'command-failed'
      });
    }
  }

  /**
   * Capture a sequence of screenshots during a test workflow
   */
  static async captureWorkflow(
    testName: string,
    steps: Array<{ command?: string; description: string; delay?: number }>
  ): Promise<string[]> {
    if (!this.isScreenshotEnabled()) {
      return [];
    }

    const screenshots: string[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (step.command) {
        try {
          await vscode.commands.executeCommand(step.command);
        } catch (error) {
          console.warn(
            `⚠️ Command failed in workflow: ${step.command} - ${error}`
          );
        }
      }

      await new Promise(resolve => setTimeout(resolve, step.delay || 1500));

      const screenshot = await this.captureScreen(testName, {
        description: `step-${i + 1}-${step.description}`,
        delay: 0 // Already waited above
      });

      if (screenshot) {
        screenshots.push(screenshot);
      }
    }

    return screenshots;
  }

  /**
   * Check if screenshots are enabled
   */
  private static isScreenshotEnabled(): boolean {
    return (
      process.env.SCREENSHOTS === 'true' &&
      (process.env.DISPLAY !== undefined || process.env.CI === 'true')
    );
  }

  /**
   * Update the screenshot index HTML file
   */
  private static async updateScreenshotIndex(
    filename: string,
    testName: string,
    description: string
  ): Promise<void> {
    try {
      const indexFile = path.join(this.screenshotDir, 'index.html');
      const exists = await fs
        .access(indexFile)
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        await fs.writeFile(indexFile, this.generateIndexHTML());
      }

      let html = await fs.readFile(indexFile, 'utf8');

      const screenshotEntry = `
        <div class="screenshot">
          <h3>${testName}${description ? ` - ${description}` : ''}</h3>
          <img src="${filename}" alt="${testName}" onclick="showFullSize('${filename}')">
          <p class="timestamp">${new Date().toLocaleString()}</p>
        </div>
      `;

      // Insert before closing body tag
      html = html.replace('</body>', `${screenshotEntry}</body>`);

      await fs.writeFile(indexFile, html);
    } catch (error) {
      console.warn(`⚠️ Failed to update screenshot index: ${error}`);
    }
  }

  /**
   * Generate the HTML index file template
   */
  private static generateIndexHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>X-Fidelity VSCode Extension Test Screenshots</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .screenshot {
      background: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .screenshot img {
      max-width: 100%;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .screenshot img:hover {
      opacity: 0.8;
    }
    .timestamp {
      color: #666;
      font-size: 0.9em;
      margin: 10px 0 0 0;
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.9);
    }
    .modal img {
      margin: auto;
      display: block;
      max-width: 90%;
      max-height: 90%;
      margin-top: 5%;
    }
    .close {
      position: absolute;
      top: 20px;
      right: 35px;
      color: #f1f1f1;
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 X-Fidelity VSCode Extension Test Screenshots</h1>
    <p>Test session started: ${new Date().toLocaleString()}</p>
    <p>Environment: ${process.env.CI ? 'CI' : 'Local'} | Display: ${process.env.DISPLAY || 'N/A'}</p>
  </div>

  <div id="modal" class="modal">
    <span class="close" onclick="closeModal()">&times;</span>
    <img id="modalImg">
  </div>

  <script>
    function showFullSize(filename) {
      const modal = document.getElementById('modal');
      const modalImg = document.getElementById('modalImg');
      modal.style.display = 'block';
      modalImg.src = filename;
    }
    
    function closeModal() {
      document.getElementById('modal').style.display = 'none';
    }
    
    // Close modal when clicking outside the image
    window.onclick = function(event) {
      const modal = document.getElementById('modal');
      if (event.target == modal) {
        modal.style.display = 'none';
      }
    }
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Get screenshot directory path
   */
  static getScreenshotDir(): string {
    return this.screenshotDir;
  }

  /**
   * Clean up old screenshot sessions (keep last 5)
   */
  static async cleanupOldSessions(): Promise<void> {
    if (!this.isScreenshotEnabled()) {
      return;
    }

    try {
      const baseDir = path.resolve(process.cwd(), 'test-screenshots');
      const entries = await fs.readdir(baseDir, { withFileTypes: true });

      const sessionDirs = entries
        .filter(
          entry => entry.isDirectory() && entry.name.startsWith('session-')
        )
        .map(entry => ({
          name: entry.name,
          timestamp: parseInt(entry.name.replace('session-', ''))
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Keep only the 5 most recent sessions
      const toDelete = sessionDirs.slice(5);

      for (const session of toDelete) {
        const sessionPath = path.join(baseDir, session.name);
        await fs.rm(sessionPath, { recursive: true, force: true });
        if (global.isVerboseMode) {
          global.testConsole.log(
            `🗑️  Cleaned up old screenshot session: ${session.name}`
          );
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup old screenshot sessions: ${error}`);
    }
  }
}
