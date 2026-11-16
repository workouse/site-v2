# Workouse Audit Tool — API Roadmap & Architecture Specification

## 1. Executive Overview

The Workouse Audit Tool API transforms the existing audit and web modernization engine into a modular, programmatic edge-native service running on Cloudflare Workers. It enables developers, agencies, and autonomous agents to run targeted diagnostics (e.g. Universal Commerce Protocol (UCP), SEO structure, Tech Stack debt, Security headers, Data Regulation, Core Web Vitals) or full-pipeline audits.

Access and identity management are designed to be Nostr-native, supporting both direct **NIP-98 HTTP Authentication** (cryptographically signed requests via Nostr `npub`/pubkeys) and **Npub-Linked API Keys**, coupled with sliding-window edge rate limiting and interactive developer documentation.

---

## 2. System Architecture & Request Flow

```
[Client / Agent / cURL]
       │
       ▼
[Cloudflare Edge / Workers Router]
       │
       ├─── 1. Authentication Layer
       │       ├── NIP-98 Signature Verification (kind: 27235)
       │       └── Bearer API Key Lookup (D1 / KV Cache)
       │
       ├─── 2. Rate Limiting & Quota Metering (KV + D1)
       │
       ├─── 3. Modular Audit Router
       │       ├── /api/v1/audit/ucp        ───> [UCP & Distributed Web Engine] (Sync ~200ms)
       │       ├── /api/v1/audit/seo        ───> [SEO & Structured Data Engine] (Sync ~300ms)
       │       ├── /api/v1/audit/techstack  ───> [Tech Stack & Debt Engine]     (Sync ~400ms)
       │       ├── /api/v1/audit/security   ───> [Security Headers Engine]      (Sync ~100ms)
       │       ├── /api/v1/audit/regulation ───> [Jurisdiction/Privacy Engine]  (Sync ~300ms)
       │       └── /api/v1/audit (Full)     ───> [Async Queue -> Workers -> R2] (Async / DO Stream)
       │
       └─── 4. Response & Telemetry (Structured JSON / OpenAPI 3.1)
```

---

## 3. Phased Implementation Roadmap

---

### Phase 1: Nostr-Native Authentication & Access Management

#### 1.1 Objectives
- Allow callers to authenticate directly using Nostr key pairs without passwords or third-party OAuth providers.
- Implement NIP-98 standard HTTP authentication and provision Npub-linked API keys for headless integrations.
- Store user permissions, access tiers, and quota allocations in Cloudflare D1.

#### 1.2 Technical Specifications

1. **NIP-98 HTTP Request Verification**:
   - Header: `Authorization: Nostr <base64-encoded-event-json>`
   - Event Verification Rules:
     - `kind` MUST be `27235` (HTTP Auth).
     - `created_at` MUST be within a strict time delta (e.g. ±60 seconds of Worker UTC time) to prevent replay attacks.
     - `tags` MUST contain `["u", "<absolute_request_url>"]` matching the incoming endpoint.
     - `tags` MUST contain `["method", "<HTTP_METHOD>"]` matching the request method (`GET`, `POST`, etc.).
     - Signature `sig` MUST be validated against event `id` and `pubkey` using Schnorr/secp256k1 via `@noble/curves`.
   - Utility: Extract and format `npub` using `bech32` / `nostr-tools`.

2. **Npub-Linked API Key Issuance (`POST /api/v1/auth/token`)**:
   - Allows clients that cannot sign every single HTTP request (e.g. low-resource microservices) to exchange a single signed challenge (NIP-98 or kind 22242) for a scoped Bearer token (`wk_live_...`).

3. **D1 Schema Migration (`migrations/0002_api_auth.sql`)**:
   ```sql
   -- API Users (linked to Nostr Identity)
   CREATE TABLE IF NOT EXISTS api_users (
     id TEXT PRIMARY KEY,                       -- internal UUID
     pubkey TEXT NOT NULL UNIQUE,                -- 64-char hex nostr public key
     npub TEXT NOT NULL UNIQUE,                  -- bech32 npub1... string
     tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
     daily_quota INTEGER NOT NULL DEFAULT 50,
     is_active INTEGER NOT NULL DEFAULT 1,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );

   CREATE INDEX IF NOT EXISTS idx_api_users_pubkey ON api_users(pubkey);
   CREATE INDEX IF NOT EXISTS idx_api_users_npub ON api_users(npub);

   -- API Keys
   CREATE TABLE IF NOT EXISTS api_keys (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES api_users(id) ON DELETE CASCADE,
     key_hash TEXT NOT NULL UNIQUE,              -- SHA-256 hash of the issued key
     key_prefix TEXT NOT NULL,                  -- e.g. "wk_live_a1b2..."
     name TEXT NOT NULL,
     permissions TEXT NOT NULL DEFAULT '["audit:read", "audit:write"]',
     expires_at INTEGER,
     last_used_at INTEGER,
     created_at INTEGER NOT NULL
   );

   CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

   -- API Usage Records & Metering
   CREATE TABLE IF NOT EXISTS api_usage_logs (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES api_users(id) ON DELETE CASCADE,
     endpoint TEXT NOT NULL,
     target_module TEXT NOT NULL,               -- 'full', 'ucp', 'seo', 'security', etc.
     target_url TEXT NOT NULL,
     status_code INTEGER NOT NULL,
     duration_ms INTEGER NOT NULL,
     cost_credits INTEGER NOT NULL DEFAULT 1,
     timestamp INTEGER NOT NULL
   );

   CREATE INDEX IF NOT EXISTS idx_api_usage_user_time ON api_usage_logs(user_id, timestamp);
   ```

