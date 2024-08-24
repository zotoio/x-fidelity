import { logger } from '../src/utils/logger';

// jest.setup.ts
beforeAll(() => {
  jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
    logger.info(`process.exit(${code}) called but ignored in tests`);
    // Throwing an error is avoided to prevent Jest worker crashes
    return undefined as never;
  });
});

afterAll(() => {
  (process.exit as unknown as jest.Mock).mockRestore();
});
