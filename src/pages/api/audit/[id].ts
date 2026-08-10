import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, params, locals }) => {
  const env = locals.runtime?.env;
  const auditId = params.id;

  if (!auditId) {
    return new Response(JSON.stringify({ error: 'Audit ID missing' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle WebSocket Connection request for live progress updates
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader === 'websocket' && env?.AUDIT_STATUS_DO) {
    const doId = env.AUDIT_STATUS_DO.idFromName(auditId);
    const stub = env.AUDIT_STATUS_DO.get(doId);
    return stub.fetch(request);
  }

  if (!env?.DB) {
    return new Response(
      JSON.stringify({
        error: 'Database binding not available.',
        auditId,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const audit = await env.DB.prepare(
      'SELECT id, url, email, status, created_at, completed_at FROM audits WHERE id = ?'
    )
      .bind(auditId)
      .first<{
        id: string;
        url: string;
        email: string;
        status: string;
        created_at: number;
        completed_at: number | null;
      }>();

    if (!audit) {
      return new Response(JSON.stringify({ error: 'Audit report not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let aiOutput = null;
    if (audit.status === 'complete') {
      const aiRow = await env.DB.prepare(
        'SELECT score, issues_json, recommendation, recommendation_reason, summary, processed_at FROM ai_output WHERE audit_id = ?'
      )
        .bind(auditId)
        .first<{
          score: number;
          issues_json: string;
          recommendation: string;
          recommendation_reason: string;
          summary: string;
          processed_at: number;
        }>();

      if (aiRow) {
        let parsedIssues = [];
        try {
          parsedIssues = JSON.parse(aiRow.issues_json);
        } catch {
          parsedIssues = [];
        }

        aiOutput = {
          score: aiRow.score,
          issues: parsedIssues,
          recommendation: aiRow.recommendation,
          recommendationReason: aiRow.recommendation_reason,
          summary: aiRow.summary,
          processedAt: aiRow.processed_at,
        };
      }
    }

    return new Response(
      JSON.stringify({
        audit: {
          id: audit.id,
          url: audit.url,
          status: audit.status,
          createdAt: audit.created_at,
          completedAt: audit.completed_at,
        },
        aiOutput,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (err: any) {
    console.error('Audit status API error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
