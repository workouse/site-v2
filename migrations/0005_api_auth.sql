-- Workouse API Authentication & Access Management Schema
-- Migration 0005: api_users, api_keys, api_usage_logs

-- 1. API Users Table (Nostr Identity Mapping & Tiers)
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

-- 2. API Keys Table (Scoped Bearer Tokens linked to Nostr User)
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

-- 3. API Usage Logs Table (Edge Metering & Telemetry)
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