#### 1.3 Action Items & Tasks
- [ ] Create `src/lib/nostr-auth.ts` implementing NIP-98 parsing, signature validation with `@noble/curves/secp256k1`, replay window checks, and `npub` conversion.
- [ ] Implement `src/lib/api-key-manager.ts` for hashing (`crypto.subtle`), validating, and provisioning API keys.
- [ ] Create middleware/guard `src/lib/api-guard.ts` supporting dual authentication (`Authorization: Nostr ...` or `Authorization: Bearer wk_...`).
- [ ] Write integration tests in `test/nostr-auth.test.ts` utilizing `/home/delirehberi/.local/bin/nak` to produce valid and invalid test signatures.

---

### Phase 2: Modular Audit Engine & Granular Sub-Endpoints

#### 2.1 Objectives
- Decouple the monolithic audit engine into isolated, modular analyzers capable of executing synchronously at sub-second latency.
- Provide dedicated endpoints for single-purpose checks (UCP, SEO, Tech Stack, Security, Regulation) in addition to the full async audit pipeline.

#### 2.2 Module Breakdown & Endpoints

| Endpoint | Method | Mode | Purpose | Latency SLA |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/audit` | `POST` | Sync / Async | Multi-module or full audit with optional `modules` filter | 200ms - 15s |
| `/api/v1/audit/ucp` | `POST` | Sync | Universal Commerce Protocol & Distributed Web discovery | < 300ms |
| `/api/v1/audit/seo` | `POST` | Sync | Metadata, OpenGraph, Schema.org, sitemaps, robots.txt | < 400ms |
| `/api/v1/audit/techstack` | `POST` | Sync | Platform detection (WordPress/Shopify), CMS, legacy tech debt | < 400ms |
| `/api/v1/audit/security` | `POST` | Sync | Security headers, HSTS, CSP, X-Frame-Options | < 150ms |
| `/api/v1/audit/regulation`| `POST` | Sync | Privacy policies, KVKK/GDPR, cookie consent detection | < 400ms |
| `/api/v1/audit/:id` | `GET` | Sync | Retrieve async audit progress and completed results | < 50ms |

#### 2.3 Modular Request & Response Schemas

##### 1. Modular Check Payload (`POST /api/v1/audit/ucp`)
```json
{
  "url": "https://example.com"
}
```

##### 2. Response: Universal Commerce Protocol (`/api/v1/audit/ucp`)
```json
{
  "success": true,
  "url": "https://example.com",
  "checkedAt": 1727855000000,
  "diagnostics": {
    "isEcommerce": true,
    "hasUcp": true,
    "ucpVersion": "1.0.0",
    "ucpEndpoint": "https://example.com/.well-known/ucp.json",
    "hasLlmsTxt": true,
    "hasNostrJson": true,
    "hasAtprotoDid": false
  },
  "score": 95,
  "recommendations": []
}
```

##### 3. Composite Audit Request (`POST /api/v1/audit`)
```json
{
  "url": "https://example.com",
  "modules": ["seo", "security", "ucp"],
  "sync": true
}
```

#### 2.4 Action Items & Tasks
- [ ] Refactor `src/lib/audit-engine.ts` into discrete modules under `src/lib/analyzers/`:
  - `ucp-analyzer.ts`
  - `seo-analyzer.ts`
  - `techstack-analyzer.ts`
  - `security-analyzer.ts`
  - `regulation-analyzer.ts`
- [ ] Create dedicated API routes:
  - `src/pages/api/v1/audit/index.ts`
  - `src/pages/api/v1/audit/ucp.ts`
  - `src/pages/api/v1/audit/seo.ts`
  - `src/pages/api/v1/audit/techstack.ts`
  - `src/pages/api/v1/audit/security.ts`
  - `src/pages/api/v1/audit/regulation.ts`
  - `src/pages/api/v1/audit/[id].ts`
- [ ] Integrate SSRF-safe URL validation with `src/lib/url-validator.ts` across all endpoints before executing network fetches.

---

### Phase 3: Rate Limiting, Usage Tracking & Edge Metering

#### 3.1 Objectives
- Protect edge infrastructure against abuse and DDoS while supporting customizable quotas per tier.
- Track usage metrics against caller identity (`npub` or API key hash).

#### 3.2 Tier & Quota Matrix

| Tier | Rate Limit (KV Sliding Window) | Daily Quota | Sync Timeout | Puppeteer / Heavy Check |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | 10 requests / min | 50 calls / day | 5 seconds | Disabled (HTTP only) |
| **Pro** | 60 requests / min | 1,000 calls / day | 15 seconds | Enabled |
| **Enterprise** | 300 requests / min | Custom / Unlimited | 30 seconds | Enabled + Priority Queue |

#### 3.3 Action Items & Tasks
- [ ] Enhance `src/lib/rate-limiter.ts` to support tier-aware KV sliding window counters (`RATE_LIMITS` binding).
- [ ] Add standardized rate limit HTTP response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).
- [ ] Implement non-blocking telemetry logging via `ctx.waitUntil()` to record usage in D1 (`api_usage_logs`).

---

### Phase 4: Developer Documentation, OpenAPI 3.1 & Developer Portal

#### 4.1 Objectives
- Provide comprehensive, interactive, and machine-readable API documentation.
- Maintain an OpenAPI 3.1 specification exposed as JSON and rendered via a modern UI (Scalar / Astro Documentation layout).

#### 4.2 Documentation Deliverables
1. **OpenAPI 3.1 Specification (`/api/v1/openapi.json`)**:
   - Complete schema definitions for all request parameters, response models, error codes (`400`, `401`, `403`, `429`, `500`), and authentication schemes (`NIP98Auth`, `BearerAuth`).
2. **Interactive Developer Portal (`/docs/api`)**:
   - Interactive request runner.
   - Authentication guide explaining Nostr NIP-98 signing with code samples.
   - Code snippet generator for cURL, TypeScript/Fetch, and Python.

#### 4.3 Client Code Example in Documentation

##### cURL with `nak` (NIP-98 signed request):
```bash
# Generate signed NIP-98 event and invoke UCP audit
nak req-auth --url "https://workouse.com/api/v1/audit/ucp" --method POST --sec <nsec_or_hex_key> | \
curl -X POST "https://workouse.com/api/v1/audit/ucp" \
  -H "Authorization: Nostr $(cat -)" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

