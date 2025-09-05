import type { LogPattern } from '../types/index.js';

export const defaultPatterns: LogPattern[] = [
  // Vite startup and connection
  {
    name: 'vite-dev-server-ready',
    pattern: /\s+Local:\s+http:\/\/localhost:(\d+)\//gm,
    category: 'build',
    severity: 'info',
    extract: { message: 0 }
  },

  // Real TypeScript error patterns from Vite output
  {
    name: 'typescript-vite-error',
    pattern: /src\/(.+\.(?:ts|js|svelte)):(\d+):(\d+) - error TS(\d+): (.+)/gm,
    category: 'typescript',
    severity: 'critical',
    extract: { file: 1, line: 2, column: 3, message: 5 }
  },

  {
    name: 'typescript-generic-error',
    pattern: /error TS(\d+): (.+)/gm,
    category: 'typescript',
    severity: 'critical',
    extract: { message: 2 }
  },

  // Svelte compilation errors (real patterns)
  {
    name: 'svelte-compile-error',
    pattern: /ParseError: (.+) \((\d+):(\d+)\)/gm,
    category: 'svelte',
    severity: 'critical',
    extract: { message: 1, line: 2, column: 3 }
  },

  {
    name: 'svelte-plugin-compile-error',
    pattern: /\[plugin:vite-plugin-svelte:compile\] (.+):(\d+):(\d+) (.+)/gm,
    category: 'svelte',
    severity: 'critical',
    extract: { file: 1, line: 2, column: 3, message: 4 }
  },

  {
    name: 'svelte-plugin-warning',
    pattern: /\[plugin:vite:svelte\] (.+) \((.+):(\d+):(\d+)\)/gm,
    category: 'svelte',
    severity: 'warning',
    extract: { message: 1, file: 2, line: 3, column: 4 }
  },

  {
    name: 'svelte-a11y-warning',
    pattern: /\[vite-plugin-svelte\] (.+):(\d+):(\d+) (.+)/gm,
    category: 'accessibility',
    severity: 'warning',
    extract: { file: 1, line: 2, column: 3, message: 4 }
  },

  // Vite pre-transform errors (compilation errors during HMR)
  {
    name: 'vite-pre-transform-error',
    pattern: /\[vite\] \(client\) Pre-transform error: (.+):(\d+):(\d+) (.+)/gm,
    category: 'svelte',
    severity: 'critical',
    extract: { file: 1, line: 2, column: 3, message: 4 }
  },

  // Vite internal server errors (like Svelte compilation errors)
  {
    name: 'vite-internal-server-error',
    pattern: /\[vite\] Internal server error: (.+):(\d+):(\d+) (.+)/gm,
    category: 'svelte',
    severity: 'critical',
    extract: { file: 1, line: 2, column: 3, message: 4 }
  },

  // Vite build and module resolution errors
  {
    name: 'vite-import-analysis-failed',
    pattern: /\[vite\] Import analysis failed: (.+)/gm,
    category: 'build',
    severity: 'critical',
    extract: { message: 1 }
  },

  {
    name: 'vite-transform-failed',
    pattern: /\[vite\] Transform failed with \d+ errors?:\n(.+)/gm,
    category: 'build',
    severity: 'critical',
    extract: { message: 1 }
  },

  {
    name: 'vite-module-not-found',
    pattern: /Cannot resolve dependency: (.+)/gm,
    category: 'build',
    severity: 'critical',
    extract: { message: 1 }
  },

  {
    name: 'vite-resolve-failed',
    pattern: /Failed to resolve import "(.+)" from "(.+)"/gm,
    category: 'build',
    severity: 'critical',
    extract: { message: 0, file: 2 }
  },

  // Network and HTTP errors (dev server)
  {
    name: 'vite-dev-404',
    pattern: /404 (\S+)/gm,
    category: 'network',
    severity: 'warning',
    extract: { message: 1 }
  },

  {
    name: 'vite-proxy-error',
    pattern: /\[vite\] http proxy error:\n(.+)/gm,
    category: 'network',
    severity: 'warning',
    extract: { message: 1 }
  },

  // HMR and hot reload
  {
    name: 'vite-hmr-update',
    pattern: /\[vite\] (.+) reloaded\./gm,
    category: 'build',
    severity: 'info',
    extract: { message: 1 }
  },

  {
    name: 'vite-hmr-error',
    pattern: /\[vite\] HMR update error: (.+)/gm,
    category: 'runtime',
    severity: 'critical',
    extract: { message: 1 }
  },

  // CSS and style errors
  {
    name: 'postcss-error',
    pattern: /\[postcss\] (.+) \((.+):(\d+):(\d+)\)/gm,
    category: 'build',
    severity: 'critical',
    extract: { message: 1, file: 2, line: 3, column: 4 }
  },

  // Runtime JavaScript errors in browser
  {
    name: 'browser-runtime-error',
    pattern: /Uncaught \w+: (.+) at (.+):(\d+):(\d+)/gm,
    category: 'runtime',
    severity: 'critical',
    extract: { message: 1, file: 2, line: 3, column: 4 }
  },

  // Generic console errors
  {
    name: 'console-error',
    pattern: /console\.error\(\): (.+)/gm,
    category: 'runtime',
    severity: 'warning',
    extract: { message: 1 }
  },

  // Tailwind warnings
  {
    name: 'tailwind-warning',
    pattern: /warn - (.+)/gm,
    category: 'build',
    severity: 'warning',
    extract: { message: 1 }
  },

  // SvelteKit specific errors
  {
    name: 'sveltekit-error',
    pattern: /\[sveltekit\] (.+)/gm,
    category: 'svelte',
    severity: 'warning',
    extract: { message: 1 }
  },

  // Generic file location patterns (catch-all)
  {
    name: 'generic-file-error',
    pattern: /(.+\.(?:ts|js|svelte|vue|css|scss)):(\d+):(\d+): (.+)/gm,
    category: 'build',
    severity: 'warning',
    extract: { file: 1, line: 2, column: 3, message: 4 }
  },
];