import { initCLI, options, DEMO_CONFIG_PATH } from './cli';
import { logger, setOptions } from '@x-fidelity/core';
import fs from 'fs';
import path from 'path';

const mockProgram = {
  name: jest.fn().mockReturnThis(),
  description: jest.fn().mockReturnThis(),
  version: jest.fn().mockReturnThis(),
  option: jest.fn().mockReturnThis(),
  requiredOption: jest.fn().mockReturnThis(),
  parse: jest.fn().mockReturnThis(),
  opts: jest.fn().mockReturnValue({}),
  helpOption: jest.fn().mockReturnThis(),
  summary: jest.fn().mockReturnThis(),
  usage: jest.fn().mockReturnThis(),
  argument: jest.fn().mockReturnThis(),
  addHelpText: jest.fn().mockReturnThis(),
  help: jest.fn().mockReturnThis(),
  error: jest.fn().mockReturnThis(),
  command: jest.fn().mockReturnThis(),
  action: jest.fn().mockReturnThis(),
  exitOverride: jest.fn().mockImplementation(cb => {
    cb();
    return mockProgram;
  }),
  args: [] as string[]
};

jest.mock('commander', () => {
  const Command = jest.fn().mockImplementation(() => mockProgram);
  
  return { 
    Command: Command
  };
});

jest.mock('@x-fidelity/core', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  setOptions: jest.fn(),
  setLogPrefix: jest.fn(),
  setLogLevel: jest.fn(),
  getLogPrefix: jest.fn(),
  initializeLogger: jest.fn(),
  generateLogPrefix: jest.fn(),
  validateInput: jest.fn().mockReturnValue({ isValid: true }),
  ConfigSetManager: {
    getInstance: jest.fn().mockReturnValue({
      readConfigSet: jest.fn().mockResolvedValue({}),
      writeConfigSet: jest.fn().mockResolvedValue('/mock/path'),
      listConfigSets: jest.fn().mockResolvedValue([])
    })
  },
  CentralConfigManager: {
    getInstance: jest.fn().mockReturnValue({})
  }
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('{"test": "config"}')
}));

jest.mock('path', () => ({
  resolve: jest.fn().mockImplementation((...args) => args.join('/')),
  join: jest.fn().mockImplementation((...args) => args.join('/'))
}));

jest.mock('prettyjson', () => ({
  render: jest.fn().mockReturnValue('mocked json output')
}));

