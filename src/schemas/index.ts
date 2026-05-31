// ============================================================
// Competitive Landscape Monitor MCP — Zod Schemas
// ============================================================

import { z } from "zod";

// ─── Shared Enums ─────────────────────────────────────────────

export const CompetitorCategorySchema = z.enum(["direct", "adjacent", "platform", "indirect"]);
export const CompetitorStageSchema = z.enum(["rumor", "launched", "funded", "scaling", "established", "declining"]);
export const RecommendedResponseSchema = z.enum(["ignore", "monitor", "differentiate", "address_publicly", "pivot_consideration"]);
export const MonitoringPrioritySchema = z.enum(["low", "medium", "high"]);
export const ScanScopeSchema = z.enum(["full", "direct_only", "platform_watch", "specific_check", "funding_watch", "trend_scan"]);
export const SignalTypeSchema = z.enum(["funding", "launch", "pivot", "platform_feature", "acquisition", "decline"]);
export const SourceTypeSchema = z.enum(["website", "press_release", "social", "review", "news", "funding_database", "product_hunt", "official_announcement"]);

export const ThreatLevelSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  z.literal(6), z.literal(7), z.literal(8), z.literal(9), z.literal(10),
]);

export const CapabilityScoreSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export const TractionScoreSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export const FundingScoreSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export const PositionScoreSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

// ─── Market Context Tools ─────────────────────────────────────

export const SaveMarketInputSchema = z.object({
  company_name: z.string().min(1).max(200).describe("Company or product name being monitored"),
  product_description: z.string().min(10).max(500).describe("One sentence describing what you offer"),
  target_customer: z.string().min(5).max(300).describe("Who is your ideal buyer or user"),
  known_competitors: z.array(z.string()).describe("Any competitors already on your radar"),
  adjacent_categories: z.array(z.string()).describe("Industries or product types that could pivot into your space"),
  platform_dependencies: z.array(z.string()).describe("Platforms, marketplaces, or APIs your business depends on"),
  core_differentiators: z.array(z.string()).describe("What makes your product genuinely different or better"),
  known_vulnerabilities: z.array(z.string()).describe("Where a well-funded competitor could hurt you most"),
  monitoring_cadence: z.enum(["weekly", "monthly", "as_needed"]).describe("Preferred scan frequency"),
  market_id: z.string().optional().describe("Existing market ID to update, or omit to create new"),
}).strict();

export const GetMarketInputSchema = z.object({
  market_id: z.string().min(1).describe("Market context ID to retrieve"),
}).strict();

export const ListMarketsInputSchema = z.object({}).strict();

// ─── Competitor Profile Tools ─────────────────────────────────

export const SaveCompetitorInputSchema = z.object({
  market_id: z.string().min(1).describe("Market context this competitor belongs to"),
  competitor_id: z.string().optional().describe("Existing competitor ID to update, or omit to create new"),
  competitor_name: z.string().min(1).max(200).describe("Company or product name"),
  product_name: z.string().optional().describe("Specific product/service name if different from company"),
  competitor_category: CompetitorCategorySchema.describe("direct | adjacent | platform | indirect"),
  threat_level: ThreatLevelSchema.describe("Threat score 1-10 (use score_threat tool to calculate)"),
  what_they_do: z.string().min(10).max(500).describe("1-2 sentence plain English description"),
  target_audience: z.string().min(5).max(300).describe("Who they are targeting"),
  pricing: z.string().max(200).describe("Visible pricing or 'unknown'"),
  key_features: z.array(z.string()).describe("Their main features or capabilities"),
  positioning_angle: z.string().max(300).describe("How they pitch themselves"),
  stage: CompetitorStageSchema.describe("rumor | launched | funded | scaling | established | declining"),
  differentiation_for_us: z.array(z.string()).describe("How your product is different/better based on stated differentiators"),
  threat_signals: z.array(z.string()).describe("Specific signs that elevate threat level"),
  weakness_signals: z.array(z.string()).describe("Specific signs that reduce threat level"),
  recommended_response: RecommendedResponseSchema.describe("ignore | monitor | differentiate | address_publicly | pivot_consideration"),
  monitoring_priority: MonitoringPrioritySchema.describe("low | medium | high"),
  sources: z.array(z.object({
    url: z.string().url(),
    type: SourceTypeSchema,
    date: z.string(),
  })).describe("Verified sources confirming this competitor exists"),
}).strict();

