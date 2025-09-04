export function createGetErrorSummary(logParser) {
    return {
        name: 'get_error_summary',
        description: 'Get a comprehensive summary of all detected errors, categorized by type and severity',
        inputSchema: {
            type: 'object',
            properties: {
                limit: {
                    type: 'number',
                    description: 'Maximum number of recent errors to include',
                    default: 10,
                },
            },
            additionalProperties: false,
        },
        handler: async (args) => {
            const limit = args.limit || 10;
            const errorHistory = logParser.getHistory();
            const errorCounts = logParser.getErrorCounts();
            const categoryCounts = logParser.getCategoryCounts();
            const fileCounts = logParser.getFileCounts();
            const recentErrors = logParser.getRecentErrors(limit);
            const summary = {
                total: errorHistory.length,
                byCategory: categoryCounts,
                bySeverity: errorCounts,
                recent: recentErrors,
                files: fileCounts,
            };
            let summaryText = `📋 **Error Summary Report**\n\n`;
            summaryText += `**Total Errors**: ${summary.total}\n\n`;
            // Severity breakdown
            summaryText += `**By Severity**:\n`;
            summaryText += `  • 🔴 Critical: ${summary.bySeverity.critical}\n`;
            summaryText += `  • 🟡 Warning: ${summary.bySeverity.warning}\n`;
            summaryText += `  • 🔵 Info: ${summary.bySeverity.info}\n\n`;
            // Category breakdown
            summaryText += `**By Category**:\n`;
            Object.entries(summary.byCategory)
                .filter(([_, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .forEach(([category, count]) => {
                const emoji = getCategoryEmoji(category);
                summaryText += `  • ${emoji} ${category}: ${count}\n`;
            });
            summaryText += '\n';
            // File breakdown (top 10)
            const fileEntries = Object.entries(summary.files)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10);
            if (fileEntries.length > 0) {
                summaryText += `**Top Files with Errors**:\n`;
                fileEntries.forEach(([file, count]) => {
                    summaryText += `  • ${file}: ${count}\n`;
                });
                summaryText += '\n';
            }
            // Recent errors
            if (summary.recent.length > 0) {
                summaryText += `**Recent Errors** (${summary.recent.length}):\n`;
                summary.recent.forEach((error, index) => {
                    const severityEmoji = getSeverityEmoji(error.severity);
                    const categoryEmoji = getCategoryEmoji(error.category);
                    summaryText += `${index + 1}. ${severityEmoji} ${categoryEmoji} **${error.category}** `;
                    summaryText += `(${error.timestamp.toLocaleTimeString()})\n`;
                    summaryText += `   ${error.message}\n`;
                    if (error.file) {
                        summaryText += `   📄 ${error.file}`;
                        if (error.line) {
                            summaryText += `:${error.line}`;
                            if (error.column) {
                                summaryText += `:${error.column}`;
                            }
                        }
                        summaryText += '\n';
                    }
                    summaryText += '\n';
                });
            }
            return {
                content: [{ type: 'text', text: summaryText }]
            };
        },
    };
}
export function createGetFileErrors(logParser) {
    return {
        name: 'get_file_errors',
        description: 'Get all errors associated with a specific file',
        inputSchema: {
            type: 'object',
            properties: {
                filepath: {
                    type: 'string',
                    description: 'The file path to get errors for',
                },
            },
            required: ['filepath'],
            additionalProperties: false,
        },
        handler: async (args) => {
            const errors = logParser.getErrorsForFile(args.filepath);
            let errorText = `📄 **Errors for File: ${args.filepath}**\n\n`;
            if (errors.length === 0) {
                errorText += `✅ No errors found for this file.\n`;
                return {
                    content: [{ type: 'text', text: errorText }]
                };
            }
            errorText += `**Total Errors**: ${errors.length}\n\n`;
            errors.forEach((error, index) => {
                const severityEmoji = getSeverityEmoji(error.severity);
                const categoryEmoji = getCategoryEmoji(error.category);
                errorText += `${index + 1}. ${severityEmoji} ${categoryEmoji} **${error.severity.toUpperCase()}** - ${error.category}\n`;
                errorText += `   **Message**: ${error.message}\n`;
                if (error.line) {
                    errorText += `   **Location**: Line ${error.line}`;
                    if (error.column) {
                        errorText += `, Column ${error.column}`;
                    }
                    errorText += '\n';
                }
                errorText += `   **Time**: ${error.timestamp.toLocaleString()}\n`;
                errorText += `   **ID**: ${error.id}\n\n`;
            });
            return {
                content: [{ type: 'text', text: errorText }]
            };
        },
    };
}
export function createClearErrorHistory(logParser) {
    return {
        name: 'clear_error_history',
        description: 'Clear all stored error history',
        inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
        },
        handler: async () => {
            logParser.clearHistory();
            return {
                content: [{
                        type: 'text',
                        text: '🧹 **Error history cleared successfully.**\n\nAll stored errors have been removed from memory.'
                    }]
            };
        },
    };
}
function getSeverityEmoji(severity) {
    switch (severity) {
        case 'critical': return '🔴';
        case 'warning': return '🟡';
        case 'info': return '🔵';
        default: return '⚪';
    }
}
function getCategoryEmoji(category) {
    switch (category) {
        case 'typescript': return '🔷';
        case 'svelte': return '🟠';
        case 'vite': return '⚡';
        case 'network': return '🌐';
        case 'build': return '🔨';
        case 'runtime': return '⚙️';
        case 'accessibility': return '♿';
        case 'unknown': return '❓';
        default: return '📝';
    }
}
//# sourceMappingURL=errors.js.map