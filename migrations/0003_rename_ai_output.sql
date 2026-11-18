-- Workouse Audit Tool D1 Database Migration: Scoring Engine Overhaul
-- 0003_rename_ai_output.sql
-- Replaces ai_output with audit_results, adds per-category sub-scores.
-- Run after clearing old data: wrangler d1 execute workouse-db --remote --command "DROP TABLE IF EXISTS ai_output;"

-- Drop old table (safe after DB clear)
DROP TABLE IF EXISTS ai_output;

-- Drop and recreate audits with updated status constraint (adds 'enriching' stage)
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS audit_leads;
DROP TABLE IF EXISTS raw_results;
DROP TABLE IF EXISTS audits;

CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('pending_verification', 'queued', 'running', 'scoring', 'enriching', 'complete', 'failed')
  ),
  r2_key TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_audits_email ON audits(email);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at);

-- Raw Results (unchanged structure)
CREATE TABLE IF NOT EXISTS raw_results (
  audit_id TEXT PRIMARY KEY REFERENCES audits(id) ON DELETE CASCADE,
  pagespeed_json TEXT,
  observatory_json TEXT,
  seo_json TEXT,
  fetched_at INTEGER NOT NULL
);

-- Audit Results (replaces ai_output, adds 4 sub-scores)
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
  processed_at INTEGER NOT NULL
);

-- Audit Leads
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

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details_json TEXT,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_audit_id ON audit_logs(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Webhook Subscriptions (unchanged)
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  secret TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')) DEFAULT 'active',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_subscriptions(status);

-- System Metrics (unchanged)
CREATE TABLE IF NOT EXISTS system_metrics (
  id TEXT PRIMARY KEY,
  metric_key TEXT NOT NULL,
  metric_value REAL NOT NULL,
  metadata_json TEXT,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_key ON system_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded ON system_metrics(recorded_at);
