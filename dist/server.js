#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as YAML from 'yaml';
import { z } from 'zod';
import { ConfigSchema } from './config/schema.js';
import { defaultPatterns } from './config/default-patterns.js';
import { ProcessMonitor } from './process-monitor.js';
import { LogParser } from './log-parser.js';
import { FileWatcher } from './file-watcher.js';
import { createGetErrorSummary, createGetFileErrors, createClearErrorHistory } from './tools/errors.js';
import { SharedStateManager } from './shared-state.js';
class DevServerMCP {
    server;
    processMonitor;
    logParser;
    fileWatcher;
    config;
    sharedState;
    isMonitoringMode = false;
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
        this.sharedState = new SharedStateManager();
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
            // Always show dev server output for better UX
            const prefix = source === 'stderr' ? '🔴' : '🟢';
            console.error(`${prefix} ${line}`);
            const error = this.logParser.parseLog(line);
            if (error) {
                // Emit real-time error notifications
                console.error(`🚨 [${error.severity}] ${error.category}: ${error.message}`);
                // Update shared state when in monitoring mode
                if (this.isMonitoringMode) {
                    this.updateSharedState().catch(console.error);
                }
            }
        });
        this.processMonitor.on('process-start', (process) => {
            console.error(`🚀 Dev server started: ${process.command} (PID: ${process.pid})`);
            this.fileWatcher.startWatching();
            // Update shared state when in monitoring mode
            if (this.isMonitoringMode) {
                this.updateSharedState();
            }
        });
        this.processMonitor.on('process-exit', (code) => {
            console.error(`🛑 Dev server exited with code: ${code}`);
            this.fileWatcher.stopWatching();
        });
        this.processMonitor.on('error', (error) => {
            console.error(`❌ Process monitor error:`, error);
        });
        // File watcher events
        this.fileWatcher.on('file-change', (change) => {
            console.error(`📝 File ${change.type}: ${change.path}`);
        });
        this.fileWatcher.on('error-correlation', (correlation) => {
            console.error(`🔗 Correlation detected: ${correlation.fileChange.path} -> ${correlation.errors.length} errors`);
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
            if (this.isMonitoringMode) {
                // Direct monitoring mode - use local state
                processInfo = this.processMonitor.getProcessInfo();
                uptime = this.processMonitor.getUptime();
                errorCounts = this.logParser.getErrorCounts();
                recentErrors = this.logParser.getRecentErrors(1);
                isRunning = this.processMonitor.isRunning();
                // Update shared state for other instances
                await this.sharedState.writeState({
                    processInfo,
                    isRunning,
                    errors: recentErrors,
                    errorCounts
                });
            }
            else {
                // Client mode - read from shared state
                const sharedData = await this.sharedState.readState();
                processInfo = sharedData.processInfo;
                uptime = processInfo ? Date.now() - new Date(processInfo.startTime).getTime() : null;
                errorCounts = sharedData.errorCounts;
                recentErrors = sharedData.errors.slice(0, 1);
                isRunning = sharedData.isRunning;
            }
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
    async start() {
        await this.loadConfig();
        const transport = new StdioServerTransport();
        console.error('🔍 DevServer MCP starting...');
        console.error(`📊 Loaded ${this.config.patterns.length} error patterns`);
        console.error(`👀 Watching paths: ${this.config.watchPaths.join(', ')}`);
        // Auto-connect to existing monitored dev server if available
        try {
            const existingProcess = await this.processMonitor.findRunningDevServer();
            if (existingProcess) {
                console.error(`👀 Found running dev server: ${existingProcess.command} (PID: ${existingProcess.pid})`);
                // Check if there's a monitoring MCP server already running
                // If so, inherit its state instead of competing
                console.error('🔗 Connecting to existing dev server monitoring...');
            }
            else {
                console.error('ℹ️  No dev server detected. Ready to start monitoring when you begin development.');
            }
        }
        catch (error) {
            console.error('⚠️  Could not check for existing dev servers:', error);
        }
        await this.server.connect(transport);
        console.error('✅ DevServer MCP ready for connections');
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
        // Start lightweight heartbeat to keep state fresh (every 25 seconds)
        if (this.isMonitoringMode) {
            setInterval(() => {
                this.sharedState.updateHeartbeat().catch(console.error);
            }, 25000); // Update every 25 seconds (within 30-second staleness threshold)
        }
    }
    async updateSharedState() {
        if (!this.isMonitoringMode)
            return;
        const processInfo = this.processMonitor.getProcessInfo();
        const errorCounts = this.logParser.getErrorCounts();
        const recentErrors = this.logParser.getRecentErrors(5); // Get more errors for shared state
        const isRunning = this.processMonitor.isRunning();
        await this.sharedState.writeState({
            processInfo,
            isRunning,
            errors: recentErrors,
            errorCounts
        });
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
if (args.length > 0 && (args[0] === '--monitor' || args[0] === '--start-dev')) {
    // Parse command and args
    const command = args[1];
    const devArgs = args.slice(2);
    if (!command) {
        console.error('❌ Usage: node dist/server.js --monitor <command> [args...]');
        console.error('   Example: node dist/server.js --monitor pnpm run dev');
        process.exit(1);
    }
    // Start server and immediately begin monitoring
    server['isMonitoringMode'] = true; // Set monitoring mode flag
    server.start().then(async () => {
        console.error(`🚀 Starting dev server with MCP monitoring: ${command} ${devArgs.join(' ')}`);
        // Small delay to ensure MCP server is fully ready
        setTimeout(async () => {
            try {
                await server.startDevServerMonitoring(command, devArgs, process.cwd());
                console.error('✅ Dev server started with full MCP monitoring active');
                console.error('🔗 MCP server ready for Claude Code connections');
                console.error('📊 Try: "Get dev server status using devserver-mcp" in Claude Code');
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
    // Normal MCP server mode
    server.start().catch((error) => {
        console.error('💥 Failed to start DevServer MCP:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=server.js.map