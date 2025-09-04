# DevServer MCP

A specialized MCP (Model Context Protocol) server that runs **persistently in your terminal** to monitor development server output in real-time, intelligently categorizes errors/warnings, and provides seamless **Claude Code integration** for AI-powered error analysis - all while **surviving Claude Code restarts**.

## Why Use DevServer MCP?

### 🚨 **Never Miss Critical Errors Again**
Dev servers often output hundreds of lines of logs, warnings, and status messages. Critical TypeScript errors, build failures, and runtime issues can easily get buried in the noise. DevServer MCP intelligently filters and categorizes errors by severity, ensuring you never miss the issues that actually break your application.

### 🧠 **AI-Powered Development Assistant**
Instead of manually parsing cryptic error messages, let Claude Code automatically:
- **Analyze error patterns** and suggest fixes
- **Correlate file changes** with new errors to identify root causes  
- **Provide context-aware solutions** based on your specific tech stack
- **Track error trends** to identify recurring issues in your codebase

### ⚡ **Faster Debugging Workflow**
Traditional debugging workflow:
1. Notice something's broken
2. Scroll through terminal output
3. Find the relevant error
4. Google the error message
5. Try to understand the context

With DevServer MCP + Claude Code:
1. Ask "What errors occurred in the last 5 minutes?"
2. Get structured, categorized error analysis
3. Ask "How do I fix this TypeScript error in LoginForm.svelte?"
4. Get specific, contextual solutions immediately

### 📊 **Historical Error Intelligence**
- **Track error patterns** over time to identify problematic files or components
- **Correlate file changes** with error introduction to speed up debugging
- **Maintain error history** across development sessions
- **Identify recurring issues** that need architectural attention

### 🔗 **Persistent & Independent**
- **Survives Claude Code restarts** - dev server runs independently in your terminal
- **Maintains error history** across multiple Claude Code sessions  
- **No configuration needed** - automatically detects running dev servers
- **Works with any tech stack** - Vite, SvelteKit, Next.js, custom setups
- **Non-intrusive** - runs alongside your existing development workflow

### 🎯 **Built for Modern Development**
Perfect for teams using:
- **TypeScript** + **Svelte/SvelteKit** projects
- **Vite** + **Hot Module Replacement** workflows  
- **Monorepos** with multiple dev servers
- **Complex build pipelines** with multiple error sources
- **Remote development** where terminal access is limited

### 💡 **Real-World Use Cases**

**Scenario 1: The Mysterious Build Failure**
```
You: "My build suddenly started failing, what happened?"
Claude + DevServer MCP: "I see a TypeScript error in src/types.ts:42 
introduced 3 minutes ago when UserProfile.svelte was modified. 
The interface UserData is missing the 'email' property."
```

**Scenario 2: Accessibility Audit**
```
You: "Show me all accessibility warnings from the last hour"
Claude + DevServer MCP: "Found 12 A11y warnings across 4 components. 
The LoginForm component has missing alt text on 3 images, 
and the Navigation component needs proper ARIA labels."
```

**Scenario 3: Performance Regression**
```
You: "I'm getting network errors on the user page"
Claude + DevServer MCP: "Detected 8 failed API calls to /api/user 
returning 404. This started after changes to userService.ts 
15 minutes ago. The endpoint path changed from '/user' to '/users'."
```

## Features

🔍 **Real-time Monitoring**: Attaches to running dev server processes and streams logs in real-time  
🧠 **Intelligent Categorization**: Classifies errors by type (TypeScript, Svelte, Vite, Network, etc.) and severity  
📊 **Historical Tracking**: Maintains error history with timestamps and correlation data  
🔗 **File Correlation**: Tracks which file changes triggered specific errors  
⚡ **MCP Integration**: Provides structured tools for Claude Code to query and analyze errors  
📝 **Configurable Patterns**: Customizable regex patterns for different error types  

## Installation

```bash
# Clone or create the project
npm install
npm run build

# Or install dependencies with pnpm (recommended)
pnpm install
pnpm run build
```

## Usage

### As a Claude Code MCP Server

1. **Build the project:**
   ```bash
   pnpm install
   pnpm run build
   ```

