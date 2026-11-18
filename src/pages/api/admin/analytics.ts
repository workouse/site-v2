import type { APIRoute } from 'astro';
import { requireAdminAuth } from '../../../lib/auth';

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
      // Baseline mock payload for dev / offline mode
      return new Response(
        JSON.stringify({
          success: true,
          analytics: {
            totalAudits: 24,
            completedAudits: 20,
            failedAudits: 1,
            totalLeads: 8,
            conversionRatePct: 33.3,
            avgScore: 72,
            totalPipelineValueUsd: 14700,
            recentAudits: [],
            statusBreakdown: {
              complete: 20,
              pending_verification: 1,
              queued: 1,
              running: 1,
              failed: 1,
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query D1 Database metrics
    const totalAuditsRow = await env.DB.prepare('SELECT COUNT(*) as count FROM audits').first();
    const completedAuditsRow = await env.DB.prepare("SELECT COUNT(*) as count FROM audits WHERE status = 'complete'").first();
    const failedAuditsRow = await env.DB.prepare("SELECT COUNT(*) as count FROM audits WHERE status = 'failed'").first();
    const totalLeadsRow = await env.DB.prepare('SELECT COUNT(*) as count FROM audit_leads').first();
    const avgScoreRow = await env.DB.prepare('SELECT AVG(score) as avg FROM audit_results').first();

    const leadsByService = await env.DB.prepare(
      'SELECT service_type, COUNT(*) as count FROM audit_leads GROUP BY service_type'
    ).all();

    const recentAuditsResult = await env.DB.prepare(
      `SELECT a.id, a.url, a.email, a.status, a.created_at, o.score, o.recommendation 
       FROM audits a 
       LEFT JOIN audit_results o ON a.id = o.audit_id 
       ORDER BY a.created_at DESC LIMIT 10`
    ).all();

    const totalAudits = (totalAuditsRow?.count as number) || 0;
    const completedAudits = (completedAuditsRow?.count as number) || 0;
    const failedAudits = (failedAuditsRow?.count as number) || 0;
    const totalLeads = (totalLeadsRow?.count as number) || 0;
    const avgScore = Math.round((avgScoreRow?.avg as number) || 0);

    const conversionRatePct = totalAudits > 0 ? Math.round((totalLeads / totalAudits) * 1000) / 10 : 0;

    // Compute pipeline value: fix ($700), rebuild ($2800), consultation ($350)
    let totalPipelineValueUsd = 0;
    if (leadsByService?.results) {
      for (const row of leadsByService.results as any[]) {
        if (row.service_type === 'fix') totalPipelineValueUsd += row.count * 700;
        else if (row.service_type === 'rebuild') totalPipelineValueUsd += row.count * 2800;
        else totalPipelineValueUsd += row.count * 350;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analytics: {
          totalAudits,
          completedAudits,
          failedAudits,
          totalLeads,
          conversionRatePct,
          avgScore,
          totalPipelineValueUsd,
          recentAudits: recentAuditsResult?.results || [],
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err: any) {
    console.error('Admin Analytics API error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to fetch admin analytics.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
