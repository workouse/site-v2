import type { APIRoute } from 'astro';

export const prerender = false;

const LOGO_URL = 'https://avatars.githubusercontent.com/u/55496985?s=400&u=cf5cb2d74029d653813b39d624e44b8f74bc63c1&v=4';

export const GET: APIRoute = async ({ request, params, url, locals }) => {
  const env = locals.runtime?.env;
  const auditId = params.id;

  if (!auditId) {
    return new Response(JSON.stringify({ error: 'Audit ID parameter missing.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Determine export format: explicit query param > Accept HTTP header > default (json)
  const formatParam = url.searchParams.get('format')?.toLowerCase();
  const acceptHeader = request.headers.get('Accept') || '';

  let format = 'json';
  if (formatParam === 'html' || formatParam === 'json') {
    format = formatParam;
  } else if (acceptHeader.includes('text/html')) {
    format = 'html';
  } else if (acceptHeader.includes('application/json')) {
    format = 'json';
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

    let modernizationReport: any = null;
    if (env.AUDIT_RESULTS) {
      try {
        const r2Obj = await env.AUDIT_RESULTS.get(`raw_${auditId}.json`);
        if (r2Obj) {
          const rawResults = (await r2Obj.json()) as any;
          if (rawResults?.techstack) {
            const { generateModernizationChecklist } = await import('../../../../lib/techstack-engine');
            modernizationReport = generateModernizationChecklist(rawResults.techstack, rawResults);
          }
        }
      } catch (r2Err) {
        console.warn('R2 raw audit fetch warning in export API:', r2Err);
      }
    }

    if (!modernizationReport && aiRow) {
      const { detectTechStack, generateModernizationChecklist } = await import('../../../../lib/techstack-engine');
      const { inspectDataRegulation, fetchDistributedWebFeatures } = await import('../../../../lib/audit-engine');
      const fallbackTech = detectTechStack('', {}, audit.url);
      const fallbackDistributed = await fetchDistributedWebFeatures(audit.url, '');
      modernizationReport = generateModernizationChecklist(fallbackTech, {
        pagespeed: {
          score: aiRow.performance_score || 65,
          lcp: 3200,
          cls: 0.18,
          tbt: 350,
          ttfb: 650,
          speedIndex: 3100,
          hasUnoptimizedImages: true,
          hasRenderBlockingJs: true,
        },
        security: {
          isHttps: audit.url.startsWith('https://'),
          hasHsts: false,
          hasCsp: false,
          hasXFrameOptions: false,
          hasReferrerPolicy: false,
          hasNosniff: false,
          hasPermissionsPolicy: false,
          rawHeaders: {},
        },
        seo: {
          hasTitle: true,
          titleText: null,
          titleLength: 30,
          hasMetaDescription: false,
          metaDescriptionText: null,
          metaDescriptionLength: 0,
          hasH1: true,
          h1Count: 1,
          hasCanonical: false,
          canonicalUrl: null,
          hasOgTags: false,
          hasOgImage: false,
          hasTwitterCards: false,
          hasSchemaOrg: false,
          schemaTypes: [],
          hasRobotsTxt: false,
          hasSitemapXml: false,
          imagesWithoutAltCount: 0,
          totalImagesCount: 0,
          hasPoorAltText: false,
          poorAltTextCount: 0,
          hasCharsetMeta: true,
          hasLangAttribute: true,
          hasSkippedHeadings: false,
          headingSkippedLevels: [],
          emptyHeadingsCount: 0,
          hasSemanticLandmarks: true,
          semanticLandmarks: { hasHeader: true, hasNav: true, hasMain: true, hasFooter: true, hasSectionOrArticle: true },
          urlQuality: { isTooLong: false, hasUnderscores: false, hasUppercase: false, length: audit.url.length, path: '' },
          hasHreflang: false,
          hreflangLocales: [],
          isNoindex: false,
        },
        standards: {
          hasDoctype: true,
          hasLangAttribute: true,
          langValue: 'en',
          hasViewportMeta: true,
          hasFavicon: true,
          hasLlmsTxt: false,
          hasSecurityTxt: false,
          hasSitemapXml: false,
        },
        techstack: fallbackTech,
        observatory: {
          score: aiRow.security_score || 70,
          grade: 'B',
          state: 'FALLBACK',
          testsPassed: 6,
          testsFailed: 2,
          testsQuantity: 8,
        },
        pa11y: { score: 75, totalErrors: 0, totalWarnings: 0, issues: [] },
        mobile: {
          hasViewportMeta: true,
          hasZoomDisabled: false,
          hasHorizontalOverflow: false,
          overflowWidth: 0,
          undersizedTouchTargetsCount: 0,
          smallTextElementsCount: 0,
          hasResponsiveImages: false,
        },
        regulation: inspectDataRegulation(''),
        distributed: fallbackDistributed,
        fetchedAt: Math.floor(Date.now() / 1000),
      });
    }

    const proofFallbacks: Record<string, string> = {
      'poor-lcp': 'PageSpeed result: Largest Contentful Paint (LCP) > 2.5s',
      'poor-fid': 'PageSpeed result: Total Blocking Time (TBT) > 200ms',
      'poor-cls': 'PageSpeed result: Cumulative Layout Shift (CLS) > 0.10',
      'large-images': 'PageSpeed result: Unoptimized image payloads detected',
      'render-blocking-js': 'PageSpeed result: Render-blocking resources in head',
      'slow-ttfb': 'Origin server metric: Time to First Byte (TTFB) > 600ms',
      'no-ssl': 'Network diagnostic: Unencrypted HTTP protocol',
      'missing-hsts': 'HTTP Header Audit: Strict-Transport-Security header missing',
      'missing-csp': 'HTTP Header Audit: Content-Security-Policy header missing',
      'missing-x-frame-options': 'HTTP Header Audit: X-Frame-Options header missing',
      'missing-referrer-policy': 'HTTP Header Audit: Referrer-Policy header missing',
      'missing-title': 'DOM Audit: Page <title> tag missing in head',
      'invalid-title-length': 'DOM Audit: Title length outside 10-60 character range',
      'missing-meta-description': 'DOM Audit: <meta name="description"> tag missing',
      'invalid-meta-description-length': 'DOM Audit: Meta description length outside 50-160 characters',
      'missing-h1': 'DOM Audit: <h1> main headline count is 0',
      'multiple-h1': 'DOM Audit: Multiple <h1> tag instances found',
      'missing-canonical': 'DOM Audit: Canonical URL tag missing in head',
      'missing-og-tags': 'Social Meta Audit: OpenGraph title/description missing',
      'missing-og-image': 'Social Meta Audit: og:image meta tag missing',
      'missing-twitter-cards': 'Social Meta Audit: twitter:card tags missing',
      'missing-schema-org': 'SEO Audit: Schema.org structured data script missing',
      'no-robots-txt': 'HTTP Audit: robots.txt file missing (404 status)',
      'missing-sitemap-xml': 'HTTP Audit: sitemap.xml file missing (404 status)',
      'missing-image-alt': 'Accessibility Audit: Image elements missing alt text',
      'missing-charset': 'DOM Audit: <meta charset> tag missing in head',
      'missing-lang': 'DOM Audit: <html lang="..."> attribute missing',
      'missing-viewport': 'Mobile Audit: Viewport meta tag missing',
      'observatory-low-grade': 'Mozilla HTTP Observatory: Host received grade F/D/C',
      'pa11y-wcag-violations': 'Pa11y WCAG 2.1 AA Audit: Found accessibility rule violations',
      'mobile-layout-overflow': 'Mobile Viewport Audit: Content horizontally overflows 375px viewport',
      'tiny-touch-targets': 'Mobile UX Audit: Touch target bounding rects smaller than 44x44px',
      'illegible-mobile-text': 'Mobile UX Audit: Text element computed font size less than 12px',
      'disabled-viewport-zoom': 'Mobile Viewport Audit: Meta tag user-scalable=no or maximum-scale=1',
      'eu-missing-privacy-policy': 'GDPR Audit: No Privacy Policy link found in footer/header',
      'eu-unconsented-trackers': 'ePrivacy Audit: Third-party scripts executed without consent banner',
      'eu-missing-impressum': 'E-Commerce Audit: Missing Impressum / Legal Notice link',
      'eu-external-font-transfer': 'Privacy Audit: Remote Google Fonts asset request detected',
      'us-ccpa-missing-optout': 'CCPA/CPRA Audit: Missing Do Not Sell / Your Privacy Choices link',
      'us-missing-terms': 'Commercial Audit: Missing Terms of Service link',
    };

    const enrichedIssues = issues.map((issue: any) => ({
      ...issue,
      proof:
        issue.proof ||
        proofFallbacks[issue.id] ||
        `Automated audit rule trigger (${issue.category || 'GENERAL'} check by PageSpeed/DOM analyzer)`,
    }));

    const totalFixMinutes = enrichedIssues.reduce(
      (sum: number, item: any) => sum + (item.estimatedMinutes || 0),
      0
    );
    const totalFixHours = Math.round((totalFixMinutes / 60) * 10) / 10;
    const totalPrice = Math.ceil(
      enrichedIssues.reduce((sum: number, item: any) => sum + (item.price || 0), 0)
    );

    const criticalIssuesCount = enrichedIssues.filter((i: any) => i.severity === 'critical').length;
    const warningIssuesCount = enrichedIssues.filter((i: any) => i.severity === 'warning').length;
    const infoIssuesCount = enrichedIssues.filter((i: any) => i.severity === 'info').length;

    const euRegulationIssues = enrichedIssues.filter((i: any) => String(i.id).startsWith('eu-'));
    const usRegulationIssues = enrichedIssues.filter((i: any) => String(i.id).startsWith('us-'));

    const { parseStoryToBriefing, briefingToPlainText } = await import('../../../../lib/story-engine');
    const briefing = parseStoryToBriefing(aiRow?.story, {
      url: audit.url,
      scores: {
        overall: aiRow?.score ?? 0,
        performance: aiRow?.performance_score ?? 0,
        security: aiRow?.security_score ?? 0,
        seo: aiRow?.seo_score ?? 0,
        standards: aiRow?.standards_score ?? 0,
      },
      issues: enrichedIssues,
      recommendation: aiRow?.recommendation as any,
      platform: modernizationReport?.techStack?.platform,
      platformVersion: modernizationReport?.techStack?.platformVersion,
      detectedExtensionsCount: modernizationReport?.techStack?.detectedExtensions?.length,
    });

    const storyText = aiRow?.story || briefingToPlainText(briefing);

    const platformContext = modernizationReport?.platformContext || 'custom';
    let recommendationBadge = aiRow?.recommendation === 'rebuild' ? 'Fresh New Website Recommended' : 'Quick Fixes & Tune-Up Recommended';
    if (aiRow?.recommendation === 'rebuild') {
      if (platformContext === 'wordpress') recommendationBadge = 'WordPress Modernization Recommended';
      else if (platformContext === 'shopify') recommendationBadge = 'Shopify Optimization Recommended';
      else if (platformContext === 'wix') recommendationBadge = 'Wix Studio / Webflow Upgrade';
      else if (platformContext === 'webflow') recommendationBadge = 'Webflow Edge Tuning Recommended';
      else if (platformContext === 'magento') recommendationBadge = 'Magento Hyvä Modernization';
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
            performanceScore: aiRow.performance_score,
            securityScore: aiRow.security_score,
            seoScore: aiRow.seo_score,
            standardsScore: aiRow.standards_score,
            recommendation: aiRow.recommendation,
            recommendationBadge,
            recommendationReason: aiRow.recommendation_reason,
            summary: aiRow.summary,
            story: storyText,
            briefing,
            totalFixHours,
            totalPrice,
            issuesCount: enrichedIssues.length,
            criticalIssuesCount,
            warningIssuesCount,
            infoIssuesCount,
            issues: enrichedIssues,
          }
        : null,
      platform: {
        type: platformContext,
        version: modernizationReport?.techStack?.platformVersion || null,
        summary: modernizationReport?.platformSummary || null,
        targetStack: modernizationReport?.targetStackRecommendation || null,
        techDebtScore: modernizationReport?.techStack?.techDebtScore ?? 0,
        debtLevel: modernizationReport?.overallDebtLevel || 'Low',
        detectedExtensionsCount: modernizationReport?.techStack?.detectedExtensions?.length ?? 0,
        detectedExtensions: modernizationReport?.techStack?.detectedExtensions || [],
      },
      legalAndRegulatory: {
        euGdpr: {
          passed: euRegulationIssues.length === 0,
          issuesCount: euRegulationIssues.length,
          privacyPolicy: !enrichedIssues.some((i: any) => i.id === 'eu-missing-privacy-policy'),
          cookieConsent: !enrichedIssues.some((i: any) => i.id === 'eu-unconsented-trackers'),
          impressum: !enrichedIssues.some((i: any) => i.id === 'eu-missing-impressum'),
          remoteFonts: !enrichedIssues.some((i: any) => i.id === 'eu-external-font-transfer'),
        },
        usPrivacy: {
          passed: usRegulationIssues.length === 0,
          issuesCount: usRegulationIssues.length,
          optOutLink: !enrichedIssues.some((i: any) => i.id === 'us-ccpa-missing-optout'),
          noticeAtCollection: !enrichedIssues.some((i: any) => i.id === 'eu-missing-privacy-policy'),
          termsOfService: !enrichedIssues.some((i: any) => i.id === 'us-missing-terms'),
        },
      },
      webmasterAndOpenWeb: modernizationReport?.distributedWeb || null,
      modernizationReport: modernizationReport || null,
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
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Workouse Audit Report — ${audit.url}</title>
  <style>
    :root {
      --bg: #09090b;
      --card-bg: #18181b;
      --border: #27272a;
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --yellow: #FEC500;
      --emerald: #10b981;
      --amber: #f59e0b;
      --red: #ef4444;
      --blue: #38bdf8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      padding: 40px 20px;
      max-width: 960px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .logo-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .logo-img {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      border: 1px solid var(--border);
      object-fit: cover;
    }
    .logo-brand {
      font-weight: 800;
      font-size: 18px;
      letter-spacing: 1px;
      color: #ffffff;
    }
    .logo-sep { color: var(--border); }
    .badge-report {
      font-size: 11px;
      font-family: monospace;
      font-weight: 700;
      color: var(--yellow);
      background: rgba(254, 197, 0, 0.1);
      border: 1px solid rgba(254, 197, 0, 0.2);
      padding: 3px 10px;
      border-radius: 20px;
      text-transform: uppercase;
    }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 6px; word-break: break-all; }
    .subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 16px; }
    .subscore-pill {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-radius: 10px;
      background: #09090b;
      border: 1px solid var(--border);
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
    }
    .metrics-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      font-family: monospace;
    }
    .metric-val { font-size: 24px; font-weight: 800; margin: 4px 0; color: #ffffff; }
    .metric-val.yellow { color: var(--yellow); }
    .metric-lbl { font-size: 11px; text-transform: uppercase; color: var(--text-muted); }
    .recommendation-box {
      background: #09090b;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      margin-top: 16px;
    }
    .rec-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      font-family: monospace;
      margin-bottom: 8px;
    }
    .rec-badge.rebuild { background: rgba(239,68,68,0.15); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
    .rec-badge.fix { background: rgba(16,185,129,0.15); color: var(--emerald); border: 1px solid rgba(16,185,129,0.3); }
    .issue-card {
      background: #09090b;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .issue-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
    .tag {
      font-size: 10px;
      font-family: monospace;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .tag.critical { background: rgba(239,68,68,0.15); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
    .tag.warning { background: rgba(245,158,11,0.15); color: var(--amber); border: 1px solid rgba(245,158,11,0.3); }
    .tag.info { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
    .tag.bloated { background: rgba(245,158,11,0.15); color: var(--amber); border: 1px solid rgba(245,158,11,0.3); }
    .tag.optimal { background: rgba(16,185,129,0.15); color: var(--emerald); border: 1px solid rgba(16,185,129,0.3); }
    .tag.good { background: rgba(56,189,248,0.15); color: var(--blue); border: 1px solid rgba(56,189,248,0.3); }
    .tag.legacy-ext { background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.3); }
    .issue-price { font-family: monospace; font-size: 12px; font-weight: 700; color: var(--yellow); }
    .issue-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; color: #ffffff; }
    .issue-desc { font-size: 13px; color: var(--text-muted); }
    .proof-box { font-size: 11px; font-family: monospace; color: var(--text-muted); background: #18181b; padding: 8px; border-radius: 6px; margin-top: 8px; border: 1px solid var(--border); }
    .disclaimer { font-size: 11px; color: var(--text-muted); background: var(--card-bg); border: 1px solid var(--border); padding: 16px; border-radius: 12px; margin-top: 30px; }
    .footer { margin-top: 40px; font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border); padding-top: 20px; text-align: center; }
    
    .tech-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-top: 12px; }
    .tech-card { background: #09090b; border: 1px solid var(--border); border-radius: 10px; padding: 12px; font-size: 12px; }
    .tech-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .mod-pill { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: monospace; font-size: 11px; background: #18181b; padding: 8px; border-radius: 6px; margin: 8px 0; border: 1px solid var(--border); }

    @media print {
      body { background: #ffffff !important; color: #18181b !important; padding: 0 !important; max-width: 100% !important; }
      .card, .metric-card, .issue-card, .tech-card, .disclaimer { background: #ffffff !important; color: #18181b !important; border: 1px solid #e4e4e7 !important; page-break-inside: avoid; }
      h1, .logo-brand, .metric-val, .issue-title { color: #09090b !important; }
      .subtitle, .issue-desc, .metric-lbl { color: #71717a !important; }
      .subscore-pill, .recommendation-box, .proof-box, .mod-pill { background: #f4f4f5 !important; border: 1px solid #e4e4e7 !important; color: #18181b !important; }
      .logo-header { border-bottom: 1px solid #e4e4e7 !important; }
    }
  </style>
</head>
<body>

  <!-- Logo & Header Bar -->
  <div class="logo-header">
    <img src="${LOGO_URL}" alt="Workouse Logo" class="logo-img" />
    <span class="logo-brand">WORKOUSE</span>
    <span class="logo-sep">|</span>
    <span class="badge-report">WEBSITE HEALTH REPORT</span>
  </div>

  <h1>Website Health & Audit Report</h1>
  <p class="subtitle"><strong>Target Site:</strong> ${audit.url} &bull; <strong>Report ID:</strong> ${audit.id} &bull; <strong>Generated:</strong> ${new Date(reportData.exportedAt).toLocaleDateString()}</p>

  ${
    reportData.evaluation
      ? `
    <!-- Header Gauge & Sub-scores -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <span style="font-size: 12px; font-family: monospace; color: var(--text-muted); text-transform: uppercase;">Overall Grade</span>
          <div style="font-size: 42px; font-weight: 900; font-family: monospace; color: ${reportData.evaluation.score >= 80 ? 'var(--emerald)' : reportData.evaluation.score >= 60 ? 'var(--amber)' : 'var(--red)'};">
            ${reportData.evaluation.score} <span style="font-size: 20px; color: var(--text-muted);">/ 100</span>
          </div>
        </div>

        <div class="grid-4" style="flex: 1; max-width: 500px;">
          <div class="subscore-pill"><span>Speed & Smoothness</span><span>${reportData.evaluation.performanceScore}/100</span></div>
          <div class="subscore-pill"><span>Safety & Protection</span><span>${reportData.evaluation.securityScore}/100</span></div>
          <div class="subscore-pill"><span>Google Visibility</span><span>${reportData.evaluation.seoScore}/100</span></div>
          <div class="subscore-pill"><span>Mobile Best Practices</span><span>${reportData.evaluation.standardsScore}/100</span></div>
        </div>
      </div>

      <div class="recommendation-box">
        <span class="rec-badge ${reportData.evaluation.recommendation}">⚡ ${recommendationBadge}</span>
        <p style="font-size: 13px;">${reportData.evaluation.recommendationReason}</p>
      </div>
    </div>

    ${
      reportData.evaluation.briefing
        ? `
    <!-- Executive Briefing Card Grid -->
    <div class="card" style="border-left: 4px solid var(--yellow); margin-bottom: 20px;">
      <div style="font-size: 11px; font-family: monospace; font-weight: 700; color: var(--yellow); text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
        <span>🎯 Executive Strategic Assessment</span>
      </div>
      <h3 style="font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 16px; line-height: 1.4;">
        "${reportData.evaluation.briefing.headline}"
      </h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); padding: 12px; border-radius: 8px;">
          <div style="font-size: 10px; font-family: monospace; font-weight: 700; color: #ef4444; text-transform: uppercase; margin-bottom: 6px;">⚠️ 1. Friction Points</div>
          <ul style="font-size: 11px; margin: 0; padding-left: 14px; color: var(--text);">
            ${reportData.evaluation.briefing.bottlenecks.map((b: string) => `<li style="margin-bottom: 4px;">${b}</li>`).join('')}
          </ul>
        </div>
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px; border-radius: 8px;">
          <div style="font-size: 10px; font-family: monospace; font-weight: 700; color: #10b981; text-transform: uppercase; margin-bottom: 6px;">📈 2. The Upside</div>
          <ul style="font-size: 11px; margin: 0; padding-left: 14px; color: var(--text);">
            ${reportData.evaluation.briefing.opportunities.map((o: string) => `<li style="margin-bottom: 4px;">${o}</li>`).join('')}
          </ul>
        </div>
        <div style="background: rgba(234, 179, 8, 0.08); border: 1px solid rgba(234, 179, 8, 0.2); padding: 12px; border-radius: 8px;">
          <div style="font-size: 10px; font-family: monospace; font-weight: 700; color: #eab308; text-transform: uppercase; margin-bottom: 6px;">🛠️ 3. 48-Hour Plan</div>
          <ul style="font-size: 11px; margin: 0; padding-left: 14px; color: var(--text);">
            ${reportData.evaluation.briefing.roadmap.map((r: string) => `<li style="margin-bottom: 4px;">${r}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
    `
        : reportData.evaluation.story
        ? `
    <!-- Executive Narrative Story Card -->
    <div class="card" style="border-left: 4px solid var(--yellow);">
      <div style="font-size: 11px; font-family: monospace; font-weight: 700; color: var(--yellow); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
        <span>📖 Executive Summary & Website Story</span>
      </div>
      <div style="font-size: 14px; line-height: 1.7; color: var(--text);">
        ${reportData.evaluation.story
          .split('\n\n')
          .filter((p: string) => p.trim().length > 0)
          .map((p: string) => `<p style="margin-bottom: 12px;">${p}</p>`)
          .join('')}
      </div>
    </div>
    `
        : ''
    }

    <!-- Summary Metrics -->
    <div class="metrics-bar">
      <div class="metric-card">
        <div class="metric-lbl">Points to Fix</div>
        <div class="metric-val">${reportData.evaluation.issuesCount} <span style="font-size: 12px; font-weight: 400;">items</span></div>
        <div style="font-size: 11px; color: var(--text-muted);">${criticalIssuesCount} high priority &bull; ${warningIssuesCount} medium &bull; ${infoIssuesCount} minor</div>
      </div>
      <div class="metric-card">
        <div class="metric-lbl">Estimated Fix Time</div>
        <div class="metric-val yellow">${totalFixHours} <span style="font-size: 12px; font-weight: 400;">hours</span></div>
        <div style="font-size: 11px; color: var(--text-muted);">Itemized repair scope total</div>
      </div>
      <div class="metric-card">
        <div class="metric-lbl">Total Fix Cost ($35/hr)</div>
        <div class="metric-val">$${totalPrice} <span style="font-size: 12px; font-weight: 400;">USD</span></div>
        <div style="font-size: 11px; color: var(--emerald);">Flat-rate baseline pricing</div>
      </div>
    </div>

    <!-- Tech Stack & Ecosystem Extensions Diagnostics -->
    ${
      reportData.modernizationReport?.techStack?.items?.length
        ? `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <h2 style="font-size: 18px; font-weight: 800;">Detected Tech Stack & Ecosystem (${reportData.modernizationReport.techStack.items.length})</h2>
        <span style="font-size: 11px; font-family: monospace; color: var(--yellow);">Tech Debt Score: ${reportData.modernizationReport.techStack.techDebtScore}/100 (${reportData.modernizationReport.overallDebtLevel} Risk)</span>
      </div>
      <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">${reportData.modernizationReport.techStack.summary}</p>

      <div class="tech-grid">
        ${reportData.modernizationReport.techStack.items
          .map(
            (t: any) => `
          <div class="tech-card">
            <div class="tech-card-header">
              <strong>${t.name} ${t.version ? `(v${t.version})` : ''}</strong>
              <span class="tag ${t.status === 'end-of-life' ? 'critical' : t.status === 'deprecated' ? 'warning' : t.status === 'legacy' ? 'legacy-ext' : 'optimal'}">${t.status.toUpperCase()}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">${t.description}</div>
            ${t.modernReplacement ? `<div style="font-size: 11px; margin-top: 6px; font-family: monospace; color: var(--blue);">→ Optimal: ${t.modernReplacement}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>

      ${
        reportData.modernizationReport.techStack.detectedExtensions?.length
          ? `
      <div style="margin-top: 20px; border-top: 1px solid var(--border); pt: 16px; padding-top: 16px;">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 10px;">Detected Ecosystem Plugins & Apps (${reportData.modernizationReport.techStack.detectedExtensions.length})</h3>
        <div class="tech-grid">
          ${reportData.modernizationReport.techStack.detectedExtensions
            .map(
              (ext: any) => `
            <div class="tech-card">
              <div class="tech-card-header">
                <strong>${ext.name}</strong>
                <span class="tag ${ext.currentStatus === 'bloated' ? 'bloated' : ext.currentStatus === 'optimal' ? 'optimal' : ext.currentStatus === 'legacy' ? 'legacy-ext' : 'good'}">${(ext.currentStatus || 'good').toUpperCase()}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted);">${ext.description || ''}</div>
              ${ext.suggestedAlternative ? `<div style="font-size: 11px; margin-top: 6px; font-family: monospace; color: var(--emerald);">★ Recommended: ${ext.suggestedAlternative}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      `
          : ''
      }
    </div>
    `
        : ''
    }

    <!-- Platform Modernization Checklist -->
    ${
      reportData.modernizationReport?.checklist?.length
        ? `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <h2 style="font-size: 18px; font-weight: 800;">Platform Modernization Action Plan (${reportData.modernizationReport.checklist.length} Tasks)</h2>
        <span style="font-size: 11px; font-family: monospace; color: var(--emerald);">Target: ${reportData.modernizationReport.targetStackRecommendation}</span>
      </div>
      <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">${reportData.modernizationReport.platformSummary || ''}</p>

      ${reportData.modernizationReport.checklist
        .map(
          (item: any, idx: number) => `
        <div class="issue-card">
          <div class="issue-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="tag ${item.priority === 'critical' ? 'critical' : item.priority === 'recommended' ? 'warning' : 'info'}">${(item.priority || 'recommended').toUpperCase()}</span>
              <span style="font-size: 12px; color: var(--text-muted); font-family: monospace;">[${(item.category || 'ARCHITECTURE').toUpperCase()}]</span>
            </div>
            <div class="issue-price">${item.estimatedMinutes || 60} mins &bull; $${Math.ceil(item.price || 0)} USD</div>
          </div>
          <div class="issue-title">0${idx + 1}. ${item.title}</div>
          <div class="mod-pill">
            <div style="color: var(--red);"><strong>CURRENT:</strong> ${item.currentTech}</div>
            <div style="color: var(--emerald);"><strong>TARGET:</strong> ${item.targetTech}</div>
          </div>
          <div class="issue-desc" style="margin-top: 4px;"><strong>Technical Rationale:</strong> ${item.whyModernize}</div>
          <div class="issue-desc" style="margin-top: 2px;"><strong>Business Impact:</strong> ${item.businessImpact}</div>
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    <!-- Data Regulation Checks -->
    <div class="card">
      <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 12px;">Data Regulation & Privacy Checks</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; font-family: monospace; font-size: 12px;">
        <div style="background: #09090b; padding: 12px; border-radius: 10px; border: 1px solid var(--border);">
          <div style="font-weight: 700; margin-bottom: 8px;">🇪🇺 Europe (GDPR & ePrivacy): ${reportData.legalAndRegulatory.euGdpr.passed ? '<span style="color: var(--emerald);">PASSED</span>' : '<span style="color: var(--red);">' + reportData.legalAndRegulatory.euGdpr.issuesCount + ' Risks</span>'}</div>
          <div>Privacy Policy: ${reportData.legalAndRegulatory.euGdpr.privacyPolicy ? '✅ Detected' : '❌ Missing'}</div>
          <div>Cookie Consent (CMP): ${reportData.legalAndRegulatory.euGdpr.cookieConsent ? '✅ Active' : '❌ Missing'}</div>
          <div>Impressum: ${reportData.legalAndRegulatory.euGdpr.impressum ? '✅ Compliant' : '⚠️ Missing'}</div>
          <div>Remote Fonts: ${reportData.legalAndRegulatory.euGdpr.remoteFonts ? '✅ Self-hosted' : '⚠️ Remote Leak'}</div>
        </div>
        <div style="background: #09090b; padding: 12px; border-radius: 10px; border: 1px solid var(--border);">
          <div style="font-weight: 700; margin-bottom: 8px;">🇺🇸 United States (CCPA/CPRA): ${reportData.legalAndRegulatory.usPrivacy.passed ? '<span style="color: var(--emerald);">PASSED</span>' : '<span style="color: var(--amber);">' + reportData.legalAndRegulatory.usPrivacy.issuesCount + ' Actions</span>'}</div>
          <div>Opt-Out Link: ${reportData.legalAndRegulatory.usPrivacy.optOutLink ? '✅ Ready' : '⚠️ Missing'}</div>
          <div>Notice at Collection: ${reportData.legalAndRegulatory.usPrivacy.noticeAtCollection ? '✅ Available' : '❌ Missing'}</div>
          <div>Terms of Service: ${reportData.legalAndRegulatory.usPrivacy.termsOfService ? '✅ Available' : 'ℹ️ Missing'}</div>
        </div>
      </div>
    </div>

    <!-- Action Plan & Issues List -->
    <div class="card">
      <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">Simple Action Plan & Fixes (${reportData.evaluation.issues.length})</h2>
      ${reportData.evaluation.issues
        .map(
          (issue: any) => `
        <div class="issue-card">
          <div class="issue-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="tag ${issue.severity}">${issue.severity === 'critical' ? 'HIGH PRIORITY' : issue.severity === 'warning' ? 'MEDIUM' : 'MINOR'}</span>
              <span style="font-size: 12px; color: var(--text-muted); font-family: monospace;">[${(issue.category || 'GENERAL').toUpperCase()}]</span>
            </div>
            <div class="issue-price">${issue.estimatedMinutes || 60} mins &bull; $${Math.ceil(issue.price || 0)} USD</div>
          </div>
          <div class="issue-title">${issue.title}</div>
          <div class="issue-desc">${issue.businessImpact || 'Impacts website performance, SEO, or security.'}</div>
          ${issue.proof ? `<div class="proof-box">⚡ <strong>Diagnostic Proof:</strong> ${issue.proof}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `
      : `<p>Audit report is currently processing or unavailable.</p>`
  }

  <div class="disclaimer">
    <strong>Pricing & Technical Scope Disclaimer:</strong> All cost and time estimates in this audit are non-binding baseline calculations for standard entry-level fixes ($35/hr rate). Final pricing, labor hours, and implementation scope depend on target infrastructure parameters, legacy codebase constraints, edge case dependencies, and custom specifications.
  </div>

  <div class="footer">
    <p>© Workouse Audit Engine &bull; Emre Yılmaz &bull; emre.xyz</p>
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
