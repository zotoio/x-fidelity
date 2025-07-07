import { initCLI, options, DEMO_CONFIG_PATH } from './cli';
import { logger, setOptions } from '@x-fidelity/core';
import fs from 'fs';
import path from 'path';

const mockProgram = {
  name: jest.fn().mockReturnThis(),
  description: jest.fn().mockReturnThis(),
  version: jest.fn().mockReturnThis(),
  option: jest.fn().mockReturnThis(),
  parse: jest.fn().mockReturnThis(),
  opts: jest.fn().mockReturnValue({}),
  helpOption: jest.fn().mockReturnThis(),
  summary: jest.fn().mockReturnThis(),
  usage: jest.fn().mockReturnThis(),
  argument: jest.fn().mockReturnThis(),
  addHelpText: jest.fn().mockReturnThis(),
  help: jest.fn().mockReturnThis(),
  error: jest.fn().mockReturnThis(),
  exitOverride: jest.fn().mockImplementation(cb => {
    cb();
    return mockProgram;
  }),
  args: []
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
  validateInput: jest.fn().mockReturnValue({ isValid: true })
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
  });

  it('should initialize CLI with default options', () => {
    initCLI();
    
    expect(mockProgram.name).toHaveBeenCalledWith('xfidelity');
    expect(mockProgram.description).toHaveBeenCalledWith('CLI tool for opinionated framework adherence checks');
    expect(mockProgram.option).toHaveBeenCalledWith('-d, --dir <path>', 'path to repository root', '.');
    expect(mockProgram.option).toHaveBeenCalledWith('-a, --archetype <archetype>', 'The archetype to use for analysis', 'node-fullstack');
    expect(mockProgram.parse).toHaveBeenCalledWith(process.argv);
    expect(setOptions).toHaveBeenCalled();
  });

  it('should use directory argument if provided', () => {
    (mockProgram.opts as jest.Mock).mockReturnValue({ dir: '/test/dir' });
    
    initCLI();
    
    expect(options.dir).toBe('/test/dir');
  });

  it('should use --dir option if no directory argument is provided', () => {
    (mockProgram.opts as jest.Mock).mockReturnValue({ dir: '/test/option/dir' });
    
    initCLI();
    
    expect(options.dir).toBe('/test/option/dir');
  });

  it('should resolve localConfigPath if provided', () => {
    (mockProgram.opts as jest.Mock).mockReturnValue({ 
      dir: '/test/dir',
      localConfigPath: '/test/config/path' 
    });
    
    initCLI();
    
    expect(options.localConfigPath).toBe('/test/config/path');
  });

  it('should handle server mode', () => {
    (mockProgram.opts as jest.Mock).mockReturnValue({ 
      mode: 'server',
      port: '8888'
    });
    
    initCLI();
    
    expect(options.mode).toBe('server');
    expect(options.port).toBe(8888);
  });

  it('should handle test environment', () => {
    process.env.NODE_ENV = 'test';
    
    initCLI();
    
    expect(options.dir).toBe('.');
    
    process.env.NODE_ENV = originalProcessEnv.NODE_ENV;
  });

  it('should handle path resolution errors', () => {
    (mockProgram.opts as jest.Mock).mockReturnValue({ dir: '/nonexistent/path' });
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    initCLI();
    
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle localConfigPath resolution errors', () => {
    (mockProgram.opts as jest.Mock).mockReturnValue({ 
      dir: '/test/dir',
      localConfigPath: '/nonexistent/config' 
    });
    
    initCLI();
    
    expect(options.localConfigPath).toBe('/nonexistent/config');
  });

  it('should handle invalid paths', () => {
    (mockProgram.opts as jest.Mock).mockReturnValue({ dir: '../suspicious/path' });
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    initCLI();
    
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should use DEMO_CONFIG_PATH as default localConfigPath', () => {
    (mockProgram.opts as jest.Mock).mockReturnValue({
      dir: '/test/dir'
    });
    
    initCLI();
    
    expect(options.localConfigPath).toBe(DEMO_CONFIG_PATH);
  });

  it('should handle openaiEnabled option', () => {
    (mockProgram.opts as jest.Mock).mockReturnValue({
      openaiEnabled: true
    });
    
    initCLI();
    
    expect(options.openaiEnabled).toBe(true);
  });

  it('should handle extensions option', () => {
    (mockProgram.opts as jest.Mock).mockReturnValue({
      extraPlugins: ['plugin1', 'plugin2']
    });
    
    initCLI();
    
    expect(options.extraPlugins).toEqual(['plugin1', 'plugin2']);
  });

  it('should show help if no options are provided', () => {
    initCLI();
    
    expect(mockProgram.parse).toHaveBeenCalledWith(process.argv);
  });
});
