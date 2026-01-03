# Gateway Demo Build File — Single-Hop x402 + TGP Metadata
**Version:** 0.1 • **Date:** 2025-11-04

This build file walks you through creating a **minimal, demonstrable Gateway prototype** that shows a **single-hop payment** over **x402** with **Transaction Gateway Protocol (TGP) metadata** enforced by a simple policy layer and recorded as **TDR logs**.

> Outcome: you’ll start one Express server that (a) enforces a mock Gateway policy via `X-TGP` header, (b) logs a flat-file TDR for each transaction, and (c) either calls the real `x402` middleware **or** runs in **mock-settlement** mode if x402 isn’t present.

---

## 0) What you’ll show on video
- A `curl` (or Postman) request that **includes TGP policy metadata**.
- The server **accepts or rejects** based on local policy (e.g., KYC-required routes).  
- A **TDR line is appended** to `./logs/tdr-YYYYMMDD.log`.  
- If `x402` is installed, the request will **settle** per its example middleware; otherwise the demo **simulates settlement** so you can still show the end-to-end behavior today.

---

## 1) Prerequisites
- Node.js 18+
- pnpm or npm
- (Optional) An x402-compatible environment. If not available, the demo falls back to **mock settlement** automatically.

---

## 2) Project layout
You can paste these files into any folder (or add to an existing repo).

```
tbc-demo/
├─ .env
├─ package.json
├─ src/
│  ├─ index.ts            # main express server (ts) – or use index.js version below
│  ├─ policy.ts           # simple policy engine
│  ├─ tdr.ts              # flat-file TDR logger
│  └─ types.ts            # shared types
├─ policy.json            # example local policy table
├─ logs/                  # TDR output lands here
└─ README.md
```

> If you prefer **JavaScript**, a drop-in `index.js` version is included in this doc below the TypeScript section.

---

## 3) Install
```bash
mkdir -p tbc-demo && cd tbc-demo
pnpm init -y  # or: npm init -y
pnpm add express body-parser dotenv
pnpm add -D typescript ts-node @types/node @types/express
npx tsc --init
mkdir -p src logs
```

> **Optional (real settlement):** if you have x402 available, install it (package name may differ depending on how you vend it locally). If you don’t, the demo auto-falls back to mock settlement.
```bash
# Example (adjust if your package name differs)
# pnpm add @coinbase/x402
```

Create a basic **`.env`**:
```env
PORT=3000
SETTLEMENT_MODE=mock   # set to 'x402' when you have x402 wired
RECEIVER_ADDRESS=0xYourAddressHere
RESOURCE_PRICE_USD=0.01
```

---

## 4) TGP header schema (minimal for demo)
We’ll carry TGP metadata in a single HTTP header named `X-TGP` with a JSON string value.

**Example header value:**
```json
{
  "path": ["TA:US", "TA:EU"],
  "policy": {"kyc_required": true},
  "src_zone": "TA:US",
  "dst_zone": "TA:EU",
  "intent": "pay:$0.01:/resource/compute/100ms",
  "nonce": "9f8a7d...",
  "ts": 1730745600,
  "signer": "did:key:z6Mk..."
}
```

> For the demo, we **don’t verify signatures**—we just enforce **kyc_required** and record the rest in the TDR.

---

## 5) Add a local policy table
Create **`policy.json`** (adjust as you like):
```json
{
  "routes": [
    {
      "src_zone": "TA:US",
      "dst_zone": "TA:EU",
      "kyc_required": true,
      "max_amount_usd": 1.00
    },
    {
      "src_zone": "TA:US",
      "dst_zone": "TA:US",
      "kyc_required": false,
      "max_amount_usd": 5.00
    }
  ]
}
```

---

## 6) Create `src/types.ts`
```ts
export type TgpHeader = {
  path: string[];
  policy?: Record<string, unknown>;
  src_zone: string;
  dst_zone: string;
  intent: string;        // e.g., "pay:$0.01:/resource/compute/100ms"
  nonce: string;
  ts: number;            // unix seconds
  signer?: string;
};

export type PolicyRoute = {
  src_zone: string;
  dst_zone: string;
  kyc_required: boolean;
  max_amount_usd: number;
};

export type PolicyTable = {
  routes: PolicyRoute[];
};
```

---

