// Mock implementation of glob module for Jest tests
module.exports = {
  glob: jest.fn().mockResolvedValue([])
};