import type { LogParser } from '../log-parser.js';
import type { FileWatcher } from '../file-watcher.js';

export function createGetErrorHistory(logParser: LogParser): any {
  return {
    name: 'get_error_history',
    description: 'Get chronological error history with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          enum: ['critical', 'warning', 'info'],
          description: 'Filter by error severity',
        },
        category: {
          type: 'string',
          enum: ['typescript', 'svelte', 'vite', 'network', 'build', 'runtime', 'accessibility', 'unknown'],
          description: 'Filter by error category',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of errors to return',
          default: 50,
        },
        since: {
          type: 'string',
          description: 'ISO date string - only show errors since this time',
        },
      },
      additionalProperties: false,
    },
    handler: async (args: {
      severity?: 'critical' | 'warning' | 'info';
      category?: 'typescript' | 'svelte' | 'vite' | 'network' | 'build' | 'runtime' | 'accessibility' | 'unknown';
      limit?: number;
      since?: string;
    }): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
      let errors = logParser.getHistory();
      const limit = args.limit || 50;

      // Apply filters
      if (args.severity) {
        errors = errors.filter(error => error.severity === args.severity);
      }

      if (args.category) {
        errors = errors.filter(error => error.category === args.category);
      }

      if (args.since) {
        const sinceDate = new Date(args.since);
        errors = errors.filter(error => error.timestamp >= sinceDate);
      }

      // Limit results
      errors = errors.slice(0, limit);

      let historyText = `📚 **Error History**\n\n`;
      
      const filters = [];
      if (args.severity) filters.push(`Severity: ${args.severity}`);
      if (args.category) filters.push(`Category: ${args.category}`);
      if (args.since) filters.push(`Since: ${new Date(args.since).toLocaleString()}`);
      
      if (filters.length > 0) {
        historyText += `**Filters**: ${filters.join(', ')}\n`;
      }
      
      historyText += `**Results**: ${errors.length} errors\n\n`;

      if (errors.length === 0) {
        historyText += `✅ No errors found matching the specified criteria.\n`;
        return {
          content: [{ type: 'text', text: historyText }]
        };
      }

      errors.forEach((error, index) => {
        const severityEmoji = getSeverityEmoji(error.severity);
        const categoryEmoji = getCategoryEmoji(error.category);
        
        historyText += `${index + 1}. ${severityEmoji} ${categoryEmoji} **${error.severity.toUpperCase()}** - ${error.category}\n`;
        historyText += `   **Time**: ${error.timestamp.toLocaleString()}\n`;
        historyText += `   **Message**: ${error.message}\n`;
        
        if (error.file) {
          historyText += `   **File**: ${error.file}`;
          if (error.line) {
            historyText += `:${error.line}`;
            if (error.column) {
              historyText += `:${error.column}`;
            }
          }
          historyText += '\n';
        }
        
        historyText += `   **ID**: ${error.id}\n\n`;
      });

      return {
        content: [{ type: 'text', text: historyText }]
      };
    },
  };
}

export function createWatchForErrors(logParser: LogParser, fileWatcher: FileWatcher): any {
  return {
    name: 'watch_for_errors',
    description: 'Get real-time error monitoring information and recent correlations',
    inputSchema: {
      type: 'object',
      properties: {
        includeCorrelations: {
          type: 'boolean',
          description: 'Include file change correlations in the output',
          default: true,
        },
        recentMinutes: {
          type: 'number',
          description: 'Minutes of recent activity to include',
          default: 5,
        },
      },
      additionalProperties: false,
    },
    handler: async (args: {
      includeCorrelations?: boolean;
      recentMinutes?: number;
    }): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
      const includeCorrelations = args.includeCorrelations !== false;
      const recentMinutes = args.recentMinutes || 5;
      const cutoffTime = new Date(Date.now() - recentMinutes * 60 * 1000);

      const recentErrors = logParser.getHistory().filter(
        error => error.timestamp >= cutoffTime
      );

      const recentChanges = fileWatcher.getRecentChanges().filter(
        change => change.timestamp >= cutoffTime
      );

      let watchText = `👀 **Real-time Error Monitoring**\n\n`;
      watchText += `**Monitoring Period**: Last ${recentMinutes} minutes\n`;
      watchText += `**Recent Activity**: ${recentErrors.length} errors, ${recentChanges.length} file changes\n\n`;

      if (recentErrors.length > 0) {
        watchText += `**Recent Errors**:\n`;
        recentErrors.slice(0, 10).forEach((error, index) => {
          const severityEmoji = getSeverityEmoji(error.severity);
          const categoryEmoji = getCategoryEmoji(error.category);
          
          watchText += `${index + 1}. ${severityEmoji} ${categoryEmoji} ${error.category} `;
          watchText += `(${error.timestamp.toLocaleTimeString()})\n`;
          watchText += `   ${error.message}\n`;
          
          if (error.file) {
            watchText += `   📄 ${error.file}\n`;
          }
        });
        watchText += '\n';
      }

      if (recentChanges.length > 0) {
        watchText += `**Recent File Changes**:\n`;
        recentChanges.slice(0, 10).forEach((change, index) => {
          const typeEmoji = getChangeTypeEmoji(change.type);
          watchText += `${index + 1}. ${typeEmoji} ${change.type} `;
          watchText += `(${change.timestamp.toLocaleTimeString()})\n`;
          watchText += `   📄 ${change.path}\n`;
        });
        watchText += '\n';
      }

      if (includeCorrelations && recentErrors.length > 0) {
        const correlations = fileWatcher.correlateErrors(recentErrors);
        
        if (correlations.length > 0) {
          watchText += `**File Change Correlations**:\n`;
          correlations.slice(0, 5).forEach((correlation, index) => {
            watchText += `${index + 1}. **${correlation.fileChange.path}** `;
            watchText += `(confidence: ${Math.round(correlation.confidence * 100)}%)\n`;
            watchText += `   🔄 ${correlation.fileChange.type} at ${correlation.fileChange.timestamp.toLocaleTimeString()}\n`;
            watchText += `   ⚠️  ${correlation.errors.length} related errors\n`;
            
            correlation.errors.slice(0, 3).forEach((error) => {
              const severityEmoji = getSeverityEmoji(error.severity);
              watchText += `     ${severityEmoji} ${error.message.slice(0, 80)}...\n`;
            });
            watchText += '\n';
          });
        } else {
          watchText += `✅ No strong correlations found between recent file changes and errors.\n\n`;
        }
      }

      if (recentErrors.length === 0 && recentChanges.length === 0) {
        watchText += `✅ **All quiet** - No recent errors or file changes detected.\n`;
      }

      return {
        content: [{ type: 'text', text: watchText }]
      };
    },
  };
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'warning': return '🟡';
    case 'info': return '🔵';
    default: return '⚪';
  }
}

function getCategoryEmoji(category: string): string {
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

function getChangeTypeEmoji(type: string): string {
  switch (type) {
    case 'added': return '➕';
    case 'modified': return '✏️';
    case 'removed': return '❌';
    default: return '📝';
  }
}