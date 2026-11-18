import type { APIRoute } from 'astro';
import { requireAdminAuth } from '../../../lib/auth';
import { generateId } from '../../../lib/nanoid';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;

    // Enforce Admin RBAC Authorization Guard
    const authErrorResponse = await requireAdminAuth(request, env);
    if (authErrorResponse) {
      return authErrorResponse;
    }

    if (!env?.DB) {
      return new Response(
        JSON.stringify({
          success: true,
          leads: [
            {
              id: 'lead_demo1',
              audit_id: 'audit_demo1',
              service_type: 'rebuild',
              name: 'John Miller',
              email: 'john@example.com',
              budget: '$5,000 - $10,000',
              notes: 'Looking for complete site overhaul.',
              created_at: Math.floor(Date.now() / 1000) - 3600,
              url: 'https://example.com',
              score: 54,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const urlParams = new URL(request.url).searchParams;
    const serviceType = urlParams.get('serviceType');
    const limit = parseInt(urlParams.get('limit') || '50', 10);

    let query = `
      SELECT l.id, l.audit_id, l.service_type, l.name, l.email, l.budget, l.notes, l.created_at,
             a.url, o.score, o.recommendation
      FROM audit_leads l
      JOIN audits a ON l.audit_id = a.id
      LEFT JOIN audit_results o ON l.audit_id = o.audit_id
    `;

    const bindings: any[] = [];
    if (serviceType) {
      query += ` WHERE l.service_type = ?`;
      bindings.push(serviceType);
    }

    query += ` ORDER BY l.created_at DESC LIMIT ?`;
    bindings.push(limit);

    const stmt = env.DB.prepare(query);
    const leadsResult = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

    return new Response(
      JSON.stringify({
        success: true,
        leads: leadsResult?.results || [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Admin Leads GET error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to fetch audit leads.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;

    // Enforce Admin RBAC Authorization Guard
    const authErrorResponse = await requireAdminAuth(request, env);
    if (authErrorResponse) {
      return authErrorResponse;
    }

    let body: { leadId?: string; notes?: string; status?: string } = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { leadId, notes } = body;
    if (!leadId) {
      return new Response(JSON.stringify({ error: 'leadId is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (env?.DB) {
      const existing = await env.DB.prepare('SELECT id, audit_id FROM audit_leads WHERE id = ?').bind(leadId).first();
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Lead record not found.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (notes !== undefined) {
        await env.DB.prepare('UPDATE audit_leads SET notes = ? WHERE id = ?').bind(notes, leadId).run();
      }

      // Log admin update in audit_logs
      const logId = generateId(12);
      await env.DB.prepare(
        'INSERT INTO audit_logs (id, audit_id, action, details_json, timestamp) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(
          logId,
          existing.audit_id,
          'lead_notes_updated',
          JSON.stringify({ leadId, updated_by: 'admin' }),
          Math.floor(Date.now() / 1000)
        )
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lead updated successfully.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Admin Leads PATCH error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to update lead.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
