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

    const urlObj = new URL(request.url);
    const auditId = urlObj.searchParams.get('auditId');
    const search = urlObj.searchParams.get('search');
    const limit = Math.min(parseInt(urlObj.searchParams.get('limit') || '20', 10), 100);

    if (!env?.DB) {
      // Mock payload for dev mode
      return new Response(
        JSON.stringify({
          success: true,
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

    let auditRows: any[] = [];

    if (auditId) {
      const res = await env.DB.prepare(
        'SELECT id, url, email, status, created_at, completed_at FROM audits WHERE id = ?'
      )
        .bind(auditId)
        .all();
      auditRows = res.results || [];
    } else if (search) {
      const queryPattern = `%${search.trim()}%`;
      const res = await env.DB.prepare(
        'SELECT id, url, email, status, created_at, completed_at FROM audits WHERE id LIKE ? OR url LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT ?'
      )
        .bind(queryPattern, queryPattern, queryPattern, limit)
        .all();
      auditRows = res.results || [];
    } else {
      const res = await env.DB.prepare(
        'SELECT id, url, email, status, created_at, completed_at FROM audits ORDER BY created_at DESC LIMIT ?'
      )
        .bind(limit)
        .all();
      auditRows = res.results || [];
    }

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
