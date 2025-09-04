export interface DevServerProcess {
  pid: number;
  command: string;
  args: string[];
  cwd: string;
  startTime: Date;
  status: 'running' | 'stopped' | 'error';
}

export interface ErrorEntry {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'warning' | 'info';
  category: 'typescript' | 'svelte' | 'vite' | 'network' | 'build' | 'runtime' | 'accessibility' | 'unknown';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
  raw: string;
}

export interface FileChange {
  path: string;
  timestamp: Date;
  type: 'added' | 'modified' | 'removed';
}

export interface ErrorCorrelation {
  fileChange: FileChange;
  errors: ErrorEntry[];
  confidence: number;
}

export interface DevServerStatus {
  isRunning: boolean;
  process?: DevServerProcess | undefined;
  uptime?: number | undefined;
  lastError?: ErrorEntry | undefined;
  errorCount: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface ErrorSummary {
  total: number;
  byCategory: Record<ErrorEntry['category'], number>;
  bySeverity: Record<ErrorEntry['severity'], number>;
  recent: ErrorEntry[];
  files: Record<string, number>;
}

export interface LogPattern {
  name: string;
  pattern: RegExp;
  category: ErrorEntry['category'];
  severity: ErrorEntry['severity'];
  extract: {
    message?: number;
    file?: number;
    line?: number;
    column?: number;
  };
}

export interface Config {
  processPatterns: string[];
  patterns: LogPattern[];
  historyLimit: number;
  correlationWindow: number;
  watchPaths: string[];
  excludePaths: string[];
}