##### TypeScript (Fetch with API Key):
```typescript
const response = await fetch('https://workouse.com/api/v1/audit/seo', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer wk_live_xxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ url: 'https://example.com' })
});
const data = await response.json();
console.log(data);
```

#### 4.4 Action Items & Tasks
- [ ] Author `src/lib/openapi-spec.ts` exporting the complete OpenAPI 3.1 schema.
- [ ] Create route `src/pages/api/v1/openapi.json.ts` serving the schema.
- [ ] Build `/docs/api` page (`src/pages/docs/api.astro`) utilizing Scalar or Tailwind-styled documentation with dark/light mode support.

---

### Phase 5: Asynchronous Polling, Real-Time Streams & Webhook Dispatch

#### 5.1 Objectives
- Support long-running audits (full page crawl, Browser Rendering / Puppeteer Core Web Vitals, AI Story generation) via queueing, Durable Objects status feeds, and outbound webhooks.

#### 5.2 Technical Flow
1. Client issues `POST /api/v1/audit` with `{ "url": "https://example.com", "sync": false, "webhookUrl": "https://client.com/hook" }`.
2. API responds immediately with HTTP `202 Accepted` and `{ "auditId": "...", "status": "queued", "statusUrl": "/api/v1/audit/:id", "wsUrl": "wss://.../ws/audit/:id" }`.
3. Background Worker processes stages (`running` -> `scoring` -> `enriching` -> `complete`).
4. On completion:
   - Results are written to R2 and D1.
   - Durable Object emits completion message to active WebSocket subscribers.
   - Webhook dispatcher sends HMAC-signed POST request to `webhookUrl`.

#### 5.3 Action Items & Tasks
- [ ] Update `src/workers/audit-consumer.ts` to support API-initiated audits.
- [ ] Extend webhook subscription payload to include cryptographic signature header (`X-Workouse-Signature: sha256=...`).
- [ ] Support WebSocket progress polling endpoint via `AuditStatusDO`.

---

### Phase 6: Testing, Security Verification & Definition of Done

#### 6.1 Security Verification Checklist
- [ ] **Replay Protection**: Reject any NIP-98 event older or newer than 60 seconds.
- [ ] **SSRF Defense**: Enforce strict private IP / loopback / localhost blocklists in `url-validator.ts` before dispatching fetch requests.
- [ ] **Payload Sanitization**: Enforce JSON schema validation via Zod on all incoming request bodies.
- [ ] **Secrets & Key Storage**: Store API key hashes using constant-time comparison (`crypto.subtle.timingSafeEqual`) to prevent timing attacks.

#### 6.2 Definition of Done (DoD)
1. **Tests Passing**: 100% unit and integration test pass rate covering NIP-98 auth, modular analyzers, API key lifecycle, and rate limits.
2. **Type Safety**: `npm run build` / Astro check passes with zero TypeScript warnings or loose types.
3. **Documentation Deployed**: OpenAPI endpoint is verified via Swagger validator and `/docs/api` renders flawlessly on mobile/desktop.
4. **Performance Target**: Single-module endpoints respond within their respective latency SLA (< 400ms).
