import { EventEmitter } from 'events';
import type { DevServerProcess, Config } from './types/index.js';
interface ProcessEvents {
    'log': [string, 'stdout' | 'stderr'];
    'process-start': [DevServerProcess];
    'process-exit': [number | null];
    'error': [Error];
}
export declare class ProcessMonitor extends EventEmitter<ProcessEvents> {
    private process;
    private processInfo;
    private config;
    constructor(config: Config);
    updateConfig(config: Config): void;
    findRunningDevServer(): Promise<DevServerProcess | null>;
    startMonitoring(command?: string, args?: string[], cwd?: string): Promise<void>;
    private setupProcessHandlers;
    stopMonitoring(): void;
    isRunning(): boolean;
    getProcessInfo(): DevServerProcess | null;
    getUptime(): number | null;
}
export {};
//# sourceMappingURL=process-monitor.d.ts.map