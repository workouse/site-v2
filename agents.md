# Workouse Audit Tool — Agent Roster & Architecture Specification

This document defines the specialized agent personas, operational scopes, tool boundaries, and contract interfaces for developing and executing the Workouse Performance Audit Tool (Phase 2).

---

## 1. Agent Roster

### 1.1 `api-architect`
- **Role**: Backend & API Endpoint Architect
- **Responsibilities**:
  - Implements Astro/Cloudflare Workers API endpoints under `src/pages/api/audit/`.
  - Implements input sanitization, domain format validation, and email structure verification.
  - Configures rate-limiting policies using Cloudflare KV (`RATE_LIMITS`).
  - Manages verification token lifecycle in `EMAIL_TOKENS` KV and triggers Resend verification emails.
- **Inputs**: HTTP POST requests (`{ url, email }`), GET verification tokens (`?token=...`), GET status requests (`/api/audit/[id]`).
- **Outputs**: JSON HTTP responses (`200 OK`, `400 Bad Request`, `429 Too Many Requests`), DB audit entries, KV verification records.

---

### 1.2 `audit-engine-specialist`
- **Role**: Site Data Collector & Auditor
- **Responsibilities**:
  - Fetches and parses Google PageSpeed Insights API v5 metric payloads (Performance score, LCP, CLS, TBT, image diagnostics).
  - Inspects HTTP security headers via fetch (HTTPS redirect, HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy).
  - Scrapes HTML head tags for SEO criteria (Title tag, Meta Description, H1 heading structure, Canonical link, OpenGraph tags, robots.txt).
- **Inputs**: Target URL.
- **Outputs**: Structured `RawResults` payload containing PageSpeed JSON, Security payload, and SEO audit JSON.

---

### 1.3 `ai-queue-processor`
- **Role**: Queue Worker & AI Analysis Specialist
- **Responsibilities**:
  - Implements Cloudflare Queue Consumer message handler (`src/workers/audit-consumer.ts`).
  - Stores raw collector payloads in D1 `raw_results` and Cloudflare R2 `AUDIT_RESULTS`.
  - Formats LLM prompts combining raw findings with `PRICING_TABLE` context (`src/lib/pricing.ts`).
  - Invokes Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`) to generate overall score, issue array, and strategic recommendation (`fix` vs `rebuild`).
  - Computes exact estimated repair costs based on the $35/hr rate model.
  - Persists final evaluation into D1 `ai_output` table and marks audit as `complete`.
- **Inputs**: Queue messages (`{ auditId, url, email }`).
- **Outputs**: D1 database writes, R2 object stores, `AIOutput` JSON schema, state transition triggers.

---

### 1.4 `realtime-do-specialist`
- **Role**: Real-time State & Durable Object Engineer
- **Responsibilities**:
  - Implements `AuditStatusDO` Cloudflare Durable Object (`src/objects/AuditStatusDO.ts`).
  - Handles incoming WebSocket upgrade requests from client browsers.
  - Maintains client connection pools per audit session.
  - Receives state transition updates (`pending_verification` -> `queued` -> `running` -> `ai_processing` -> `complete`) and broadcasts WebSocket messages to active subscribers.
- **Inputs**: WebSocket connection upgrade requests, state change notifications.
- **Outputs**: Real-time JSON WebSocket frames (`WSMessage`).

---

### 1.5 `frontend-ui-engineer`
- **Role**: UI/UX & Astro Component Developer
- **Responsibilities**:
  - Builds premium dark-mode interface components following the Workouse design system (zinc palette, brand yellow `#FEC500`, blue `#003087`).
  - Implements `AuditForm.astro` with real-time field validation and submission state.
  - Implements `AuditProgress.astro` with live WebSocket status feed and animated phase indicators.
  - Implements `AuditReport.astro` displaying overall score gauge, issue breakdown by category (Performance, Security, SEO), cost estimates, and lead conversion CTAs.
  - Implements dynamic page `/audit/[id].astro`.
- **Inputs**: Audit ID params, API status endpoints, WebSocket connection streams.
- **Outputs**: Accessible, responsive Astro components and pages.
