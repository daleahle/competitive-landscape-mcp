// ============================================================
// Competitive Landscape Monitor MCP — Type Definitions
// ============================================================

export type CompetitorCategory = "direct" | "adjacent" | "platform" | "indirect";
export type CompetitorStage = "rumor" | "launched" | "funded" | "scaling" | "established" | "declining";
export type RecommendedResponse = "ignore" | "monitor" | "differentiate" | "address_publicly" | "pivot_consideration";
export type MonitoringPriority = "low" | "medium" | "high";
export type ScanScope = "full" | "direct_only" | "platform_watch" | "specific_check" | "funding_watch" | "trend_scan";
export type ThreatLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface CompetitorSource {
  url: string;
  type: "website" | "press_release" | "social" | "review" | "news" | "funding_database" | "product_hunt" | "official_announcement";
  date: string;
}

export interface CompetitorProfile {
  id: string;
  competitor_name: string;
  product_name?: string;
  competitor_category: CompetitorCategory;
  threat_level: ThreatLevel;
  what_they_do: string;
  target_audience: string;
  pricing: string;
  key_features: string[];
  positioning_angle: string;
  stage: CompetitorStage;
  differentiation_for_us: string[];
  threat_signals: string[];
  weakness_signals: string[];
  recommended_response: RecommendedResponse;
  monitoring_priority: MonitoringPriority;
  sources: CompetitorSource[];
  first_seen: string;
  last_verified: string;
  market_id: string;
}

export interface ThreatScoreBreakdown {
  capability: 0 | 1 | 2 | 3;
  traction: 0 | 1 | 2 | 3;
  funding_resources: 0 | 1 | 2;
  strategic_position: 0 | 1 | 2;
  total: number;
  threat_level: ThreatLevel;
}

export interface MarketContext {
  id: string;
  company_name: string;
  product_description: string;
  target_customer: string;
  known_competitors: string[];
  adjacent_categories: string[];
  platform_dependencies: string[];
  core_differentiators: string[];
  known_vulnerabilities: string[];
  monitoring_cadence: "weekly" | "monthly" | "as_needed";
  created_at: string;
  updated_at: string;
}

export interface ScanReport {
  id: string;
  market_id: string;
  scan_date: string;
  scope: ScanScope;
  summary: string;
  competitors_found: string[];  // competitor IDs
  threat_distribution: Record<string, number>;
  key_findings: string[];
  recommendations: string[];
  next_scan_date?: string;
}

export interface ThreatSignalUpdate {
  competitor_id: string;
  signal_type: "funding" | "launch" | "pivot" | "platform_feature" | "acquisition" | "decline";
  description: string;
  source_url?: string;
  detected_date: string;
  previous_threat_level: ThreatLevel;
  new_threat_level: ThreatLevel;
}
