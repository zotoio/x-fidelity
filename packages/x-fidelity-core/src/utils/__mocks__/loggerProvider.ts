export const LoggerProvider = {
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  setLogger: jest.fn(),
  clearInjectedLogger: jest.fn(),
};