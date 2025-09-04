import type { DevServerProcess, ErrorEntry } from './types/index.js';
export interface SharedState {
    processInfo: DevServerProcess | null;
    isRunning: boolean;
    errors: ErrorEntry[];
    errorCounts: {
        critical: number;
        warning: number;
        info: number;
    };
    lastUpdate: number;
}
export declare class SharedStateManager {
    private state;
    writeState(state: Partial<SharedState>): Promise<void>;
    readState(): Promise<SharedState>;
    clearState(): Promise<void>;
}
//# sourceMappingURL=shared-state.d.ts.map