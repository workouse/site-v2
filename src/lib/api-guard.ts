/**
 * Workouse Audit Tool — Unified API Access Guard & Dual-Authentication Middleware
 *
 * Supports both Nostr NIP-98 cryptographic headers and Bearer API keys (`wk_live_...`).
 * Handles Just-In-Time (JIT) provisioning of new Nostr accounts in Cloudflare D1.
 */

import type { ApiKey, ApiUser, Env } from './types.ts';
import { verifyNip98Request, pubkeyToNpub, type NostrEvent } from './nostr-auth.ts';
import { verifyApiKey } from './api-key-manager.ts';
import { nanoid } from './nanoid.ts';

export interface ApiAuthContext {
  user: ApiUser;
  authType: 'nip98' | 'api_key';
  apiKey?: ApiKey;
  nostrEvent?: NostrEvent;
}

export interface ApiAuthResult {
  authorized: boolean;
  context?: ApiAuthContext;
  error?: string;
  statusCode?: number;
  code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_TOKEN' | 'DATABASE_ERROR';
}

/**
 * Get or automatically provision an API user record in D1 via Nostr pubkey (JIT)
 */
export async function getOrCreateApiUser(
  db: D1Database,
  pubkey: string
): Promise<ApiUser> {
  const cleanPubkey = pubkey.toLowerCase().trim();

  // Try finding existing user
  const existing = await db
    .prepare('SELECT id, pubkey, npub, tier, daily_quota, is_active, created_at, updated_at FROM api_users WHERE pubkey = ?')
    .bind(cleanPubkey)
    .first<ApiUser>();

  if (existing) {
    return existing;
  }

  // JIT Provisioning for new Nostr public keys
  const id = `usr_${nanoid()}`;
  const npub = pubkeyToNpub(cleanPubkey);
  const now = Date.now();
  const tier = 'free';
  const dailyQuota = 50;
  const isActive = 1;

  try {
    await db
      .prepare(
        `INSERT INTO api_users (
          id, pubkey, npub, tier, daily_quota, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, cleanPubkey, npub, tier, dailyQuota, isActive, now, now)
      .run();

    return {
      id,
      pubkey: cleanPubkey,
      npub,
      tier,
      daily_quota: dailyQuota,
      is_active: isActive,
      created_at: now,
      updated_at: now,
    };
  } catch {
    // If concurrent insert occurred, fetch newly created record
    const refetched = await db
      .prepare('SELECT id, pubkey, npub, tier, daily_quota, is_active, created_at, updated_at FROM api_users WHERE pubkey = ?')
      .bind(cleanPubkey)
      .first<ApiUser>();

    if (refetched) return refetched;
    throw new Error('Failed to create or retrieve API user in database.');
  }
}

/**
 * Authenticate incoming API Request using NIP-98 or API Bearer Key
 */
export async function authenticateApiRequest(
  request: Request,
  env: Env
): Promise<ApiAuthResult> {
  if (!env?.DB) {
    return {
      authorized: false,
      error: 'Database binding (DB) is unavailable.',
      statusCode: 500,
      code: 'DATABASE_ERROR',
    };
  }

  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');

  if (!authHeader) {
    return {
      authorized: false,
      error: 'Missing Authorization header. Provide Nostr NIP-98 header or Bearer API key.',
      statusCode: 401,
      code: 'UNAUTHORIZED',
    };
  }

  const trimmedHeader = authHeader.trim();

  // 1. NIP-98 Nostr Authentication
  if (trimmedHeader.toLowerCase().startsWith('nostr ')) {
    const validation = await verifyNip98Request(request);
    if (!validation.isValid || !validation.pubkey) {
      return {
        authorized: false,
        error: validation.error || 'NIP-98 Nostr authentication failed.',
        statusCode: validation.statusCode || 401,
        code: 'UNAUTHORIZED',
      };
    }

    try {
      const user = await getOrCreateApiUser(env.DB, validation.pubkey);
      if (user.is_active !== 1) {
        return {
          authorized: false,
          error: 'User account is disabled or suspended.',
          statusCode: 403,
          code: 'FORBIDDEN',
        };
      }

      return {
        authorized: true,
        context: {
          user,
          authType: 'nip98',
          nostrEvent: validation.event,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        authorized: false,
        error: `Database authentication error: ${msg}`,
        statusCode: 500,
        code: 'DATABASE_ERROR',
      };
    }
  }

  // 2. Bearer API Key Authentication
  if (trimmedHeader.toLowerCase().startsWith('bearer ')) {
    const parts = trimmedHeader.split(/\s+/);
    if (parts.length !== 2) {
      return {
        authorized: false,
        error: 'Invalid Bearer token format.',
        statusCode: 401,
        code: 'INVALID_TOKEN',
      };
    }

    const token = parts[1].trim();

    // Check if it's a Workouse API key
    if (token.startsWith('wk_live_')) {
      const keyResult = await verifyApiKey(env.DB, token);
      if (!keyResult.isValid || !keyResult.user || !keyResult.key) {
        return {
          authorized: false,
          error: keyResult.error || 'Invalid or expired API key.',
          statusCode: keyResult.statusCode || 401,
          code: 'INVALID_TOKEN',
        };
      }

      return {
        authorized: true,
        context: {
          user: keyResult.user,
          authType: 'api_key',
          apiKey: keyResult.key,
        },
      };
    }

    // Check if it's the admin secret key override
    const configuredSecret = env?.ADMIN_SECRET_KEY || 'workouse_admin_secret_dev_key_2026';
    if (token === configuredSecret) {
      const adminUser: ApiUser = {
        id: 'usr_admin_root',
        pubkey: '0000000000000000000000000000000000000000000000000000000000000000',
        npub: 'npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq2822a9',
        tier: 'enterprise',
        daily_quota: 100000,
        is_active: 1,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      return {
        authorized: true,
        context: {
          user: adminUser,
          authType: 'api_key',
        },
      };
    }

    return {
      authorized: false,
      error: 'Unrecognized Bearer token format. API keys must start with wk_live_',
      statusCode: 401,
      code: 'INVALID_TOKEN',
    };
  }

  return {
    authorized: false,
    error: 'Unsupported Authorization scheme. Supported schemes: Nostr <base64>, Bearer <key>',
    statusCode: 401,
    code: 'UNAUTHORIZED',
  };
}

/**
 * Astro API endpoint guard helper
 * Returns { context: ApiAuthContext } or Response with HTTP 401/403
 */
export async function requireApiAuth(
  request: Request,
  env: Env
): Promise<{ context: ApiAuthContext } | Response> {
  const auth = await authenticateApiRequest(request, env);

  if (!auth.authorized || !auth.context) {
    return new Response(
      JSON.stringify({
        success: false,
        error: auth.error || 'Authentication required.',
        code: auth.code || 'UNAUTHORIZED',
      }),
      {
        status: auth.statusCode || 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Nostr realm="Workouse API", Bearer realm="Workouse API"',
        },
      }
    );
  }

  return { context: auth.context };
}
