/**
 * Unit tests for IDE Detection utilities
 * Tests detection of Cursor, VS Code, and AI providers
 */

// Mock extension state
const mockExtensions = new Map<string, { isActive: boolean }>();

const mockVscode = {
  env: {
    appName: 'Visual Studio Code'
  },
  extensions: {
    getExtension: jest.fn((id: string) => mockExtensions.get(id))
  }
};

jest.mock('vscode', () => mockVscode);

import {
  getIDEName,
  isCursorIDE,
  isCopilotAvailable,
  isAmazonQAvailable,
  getBestAIProvider,
  getAvailableAIProviders
} from '../../utils/ideDetection';

describe('ideDetection', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockExtensions.clear();
    mockVscode.env.appName = 'Visual Studio Code';
    jest.clearAllMocks();
  });

  describe('isCursorIDE', () => {
    it('should return true when appName contains "cursor"', () => {
      mockVscode.env.appName = 'Cursor';
      expect(isCursorIDE()).toBe(true);
    });

    it('should return true when appName contains "cursor" (case insensitive)', () => {
      mockVscode.env.appName = 'cursor';
      expect(isCursorIDE()).toBe(true);
    });

    it('should return false for VS Code', () => {
      mockVscode.env.appName = 'Visual Studio Code';
      expect(isCursorIDE()).toBe(false);
    });

    it('should return false for VS Code Insiders', () => {
      mockVscode.env.appName = 'Visual Studio Code - Insiders';
      expect(isCursorIDE()).toBe(false);
    });
  });

  describe('getIDEName', () => {
    it('should return "Cursor" when running in Cursor', () => {
      mockVscode.env.appName = 'Cursor';
      expect(getIDEName()).toBe('Cursor');
    });

    it('should return "VS Code" for Visual Studio Code', () => {
      mockVscode.env.appName = 'Visual Studio Code';
      expect(getIDEName()).toBe('VS Code');
    });

    it('should return "VS Code" for unknown IDEs', () => {
      mockVscode.env.appName = 'Unknown IDE';
      expect(getIDEName()).toBe('VS Code');
    });
  });

  describe('isCopilotAvailable', () => {
    it('should return true when GitHub Copilot is active', () => {
      mockExtensions.set('github.copilot', { isActive: true });
      expect(isCopilotAvailable()).toBe(true);
    });

    it('should return true when GitHub Copilot Chat is active', () => {
      mockExtensions.set('github.copilot-chat', { isActive: true });
      expect(isCopilotAvailable()).toBe(true);
    });

    it('should return false when Copilot is installed but not active', () => {
      mockExtensions.set('github.copilot', { isActive: false });
      expect(isCopilotAvailable()).toBe(false);
    });

    it('should return false when Copilot is not installed', () => {
      expect(isCopilotAvailable()).toBe(false);
    });
  });

  describe('isAmazonQAvailable', () => {
    it('should return true when Amazon Q is active', () => {
      mockExtensions.set('amazonwebservices.amazon-q-vscode', { isActive: true });
      expect(isAmazonQAvailable()).toBe(true);
    });

    it('should return true when AWS Toolkit is active', () => {
      mockExtensions.set('amazonwebservices.aws-toolkit-vscode', { isActive: true });
      expect(isAmazonQAvailable()).toBe(true);
    });

    it('should return false when Amazon Q is not installed', () => {
      expect(isAmazonQAvailable()).toBe(false);
    });

    it('should return false when Amazon Q is installed but not active', () => {
      mockExtensions.set('amazonwebservices.amazon-q-vscode', { isActive: false });
      expect(isAmazonQAvailable()).toBe(false);
    });
  });

  describe('getBestAIProvider', () => {
    it('should return "cursor" when running in Cursor', () => {
      mockVscode.env.appName = 'Cursor';
      expect(getBestAIProvider()).toBe('cursor');
    });

    it('should return "copilot" when Copilot is available (not in Cursor)', () => {
      mockVscode.env.appName = 'Visual Studio Code';
      mockExtensions.set('github.copilot', { isActive: true });
      expect(getBestAIProvider()).toBe('copilot');
    });

    it('should return "amazon-q" when only Amazon Q is available', () => {
      mockVscode.env.appName = 'Visual Studio Code';
      mockExtensions.set('amazonwebservices.amazon-q-vscode', { isActive: true });
      expect(getBestAIProvider()).toBe('amazon-q');
    });

    it('should prefer Cursor over Copilot even if Copilot is installed', () => {
      mockVscode.env.appName = 'Cursor';
      mockExtensions.set('github.copilot', { isActive: true });
      expect(getBestAIProvider()).toBe('cursor');
    });

    it('should prefer Copilot over Amazon Q', () => {
      mockVscode.env.appName = 'Visual Studio Code';
      mockExtensions.set('github.copilot', { isActive: true });
      mockExtensions.set('amazonwebservices.amazon-q-vscode', { isActive: true });
      expect(getBestAIProvider()).toBe('copilot');
    });

    it('should return "none" when no AI providers are available', () => {
      mockVscode.env.appName = 'Visual Studio Code';
      expect(getBestAIProvider()).toBe('none');
    });
  });

  describe('getAvailableAIProviders', () => {
    it('should return empty array when no providers available', () => {
      mockVscode.env.appName = 'Visual Studio Code';
      expect(getAvailableAIProviders()).toEqual([]);
    });

    it('should include "cursor" when running in Cursor', () => {
      mockVscode.env.appName = 'Cursor';
      expect(getAvailableAIProviders()).toContain('cursor');
    });

    it('should include "copilot" when Copilot is available', () => {
      mockVscode.env.appName = 'Visual Studio Code';
      mockExtensions.set('github.copilot', { isActive: true });
      expect(getAvailableAIProviders()).toContain('copilot');
    });

    it('should include "amazon-q" when Amazon Q is available', () => {
      mockVscode.env.appName = 'Visual Studio Code';
      mockExtensions.set('amazonwebservices.amazon-q-vscode', { isActive: true });
      expect(getAvailableAIProviders()).toContain('amazon-q');
    });

    it('should return all available providers', () => {
      mockVscode.env.appName = 'Cursor';
      mockExtensions.set('github.copilot', { isActive: true });
      mockExtensions.set('amazonwebservices.amazon-q-vscode', { isActive: true });

      const providers = getAvailableAIProviders();
      expect(providers).toContain('cursor');
      expect(providers).toContain('copilot');
      expect(providers).toContain('amazon-q');
      expect(providers).toHaveLength(3);
    });
  });
});
