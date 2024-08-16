import { loadRules } from './index';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { isOpenAIEnabled } from '../utils/openaiUtils';

jest.mock('../utils/openaiUtils');
jest.mock('../utils/jsonSchemas', () => ({
  validateRule: jest.fn().mockReturnValue(true)
}));

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
        const mockRuleContent = JSON.stringify({ name: 'testRule', conditions: { all: [] }, event: { type: 'testEvent', params: {} } });
        const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
        mockedFsPromises.readFile.mockResolvedValue(mockRuleContent);
        (path.join as jest.Mock).mockReturnValue('/path/to/testRule-rule.json');

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['testRule'] });

        expect(result).toEqual([JSON.parse(mockRuleContent)]);
        expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/testRule-rule.json', 'utf8');
    });

    it('should load rules from config server when provided', async () => {
        const mockRuleContent = { name: 'testRule', conditions: {}, event: {} };
        (axios.get as jest.Mock).mockResolvedValue({ data: mockRuleContent });

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['testRule'], configServer: 'http://configserver.com' });

        expect(result).toEqual([mockRuleContent]);
        expect(axios.get).toHaveBeenCalledWith('http://configserver.com/archetypes/testArchetype/rules/testRule', expect.objectContaining({
            headers: expect.objectContaining({
                'X-Log-Prefix': expect.any(String)
            })
        }));
    });

    it('should fall back to local file if remote fetch fails', async () => {
        const mockRuleContent = JSON.stringify({ name: 'testRule', conditions: {}, event: {} });
        (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));
        const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
        mockedFsPromises.readFile.mockResolvedValue(mockRuleContent);
        (path.join as jest.Mock).mockReturnValue('/path/to/testRule-rule.json');

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['testRule'], configServer: 'http://configserver.com' });

        expect(result).toEqual([JSON.parse(mockRuleContent)]);
        expect(axios.get).toHaveBeenCalledWith('http://configserver.com/archetypes/testArchetype/rules/testRule', {
            headers: {
                'X-Log-Prefix': ''
            }
        });

        expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/testRule-rule.json', 'utf8');
    });

    it('should not load openai rules if OpenAI is not enabled', async () => {
        (isOpenAIEnabled as jest.Mock).mockReturnValue(false);
        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['openaiRule'] });
        expect(result).toEqual([]);
    });

    it('should load openai rules if OpenAI is enabled', async () => {
        (isOpenAIEnabled as jest.Mock).mockReturnValue(true);
        const mockRuleContent = JSON.stringify({ name: 'openaiRule', conditions: {}, event: {} });
        const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
        mockedFsPromises.readFile.mockResolvedValue(mock

RuleContent);
        (path.join as jest.Mock).mockReturnValue('/path/to/openaiRule-rule.json');

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['openaiRule'] });

        expect(result).toEqual([JSON.parse(mockRuleContent)]);
    });

    it('should handle errors when loading local rules', async () => {
        const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
        mockedFsPromises.readFile.mockRejectedValue(new Error('File not found'));
        (path.join as jest.Mock).mockReturnValue('/path/to/testRule-rule.json');

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['testRule'] });

        expect(result).toEqual([]);
        expect(logger.error).toHaveBeenCalled();
    });
});
