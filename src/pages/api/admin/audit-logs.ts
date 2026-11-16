import type { APIRoute } from 'astro';
import { requireAdminAuth } from '../../../lib/auth';
import { deleteAuditRecord } from '../../../lib/cleanup-engine';
import { sendTelemetryEvent } from '../../../lib/telemetry';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;

    // Enforce Admin RBAC Authorization Guard
    const authErrorResponse = await requireAdminAuth(request, env);
    if (authErrorResponse) {
      return authErrorResponse;
    }

    const urlObj = new URL(request.url);
    const auditId = urlObj.searchParams.get('auditId');
    const search = urlObj.searchParams.get('search');
    const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
    const limit = Math.min(Math.max(1, parseInt(urlObj.searchParams.get('limit') || '10', 10)), 100);
    const offset = (page - 1) * limit;

    if (!env?.DB) {
      // Mock payload for dev mode
      return new Response(
        JSON.stringify({
          success: true,
          page,
          limit,
          totalCount: 1,
          totalPages: 1,
          count: 1,
          logs: [
            {
              audit: {
                id: auditId || 'uYYWPGp4zRxg',
                url: 'https://workouse.com',
                email: 'test@workouse.com',
                status: 'complete',
                createdAt: Math.floor(Date.now() / 1000) - 3600,
                completedAt: Math.floor(Date.now() / 1000) - 3500,
              },
              aiOutput: {
                score: 90,
                issues: [],
                recommendation: 'fix',
                recommendationReason: 'Minor performance adjustments needed.',
                summary: 'Mock audit report for dev environment.',
                processedAt: Math.floor(Date.now() / 1000) - 3500,
              },
              rawResults: {
                pagespeed: {
                  score: 90,
                  lcp: 2200,
                  cls: 0.05,
                  tbt: 120,
                  ttfb: 450,
                  speedIndex: 2100,
                  hasUnoptimizedImages: false,
                  hasRenderBlockingJs: false,
                },
                security: {
                  isHttps: true,
                  hasHsts: true,
                  hasCsp: true,
                  hasXFrameOptions: true,
                  hasReferrerPolicy: true,
                  hasNosniff: true,
                  hasPermissionsPolicy: true,
                  rawHeaders: { 'strict-transport-security': 'max-age=31536000' },
                },
                seo: {
                  hasTitle: true,
                  titleText: 'Workouse - High Performance Websites',
                  hasMetaDescription: true,
                  metaDescriptionText: 'Workouse Audit Engine',
                  hasH1: true,
                  h1Count: 1,
                  hasCanonical: true,
                  canonicalUrl: 'https://workouse.com',
                  hasOgTags: true,
                  hasRobotsTxt: true,
                },
                fetchedAt: Math.floor(Date.now() / 1000) - 3550,
              },
              auditLogs: [
                {
                  id: 'log_1',
                  action: 'audit_completed',
                  details: { score: 90, issuesCount: 0 },
                  timestamp: Math.floor(Date.now() / 1000) - 3500,
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let totalCount = 0;
    let auditRows: any[] = [];

    if (auditId) {
      const countRes = await env.DB.prepare('SELECT COUNT(*) as count FROM audits WHERE id = ?')
        .bind(auditId)
        .first<{ count: number }>();
      totalCount = countRes?.count || 0;

      const res = await env.DB.prepare(
        'SELECT id, url, email, status, created_at, completed_at FROM audits WHERE id = ?'
      )
        .bind(auditId)
        .all();
      auditRows = res.results || [];
    } else if (search && search.trim().length > 0) {
      const queryPattern = `%${search.trim()}%`;
      const countRes = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM audits WHERE id LIKE ? OR url LIKE ? OR email LIKE ?'
      )
        .bind(queryPattern, queryPattern, queryPattern)
        .first<{ count: number }>();
      totalCount = countRes?.count || 0;

      const res = await env.DB.prepare(
        'SELECT id, url, email, status, created_at, completed_at FROM audits WHERE id LIKE ? OR url LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
        .bind(queryPattern, queryPattern, queryPattern, limit, offset)
        .all();
      auditRows = res.results || [];
    } else {
      const countRes = await env.DB.prepare('SELECT COUNT(*) as count FROM audits')
        .first<{ count: number }>();
      totalCount = countRes?.count || 0;

      const res = await env.DB.prepare(
        'SELECT id, url, email, status, created_at, completed_at FROM audits ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
        .bind(limit, offset)
        .all();
      auditRows = res.results || [];
    }

    const totalPages = Math.ceil(totalCount / limit) || 1;

    const logsPayload = await Promise.all(
      auditRows.map(async (audit) => {
        // Fetch raw diagnostic results
        const rawRow = await env.DB.prepare(
          'SELECT pagespeed_json, observatory_json, seo_json, fetched_at FROM raw_results WHERE audit_id = ?'
        )
          .bind(audit.id)
          .first<{
            pagespeed_json: string;
            observatory_json: string;
            seo_json: string;
            fetched_at: number;
          }>();

        let pagespeed = null;
        let security = null;
        let seo = null;

        if (rawRow) {
          try { pagespeed = JSON.parse(rawRow.pagespeed_json); } catch {}
          try { security = JSON.parse(rawRow.observatory_json); } catch {}
          try { seo = JSON.parse(rawRow.seo_json); } catch {}
        }

        // Fetch AI output
        const aiRow = await env.DB.prepare(
          'SELECT score, issues_json, recommendation, recommendation_reason, summary, processed_at FROM audit_results WHERE audit_id = ?'
        )
          .bind(audit.id)
          .first<{
            score: number;
            issues_json: string;
            recommendation: string;
            recommendation_reason: string;
            summary: string;
            processed_at: number;
          }>();

        let aiOutput = null;
        if (aiRow) {
          let issues = [];
          try { issues = JSON.parse(aiRow.issues_json); } catch {}
          aiOutput = {
            score: aiRow.score,
            issues,
            recommendation: aiRow.recommendation,
            recommendationReason: aiRow.recommendation_reason,
            summary: aiRow.summary,
            processedAt: aiRow.processed_at,
          };
        }

        // Fetch audit logs timeline entries
        const auditLogRows = await env.DB.prepare(
          'SELECT id, action, details_json, timestamp FROM audit_logs WHERE audit_id = ? ORDER BY timestamp DESC'
        )
          .bind(audit.id)
          .all<{ id: string; action: string; details_json: string; timestamp: number }>();

        const auditLogs = (auditLogRows.results || []).map((row) => {
          let details = null;
          try { details = JSON.parse(row.details_json); } catch { details = row.details_json; }
          return {
            id: row.id,
            action: row.action,
            details,
            timestamp: row.timestamp,
          };
        });

        return {
          audit: {
            id: audit.id,
            url: audit.url,
            email: audit.email,
            status: audit.status,
            createdAt: audit.created_at,
            completedAt: audit.completed_at,
          },
          aiOutput,
          rawResults: rawRow
            ? {
                pagespeed,
                security,
                seo,
                fetchedAt: rawRow.fetched_at,
              }
            : null,
          auditLogs,
        };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        page,
        limit,
        totalCount,
        totalPages,
        count: logsPayload.length,
        logs: logsPayload,
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
    console.error('Admin Audit Logs API Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to fetch audit logs.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;

    // Enforce Admin RBAC Authorization Guard
    const authErrorResponse = await requireAdminAuth(request, env);
    if (authErrorResponse) {
      return authErrorResponse;
    }

    const urlObj = new URL(request.url);
    let auditId = urlObj.searchParams.get('id') || urlObj.searchParams.get('auditId');

    if (!auditId) {
      try {
        const body: any = await request.json();
        auditId = body.id || body.auditId;
      } catch {}
    }

    if (!auditId || typeof auditId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Audit ID is required for deletion.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const deleteResult = await deleteAuditRecord(env, auditId.trim());

    if (!deleteResult.success) {
      return new Response(
        JSON.stringify({ error: deleteResult.error || 'Failed to delete audit record.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Broadcast DO telemetry event
    await sendTelemetryEvent(env, {
      category: 'audit',
      action: 'AUDIT_DELETED',
      auditId: auditId.trim(),
      details: { deletedBy: 'admin', timestamp: Date.now() },
    });

    return new Response(
      JSON.stringify({
        success: true,
        auditId: auditId.trim(),
        message: `Audit report ${auditId.trim()} has been permanently deleted.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Admin Delete Audit API Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to delete audit report.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
