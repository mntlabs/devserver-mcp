import { randomUUID } from 'crypto';
import type { ErrorEntry, LogPattern, Config } from './types/index.js';

export class LogParser {
  private patterns: LogPattern[] = [];
  private errorHistory: ErrorEntry[] = [];
  private historyLimit: number;

  constructor(config: Config) {
    this.patterns = config.patterns;
    this.historyLimit = config.historyLimit;
  }

  updateConfig(config: Config): void {
    this.patterns = config.patterns;
    this.historyLimit = config.historyLimit;
    this.trimHistory();
  }

  parseLog(logLine: string): ErrorEntry | null {
    const trimmedLine = logLine.trim();
    if (!trimmedLine) return null;

    for (const pattern of this.patterns) {
      const match = pattern.pattern.exec(trimmedLine);
      if (match) {
        const error = this.createErrorEntry(pattern, match, trimmedLine);
        this.addToHistory(error);
        pattern.pattern.lastIndex = 0; // Reset regex state
        return error;
      }
    }

    return null;
  }

  private createErrorEntry(pattern: LogPattern, match: RegExpExecArray, raw: string): ErrorEntry {
    const error: ErrorEntry = {
      id: randomUUID(),
      timestamp: new Date(),
      severity: pattern.severity,
      category: pattern.category,
      message: this.extractField(match, pattern.extract.message) || match[0] || raw,
      raw,
    };

    // Extract file information if available
    const file = this.extractField(match, pattern.extract.file);
    if (file) {
      error.file = file;
    }

    const line = this.extractField(match, pattern.extract.line);
    if (line && !isNaN(Number(line))) {
      error.line = Number(line);
    }

    const column = this.extractField(match, pattern.extract.column);
    if (column && !isNaN(Number(column))) {
      error.column = Number(column);
    }

    return error;
  }

  private extractField(match: RegExpExecArray, fieldIndex?: number): string | undefined {
    if (fieldIndex === undefined || fieldIndex >= match.length) {
      return undefined;
    }
    return match[fieldIndex]?.trim();
  }

  private addToHistory(error: ErrorEntry): void {
    this.errorHistory.unshift(error);
    this.trimHistory();
  }

  private trimHistory(): void {
    if (this.errorHistory.length > this.historyLimit) {
      this.errorHistory = this.errorHistory.slice(0, this.historyLimit);
    }
  }

  getHistory(): ErrorEntry[] {
    return [...this.errorHistory];
  }

  getErrorsForFile(filepath: string): ErrorEntry[] {
    return this.errorHistory.filter(error => 
      error.file && (error.file === filepath || error.file.endsWith(`/${filepath}`))
    );
  }

  getErrorsBySeverity(severity: ErrorEntry['severity']): ErrorEntry[] {
    return this.errorHistory.filter(error => error.severity === severity);
  }

  getErrorsByCategory(category: ErrorEntry['category']): ErrorEntry[] {
    return this.errorHistory.filter(error => error.category === category);
  }

  getRecentErrors(count = 10): ErrorEntry[] {
    return this.errorHistory.slice(0, count);
  }

  clearHistory(): void {
    this.errorHistory = [];
  }

  getErrorCounts(): { critical: number; warning: number; info: number } {
    return {
      critical: this.errorHistory.filter(e => e.severity === 'critical').length,
      warning: this.errorHistory.filter(e => e.severity === 'warning').length,
      info: this.errorHistory.filter(e => e.severity === 'info').length,
    };
  }

  getCategoryCounts(): Record<ErrorEntry['category'], number> {
    const counts: Record<ErrorEntry['category'], number> = {
      typescript: 0,
      svelte: 0,
      vite: 0,
      network: 0,
      build: 0,
      runtime: 0,
      accessibility: 0,
      unknown: 0,
    };

    for (const error of this.errorHistory) {
      counts[error.category]++;
    }

    return counts;
  }

  getFileCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const error of this.errorHistory) {
      if (error.file) {
        counts[error.file] = (counts[error.file] || 0) + 1;
      }
    }

    return counts;
  }
}