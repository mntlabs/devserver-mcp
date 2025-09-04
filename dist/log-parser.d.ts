import type { ErrorEntry, Config } from './types/index.js';
export declare class LogParser {
    private patterns;
    private errorHistory;
    private historyLimit;
    constructor(config: Config);
    updateConfig(config: Config): void;
    parseLog(logLine: string): ErrorEntry | null;
    private createErrorEntry;
    private extractField;
    private addToHistory;
    private trimHistory;
    getHistory(): ErrorEntry[];
    getErrorsForFile(filepath: string): ErrorEntry[];
    getErrorsBySeverity(severity: ErrorEntry['severity']): ErrorEntry[];
    getErrorsByCategory(category: ErrorEntry['category']): ErrorEntry[];
    getRecentErrors(count?: number): ErrorEntry[];
    clearHistory(): void;
    getErrorCounts(): {
        critical: number;
        warning: number;
        info: number;
    };
    getCategoryCounts(): Record<ErrorEntry['category'], number>;
    getFileCounts(): Record<string, number>;
}
//# sourceMappingURL=log-parser.d.ts.map