/**
 * @fileoverview Tests for metadata enhancer
 * @lastmodified 2025-08-01T23:00:00Z
 */

// Define mockExecAsync before any imports
const mockExecAsync = jest.fn();

// Mock the promisified exec before importing
jest.mock("util", () => ({
  ...jest.requireActual("util"),
  promisify: (fn: any) => {
    // Use the function name to identify exec
    if (fn && fn.name === "exec") {
      return mockExecAsync;
    }
    return jest.requireActual("util").promisify(fn);
  },
}));

jest.mock("child_process");
jest.mock("os");

import { MetadataEnhancer, EnhancedMetadata } from "../lib/metadata-enhancer";
import * as os from "os";

const mockOs = os as jest.Mocked<typeof os>;

describe("MetadataEnhancer", () => {
  let enhancer: MetadataEnhancer;
  const mockDate = new Date("2025-01-01T12:00:00Z");

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecAsync.mockClear();
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    enhancer = new MetadataEnhancer();

    // Default OS mocks
    mockOs.platform.mockReturnValue("darwin");
    mockOs.release.mockReturnValue("23.0.0");
    mockOs.arch.mockReturnValue("arm64");
    const cpuInfoArray: os.CpuInfo[] = Array(8)
      .fill(null)
      .map(() => ({
        model: "Apple M1",
        speed: 2400,
        times: {
          user: 0,
          nice: 0,
          sys: 0,
          idle: 0,
          irq: 0,
        },
      }));
    mockOs.cpus.mockReturnValue(cpuInfoArray);
    mockOs.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
    mockOs.freemem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
    mockOs.hostname.mockReturnValue("test-machine");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("collectMetadata", () => {
    it("should collect basic environment metadata when not in git repo", async () => {
      // Mock git check to fail
      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes("git rev-parse --git-dir")) {
          return Promise.reject(new Error("Not a git repository"));
        }
        return Promise.reject(new Error("Command failed"));
      });

      const metadata = await enhancer.collectMetadata("test-command", ["arg1", "arg2"]);

      expect(metadata.git).toBeUndefined();
      expect(metadata.environment).toBeDefined();
      expect(metadata.environment.platform).toBe("darwin");
      expect(metadata.environment.arch).toBe("arm64");
      expect(metadata.environment.cpuCount).toBe(8);
      expect(metadata.commandLine).toEqual({
        command: "test-command",
        args: ["arg1", "arg2"],
      });
    }, 30000);

    it("should collect git metadata when in repository", async () => {
      // Mock successful git commands based on command content
      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes("git rev-parse --git-dir")) {
          return Promise.resolve({ stdout: "/path/to/.git\n", stderr: "" });
        } else if (command.includes("git rev-parse HEAD")) {
          return Promise.resolve({ stdout: "abc123def456\n", stderr: "" });
        } else if (command.includes("git rev-parse --abbrev-ref HEAD")) {
          return Promise.resolve({ stdout: "main\n", stderr: "" });
        } else if (command.includes("git log -1 --format='%an'")) {
          return Promise.resolve({ stdout: "John Doe\n", stderr: "" });
        } else if (command.includes("git log -1 --format='%ae'")) {
          return Promise.resolve({ stdout: "john@example.com\n", stderr: "" });
        } else if (command.includes("git log -1 --format='%aI'")) {
          return Promise.resolve({ stdout: "2025-01-01T10:00:00Z\n", stderr: "" });
        } else if (command.includes("git log -1 --format='%s'")) {
          return Promise.resolve({ stdout: "Initial commit\n", stderr: "" });
        } else if (command.includes("git status --porcelain")) {
          return Promise.resolve({ stdout: "M  src/file.ts\nA  new-file.js\n", stderr: "" });
        } else if (command.includes("git rev-list --left-right --count")) {
          return Promise.resolve({ stdout: "2\t3\n", stderr: "" });
        } else if (command.includes("git config --get remote.origin.url")) {
          return Promise.resolve({ stdout: "https://github.com/user/repo.git\n", stderr: "" });
        } else if (command.includes("npm --version")) {
          return Promise.resolve({ stdout: "10.2.3\n", stderr: "" });
        } else if (command === "whoami") {
          return Promise.resolve({ stdout: "user123\n", stderr: "" });
        } else if (command.includes("convert -version | head -n 1")) {
          return Promise.resolve({
            stdout: "Version: ImageMagick 7.1.2-0 Q16 x86_64 2024\n",
            stderr: "",
          });
        } else {
          return Promise.reject(new Error("Unexpected command: " + command));
        }
      });

      const metadata = await enhancer.collectMetadata();

      expect(metadata.git).toEqual({
        commit: "abc123def456",
        branch: "main",
        author: "John Doe",
        authorEmail: "john@example.com",
        commitDate: "2025-01-01T10:00:00Z",
        commitMessage: "Initial commit",
        isDirty: true,
        uncommittedFiles: 2,
        ahead: 3,
        behind: 2,
        remoteUrl: "https://github.com/user/repo.git",
      });
    }, 30000);

    it("should handle partial git data gracefully", async () => {
      // Mock git repo exists but some commands fail
      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes("git rev-parse --git-dir")) {
          return Promise.resolve({ stdout: "/path/to/.git\n", stderr: "" });
        } else if (command.includes("git rev-parse HEAD")) {
          return Promise.resolve({ stdout: "abc123\n", stderr: "" });
        } else {
          return Promise.reject(new Error("Command failed"));
        }
      });

      const metadata = await enhancer.collectMetadata();

      expect(metadata.git).toEqual({
        commit: "abc123",
      });
    }, 30000);

    it("should collect system tools versions", async () => {
      // Mock tool version commands based on command content
      // This handles parallel execution properly by routing based on command
      mockExecAsync.mockImplementation((command: string) => {
        if (command.includes("git rev-parse --git-dir")) {
          return Promise.reject(new Error("Not a git repo"));
        } else if (command.includes("npm --version")) {
          return Promise.resolve({ stdout: "10.2.3\n", stderr: "" });
        } else if (command === "whoami") {
          return Promise.resolve({ stdout: "user123\n", stderr: "" });
        } else if (command.includes("convert -version | head -n 1")) {
          return Promise.resolve({
            stdout: "Version: ImageMagick 7.1.2-0 Q16 x86_64 2024\n",
            stderr: "",
          });
        } else {
          return Promise.reject(new Error("Command failed"));
        }
      });

      const metadata = await enhancer.collectMetadata();

      expect(metadata.environment.npmVersion).toBe("10.2.3");
      expect(metadata.environment.user).toBe("user123");
      expect(metadata.environment.imageMagickVersion).toBe("7.1.2-0");
    });

    it("should use environment variables as fallback", async () => {
      // Mock all exec calls to fail
      mockExecAsync.mockImplementation((_command: string) => {
        return Promise.reject(new Error("Command failed"));
      });

      // Set environment variables
      process.env.USER = "envuser";
      process.env.LANG = "en_US.UTF-8";

      const metadata = await enhancer.collectMetadata();

      expect(metadata.environment.user).toBe("envuser");
      expect(metadata.environment.locale).toBe("en_US.UTF-8");

      // Clean up
      delete process.env.USER;
      delete process.env.LANG;
    });
  });

  describe("markComplete", () => {
    it("should calculate execution duration", async () => {
      mockExecAsync.mockImplementation((_command: string) => {
        return Promise.reject(new Error("Not a git repo"));
      });

      const metadata = await enhancer.collectMetadata();

      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000);

      const completed = enhancer.markComplete(metadata);

      expect(completed.executionTime?.end).toBeDefined();
      expect(completed.executionTime?.duration).toBe(5000);
    });
  });

  describe("generateReport", () => {
    it("should generate comprehensive report", async () => {
      const metadata = {
        git: {
          commit: "abc123def456",
          branch: "main",
          author: "John Doe",
          authorEmail: "john@example.com",
          commitDate: "2025-01-01T10:00:00Z",
          commitMessage: "Test commit",
          isDirty: true,
          uncommittedFiles: 2,
          remoteUrl: "https://github.com/user/repo.git",
        },
        environment: {
          nodeVersion: "v20.0.0",
          npmVersion: "10.0.0",
          platform: "darwin",
          platformRelease: "23.0.0",
          arch: "arm64",
          cpuCount: 8,
          totalMemory: "16.00 GB",
          freeMemory: "8.00 GB",
          hostname: "test-machine",
          user: "testuser",
          cwd: "/test/dir",
          imageMagickVersion: "7.1.2-0",
          timestamp: "2025-01-01T12:00:00Z",
          timezone: "UTC",
          locale: "en_US.UTF-8",
        },
        executionTime: {
          start: "2025-01-01T12:00:00Z",
          end: "2025-01-01T12:00:05Z",
          duration: 5000,
        },
        commandLine: {
          command: "auto-image-diff",
          args: ["diff", "image1.png", "image2.png"],
        },
      };

      const report = enhancer.generateReport(metadata as EnhancedMetadata);

      expect(report).toContain("Git Information:");
      expect(report).toContain("Commit: abc123de");
      expect(report).toContain("Branch: main");
      expect(report).toContain("Working Directory: Modified");
      expect(report).toContain("Uncommitted Files: 2");

      expect(report).toContain("Execution Environment:");
      expect(report).toContain("Platform: darwin 23.0.0");
      expect(report).toContain("Node.js: v20.0.0");
      expect(report).toContain("ImageMagick: 7.1.2-0");

      expect(report).toContain("Execution Time:");
      expect(report).toContain("Duration: 5.0s");

      expect(report).toContain("Command Line:");
      expect(report).toContain("Command: auto-image-diff");
      expect(report).toContain("Arguments: diff image1.png image2.png");
    });

    it("should handle missing sections gracefully", () => {
      const metadata = {
        environment: {
          nodeVersion: "v20.0.0",
          platform: "linux",
          platformRelease: "5.0.0",
          arch: "x64",
          cpuCount: 4,
          totalMemory: "8.00 GB",
          freeMemory: "4.00 GB",
          hostname: "linux-box",
          cwd: "/home/user",
          timestamp: "2025-01-01T12:00:00Z",
          timezone: "UTC",
        },
      };

      const report = enhancer.generateReport(metadata as EnhancedMetadata);

      expect(report).not.toContain("Git Information:");
      expect(report).toContain("Execution Environment:");
      expect(report).not.toContain("Execution Time:");
      expect(report).not.toContain("Command Line:");
    });
  });

  describe("formatDuration", () => {
    it("should format durations correctly", () => {
      const enhancer = new MetadataEnhancer();

      // Access private method via any type
      const formatDuration = (enhancer as any).formatDuration.bind(enhancer);

      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(65000)).toBe("1m 5s");
      expect(formatDuration(125000)).toBe("2m 5s");
    });
  });

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      const enhancer = new MetadataEnhancer();

      // Access private method via any type
      const formatBytes = (enhancer as any).formatBytes.bind(enhancer);

      expect(formatBytes(512)).toBe("512.00 B");
      expect(formatBytes(1536)).toBe("1.50 KB");
      expect(formatBytes(1048576)).toBe("1.00 MB");
      expect(formatBytes(1073741824)).toBe("1.00 GB");
    });
  });
});
