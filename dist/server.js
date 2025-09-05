#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createServer } from 'http';
import { URL } from 'url';
import * as YAML from 'yaml';
import { z } from 'zod';
import { ConfigSchema } from './config/schema.js';
import { defaultPatterns } from './config/default-patterns.js';
import { ProcessMonitor } from './process-monitor.js';
import { LogParser } from './log-parser.js';
import { FileWatcher } from './file-watcher.js';
import { createGetErrorSummary, createGetFileErrors, createClearErrorHistory } from './tools/errors.js';
import { createGetErrorHistory, createWatchForErrors } from './tools/history.js';
class DevServerMCP {
    server;
    processMonitor;
    logParser;
    fileWatcher;
    config;
    isMonitoringMode = false;
    httpServer;
    port = 9338; // Default port for devserver-mcp
    activeSSEConnections = new Set();
    errorBuffer = [];
    maxBufferSize = 50; // Keep last 50 errors
    bufferRetentionMs = 5 * 60 * 1000; // Keep errors for 5 minutes
    constructor() {
        this.server = new McpServer({
            name: 'devserver-mcp',
            version: '1.0.0',
        });
        // Initialize with default config - convert RegExp patterns to strings for Zod
        const defaultPatternsForConfig = defaultPatterns.map(p => ({
            ...p,
            pattern: p.pattern.source // Convert RegExp to string
        }));
        this.config = ConfigSchema.parse({
            patterns: defaultPatternsForConfig,
        });
        this.processMonitor = new ProcessMonitor(this.config);
        this.logParser = new LogParser(this.config);
        this.fileWatcher = new FileWatcher(this.config);
        // Note: Test errors removed - now using real dev server monitoring
        this.setupEventHandlers();
        this.registerTools();
    }
    async loadConfig() {
        const configPaths = [
            'devserver-mcp.config.json',
            'devserver-mcp.config.yaml',
            'devserver-mcp.config.yml',
            '.devserver-mcp.json',
        ];
        for (const configPath of configPaths) {
            if (existsSync(configPath)) {
                try {
                    const content = await readFile(configPath, 'utf-8');
                    const rawConfig = configPath.endsWith('.json')
                        ? JSON.parse(content)
                        : YAML.parse(content);
                    // Merge with default patterns (convert RegExp to strings first)
                    const defaultPatternsForConfig = defaultPatterns.map(p => ({
                        ...p,
                        pattern: p.pattern.source
                    }));
                    rawConfig.patterns = [...defaultPatternsForConfig, ...(rawConfig.patterns || [])];
                    this.config = ConfigSchema.parse(rawConfig);
                    // Update components with new config
                    this.processMonitor.updateConfig(this.config);
                    this.logParser.updateConfig(this.config);
                    this.fileWatcher.updateConfig(this.config);
                    console.error(`✅ Loaded configuration from ${configPath}`);
                    return;
                }
                catch (error) {
                    console.error(`❌ Error loading config from ${configPath}:`, error);
                }
            }
        }
        console.error(`ℹ️  Using default configuration (no config file found)`);
    }
    setupEventHandlers() {
        // Process monitor events
        this.processMonitor.on('log', (line, source) => {
            // Always show original dev server output unchanged with colors preserved
            if (source === 'stderr') {
                process.stderr.write(line + '\n');
            }
            else {
                process.stdout.write(line + '\n');
            }
            const error = this.logParser.parseLog(line);
            if (error) {
                // Broadcast error to all SSE connections (silently)
                this.broadcastErrorToSSEClients(error);
            }
        });
        this.processMonitor.on('process-start', (process) => {
            this.fileWatcher.startWatching();
            // Broadcast process start to SSE clients (silently)
            this.broadcastProcessEventToSSEClients('started', process);
        });
        this.processMonitor.on('process-exit', (code) => {
            this.fileWatcher.stopWatching();
            // Broadcast process exit to SSE clients (silently)
            this.broadcastProcessEventToSSEClients('exited', { exitCode: code });
        });
        this.processMonitor.on('error', (error) => {
            console.error(`❌ Process monitor error:`, error);
        });
        // File watcher events (silent - only used internally)
        this.fileWatcher.on('file-change', (change) => {
            // File changes tracked silently for correlation
        });
        this.fileWatcher.on('error-correlation', (correlation) => {
            // Error correlations tracked silently
        });
    }
    registerTools() {
        // Register get_dev_server_status tool
        this.server.registerTool('get_dev_server_status', {
            title: 'Get Dev Server Status',
            description: 'Get the current status of the monitored development server',
            inputSchema: {},
        }, async () => {
            let processInfo, uptime, errorCounts, recentErrors, isRunning;
            // Always use direct monitoring state
            processInfo = this.processMonitor.getProcessInfo();
            uptime = this.processMonitor.getUptime();
            errorCounts = this.logParser.getErrorCounts();
            recentErrors = this.logParser.getRecentErrors(1);
            isRunning = this.processMonitor.isRunning();
            const status = {
                isRunning: isRunning,
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
            const formatUptime = (ms) => {
                const seconds = Math.floor(ms / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                if (hours > 0) {
                    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
                }
                else if (minutes > 0) {
                    return `${minutes}m ${seconds % 60}s`;
                }
                else {
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
            }
            else {
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
        });
        // Register other tools with simplified approach for now
        this.server.registerTool('get_error_summary', {
            title: 'Get Error Summary',
            description: 'Get a comprehensive summary of all detected errors',
            inputSchema: {
                limit: z.number().optional().describe('Max recent errors to include'),
            },
        }, async (args) => createGetErrorSummary(this.logParser).handler(args));
        this.server.registerTool('get_file_errors', {
            title: 'Get File Errors',
            description: 'Get errors for a specific file',
            inputSchema: {
                filepath: z.string().describe('File path to get errors for'),
            },
        }, async (args) => createGetFileErrors(this.logParser).handler(args));
        this.server.registerTool('clear_error_history', {
            title: 'Clear Error History',
            description: 'Clear all stored error history',
            inputSchema: {},
        }, async () => createClearErrorHistory(this.logParser).handler());
        this.server.registerTool('get_error_history', {
            title: 'Get Error History',
            description: 'Get chronological error history with optional filtering',
            inputSchema: {
                severity: z.string().optional().describe('Filter by error severity: critical, warning, info'),
                category: z.string().optional().describe('Filter by error category'),
                limit: z.number().optional().describe('Maximum number of errors to return'),
                since: z.string().optional().describe('ISO date string - only show errors since this time'),
            },
        }, async (args) => createGetErrorHistory(this.logParser).handler(args));
        this.server.registerTool('watch_for_errors', {
            title: 'Watch for Errors',
            description: 'Get real-time error monitoring information and recent correlations',
            inputSchema: {
                includeCorrelations: z.boolean().optional().describe('Include file change correlations'),
                recentMinutes: z.number().optional().describe('Minutes of recent activity to include'),
            },
        }, async (args) => createWatchForErrors(this.logParser, this.fileWatcher).handler(args));
        this.server.registerTool('suggest_monitoring_setup', {
            title: 'Suggest Monitoring Setup',
            description: 'Analyze current project and suggest optimal MCP monitoring configuration',
            inputSchema: {},
        }, async () => {
            try {
                let suggestions = `🔍 **DevServer MCP Setup Analysis**\n\n`;
                // Check for existing dev server process
                const existingProcess = await this.processMonitor.findRunningDevServer();
                if (existingProcess) {
                    suggestions += `📍 **Found Running Dev Server**:\n`;
                    suggestions += `• Process: ${existingProcess.command} (PID: ${existingProcess.pid})\n`;
                    suggestions += `• Status: Can detect but cannot monitor logs\n\n`;
                    suggestions += `💡 **Recommendation**: Start with persistent monitoring\n`;
                    suggestions += `• Stop current dev server (Ctrl+C)\n`;
                    suggestions += `• Use terminal: \`node dist/server.js --monitor ${existingProcess.command}\`\n`;
                    suggestions += `• This enables persistent monitoring that survives Claude Code restarts\n\n`;
                }
                // Analyze package.json for dev scripts
                try {
                    const packageJsonPath = join(process.cwd(), 'package.json');
                    if (existsSync(packageJsonPath)) {
                        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
                        const scripts = packageJson.scripts || {};
                        suggestions += `📋 **Detected Scripts**:\n`;
                        const devScripts = Object.entries(scripts)
                            .filter(([name]) => name.includes('dev') || name.includes('start'))
                            .slice(0, 5);
                        if (devScripts.length > 0) {
                            devScripts.forEach(([name, command]) => {
                                const packageManager = existsSync('pnpm-lock.yaml') ? 'pnpm' :
                                    existsSync('yarn.lock') ? 'yarn' : 'npm';
                                suggestions += `• \`${packageManager} run ${name}\` → "${command}"\n`;
                            });
                            suggestions += `\n🚀 **Quick Start Command**:\n`;
                            const mainDevScript = devScripts.find(([name]) => name === 'dev') || devScripts[0];
                            const packageManager = existsSync('pnpm-lock.yaml') ? 'pnpm' :
                                existsSync('yarn.lock') ? 'yarn' : 'npm';
                            if (mainDevScript) {
                                suggestions += `Ask Claude: "Start dev server using devserver-mcp with ${packageManager} run ${mainDevScript[0]}"\n\n`;
                            }
                        }
                        else {
                            suggestions += `• No dev scripts found\n\n`;
                        }
                    }
                }
                catch (error) {
                    suggestions += `⚠️ Could not analyze package.json\n\n`;
                }
                // Check for common config files
                const configFiles = [
                    'vite.config.js', 'vite.config.ts', 'vite.config.mjs',
                    'svelte.config.js', 'svelte.config.ts',
                    'package.json'
                ];
                const foundConfigs = configFiles.filter(file => existsSync(join(process.cwd(), file)));
                if (foundConfigs.length > 0) {
                    suggestions += `⚙️ **Detected Configuration**:\n`;
                    foundConfigs.forEach(config => {
                        suggestions += `• ${config}\n`;
                    });
                    suggestions += `\n`;
                }
                // Current MCP status
                const isMonitoring = this.processMonitor.isRunning();
                const errorCount = this.logParser.getErrorCounts();
                const totalErrors = errorCount.critical + errorCount.warning + errorCount.info;
                suggestions += `📊 **Current MCP Status**:\n`;
                suggestions += `• Monitoring: ${isMonitoring ? '✅ Active' : '❌ Not active'}\n`;
                suggestions += `• Errors tracked: ${totalErrors}\n`;
                suggestions += `• File watching: ${isMonitoring ? '✅ Enabled' : '❌ Disabled'}\n\n`;
                if (!isMonitoring) {
                    suggestions += `🎯 **Next Steps**:\n`;
                    suggestions += `1. Use terminal monitoring: \`node dist/server.js --monitor <your-dev-command>\`\n`;
                    suggestions += `2. This provides persistent monitoring that survives Claude Code restarts\n`;
                    suggestions += `3. All errors will be automatically categorized and tracked\n`;
                }
                else {
                    suggestions += `🎉 **You're all set!** MCP monitoring is active.\n`;
                    suggestions += `Ask me about any errors that occur during development.\n`;
                }
                return {
                    content: [{ type: 'text', text: suggestions }]
                };
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: `❌ **Analysis Failed**\n\n${error instanceof Error ? error.message : String(error)}`
                        }],
                    isError: true
                };
            }
        });
    }
    async startHTTP() {
        await this.loadConfig();
        console.error('🔍 DevServer MCP starting in HTTP/SSE mode...');
        console.error(`📊 Loaded ${this.config.patterns.length} error patterns`);
        console.error(`👀 Watching paths: ${this.config.watchPaths.join(', ')}`);
        // Create HTTP server for SSE transport
        this.httpServer = createServer(async (req, res) => {
            const url = new URL(req.url || '/', `http://${req.headers.host}`);
            // Handle CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            if (url.pathname === '/sse' && req.method === 'GET') {
                // Handle SSE connection
                const transport = new SSEServerTransport('/messages', res);
                this.activeSSEConnections.add(transport);
                transport.onclose = () => {
                    this.activeSSEConnections.delete(transport);
                };
                transport.onerror = (error) => {
                    this.activeSSEConnections.delete(transport);
                };
                await this.server.connect(transport);
                // Send buffered errors to the newly connected client (silently)
                setTimeout(() => {
                    this.sendBufferedErrors(transport);
                }, 100); // Small delay to ensure connection is ready
            }
            else if (url.pathname === '/messages' && req.method === 'POST') {
                // Handle POST messages for existing SSE connections
                const sessionId = url.searchParams.get('sessionId');
                const transport = Array.from(this.activeSSEConnections).find(t => t.sessionId === sessionId);
                if (transport) {
                    await transport.handlePostMessage(req, res);
                }
                else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Session not found');
                }
            }
            else {
                // Handle other routes
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not found');
            }
        });
        // Use specified port with error handling
        this.httpServer.listen(this.port, '127.0.0.1', () => {
            console.error(`🚀 HTTP server listening on http://127.0.0.1:${this.port}`);
            console.error('');
            console.error('🔗 To connect Claude Code, run:');
            console.error(`claude mcp add --transport sse devserver-mcp http://127.0.0.1:${this.port}/sse`);
            console.error('');
        });
        this.httpServer.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${this.port} is already in use!`);
                console.error('💡 Try a different port with: --port <number>');
                console.error(`   Example: node dist/server.js --port 9339 --monitor pnpm run dev`);
                process.exit(1);
            }
            else {
                console.error('❌ HTTP server error:', error);
                process.exit(1);
            }
        });
        // Setup graceful shutdown for HTTP server
        process.on('SIGINT', () => this.stopHTTP());
        process.on('SIGTERM', () => this.stopHTTP());
    }
    async stopHTTP() {
        if (this.httpServer) {
            // Close all SSE connections
            for (const transport of this.activeSSEConnections) {
                await transport.close();
            }
            this.activeSSEConnections.clear();
            // Close HTTP server
            this.httpServer.close();
            this.httpServer = undefined;
            console.error('🔌 HTTP server stopped');
        }
        await this.stop();
    }
    async stop() {
        this.processMonitor.stopMonitoring();
        this.fileWatcher.stopWatching();
        console.error('👋 DevServer MCP stopped');
    }
    // Public methods for command line access
    async startDevServerMonitoring(command, args, cwd) {
        await this.processMonitor.startMonitoring(command, args, cwd);
        this.fileWatcher.startWatching();
    }
    broadcastErrorToSSEClients(error) {
        // Create MCP notification message for real-time error streaming
        const notification = {
            jsonrpc: '2.0',
            method: 'notifications/devserver/error_detected',
            params: {
                error: {
                    severity: error.severity,
                    category: error.category,
                    message: error.message,
                    file: error.file,
                    line: error.line,
                    column: error.column,
                    timestamp: error.timestamp.toISOString(),
                    rawLog: error.rawLog
                },
                context: {
                    processInfo: this.processMonitor.getProcessInfo(),
                    isRunning: this.processMonitor.isRunning(),
                    errorCounts: this.logParser.getErrorCounts()
                }
            }
        };
        // Add to error buffer for disconnected clients
        this.addToErrorBuffer(notification);
        // If no clients connected, just buffer the error (silently)
        if (this.activeSSEConnections.size === 0) {
            return;
        }
        // Broadcast to all connected SSE clients
        for (const transport of this.activeSSEConnections) {
            try {
                transport.send(notification);
            }
            catch (error) {
                // Remove failed connection (silently)
                this.activeSSEConnections.delete(transport);
            }
        }
    }
    broadcastProcessEventToSSEClients(event, data) {
        if (this.activeSSEConnections.size === 0) {
            return; // No SSE clients connected
        }
        // Create MCP notification message for process state changes
        const notification = {
            jsonrpc: '2.0',
            method: 'notifications/devserver/process_event',
            params: {
                event,
                data,
                timestamp: new Date().toISOString(),
                context: {
                    isRunning: this.processMonitor.isRunning(),
                    errorCounts: this.logParser.getErrorCounts()
                }
            }
        };
        // Broadcast to all connected SSE clients
        for (const transport of this.activeSSEConnections) {
            try {
                transport.send(notification);
            }
            catch (error) {
                console.error('❌ Failed to send process event notification to SSE client:', error);
                // Remove failed connection
                this.activeSSEConnections.delete(transport);
            }
        }
        // Process events broadcasted silently
    }
    addToErrorBuffer(notification) {
        const timestamp = Date.now();
        // Add new error to buffer
        this.errorBuffer.push({ notification, timestamp });
        // Clean up old errors beyond retention time
        const cutoff = timestamp - this.bufferRetentionMs;
        this.errorBuffer = this.errorBuffer.filter(item => item.timestamp > cutoff);
        // Limit buffer size
        if (this.errorBuffer.length > this.maxBufferSize) {
            this.errorBuffer = this.errorBuffer.slice(-this.maxBufferSize);
        }
    }
    sendBufferedErrors(transport) {
        // Send buffered errors to newly connected client
        for (const { notification } of this.errorBuffer) {
            try {
                transport.send(notification);
            }
            catch (error) {
                console.error('❌ Failed to send buffered error to SSE client:', error);
                break;
            }
        }
        // Buffered errors sent silently
    }
}
// Handle graceful shutdown
const server = new DevServerMCP();
process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
});
// Handle command line arguments for dev server monitoring
const args = process.argv.slice(2);
// Parse port argument if provided
let portIndex = args.indexOf('--port');
if (portIndex !== -1 && portIndex + 1 < args.length) {
    const portArg = args[portIndex + 1];
    if (!portArg) {
        console.error('❌ --port requires a port number');
        process.exit(1);
    }
    const portValue = parseInt(portArg);
    if (isNaN(portValue) || portValue < 1 || portValue > 65535) {
        console.error('❌ Invalid port number. Must be between 1 and 65535.');
        process.exit(1);
    }
    server['port'] = portValue;
    // Remove port arguments from args array
    args.splice(portIndex, 2);
}
if (args.length > 0 && (args[0] === '--monitor' || args[0] === '--start-dev')) {
    // Parse command and args
    const command = args[1];
    const devArgs = args.slice(2);
    if (!command) {
        console.error('❌ Usage: node dist/server.js [--port <number>] --monitor <command> [args...]');
        console.error('   Example: node dist/server.js --port 9338 --monitor pnpm run dev');
        console.error('   Example: node dist/server.js --monitor pnpm run dev  # Uses default port 9338');
        process.exit(1);
    }
    // Start server and immediately begin monitoring
    server['isMonitoringMode'] = true; // Set monitoring mode flag
    server.startHTTP().then(async () => {
        console.error(`🚀 Starting dev server with MCP monitoring: ${command} ${devArgs.join(' ')}`);
        // Small delay to ensure MCP server is fully ready
        setTimeout(async () => {
            try {
                await server.startDevServerMonitoring(command, devArgs, process.cwd());
                console.error('✅ Dev server started with full MCP monitoring active');
                console.error('🔗 MCP server ready for SSE connections');
                console.error('📊 Use the connection command above to link with Claude Code');
            }
            catch (error) {
                console.error('❌ Failed to start dev server monitoring:', error);
                process.exit(1);
            }
        }, 1000);
    }).catch((error) => {
        console.error('💥 Failed to start DevServer MCP:', error);
        process.exit(1);
    });
}
else {
    // Default SSE server mode without monitoring
    server.startHTTP().catch((error) => {
        console.error('💥 Failed to start DevServer MCP in SSE mode:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=server.js.map