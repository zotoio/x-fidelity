import express from 'express';
import https from 'https';
import fs from 'fs';
import { startServer } from './configServer';
import { logger } from '../utils/logger';
import chokidar from 'chokidar';
import { options } from '../core/cli';

jest.mock('express', () => {
  const mockJson = jest.fn().mockReturnValue(jest.fn());
  const mockApp = {
    use: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    listen: jest.fn().mockImplementation((port, callback) => {
      callback();
      return { on: jest.fn() };
    })
  };
  const mockExpress = jest.fn(() => mockApp);
  mockExpress.json = mockJson;
  return mockExpress;
});

jest.mock('https', () => ({
  createServer: jest.fn().mockImplementation(() => ({
    listen: jest.fn().mockImplementation((port, callback) => {
      callback();
      return { on: jest.fn() };
    })
  }))
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn()
}));

jest.mock('chokidar', () => ({
  watch: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis()
  })
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  setLogPrefix: jest.fn()
}));

jest.mock('../core/cli', () => ({
  options: {
    port: '8888',
    localConfigPath: '/test/path'
  }
}));

describe('configServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start HTTPS server when certificates are available', () => {
    (fs.readFileSync as jest.Mock).mockImplementation((path) => {
      if (path.includes('tls.key')) return 'private-key';
      if (path.includes('tls.pem')) return 'certificate';
      return '';
    });
    
    const server = startServer({ customPort: '9999', executionLogPrefix: 'test-prefix' });
    
    expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    expect(https.createServer).toHaveBeenCalledWith(
      { key: 'private-key', cert: 'certificate' },
      expect.any(Object)
    );
    expect(logger.info).toHaveBeenCalledWith('xfidelity server is running on https://localhost:9999');
    expect(chokidar.watch).toHaveBeenCalledWith('/test/path', expect.any(Object));
  });

  it('should fall back to HTTP server when certificates are not available', () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File not found');
    });
    
    const server = startServer({});
    
    expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Failed to start server with TLS, falling back to HTTP'
    }));
    expect(express().listen).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('xfidelity server is running on http://localhost:8888');
  });

  it('should set up file watcher when localConfigPath is provided', () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File not found');
    });
    
    const server = startServer({});
    
    expect(chokidar.watch).toHaveBeenCalledWith('/test/path', expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith('Watching for changes in /test/path');
  });

  it('should not set up file watcher when localConfigPath is not provided', () => {
    options.localConfigPath = '';
    
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File not found');
    });
    
    const server = startServer({});
    
    expect(chokidar.watch).not.toHaveBeenCalled();
  });
});
