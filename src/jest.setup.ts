import { logger } from '../src/utils/logger';

// jest.setup.ts
import { EventEmitter } from 'events';

// Increase the default max listeners
EventEmitter.defaultMaxListeners = 20;

beforeAll(() => {
  // Set max listeners for process
  process.setMaxListeners(20);
  
  jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
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
  jest.mocked(process.exit).mockRestore();
  // Reset max listeners to default
  process.setMaxListeners(10);
  EventEmitter.defaultMaxListeners = 10;
});
