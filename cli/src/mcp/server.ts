const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} = require("@modelcontextprotocol/sdk/types.js");
const { z } = require("zod");
const { promises: fs } = require("fs");
const path = require("path");

// Schema for tool arguments
const CreateAgentArgsSchema = z.object({
  name: z.string().describe("Name of the agent to create"),
  description: z.string().describe("Description of what the agent does"),
});

const CreateToolArgsSchema = z.object({
  name: z.string().describe("Name of the tool to create"),
});

export class PickaxeMcpServer {
  private server: any;

  constructor() {
    this.server = new Server(
      {
        name: "pickaxe-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  private setupToolHandlers() {
    // Register tools with their descriptions
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "scaffold_agent",
            description:
              "Creates the boilerplate for a new Pickaxe agent with a simple interface that has a name, description, and execute method. Before using this tool, please refer to the planning instructions at: https://pickaxe.hatchet.run/mcp/mcp-instructions.md. If a user is asking to create an agent, you should first read this document, then scaffold tools with the `scaffold_tool` tool, and finally use this tool to create the agent.",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name of the agent to create",
                },
                description: {
                  type: "string",
                  description: "Description of what the agent does",
                },
              },
              required: ["name", "description"],
            },
          },
          {
            name: "scaffold_tool",
            description:
              "Creates the boilerplate for a new Pickaxe tool with a simple interface that has a name and execute method. Before using this tool, please refer to the planning instructions at: https://pickaxe.hatchet.run/mcp/mcp-instructions.md. If a user is asking to create a tool, you should first read this document, then use this tool to scaffold the tool.",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name of the tool to create",
                },
              },
              required: ["name"],
            },
          },
          {
            name: "plan_agent",
            description:
              "Provides planning instructions for creating a new agent",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      };
    });
  }

  private setupRequestHandlers() {
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: any) => {
        try {
          const { name, arguments: args } = request.params;

          switch (name) {
            case "scaffold_agent":
              return await this.handleCreateAgent(args);
            case "scaffold_tool":
              return await this.handleCreateTool(args);
            case "plan_agent":
              return await this.handlePlanAgent();
            default:
              throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${name}`
              );
          }
        } catch (error) {
          if (error instanceof McpError) {
            throw error;
          }
          throw new McpError(
            ErrorCode.InternalError,
            `Tool execution failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    );
  }

  private async handleCreateAgent(args: any) {
    const { name, description } = CreateAgentArgsSchema.parse(args);

    try {
      // Use the existing createAgent function
      const { createAgent } = require("../commands/add-agent");

      const result = await createAgent(name, {
        description,
        silent: true,
      });

      return {
        content: [
          {
            type: "text",
            text: `${result.message}\nFiles created in: ${result.outputDir}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create agent: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async handleCreateTool(args: any) {
    const { name } = CreateToolArgsSchema.parse(args);

    try {
      // Use the existing addTool command
      const { addTool } = require("../commands/add-tool");

      // Call the command
      await addTool(name);

      return {
        content: [
          {
            type: "text",
            text: `Tool '${name}' created successfully.`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create tool: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async handlePlanAgent() {
    return {
      content: [
        {
          type: "text",
          text: "Please refer to the latest agent planning instructions at: https://pickaxe.hatchet.run/mcp/mcp-instructions.md",
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Pickaxe MCP server running on stdio");
  }
}

// Export for use in CLI command
