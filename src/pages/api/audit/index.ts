import type { APIRoute } from 'astro';
import { generateId, generateToken } from '../../../lib/nanoid';
import { sendVerificationEmail, upsertResendContact, RESEND_AUDIT_SEGMENT_ID } from '../../../lib/resend';

export const prerender = false;

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    let body: { url?: string; email?: string } = {};

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

    // URL validation & normalization
    let parsedUrl: URL;
    try {
      const normalized = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? rawUrl
        : `https://${rawUrl}`;
      parsedUrl = new URL(normalized);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid website URL.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return new Response(
        JSON.stringify({ error: 'Only HTTP and HTTPS URLs are supported.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const targetUrl = parsedUrl.toString();

    // Rate Limiting (using Cloudflare KV if bound)
    const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';
    if (env?.RATE_LIMITS) {
      const ipKey = `rate:ip:${clientIp}`;
      const emailKey = `rate:email:${rawEmail}`;

      const ipCountStr = await env.RATE_LIMITS.get(ipKey);
      const emailCountStr = await env.RATE_LIMITS.get(emailKey);

      const ipCount = ipCountStr ? parseInt(ipCountStr, 10) : 0;
      const emailCount = emailCountStr ? parseInt(emailCountStr, 10) : 0;

      if (ipCount >= 5) {
        return new Response(
          JSON.stringify({ error: 'Too many audit requests from this IP. Please wait 10 minutes.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (emailCount >= 3) {
        return new Response(
          JSON.stringify({ error: 'Too many audit requests for this email. Please wait an hour.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      await env.RATE_LIMITS.put(ipKey, (ipCount + 1).toString(), { expirationTtl: 600 });
      await env.RATE_LIMITS.put(emailKey, (emailCount + 1).toString(), { expirationTtl: 3600 });
    }

    const auditId = generateId(12);
    const token = generateToken(32);
    const createdAt = Math.floor(Date.now() / 1000);

    // Save to D1 database if bound
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
