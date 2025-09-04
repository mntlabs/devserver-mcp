import { describe, it, expect, beforeEach } from 'vitest';
import { LogParser } from '../src/log-parser.js';
import { defaultPatterns } from '../src/config/default-patterns.js';
import type { Config } from '../src/types/index.js';

describe('LogParser', () => {
  let logParser: LogParser;
  let mockConfig: Config;

  beforeEach(() => {
    mockConfig = {
      processPatterns: ['pnpm run dev'],
      patterns: defaultPatterns,
      historyLimit: 100,
      correlationWindow: 5000,
      watchPaths: ['src'],
      excludePaths: ['node_modules'],
    };
    logParser = new LogParser(mockConfig);
  });

  describe('parseLog', () => {
    it('should parse TypeScript errors correctly', () => {
      const logLine = "error TS2304: Cannot find name 'unknownVariable'.";
      const error = logParser.parseLog(logLine);
      
      expect(error).toBeTruthy();
      expect(error?.category).toBe('typescript');
      expect(error?.severity).toBe('critical');
      expect(error?.message).toContain('Cannot find name');
    });

    it('should parse Svelte warnings correctly', () => {
      const logLine = "[vite-plugin-svelte] Component has unused CSS selector";
      const error = logParser.parseLog(logLine);
      
      expect(error).toBeTruthy();
      expect(error?.category).toBe('svelte');
      expect(error?.severity).toBe('warning');
    });

    it('should parse file locations correctly', () => {
      const logLine = "src/App.svelte:25:15 - error TS2304: Cannot find name 'test'.";
      const error = logParser.parseLog(logLine);
      
      expect(error).toBeTruthy();
      expect(error?.file).toBe('src/App.svelte');
      expect(error?.line).toBe(25);
      expect(error?.column).toBe(15);
      expect(error?.category).toBe('typescript');
    });

    it('should return null for unmatched log lines', () => {
      const logLine = "Some random log message that doesn't match any pattern";
      const error = logParser.parseLog(logLine);
      
      expect(error).toBeNull();
    });

    it('should return null for empty log lines', () => {
      const error1 = logParser.parseLog('');
      const error2 = logParser.parseLog('   ');
      
      expect(error1).toBeNull();
      expect(error2).toBeNull();
    });
  });

  describe('error history management', () => {
    it('should maintain error history', () => {
      const logLine1 = "error TS2304: Cannot find name 'test1'.";
      const logLine2 = "error TS2304: Cannot find name 'test2'.";
      
      logParser.parseLog(logLine1);
      logParser.parseLog(logLine2);
      
      const history = logParser.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]?.message).toContain('test2'); // Most recent first
      expect(history[1]?.message).toContain('test1');
    });

    it('should respect history limit', () => {
      const smallConfig = { ...mockConfig, historyLimit: 2 };
      const smallLogParser = new LogParser(smallConfig);
      
      smallLogParser.parseLog("error TS2304: Error 1");
      smallLogParser.parseLog("error TS2304: Error 2");
      smallLogParser.parseLog("error TS2304: Error 3");
      
      const history = smallLogParser.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]?.message).toContain('Error 3');
      expect(history[1]?.message).toContain('Error 2');
    });

    it('should clear history', () => {
      logParser.parseLog("error TS2304: Test error");
      expect(logParser.getHistory()).toHaveLength(1);
      
      logParser.clearHistory();
      expect(logParser.getHistory()).toHaveLength(0);
    });
  });

  describe('error filtering', () => {
    beforeEach(() => {
      logParser.parseLog("error TS2304: TypeScript error");
      logParser.parseLog("[vite-plugin-svelte] Svelte warning");
      logParser.parseLog("404 /api/test");
    });

    it('should filter errors by severity', () => {
      const criticalErrors = logParser.getErrorsBySeverity('critical');
      const warningErrors = logParser.getErrorsBySeverity('warning');
      
      expect(criticalErrors).toHaveLength(1);
      expect(warningErrors).toHaveLength(2); // Svelte and network
    });

    it('should filter errors by category', () => {
      const typescriptErrors = logParser.getErrorsByCategory('typescript');
      const svelteErrors = logParser.getErrorsByCategory('svelte');
      const networkErrors = logParser.getErrorsByCategory('network');
      
      expect(typescriptErrors).toHaveLength(1);
      expect(svelteErrors).toHaveLength(1);
      expect(networkErrors).toHaveLength(1);
    });

    it('should get recent errors', () => {
      const recentErrors = logParser.getRecentErrors(2);
      expect(recentErrors).toHaveLength(2);
    });
  });

  describe('error counts and statistics', () => {
    beforeEach(() => {
      logParser.parseLog("error TS2304: Critical error");
      logParser.parseLog("[vite-plugin-svelte] Warning message");
      logParser.parseLog("404 /api/test");
    });

    it('should count errors by severity', () => {
      const counts = logParser.getErrorCounts();
      expect(counts.critical).toBe(1);
      expect(counts.warning).toBe(2);
      expect(counts.info).toBe(0);
    });

    it('should count errors by category', () => {
      const counts = logParser.getCategoryCounts();
      expect(counts.typescript).toBe(1);
      expect(counts.svelte).toBe(1);
      expect(counts.network).toBe(1);
      expect(counts.vite).toBe(0);
    });
  });
});