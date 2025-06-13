const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} = require('@modelcontextprotocol/sdk/types.js');
const { z } = require('zod');
const { promises: fs } = require('fs');
const path = require('path');

// Schema for tool arguments
const CreateAgentArgsSchema = z.object({
  name: z.string().describe('Name of the agent to create'),
  description: z.string().describe('Description of what the agent does'),
});

const CreateComponentArgsSchema = z.object({
  name: z.string().describe('Name of the component to create'),
  type: z.string().optional().describe('Type of component (default: "default")'),
});

const CreateToolArgsSchema = z.object({
  name: z.string().describe('Name of the tool to create'),
  category: z.string().optional().describe('Category of the tool (default: "utility")'),
});

export class PickaxeMcpServer {
  private server: any;

  constructor() {
    this.server = new Server(
      {
        name: 'pickaxe-mcp-server',
        version: '1.0.0',
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
            name: 'create_agent',
            description: 'Create a new AI agent with a simple interface that has a name, description, and execute method',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the agent to create',
                },
                description: {
                  type: 'string',
                  description: 'Description of what the agent does',
                },
              },
              required: ['name', 'description'],
            },
          },
          {
            name: 'create_component',
            description: 'Create a new React component with TypeScript support, including tests and documentation',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the component to create',
                },
                type: {
                  type: 'string',
                  description: 'Type of component (default: "default")',
                },
              },
              required: ['name'],
            },
          },
          {
            name: 'create_tool',
            description: 'Create a new utility tool with specified category and functionality',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the tool to create',
                },
                category: {
                  type: 'string',
                  description: 'Category of the tool (default: "utility")',
                },
              },
              required: ['name'],
            },
          },
          {
            name: 'list_agents',
            description: 'List all created agents in the agents directory',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_agent_info',
            description: 'Get detailed information about a specific agent',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the agent to get information about',
                },
              },
              required: ['name'],
            },
          },
        ],
      };
    });
  }

  private setupRequestHandlers() {
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'create_agent':
            return await this.handleCreateAgent(args);
          case 'create_component':
            return await this.handleCreateComponent(args);
          case 'create_tool':
            return await this.handleCreateTool(args);
          case 'list_agents':
            return await this.handleListAgents();
          case 'get_agent_info':
            return await this.handleGetAgentInfo(args);
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
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private async handleCreateAgent(args: any) {
    const { name, description } = CreateAgentArgsSchema.parse(args);
    
    try {
      // Use the existing createAgent function
      const { createAgent } = require('../commands/add-agent');
      
      const result = await createAgent(name, { 
        description, 
        silent: true 
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `${result.message}\nFiles created in: ${result.outputDir}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleCreateComponent(args: any) {
    const { name, type = 'default' } = CreateComponentArgsSchema.parse(args);
    
    try {
      // Use the existing addComponent command
      const { addComponent } = require('../commands/add-component');
      
      // Call the command - note: this currently just logs placeholder text
      await addComponent(name, { type });
      
      return {
        content: [
          {
            type: 'text',
            text: `Component creation requested: '${name}' of type '${type}'. (Command executed, but component templates not yet implemented)`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create component: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleCreateTool(args: any) {
    const { name, category = 'utility' } = CreateToolArgsSchema.parse(args);
    
    try {
      // Use the existing addTool command
      const { addTool } = require('../commands/add-tool');
      
      // Call the command - note: this currently just logs placeholder text
      await addTool(name, { category });
      
      return {
        content: [
          {
            type: 'text',
            text: `Tool creation requested: '${name}' in category '${category}'. (Command executed, but tool templates not yet implemented)`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create tool: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleListAgents() {
    try {
      // Use the existing listAgents utility
      const { listAgents } = require('../utils');
      const agents = await listAgents();

      if (agents.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No agents found. Create your first agent with the create_agent tool.',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Found ${agents.length} agents:\n${agents.map((name: any) => `- ${name}`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list agents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleGetAgentInfo(args: any) {
    const { name } = z.object({ name: z.string() }).parse(args);
    
    try {
      // Use the existing getAgentInfo utility
      const { getAgentInfo } = require('../utils');
      const agentInfo = await getAgentInfo(name);

      if (!agentInfo) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Agent '${name}' not found`
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Agent: ${agentInfo.name}\nDescription: ${agentInfo.description}\nLocation: ${agentInfo.location}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get agent info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Pickaxe MCP server running on stdio');
  }
}

// Export for use in CLI command