2. **Add to Claude Code** (choose one method):

   **Project-specific (recommended):**
   ```bash
   claude mcp add devserver-mcp --scope local -- node /absolute/path/to/your-project/dist/server.js
   ```

   **User-wide (available in all projects):**
   ```bash
   claude mcp add devserver-mcp --scope user -- node /absolute/path/to/your-project/dist/server.js
   ```

3. **Verify installation:**
   ```bash
   claude mcp list
   claude mcp test devserver-mcp
   ```

### 🎯 **"Magic" Setup (Recommended Workflow)**

The key to getting persistent error monitoring is using the **terminal-based monitoring** that runs independently of Claude Code:

#### **Traditional Approach:**
```bash
# Limited - no AI error analysis
pnpm run dev
```

#### **DevServer MCP Magic:**
```bash
# In your terminal - runs persistently 
node /path/to/devserver-mcp/dist/server.js --monitor pnpm run dev
```

#### **What this gives you:**
- ✅ **Persistent monitoring** - dev server runs independently of Claude Code
- ✅ **Real-time error detection** - captures all stdout/stderr
- ✅ **Survives Claude Code restarts** - error history maintained  
- ✅ **File change correlation** - tracks which changes caused errors
- ✅ **AI-powered analysis** - Claude Code queries the error data anytime

#### **Core Benefit:**
Your dev server runs continuously. Claude Code connects only when you need error analysis, then disconnects. **Perfect separation of concerns.**

### **Available MCP Tools**

**Core Query Tools (Recommended):**
- **`get_dev_server_status`** - **⭐ Primary tool** - Current server health and active errors  
- **`get_error_summary`** - Categorized error breakdown with file locations
- **`get_error_history`** - Time-based error tracking with filtering
- **`get_file_errors`** - Errors specific to a file

**Setup & Management:**
- **`suggest_monitoring_setup`** - Analyze your project and recommend optimal setup
- **`clear_error_history`** - Reset tracking state

### **Smart Usage Examples**

**Step 1: Terminal Setup (Once)**
```bash
# In your project directory
node /path/to/devserver-mcp/dist/server.js --monitor pnpm run dev
# Runs persistently, survives Claude Code restarts
```

**Step 2: Claude Code Queries (Anytime)**
```
# Get current error status (primary command)
Get dev server status using devserver-mcp

# Analyze specific issues  
Show me all TypeScript errors from devserver-mcp

# Get file-specific help
What errors occurred in src/components/Header.svelte?

# Get setup recommendations
Use devserver-mcp to suggest monitoring setup
```

**Key Workflow:** Start monitoring once in terminal, query from Claude Code anytime!

### **Why the "Magic" Approach Works**

- **Process Independence**: Dev server runs in your terminal, separate from Claude Code
- **Complete Log Capture**: MCP monitoring captures all stdout/stderr in real-time
- **Persistent State**: Error history survives Claude Code restarts via shared state  
- **File Correlation**: Links errors to recent file changes automatically
- **Zero Configuration**: Works with any Vite/Svelte/TypeScript project  
- **No Privileges Required**: No sudo or special permissions needed

### Standalone Usage

```bash
# Start monitoring
npm start

# Or run in development mode
npm run dev
```

## Configuration

Create a configuration file in your project root:

### `devserver-mcp.config.json`
```json
{
  "processPatterns": [
    "pnpm run dev",
    "npm run dev", 
    "yarn dev",
    "vite dev"
  ],
  "historyLimit": 1000,
  "correlationWindow": 5000,
  "watchPaths": ["src", "lib", "components"],
  "excludePaths": ["node_modules", ".git", "dist", ".svelte-kit"],
  "patterns": [
    {
      "name": "custom-error",
      "pattern": "CUSTOM_ERROR: (.+)",
      "category": "runtime",
      "severity": "critical",
      "extract": {
        "message": 1
      }
    }
  ]
}
```

