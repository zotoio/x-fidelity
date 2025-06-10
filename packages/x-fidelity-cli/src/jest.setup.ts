import { logger } from '@x-fidelity/core';

// jest.setup.ts
import { EventEmitter } from 'events';

// Increase the default max listeners
EventEmitter.defaultMaxListeners = 20;

let exitSpy: jest.SpyInstance;

beforeAll(() => {
  // Set max listeners for process
  process.setMaxListeners(20);
  
  exitSpy = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
    logger.info({ 
        code,
        type: 'test-exit'
    }, 'Process exit called but ignored in tests');
    // Throwing an error is avoided to prevent Jest worker crashes
    return undefined as never;
  });
});

afterAll(() => {
  // Use mockRestore on the spy directly
  exitSpy.mockRestore();
  // Reset max listeners to default
  process.setMaxListeners(10);
  EventEmitter.defaultMaxListeners = 10;
});
