-- Workouse Audit Tool D1 Database Schema

-- 1. Audits Table
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('pending_verification', 'queued', 'running', 'ai_processing', 'complete', 'failed')
  ),
  r2_key TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

-- 2. Raw Results Table
CREATE TABLE IF NOT EXISTS raw_results (
  audit_id TEXT PRIMARY KEY REFERENCES audits(id) ON DELETE CASCADE,
  pagespeed_json TEXT,
  observatory_json TEXT,
  seo_json TEXT,
  fetched_at INTEGER NOT NULL
);

-- 3. Audit Results Table
CREATE TABLE IF NOT EXISTS audit_results (
  audit_id TEXT PRIMARY KEY REFERENCES audits(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  performance_score INTEGER NOT NULL DEFAULT 0,
  security_score INTEGER NOT NULL DEFAULT 0,
  seo_score INTEGER NOT NULL DEFAULT 0,
  standards_score INTEGER NOT NULL DEFAULT 0,
  issues_json TEXT NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('fix', 'rebuild')),
  recommendation_reason TEXT,
  summary TEXT NOT NULL,
  story TEXT,
  processed_at INTEGER NOT NULL
);

-- Indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_audits_email ON audits(email);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at);

-- 4. Audit Leads Table
CREATE TABLE IF NOT EXISTS audit_leads (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('fix', 'rebuild', 'consultation')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  budget TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_leads_audit_id ON audit_leads(audit_id);

-- 5. Audit Logs Table (Audit Trail & Status History)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details_json TEXT,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_audit_id ON audit_logs(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- 6. Webhook Subscriptions Table (Enterprise Webhook Dispatch)
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  secret TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')) DEFAULT 'active',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_subscriptions(status);

-- 7. System Metrics Table (Platform Performance Telemetry)
CREATE TABLE IF NOT EXISTS system_metrics (
  id TEXT PRIMARY KEY,
  metric_key TEXT NOT NULL,
  metric_value REAL NOT NULL,
  metadata_json TEXT,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_key ON system_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded ON system_metrics(recorded_at);

-- 8. API Users Table (Nostr Identity Mapping & Tiers)
CREATE TABLE IF NOT EXISTS api_users (
  id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL UNIQUE,
  npub TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  daily_quota INTEGER NOT NULL DEFAULT 50,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_users_pubkey ON api_users(pubkey);
CREATE INDEX IF NOT EXISTS idx_api_users_npub ON api_users(npub);

-- 9. API Keys Table (Scoped Bearer Tokens linked to Nostr User)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES api_users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '["audit:read", "audit:write"]',
  expires_at INTEGER,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- 10. API Usage Logs Table (Edge Metering & Telemetry)
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES api_users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  target_module TEXT NOT NULL,
  target_url TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  cost_credits INTEGER NOT NULL DEFAULT 1,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_time ON api_usage_logs(user_id, timestamp);



