import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params, url, locals }) => {
  const env = locals.runtime?.env;
  const auditId = params.id;
  const format = url.searchParams.get('format')?.toLowerCase() || 'json';

  if (!auditId) {
    return new Response(JSON.stringify({ error: 'Audit ID parameter missing.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env?.DB) {
    return new Response(JSON.stringify({ error: 'Database binding not available.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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
      return new Response(JSON.stringify({ error: 'Audit record not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

    const rawRow = await env.DB.prepare(
      'SELECT pagespeed_json, observatory_json, seo_json, fetched_at FROM raw_results WHERE audit_id = ?'
    )
      .bind(auditId)
      .first<{
        pagespeed_json: string;
        observatory_json: string;
        seo_json: string;
        fetched_at: number;
      }>();

    let issues = [];
    if (aiRow?.issues_json) {
      try {
        issues = JSON.parse(aiRow.issues_json);
      } catch {
        issues = [];
      }
    }

    let seoData = null;
    if (rawRow?.seo_json) {
      try {
        seoData = JSON.parse(rawRow.seo_json);
      } catch {
        seoData = null;
      }
    }

    let observatoryData = null;
    if (rawRow?.observatory_json) {
      try {
        observatoryData = JSON.parse(rawRow.observatory_json);
      } catch {
        observatoryData = null;
      }
    }

    const reportData = {
      audit: {
        id: audit.id,
        targetUrl: audit.url,
        status: audit.status,
        createdAt: new Date(audit.created_at * 1000).toISOString(),
        completedAt: audit.completed_at ? new Date(audit.completed_at * 1000).toISOString() : null,
      },
      evaluation: aiRow
        ? {
            score: aiRow.score,
            recommendation: aiRow.recommendation,
            recommendationReason: aiRow.recommendation_reason,
            summary: aiRow.summary,
            issuesCount: issues.length,
            issues,
          }
        : null,
      diagnostics: {
        seo: seoData,
        security: observatoryData,
      },
      exportedAt: new Date().toISOString(),
    };

    if (format === 'html') {
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Workouse Performance Audit Report — ${audit.url}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #18181b; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.5; }
    h1, h2, h3 { color: #09090b; }
    .header { border-bottom: 2px solid #e4e4e7; padding-bottom: 20px; margin-bottom: 30px; }
    .score-badge { display: inline-block; padding: 12px 24px; border-radius: 8px; font-weight: 800; font-size: 24px; background: #003087; color: #ffffff; }
    .issue-card { border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
    .issue-title { font-weight: bold; font-size: 16px; margin-bottom: 6px; }
    .cost { float: right; font-weight: bold; color: #003087; }
    .footer { margin-top: 50px; font-size: 12px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 20px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <span style="font-weight: 800; color: #003087; font-size: 20px; text-transform: uppercase;">WORKOUSE AUDIT REPORT</span>
    <h1>Website Performance & Quality Audit</h1>
    <p><strong>Target Site:</strong> ${audit.url} | <strong>Audit ID:</strong> ${audit.id}</p>
    <p><strong>Generated Date:</strong> ${reportData.exportedAt}</p>
  </div>

  ${
    reportData.evaluation
      ? `
    <div style="margin-bottom: 30px;">
      <div class="score-badge">Overall Score: ${reportData.evaluation.score} / 100</div>
      <h2>Strategic Recommendation</h2>
      <p><strong>Action:</strong> ${reportData.evaluation.recommendation.toUpperCase()}</p>
      <p>${reportData.evaluation.recommendationReason}</p>
      <h2>Executive Summary</h2>
      <p>${reportData.evaluation.summary}</p>
    </div>

    <h2>Identified Bottlenecks & Audit Findings (${reportData.evaluation.issues.length})</h2>
    ${reportData.evaluation.issues
      .map(
        (issue: any) => `
      <div class="issue-card">
        <span class="cost">Estimated Fix: $${issue.price || 0} (${Math.round(((issue.estimatedMinutes || 60) / 60) * 10) / 10} hrs)</span>
        <div class="issue-title">[${(issue.category || 'TECHNICAL').toUpperCase()}] ${issue.title}</div>
        <p><strong>Business Impact:</strong> ${issue.businessImpact || 'Impacts site quality and performance.'}</p>
      </div>
    `
      )
      .join('')}
  `
      : `<p>Audit results are pending or processing.</p>`
  }

  <div class="footer">
    <p>© Workouse Audit Engine. Contact: z@emre.xyz | emre.xyz</p>
  </div>
</body>
</html>
      `.trim();

      return new Response(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="workouse-audit-${auditId}.html"`,
        },
      });
    }

    return new Response(JSON.stringify(reportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="workouse-audit-${auditId}.json"`,
      },
    });
  } catch (err: any) {
    console.error('Audit report export error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
