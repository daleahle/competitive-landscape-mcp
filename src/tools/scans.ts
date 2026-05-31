// ============================================================
// Competitive Landscape Monitor MCP — Scan & Signal Tools
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  SaveScanReportInputSchema,
  ListScanReportsInputSchema,
  LogThreatSignalInputSchema,
  ListThreatSignalsInputSchema,
  GenerateSummaryReportInputSchema,
} from "../schemas/index.js";
import * as store from "../services/storage.js";
import { generateId, nowIso, truncate, asStructured, threatLabel, formatCompetitorBrief } from "../services/helpers.js";
import type { ThreatLevel } from "../types.js";

export function registerScanTools(server: McpServer): void {

  // ─── Save Scan Report ─────────────────────────────────────────

  server.registerTool(
    "clm_save_scan_report",
    {
      title: "Save Scan Report",
      description: `Log a completed competitive monitoring scan session.

Call this at the END of every scan session to build historical intelligence. Over time, these reports reveal patterns — are threats escalating or declining, are new entrants appearing in waves, is a platform creeping into the space.

Captures: market context, scan scope, plain English summary, list of competitor IDs found or updated, threat distribution breakdown, key findings, actionable recommendations, and next scheduled scan date.

Returns: the saved report with a generated report ID.

Good scan summaries follow the skill's reporting discipline:
- "No new direct competitors identified. One adjacent product noted at low threat."
- NOT: "Found 12 potential competitors!" (that's noise, not intelligence)`,
      inputSchema: SaveScanReportInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (params) => {
      const report = store.saveScanReport({
        id: generateId("scan"),
        market_id: params.market_id,
        scan_date: nowIso(),
        scope: params.scope,
        summary: params.summary,
        competitors_found: params.competitors_found,
        threat_distribution: params.threat_distribution,
        key_findings: params.key_findings,
        recommendations: params.recommendations,
        next_scan_date: params.next_scan_date,
      });

      const output = { success: true, report_id: report.id, report };
      return {
        content: [{ type: "text" as const, text: truncate(JSON.stringify(output, null, 2)) }],
        structuredContent: asStructured(output),
      };
    }
  );

  // ─── List Scan Reports ────────────────────────────────────────

  server.registerTool(
    "clm_list_scan_reports",
    {
      title: "List Scan Reports",
      description: `Retrieve past scan report history, most recent first.

Use to review scan history, identify trends in competitive activity over time, or check when the last scan was run.

Filters:
- market_id: only reports for a specific market
- limit: how many reports to return (default 10, max 50)

Returns: scan reports sorted by date descending, including summary, key findings, and recommendations from each session.`,
      inputSchema: ListScanReportsInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params) => {
      const reports = store.listScanReports(params.market_id, params.limit);
      const output = { count: reports.length, reports };
      return {
        content: [{ type: "text" as const, text: truncate(JSON.stringify(output, null, 2)) }],
        structuredContent: asStructured(output),
      };
    }
  );

  // ─── Log Threat Signal ────────────────────────────────────────

  server.registerTool(
    "clm_log_threat_signal",
    {
      title: "Log Threat Signal Update",
      description: `Record a significant change event for a tracked competitor.

Use when a monitored competitor triggers a material change:
- funding: new funding round announced
- launch: product launched or major update released
- pivot: competitor changed their target market or product direction
- platform_feature: a platform the business depends on released a competing native feature
- acquisition: competitor was acquired (by a larger player = higher threat; shutting down = lower)
- decline: competitor showing visible decline signals (low reviews, pivoting away, losing team)

Records the previous and new threat levels so trend analysis is possible over time.

The platform_feature signal type should default to threat level 9-10 per the skill methodology — these are existential threats.

Returns: logged signal with timestamp.`,
      inputSchema: LogThreatSignalInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (params) => {
      const competitor = store.getCompetitor(params.competitor_id);
      if (!competitor) {
        return {
          content: [{ type: "text" as const, text: `Error: Competitor '${params.competitor_id}' not found. Save the competitor first with clm_save_competitor.` }],
          isError: true,
        };
      }

      const signal = store.saveThreatSignal({
        competitor_id: params.competitor_id,
        signal_type: params.signal_type,
        description: params.description,
        source_url: params.source_url,
        detected_date: nowIso(),
        previous_threat_level: params.previous_threat_level,
        new_threat_level: params.new_threat_level,
      });

      const levelChanged = params.previous_threat_level !== params.new_threat_level;
      const escalated = params.new_threat_level > params.previous_threat_level;

      const output = {
        success: true,
        signal,
        competitor_name: competitor.competitor_name,
        level_changed: levelChanged,
        direction: levelChanged ? (escalated ? "ESCALATED" : "DE-ESCALATED") : "unchanged",
        alert: params.new_threat_level >= 9
          ? "⚠️ EXISTENTIAL THREAT LEVEL — Immediate strategic review recommended"
          : params.new_threat_level >= 7
          ? "Strategic concern — review with key stakeholders"
          : null,
      };

      return {
        content: [{ type: "text" as const, text: truncate(JSON.stringify(output, null, 2)) }],
        structuredContent: asStructured(output),
      };
    }
  );

  // ─── List Threat Signals ──────────────────────────────────────

  server.registerTool(
    "clm_list_threat_signals",
    {
      title: "List Threat Signal History",
      description: `Retrieve the history of threat signal changes, most recent first.

Use to review how the competitive landscape has evolved, identify escalating patterns, or prepare for a strategic review session.

Filters:
- competitor_id: signals for a specific competitor only (omit for all competitors)
- limit: number of signals to return (default 20, max 50)

Returns: signal events sorted by date descending, showing competitor name, signal type, description, source, and threat level change.`,
      inputSchema: ListThreatSignalsInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params) => {
      const signals = store.listThreatSignals(params.competitor_id, params.limit);

      // Enrich with competitor names
      const enriched = signals.map((s) => {
        const comp = store.getCompetitor(s.competitor_id);
        return {
          ...s,
          competitor_name: comp?.competitor_name ?? "Unknown",
          level_change: s.new_threat_level > s.previous_threat_level ? "↑ escalated"
            : s.new_threat_level < s.previous_threat_level ? "↓ de-escalated"
            : "→ unchanged",
        };
      });

      const output = { count: enriched.length, signals: enriched };
      return {
        content: [{ type: "text" as const, text: truncate(JSON.stringify(output, null, 2)) }],
        structuredContent: asStructured(output),
      };
    }
  );

  // ─── Generate Summary Report ──────────────────────────────────

  server.registerTool(
    "clm_generate_summary_report",
    {
      title: "Generate Competitive Landscape Summary Report",
      description: `Generate a full formatted competitive landscape summary report for a market.

Produces the skill's Multi-Competitor Summary Report format: threat level distribution, competitor profiles ranked by threat, strategic briefs for high-priority threats, and overall positioning assessment.

This is the tool to call when the user asks for a weekly/monthly scan summary, a board-level overview, or a "where do we stand competitively" briefing.

Filters:
- market_id: required — which market to summarize
- min_threat_level: only include competitors at or above this level (default 1 = all)

Returns: formatted Markdown report + structured JSON data for downstream use.`,
      inputSchema: GenerateSummaryReportInputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params) => {
      const market = store.getMarket(params.market_id);
      if (!market) {
        return {
          content: [{ type: "text" as const, text: `Error: Market context '${params.market_id}' not found.` }],
          isError: true,
        };
      }

      let competitors = store.listCompetitors(params.market_id);
      if (params.min_threat_level > 1) {
        competitors = competitors.filter((c) => c.threat_level >= params.min_threat_level);
      }
      competitors.sort((a, b) => b.threat_level - a.threat_level);

      const recentReports = store.listScanReports(params.market_id, 3);
      const recentSignals = store.listThreatSignals(undefined, 10)
        .filter((s) => competitors.some((c) => c.id === s.competitor_id));

      // Threat distribution
      const distribution: Record<string, number> = {
        "9-10 Existential": 0,
        "7-8 Strategic": 0,
        "5-6 Active Monitor": 0,
        "3-4 Background": 0,
        "1-2 Ignore": 0,
      };
      for (const c of competitors) {
        if (c.threat_level >= 9) distribution["9-10 Existential"]++;
        else if (c.threat_level >= 7) distribution["7-8 Strategic"]++;
        else if (c.threat_level >= 5) distribution["5-6 Active Monitor"]++;
        else if (c.threat_level >= 3) distribution["3-4 Background"]++;
        else distribution["1-2 Ignore"]++;
      }

      // Build report markdown
      const date = nowIso();
      let md = `# Competitive Landscape Summary — ${market.company_name}\n`;
      md += `**Report Date:** ${date}\n`;
      md += `**Market:** ${market.product_description}\n`;
      md += `**Target Customer:** ${market.target_customer}\n\n`;

      md += `## Threat Level Distribution\n`;
      for (const [label, count] of Object.entries(distribution)) {
        if (count > 0) md += `- **${label}:** ${count} competitor${count !== 1 ? "s" : ""}\n`;
      }
      md += "\n";

      if (recentSignals.length > 0) {
        md += `## Recent Movements\n`;
        for (const s of recentSignals.slice(0, 5)) {
          const comp = competitors.find((c) => c.id === s.competitor_id);
          md += `- **${comp?.competitor_name ?? s.competitor_id}** — ${s.signal_type.replace(/_/g, " ")}: ${s.description} (${s.detected_date})\n`;
        }
        md += "\n";
      }

      md += `## Competitor Intelligence\n\n`;

      if (competitors.length === 0) {
        md += `_No competitors tracked at this threshold level. Clean intelligence — no threats requiring action._\n\n`;
      } else {
        for (const c of competitors) {
          md += formatCompetitorBrief(c) + "\n\n---\n\n";
        }
      }

      md += `## Position Assessment\n`;
      md += `**Core differentiators to maintain:**\n`;
      for (const d of market.core_differentiators) md += `- ${d}\n`;
      md += `\n**Watch for vulnerabilities:**\n`;
      for (const v of market.known_vulnerabilities) md += `- ${v}\n`;
      md += `\n**Platform dependencies to monitor:**\n`;
      for (const p of market.platform_dependencies) md += `- ${p}\n`;

      if (recentReports.length > 0) {
        md += `\n## Recent Scan History\n`;
        for (const r of recentReports) {
          md += `- **${r.scan_date}** (${r.scope}): ${r.summary}\n`;
        }
      }

      md += `\n---\n_Generated by Competitive Landscape Monitor MCP — ${date}_\n`;

      const output = {
        report_markdown: md,
        market,
        competitor_count: competitors.length,
        threat_distribution: distribution,
        competitors: competitors.map((c) => ({
          competitor_id: c.id,
          name: c.competitor_name,
          threat_level: c.threat_level,
          threat_label: threatLabel(c.threat_level as ThreatLevel),
          recommended_response: c.recommended_response,
        })),
      };

      return {
        content: [{ type: "text" as const, text: truncate(md) }],
        structuredContent: asStructured(output),
      };
    }
  );
}
