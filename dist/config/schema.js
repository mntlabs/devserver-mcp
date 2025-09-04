import { z } from 'zod';
const LogPatternSchema = z.object({
    name: z.string(),
    pattern: z.string().transform((str) => new RegExp(str, 'gm')),
    category: z.enum(['typescript', 'svelte', 'vite', 'network', 'build', 'runtime', 'accessibility', 'unknown']),
    severity: z.enum(['critical', 'warning', 'info']),
    extract: z.object({
        message: z.number().optional(),
        file: z.number().optional(),
        line: z.number().optional(),
        column: z.number().optional(),
    }).optional().default({}),
});
export const ConfigSchema = z.object({
    processPatterns: z.array(z.string()).default([
        'pnpm run dev',
        'npm run dev',
        'yarn dev',
        'vite',
        'vite dev'
    ]),
    patterns: z.array(LogPatternSchema).default([]),
    historyLimit: z.number().min(10).max(10000).default(1000),
    correlationWindow: z.number().min(1000).max(300000).default(5000),
    watchPaths: z.array(z.string()).default(['src', 'lib']),
    excludePaths: z.array(z.string()).default([
        'node_modules',
        '.git',
        'dist',
        'build',
        '.svelte-kit'
    ]),
});
//# sourceMappingURL=schema.js.map