// ============================================================
// Competitive Landscape Monitor MCP — Constants
// ============================================================

export const SERVER_NAME = "competitive-landscape-mcp-server";
export const SERVER_VERSION = "1.0.0";

export const CHARACTER_LIMIT = 50_000;

// Threat level thresholds derived from skill scoring methodology
export const THREAT_THRESHOLDS = {
  IGNORE_MAX: 2,
  MONITOR_MAX: 4,
  ACTIVE_MONITOR_MAX: 6,
  STRATEGIC_CONCERN_MAX: 8,
  EXISTENTIAL_MIN: 9,
} as const;

// Score ranges for threat level calculation
export const SCORE_TO_THREAT: Array<{ maxScore: number; level: number }> = [
  { maxScore: 2, level: 2 },
  { maxScore: 4, level: 4 },
  { maxScore: 6, level: 6 },
  { maxScore: 8, level: 8 },
  { maxScore: 10, level: 10 },
];

export const RESPONSE_FOR_THREAT: Record<string, string> = {
  "1-2": "ignore",
  "3-4": "monitor",
  "5-6": "differentiate",
  "7-8": "address_publicly",
  "9-10": "pivot_consideration",
};

// Storage keys for in-memory store
export const STORE_KEYS = {
  MARKETS: "markets",
  COMPETITORS: "competitors",
  SCAN_REPORTS: "scan_reports",
  THREAT_SIGNALS: "threat_signals",
} as const;
