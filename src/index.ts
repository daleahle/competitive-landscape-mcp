// ============================================================
// Competitive Landscape Monitor — MCP Server
// ============================================================
// Hosted at: https://takecareofmy.com/competitive-landscape-monitor
//
// Transport: set env var TRANSPORT=http for remote hosting
//            default (no var) = stdio for Claude Desktop / local
//
// Data dir:  set env var DATA_DIR=/path/to/data to customize
//            default = ./data relative to build output
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerMarketTools } from "./tools/market.js";
import { registerCompetitorTools } from "./tools/competitors.js";
import { registerScanTools } from "./tools/scans.js";

// ─── Build Server ─────────────────────────────────────────────

function buildServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerMarketTools(server);
  registerCompetitorTools(server);
  registerScanTools(server);

  return server;
}

// ─── stdio Transport (Claude Desktop / local) ─────────────────

async function runStdio(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running via stdio`);
}

// ─── HTTP Transport (Remote hosting / Claude.ai connector) ────

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: SERVER_NAME, version: SERVER_VERSION });
  });

  // MCP endpoint — new stateless transport per request
  app.post("/mcp", async (req, res) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.error(`${SERVER_NAME} v${SERVER_VERSION} running on http://localhost:${port}/mcp`);
  });
}

// ─── Entry Point ──────────────────────────────────────────────

const transport = process.env.TRANSPORT ?? "stdio";
if (transport === "http") {
  runHTTP().catch((err: unknown) => {
    console.error("Server error:", err);
    process.exit(1);
  });
} else {
  runStdio().catch((err: unknown) => {
    console.error("Server error:", err);
    process.exit(1);
  });
}
