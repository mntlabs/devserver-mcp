# DevServer MCP - Technical Documentation

## 🏗️ Architecture Overview

### **Dual-Mode Operation**
The implementation uses a **shared state architecture** to enable persistent monitoring across Claude Code restarts:

**Monitoring Mode (`--monitor` flag)**:
- Spawns and monitors dev server process directly
- Captures all stdout/stderr in real-time  
- Parses errors with 21+ production-ready regex patterns
- Writes state to `/tmp/devserver-mcp-state.json` every 10 seconds
- Updates state on error detection and process events

**Client Mode (default)**:
- Launched by Claude Code for each MCP query
- Reads shared state from `/tmp/devserver-mcp-state.json`
- Returns cached process info and error data
- No direct process monitoring

### **Production Workflow**
```bash
# Terminal (persistent monitoring)
node dist/server.js --monitor pnpm run dev

# Claude Code (queries shared state)
claude mcp add devserver-mcp --scope local -- node /path/to/dist/server.js
```

## 🧠 Key Implementation Patterns

### **MCP Protocol Integration**
- Use `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js` (v1.17.5)
- Tools registered with `server.registerTool(name, config, handler)`
- Input schemas use Zod validation: `z.string().describe("description")`
- Handlers return `{ content: [{ type: "text", text: "..." }] }`
- StdioServerTransport for Claude Code integration

### **Shared State Management**
```typescript
interface SharedState {
  processInfo: DevServerProcess | null;
  isRunning: boolean;
  errors: ErrorEntry[];
  errorCounts: { critical: number; warning: number; info: number };
  lastUpdate: number;
}
```

**Staleness Handling**: State considered stale if `lastUpdate > 30 seconds ago`

### **Process Monitoring**
- Use `child_process.spawn()` with `stdio: ['ignore', 'pipe', 'pipe']`
- Set encoding to `utf8` and listen to `data` events
- Graceful cleanup with `SIGTERM` → `SIGKILL` timeout (5s)
- EventEmitter for decoupled component communication

### **Error Correlation System**
- File watchers (chokidar) + time-based correlation windows (5000ms default)
- Confidence scoring based on: file path matching, timing proximity, error severity
- Automatic cleanup of recent changes based on correlation window

### **Real-time Log Processing**
- Line-by-line processing to avoid partial line issues
- Ordered pattern matching with early returns for performance
- Circular buffers with configurable limits (1000 default)
- Reset regex `lastIndex` to prevent state issues with global regexes

## 🔧 Development Guidelines

### **TypeScript Configuration**
- ESM modules with `.js` extensions in imports (required for Node.js ESM)
- Strict mode enabled: `exactOptionalPropertyTypes: true`
- Factory functions for dependency injection in tools
- Comprehensive type definitions in `src/types/index.ts`

### **Error Pattern Design**
- Use strategic capture groups for file paths, line numbers, messages
- Real production patterns for Vite/Svelte/TypeScript (not demo patterns)
- Severity classification: `critical` | `warning` | `info`
- Category classification: `typescript` | `svelte` | `vite` | `network` | `build` | `runtime` | `accessibility` | `unknown`

### **Configuration Management**
- Convert RegExp patterns to strings for Zod validation: `pattern.source`
- Zod transforms convert strings back to RegExp objects
- Support both JSON and YAML configuration files
- Merge default patterns with user configurations

### **Testing Strategy**
- Vitest for modern TypeScript testing with ESM support
- Comprehensive LogParser test coverage with realistic patterns
- Mock external dependencies for unit tests
- **TODO**: Add tests for ProcessMonitor, FileWatcher, SharedStateManager

## 🚨 Known Limitations & Solutions

### **Single Project Limitation**
**Issue**: Only one monitoring instance supported due to fixed `/tmp/devserver-mcp-state.json` location

**Solution**:
```typescript
// Use project-specific state files
const hashCode = (str: string) => str.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
const STATE_FILE = `/tmp/devserver-mcp-state-${Math.abs(hashCode(process.cwd()))}.json`;
```

### **Process Management Edge Cases**
- Handle `process.pid` potentially being undefined
- Implement proper cleanup of watchers on process termination
- Use timeout patterns for forced process termination

## 🚀 Extension Patterns

This architecture can be adapted for:

### **Other Build Tools**
- **Webpack**: Similar log parsing with webpack-specific patterns
- **Rollup/Parcel**: Build tool error detection and correlation
- **esbuild**: Fast build monitoring with different output formats

### **Development Servers**  
- **Next.js**: Framework-specific error patterns and routing issues
- **Nuxt**: Vue ecosystem monitoring with SSR considerations
- **Express/FastAPI**: Backend server monitoring and API error tracking

### **Testing Integration**
- **Jest/Vitest**: Test runner output parsing and failure correlation
- **Playwright/Cypress**: E2E test monitoring and screenshot correlation
- **Coverage tracking**: Test coverage regression detection

## 📊 Performance Characteristics

### **Memory Management**
- Configurable history limits prevent unbounded growth
- Automatic cleanup based on time windows
- Efficient circular buffer implementation

### **CPU Usage**
- Pattern matching optimized with early returns
- 21 regex patterns checked per log line (acceptable for dev use)
- Regex state management prevents memory leaks

### **I/O Performance** 
- 10-second shared state update intervals
- Minimal disk usage with JSON serialization
- File watching with intelligent path filtering

## 🔄 Future Enhancements

### **High Priority**
- [ ] Multi-project support with project-specific state files
- [ ] Additional unit tests for core architecture components
- [ ] MCP integration tests for end-to-end validation

### **Medium Priority**
- [ ] Git blame integration for better error attribution  
- [ ] Pattern performance optimization with frequency-based ordering
- [ ] Enhanced configuration validation for user patterns

### **Low Priority**
- [ ] Docker container monitoring support
- [ ] Database error parsing patterns
- [ ] Historical error trend analysis and regression detection