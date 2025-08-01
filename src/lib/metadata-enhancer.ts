/**
 * @fileoverview Enhanced metadata collection for commit tracking and environment capture
 * @lastmodified 2025-08-01T22:00:00Z
 *
 * Features: Git commit tracking, execution environment capture, system info
 * Main APIs: MetadataEnhancer class, collectGitInfo(), collectEnvironment()
 * Constraints: Requires git repository for commit tracking
 * Patterns: Async collection, graceful fallbacks for missing data
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execAsync = promisify(exec);

export interface GitInfo {
  commit?: string;
  branch?: string;
  author?: string;
  authorEmail?: string;
  commitDate?: string;
  commitMessage?: string;
  isDirty?: boolean;
  uncommittedFiles?: number;
  ahead?: number;
  behind?: number;
  remoteUrl?: string;
}

export interface ExecutionEnvironment {
  nodeVersion: string;
  npmVersion?: string;
  platform: string;
  platformRelease: string;
  arch: string;
  cpuCount: number;
  totalMemory: string;
  freeMemory: string;
  hostname: string;
  user?: string;
  cwd: string;
  imageMagickVersion?: string;
  timestamp: string;
  timezone: string;
  locale?: string;
}

export interface EnhancedMetadata {
  git?: GitInfo;
  environment: ExecutionEnvironment;
  executionTime?: {
    start: string;
    end?: string;
    duration?: number;
  };
  commandLine?: {
    command: string;
    args: string[];
  };
}

export class MetadataEnhancer {
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
  }

  /**
   * Collect all enhanced metadata
   */
  async collectMetadata(commandName?: string, commandArgs?: string[]): Promise<EnhancedMetadata> {
    const [gitInfo, environment] = await Promise.all([
      this.collectGitInfo(),
      this.collectEnvironment(),
    ]);

    return {
      git: gitInfo,
      environment,
      executionTime: {
        start: this.startTime.toISOString(),
      },
      commandLine: commandName
        ? {
            command: commandName,
            args: commandArgs || [],
          }
        : undefined,
    };
  }

  /**
   * Mark execution as complete and calculate duration
   */
  markComplete(metadata: EnhancedMetadata): EnhancedMetadata {
    const endTime = new Date();
    if (metadata.executionTime) {
      metadata.executionTime.end = endTime.toISOString();
      metadata.executionTime.duration = endTime.getTime() - this.startTime.getTime();
    }
    return metadata;
  }

  /**
   * Collect git repository information
   */
  private async collectGitInfo(): Promise<GitInfo | undefined> {
    try {
      // Check if we're in a git repository
      await execAsync("git rev-parse --git-dir");

      const gitInfo: GitInfo = {};

      // Get current commit
      try {
        const { stdout: commit } = await execAsync("git rev-parse HEAD");
        gitInfo.commit = commit.trim();
      } catch {
        // No commits yet
      }

      // Get current branch
      try {
        const { stdout: branch } = await execAsync("git rev-parse --abbrev-ref HEAD");
        gitInfo.branch = branch.trim();
      } catch {
        // No branch
      }

      // Get author info from last commit
      if (gitInfo.commit) {
        try {
          const { stdout: author } = await execAsync("git log -1 --format='%an'");
          gitInfo.author = author.trim().replace(/'/g, "");
        } catch {
          // Ignore
        }

        try {
          const { stdout: email } = await execAsync("git log -1 --format='%ae'");
          gitInfo.authorEmail = email.trim().replace(/'/g, "");
        } catch {
          // Ignore
        }

        try {
          const { stdout: date } = await execAsync("git log -1 --format='%aI'");
          gitInfo.commitDate = date.trim().replace(/'/g, "");
        } catch {
          // Ignore
        }

        try {
          const { stdout: message } = await execAsync("git log -1 --format='%s'");
          gitInfo.commitMessage = message.trim().replace(/'/g, "");
        } catch {
          // Ignore
        }
      }

      // Check if working directory is clean
      try {
        const { stdout: status } = await execAsync("git status --porcelain");
        gitInfo.isDirty = status.trim().length > 0;
        gitInfo.uncommittedFiles = status
          .trim()
          .split("\n")
          .filter((line) => line).length;
      } catch {
        // Ignore
      }

      // Get ahead/behind info
      try {
        const { stdout: revList } = await execAsync(
          "git rev-list --left-right --count @{upstream}...HEAD 2>/dev/null || echo '0\t0'"
        );
        const [behind, ahead] = revList.trim().split("\t").map(Number);
        gitInfo.ahead = ahead;
        gitInfo.behind = behind;
      } catch {
        // No upstream
      }

      // Get remote URL
      try {
        const { stdout: remoteUrl } = await execAsync("git config --get remote.origin.url");
        gitInfo.remoteUrl = remoteUrl.trim();
      } catch {
        // No remote
      }

      return gitInfo;
    } catch {
      // Not a git repository
      return undefined;
    }
  }

  /**
   * Collect execution environment information
   */
  private async collectEnvironment(): Promise<ExecutionEnvironment> {
    const env: ExecutionEnvironment = {
      nodeVersion: process.version,
      platform: os.platform(),
      platformRelease: os.release(),
      arch: os.arch(),
      cpuCount: os.cpus().length,
      totalMemory: this.formatBytes(os.totalmem()),
      freeMemory: this.formatBytes(os.freemem()),
      hostname: os.hostname(),
      cwd: process.cwd(),
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Get npm version
    try {
      const { stdout: npmVersion } = await execAsync("npm --version");
      env.npmVersion = npmVersion.trim();
    } catch {
      // npm not available
    }

    // Get current user
    try {
      const { stdout: user } = await execAsync("whoami");
      env.user = user.trim();
    } catch {
      // Fallback to env variable
      env.user = process.env.USER || process.env.USERNAME;
    }

    // Get ImageMagick version
    try {
      const { stdout: magickVersion } = await execAsync("convert -version | head -n 1");
      const match = magickVersion.match(/ImageMagick ([\d.]+(-\d+)?)/);
      if (match) {
        env.imageMagickVersion = match[1];
      }
    } catch {
      // ImageMagick not available
    }

    // Get locale
    try {
      env.locale = process.env.LANG || process.env.LC_ALL || undefined;
    } catch {
      // Ignore
    }

    return env;
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Generate a summary report of the enhanced metadata
   */
  generateReport(metadata: EnhancedMetadata): string {
    const lines: string[] = ["=== Execution Metadata ===", ""];

    // Git information
    if (metadata.git) {
      lines.push("Git Information:");
      lines.push("--------------");
      if (metadata.git.commit) {
        lines.push(`Commit: ${metadata.git.commit.substring(0, 8)}`);
        lines.push(`Branch: ${metadata.git.branch || "N/A"}`);
        lines.push(`Author: ${metadata.git.author} <${metadata.git.authorEmail}>`);
        lines.push(`Date: ${metadata.git.commitDate}`);
        lines.push(`Message: ${metadata.git.commitMessage}`);
      }
      lines.push(`Working Directory: ${metadata.git.isDirty ? "Modified" : "Clean"}`);
      if (metadata.git.isDirty) {
        lines.push(`Uncommitted Files: ${metadata.git.uncommittedFiles}`);
      }
      if (metadata.git.remoteUrl) {
        lines.push(`Remote: ${metadata.git.remoteUrl}`);
      }
      lines.push("");
    }

    // Environment information
    lines.push("Execution Environment:");
    lines.push("--------------------");
    lines.push(
      `Platform: ${metadata.environment.platform} ${metadata.environment.platformRelease}`
    );
    lines.push(`Architecture: ${metadata.environment.arch}`);
    lines.push(`Node.js: ${metadata.environment.nodeVersion}`);
    if (metadata.environment.npmVersion) {
      lines.push(`npm: ${metadata.environment.npmVersion}`);
    }
    if (metadata.environment.imageMagickVersion) {
      lines.push(`ImageMagick: ${metadata.environment.imageMagickVersion}`);
    }
    lines.push(`CPU Cores: ${metadata.environment.cpuCount}`);
    lines.push(
      `Memory: ${metadata.environment.freeMemory} free / ${metadata.environment.totalMemory} total`
    );
    lines.push(`Hostname: ${metadata.environment.hostname}`);
    lines.push(`User: ${metadata.environment.user || "N/A"}`);
    lines.push(`CWD: ${metadata.environment.cwd}`);
    lines.push(`Timezone: ${metadata.environment.timezone}`);
    if (metadata.environment.locale) {
      lines.push(`Locale: ${metadata.environment.locale}`);
    }
    lines.push("");

    // Execution time
    if (metadata.executionTime) {
      lines.push("Execution Time:");
      lines.push("--------------");
      lines.push(`Started: ${metadata.executionTime.start}`);
      if (metadata.executionTime.end) {
        lines.push(`Ended: ${metadata.executionTime.end}`);
        lines.push(`Duration: ${this.formatDuration(metadata.executionTime.duration || 0)}`);
      }
      lines.push("");
    }

    // Command line
    if (metadata.commandLine) {
      lines.push("Command Line:");
      lines.push("------------");
      lines.push(`Command: ${metadata.commandLine.command}`);
      if (metadata.commandLine.args.length > 0) {
        lines.push(`Arguments: ${metadata.commandLine.args.join(" ")}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Format duration in human readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}
