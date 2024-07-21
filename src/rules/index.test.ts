import { loadRules } from './index';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

jest.mock('axios');
jest.mock('fs', () => ({
    //...jest.requireActual('fs'),
    promises: {
      lstat: jest.fn(),
      readFile: jest.fn(),
    },
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
  }));
jest.mock('path');
jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
    },
}));

describe('loadRules', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should load rules from local files when configServer is not provided', async () => {
        const mockRuleContent = JSON.stringify({ name: 'testRule', conditions: {}, event: {} });
        const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
        mockedFsPromises.readFile.mockResolvedValue(mockRuleContent);
        (path.join as jest.Mock).mockReturnValue('/path/to/testRule-rule.json');

        const result = await loadRules('testArchetype', ['testRule']);

        expect(result).toEqual([JSON.parse(mockRuleContent)]);
        expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/testRule-rule.json', 'utf8');
    });

    it('should load rules from config server when provided', async () => {
        const mockRuleContent = { name: 'testRule', conditions: {}, event: {} };
        (axios.get as jest.Mock).mockResolvedValue({ data: mockRuleContent });

        const result = await loadRules('testArchetype', ['testRule'], 'http://configserver.com');

        expect(result).toEqual([mockRuleContent]);
        expect(axios.get).toHaveBeenCalledWith('http://configserver.com/archetypes/testArchetype/rules/testRule');
    });

    it('should fall back to local file if remote fetch fails', async () => {
        const mockRuleContent = JSON.stringify({ name: 'testRule', conditions: {}, event: {} });
        (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));
        const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
        mockedFsPromises.readFile.mockResolvedValue(mockRuleContent);
        (path.join as jest.Mock).mockReturnValue('/path/to/testRule-rule.json');

        const result = await loadRules('testArchetype', ['testRule'], 'http://configserver.com');

        expect(result).toEqual([JSON.parse(mockRuleContent)]);
        expect(axios.get).toHaveBeenCalledWith('http://configserver.com/archetypes/testArchetype/rules/testRule');
        expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/testRule-rule.json', 'utf8');
    });

    it('should not load openai rules if OPENAI_API_KEY is not set', async () => {
        delete process.env.OPENAI_API_KEY;
        const result = await loadRules('testArchetype', ['openaiRule']);
        expect(result).toEqual([]);
    });

    it('should load openai rules if OPENAI_API_KEY is set', async () => {
        process.env.OPENAI_API_KEY = 'test-key';
        const mockRuleContent = JSON.stringify({ name: 'openaiRule', conditions: {}, event: {} });
        const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
        mockedFsPromises.readFile.mockResolvedValue(mockRuleContent);
        (path.join as jest.Mock).mockReturnValue('/path/to/openaiRule-rule.json');

        const result = await loadRules('testArchetype', ['openaiRule']);

        expect(result).toEqual([JSON.parse(mockRuleContent)]);
    });

    it('should handle errors when loading local rules', async () => {
        const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
        mockedFsPromises.readFile.mockRejectedValue(new Error('File not found'));
        (path.join as jest.Mock).mockReturnValue('/path/to/testRule-rule.json');

        const result = await loadRules('testArchetype', ['testRule']);

        expect(result).toEqual([]);
        expect(logger.error).toHaveBeenCalled();
    });
});
