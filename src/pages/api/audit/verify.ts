import type { APIRoute } from 'astro';
import { upsertResendContact, RESEND_AUDIT_SEGMENT_ID } from '../../../lib/resend';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('Missing token parameter.', { status: 400 });
  }

  if (!env?.EMAIL_TOKENS || !env?.DB) {
    // Graceful fallback for local development without live Cloudflare bindings
    return new Response(
      'Cloudflare bindings (EMAIL_TOKENS, DB) are not active in this environment.',
      { status: 500 }
    );
  }

  try {
    const auditId = await env.EMAIL_TOKENS.get(`token:${token}`);
    if (!auditId) {
      return new Response(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Verification Link Expired — Workouse</title>
          <style>
            body { background: #09090b; color: #fafafa; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #18181b; border: 1px solid #27272a; padding: 2rem; border-radius: 12px; max-width: 420px; text-align: center; }
            h1 { color: #ef4444; font-size: 1.25rem; }
            p { color: #a1a1aa; font-size: 0.9rem; margin-top: 0.5rem; }
            a { display: inline-block; margin-top: 1.5rem; background: #FEC500; color: #09090b; font-weight: bold; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Invalid or Expired Link</h1>
            <p>This email verification link has expired or has already been used.</p>
            <a href="/">Request a New Audit →</a>
          </div>
        </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Retrieve audit record from D1
    const audit = await env.DB.prepare('SELECT id, url, email, status FROM audits WHERE id = ?')
      .bind(auditId)
      .first<{ id: string; url: string; email: string; status: string }>();

    if (!audit) {
      return new Response('Audit session not found.', { status: 444 });
    }

    // Update status to queued
    await env.DB.prepare('UPDATE audits SET status = ? WHERE id = ?')
      .bind('queued', auditId)
      .run();

    // Enqueue audit job to Cloudflare Queue if bound
    if (env.AUDIT_QUEUE) {
      await env.AUDIT_QUEUE.send({
        auditId: audit.id,
        url: audit.url,
        email: audit.email,
        enqueuedAt: Date.now(),
      });
    }

    // Sync contact to Resend audience list
    if (env.RESEND_API_KEY) {
      await upsertResendContact({
        apiKey: env.RESEND_API_KEY,
        email: audit.email,
        siteUrl: audit.url,
        segmentId: RESEND_AUDIT_SEGMENT_ID,
      });
    }

    // Cleanup token
    await env.EMAIL_TOKENS.delete(`token:${token}`);

    // Redirect to progress/report page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/audit/${auditId}?verified=true`,
      },
    });
  } catch (err: any) {
    console.error('Verification error:', err);
    return new Response(`Verification failed: ${err.message}`, { status: 500 });
  }
};
