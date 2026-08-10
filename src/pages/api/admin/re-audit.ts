import type { APIRoute } from 'astro';
import { requireAdminAuth } from '../../../lib/auth';
import { generateId } from '../../../lib/nanoid';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;

    // Enforce Admin RBAC Guard
    const authErrorResponse = await requireAdminAuth(request, env);
    if (authErrorResponse) {
      return authErrorResponse;
    }

    let body: { auditId?: string; url?: string; email?: string } = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let targetUrl = body.url?.trim();
    let targetEmail = body.email?.trim().toLowerCase() || 'admin@workouse.com';

    if (body.auditId && env?.DB) {
      const existingAudit = await env.DB.prepare('SELECT url, email FROM audits WHERE id = ?')
        .bind(body.auditId)
        .first();
      if (existingAudit) {
        targetUrl = existingAudit.url as string;
        targetEmail = existingAudit.email as string;
      }
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Valid target url or auditId is required for re-audit.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newAuditId = generateId(10);
    const createdAt = Math.floor(Date.now() / 1000);

    // Save re-audit session directly to queued status
    if (env?.DB) {
      await env.DB.prepare(
        'INSERT INTO audits (id, url, email, status, created_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(newAuditId, targetUrl, targetEmail, 'queued', createdAt)
        .run();

      // Log re-audit trigger event in audit_logs
      const logId = generateId(12);
      await env.DB.prepare(
        'INSERT INTO audit_logs (id, audit_id, action, details_json, timestamp) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(
          logId,
          newAuditId,
          're_audit_initiated',
          JSON.stringify({ originalAuditId: body.auditId || null, triggeredBy: 'admin' }),
          createdAt
        )
        .run();
    }

    // Push re-audit message directly to AUDIT_QUEUE
    if (env?.AUDIT_QUEUE) {
      await env.AUDIT_QUEUE.send({
        auditId: newAuditId,
        url: targetUrl,
        email: targetEmail,
        isReAudit: true,
        previousAuditId: body.auditId || null,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        auditId: newAuditId,
        message: `Re-audit initiated for ${targetUrl}. Audit job enqueued successfully.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Admin Re-audit POST error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to initiate re-audit.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
