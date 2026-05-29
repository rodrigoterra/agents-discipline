// Entry point: a stdio MCP server exposing the annotation tool. This is the
// portable core — any MCP client (Claude Code, Codex, …) can spawn it.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAnnotateTool } from "./annotate-tool";

const server = new McpServer({ name: "screenshot-annotator", version: "1.0.0" });
registerAnnotateTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[screenshot-annotator] MCP server ready");