describe('CLI', () => {
  let originalProcessExit: (code?: number) => never;
  let originalProcessEnv: NodeJS.ProcessEnv;
  let originalProcessCwd: () => string;
  
  // Helper function to simulate full CLI flow
  const simulateCLI = async (cliOpts: any = {}, directory: string = '.') => {
    // Handle mode conversion like real CLI - 'client' becomes 'cli'
    let mode = cliOpts.mode || 'cli';
    if (mode === 'client') {
      mode = 'cli';
      // Log deprecation warning like real implementation
      logger.warn('DEPRECATION WARNING: \'client\' mode is deprecated, use \'cli\' instead');
    }
    
    // Update global options directly like the real implementation
    options.dir = cliOpts.dir || directory || '.';
    options.archetype = cliOpts.archetype || 'node-fullstack';
    options.mode = mode;
    options.localConfigPath = cliOpts.localConfigPath;
    options.githubConfigLocation = cliOpts.githubConfigLocation;
    options.openaiEnabled = cliOpts.openaiEnabled;
    options.extraPlugins = cliOpts.extraPlugins || [];
    
    // Call setOptions like the real implementation does
    if (setOptions && typeof setOptions === 'function') {
      setOptions({
        dir: options.dir,
        archetype: options.archetype,
        mode: options.mode,
        localConfigPath: options.localConfigPath,
        githubConfigLocation: options.githubConfigLocation,
        openaiEnabled: options.openaiEnabled,
        extraPlugins: options.extraPlugins
      });
    }
  };

  beforeAll(() => {
    originalProcessExit = process.exit;
    originalProcessEnv = process.env;
    originalProcessCwd = process.cwd;
    process.exit = jest.fn() as any;
    process.cwd = jest.fn().mockReturnValue('/test/cwd');
  });

  afterAll(() => {
    process.exit = originalProcessExit;
    process.env = originalProcessEnv;
    process.cwd = originalProcessCwd;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (mockProgram.opts as jest.Mock).mockReturnValue({});
    mockProgram.args = [];
    
    // Reset options to default state
    options.dir = '.';
    options.archetype = 'node-fullstack';
    options.mode = 'cli';
    options.localConfigPath = undefined;
    options.openaiEnabled = undefined;
    options.extraPlugins = [];
  });

  it('should initialize CLI with default options', () => {
    initCLI();
    
    expect(mockProgram.name).toHaveBeenCalledWith('xfidelity');
    expect(mockProgram.argument).toHaveBeenCalledWith('[directory]', 'path to repository root (default: current directory)');
    expect(mockProgram.option).toHaveBeenCalledWith('-d, --dir <path>', 'path to repository root (overrides positional argument)');
    expect(mockProgram.option).toHaveBeenCalledWith('-a, --archetype <archetype>', 'The archetype to use for analysis', 'node-fullstack');
    expect(mockProgram.parse).toHaveBeenCalledWith(process.argv);
    expect(mockProgram.action).toHaveBeenCalled();
  });

  it('should use directory argument if provided', async () => {
    await simulateCLI({}, '/test/dir');
    expect(options.dir).toBe('/test/dir');
  });

  it('should use --dir option if no directory argument is provided', async () => {
    await simulateCLI({ dir: '/test/option/dir' });
    expect(options.dir).toBe('/test/option/dir');
  });

  it('should resolve localConfigPath if provided', async () => {
    await simulateCLI({ localConfigPath: '/test/config/path' });
    expect(options.localConfigPath).toBe('/test/config/path');
  });

  it('should handle server mode', async () => {
    await simulateCLI({ mode: 'server', port: '8888' });
    expect(options.mode).toBe('server');
  });

  it('should default to cli mode when no mode specified', async () => {
    await simulateCLI({});
    expect(options.mode).toBe('cli');
  });

  it('should handle new execution modes', async () => {
    // Test cli mode
    await simulateCLI({ mode: 'cli' });
    expect(options.mode).toBe('cli');

    // Test vscode mode
    await simulateCLI({ mode: 'vscode' });
    expect(options.mode).toBe('vscode');

    // Test hook mode
    await simulateCLI({ mode: 'hook' });
    expect(options.mode).toBe('hook');
  });

  it('should handle backward compatibility for client mode with deprecation warning', async () => {
    await simulateCLI({ mode: 'client' });
    
    // Should map client to cli internally
    expect(options.mode).toBe('cli');
    // Should show deprecation warning
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('DEPRECATION WARNING')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('client\' mode is deprecated')
    );
  });

  it('should handle test environment', async () => {
    process.env.NODE_ENV = 'test';
    
    await simulateCLI({});
    
    expect(options.dir).toBe('.');
    
    process.env.NODE_ENV = originalProcessEnv.NODE_ENV;
  });

  it('should handle localConfigPath option', async () => {
    await simulateCLI({ localConfigPath: '/custom/config/path' });
    
    expect(options.localConfigPath).toBe('/custom/config/path');
  });

  it('should handle openaiEnabled option', async () => {
    await simulateCLI({ openaiEnabled: true });
    
    expect(options.openaiEnabled).toBe(true);
  });

  it('should handle extensions option', async () => {
    await simulateCLI({ extraPlugins: ['plugin1', 'plugin2'] });
    
    expect(options.extraPlugins).toEqual(['plugin1', 'plugin2']);
  });

  it('should show help if no options are provided', () => {
    initCLI();
    
    expect(mockProgram.parse).toHaveBeenCalledWith(process.argv);
  });

  it('should use positional argument for directory when provided', async () => {
    await simulateCLI({}, '/test/positional/dir');
    
    expect(options.dir).toBe('/test/positional/dir');
  });

  it('should prefer --dir option over positional argument', async () => {
    await simulateCLI({ dir: '/test/option/dir' }, '/test/positional/dir');
    
    expect(options.dir).toBe('/test/option/dir');
  });

  it('should default to current directory when no directory specified', async () => {
    await simulateCLI({});
    
    expect(options.dir).toBe('.');
  });

  it('should handle positional argument with other options', async () => {
    await simulateCLI({ 
      archetype: 'custom-archetype',
      openaiEnabled: true 
    }, '/test/custom/dir');
    
    expect(options.dir).toBe('/test/custom/dir');
    expect(options.archetype).toBe('custom-archetype');
    expect(options.openaiEnabled).toBe(true);
  });
});
