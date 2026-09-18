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
        'SELECT score, performance_score, security_score, seo_score, standards_score, issues_json, recommendation, recommendation_reason, summary, story, processed_at FROM audit_results WHERE audit_id = ?'
      )
        .bind(auditId)
        .first<{
          score: number;
          performance_score: number;
          security_score: number;
          seo_score: number;
          standards_score: number;
          issues_json: string;
          recommendation: string;
          recommendation_reason: string;
          summary: string;
          story: string | null;
          processed_at: number;
        }>();

      let modernizationReport = null;

      // Try fetching full raw results from R2 if bound
      if (env.AUDIT_RESULTS) {
        try {
          const r2Obj = await env.AUDIT_RESULTS.get(`raw_${auditId}.json`);
          if (r2Obj) {
            const rawResults = await r2Obj.json() as any;
            if (rawResults?.techstack) {
              const { generateModernizationChecklist } = await import('../../../lib/techstack-engine');
              modernizationReport = generateModernizationChecklist(rawResults.techstack, rawResults);
            }
          }
        } catch (r2Err) {
          console.warn('R2 raw audit fetch warning:', r2Err);
        }
      }

      // Fallback: build default modernization checklist if R2 not bound
      if (!modernizationReport) {
        const { detectTechStack, generateModernizationChecklist } = await import('../../../lib/techstack-engine');
        const { inspectDataRegulation, fetchDistributedWebFeatures } = await import('../../../lib/audit-engine');
        const fallbackTech = detectTechStack('', {}, audit.url);
        const fallbackDistributed = await fetchDistributedWebFeatures(audit.url, '');
        modernizationReport = generateModernizationChecklist(fallbackTech, {
          pagespeed: { score: 65, lcp: 3200, cls: 0.18, tbt: 350, ttfb: 650, speedIndex: 3100, hasUnoptimizedImages: true, hasRenderBlockingJs: true },
          security: { isHttps: audit.url.startsWith('https://'), hasHsts: false, hasCsp: false, hasXFrameOptions: false, hasReferrerPolicy: false, hasNosniff: false, hasPermissionsPolicy: false, rawHeaders: {} },
          seo: { hasTitle: true, titleText: null, titleLength: 30, hasMetaDescription: false, metaDescriptionText: null, metaDescriptionLength: 0, hasH1: true, h1Count: 1, hasCanonical: false, canonicalUrl: null, hasOgTags: false, hasOgImage: false, hasTwitterCards: false, hasSchemaOrg: false, schemaTypes: [], hasRobotsTxt: false, hasSitemapXml: false, imagesWithoutAltCount: 0, totalImagesCount: 0, hasPoorAltText: false, poorAltTextCount: 0, hasCharsetMeta: true, hasLangAttribute: true, hasSkippedHeadings: false, headingSkippedLevels: [], emptyHeadingsCount: 0, hasSemanticLandmarks: true, semanticLandmarks: { hasHeader: true, hasNav: true, hasMain: true, hasFooter: true, hasSectionOrArticle: true }, urlQuality: { isTooLong: false, hasUnderscores: false, hasUppercase: false, length: audit.url.length, path: '' }, hasHreflang: false, hreflangLocales: [], isNoindex: false },
          standards: { hasDoctype: true, hasLangAttribute: true, langValue: 'en', hasViewportMeta: true, hasFavicon: true, hasLlmsTxt: false, hasSecurityTxt: false, hasSitemapXml: false },
          techstack: fallbackTech,
          observatory: { score: 70, grade: 'B', state: 'FALLBACK', testsPassed: 6, testsFailed: 2, testsQuantity: 8 },
          pa11y: { score: 75, totalErrors: 0, totalWarnings: 0, issues: [] },
          mobile: { hasViewportMeta: true, hasZoomDisabled: false, hasHorizontalOverflow: false, overflowWidth: 0, undersizedTouchTargetsCount: 0, smallTextElementsCount: 0, hasResponsiveImages: false },
          regulation: inspectDataRegulation(''),
          distributed: fallbackDistributed,
          fetchedAt: Math.floor(Date.now() / 1000),
        });
      }

      if (aiRow) {
        let parsedIssues = [];
        try {
          parsedIssues = JSON.parse(aiRow.issues_json);
        } catch {
          parsedIssues = [];
        }

        const { parseStoryToBriefing, briefingToPlainText } = await import('../../../lib/story-engine');
        const executiveBriefing = parseStoryToBriefing(aiRow.story, {
          url: audit.url,
          scores: {
            overall: aiRow.score,
            performance: aiRow.performance_score,
            security: aiRow.security_score,
            seo: aiRow.seo_score,
            standards: aiRow.standards_score,
          },
          issues: parsedIssues,
          recommendation: aiRow.recommendation as any,
          platform: modernizationReport?.techStack?.platform,
          platformVersion: modernizationReport?.techStack?.platformVersion,
          detectedExtensionsCount: modernizationReport?.techStack?.detectedExtensions?.length,
        });

        const story = aiRow.story || briefingToPlainText(executiveBriefing);

        aiOutput = {
          score: aiRow.score,
          performanceScore: aiRow.performance_score,
          securityScore: aiRow.security_score,
          seoScore: aiRow.seo_score,
          standardsScore: aiRow.standards_score,
          issues: parsedIssues,
          recommendation: aiRow.recommendation,
          recommendationReason: aiRow.recommendation_reason,
          summary: aiRow.summary,
          story,
          executiveBriefing,
          processedAt: aiRow.processed_at,
          modernizationReport,
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
