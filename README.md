# Competitive Landscape Monitor — MCP Server

**Version:** 1.0.0  
**Author:** Dale Ahle / Take Care Of My  
**Skill hosted at:** https://takecareofmy.com/competitive-landscape-monitor

---

## What This Does

This MCP server gives Claude (and any MCP-compatible LLM) persistent memory for competitive intelligence work. It stores competitor profiles, threat scores, scan history, and signal events across sessions — the parts a skill alone can't do.

The skill provides the reasoning methodology. The MCP provides the database.

**10 tools included:**

| Tool | What it does |
|---|---|
| `clm_save_market` | Save/update the business context that drives all scans |
| `clm_get_market` | Retrieve a market context by ID |
| `clm_list_markets` | List all market contexts |
| `clm_score_threat` | Calculate threat level from the 4-dimension scoring system |
| `clm_save_competitor` | Save/update a competitor intelligence profile |
| `clm_get_competitor` | Retrieve a competitor profile with strategic brief |
| `clm_list_competitors` | List competitors with filters (threat level, category, priority) |
| `clm_delete_competitor` | Remove a competitor from tracking |
| `clm_save_scan_report` | Log a completed scan session |
| `clm_list_scan_reports` | Retrieve scan history |
| `clm_log_threat_signal` | Record a material change event for a competitor |
| `clm_list_threat_signals` | Review signal change history |
| `clm_generate_summary_report` | Full formatted competitive landscape report |

---

## Installation

### Prerequisites

- Node.js 18+
- npm 8+

### Setup

```bash
# Clone or copy this folder to your server
cd competitive-landscape-mcp

# Install dependencies
npm install

# Build
npm run build
```

---

## Running the Server

### Option A: stdio (Claude Desktop / Local)

```bash
npm start
```

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "competitive-landscape": {
      "command": "node",
      "args": ["/absolute/path/to/competitive-landscape-mcp/dist/index.js"]
    }
  }
}
```

### Option B: HTTP (Remote hosting — Claude.ai connector, other LLMs)

```bash
TRANSPORT=http PORT=3000 npm start
```

The MCP endpoint will be available at:
```
POST http://your-server.com:3000/mcp
```

Health check:
```
GET http://your-server.com:3000/health
```

---

## Deploying to takecareofmy.com

If deploying to your existing WordPress server via Node/PM2:

```bash
# On your server
cd /var/www/competitive-landscape-mcp
npm install --production
npm run build

# Start with PM2
pm2 start dist/index.js --name "competitive-landscape-mcp" --env production

# Environment variables
pm2 start dist/index.js \
  --name "competitive-landscape-mcp" \
  -- \
  --env TRANSPORT=http PORT=3001 DATA_DIR=/var/data/clm
```

Then add an Nginx proxy pass to route `yourdomain.com/mcp/competitive-landscape` → `localhost:3001/mcp`.

---

## Data Storage

By default, data is stored as JSON at `./data/store.json` relative to the build output.

To customize:
```bash
DATA_DIR=/your/persistent/path TRANSPORT=http npm start
```

To upgrade to MySQL/Postgres later: replace the read/write methods in `src/services/storage.ts`. The interface is the same — just swap the persistence layer.

---

## Typical Workflow

```
1. clm_save_market        — set up the business context (first run only)
2. clm_score_threat       — score a competitor you've researched
3. clm_save_competitor    — save the profile with sources
4. clm_log_threat_signal  — record any notable changes
5. clm_save_scan_report   — log the completed session
6. clm_generate_summary_report — full formatted output for review
```

---

## Connecting to Claude.ai

Once hosted via HTTP:

1. Go to claude.ai → Settings → Connectors
2. Add custom connector with URL: `https://yourdomain.com/mcp/competitive-landscape`
3. Name it "Competitive Landscape Monitor"
4. Save and start using in any conversation

For other LLMs that support MCP (Cursor, Windsurf, Claude Desktop, etc.), use the same HTTP endpoint URL.

---

## File Structure

```
competitive-landscape-mcp/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts              # Server entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── constants.ts          # Threat thresholds, store keys
│   ├── schemas/
│   │   └── index.ts          # All Zod input schemas
│   ├── services/
│   │   ├── storage.ts        # JSON file persistence layer
│   │   └── helpers.ts        # ID generation, threat scoring, formatting
│   └── tools/
│       ├── market.ts         # Market context tools
│       ├── competitors.ts    # Competitor profile tools
│       └── scans.ts          # Scan reports, signals, summary report
└── dist/                     # Compiled output (after npm run build)
```

---

## License

Copyright 2026 Take Care Of My / Dale Ahle. All rights reserved.
