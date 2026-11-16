/**
 * Workouse Audit Tool — API Key Lifecycle & Verification Engine
 *
 * Implements generation, SHA-256 cryptographic hashing, D1 storage,
 * lookup, and revocation for Npub-linked API Bearer Keys (`wk_live_...`).
 */

import type { ApiKey, ApiUser } from './types.ts';
import { nanoid } from './nanoid.ts';

export interface CreateApiKeyOptions {
  userId: string;
  name: string;
  permissions?: string[];
  expiresInDays?: number;
}

export interface CreateApiKeyResult {
  keyId: string;
  rawKey: string;
  keyPrefix: string;
  name: string;
  permissions: string[];
  expiresAt: number | null;
  createdAt: number;
}

export interface VerifyApiKeyResult {
  isValid: boolean;
  user?: ApiUser;
  key?: ApiKey;
  error?: string;
  statusCode?: number;
}

/**
 * Compute SHA-256 hash of API key using standard Web Crypto API
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Securely generate a new API key string with wk_live_ prefix
 */
export function generateRawApiKey(): { rawKey: string; keyPrefix: string } {
  const randomBytes = new Uint8Array(24);
  crypto.getRandomValues(randomBytes);
  const randomHex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const rawKey = `wk_live_${randomHex}`;
  const keyPrefix = rawKey.slice(0, 16); // e.g. "wk_live_a1b2c3d4"
  return { rawKey, keyPrefix };
}

/**
 * Provision and persist a new API key tied to an existing API user
 */
export async function createApiKey(
  db: D1Database,
  options: CreateApiKeyOptions
): Promise<CreateApiKeyResult> {
  const { rawKey, keyPrefix } = generateRawApiKey();
  const keyHash = await hashApiKey(rawKey);
  const keyId = `key_${nanoid()}`;
  const now = Date.now();
  const permissions = options.permissions && options.permissions.length > 0
    ? options.permissions
    : ['audit:read', 'audit:write'];
  const permissionsJson = JSON.stringify(permissions);

  let expiresAt: number | null = null;
  if (options.expiresInDays && options.expiresInDays > 0) {
    expiresAt = now + options.expiresInDays * 24 * 60 * 60 * 1000;
  }

  await db
    .prepare(
      `INSERT INTO api_keys (
        id, user_id, key_hash, key_prefix, name, permissions, expires_at, last_used_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`
    )
    .bind(keyId, options.userId, keyHash, keyPrefix, options.name, permissionsJson, expiresAt, now)
    .run();

  return {
    keyId,
    rawKey,
    keyPrefix,
    name: options.name,
    permissions,
    expiresAt,
    createdAt: now,
  };
}

/**
 * Verify incoming Bearer API Key against D1 records
 */
export async function verifyApiKey(
  db: D1Database,
  bearerToken: string
): Promise<VerifyApiKeyResult> {
  const token = bearerToken.trim();

  if (!token.startsWith('wk_live_')) {
    return {
      isValid: false,
      error: 'Invalid API key format. Expected prefix wk_live_',
      statusCode: 401,
    };
  }

  const keyHash = await hashApiKey(token);

  interface DbJoinRow {
    key_id: string;
    user_id: string;
    key_hash: string;
    key_prefix: string;
    key_name: string;
    permissions: string;
    expires_at: number | null;
    last_used_at: number | null;
    key_created_at: number;
    u_id: string;
    pubkey: string;
    npub: string;
    tier: 'free' | 'pro' | 'enterprise';
    daily_quota: number;
    is_active: number;
    user_created_at: number;
    user_updated_at: number;
  }

  const row = await db
    .prepare(
      `SELECT
        k.id AS key_id,
        k.user_id,
        k.key_hash,
        k.key_prefix,
        k.name AS key_name,
        k.permissions,
        k.expires_at,
        k.last_used_at,
        k.created_at AS key_created_at,
        u.id AS u_id,
        u.pubkey,
        u.npub,
        u.tier,
        u.daily_quota,
        u.is_active,
        u.created_at AS user_created_at,
        u.updated_at AS user_updated_at
      FROM api_keys k
      INNER JOIN api_users u ON k.user_id = u.id
      WHERE k.key_hash = ?`
    )
    .bind(keyHash)
    .first<DbJoinRow>();

  if (!row) {
    return {
      isValid: false,
      error: 'Invalid or revoked API key.',
      statusCode: 401,
    };
  }

  if (row.is_active !== 1) {
    return {
      isValid: false,
      error: 'Associated Nostr user account is disabled or suspended.',
      statusCode: 403,
    };
  }

  const now = Date.now();
  if (row.expires_at && row.expires_at < now) {
    return {
      isValid: false,
      error: 'API key has expired.',
      statusCode: 401,
    };
  }

  let parsedPermissions: string[] = ['audit:read', 'audit:write'];
  try {
    parsedPermissions = JSON.parse(row.permissions);
  } catch {
    parsedPermissions = ['audit:read', 'audit:write'];
  }

  const user: ApiUser = {
    id: row.u_id,
    pubkey: row.pubkey,
    npub: row.npub,
    tier: row.tier,
    daily_quota: row.daily_quota,
    is_active: row.is_active,
    created_at: row.user_created_at,
    updated_at: row.user_updated_at,
  };

  const key: ApiKey = {
    id: row.key_id,
    user_id: row.user_id,
    key_hash: row.key_hash,
    key_prefix: row.key_prefix,
    name: row.key_name,
    permissions: parsedPermissions,
    expires_at: row.expires_at,
    last_used_at: row.last_used_at,
    created_at: row.key_created_at,
  };

  // Update last_used_at timestamp in D1 non-blockingly
  try {
    await db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').bind(now, key.id).run();
  } catch {
    // Non-fatal if telemetry update fails
  }

  return {
    isValid: true,
    user,
    key,
  };
}

/**
 * List all active API keys for a given user (never exposing secret hash)
 */
export async function listApiKeys(
  db: D1Database,
  userId: string
): Promise<Omit<ApiKey, 'key_hash'>[]> {
  interface DbKeyRow {
    id: string;
    user_id: string;
    key_prefix: string;
    name: string;
    permissions: string;
    expires_at: number | null;
    last_used_at: number | null;
    created_at: number;
  }

  const rows = await db
    .prepare(
      `SELECT id, user_id, key_prefix, name, permissions, expires_at, last_used_at, created_at
       FROM api_keys
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .bind(userId)
    .all<DbKeyRow>();

  if (!rows.results) return [];

  return rows.results.map((r) => {
    let permissions: string[] = ['audit:read', 'audit:write'];
    try {
      permissions = JSON.parse(r.permissions);
    } catch {
      permissions = ['audit:read', 'audit:write'];
    }
    return {
      id: r.id,
      user_id: r.user_id,
      key_prefix: r.key_prefix,
      name: r.name,
      permissions,
      expires_at: r.expires_at,
      last_used_at: r.last_used_at,
      created_at: r.created_at,
    };
  });
}

/**
 * Revoke/Delete an API key by ID or Prefix for a specific user
 */
export async function revokeApiKey(
  db: D1Database,
  userId: string,
  keyIdOrPrefix: string
): Promise<boolean> {
  const res = await db
    .prepare('DELETE FROM api_keys WHERE user_id = ? AND (id = ? OR key_prefix = ?)')
    .bind(userId, keyIdOrPrefix, keyIdOrPrefix)
    .run();

  return (res.meta?.changes ?? 0) > 0;
}
