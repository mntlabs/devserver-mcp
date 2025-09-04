import { z } from 'zod';
export declare const ConfigSchema: z.ZodObject<{
    processPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    patterns: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        pattern: z.ZodEffects<z.ZodString, RegExp, string>;
        category: z.ZodEnum<["typescript", "svelte", "vite", "network", "build", "runtime", "accessibility", "unknown"]>;
        severity: z.ZodEnum<["critical", "warning", "info"]>;
        extract: z.ZodDefault<z.ZodOptional<z.ZodObject<{
            message: z.ZodOptional<z.ZodNumber>;
            file: z.ZodOptional<z.ZodNumber>;
            line: z.ZodOptional<z.ZodNumber>;
            column: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            message?: number | undefined;
            file?: number | undefined;
            line?: number | undefined;
            column?: number | undefined;
        }, {
            message?: number | undefined;
            file?: number | undefined;
            line?: number | undefined;
            column?: number | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        category: "typescript" | "svelte" | "vite" | "network" | "build" | "runtime" | "accessibility" | "unknown";
        severity: "critical" | "warning" | "info";
        name: string;
        pattern: RegExp;
        extract: {
            message?: number | undefined;
            file?: number | undefined;
            line?: number | undefined;
            column?: number | undefined;
        };
    }, {
        category: "typescript" | "svelte" | "vite" | "network" | "build" | "runtime" | "accessibility" | "unknown";
        severity: "critical" | "warning" | "info";
        name: string;
        pattern: string;
        extract?: {
            message?: number | undefined;
            file?: number | undefined;
            line?: number | undefined;
            column?: number | undefined;
        } | undefined;
    }>, "many">>;
    historyLimit: z.ZodDefault<z.ZodNumber>;
    correlationWindow: z.ZodDefault<z.ZodNumber>;
    watchPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    excludePaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    processPatterns: string[];
    patterns: {
        category: "typescript" | "svelte" | "vite" | "network" | "build" | "runtime" | "accessibility" | "unknown";
        severity: "critical" | "warning" | "info";
        name: string;
        pattern: RegExp;
        extract: {
            message?: number | undefined;
            file?: number | undefined;
            line?: number | undefined;
            column?: number | undefined;
        };
    }[];
    historyLimit: number;
    correlationWindow: number;
    watchPaths: string[];
    excludePaths: string[];
}, {
    processPatterns?: string[] | undefined;
    patterns?: {
        category: "typescript" | "svelte" | "vite" | "network" | "build" | "runtime" | "accessibility" | "unknown";
        severity: "critical" | "warning" | "info";
        name: string;
        pattern: string;
        extract?: {
            message?: number | undefined;
            file?: number | undefined;
            line?: number | undefined;
            column?: number | undefined;
        } | undefined;
    }[] | undefined;
    historyLimit?: number | undefined;
    correlationWindow?: number | undefined;
    watchPaths?: string[] | undefined;
    excludePaths?: string[] | undefined;
}>;
export type ConfigInput = z.input<typeof ConfigSchema>;
export type Config = z.output<typeof ConfigSchema>;
//# sourceMappingURL=schema.d.ts.map