## 7) Create `src/policy.ts` (simple policy engine)
```ts
import fs from "fs";
import path from "path";
import type { PolicyTable, TgpHeader } from "./types";

const POLICY_PATH = path.join(process.cwd(), "policy.json");

function parseAmountFromIntent(intent: string): number {
  // expects "pay:$0.01:/resource/compute/100ms"
  const m = intent.match(/pay:\$(\d+\.\d+):/);
  return m ? parseFloat(m[1]) : NaN;
}

export function loadPolicy(): PolicyTable {
  const raw = fs.readFileSync(POLICY_PATH, "utf-8");
  return JSON.parse(raw) as PolicyTable;
}

export type PolicyDecision =
  | { allowed: true; reason: "ok"; route: any }
  | { allowed: false; reason: string; route?: any };

export function evaluate(tgp: TgpHeader, table: PolicyTable): PolicyDecision {
  const amt = parseAmountFromIntent(tgp.intent);
  if (isNaN(amt)) return { allowed: false, reason: "bad_intent" };

  const route = table.routes.find(
    (r) => r.src_zone === tgp.src_zone && r.dst_zone === tgp.dst_zone
  );
  if (!route) return { allowed: false, reason: "no_route" };

  if (amt > route.max_amount_usd) {
    return { allowed: false, reason: "amount_exceeds_limit", route };
  }

  const kycRequired = route.kyc_required === true;
  const presentedKyc = Boolean(tgp.policy && (tgp.policy as any).kyc_passed === true);

  if (kycRequired && !presentedKyc) {
    return { allowed: false, reason: "kyc_required", route };
  }

  return { allowed: true, reason: "ok", route };
}
```

---

## 8) Create `src/tdr.ts` (flat-file TDR logger)
```ts
import fs from "fs";
import path from "path";

export type TdrRecord = Record<string, string | number | boolean | null>;

function yyyymmdd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

export function appendTdr(rec: TdrRecord) {
  const dir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `tdr-${yyyymmdd(new Date())}.log`);
  const line = Object.entries(rec)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ");
  fs.appendFileSync(f, line + "
", "utf-8");
  console.log("[TDR]", line);
}
```

---

## 9) Create `src/index.ts` (Express + TGP + (x402|mock) settlement)
```ts
import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import type { TgpHeader } from "./types";
import { loadPolicy, evaluate } from "./policy";
import { appendTdr } from "./tdr";

const app = express();
app.use(bodyParser.json());

const PORT = Number(process.env.PORT || 3000);
const PRICE_USD = Number(process.env.RESOURCE_PRICE_USD || 0.01);
const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS || "0xReceiver";
const SETTLEMENT_MODE = (process.env.SETTLEMENT_MODE || "mock").toLowerCase();

// Optional: wire x402 middleware if available
let x402Middleware: any = null;
if (SETTLEMENT_MODE === "x402") {
  try {
    // Example: adjust import path to your local package name
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const x402 = require("@coinbase/x402");
    x402Middleware = x402.paymentMiddleware(RECEIVER_ADDRESS, { "/resource": `$${PRICE_USD.toFixed(2)}` });
    console.log("x402 middleware enabled.");
  } catch (e) {
    console.warn("x402 not found; falling back to mock settlement.");
  }
}

// Health check
app.get("/health", (_req, res) => res.json({ ok: true, mode: SETTLEMENT_MODE }));

// Core demo endpoint (the resource being purchased)
const resourceHandler = async (req: express.Request, res: express.Response) => {
  const now = Date.now();
  const tgpRaw = req.header("X-TGP");
  let tgp: TgpHeader | null = null;
  try {
    tgp = tgpRaw ? (JSON.parse(tgpRaw) as TgpHeader) : null;
  } catch {
    return res.status(400).json({ error: "bad_x_tgp_json" });
  }
  if (!tgp) return res.status(400).json({ error: "missing_x_tgp" });

  // Policy check
  const policy = loadPolicy();
  const decision = evaluate(tgp, policy);
  if (!decision.allowed) {
    appendTdr({
      ts: Math.floor(now / 1000),
      event: "reject",
      reason: decision.reason,
      src_zone: tgp.src_zone,
      dst_zone: tgp.dst_zone,
      intent: tgp.intent,
      signer: tgp.signer || null
    });
    return res.status(403).json({ error: "policy_reject", reason: decision.reason });
  }

  // Settlement (real x402 or mock)
  if (x402Middleware) {
    // delegate to x402; it will call next() on success
    return (x402Middleware as any)(req, res, () => {
      appendTdr({
        ts: Math.floor(now / 1000),
        event: "settled",
        mode: "x402",
        src_zone: tgp!.src_zone,
        dst_zone: tgp!.dst_zone,
        intent: tgp!.intent,
        receiver: RECEIVER_ADDRESS
      });
      return res.json({ ok: true, mode: "x402", received: PRICE_USD });
    });
  } else {
    // mock settlement
    await new Promise((r) => setTimeout(r, 300)); // simulate 300ms settlement
    appendTdr({
      ts: Math.floor(now / 1000),
      event: "settled",
      mode: "mock",
      src_zone: tgp.src_zone,
      dst_zone: tgp.dst_zone,
      intent: tgp.intent,
      receiver: RECEIVER_ADDRESS
    });
    return res.json({ ok: true, mode: "mock", received: PRICE_USD });
  }
};

// Attach route (x402 can also wrap this path via its middleware map)
app.post("/resource", resourceHandler);

app.listen(PORT, () => {
  console.log(`Gateway demo listening on http://localhost:${PORT} (mode=${SETTLEMENT_MODE})`);
});
```

---

## 10) Optional JavaScript variant (`src/index.js`)
If you prefer plain JS, drop this in as `src/index.js` and adjust your `package.json` script to `node src/index.js`.

```js
require("dotenv/config");
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

