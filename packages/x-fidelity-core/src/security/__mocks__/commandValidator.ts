export const SafeGitCommand = jest.fn().mockImplementation(() => ({
  execute: jest.fn().mockResolvedValue({ stdout: '', stderr: '' })
}));