export const GetCompetitorInputSchema = z.object({
  competitor_id: z.string().min(1).describe("Competitor ID to retrieve"),
}).strict();

export const ListCompetitorsInputSchema = z.object({
  market_id: z.string().optional().describe("Filter by market ID (omit for all markets)"),
  min_threat_level: z.number().int().min(1).max(10).optional().describe("Only return competitors at or above this threat level"),
  category: CompetitorCategorySchema.optional().describe("Filter by competitor category"),
  monitoring_priority: MonitoringPrioritySchema.optional().describe("Filter by monitoring priority"),
}).strict();

export const DeleteCompetitorInputSchema = z.object({
  competitor_id: z.string().min(1).describe("Competitor ID to delete"),
}).strict();

// ─── Threat Scoring Tool ──────────────────────────────────────

export const ScoreThreatInputSchema = z.object({
  competitor_name: z.string().min(1).describe("Name of the competitor being scored"),
  capability: CapabilityScoreSchema.describe("0=vaporware, 1=limited, 2=basic features, 3=robust and mature"),
  traction: TractionScoreSchema.describe("0=no customers, 1=some early, 2=active base, 3=large audience"),
  funding_resources: FundingScoreSchema.describe("0=bootstrapped, 1=some funding, 2=well-funded $1M+"),
  strategic_position: PositionScoreSchema.describe("0=niche, 1=direct competitor, 2=platform-level or category-defining"),
}).strict();

// ─── Scan Report Tools ────────────────────────────────────────

export const SaveScanReportInputSchema = z.object({
  market_id: z.string().min(1).describe("Market context this scan covers"),
  scope: ScanScopeSchema.describe("full | direct_only | platform_watch | specific_check | funding_watch | trend_scan"),
  summary: z.string().min(10).max(1000).describe("1-3 sentence summary of what was found"),
  competitors_found: z.array(z.string()).describe("Competitor IDs identified or updated during this scan"),
  threat_distribution: z.record(z.string(), z.number()).describe("Count of competitors per threat level bucket, e.g. {'1-2': 3, '5-6': 1}"),
  key_findings: z.array(z.string()).describe("Most important intelligence from this scan"),
  recommendations: z.array(z.string()).describe("Specific recommended actions"),
  next_scan_date: z.string().optional().describe("ISO date string for next scheduled scan"),
}).strict();

export const ListScanReportsInputSchema = z.object({
  market_id: z.string().optional().describe("Filter by market ID"),
  limit: z.number().int().min(1).max(50).default(10).describe("Number of reports to return, most recent first"),
}).strict();

// ─── Threat Signal Tool ───────────────────────────────────────

export const LogThreatSignalInputSchema = z.object({
  competitor_id: z.string().min(1).describe("Competitor ID this signal applies to"),
  signal_type: SignalTypeSchema.describe("funding | launch | pivot | platform_feature | acquisition | decline"),
  description: z.string().min(10).max(500).describe("What changed and why it matters"),
  source_url: z.string().url().optional().describe("Source confirming the signal"),
  previous_threat_level: ThreatLevelSchema.describe("Threat level before this signal"),
  new_threat_level: ThreatLevelSchema.describe("Updated threat level after this signal"),
}).strict();

export const ListThreatSignalsInputSchema = z.object({
  competitor_id: z.string().optional().describe("Filter signals for a specific competitor (omit for all)"),
  limit: z.number().int().min(1).max(50).default(20).describe("Number of signals to return, most recent first"),
}).strict();

// ─── Summary Report Tool ──────────────────────────────────────

export const GenerateSummaryReportInputSchema = z.object({
  market_id: z.string().min(1).describe("Market ID to generate summary for"),
  min_threat_level: z.number().int().min(1).max(10).default(1).describe("Only include competitors at or above this level"),
}).strict();
