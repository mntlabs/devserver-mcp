# Development Notes - DevServer MCP

## 🧠 Key Development Patterns & Learnings

### **MCP TypeScript SDK Usage**
- Use `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js` (not the low-level `Server`)
- Tools are registered with `server.registerTool(name, config, handler)`
- Input schemas use Zod objects directly: `{ param: z.string().describe("description") }`
- Handlers return `{ content: [{ type: "text", text: "..." }] }`
- StdioServerTransport for Claude Code integration

### **Configuration Management with Zod**
- When using RegExp patterns in default configs, convert to strings for Zod validation: `pattern.source`
- Zod transforms work well for converting string patterns back to RegExp objects
- `exactOptionalPropertyTypes: true` in TypeScript requires careful optional property handling
- Use factory functions to merge default patterns with user configurations

### **Process Monitoring Architecture**
- Use `child_process.spawn()` with `stdio: ['ignore', 'pipe', 'pipe']` for real-time streaming
- Set encoding to `utf8` and listen to `data` events on stdout/stderr
- Handle process cleanup with `SIGTERM` followed by `SIGKILL` timeout pattern
- Use EventEmitter for decoupled communication between components

### **Error Correlation System**
- File watchers (chokidar) + time-based correlation windows work well for tracking cause/effect
- Confidence scoring based on: file path matching, timing proximity, error severity
- Keep correlation windows configurable (typically 5000ms works well)
- Maintain recent change history with automatic cleanup based on correlation window

### **Real-time Log Processing**
- Split log lines and process individually to avoid partial line issues  
- Use ordered pattern matching with early returns for performance
- Maintain circular buffers with configurable limits for memory management
- Reset regex `lastIndex` to prevent state issues with global regexes

### **TypeScript Project Structure**
- ESM modules with `.js` extensions in imports (even for `.ts` files)
- Separate concerns: types, config schemas, core logic, MCP tools
- Export factory functions for tools to enable dependency injection
- Use proper TypeScript strict mode settings for better type safety

### **Error Pattern Design**
- Use capture groups strategically for extracting file paths, line numbers, messages
- Design patterns for common dev server outputs: TypeScript, Svelte, Vite, network errors
- Include severity classification (critical/warning/info) in pattern definitions
- Make patterns configurable and extensible via JSON/YAML configuration

### **Testing Strategy**
- Vitest for modern TypeScript testing with ESM support
- Mock external dependencies (file system, process spawning) for unit tests
- Test pattern matching with realistic log samples
- Separate unit tests from integration tests

## 🔧 Common Issues & Solutions

### **MCP SDK Version Compatibility**
- Different versions use different APIs - always check documentation
- `registerTool` vs manual request handler setup
- Protocol version mismatches can cause connection issues

### **TypeScript Configuration**
- Remove `resolution-mode: "bundler"` for older TypeScript versions
- Handle optional properties carefully with `exactOptionalPropertyTypes`
- Use `any` type judiciously for complex MCP handler signatures

### **Process Management**
- Handle cases where `process.pid` might be undefined
- Graceful shutdown requires proper cleanup of watchers and processes
- Use timeout patterns for forced termination

## 🚀 Reusable Patterns

This architecture can be adapted for:
- **Webpack monitoring** - Similar log parsing with different patterns
- **Build tool monitoring** - Rollup, Parcel, esbuild integration  
- **Test runner monitoring** - Jest, Vitest, Mocha output parsing
- **Server monitoring** - Express, FastAPI, Rails log analysis
- **General process monitoring** - Any command-line tool with structured output

## 🏗️ Final Architecture - Shared State System

### **Dual-Mode Operation**
The final implementation uses a **shared state architecture** to enable persistent monitoring across Claude Code restarts:

**Monitoring Mode (`--monitor` flag)**:
- Spawns and monitors dev server process directly
- Captures all stdout/stderr in real-time
- Parses errors with configurable regex patterns 
- Writes state to `/tmp/devserver-mcp-state.json` every 10 seconds
- Updates state on error detection and process events

**Client Mode (default)**:
- Launched by Claude Code for each MCP query
- Reads shared state from `/tmp/devserver-mcp-state.json`
- Returns cached process info and error data
- No direct process monitoring

### **Shared State Schema**
```typescript
interface SharedState {
  processInfo: DevServerProcess | null;
  isRunning: boolean;
  errors: ErrorEntry[];
  errorCounts: { critical: number; warning: number; info: number };
  lastUpdate: number; // timestamp
}
```

### **State Staleness Handling**
- State considered stale if `lastUpdate > 30 seconds ago`
- Stale state returns empty/not-running status
- Prevents incorrect data from terminated monitoring sessions

### **Current Limitations**
- **Single Project**: Only one monitoring instance supported (shared state collision)
- **File Path**: Fixed `/tmp/devserver-mcp-state.json` location
- **Race Conditions**: Multiple monitoring instances would conflict

### **Production Workflow**
1. **Terminal**: `node dist/server.js --monitor pnpm run dev` (persistent monitoring)
2. **Claude Code**: Uses standard MCP config (reads shared state)
3. **Result**: Persistent error tracking across Claude Code restarts

## 📝 Project Context

Created: DevServer MCP - A specialized MCP server for monitoring development server output with intelligent error categorization and Claude Code integration.

**Tech Stack**: Node.js 18+, TypeScript, @modelcontextprotocol/sdk, Zod, chokidar, Vitest
**Architecture**: Shared state system with monitoring/client mode separation
**Key Features**: Real-time error detection, persistent state, file change correlation, configurable patterns