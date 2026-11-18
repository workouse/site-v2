import type { APIRoute } from 'astro';
import { requireApiAuth } from '../../../../lib/api-guard.ts';
import { createApiKey, listApiKeys, revokeApiKey } from '../../../../lib/api-key-manager.ts';
import type { Env } from '../../../../lib/types.ts';

export const prerender = false;

interface CreateTokenRequestBody {
  name?: string;
  permissions?: string[];
  expiresInDays?: number;
}

interface RevokeTokenRequestBody {
  keyId?: string;
  keyPrefix?: string;
}

/**
 * POST /api/v1/auth/token
 * Exchange NIP-98 signed Nostr challenge for a scoped Bearer API Key (`wk_live_...`)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as { runtime?: { env: Env } })?.runtime?.env;
    if (!env?.DB) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database binding (DB) is unavailable.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authResult = await requireApiAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { context } = authResult;

    let body: CreateTokenRequestBody = {};
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'Malformed JSON payload.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const keyName = body.name?.trim().slice(0, 64) || 'Nostr Headless Key';
    const expiresInDays = body.expiresInDays && body.expiresInDays > 0 && body.expiresInDays <= 365
      ? body.expiresInDays
      : undefined;

    const allowedPermissions = ['audit:read', 'audit:write'];
    const requestedPermissions = Array.isArray(body.permissions)
      ? body.permissions.filter((p) => typeof p === 'string' && allowedPermissions.includes(p))
      : ['audit:read', 'audit:write'];

    const newKey = await createApiKey(env.DB, {
      userId: context.user.id,
      name: keyName,
      permissions: requestedPermissions.length > 0 ? requestedPermissions : ['audit:read', 'audit:write'],
      expiresInDays,
    });

    return new Response(
      JSON.stringify({
        success: true,
        apiKey: newKey.rawKey,
        keyPrefix: newKey.keyPrefix,
        keyId: newKey.keyId,
        name: newKey.name,
        permissions: newKey.permissions,
        expiresAt: newKey.expiresAt,
        createdAt: newKey.createdAt,
        user: {
          id: context.user.id,
          pubkey: context.user.pubkey,
          npub: context.user.npub,
          tier: context.user.tier,
          dailyQuota: context.user.daily_quota,
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * GET /api/v1/auth/token
 * List all active API keys issued for the authenticated Nostr identity
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as { runtime?: { env: Env } })?.runtime?.env;
    if (!env?.DB) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database binding (DB) is unavailable.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authResult = await requireApiAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { context } = authResult;
    const keys = await listApiKeys(env.DB, context.user.id);

    return new Response(
      JSON.stringify({
        success: true,
        keys,
        user: {
          id: context.user.id,
          pubkey: context.user.pubkey,
          npub: context.user.npub,
          tier: context.user.tier,
          dailyQuota: context.user.daily_quota,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * DELETE /api/v1/auth/token
 * Revoke an API key by keyId or keyPrefix
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as { runtime?: { env: Env } })?.runtime?.env;
    if (!env?.DB) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database binding (DB) is unavailable.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authResult = await requireApiAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }

    const { context } = authResult;
    const url = new URL(request.url);
    let targetKeyId = url.searchParams.get('keyId') || url.searchParams.get('keyPrefix') || '';

    if (!targetKeyId && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = (await request.json()) as RevokeTokenRequestBody;
        targetKeyId = body.keyId || body.keyPrefix || '';
      } catch {
        // Fall through
      }
    }

    if (!targetKeyId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required query parameter or body field: keyId or keyPrefix.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const revoked = await revokeApiKey(env.DB, context.user.id, targetKeyId);

    if (!revoked) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key not found or already revoked.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'API key successfully revoked.',
        revokedKeyIdentifier: targetKeyId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