const PORT = Number(process.env.PORT || 3000);
const PRICE_USD = Number(process.env.RESOURCE_PRICE_USD || 0.01);
const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS || "0xReceiver";
const SETTLEMENT_MODE = (process.env.SETTLEMENT_MODE || "mock").toLowerCase();

// Simple policy loader/evaluator
const POLICY_PATH = path.join(process.cwd(), "policy.json");
function loadPolicy() { return JSON.parse(fs.readFileSync(POLICY_PATH, "utf-8")); }
function parseAmountFromIntent(intent) { const m = intent.match(/pay:\$(\d+\.\d+):/); return m ? parseFloat(m[1]) : NaN; }
function evalPolicy(tgp, table) {
  const amt = parseAmountFromIntent(tgp.intent);
  if (isNaN(amt)) return { allowed: false, reason: "bad_intent" };
  const route = table.routes.find(r => r.src_zone === tgp.src_zone && r.dst_zone === tgp.dst_zone);
  if (!route) return { allowed: false, reason: "no_route" };
  if (amt > route.max_amount_usd) return { allowed: false, reason: "amount_exceeds_limit", route };
  const kycReq = !!route.kyc_required; const kycPass = !!(tgp.policy && tgp.policy.kyc_passed);
  if (kycReq && !kycPass) return { allowed: false, reason: "kyc_required", route };
  return { allowed: true, reason: "ok", route };
}

// TDR logger
function yyyymmdd(d) { const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), dd=String(d.getDate()).padStart(2,"0"); return `${y}${m}${dd}`; }
function appendTdr(rec) {
  const dir = path.join(process.cwd(), "logs"); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `tdr-${yyyymmdd(new Date())}.log`);
  const line = Object.entries(rec).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ");
  fs.appendFileSync(f, line + "
", "utf-8"); console.log("[TDR]", line);
}

// Optional x402
let x402Middleware = null;
if (SETTLEMENT_MODE === "x402") {
  try { const x402 = require("@coinbase/x402"); x402Middleware = x402.paymentMiddleware(RECEIVER_ADDRESS, { "/resource": `$${PRICE_USD.toFixed(2)}` }); console.log("x402 middleware enabled."); }
  catch (e) { console.warn("x402 not found; falling back to mock settlement."); }
}

app.get("/health", (_req, res) => res.json({ ok: true, mode: SETTLEMENT_MODE }));

app.post("/resource", async (req, res) => {
  const now = Date.now();
  let tgp = null;
  try { tgp = req.header("X-TGP") ? JSON.parse(req.header("X-TGP")) : null; }
  catch { return res.status(400).json({ error: "bad_x_tgp_json" }); }
  if (!tgp) return res.status(400).json({ error: "missing_x_tgp" });

  const policy = loadPolicy();
  const decision = evalPolicy(tgp, policy);
  if (!decision.allowed) {
    appendTdr({ ts: Math.floor(now/1000), event: "reject", reason: decision.reason, src_zone: tgp.src_zone, dst_zone: tgp.dst_zone, intent: tgp.intent, signer: tgp.signer || null });
    return res.status(403).json({ error: "policy_reject", reason: decision.reason });
  }

  if (x402Middleware) {
    return x402Middleware(req, res, () => {
      appendTdr({ ts: Math.floor(now/1000), event: "settled", mode: "x402", src_zone: tgp.src_zone, dst_zone: tgp.dst_zone, intent: tgp.intent, receiver: RECEIVER_ADDRESS });
      return res.json({ ok: true, mode: "x402", received: PRICE_USD });
    });
  } else {
    await new Promise(r => setTimeout(r, 300));
    appendTdr({ ts: Math.floor(now/1000), event: "settled", mode: "mock", src_zone: tgp.src_zone, dst_zone: tgp.dst_zone, intent: tgp.intent, receiver: RECEIVER_ADDRESS });
    return res.json({ ok: true, mode: "mock", received: PRICE_USD });
  }
});

