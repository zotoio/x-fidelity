import { loadRules } from './ruleUtils';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { isOpenAIEnabled } from './openaiUtils';
import { validateRule } from './jsonSchemas';
import axios from 'axios';

jest.mock('./openaiUtils');
jest.mock('./jsonSchemas', () => ({
  validateRule: jest.fn()
}));

jest.mock('axios');
jest.mock('fs', () => ({
    promises: {
      lstat: jest.fn(),
      readFile: jest.fn(),
    },
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
  }));
jest.mock('path');
jest.mock('./logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn(),
    },
}));

const mockValidateRule = validateRule as jest.MockedFunction<typeof validateRule>;

describe('loadRules', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateRule.mockReturnValue(true);
    });

    it('should load rules from local files when configServer is not provided', async () => {
        const mockRuleContent = JSON.stringify({ name: 'testRule', conditions: { all: [] }, event: { type: 'testEvent', params: {} } });
        const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
        mockedFsPromises.readFile.mockResolvedValue(mockRuleContent);
        (path.join as jest.Mock).mockReturnValue('/path/rules/testRule-rule.json');

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['testRule'], localConfigPath: '/path' });

        expect(result).toEqual([JSON.parse(mockRuleContent)]);
        expect(fs.promises.readFile).toHaveBeenCalledWith('/path/rules/testRule-rule.json', 'utf8');
    });

    it('should load rules from config server when provided', async () => {
        const mockRuleContent = { name: 'testRule', conditions: {}, event: {} };
        const mockedAxios = jest.mocked(axios);
        mockedAxios.get.mockResolvedValue({ data: mockRuleContent });

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['testRule'], configServer: 'http://configserver.com' });

        expect(result).toEqual([mockRuleContent]);
        expect(axios.get).toHaveBeenCalledWith('http://configserver.com/archetype/testArchetype/rule/testRule');
    });

    it('should log an error if remote fetch fails', async () => {
        const mockedAxios = jest.mocked(axios);
        mockedAxios.get.mockRejectedValue(new Error('Network error'));

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['testRule'], configServer: 'http://configserver.com' });

        expect(result).toEqual([]);
        expect(axios.get).toHaveBeenCalledWith('http://configserver.com/archetype/testArchetype/rule/testRule');
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
        mockedFsPromises.readFile.mockResolvedValue(mockRuleContent);
        (path.join as jest.Mock).mockReturnValue('/path/rules/openaiRule-rule.json');

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['openaiRule'], localConfigPath: '/path' });

        expect(result).toEqual([JSON.parse(mockRuleContent)]);
    });

});
