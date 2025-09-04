import { randomUUID } from 'crypto';
export class LogParser {
    patterns = [];
    errorHistory = [];
    historyLimit;
    constructor(config) {
        this.patterns = config.patterns;
        this.historyLimit = config.historyLimit;
    }
    updateConfig(config) {
        this.patterns = config.patterns;
        this.historyLimit = config.historyLimit;
        this.trimHistory();
    }
    parseLog(logLine) {
        const trimmedLine = logLine.trim();
        if (!trimmedLine)
            return null;
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
    createErrorEntry(pattern, match, raw) {
        const error = {
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
    extractField(match, fieldIndex) {
        if (fieldIndex === undefined || fieldIndex >= match.length) {
            return undefined;
        }
        return match[fieldIndex]?.trim();
    }
    addToHistory(error) {
        this.errorHistory.unshift(error);
        this.trimHistory();
    }
    trimHistory() {
        if (this.errorHistory.length > this.historyLimit) {
            this.errorHistory = this.errorHistory.slice(0, this.historyLimit);
        }
    }
    getHistory() {
        return [...this.errorHistory];
    }
    getErrorsForFile(filepath) {
        return this.errorHistory.filter(error => error.file && (error.file === filepath || error.file.endsWith(`/${filepath}`)));
    }
    getErrorsBySeverity(severity) {
        return this.errorHistory.filter(error => error.severity === severity);
    }
    getErrorsByCategory(category) {
        return this.errorHistory.filter(error => error.category === category);
    }
    getRecentErrors(count = 10) {
        return this.errorHistory.slice(0, count);
    }
    clearHistory() {
        this.errorHistory = [];
    }
    getErrorCounts() {
        return {
            critical: this.errorHistory.filter(e => e.severity === 'critical').length,
            warning: this.errorHistory.filter(e => e.severity === 'warning').length,
            info: this.errorHistory.filter(e => e.severity === 'info').length,
        };
    }
    getCategoryCounts() {
        const counts = {
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
    getFileCounts() {
        const counts = {};
        for (const error of this.errorHistory) {
            if (error.file) {
                counts[error.file] = (counts[error.file] || 0) + 1;
            }
        }
        return counts;
    }
}
//# sourceMappingURL=log-parser.js.map