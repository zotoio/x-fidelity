/**
 * Browser-compatible File Data Fact
 * 
 * Provides file data from fixture storage instead of the filesystem.
 */

import { BrowserFact, BrowserAlmanac, BrowserFileData, MatchDetails, Range } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * File data fact - returns file content and metadata
 */
export const fileDataFact: BrowserFact = {
  name: 'fileData',
  description: 'Returns file data for the current file in iterative analysis',
  type: 'iterative-function',
  priority: 15,
  
  async calculate(_params: unknown, almanac: BrowserAlmanac): Promise<BrowserFileData | null> {
    // In iterative mode, file data is set on the almanac before fact execution
    if (almanac._currentFileData) {
      browserLogger.debug(`fileDataFact: Returning current file data for ${almanac._currentFileData.fileName}`);
      return almanac._currentFileData;
    }
    
    browserLogger.debug('fileDataFact: No current file data available');
    return null;
  },
};

/**
 * Repository filesystem facts - returns all files as FileData array
 */
export const repoFilesystemFact: BrowserFact = {
  name: 'repoFilesystemFacts',
  description: 'Collects and returns all file data from the fixture',
  type: 'global',
  priority: 15,
  
  async calculate(_params: unknown, almanac: BrowserAlmanac): Promise<BrowserFileData[]> {
    const fixtureData = almanac._fixtureData;
    
    if (!fixtureData) {
      browserLogger.warn('repoFilesystemFact: No fixture data available');
      return [];
    }
    
    const files: BrowserFileData[] = [];
    
    for (const [filePath, content] of fixtureData.files.entries()) {
      const fileName = filePath.split('/').pop() || filePath;
      files.push({
        fileName,
        filePath,
        fileContent: content,
        content,
        relativePath: filePath,
      });
    }
    
    browserLogger.debug(`repoFilesystemFact: Collected ${files.length} files`);
    return files;
  },
};

/**
 * File analysis fact - performs pattern matching on file content
 */
export const repoFileAnalysisFact: BrowserFact = {
  name: 'repoFileAnalysis',
  description: 'Performs pattern analysis on file content',
  type: 'iterative-function',
  priority: 1,
  
  async calculate(params: unknown, almanac: BrowserAlmanac): Promise<{
    result: Array<{ match: string; lineNumber: number; line: string }>;
    matches: MatchDetails[];
    summary: {
      totalMatches: number;
      patterns: string[];
      hasPositionData: boolean;
    };
  }> {
    const typedParams = params as {
      checkPattern?: string | string[];
      resultFact?: string;
      captureGroups?: boolean;
      contextLength?: number;
    };
    
    const fileData = await almanac.factValue<BrowserFileData>('fileData');
    
    if (!fileData || !fileData.fileContent) {
      return {
        result: [],
        matches: [],
        summary: { totalMatches: 0, patterns: [], hasPositionData: true },
      };
    }
    
    const checkPatterns: string[] = Array.isArray(typedParams.checkPattern) 
      ? typedParams.checkPattern 
      : typedParams.checkPattern 
        ? [typedParams.checkPattern] 
        : [];
    
    if (checkPatterns.length === 0) {
      return {
        result: [],
        matches: [],
        summary: { totalMatches: 0, patterns: checkPatterns, hasPositionData: true },
      };
    }
    
    const captureGroups = typedParams.captureGroups || false;
    const contextLength = typedParams.contextLength || 50;
    
    const matches: MatchDetails[] = [];
    const lines = fileData.fileContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || '';
      
      for (const pattern of checkPatterns) {
        try {
          const regex = new RegExp(pattern, 'g');
          let match: RegExpExecArray | null;
          
          while ((match = regex.exec(line)) !== null) {
            const startColumn = match.index + 1;
            const endColumn = startColumn + match[0].length;
            
            // Get context around the match
            let context = line;
            if (contextLength > 0 && contextLength < line.length) {
              const contextStart = Math.max(0, match.index - Math.floor(contextLength / 2));
              const contextEnd = Math.min(line.length, match.index + match[0].length + Math.floor(contextLength / 2));
              context = line.substring(contextStart, contextEnd);
              
              if (contextStart > 0) context = '...' + context;
              if (contextEnd < line.length) context = context + '...';
            }
            
            const range: Range = {
              start: { line: i + 1, column: startColumn },
              end: { line: i + 1, column: endColumn },
            };
            
            matches.push({
              pattern,
              match: match[0],
              range,
              context,
              groups: captureGroups && match.length > 1 ? match.slice(1) : undefined,
            });
            
            // Prevent infinite loop for zero-length matches
            if (match[0].length === 0) {
              regex.lastIndex++;
            }
          }
        } catch (error) {
          browserLogger.error(`Pattern error: ${pattern} - ${error}`);
        }
      }
    }
    
    const result = matches.map((m) => ({
      match: m.pattern,
      lineNumber: m.range.start.line,
      line: m.context || '',
    }));
    
    // Add runtime fact if requested
    if (typedParams.resultFact) {
      almanac.addRuntimeFact(typedParams.resultFact, result);
    }
    
    return {
      result,
      matches,
      summary: {
        totalMatches: matches.length,
        patterns: checkPatterns,
        hasPositionData: true,
      },
    };
  },
};