### `devserver-mcp.config.yaml`
```yaml
processPatterns:
  - "pnpm run dev"
  - "npm run dev"
  - "yarn dev"
  - "vite dev"

historyLimit: 1000
correlationWindow: 5000

watchPaths:
  - "src"
  - "lib" 
  - "components"

excludePaths:
  - "node_modules"
  - ".git"
  - "dist"
  - ".svelte-kit"

patterns:
  - name: "custom-error"
    pattern: "CUSTOM_ERROR: (.+)"
    category: "runtime"
    severity: "critical"
    extract:
      message: 1
```

## Built-in Error Patterns

The system comes with pre-configured patterns for:

- **TypeScript**: Type errors, compilation failures  
- **Svelte**: Component warnings, accessibility issues  
- **Vite**: Build errors, module resolution issues  
- **Network**: API failures, 404s  
- **Runtime**: JavaScript runtime errors  
- **Build**: Compilation and bundling issues  

## Architecture

### Core Components

- **ProcessMonitor**: Attaches to dev server processes via spawn()
- **LogParser**: Real-time parsing with configurable regex patterns  
- **FileWatcher**: Tracks file changes using chokidar
- **ErrorCategorizer**: Intelligent classification with severity levels
- **MCP Tools**: Standard MCP protocol implementation

### Error Categorization

Errors are classified by:

- **Severity**: `critical`, `warning`, `info`
- **Category**: `typescript`, `svelte`, `vite`, `network`, `build`, `runtime`, `accessibility`, `unknown`
- **Location**: File path, line number, column (when available)
- **Correlation**: Related file changes within correlation window

## Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run in development mode (watch)
pnpm run dev

# Run tests
pnpm test

# Run tests in watch mode  
pnpm run test:watch

# Lint code
pnpm run lint

# Type check
pnpm run typecheck
```

## API Reference

### MCP Tools

#### `get_dev_server_status()`

Returns current server health, uptime, and error counts.

#### `get_error_summary(options?)`

- `options.limit` (number): Maximum recent errors to include

Returns comprehensive error breakdown by category and severity.

#### `get_error_history(options?)`

- `options.severity` (string): Filter by severity  
- `options.category` (string): Filter by category
- `options.limit` (number): Maximum errors to return
- `options.since` (string): ISO date string filter

Returns chronological error history with filtering.

#### `get_file_errors(filepath)`

- `filepath` (string): File path to query

Returns all errors associated with a specific file.

#### `clear_error_history()`

Clears all stored error history.

#### `watch_for_errors(options?)`

- `options.includeCorrelations` (boolean): Include file correlations
- `options.recentMinutes` (number): Minutes of recent activity

Returns real-time monitoring data and correlations.

## Known Limitations

### Single Project Instance
**Current Constraint**: DevServer MCP currently supports monitoring **one project at a time** due to shared state architecture.

**Impact**:
- Multiple `--monitor` instances will conflict (same shared state file)
- Running monitoring in different projects simultaneously will cause data collision
- Only one dev server per machine can be monitored with full MCP integration

**Workaround**: Use separate terminals/machines for different projects, or manually stop/start monitoring when switching projects.

### Shared State File Location
- Fixed location: `/tmp/devserver-mcp-state.json`
- No per-project state isolation
- Temporary file may be cleared on system restart (monitoring will auto-regenerate)

## Future Enhancements (TODO)

### Multi-Instance Support
**Priority**: Medium  
**Scope**: Moderate architectural enhancement

**Planned Implementation**:
- Per-project state files based on project directory hash
- Instance coordination and conflict detection  
- Port management for multiple MCP server instances
- Project-aware MCP client routing

**Benefits**:
- Support monitoring multiple projects simultaneously
- Team development with shared MCP infrastructure
- Monorepo support with per-package monitoring

### Enhanced Error Correlation
**Priority**: Low  
**Scope**: Feature enhancement

- Git blame integration for error attribution
- Historical error trend analysis
- Intelligent error grouping and deduplication
- Performance regression detection

### Additional Tool Integrations
**Priority**: Low  
**Scope**: Pattern additions

- Docker container monitoring
- Database query error parsing
- API endpoint failure detection
- Custom tool log parsing via configuration

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests to the main repository.

For multi-instance support or other major features, please open an issue first to discuss the implementation approach.