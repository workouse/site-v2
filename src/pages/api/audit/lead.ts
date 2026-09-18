import type { APIRoute } from 'astro';
import { generateId } from '../../../lib/nanoid';
import { sendLeadNotificationEmail, upsertResendContact, RESEND_AUDIT_SEGMENT_ID } from '../../../lib/resend';

export const prerender = false;

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    let body: {
      auditId?: string;
      serviceType?: 'fix' | 'rebuild' | 'consultation';
      name?: string;
      email?: string;
      budget?: string;
      notes?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const auditId = body.auditId?.trim();
    const serviceType = body.serviceType || 'consultation';
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const budget = body.budget?.trim();
    const notes = body.notes?.trim();

    if (!auditId || !name || !email) {
      return new Response(
        JSON.stringify({ error: 'auditId, name, and email are required fields.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid email address.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const leadId = generateId(12);
    const createdAt = Math.floor(Date.now() / 1000);

    let auditedSiteUrl = 'https://workouse.com';
    // Save lead into D1 if available
    if (env?.DB) {
      // Verify audit existing
      const audit = await env.DB.prepare('SELECT id, url FROM audits WHERE id = ?').bind(auditId).first<{ id: string; url?: string }>();
      if (!audit) {
        return new Response(
          JSON.stringify({ error: 'Referenced audit session not found.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (audit.url) {
        auditedSiteUrl = audit.url;
      }

      await env.DB.prepare(
        'INSERT INTO audit_leads (id, audit_id, service_type, name, email, budget, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(leadId, auditId, serviceType, name, email, budget || null, notes || null, createdAt)
        .run();
    }

    // Send email alert to team & sync contact to Resend if configured
    if (env?.RESEND_API_KEY) {
      const teamEmail = env.ADMIN_EMAIL || 'z@emre.xyz';
      await sendLeadNotificationEmail(env.RESEND_API_KEY, teamEmail, {
        auditId,
        serviceType,
        name,
        email,
        budget,
        notes,
      });

      await upsertResendContact({
        apiKey: env.RESEND_API_KEY,
        email,
        siteUrl: auditedSiteUrl,
        firstName: name,
        segmentId: RESEND_AUDIT_SEGMENT_ID,
      });
    }

    if (env) {
      const { sendTelemetryEvent } = await import('../../../lib/telemetry');
      await sendTelemetryEvent(env, {
        category: 'lead',
        action: 'LEAD_SUBMITTED',
        auditId,
        url: auditedSiteUrl,
        details: { name, email, serviceType, budget },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadId,
        message: 'Your inquiry has been received. Our team will contact you within 24 hours.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Audit lead submission error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'An unexpected server error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
