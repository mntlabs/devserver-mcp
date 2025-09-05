# DevServer MCP

An MCP server that monitors development server logs in real-time, categorizes errors by type and severity, and provides Claude Code with immediate error notifications via Server-Sent Events (SSE).

**DevServer MCP:**

-   **Real-time notifications**: Instant error alerts via SSE transport
-   **Intelligent parsing**: Recognizes TypeScript, Svelte, Vite error patterns
-   **Error correlation**: Links errors to recent file changes
-   **Severity classification**: Critical vs warning vs info
-   **Multiple client support**: Connect multiple Claude Code instances simultaneously
-   **AI integration**: Claude Code receives structured error data instead of raw logs

## Quick Start

```bash
# Install and build
pnpm install && pnpm build

# Start monitoring with SSE server (uses default port 9338)
node dist/server.js --monitor pnpm run dev

# Connect Claude Code (port stays consistent across restarts)
claude mcp add --transport sse devserver-mcp http://127.0.0.1:9338/sse
```

Now Claude Code receives **immediate notifications** when errors occur!

## Core Workflow

**Traditional debugging:**

1. Notice something broken → 2. Scroll through terminal → 3. Find relevant error → 4. Google it

**With DevServer MCP:**

1. Error occurs → 2. **Instant notification in Claude Code** → 3. Get categorized errors with file locations → 4. Ask "How do I fix this?"

## MCP Tools

-   `get_dev_server_status` - Current server health and error counts
-   `get_error_summary` - Errors grouped by type/severity
-   `get_error_history` - Chronological error list with filtering
-   `get_file_errors` - Errors for a specific file
-   `suggest_monitoring_setup` - Project-specific setup recommendations

## Port Configuration

**Default Port (9338):**
```bash
# Start with default port
node dist/server.js --monitor pnpm run dev

# Connect Claude Code  
claude mcp add --transport sse devserver-mcp http://127.0.0.1:9338/sse
```

**Custom Port Per Project:**
```bash
# Frontend project on port 9339
node dist/server.js --port 9339 --monitor pnpm run dev

# Backend project on port 9340  
node dist/server.js --port 9340 --monitor npm run dev:api

# Connect to specific projects
claude mcp add --transport sse frontend-devserver http://127.0.0.1:9339/sse
claude mcp add --transport sse backend-devserver http://127.0.0.1:9340/sse
```

**Benefits:**
- ✅ **Consistent ports** - same port every restart, no need to re-add MCP server
- ✅ **Per-project ports** - run multiple projects simultaneously  
- ✅ **Conflict detection** - helpful error messages if port is already in use

## Architecture

**SSE-Based Real-Time System:**

-   **Monitor mode** (`--monitor`): Spawns dev server, parses logs, broadcasts errors via SSE
-   **HTTP server**: Serves `/sse` endpoint for Claude Code connections on specified port
-   **Error buffering**: Maintains recent error history for newly connected clients
-   **Multi-client support**: Multiple Claude Code instances can connect simultaneously

Real-time error streaming means Claude Code gets notified within 1-2 seconds of any dev server issue.

## Error Categories

**Built-in patterns for:**

-   TypeScript compilation errors
-   Svelte component warnings
-   Vite build failures
-   Network/API errors
-   Runtime JavaScript errors
-   Accessibility issues

## Configuration

Create `devserver-mcp.config.json`:

```json
{
    "processPatterns": ["pnpm run dev", "npm run dev"],
    "historyLimit": 1000,
    "watchPaths": ["src", "lib"],
    "excludePaths": ["node_modules", ".git"],
    "patterns": [
        {
            "name": "custom-error",
            "pattern": "CUSTOM: (.+)",
            "category": "runtime",
            "severity": "critical"
        }
    ]
}
```

## Development

```bash
pnpm install     # Install deps
pnpm build       # Build project
pnpm dev         # Watch mode
pnpm test        # Run tests
pnpm typecheck   # Type checking
```

## Troubleshooting

### Connection Failed
```bash
# Check if monitoring server is running
ps aux | grep "node.*server.js"

# Restart monitoring server (default port 9338)
node dist/server.js --monitor pnpm run dev

# Verify connection
claude mcp add --transport sse devserver-mcp http://127.0.0.1:9338/sse
```

### Port Already in Use
```bash
# Error: Port 9338 is already in use!
# Solution: Use a different port
node dist/server.js --port 9339 --monitor pnpm run dev

# Then connect with the new port
claude mcp add --transport sse devserver-mcp http://127.0.0.1:9339/sse
```

### No Real-Time Notifications
```bash
# Check MCP connection status
claude mcp list

# Remove and reconnect if needed
claude mcp remove devserver-mcp
claude mcp add --transport sse devserver-mcp http://127.0.0.1:9338/sse
```

### Multiple Projects
```bash
# Each project should use a different port
# Project A
node dist/server.js --port 9338 --monitor pnpm run dev

# Project B  
node dist/server.js --port 9339 --monitor npm run dev

# Connect both in Claude Code with different names
claude mcp add --transport sse project-a http://127.0.0.1:9338/sse
claude mcp add --transport sse project-b http://127.0.0.1:9339/sse
```


## License

MIT
