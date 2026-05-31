// ============================================================
// Competitive Landscape Monitor MCP — Market Context Tools
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  SaveMarketInputSchema,
  GetMarketInputSchema,
  ListMarketsInputSchema,
} from "../schemas/index.js";
import * as store from "../services/storage.js";
import { generateId, nowIso, truncate, asStructured } from "../services/helpers.js";

export function registerMarketTools(server: McpServer): void {

  // ─── Save / Update Market Context ──────────────────────────

  server.registerTool(
    "clm_save_market",
    {
      title: "Save Market Context",
      description: `Save or update the business context used to drive all competitive monitoring scans.

This is the FIRST TOOL to call before any scanning session. It stores the business profile that the Competitive Landscape Monitor skill uses to qualify threats, score competitors, and generate differentiation recommendations.

Captures: company name, product description, target customer, known competitors, adjacent categories, platform dependencies, core differentiators, known vulnerabilities, and monitoring cadence preference.

Pass market_id to UPDATE an existing context. Omit market_id to CREATE a new one.

Returns: the saved market context including its generated market_id (save this for all subsequent tool calls).

Examples:
- First-run setup: omit market_id, provide all fields
- Update a differentiator: provide market_id + updated core_differentiators array
- Change cadence: provide market_id + updated monitoring_cadence`,
      inputSchema: SaveMarketInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params) => {
      const now = nowIso();
      const id = params.market_id || generateId("market");

      const existing = params.market_id ? store.getMarket(params.market_id) : null;

      const market = store.saveMarket({
        id,
        company_name: params.company_name,
        product_description: params.product_description,
        target_customer: params.target_customer,
        known_competitors: params.known_competitors,
        adjacent_categories: params.adjacent_categories,
        platform_dependencies: params.platform_dependencies,
        core_differentiators: params.core_differentiators,
        known_vulnerabilities: params.known_vulnerabilities,
        monitoring_cadence: params.monitoring_cadence,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      });

      const output = { success: true, market };
      return {
        content: [{ type: "text" as const, text: truncate(JSON.stringify(output, null, 2)) }],
        structuredContent: asStructured(output),
      };
    }
  );

  // ─── Get Market Context ──────────────────────────────────────

  server.registerTool(
    "clm_get_market",
    {
      title: "Get Market Context",
      description: `Retrieve the stored business context for a market by its ID.

Use this to review the current market setup before running a scan, or to verify that context is up to date.

Returns: full market context including company profile, differentiators, platform dependencies, and monitoring cadence.

Errors: returns error message if market_id not found.`,
      inputSchema: GetMarketInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params) => {
      const market = store.getMarket(params.market_id);
      if (!market) {
        return {
          content: [{ type: "text" as const, text: `Error: Market context '${params.market_id}' not found. Use clm_save_market to create one.` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: truncate(JSON.stringify(market, null, 2)) }],
        structuredContent: asStructured(market),
      };
    }
  );

  // ─── List All Markets ────────────────────────────────────────

  server.registerTool(
    "clm_list_markets",
    {
      title: "List All Market Contexts",
      description: `List all stored market contexts.

Use when managing multiple clients or products, or when you need to find the market_id for a subsequent tool call.

Returns: array of market contexts with their IDs, company names, and last-updated timestamps.`,
      inputSchema: ListMarketsInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const markets = store.listMarkets();
      const summary = markets.map((m) => ({
        market_id: m.id,
        company_name: m.company_name,
        monitoring_cadence: m.monitoring_cadence,
        updated_at: m.updated_at,
      }));
      const output = { count: markets.length, markets: summary };
      return {
        content: [{ type: "text" as const, text: truncate(JSON.stringify(output, null, 2)) }],
        structuredContent: asStructured(output),
      };
    }
  );
}
