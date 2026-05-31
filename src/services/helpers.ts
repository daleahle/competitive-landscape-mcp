// ============================================================
// Competitive Landscape Monitor MCP — Utility Helpers
// ============================================================

import { SCORE_TO_THREAT, RESPONSE_FOR_THREAT, CHARACTER_LIMIT } from "../constants.js";
import type { ThreatLevel, RecommendedResponse, ThreatScoreBreakdown } from "../types.js";

// ─── ID Generation ────────────────────────────────────────────

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Threat Scoring ───────────────────────────────────────────

/**
 * Calculate threat level from the skill's four-dimension scoring system.
 * Capability: 0-3, Traction: 0-3, Funding: 0-2, Strategic Position: 0-2
 * Total max = 10, maps directly to threat level 1-10.
 */
export function calculateThreatLevel(
  capability: 0 | 1 | 2 | 3,
  traction: 0 | 1 | 2 | 3,
  funding_resources: 0 | 1 | 2,
  strategic_position: 0 | 1 | 2
): ThreatScoreBreakdown {
  const total = capability + traction + funding_resources + strategic_position;
  const entry = SCORE_TO_THREAT.find((e) => total <= e.maxScore);
  const level = (entry?.level ?? 10) as ThreatLevel;
  return { capability, traction, funding_resources, strategic_position, total, threat_level: level };
}

export function recommendedResponseForLevel(level: ThreatLevel): RecommendedResponse {
  if (level <= 2) return "ignore";
  if (level <= 4) return "monitor";
  if (level <= 6) return "differentiate";
  if (level <= 8) return "address_publicly";
  return "pivot_consideration";
}

export function threatLabel(level: ThreatLevel): string {
  if (level <= 2) return "Ignore";
  if (level <= 4) return "Background Monitor";
  if (level <= 6) return "Active Monitor";
  if (level <= 8) return "Strategic Concern";
  return "⚠️ EXISTENTIAL";
}

// ─── Response Formatting ─────────────────────────────────────

// The MCP SDK requires structuredContent to have an index signature.
// This helper casts any typed object to satisfy that constraint.
export function asStructured(obj: unknown): Record<string, unknown> {
  return obj as Record<string, unknown>;
}

export function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return text.slice(0, CHARACTER_LIMIT) + "\n\n[Response truncated — use filters to narrow results]";
}

export function formatCompetitorBrief(competitor: {
  competitor_name: string;
  threat_level: ThreatLevel;
  competitor_category: string;
  what_they_do: string;
  stage: string;
  recommended_response: RecommendedResponse;
  differentiation_for_us: string[];
  threat_signals: string[];
  weakness_signals: string[];
}): string {
  return `## ${competitor.competitor_name}
**Threat:** ${competitor.threat_level}/10 — ${threatLabel(competitor.threat_level as ThreatLevel)} (${competitor.competitor_category})
**Stage:** ${competitor.stage}
**What they do:** ${competitor.what_they_do}

**Why we're different:**
${competitor.differentiation_for_us.map((d) => `- ${d}`).join("\n")}

**Threat signals:**
${competitor.threat_signals.length > 0 ? competitor.threat_signals.map((s) => `- ${s}`).join("\n") : "- None identified"}

**Weakness signals:**
${competitor.weakness_signals.length > 0 ? competitor.weakness_signals.map((s) => `- ${s}`).join("\n") : "- None identified"}

**Recommended action:** ${competitor.recommended_response.replace(/_/g, " ").toUpperCase()}`;
}
