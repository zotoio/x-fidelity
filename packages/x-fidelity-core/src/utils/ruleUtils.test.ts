import { loadRules } from './ruleUtils';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { isOpenAIEnabled } from './openaiUtils';
import axios from 'axios';

jest.mock('./openaiUtils');
jest.mock('./jsonSchemas', () => ({
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
jest.mock('./logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn(),
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

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['testRule'], localConfigPath: '/path' });

        expect(result).toEqual([JSON.parse(mockRuleContent)]);
        expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/testRule-rule.json', 'utf8');
    });

    it('should load rules from config server when provided', async () => {
        const mockRuleContent = { name: 'testRule', conditions: {}, event: {} };
        (axios.get as jest.Mock).mockResolvedValue({ data: mockRuleContent });

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['testRule'], configServer: 'http://configserver.com' });

        expect(result).toEqual([mockRuleContent]);
        expect(axios.get).toHaveBeenCalledWith('http://configserver.com/archetype/testArchetype/rule/testRule');
    });

    it('should log an error if remote fetch fails', async () => {
        (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

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
        (path.join as jest.Mock).mockReturnValue('/path/to/openaiRule-rule.json');

        const result = await loadRules({ archetype: 'testArchetype', ruleNames: ['openaiRule'], localConfigPath: '/path' });

        expect(result).toEqual([JSON.parse(mockRuleContent)]);
    });

});
