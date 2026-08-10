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

-- 3. AI Output Table
CREATE TABLE IF NOT EXISTS ai_output (
  audit_id TEXT PRIMARY KEY REFERENCES audits(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  issues_json TEXT NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('fix', 'rebuild')),
  recommendation_reason TEXT,
  summary TEXT NOT NULL,
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


