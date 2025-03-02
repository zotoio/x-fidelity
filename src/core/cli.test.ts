import { initCLI, options, DEMO_CONFIG_PATH } from './cli';
import { program } from 'commander';
import { logger } from '../utils/logger';
import { validateInput } from '../utils/inputValidation';
import fs from 'fs';
import path from 'path';

jest.mock('commander', () => {
  const mockProgram = {
    opts: jest.fn().mockReturnValue({}),
    option: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    helpOption: jest.fn().mockReturnThis(),
    summary: jest.fn().mockReturnThis(),
    usage: jest.fn().mockReturnThis(),
    argument: jest.fn().mockReturnThis(),
    addHelpText: jest.fn().mockReturnThis(),
    parse: jest.fn().mockReturnThis(),
    help: jest.fn().mockReturnThis(),
    error: jest.fn().mockReturnThis(),
    exitOverride: jest.fn().mockImplementation(cb => {
      cb();
      return mockProgram;
    }),
    args: []
  };
  return { program: mockProgram };
});

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  setLogPrefix: jest.fn(),
  setLogLevel: jest.fn(),
  getLogPrefix: jest.fn(),
  initializeLogger: jest.fn(),
  generateLogPrefix: jest.fn()
}));

jest.mock('../utils/inputValidation', () => ({
  validateInput: jest.fn().mockReturnValue(true)
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true)
}));

jest.mock('path', () => ({
  resolve: jest.fn().mockImplementation((...args) => args.join('/')),
  join: jest.fn().mockImplementation((...args) => args.join('/'))
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
    program.args = [];
    (program.opts as jest.Mock).mockReturnValue({});
  });

  it('should initialize CLI with default options', () => {
    initCLI();
    
    expect(program.option).toHaveBeenCalledWith(
      "-d, --dir <directory>",
      "local git repo directory path to analyze. equivalent of directory argument"
    );
    expect(program.option).toHaveBeenCalledWith(
      "-a, --archetype <archetype>",
      "The archetype to use for analysis",
      "node-fullstack"
    );
    expect(program.parse).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('CLI initialized'));
  });

  it('should use directory argument if provided', () => {
    program.args = ['/test/dir'];
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    initCLI();
    
    expect(path.resolve).toHaveBeenCalledWith('/test/cwd', '/test/dir');
    expect(fs.existsSync).toHaveBeenCalled();
  });

  it('should use --dir option if no directory argument is provided', () => {
    (program.opts as jest.Mock).mockReturnValue({ dir: '/test/option/dir' });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    initCLI();
    
    expect(path.resolve).toHaveBeenCalledWith('/test/cwd', '/test/option/dir');
    expect(fs.existsSync).toHaveBeenCalled();
  });

  it('should resolve localConfigPath if provided', () => {
    (program.opts as jest.Mock).mockReturnValue({ 
      dir: '/test/dir',
      localConfigPath: '/test/config/path' 
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    initCLI();
    
    expect(path.resolve).toHaveBeenCalledWith('/test/cwd', '/test/config/path');
    expect(fs.existsSync).toHaveBeenCalled();
  });

  it('should handle server mode', () => {
    (program.opts as jest.Mock).mockReturnValue({ 
      mode: 'server',
      port: '8888'
    });
    
    initCLI();
    
    expect(options.dir).toBe('.');
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('mode: server')
    );
  });

  it('should handle test environment', () => {
    process.env.NODE_ENV = 'test';
    
    initCLI();
    
    expect(options.dir).toBe('.');
    
    process.env.NODE_ENV = originalProcessEnv.NODE_ENV;
  });

  it('should handle path resolution errors', () => {
    (program.opts as jest.Mock).mockReturnValue({ dir: '/nonexistent/path' });
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    initCLI();
    
    expect(program.error).toHaveBeenCalledWith(expect.stringContaining('Error resolving repo path'));
  });

  it('should handle localConfigPath resolution errors', () => {
    (program.opts as jest.Mock).mockReturnValue({ 
      dir: '/test/dir',
      localConfigPath: '/nonexistent/config' 
    });
    (fs.existsSync as jest.Mock)
      .mockReturnValueOnce(true)  // For dir
      .mockReturnValueOnce(false); // For localConfigPath
    
    initCLI();
    
    expect(program.error).toHaveBeenCalledWith(expect.stringContaining('LocalConfigPath does not exist'));
  });

  it('should handle invalid paths', () => {
    (program.opts as jest.Mock).mockReturnValue({ dir: '../suspicious/path' });
    (validateInput as jest.Mock).mockReturnValue(false);
    
    initCLI();
    
    expect(program.error).toHaveBeenCalledWith(expect.stringContaining('Error resolving repo path'));
  });

  it('should use DEMO_CONFIG_PATH as default localConfigPath', () => {
    (program.opts as jest.Mock).mockReturnValue({
      dir: '/test/dir'
    });
    
    initCLI();
    
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(`localConfigPath: ${DEMO_CONFIG_PATH}`)
    );
  });

  it('should handle openaiEnabled option', () => {
    (program.opts as jest.Mock).mockReturnValue({
      dir: '/test/dir',
      openaiEnabled: true
    });
    
    initCLI();
    
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('openaiEnabled: true')
    );
  });

  it('should handle extensions option', () => {
    (program.opts as jest.Mock).mockReturnValue({
      dir: '/test/dir',
      extensions: ['ext1', 'ext2']
    });
    
    initCLI();
    
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('extensions: ext1,ext2')
    );
  });

  it('should show help if no options are provided', () => {
    (program as any).options = [];
    
    initCLI();
    
    expect(program.help).toHaveBeenCalled();
  });
});