app.listen(PORT, () => console.log(`Gateway demo listening on http://localhost:${PORT} (mode=${SETTLEMENT_MODE})`));
```

---

## 11) package.json scripts
Replace your `package.json` with something like:
```json
{
  "name": "tbc-demo",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "start:js": "node src/index.js"
  },
  "dependencies": {
    "body-parser": "^1.20.2",
    "dotenv": "^16.4.5",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.7",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.3"
  }
}
```

---

## 12) Run it
```bash
pnpm dev       # or: npm run dev
# -> Gateway demo listening on http://localhost:3000 (mode=mock)
curl -s localhost:3000/health | jq
```

---

## 13) Test requests

### 13.1 Accept (US→EU with KYC)
```bash
curl -X POST http://localhost:3000/resource   -H 'Content-Type: application/json'   -H 'X-TGP: {"path":["TA:US","TA:EU"],"policy":{"kyc_passed":true},"src_zone":"TA:US","dst_zone":"TA:EU","intent":"pay:$0.01:/resource/compute/100ms","nonce":"abc123","ts":1730745600}'   -d '{"payload":"demo"}'
```

### 13.2 Reject (US→EU without KYC)
```bash
curl -X POST http://localhost:3000/resource   -H 'Content-Type: application/json'   -H 'X-TGP: {"path":["TA:US","TA:EU"],"src_zone":"TA:US","dst_zone":"TA:EU","intent":"pay:$0.01:/resource/compute/100ms","nonce":"abc124","ts":1730745601}'   -d '{"payload":"demo"}'
```

### 13.3 Accept (US→US without KYC)
```bash
curl -X POST http://localhost:3000/resource   -H 'Content-Type: application/json'   -H 'X-TGP: {"path":["TA:US","TA:US"],"src_zone":"TA:US","dst_zone":"TA:US","intent":"pay:$0.01:/resource/compute/100ms","nonce":"abc125","ts":1730745602}'   -d '{"payload":"demo"}'
```

Check TDR output:
```bash
tail -n 5 logs/tdr-*.log
```

You’ll see lines like:
```
ts=1730745600 event="settled" mode="mock" src_zone="TA:US" dst_zone="TA:EU" intent="pay:$0.01:/resource/compute/100ms" receiver="0xYourAddressHere"
ts=1730745601 event="reject" reason="kyc_required" src_zone="TA:US" dst_zone="TA:EU" intent="pay:$0.01:/resource/compute/100ms" signer=null
```

---

## 14) Switch to real x402 (when ready)
1) Install and wire the x402 middleware (adjust import name if needed):
```ts
const x402 = require("@coinbase/x402");
const x402Mw = x402.paymentMiddleware(process.env.RECEIVER_ADDRESS, {
  "/resource": `$${PRICE_USD.toFixed(2)}`
});
```
2) Set **`SETTLEMENT_MODE=x402`** in `.env`.  
3) Re-run the server. Successful settlements will log `mode="x402"` in the TDR.

---

## 15) What this proves
- **Policy-aware gatekeeping** at the trust boundary (Gateway behavior).  
- **TGP-as-metadata** carried end-to-end and **enforced locally**.  
- **Deterministic TDR** for flat-file ingestion by carrier back office.  
- **Pluggable settlement**: mock today, x402 tomorrow—same code path.

---

## 16) Next small deltas (for a day-2 demo)
- Add **`policy_hash`** to `X-TGP` and verify against local policy table checksum.  
- Emit TDRs in **CSV** (configurable) alongside the current key=value format.  
- Introduce **multi-hop hint**: include a `path` of `["TA:US","TA:UK","TA:EU"]` and record it; actual multi-hop negotiation can be stubbed by echoing back a **`route_quote`** block in the response.  
- Add a **`/quote`** endpoint to simulate path-vector quotes with latency, fees, and compliance flags.  

---

## 17) Copy-ready snippets
**Add to README:**
```
A minimal Gateway demo showing policy-aware single-hop settlement with TGP metadata.
- Policy: ./policy.json
- TDR:    ./logs/tdr-YYYYMMDD.log
- Header: X-TGP: JSON string containing path/policy/intent
- Modes:  SETTLEMENT_MODE=mock | x402
```
