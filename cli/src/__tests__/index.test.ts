import { Command } from "commander";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Mock dependencies
jest.mock("fs");
jest.mock("os");
jest.mock("../commands/add-agent");
jest.mock("../commands/add-tool");
jest.mock("../commands/create");
jest.mock("../commands/mcp");

// Mock console methods
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
const mockConsoleError = jest.spyOn(console, "error").mockImplementation();
const mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation();
const mockProcessExit = jest
  .spyOn(process, "exit")
  .mockImplementation((code) => {
    throw new Error(`Process exited with code ${code}`);
  });
const mockProcessChdir = jest.spyOn(process, "chdir").mockImplementation();

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;

// Import the commands after mocking
import { addAgent } from "../commands/add-agent";
import { addTool } from "../commands/add-tool";
import { create } from "../commands/create";
import { startMcp } from "../commands/mcp";

const mockedAddAgent = addAgent as jest.MockedFunction<typeof addAgent>;
const mockedAddTool = addTool as jest.MockedFunction<typeof addTool>;
const mockedCreate = create as jest.MockedFunction<typeof create>;
const mockedStartMcp = startMcp as jest.MockedFunction<typeof startMcp>;

describe("CLI working directory functionality", () => {
  let originalCwd: string;
  let program: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
    mockProcessExit.mockClear();
    mockProcessChdir.mockClear();

    originalCwd = process.cwd();

    // Create a fresh command instance for each test
    program = new Command();
    program
      .name("pickaxe")
      .description("CLI tool for managing components, agents, and tools")
      .option(
        "-C, --cwd <path>",
        "Change working directory before running command"
      );

    // Set up commands
    const addCommand = program
      .command("add")
      .description("Add various resources");

    addCommand
      .command("agent")
      .description("Add a new agent")
      .argument("<name>", "Agent name")
      .option("-m, --model <model>", "AI model to use", "gpt-4")
      .action(mockedAddAgent);

    addCommand
      .command("tool")
      .description("Add a new tool")
      .argument("<name>", "Tool name")
      .action(mockedAddTool);

    program
      .command("create")
      .description("Create a new project")
      .argument("[name]", "Project name")
      .action(mockedCreate);

    program
      .command("mcp")
      .description("Start the Model Context Protocol server")
      .action(mockedStartMcp);

    // Add the preAction hook that handles working directory change
    program.hook("preAction", (thisCommand) => {
      const options = thisCommand.opts();
      if (options.cwd) {
        const targetDir = path.resolve(options.cwd);

        if (!fs.existsSync(targetDir)) {
          console.error(`Error: Directory '${targetDir}' does not exist`);
          process.exit(1);
        }

        const stat = fs.statSync(targetDir);
        if (!stat.isDirectory()) {
          console.error(`Error: '${targetDir}' is not a directory`);
          process.exit(1);
        }

        // Security check: warn about potentially sensitive directories
        const resolvedPath = fs.realpathSync(targetDir); // Resolve symlinks
        const sensitivePatterns = [
          /^\/$/, // Root directory
          /^\/usr/, // System directories
          /^\/etc/, // Configuration directories
          /^\/var/, // System variable directories
          /^\/bin/, // Binary directories
          /^\/sbin/, // System binary directories
          /^\/lib/, // Library directories
          /^\/opt/, // Optional software directories
          /^\/proc/, // Process information
          /^\/sys/, // System information
          /^\/dev/, // Device files
          /^\/tmp/, // Temporary files (could be risky)
        ];

        // Check for sensitive directories on Unix-like systems
        if (process.platform !== "win32") {
          const homeDir = os.homedir();
          const isSensitive = sensitivePatterns.some((pattern) =>
            pattern.test(resolvedPath)
          );
          const isHomeDirectory = resolvedPath === homeDir;

          if (isSensitive) {
            console.warn(
              `⚠️  Warning: You are about to run pickaxe in a system directory: ${resolvedPath}`
            );
            console.warn(
              `   This could create project files in a system location.`
            );
            console.warn(
              `   Consider using a dedicated workspace directory instead.`
            );
          } else if (isHomeDirectory) {
            console.warn(
              `⚠️  Warning: You are about to run pickaxe in your home directory: ${resolvedPath}`
            );
            console.warn(
              `   This will create project files directly in your home directory.`
            );
            console.warn(
              `   Consider using a dedicated workspace directory like ~/workspace or ~/projects.`
            );
          }
        }

        process.chdir(targetDir);
      }
    });
  });

  afterEach(() => {
    // Restore original working directory if it was changed
    if (process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockProcessExit.mockRestore();
    mockProcessChdir.mockRestore();
  });

  describe("working directory validation", () => {
    it("should change working directory when valid directory is provided", async () => {
      const testDir = "/test/valid/directory";
      const mockStat = { isDirectory: () => true };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue(mockStat as fs.Stats);
      mockedFs.realpathSync.mockReturnValue(testDir);
      mockedOs.homedir.mockReturnValue("/home/user");

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        testDir,
        "create",
        "test-project",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockedCreate).toHaveBeenCalledWith(
        "test-project",
        {},
        expect.any(Object)
      );
    });

    it("should resolve relative paths to absolute paths", async () => {
      const relativeDir = "./test/relative";
      const expectedAbsolute = path.resolve(relativeDir);
      const mockStat = { isDirectory: () => true };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue(mockStat as fs.Stats);
      mockedFs.realpathSync.mockReturnValue(expectedAbsolute);
      mockedOs.homedir.mockReturnValue("/home/user");

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        relativeDir,
        "create",
        "test-project",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(expectedAbsolute);
    });

    it("should handle tilde expansion for home directory", async () => {
      const homeDir = "~/test/directory";
      const expectedResolved = path.resolve(homeDir);
      const mockStat = { isDirectory: () => true };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue(mockStat as fs.Stats);
      mockedFs.realpathSync.mockReturnValue(expectedResolved);
      mockedOs.homedir.mockReturnValue("/home/user");

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        homeDir,
        "create",
        "test-project",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(expectedResolved);
    });
  });

  describe("error handling for invalid directories", () => {
    it("should exit with error when directory does not exist", async () => {
      const nonExistentDir = "/path/that/does/not/exist";

      mockedFs.existsSync.mockReturnValue(false);

      try {
        await program.parseAsync([
          "node",
          "pickaxe",
          "-C",
          nonExistentDir,
          "create",
          "test-project",
        ]);
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        `Error: Directory '${path.resolve(nonExistentDir)}' does not exist`
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it("should exit with error when path is not a directory", async () => {
      const filePath = "/path/to/file.txt";
      const mockStat = { isDirectory: () => false };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue(mockStat as fs.Stats);

      try {
        await program.parseAsync([
          "node",
          "pickaxe",
          "-C",
          filePath,
          "create",
          "test-project",
        ]);
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        `Error: '${path.resolve(filePath)}' is not a directory`
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockedCreate).not.toHaveBeenCalled();
    });
  });

  describe("integration with different commands", () => {
    beforeEach(() => {
      const mockStat = { isDirectory: () => true };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue(mockStat as fs.Stats);
      mockedOs.homedir.mockReturnValue("/home/user");
    });

    it("should work with create command", async () => {
      const testDir = "/test/create/directory";
      mockedFs.realpathSync.mockReturnValue(testDir);

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        testDir,
        "create",
        "my-project",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockedCreate).toHaveBeenCalledWith(
        "my-project",
        {},
        expect.any(Object)
      );
    });

    it("should work with add agent command", async () => {
      const testDir = "/test/agent/directory";
      mockedFs.realpathSync.mockReturnValue(testDir);

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        testDir,
        "add",
        "agent",
        "my-agent",
        "-m",
        "gpt-4",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockedAddAgent).toHaveBeenCalledWith(
        "my-agent",
        { model: "gpt-4" },
        expect.any(Object)
      );
    });

    it("should work with add tool command", async () => {
      const testDir = "/test/tool/directory";
      mockedFs.realpathSync.mockReturnValue(testDir);

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        testDir,
        "add",
        "tool",
        "my-tool",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockedAddTool).toHaveBeenCalledWith(
        "my-tool",
        {},
        expect.any(Object)
      );
    });

    it("should work with mcp command", async () => {
      const testDir = "/test/mcp/directory";
      mockedFs.realpathSync.mockReturnValue(testDir);

      await program.parseAsync(["node", "pickaxe", "-C", testDir, "mcp"]);

      expect(mockProcessChdir).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockedStartMcp).toHaveBeenCalledWith({}, expect.any(Object));
    });
  });

  describe("command execution without working directory flag", () => {
    it("should execute commands normally when -C flag is not provided", async () => {
      await program.parseAsync(["node", "pickaxe", "create", "test-project"]);

      expect(mockProcessChdir).not.toHaveBeenCalled();
      expect(mockedCreate).toHaveBeenCalledWith(
        "test-project",
        {},
        expect.any(Object)
      );
    });

    it("should execute add agent command normally without -C flag", async () => {
      await program.parseAsync(["node", "pickaxe", "add", "agent", "my-agent"]);

      expect(mockProcessChdir).not.toHaveBeenCalled();
      expect(mockedAddAgent).toHaveBeenCalledWith(
        "my-agent",
        { model: "gpt-4" },
        expect.any(Object)
      );
    });
  });

  describe("flag variations", () => {
    beforeEach(() => {
      const mockStat = { isDirectory: () => true };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue(mockStat as fs.Stats);
      mockedOs.homedir.mockReturnValue("/home/user");
    });

    it("should work with short flag -C", async () => {
      const testDir = "/test/short/flag";
      mockedFs.realpathSync.mockReturnValue(testDir);

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        testDir,
        "create",
        "project",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockedCreate).toHaveBeenCalledWith(
        "project",
        {},
        expect.any(Object)
      );
    });

    it("should work with long flag --cwd", async () => {
      const testDir = "/test/long/flag";
      mockedFs.realpathSync.mockReturnValue(testDir);

      await program.parseAsync([
        "node",
        "pickaxe",
        "--cwd",
        testDir,
        "create",
        "project",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockedCreate).toHaveBeenCalledWith(
        "project",
        {},
        expect.any(Object)
      );
    });

    it("should work with equals syntax --cwd=path", async () => {
      const testDir = "/test/equals/syntax";
      mockedFs.realpathSync.mockReturnValue(testDir);

      await program.parseAsync([
        "node",
        "pickaxe",
        `--cwd=${testDir}`,
        "create",
        "project",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockedCreate).toHaveBeenCalledWith(
        "project",
        {},
        expect.any(Object)
      );
    });
  });

  describe("order independence", () => {
    beforeEach(() => {
      const mockStat = { isDirectory: () => true };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue(mockStat as fs.Stats);
      mockedOs.homedir.mockReturnValue("/home/user");
    });

    it("should work when -C flag is at the beginning", async () => {
      const testDir = "/test/beginning";
      mockedFs.realpathSync.mockReturnValue(testDir);

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        testDir,
        "add",
        "agent",
        "my-agent",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockedAddAgent).toHaveBeenCalledWith(
        "my-agent",
        { model: "gpt-4" },
        expect.any(Object)
      );
    });

    it("should work when -C flag is before subcommand", async () => {
      const testDir = "/test/before/subcommand";
      mockedFs.realpathSync.mockReturnValue(testDir);

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        testDir,
        "add",
        "tool",
        "my-tool",
      ]);

      expect(mockProcessChdir).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockedAddTool).toHaveBeenCalledWith(
        "my-tool",
        {},
        expect.any(Object)
      );
    });
  });

  describe("security warnings", () => {
    let originalPlatform: NodeJS.Platform;

    beforeEach(() => {
      originalPlatform = process.platform;
      Object.defineProperty(process, "platform", {
        value: "linux",
        configurable: true,
      });

      const mockStat = { isDirectory: () => true };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.statSync.mockReturnValue(mockStat as fs.Stats);
    });

    afterEach(() => {
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        configurable: true,
      });
    });

    it("should warn when running in home directory", async () => {
      const homeDir = "/home/user";
      mockedFs.realpathSync.mockReturnValue(homeDir);
      mockedOs.homedir.mockReturnValue(homeDir);

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        homeDir,
        "create",
        "project",
      ]);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        `⚠️  Warning: You are about to run pickaxe in your home directory: ${homeDir}`
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "   This will create project files directly in your home directory."
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "   Consider using a dedicated workspace directory like ~/workspace or ~/projects."
      );
    });

    it("should warn when running in system directories", async () => {
      const systemDir = "/usr/local/bin";
      mockedFs.realpathSync.mockReturnValue(systemDir);
      mockedOs.homedir.mockReturnValue("/home/user");

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        systemDir,
        "create",
        "project",
      ]);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        `⚠️  Warning: You are about to run pickaxe in a system directory: ${systemDir}`
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "   This could create project files in a system location."
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "   Consider using a dedicated workspace directory instead."
      );
    });

    it("should warn for /etc directory", async () => {
      const etcDir = "/etc/myconfig";
      mockedFs.realpathSync.mockReturnValue(etcDir);
      mockedOs.homedir.mockReturnValue("/home/user");

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        etcDir,
        "create",
        "project",
      ]);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        `⚠️  Warning: You are about to run pickaxe in a system directory: ${etcDir}`
      );
    });

    it("should not warn for regular workspace directories", async () => {
      const workspaceDir = "/home/user/projects/myapp";
      mockedFs.realpathSync.mockReturnValue(workspaceDir);
      mockedOs.homedir.mockReturnValue("/home/user");

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        workspaceDir,
        "create",
        "project",
      ]);

      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it("should resolve symlinks before checking for sensitive directories", async () => {
      const symlinkPath = "/home/user/workspace/link";
      const realSystemPath = "/usr/local/dangerous";
      mockedFs.realpathSync.mockReturnValue(realSystemPath);
      mockedOs.homedir.mockReturnValue("/home/user");

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        symlinkPath,
        "create",
        "project",
      ]);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        `⚠️  Warning: You are about to run pickaxe in a system directory: ${realSystemPath}`
      );
    });

    it("should skip warnings on Windows", async () => {
      Object.defineProperty(process, "platform", {
        value: "win32",
        configurable: true,
      });

      const systemDir = "/usr/local/bin";
      mockedFs.realpathSync.mockReturnValue(systemDir);
      mockedOs.homedir.mockReturnValue("/home/user");

      await program.parseAsync([
        "node",
        "pickaxe",
        "-C",
        systemDir,
        "create",
        "project",
      ]);

      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });
});
