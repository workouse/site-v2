import type { APIRoute } from 'astro';
import { generateId, generateToken } from '../../../lib/nanoid';
import { sendVerificationEmail, upsertResendContact, RESEND_AUDIT_SEGMENT_ID } from '../../../lib/resend';
import { verifyRBAC } from '../../../lib/auth';
import { validateAuditUrl } from '../../../lib/url-validator';
import {
  normalizeDomainHost,
  findRecentDomainAudit,
  checkRateLimit,
  recordRateLimit,
} from '../../../lib/rate-limiter';

export const prerender = false;

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    let body: { url?: string; email?: string; force?: boolean; skipCache?: boolean } = {};

    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rawUrl = body.url?.trim();
    const rawEmail = body.email?.trim().toLowerCase();

    if (!rawUrl || !rawEmail) {
      return new Response(
        JSON.stringify({ error: 'Both "url" and "email" parameters are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    if (!EMAIL_REGEX.test(rawEmail)) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid email address.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // URL validation & verification (format, TLD, SSRF check & DNS resolution)
    const urlValidation = await validateAuditUrl(rawUrl, { checkDns: true });
    if (!urlValidation.isValid || !urlValidation.normalizedUrl || !urlValidation.domainHost) {
      return new Response(
        JSON.stringify({ error: urlValidation.error || 'Please provide a valid website URL.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const targetUrl = urlValidation.normalizedUrl;
    const domainHost = urlValidation.domainHost;

    // Check if requester is authenticated Admin
    const authResult = await verifyRBAC(request, env, 'admin');
    const isAdmin = authResult.authorized;

    const skipCache = Boolean(body.force || body.skipCache);

    // 1. Domain 30-Day Cache Lookup (if not Admin skipping cache)
    if (!isAdmin || !skipCache) {
      const recentAudit = await findRecentDomainAudit(env, domainHost, 30);
      if (recentAudit) {
        // Return existing audit report without consuming rate limits
        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            auditId: recentAudit.id,
            message: `An audit for ${domainHost} was completed within the last 30 days. Displaying existing analysis.`,
            redirectUrl: `/audit/${recentAudit.id}`,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Client IP identification
    const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';

    // 2. Admin flow: Unlimited audits & Skip Email Verification
    if (isAdmin) {
      const adminAuditId = generateId(12);
      const createdAt = Math.floor(Date.now() / 1000);

      // Save directly with 'queued' status
      if (env?.DB) {
        await env.DB.prepare(
          'INSERT INTO audits (id, url, email, status, created_at) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(adminAuditId, targetUrl, rawEmail, 'queued', createdAt)
          .run();

        // Audit log entry
        const logId = generateId(12);
        await env.DB.prepare(
          'INSERT INTO audit_logs (id, audit_id, action, details_json, timestamp) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(
            logId,
            adminAuditId,
            'admin_audit_created',
            JSON.stringify({ triggeredBy: 'admin', domainHost }),
            createdAt
          )
          .run();
      }

      // Enqueue audit job directly to Cloudflare Queue if bound
      if (env?.AUDIT_QUEUE) {
        await env.AUDIT_QUEUE.send({
          auditId: adminAuditId,
          url: targetUrl,
          email: rawEmail,
          isAdminTriggered: true,
          enqueuedAt: Date.now(),
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          isAdmin: true,
          auditId: adminAuditId,
          message: 'Admin audit created directly without verification. Analysis enqueued.',
          redirectUrl: `/audit/${adminAuditId}`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Public User Rate Limiting (1 request / 24h per IP, 1 request / 7d per Email)
    const rateLimitResult = await checkRateLimit(env, clientIp, rawEmail);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.reason }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit passed — Record consumption in KV
    await recordRateLimit(env, clientIp, rawEmail);

    // 4. Create new audit in 'pending_verification' status
    const auditId = generateId(12);
    const token = generateToken(32);
    const createdAt = Math.floor(Date.now() / 1000);

    if (env?.DB) {
      await env.DB.prepare(
        'INSERT INTO audits (id, url, email, status, created_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(auditId, targetUrl, rawEmail, 'pending_verification', createdAt)
        .run();

      if (env.EMAIL_TOKENS) {
        await env.EMAIL_TOKENS.put(`token:${token}`, auditId, { expirationTtl: 86400 });
      }
    }

    // Build URL for verification
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;
    const verifyUrl = `${origin}/api/audit/verify?token=${token}`;
    const auditUrl = `${origin}/audit/${auditId}`;

    // Send verification email & upsert contact to Resend
    const resendApiKey = env?.RESEND_API_KEY || 'mock_key_for_dev';
    if (env?.RESEND_API_KEY) {
      await sendVerificationEmail(resendApiKey, rawEmail, verifyUrl, auditUrl);
      await upsertResendContact({
        apiKey: resendApiKey,
        email: rawEmail,
        siteUrl: targetUrl,
        segmentId: RESEND_AUDIT_SEGMENT_ID,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        auditId,
        message: 'Verification link sent. Please check your inbox to start the audit.',
        verifyUrlDev: env?.RESEND_API_KEY ? undefined : verifyUrl,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Audit submission error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'An unexpected server error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
