// ============================================================
// Competitive Landscape Monitor MCP — Competitor Tools
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  SaveCompetitorInputSchema,
  GetCompetitorInputSchema,
  ListCompetitorsInputSchema,
  DeleteCompetitorInputSchema,
  ScoreThreatInputSchema,
} from "../schemas/index.js";
import * as store from "../services/storage.js";
import {
  generateId,
  nowIso,
  truncate,
  asStructured,
  formatCompetitorBrief,
  calculateThreatLevel,
  recommendedResponseForLevel,
  threatLabel,
} from "../services/helpers.js";
import type { ThreatLevel } from "../types.js";

export function registerCompetitorTools(server: McpServer): void {

  // ─── Score Threat Level ───────────────────────────────────────

  server.registerTool(
    "clm_score_threat",
    {
      title: "Score Competitor Threat Level",
      description: `Calculate a competitor's threat level using the four-dimension scoring system from the Competitive Landscape Monitor methodology.

Scoring dimensions (from the skill):
- capability: 0=vaporware, 1=limited functionality, 2=basic features work, 3=robust and mature
- traction: 0=no customers, 1=some early users, 2=active customer base, 3=large audience and well-known
- funding_resources: 0=bootstrapped, 1=some funding or backing, 2=well-funded ($1M+) or major company
- strategic_position: 0=niche/peripheral, 1=direct competitor overlapping positioning, 2=platform-level or category-defining

Scores sum to a total (max 10) which maps to a threat level 1-10 and recommended response strategy.

Use BEFORE calling clm_save_competitor to get the threat_level to pass in.

Returns: score breakdown, total, threat level, threat label, and recommended response.`,
      inputSchema: ScoreThreatInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params) => {
      const breakdown = calculateThreatLevel(
        params.capability,
        params.traction,
        params.funding_resources,
        params.strategic_position
      );
      const recommended_response = recommendedResponseForLevel(breakdown.threat_level);
      const label = threatLabel(breakdown.threat_level);

      const output = {
        competitor_name: params.competitor_name,
        score_breakdown: {
          capability: `${params.capability}/3`,
          traction: `${params.traction}/3`,
          funding_resources: `${params.funding_resources}/2`,
          strategic_position: `${params.strategic_position}/2`,
          total: `${breakdown.total}/10`,
        },
        threat_level: breakdown.threat_level,
        threat_label: label,
        recommended_response,
        interpretation: `Threat level ${breakdown.threat_level}: ${label}. Recommended action: ${recommended_response.replace(/_/g, " ")}.`,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: asStructured(output),
      };
    }
  );

  // ─── Save / Update Competitor ─────────────────────────────────

  server.registerTool(
    "clm_save_competitor",
    {
      title: "Save Competitor Profile",
      description: `Save or update a competitor intelligence profile.

Call clm_score_threat first to calculate the correct threat_level to pass here.

Stores the full structured competitor profile matching the skill's JSON output format:
competitor name, category, threat level, what they do, target audience, pricing, key features, 
positioning angle, lifecycle stage, differentiation points, threat/weakness signals, 
recommended response, monitoring priority, and sources.

Pass competitor_id to UPDATE an existing profile. Omit to CREATE a new one.

The profile is linked to a market context via market_id — this determines which business 
context is used for differentiation comparisons.

Returns: the saved competitor profile including its generated ID.

Important: At minimum 2 verified sources should be captured before saving a profile at threat level 5+.`,
      inputSchema: SaveCompetitorInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params) => {
      const now = nowIso();
      const id = params.competitor_id || generateId("comp");

      const existing = params.competitor_id ? store.getCompetitor(params.competitor_id) : null;

      const competitor = store.saveCompetitor({
        id,
        market_id: params.market_id,
        competitor_name: params.competitor_name,
        product_name: params.product_name,
        competitor_category: params.competitor_category,
        threat_level: params.threat_level,
        what_they_do: params.what_they_do,
        target_audience: params.target_audience,
        pricing: params.pricing,
        key_features: params.key_features,
        positioning_angle: params.positioning_angle,
        stage: params.stage,
        differentiation_for_us: params.differentiation_for_us,
        threat_signals: params.threat_signals,
        weakness_signals: params.weakness_signals,
        recommended_response: params.recommended_response,
        monitoring_priority: params.monitoring_priority,
        sources: params.sources,
        first_seen: existing?.first_seen ?? now,
        last_verified: now,
      });

      const output = { success: true, competitor_id: id, competitor };
      return {
        content: [{ type: "text" as const, text: truncate(JSON.stringify(output, null, 2)) }],
        structuredContent: asStructured(output),
      };
    }
  );

  // ─── Get Competitor ───────────────────────────────────────────

  server.registerTool(
    "clm_get_competitor",
    {
      title: "Get Competitor Profile",
      description: `Retrieve a full competitor intelligence profile by ID.

Returns: complete competitor profile including threat level, scoring signals, differentiation points, 
recommended response, and verified sources.

Also returns a formatted strategic brief in Markdown matching the skill's Part 2 output format.

Errors: returns error message if competitor_id not found.`,
      inputSchema: GetCompetitorInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params) => {
      const competitor = store.getCompetitor(params.competitor_id);
      if (!competitor) {
        return {
          content: [{ type: "text" as const, text: `Error: Competitor '${params.competitor_id}' not found.` }],
          isError: true,
        };
      }

      const brief = formatCompetitorBrief(competitor);
      const output = { competitor, strategic_brief: brief };
      return {
        content: [{ type: "text" as const, text: truncate(`${brief}\n\n---\n\n${JSON.stringify(competitor, null, 2)}`) }],
        structuredContent: asStructured(output),
      };
    }
  );

  // ─── List Competitors ─────────────────────────────────────────

  server.registerTool(
    "clm_list_competitors",
    {
      title: "List Competitor Profiles",
      description: `List stored competitor profiles with optional filtering.

Filters available:
- market_id: only competitors for a specific market context
- min_threat_level: only competitors at or above a threat threshold (e.g., 5 for active monitors)
- category: filter by direct | adjacent | platform | indirect
- monitoring_priority: filter by low | medium | high

Returns: sorted list of competitors by threat level (highest first), with profile summaries and strategic briefs.

Use this to get a full watchlist overview before a scan session, or to review all high-threat competitors across a market.`,
      inputSchema: ListCompetitorsInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (params) => {
      let competitors = store.listCompetitors(params.market_id);

      if (params.min_threat_level !== undefined) {
        competitors = competitors.filter((c) => c.threat_level >= (params.min_threat_level as number));
      }
      if (params.category) {
        competitors = competitors.filter((c) => c.competitor_category === params.category);
      }
      if (params.monitoring_priority) {
        competitors = competitors.filter((c) => c.monitoring_priority === params.monitoring_priority);
      }

      // Sort by threat level descending
      competitors.sort((a, b) => b.threat_level - a.threat_level);

      const summaries = competitors.map((c) => ({
        competitor_id: c.id,
        competitor_name: c.competitor_name,
        category: c.competitor_category,
        threat_level: c.threat_level,
        threat_label: threatLabel(c.threat_level as ThreatLevel),
        stage: c.stage,
        recommended_response: c.recommended_response,
        monitoring_priority: c.monitoring_priority,
        last_verified: c.last_verified,
      }));

      const output = { count: summaries.length, competitors: summaries };
      return {
        content: [{ type: "text" as const, text: truncate(JSON.stringify(output, null, 2)) }],
        structuredContent: asStructured(output),
      };
    }
  );

  // ─── Delete Competitor ────────────────────────────────────────

  server.registerTool(
    "clm_delete_competitor",
    {
      title: "Delete Competitor Profile",
      description: `Permanently delete a competitor profile from storage.

Use when a competitor has pivoted away from the market, shut down, or was confirmed as vaporware and no longer warrants tracking.

This action is irreversible. Consider updating the stage to 'declining' instead of deleting if historical context may be useful.

Returns: confirmation of deletion or error if not found.`,
      inputSchema: DeleteCompetitorInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async (params) => {
      const deleted = store.deleteCompetitor(params.competitor_id);
      if (!deleted) {
        return {
          content: [{ type: "text" as const, text: `Error: Competitor '${params.competitor_id}' not found.` }],
          isError: true,
        };
      }
      const output = { success: true, deleted_id: params.competitor_id };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        structuredContent: asStructured(output),
      };
    }
  );
}
