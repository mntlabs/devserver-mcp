import { writeFile, readFile, existsSync } from 'fs';
import { promisify } from 'util';
const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const STATE_FILE = '/tmp/devserver-mcp-state.json';
export class SharedStateManager {
    state = {
        processInfo: null,
        isRunning: false,
        errors: [],
        errorCounts: { critical: 0, warning: 0, info: 0 },
        lastUpdate: 0
    };
    async writeState(state) {
        this.state = { ...this.state, ...state, lastUpdate: Date.now() };
        try {
            await writeFileAsync(STATE_FILE, JSON.stringify(this.state, null, 2));
        }
        catch (error) {
            console.error('Failed to write shared state:', error);
        }
    }
    async readState() {
        try {
            if (existsSync(STATE_FILE)) {
                const data = await readFileAsync(STATE_FILE, 'utf-8');
                const parsed = JSON.parse(data);
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
        }
        catch (error) {
            console.error('Failed to read shared state:', error);
        }
        return this.state;
    }
    async clearState() {
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
//# sourceMappingURL=shared-state.js.map