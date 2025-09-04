import type { DevServerStatus } from '../types/index.js';
import type { ProcessMonitor } from '../process-monitor.js';
import type { LogParser } from '../log-parser.js';

export function createGetDevServerStatus(
  processMonitor: ProcessMonitor, 
  logParser: LogParser
): any {
  return {
    name: 'get_dev_server_status',
    description: 'Get the current status of the monitored development server',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: async (): Promise<{ content: Array<{ type: 'text'; text: string }> }> => {
      const processInfo = processMonitor.getProcessInfo();
      const uptime = processMonitor.getUptime();
      const errorCounts = logParser.getErrorCounts();
      const recentErrors = logParser.getRecentErrors(1);
      
      const status: DevServerStatus = {
        isRunning: processMonitor.isRunning(),
        errorCount: errorCounts,
      };

      if (processInfo) {
        status.process = processInfo;
      }
      
      if (uptime !== null) {
        status.uptime = uptime;
      }
      
      if (recentErrors[0]) {
        status.lastError = recentErrors[0];
      }

      const formatUptime = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
          return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds % 60}s`;
        } else {
          return `${seconds}s`;
        }
      };

      let statusText = `🔍 **Dev Server Monitor Status**\n\n`;
      
      if (status.isRunning && status.process) {
        statusText += `✅ **Status**: Running (PID: ${status.process.pid})\n`;
        statusText += `📝 **Command**: ${status.process.command}\n`;
        statusText += `📁 **Working Directory**: ${status.process.cwd}\n`;
        statusText += `⏱️ **Uptime**: ${status.uptime ? formatUptime(status.uptime) : 'Unknown'}\n`;
        statusText += `🚀 **Started**: ${status.process.startTime.toLocaleString()}\n\n`;
      } else {
        statusText += `❌ **Status**: Not running\n\n`;
      }

      statusText += `📊 **Error Summary**:\n`;
      statusText += `  • Critical: ${status.errorCount.critical}\n`;
      statusText += `  • Warning: ${status.errorCount.warning}\n`;
      statusText += `  • Info: ${status.errorCount.info}\n`;
      
      const totalErrors = status.errorCount.critical + status.errorCount.warning + status.errorCount.info;
      statusText += `  • **Total**: ${totalErrors}\n\n`;

      if (status.lastError) {
        statusText += `🚨 **Last Error** (${status.lastError.severity}):\n`;
        statusText += `  • **Category**: ${status.lastError.category}\n`;
        statusText += `  • **Message**: ${status.lastError.message}\n`;
        if (status.lastError.file) {
          statusText += `  • **File**: ${status.lastError.file}`;
          if (status.lastError.line) {
            statusText += `:${status.lastError.line}`;
            if (status.lastError.column) {
              statusText += `:${status.lastError.column}`;
            }
          }
          statusText += '\n';
        }
        statusText += `  • **Time**: ${status.lastError.timestamp.toLocaleString()}\n`;
      }

      return {
        content: [{ type: 'text', text: statusText }]
      };
    },
  };
}