# DevServer MCP

An MCP server that monitors development server logs in real-time, categorizes errors by type and severity, and provides Claude Code with structured error data for AI-powered debugging.

**DevServer MCP:**

-   **Intelligent parsing**: Recognizes TypeScript, Svelte, Vite error patterns
-   **Error correlation**: Links errors to recent file changes
-   **Severity classification**: Critical vs warning vs info
-   **Persistent history**: Survives Claude Code restarts
-   **AI integration**: Claude Code queries structured error data instead of raw logs

## Quick Start

```bash
# Install and build
pnpm install && pnpm build

# Add to Claude Code
claude mcp add devserver-mcp --scope local -- node $(pwd)/dist/server.js

# Start monitoring (runs independently)
node dist/server.js --monitor pnpm run dev
```

Now ask Claude Code: _"What errors happened in the last 5 minutes?"_

## Core Workflow

**Traditional debugging:**

1. Notice something broken → 2. Scroll through terminal → 3. Find relevant error → 4. Google it

**With DevServer MCP:**

1. Ask Claude Code "What's broken?" → 2. Get categorized errors with file locations → 3. Ask "How do I fix this?"

## MCP Tools

-   `get_dev_server_status` - Current server health and error counts
-   `get_error_summary` - Errors grouped by type/severity
-   `get_error_history` - Chronological error list with filtering
-   `get_file_errors` - Errors for a specific file
-   `suggest_monitoring_setup` - Project-specific setup recommendations

## Architecture

**Dual-mode operation:**

-   **Monitor mode** (`--monitor`): Spawns dev server, parses logs, writes to `/tmp/devserver-mcp-state.json`
-   **Client mode** (default): Reads shared state file, returns error data to Claude Code

This separation means your dev server runs continuously while Claude Code connects only when needed.

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

## Limitations

-   **Single project**: Only one monitoring instance per machine (shared state file)
-   **Temporary state**: `/tmp/devserver-mcp-state.json` cleared on system restart

## License

MIT
