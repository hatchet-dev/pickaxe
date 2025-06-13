// Import and start the MCP server directly
export async function startMcp() {
  try {
    // Import the server class and run it directly
    const { PickaxeMcpServer } = require('../mcp/server');
    const server = new PickaxeMcpServer();
    await server.run();
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}