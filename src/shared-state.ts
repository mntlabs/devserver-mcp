import { writeFile, readFile, existsSync } from 'fs';
import { promisify } from 'util';
import type { DevServerProcess, ErrorEntry } from './types/index.js';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);

const STATE_FILE = '/tmp/devserver-mcp-state.json';

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

export class SharedStateManager {
  private state: SharedState = {
    processInfo: null,
    isRunning: false,
    errors: [],
    errorCounts: { critical: 0, warning: 0, info: 0 },
    lastUpdate: 0
  };

  async writeState(state: Partial<SharedState>): Promise<void> {
    this.state = { ...this.state, ...state, lastUpdate: Date.now() };
    try {
      await writeFileAsync(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to write shared state:', error);
    }
  }

  async readState(): Promise<SharedState> {
    try {
      if (existsSync(STATE_FILE)) {
        const data = await readFileAsync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(data) as SharedState;
        
        // Consider state stale if older than 30 seconds
        const isStale = Date.now() - parsed.lastUpdate > 30000;
        
        if (isStale) {
          return {
            processInfo: null,
            isRunning: false,
            errors: [],
            errorCounts: { critical: 0, warning: 0, info: 0 },
            lastUpdate: 0
          };
        }
        
        return parsed;
      }
    } catch (error) {
      console.error('Failed to read shared state:', error);
    }

    return this.state;
  }

  async updateHeartbeat(): Promise<void> {
    // Lightweight update - only update timestamp if state exists
    if (existsSync(STATE_FILE)) {
      try {
        const data = await readFileAsync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(data) as SharedState;
        parsed.lastUpdate = Date.now();
        await writeFileAsync(STATE_FILE, JSON.stringify(parsed, null, 2));
      } catch (error) {
        console.error('Failed to update heartbeat:', error);
      }
    }
  }

  async clearState(): Promise<void> {
    this.state = {
      processInfo: null,
      isRunning: false,
      errors: [],
      errorCounts: { critical: 0, warning: 0, info: 0 },
      lastUpdate: 0
    };
    await this.writeState(this.state);
  }
}