import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { DevServerProcess, Config } from './types/index.js';

interface ProcessEvents {
  'log': [string, 'stdout' | 'stderr'];
  'process-start': [DevServerProcess];
  'process-exit': [number | null];
  'error': [Error];
}

export class ProcessMonitor extends EventEmitter<ProcessEvents> {
  private process: ChildProcess | null = null;
  private processInfo: DevServerProcess | null = null;
  private config: Config;

  constructor(config: Config) {
    super();
    this.config = config;
  }

  updateConfig(config: Config): void {
    this.config = config;
  }

  async findRunningDevServer(): Promise<DevServerProcess | null> {
    return new Promise((resolve) => {
      // Use ps command to find running dev servers
      const ps = spawn('ps', ['aux']);
      let output = '';

      ps.stdout.on('data', (data) => {
        output += data.toString();
      });

      ps.on('close', () => {
        const lines = output.split('\n');
        
        for (const line of lines) {
          for (const pattern of this.config.processPatterns) {
            if (line.includes(pattern)) {
              const parts = line.trim().split(/\s+/);
              const pidStr = parts[1];
              
              if (pidStr) {
                const pid = parseInt(pidStr);
                
                if (!isNaN(pid)) {
                  const processInfo: DevServerProcess = {
                    pid,
                    command: pattern,
                    args: parts.slice(10), // Command and args usually start from index 10
                    cwd: process.cwd(),
                    startTime: new Date(), // Approximation
                    status: 'running'
                  };
                  
                  resolve(processInfo);
                  return;
                }
              }
            }
          }
        }
        resolve(null);
      });

      ps.on('error', () => resolve(null));
    });
  }

  async startMonitoring(command?: string, args?: string[], cwd?: string): Promise<void> {
    if (this.process) {
      this.stopMonitoring();
    }

    // If no command provided, try to find existing dev server
    if (!command) {
      const existingProcess = await this.findRunningDevServer();
      if (existingProcess) {
        throw new Error('Cannot attach to existing process. Please provide command to start new process.');
      }
      throw new Error('No dev server process found. Please provide command to start monitoring.');
    }

    try {
      this.process = spawn(command, args || [], {
        cwd: cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env: {
          ...process.env,
          FORCE_COLOR: '1', // Force color output even when piped
          NO_COLOR: undefined // Remove any color suppression
        }
      });

      if (!this.process.pid) {
        throw new Error('Failed to get process PID');
      }

      this.processInfo = {
        pid: this.process.pid,
        command,
        args: args || [],
        cwd: cwd || process.cwd(),
        startTime: new Date(),
        status: 'running'
      };

      this.setupProcessHandlers();
      this.emit('process-start', this.processInfo);

    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.stdout?.setEncoding('utf8');
    this.process.stderr?.setEncoding('utf8');

    this.process.stdout?.on('data', (data: string) => {
      const lines = data.split('\n').filter(line => line.trim());
      for (const line of lines) {
        this.emit('log', line, 'stdout');
      }
    });

    this.process.stderr?.on('data', (data: string) => {
      const lines = data.split('\n').filter(line => line.trim());
      for (const line of lines) {
        this.emit('log', line, 'stderr');
      }
    });

    this.process.on('close', (code) => {
      if (this.processInfo) {
        this.processInfo.status = code === 0 ? 'stopped' : 'error';
      }
      this.emit('process-exit', code);
      this.process = null;
      this.processInfo = null;
    });

    this.process.on('error', (error) => {
      if (this.processInfo) {
        this.processInfo.status = 'error';
      }
      this.emit('error', error);
    });
  }

  stopMonitoring(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if process doesn't terminate gracefully
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  getProcessInfo(): DevServerProcess | null {
    return this.processInfo ? { ...this.processInfo } : null;
  }

  getUptime(): number | null {
    if (!this.processInfo || !this.isRunning()) {
      return null;
    }
    return Date.now() - this.processInfo.startTime.getTime();
  }
}