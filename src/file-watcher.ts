import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import type { FileChange, ErrorCorrelation, ErrorEntry, Config } from './types/index.js';

interface FileWatcherEvents {
  'file-change': [FileChange];
  'error-correlation': [ErrorCorrelation];
}

export class FileWatcher extends EventEmitter<FileWatcherEvents> {
  private watcher: FSWatcher | null = null;
  private recentChanges: FileChange[] = [];
  private correlationWindow: number;
  private config: Config;

  constructor(config: Config) {
    super();
    this.config = config;
    this.correlationWindow = config.correlationWindow;
  }

  updateConfig(config: Config): void {
    this.config = config;
    this.correlationWindow = config.correlationWindow;
    
    if (this.watcher) {
      this.stopWatching();
      this.startWatching();
    }
  }

  startWatching(): void {
    if (this.watcher) {
      this.stopWatching();
    }

    const watchPaths = this.config.watchPaths.length > 0 ? this.config.watchPaths : ['src'];
    
    this.watcher = watch(watchPaths, {
      ignored: this.config.excludePaths.map(path => `**/${path}/**`),
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 10,
    });

    this.watcher.on('add', (path) => {
      this.handleFileChange(path, 'added');
    });

    this.watcher.on('change', (path) => {
      this.handleFileChange(path, 'modified');
    });

    this.watcher.on('unlink', (path) => {
      this.handleFileChange(path, 'removed');
    });

    this.watcher.on('error', (error) => {
      console.error('File watcher error:', error);
    });
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  private handleFileChange(path: string, type: FileChange['type']): void {
    const change: FileChange = {
      path,
      type,
      timestamp: new Date(),
    };

    this.recentChanges.unshift(change);
    this.trimRecentChanges();
    this.emit('file-change', change);
  }

  private trimRecentChanges(): void {
    const cutoff = new Date(Date.now() - this.correlationWindow * 2);
    this.recentChanges = this.recentChanges.filter(change => change.timestamp > cutoff);
  }

  correlateErrors(errors: ErrorEntry[]): ErrorCorrelation[] {
    const correlations: ErrorCorrelation[] = [];
    const now = new Date();

    for (const change of this.recentChanges) {
      const timeDiff = now.getTime() - change.timestamp.getTime();
      
      if (timeDiff > this.correlationWindow) {
        continue;
      }

      const relatedErrors = errors.filter(error => {
        const errorTimeDiff = error.timestamp.getTime() - change.timestamp.getTime();
        
        // Error should occur after file change within the correlation window
        if (errorTimeDiff < 0 || errorTimeDiff > this.correlationWindow) {
          return false;
        }

        // Check if error is related to the changed file
        if (error.file) {
          return error.file === change.path || 
                 error.file.endsWith(change.path) ||
                 change.path.endsWith(error.file) ||
                 this.pathsAreRelated(change.path, error.file);
        }

        return false;
      });

      if (relatedErrors.length > 0) {
        const confidence = this.calculateConfidence(change, relatedErrors);
        
        correlations.push({
          fileChange: change,
          errors: relatedErrors,
          confidence,
        });
      }
    }

    return correlations.sort((a, b) => b.confidence - a.confidence);
  }

  private pathsAreRelated(path1: string, path2: string): boolean {
    const normalize = (p: string) => p.replace(/\\/g, '/').toLowerCase();
    const n1 = normalize(path1);
    const n2 = normalize(path2);

    // Check if paths share a common directory structure
    const parts1 = n1.split('/');
    const parts2 = n2.split('/');
    
    // If they share the same filename (different extensions)
    const filename1 = parts1[parts1.length - 1]?.split('.')[0];
    const filename2 = parts2[parts2.length - 1]?.split('.')[0];
    
    if (filename1 && filename2 && filename1 === filename2) {
      return true;
    }

    // If one path is contained within the other's directory
    const dir1 = parts1.slice(0, -1).join('/');
    const dir2 = parts2.slice(0, -1).join('/');
    
    return dir1.includes(dir2) || dir2.includes(dir1);
  }

  private calculateConfidence(change: FileChange, errors: ErrorEntry[]): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for direct file matches
    const directMatches = errors.filter(error => 
      error.file && (error.file === change.path || change.path.endsWith(error.file))
    );
    
    if (directMatches.length > 0) {
      confidence += 0.3;
    }

    // Higher confidence for recent changes
    const timeSinceChange = Date.now() - change.timestamp.getTime();
    const timeBonus = Math.max(0, 1 - (timeSinceChange / this.correlationWindow)) * 0.2;
    confidence += timeBonus;

    // Higher confidence for more errors
    const errorBonus = Math.min(0.2, errors.length * 0.05);
    confidence += errorBonus;

    // Higher confidence for critical errors
    const criticalErrors = errors.filter(error => error.severity === 'critical');
    if (criticalErrors.length > 0) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  getRecentChanges(limit = 10): FileChange[] {
    return this.recentChanges.slice(0, limit);
  }

  clearHistory(): void {
    this.recentChanges = [];
  }
}