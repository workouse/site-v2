/**
 * Workouse Audit Tool - Rate Limiter & Domain Cache Engine
 *
 * Enforces IP rate limits (1 per 24h), Email rate limits (1 per 7d),
 * domain hostname deduplication (30-day cache), and Admin bypasses.
 */

import type { Env } from './types';

/**
 * Normalizes an incoming target URL string into its canonical domain hostname.
 * e.g., "https://a.com/path?foo=bar#hash" -> "a.com"
 * e.g., "http://sub.domain.co.uk:8080/test" -> "sub.domain.co.uk"
 */
export function normalizeDomainHost(rawUrl: string): string {
  let target = rawUrl.trim();
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    target = `https://${target}`;
  }

  try {
    const parsed = new URL(target);
    // Lowercase hostname without leading/trailing whitespace
    let host = parsed.hostname.toLowerCase().trim();
    // Strip leading www. if present for unified domain grouping
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    return host;
  } catch {
    return rawUrl.toLowerCase().trim();
  }
}

export interface DomainAuditRecord {
  id: string;
  url: string;
  email: string;
  status: string;
  created_at: number;
  completed_at: number | null;
}

/**
 * Queries D1 database to check if a completed or active audit exists for the given domain hostname
 * created within the last `maxAgeDays` (default 30 days).
 */
export async function findRecentDomainAudit(
  env: Env | any,
  domainHost: string,
  maxAgeDays: number = 30
): Promise<DomainAuditRecord | null> {
  if (!env?.DB) {
    return null;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const cutoffTimestamp = nowSeconds - maxAgeDays * 86400;

  try {
    // Search for audits where created_at is within cutoffTimestamp and status is complete or processing
    const queryRes = await env.DB.prepare(
      `SELECT id, url, email, status, created_at, completed_at
       FROM audits
       WHERE created_at >= ?
         AND status IN ('complete', 'queued', 'running', 'ai_processing')
       ORDER BY created_at DESC
       LIMIT 50`
    )
      .bind(cutoffTimestamp)
      .all();

    const results = queryRes as { results?: DomainAuditRecord[] };

    if (!results || !results.results || results.results.length === 0) {
      return null;
    }

    // Filter by matching domain host
    for (const record of results.results) {
      const recordHost = normalizeDomainHost(record.url);
      if (recordHost === domainHost) {
        return record;
      }
    }

    return null;
  } catch (err) {
    console.error('Error finding recent domain audit:', err);
    return null;
  }
}

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  limitedBy?: 'ip' | 'email';
}

/**
 * Checks IP rate limit (1 request per 24 hours / 86400s)
 * and Email rate limit (1 request per 7 days / 604800s) in Cloudflare KV.
 */
export async function checkRateLimit(
  env: Env | any,
  clientIp: string,
  email: string
): Promise<RateLimitCheckResult> {
  if (!env?.RATE_LIMITS) {
    // Graceful fallback when KV binding is absent in dev mode
    return { allowed: true };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const ipKey = `rate:ip:${clientIp}`;
  const emailKey = `rate:email:${normalizedEmail}`;

  try {
    const [ipRecord, emailRecord] = await Promise.all([
      env.RATE_LIMITS.get(ipKey),
      env.RATE_LIMITS.get(emailKey),
    ]);

    if (ipRecord) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded: IP address can only request 1 site audit per 24 hours.',
        limitedBy: 'ip',
      };
    }

    if (emailRecord) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded: Email address can only request 1 site audit per week (7 days).',
        limitedBy: 'email',
      };
    }

    return { allowed: true };
  } catch (err: any) {
    console.error('Rate limit check error:', err);
    return { allowed: true }; // Fail-open to avoid blocking users on KV error
  }
}

/**
 * Records rate limit consumption in Cloudflare KV:
 * - IP key expires in 24 hours (86,400 seconds).
 * - Email key expires in 7 days (604,800 seconds).
 */
export async function recordRateLimit(
  env: Env | any,
  clientIp: string,
  email: string
): Promise<void> {
  if (!env?.RATE_LIMITS) {
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const ipKey = `rate:ip:${clientIp}`;
  const emailKey = `rate:email:${normalizedEmail}`;

  const timestamp = Math.floor(Date.now() / 1000).toString();

  try {
    await Promise.all([
      // IP limit TTL: 24 hours (86,400s)
      env.RATE_LIMITS.put(ipKey, timestamp, { expirationTtl: 86400 }),
      // Email limit TTL: 7 days (604,800s)
      env.RATE_LIMITS.put(emailKey, timestamp, { expirationTtl: 604800 }),
    ]);
  } catch (err) {
    console.error('Error recording rate limit in KV:', err);
  }
}
