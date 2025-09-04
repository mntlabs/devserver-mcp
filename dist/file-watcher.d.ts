import { EventEmitter } from 'events';
import type { FileChange, ErrorCorrelation, ErrorEntry, Config } from './types/index.js';
interface FileWatcherEvents {
    'file-change': [FileChange];
    'error-correlation': [ErrorCorrelation];
}
export declare class FileWatcher extends EventEmitter<FileWatcherEvents> {
    private watcher;
    private recentChanges;
    private correlationWindow;
    private config;
    constructor(config: Config);
    updateConfig(config: Config): void;
    startWatching(): void;
    stopWatching(): void;
    private handleFileChange;
    private trimRecentChanges;
    correlateErrors(errors: ErrorEntry[]): ErrorCorrelation[];
    private pathsAreRelated;
    private calculateConfidence;
    getRecentChanges(limit?: number): FileChange[];
    clearHistory(): void;
}
export {};
//# sourceMappingURL=file-watcher.d.ts.map