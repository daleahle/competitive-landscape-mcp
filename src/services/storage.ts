// ============================================================
// Competitive Landscape Monitor MCP — Storage Service
// ============================================================
// File-based JSON persistence. Swap the read/write methods
// for a real DB (MySQL, Postgres, SQLite) when ready.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type {
  MarketContext,
  CompetitorProfile,
  ScanReport,
  ThreatSignalUpdate,
} from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "../../data");

interface Store {
  markets: Record<string, MarketContext>;
  competitors: Record<string, CompetitorProfile>;
  scan_reports: Record<string, ScanReport>;
  threat_signals: ThreatSignalUpdate[];
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getStorePath(): string {
  return join(DATA_DIR, "store.json");
}

function loadStore(): Store {
  ensureDataDir();
  const path = getStorePath();
  if (!existsSync(path)) {
    return { markets: {}, competitors: {}, scan_reports: {}, threat_signals: [] };
  }
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as Store;
  } catch {
    return { markets: {}, competitors: {}, scan_reports: {}, threat_signals: [] };
  }
}

function saveStore(store: Store): void {
  ensureDataDir();
  writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf-8");
}

// ─── Market Context ──────────────────────────────────────────

export function saveMarket(market: MarketContext): MarketContext {
  const store = loadStore();
  store.markets[market.id] = market;
  saveStore(store);
  return market;
}

export function getMarket(id: string): MarketContext | null {
  const store = loadStore();
  return store.markets[id] ?? null;
}

export function listMarkets(): MarketContext[] {
  const store = loadStore();
  return Object.values(store.markets);
}

export function deleteMarket(id: string): boolean {
  const store = loadStore();
  if (!store.markets[id]) return false;
  delete store.markets[id];
  saveStore(store);
  return true;
}

// ─── Competitor Profiles ──────────────────────────────────────

export function saveCompetitor(competitor: CompetitorProfile): CompetitorProfile {
  const store = loadStore();
  store.competitors[competitor.id] = competitor;
  saveStore(store);
  return competitor;
}

export function getCompetitor(id: string): CompetitorProfile | null {
  const store = loadStore();
  return store.competitors[id] ?? null;
}

export function listCompetitors(marketId?: string): CompetitorProfile[] {
  const store = loadStore();
  const all = Object.values(store.competitors);
  return marketId ? all.filter((c) => c.market_id === marketId) : all;
}

export function deleteCompetitor(id: string): boolean {
  const store = loadStore();
  if (!store.competitors[id]) return false;
  delete store.competitors[id];
  saveStore(store);
  return true;
}

// ─── Scan Reports ────────────────────────────────────────────

export function saveScanReport(report: ScanReport): ScanReport {
  const store = loadStore();
  store.scan_reports[report.id] = report;
  saveStore(store);
  return report;
}

export function getScanReport(id: string): ScanReport | null {
  const store = loadStore();
  return store.scan_reports[id] ?? null;
}

export function listScanReports(marketId?: string, limit = 10): ScanReport[] {
  const store = loadStore();
  let reports = Object.values(store.scan_reports);
  if (marketId) {
    reports = reports.filter((r) => r.market_id === marketId);
  }
  return reports
    .sort((a, b) => b.scan_date.localeCompare(a.scan_date))
    .slice(0, limit);
}

// ─── Threat Signal Updates ────────────────────────────────────

export function saveThreatSignal(signal: ThreatSignalUpdate): ThreatSignalUpdate {
  const store = loadStore();
  store.threat_signals.push(signal);
  saveStore(store);
  return signal;
}

export function listThreatSignals(competitorId?: string, limit = 20): ThreatSignalUpdate[] {
  const store = loadStore();
  let signals = store.threat_signals;
  if (competitorId) {
    signals = signals.filter((s) => s.competitor_id === competitorId);
  }
  return signals
    .sort((a, b) => b.detected_date.localeCompare(a.detected_date))
    .slice(0, limit);
}
