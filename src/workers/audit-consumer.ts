import type { Env, AuditIssue } from '../lib/types';
import { runAuditEngine, type AuditRawResults } from '../lib/audit-engine';
import { PRICING_TABLE } from '../lib/pricing';
import { computeAllScores, determineRecommendation, generateRegulationIssues, getRecommendationReason } from '../lib/score-engine';
import { generateAuditStory } from '../lib/story-engine';
import { sendTelemetryEvent } from '../lib/telemetry';

export interface AuditQueueMessage {
  auditId: string;
  url: string;
  email: string;
  enqueuedAt?: number;
  isAdminTriggered?: boolean;
  isReAudit?: boolean;
  previousAuditId?: string | null;
}

// ---------------------------------------------------------------------------
// AI Copy Enrichment (Dynamic Route)
// ---------------------------------------------------------------------------

const ENRICHMENT_SYSTEM_PROMPT = `You are a friendly, encouraging digital marketing expert explaining website health to non-technical business owners.
You will receive a JSON array of audit findings. For each finding, rewrite the "businessImpact" field as a warm, plain-English sentence (maximum 20 words) explaining why fixing this will help them get more customers, look professional, and grow their sales.
RULES:
- Zero technical jargon or developer acronyms (no LCP, CLS, TTFB, HSTS, CSP, HTML, meta, DOM, etc.).
- Assume the owner has zero tech background. Use simple, everyday English.
- Focus on real customer experience: speed, trust, ease of use, getting found on Google, and making more sales.
Return ONLY a valid JSON array with the same structure: [{"id":"...","businessImpact":"..."}]
Do not add any other fields, commentary, or markdown.`;

/**
 * Call the `dynamic/audit` route via Cloudflare AI Gateway to enrich issue
 * businessImpact descriptions with marketing-friendly copy.
 *
 * The gateway routes to Google Gemini (primary) with automatic Workers AI
 * fallback — provider selection is handled entirely on the gateway side.
 * Falls back silently to the original hardcoded descriptions on any failure.
 */
async function enrichIssues(
  issues: AuditIssue[],
  env: Env,
  auditId?: string,
  url?: string
): Promise<AuditIssue[]> {
  if (!env.CF_AI_GATEWAY_TOKEN || !env.CF_AI_GATEWAY_URL || issues.length === 0) {
    return issues;
  }

  const startTime = Date.now();
  try {
    const payload = issues.map(({ id, businessImpact }) => ({ id, businessImpact }));

    await sendTelemetryEvent(env, {
      category: 'ai',
      action: 'AI_GATEWAY_REQUEST',
      auditId,
      url,
      details: {
        model: 'dynamic/audit',
        endpoint: env.CF_AI_GATEWAY_URL,
        issuesCount: issues.length,
        payloadBytes: JSON.stringify(payload).length,
      },
    });

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${env.CF_AI_GATEWAY_TOKEN}`,
      'cf-aig-authorization': `Bearer ${env.CF_AI_GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    };

    if (env.CF_ACCESS_CLIENT_ID) {
      headers['CF-Access-Client-Id'] = env.CF_ACCESS_CLIENT_ID.trim();
      headers['cf-access-client-id'] = env.CF_ACCESS_CLIENT_ID.trim();
    }
    if (env.CF_ACCESS_CLIENT_SECRET) {
      headers['CF-Access-Client-Secret'] = env.CF_ACCESS_CLIENT_SECRET.trim();
      headers['cf-access-client-secret'] = env.CF_ACCESS_CLIENT_SECRET.trim();
    }

    const res = await fetch(env.CF_AI_GATEWAY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'dynamic/audit',
        messages: [
          { role: 'system', content: ENRICHMENT_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(payload) },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`AI enrichment API error: ${res.status} ${res.statusText} — ${errText}`);
      await sendTelemetryEvent(env, {
        category: 'error',
        action: 'AI_GATEWAY_ERROR',
        auditId,
        url,
        details: {
          status: res.status,
          statusText: res.statusText,
          durationMs,
          endpoint: env.CF_AI_GATEWAY_URL,
          errorBody: errText,
          hasGatewayToken: Boolean(env.CF_AI_GATEWAY_TOKEN),
          hasAccessClientId: Boolean(env.CF_ACCESS_CLIENT_ID),
          hasAccessClientSecret: Boolean(env.CF_ACCESS_CLIENT_SECRET),
          sentHeaders: Object.keys(headers),
        },
      });
      return issues;
    }

    const data: any = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';

    // Strip possible markdown code fences
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const enriched: Array<{ id: string; businessImpact: string }> = JSON.parse(cleaned);

    if (!Array.isArray(enriched)) return issues;

    await sendTelemetryEvent(env, {
      category: 'ai',
      action: 'AI_GATEWAY_RESPONSE',
      auditId,
      url,
      details: {
        model: 'dynamic/audit',
        durationMs,
        enrichedCount: enriched.length,
        usage: data?.usage || null,
      },
    });

    // Build a lookup map and merge enriched copy back into issues
    const enrichedMap = new Map(enriched.map((e) => [e.id, e.businessImpact]));
    return issues.map((issue) => ({
      ...issue,
      businessImpact: enrichedMap.get(issue.id) ?? issue.businessImpact,
    }));
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.warn('AI enrichment failed — using fallback copy:', err);
    await sendTelemetryEvent(env, {
      category: 'error',
      action: 'AI_GATEWAY_FALLBACK',
      auditId,
      url,
      details: { error: err.message, durationMs },
    });
    return issues;
  }
}

// ---------------------------------------------------------------------------
// Durable Object progress broadcast
// ---------------------------------------------------------------------------

async function notifyDO(env: Env, auditId: string, stage: string, url?: string): Promise<void> {
  await sendTelemetryEvent(env, {
    category: 'audit',
    action: stage,
    auditId,
    url,
  });
}

// ---------------------------------------------------------------------------
// Rule-based issue detection
// ---------------------------------------------------------------------------

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Deterministically match raw diagnostic metrics against PRICING_TABLE rules
 * to produce a typed list of AuditIssues with hardcoded businessImpact fallbacks.
 * Gemini enrichment runs afterwards and overwrites businessImpact with
 * marketing-friendly copy if successful.
 */
function evaluateIssuesFromRawMetrics(raw: AuditRawResults): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // ── Performance ──────────────────────────────────────────────────────────
  if (raw.pagespeed.lcp > 2500) {
    const p = PRICING_TABLE['poor-lcp'];
    const items = raw.pagespeed.lcpElementDetails ? [{
      selector: raw.pagespeed.lcpElementDetails.selector,
      snippet: raw.pagespeed.lcpElementDetails.snippet,
      details: `LCP Element: ${raw.pagespeed.lcpElementDetails.nodeLabel || 'Primary hero element'}`,
    }] : undefined;
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category,
      severity: raw.pagespeed.lcp > 4000 ? 'critical' : 'warning',
      businessImpact: 'Slow page load causes visitors to leave before your content appears.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: `PageSpeed metric: LCP measured ${(raw.pagespeed.lcp / 1000).toFixed(2)}s (Google benchmark target < 2.5s)`,
      items,
    });
  }
  if (raw.pagespeed.tbt > 200) {
    const p = PRICING_TABLE['poor-fid'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category,
      severity: raw.pagespeed.tbt > 500 ? 'critical' : 'warning',
      businessImpact: 'Pages feel frozen and unresponsive, driving customers away.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: `PageSpeed metric: TBT measured ${raw.pagespeed.tbt}ms (Google benchmark target < 200ms)`,
    });
  }
  if (raw.pagespeed.cls > 0.10) {
    const p = PRICING_TABLE['poor-cls'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category,
      severity: raw.pagespeed.cls > 0.25 ? 'critical' : 'warning',
      businessImpact: 'Buttons and links jump around as the page loads, causing accidental clicks.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: `PageSpeed metric: CLS measured ${raw.pagespeed.cls.toFixed(2)} (Google benchmark target < 0.10)`,
    });
  }
  if (raw.pagespeed.hasUnoptimizedImages) {
    const p = PRICING_TABLE['large-images'];
    const items = (raw.pagespeed.unoptimizedImagesDetails || []).map((img) => ({
      url: img.url,
      size: img.totalBytes ? formatBytes(img.totalBytes) : undefined,
      wasted: img.wastedBytes ? `Potential saving: ${formatBytes(img.wastedBytes)} (${img.wastedPercent || Math.round((img.wastedBytes / (img.totalBytes || 1)) * 100)}%)` : undefined,
      details: 'Unoptimized or uncompressed image format (recommend WebP / AVIF)',
    }));
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Oversized images slow your site and inflate visitor mobile data bills.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: 'PageSpeed audit: Uncompressed or non-next-gen image formats detected',
      items: items.length > 0 ? items : undefined,
    });
  }
  if (raw.pagespeed.hasRenderBlockingJs) {
    const p = PRICING_TABLE['render-blocking-js'];
    const items = (raw.pagespeed.renderBlockingDetails || []).map((res) => {
      const isCss = res.url.includes('.css') || res.url.includes('stylesheet');
      return {
        url: res.url,
        size: res.totalBytes ? formatBytes(res.totalBytes) : undefined,
        wasted: res.wastedMs ? `${res.wastedMs}ms load delay` : undefined,
        details: isCss ? 'Render-blocking CSS Stylesheet' : 'Render-blocking JavaScript file',
      };
    });
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Scripts and stylesheets delay what visitors see first, increasing bounce rates.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: 'PageSpeed audit: Render-blocking JavaScript/CSS resources in initial request',
      items: items.length > 0 ? items : undefined,
    });
  }
  if (raw.pagespeed.ttfb > 600) {
    const p = PRICING_TABLE['slow-ttfb'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Your server is slow to respond, adding invisible delay before anything loads.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: `Server metric: Time to First Byte (TTFB) measured ${raw.pagespeed.ttfb}ms (Target < 600ms)`,
    });
  }

  const isWafBlocked = Boolean(raw.seo?.isWafBlocked || raw.standards?.isWafBlocked);

  // ── Standards & Accessibility (Pa11y & Mobile) ───────────────────────────
  if (!isWafBlocked && raw.standards && !raw.standards.hasViewportMeta) {
    const p = PRICING_TABLE['missing-viewport'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Your site renders broken on phones, pushing away mobile visitors.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: 'HTML DOM inspection: <meta name="viewport"> element missing in head',
    });
  }

  if (!isWafBlocked && raw.pa11y && raw.pa11y.totalErrors > 0) {
    const p = PRICING_TABLE['pa11y-wcag-violations'];
    const items = (raw.pa11y.issues || []).slice(0, 10).map((issue) => ({
      label: issue.code,
      selector: issue.selector,
      details: issue.message,
    }));
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Accessibility violations make it hard for users with vision or input devices to navigate your website.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: `Pa11y WCAG 2.1 AA Audit: Found ${raw.pa11y.totalErrors} accessibility error(s) and ${raw.pa11y.totalWarnings} warning(s)`,
      items: items.length > 0 ? items : undefined,
    });
  }

  if (!isWafBlocked && raw.mobile) {
    if (raw.mobile.hasHorizontalOverflow) {
      const p = PRICING_TABLE['mobile-layout-overflow'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Page content overflows horizontally on mobile screens, creating an awkward side-scrolling experience.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `Mobile Viewport Audit (375px): Layout width exceeded screen by ${raw.mobile.overflowWidth}px`,
      });
    }

    if (raw.mobile.undersizedTouchTargetsCount > 0) {
      const p = PRICING_TABLE['tiny-touch-targets'];
      const items = (raw.mobile.undersizedTouchTargets || []).map((t) => ({
        selector: t.selector,
        snippet: t.text ? `"${t.text}"` : undefined,
        size: `${t.width}px × ${t.height}px`,
        details: 'Smaller than recommended 44×44px touch target',
      }));
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Buttons or links are too small to tap accurately on mobile screens.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `Mobile UX Audit: Detected ${raw.mobile.undersizedTouchTargetsCount} interactive element(s) under 44x44px tap target size`,
        items: items.length > 0 ? items : undefined,
      });
    }

    if (raw.mobile.smallTextElementsCount > 0) {
      const p = PRICING_TABLE['illegible-mobile-text'];
      const items = (raw.mobile.smallTextElements || []).map((t) => ({
        selector: t.selector,
        snippet: `"${t.text}"`,
        size: t.fontSize,
        details: 'Computed font size under 12px threshold',
      }));
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Small text sizes force mobile visitors to pinch and zoom to read your offer.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `Mobile UX Audit: Detected ${raw.mobile.smallTextElementsCount} text element(s) with font size under 12px`,
        items: items.length > 0 ? items : undefined,
      });
    }

    if (raw.mobile.hasZoomDisabled) {
      const p = PRICING_TABLE['disabled-viewport-zoom'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Mobile visitors cannot zoom in to view details or read small text.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'Mobile Viewport Audit: Meta tag specifies user-scalable=no or maximum-scale=1.0',
      });
    }
  }

  // ── Security & Mozilla Observatory ────────────────────────────────────────
  if (raw.observatory && (raw.observatory.score < 65 || ['F', 'D', 'C'].includes(raw.observatory.grade))) {
    const p = PRICING_TABLE['observatory-low-grade'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Mozilla Security Observatory assigned a low grade to your domain, signaling security vulnerabilities.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: `Mozilla HTTP Observatory Audit: Host received Grade ${raw.observatory.grade} (Score ${raw.observatory.score}/100, ${raw.observatory.testsFailed} test(s) failed)`,
    });
  }

  if (!raw.security.isHttps) {
    const p = PRICING_TABLE['no-ssl'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Browsers show a "Not Secure" warning that kills visitor trust immediately.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: 'Network check: Protocol is unencrypted HTTP (no valid SSL/TLS connection)',
    });
  }
  if (!raw.security.hasHsts) {
    const p = PRICING_TABLE['missing-hsts'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Traffic can be intercepted and redirected without visitor knowledge.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: 'HTTP Security Header audit: Strict-Transport-Security header not returned by server',
    });
  }
  if (!raw.security.hasCsp) {
    const p = PRICING_TABLE['missing-csp'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Attackers can inject malicious scripts that steal customer data.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: 'HTTP Security Header audit: Content-Security-Policy header missing',
    });
  }
  if (!raw.security.hasXFrameOptions) {
    const p = PRICING_TABLE['missing-x-frame-options'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Your site can be embedded in fake pages to trick your customers.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: 'HTTP Security Header audit: X-Frame-Options / frame-ancestors missing',
    });
  }
  if (!raw.security.hasReferrerPolicy) {
    const p = PRICING_TABLE['missing-referrer-policy'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Private page URLs and customer paths leak to third-party services.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
      proof: 'HTTP Security Header audit: Referrer-Policy header missing',
    });
  }

  // ── SEO ───────────────────────────────────────────────────────────────────
  if (!isWafBlocked) {
    if (!raw.seo.hasTitle) {
      const p = PRICING_TABLE['missing-title'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Google cannot name your page in search results, making it invisible.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'SEO DOM inspection: <title> tag missing in head document',
      });
    } else if (raw.seo.titleLength < 10 || raw.seo.titleLength > 60) {
      const p = PRICING_TABLE['invalid-title-length'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Search engines truncate or ignore titles outside the ideal length range.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `SEO DOM inspection: Title length is ${raw.seo.titleLength} characters (Ideal: 10-60)`,
      });
    }

    if (!raw.seo.hasMetaDescription) {
      const p = PRICING_TABLE['missing-meta-description'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Fewer people click your search result because there is no compelling preview.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'SEO DOM inspection: <meta name="description"> tag missing in head',
      });
    } else if (raw.seo.metaDescriptionLength < 50 || raw.seo.metaDescriptionLength > 160) {
      const p = PRICING_TABLE['invalid-meta-description-length'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Your search snippet gets cut off or ignored, reducing click-through rates.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `SEO DOM inspection: Meta description length is ${raw.seo.metaDescriptionLength} characters (Ideal: 50-160)`,
      });
    }

    if (raw.seo.h1Count === 0) {
      const p = PRICING_TABLE['missing-h1'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Search engines cannot determine what your page is about, hurting rankings.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'SEO DOM inspection: <h1> main headline count is 0 in DOM',
      });
    } else if (raw.seo.h1Count > 1) {
      const p = PRICING_TABLE['multiple-h1'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Multiple conflicting headings confuse search engines about your page topic.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `SEO DOM inspection: Multiple <h1> headings found (${raw.seo.h1Count} tags in DOM)`,
      });
    }

    if (!raw.seo.hasCanonical) {
      const p = PRICING_TABLE['missing-canonical'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Duplicate versions of your page split search ranking power.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'SEO DOM inspection: <link rel="canonical"> tag missing in head',
      });
    }

    if (!raw.seo.hasOgTags) {
      const p = PRICING_TABLE['missing-og-tags'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Links shared on LinkedIn or Facebook look plain and unprofessional.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'OpenGraph inspection: og:title or og:description meta tags missing',
      });
    } else if (!raw.seo.hasOgImage) {
      const p = PRICING_TABLE['missing-og-image'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Social media shares show no image, getting far fewer clicks and shares.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'OpenGraph inspection: og:image meta tag missing',
      });
    }

    if (!raw.seo.hasTwitterCards) {
      const p = PRICING_TABLE['missing-twitter-cards'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Twitter/X posts linking your site display as plain unformatted text.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'Social Media inspection: twitter:card meta tags missing',
      });
    }

    if (!raw.seo.hasSchemaOrg) {
      const p = PRICING_TABLE['missing-schema-org'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'You miss out on rich search result features like star ratings and FAQs.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'Structured Data inspection: JSON-LD or Microdata schema missing',
      });
    }

    if (!raw.seo.hasRobotsTxt) {
      const p = PRICING_TABLE['no-robots-txt'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Search crawlers have no guidance and may index unwanted pages.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'Robots.txt check: /robots.txt returned 404 / non-200 HTTP status',
      });
    }

    if (!raw.seo.hasSitemapXml) {
      const p = PRICING_TABLE['missing-sitemap-xml'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Search engines are slower to discover and index your pages.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'Sitemap check: /sitemap.xml returned 404 / non-200 HTTP status',
      });
    }

    if (raw.seo.imagesWithoutAltCount > 0) {
      const p = PRICING_TABLE['missing-image-alt'];
      const items = (raw.seo.missingAltImages || []).map((img) => ({
        url: img.src,
        selector: img.selector,
        snippet: img.snippet,
        details: 'Missing alt attribute for image',
      }));
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: `${raw.seo.imagesWithoutAltCount} image(s) are invisible to screen readers and image search.`,
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `Accessibility audit: ${raw.seo.imagesWithoutAltCount} image(s) missing alt text`,
        items: items.length > 0 ? items : undefined,
      });
    }

    if (raw.seo.hasSkippedHeadings) {
      const p = PRICING_TABLE['broken-heading-hierarchy'];
      const items = (raw.seo.headingItems || []).map((h) => ({
        label: h.tag,
        snippet: `<${h.tag.toLowerCase()}> ${h.text} </${h.tag.toLowerCase()}>`,
        details: `Heading level ${h.level}`,
      }));
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Skipping heading levels confuses search engine crawlers and creates a disjointed outline for screen readers.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `Heading hierarchy check: Skipped levels detected (${raw.seo.headingSkippedLevels.join(', ')})`,
        items: items.length > 0 ? items : undefined,
      });
    }

    if (!raw.seo.hasSemanticLandmarks) {
      const p = PRICING_TABLE['missing-semantic-landmarks'];
      const missingLandmarks = [
        !raw.seo.semanticLandmarks?.hasNav ? '<nav>' : '',
        !raw.seo.semanticLandmarks?.hasMain ? '<main>' : '',
        !raw.seo.semanticLandmarks?.hasHeader && !raw.seo.semanticLandmarks?.hasFooter ? '<header>/<footer>' : '',
      ].filter(Boolean).join(', ');
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Search engines and assistive tools struggle to understand page layout without standard HTML5 landmark elements.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `HTML5 semantic inspection: Page is missing essential structural landmarks (${missingLandmarks || 'nav/main/footer'})`,
      });
    }

    if (raw.seo.urlQuality && (raw.seo.urlQuality.isTooLong || raw.seo.urlQuality.hasUnderscores || raw.seo.urlQuality.hasUppercase)) {
      const p = PRICING_TABLE['poor-url-structure'];
      const flaws = [
        raw.seo.urlQuality.isTooLong ? `Length (${raw.seo.urlQuality.length} chars > 75)` : '',
        raw.seo.urlQuality.hasUnderscores ? 'Contains underscores instead of hyphens' : '',
        raw.seo.urlQuality.hasUppercase ? 'Contains uppercase letters' : '',
      ].filter(Boolean).join(', ');
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Unfriendly URL structures reduce click-through rates from search results and weaken keyword signals.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `URL structure audit: ${flaws}`,
      });
    }

    if (raw.seo.hasPoorAltText) {
      const p = PRICING_TABLE['poor-image-alt-text'];
      const items = (raw.seo.poorAltImages || []).map((img) => ({
        url: img.src,
        selector: img.selector,
        snippet: `alt="${img.alt}"`,
        details: 'Generic filename or redundant "image of" phrase',
      }));
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Generic alt tags (like filenames or "image of") do not provide meaningful keyword relevance to search engines.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `Alt text quality audit: Found ${raw.seo.poorAltTextCount} image(s) with redundant prefixes ("image of") or raw file names`,
        items: items.length > 0 ? items : undefined,
      });
    }

    if (raw.seo.hasSchemaOrg && raw.seo.schemaTypes.length > 0 && !raw.seo.schemaTypes.some((t) => t.toLowerCase().includes('breadcrumb'))) {
      const p = PRICING_TABLE['missing-breadcrumbs-schema'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Without breadcrumb schema markup, search results lack hierarchical navigation trails under your domain.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: `Structured Data audit: Schema types found (${raw.seo.schemaTypes.join(', ')}), but missing BreadcrumbList schema`,
      });
    }

    if (raw.seo.isNoindex) {
      const p = PRICING_TABLE['accidental-noindex'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'A noindex directive is actively blocking Google and other search engines from indexing and ranking this webpage.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'Robots & Crawlability check: <meta name="robots" content="noindex"> or X-Robots-Tag header is blocking search indexing',
      });
    }

    if (!raw.seo.hasCharsetMeta) {
      const p = PRICING_TABLE['missing-charset'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Text can render as garbled characters in some browsers and regions.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'HTML DOM inspection: <meta charset> tag missing in head',
      });
    }

    if (!raw.seo.hasLangAttribute) {
      const p = PRICING_TABLE['missing-lang'];
      if (p) issues.push({
        id: p.id, title: p.label, category: p.category, severity: p.severity,
        businessImpact: 'Screen readers mispronounce your content and regional SEO targeting is weaker.',
        estimatedMinutes: p.estimatedMinutes, price: p.price,
        proof: 'HTML DOM inspection: <html lang="..."> attribute missing on root node',
      });
    }
  }

  // ── Data Regulation (EU & US) ─────────────────────────────────────────────
  if (raw.regulation) {
    const regIssues = generateRegulationIssues(raw.regulation);
    issues.push(...regIssues);
  }

  // ── Agentic & Universal Commerce Protocol (UCP) ──────────────────────────
  if (raw.distributed?.isEcommerce && !raw.distributed?.hasUcp) {
    const p = PRICING_TABLE['missing-ucp'];
    if (p) issues.push({
      id: p.id,
      title: p.label,
      category: p.category,
      severity: p.severity,
      businessImpact: 'Without Universal Commerce Protocol (UCP), AI shopping assistants and autonomous agents (Google, ChatGPT, Gemini) cannot discover your products or complete checkouts on your store.',
      estimatedMinutes: p.estimatedMinutes,
      price: p.price,
      proof: 'Universal Commerce Protocol check: E-commerce storefront detected, but /.well-known/ucp discovery manifest was not found or not configured.',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Main job processor
// ---------------------------------------------------------------------------

export async function processAuditJob(job: AuditQueueMessage, env: Env): Promise<void> {
  const { auditId, url } = job;

  // ── Step 1: Mark running ─────────────────────────────────────────────────
  await env.DB.prepare('UPDATE audits SET status = ? WHERE id = ?').bind('running', auditId).run();
  await notifyDO(env, auditId, 'running', url);

  // ── Step 2: Collect raw diagnostics ─────────────────────────────────────
  const rawResults = await runAuditEngine(url, env.PAGESPEED_API_KEY, env.MY_BROWSER);
  await sendTelemetryEvent(env, {
    category: 'audit',
    action: 'PAGESPEED_FETCHED',
    auditId,
    url,
    details: {
      lcp: rawResults.pagespeed?.lcp,
      cls: rawResults.pagespeed?.cls,
      tbt: rawResults.pagespeed?.tbt,
      ttfb: rawResults.pagespeed?.ttfb,
      isHttps: rawResults.security?.isHttps,
    },
  });

  const pagespeedJson = JSON.stringify(rawResults.pagespeed);
  const observatoryJson = JSON.stringify(rawResults.observatory || rawResults.security);
  const seoJson = JSON.stringify(rawResults.seo);

  await env.DB.prepare(
    'INSERT INTO raw_results (audit_id, pagespeed_json, observatory_json, seo_json, fetched_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(audit_id) DO UPDATE SET pagespeed_json = excluded.pagespeed_json, observatory_json = excluded.observatory_json, seo_json = excluded.seo_json, fetched_at = excluded.fetched_at'
  ).bind(auditId, pagespeedJson, observatoryJson, seoJson, rawResults.fetchedAt).run();

  if (env.AUDIT_RESULTS) {
    await env.AUDIT_RESULTS.put(`raw_${auditId}.json`, JSON.stringify(rawResults));
    if (rawResults.screenshotBuffer) {
      try {
        await env.AUDIT_RESULTS.put(
          `screenshots/${auditId}.jpg`,
          rawResults.screenshotBuffer,
          { httpMetadata: { contentType: 'image/jpeg' } }
        );
        await env.DB.prepare('UPDATE audits SET r2_key = ? WHERE id = ?')
          .bind(`screenshots/${auditId}.jpg`, auditId)
          .run();
      } catch (shotErr) {
        console.warn(`Failed to store desktop screenshot in R2 for audit ${auditId}:`, shotErr);
      }
    }
    if (rawResults.mobileScreenshotBuffer) {
      try {
        await env.AUDIT_RESULTS.put(
          `screenshots/${auditId}_mobile.jpg`,
          rawResults.mobileScreenshotBuffer,
          { httpMetadata: { contentType: 'image/jpeg' } }
        );
      } catch (shotErr) {
        console.warn(`Failed to store mobile screenshot in R2 for audit ${auditId}:`, shotErr);
      }
    }
  }

  // ── Step 3: Algorithmic scoring ──────────────────────────────────────────
  await env.DB.prepare('UPDATE audits SET status = ? WHERE id = ?').bind('scoring', auditId).run();
  await notifyDO(env, auditId, 'scoring', url);

  const scores = computeAllScores(
    rawResults.pagespeed,
    rawResults.security,
    rawResults.seo,
    rawResults.standards,
    rawResults.observatory,
    rawResults.pa11y,
    rawResults.mobile,
    rawResults.regulation
  );

  let issues = evaluateIssuesFromRawMetrics(rawResults);

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const recommendation = determineRecommendation(scores, criticalCount);

  // ── Step 4: AI copy enrichment & Story generation ───────────────────────
  await env.DB.prepare('UPDATE audits SET status = ? WHERE id = ?').bind('enriching', auditId).run();
  await notifyDO(env, auditId, 'enriching', url);

  const [enrichedIssues, story] = await Promise.all([
    enrichIssues(issues, env, auditId, url),
    generateAuditStory(
      {
        url,
        auditId,
        scores,
        issues,
        recommendation,
        platform: rawResults.techstack?.platform,
        platformVersion: rawResults.techstack?.platformVersion,
        detectedExtensionsCount: rawResults.techstack?.detectedExtensions?.length,
        techstackSummary: rawResults.techstack?.summary,
        rawResults,
      },
      env
    ),
  ]);
  issues = enrichedIssues;

  // ── Step 5: Persist results ──────────────────────────────────────────────
  const recommendationReason = getRecommendationReason(recommendation, rawResults.techstack?.platform);

  const totalHours = Math.round(issues.reduce((acc, i) => acc + i.estimatedMinutes, 0) / 60);
  const totalPrice = issues.reduce((acc, i) => acc + i.price, 0);

  const summary = `Audit completed for ${url}. Score: ${scores.overall}/100 (Performance ${scores.performance} · Security ${scores.security} · SEO ${scores.seo} · Standards ${scores.standards}). Found ${issues.length} issues (${criticalCount} critical, ${warningCount} warnings). Estimated fix: ${totalHours} hours ($${totalPrice} USD).`;

  const processedAt = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO audit_results
      (audit_id, score, performance_score, security_score, seo_score, standards_score, issues_json, recommendation, recommendation_reason, summary, story, processed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(audit_id) DO UPDATE SET
       score = excluded.score,
       performance_score = excluded.performance_score,
       security_score = excluded.security_score,
       seo_score = excluded.seo_score,
       standards_score = excluded.standards_score,
       issues_json = excluded.issues_json,
       recommendation = excluded.recommendation,
       recommendation_reason = excluded.recommendation_reason,
       summary = excluded.summary,
       story = excluded.story,
       processed_at = excluded.processed_at`
  ).bind(
    auditId,
    scores.overall,
    scores.performance,
    scores.security,
    scores.seo,
    scores.standards,
    JSON.stringify(issues),
    recommendation,
    recommendationReason,
    summary,
    story,
    processedAt
  ).run();

  // ── Step 6: Mark complete ────────────────────────────────────────────────
  await env.DB.prepare('UPDATE audits SET status = ?, completed_at = ? WHERE id = ?')
    .bind('complete', processedAt, auditId)
    .run();

  try {
    const logId = Math.random().toString(36).substring(2, 14);
    await env.DB.prepare(
      'INSERT INTO audit_logs (id, audit_id, action, details_json, timestamp) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      logId, auditId, 'audit_completed',
      JSON.stringify({ score: scores.overall, performanceScore: scores.performance, securityScore: scores.security, seoScore: scores.seo, standardsScore: scores.standards, issuesCount: issues.length }),
      processedAt
    ).run();
  } catch (logErr) {
    console.warn('Failed to write audit_log:', logErr);
  }

  await notifyDO(env, auditId, 'complete', url);
  await sendTelemetryEvent(env, {
    category: 'audit',
    action: 'AUDIT_COMPLETED',
    auditId,
    url,
    details: {
      score: scores.overall,
      performance: scores.performance,
      security: scores.security,
      seo: scores.seo,
      standards: scores.standards,
      recommendation,
      issuesCount: issues.length,
    },
  });

  // ── Step 7: Report-ready email ───────────────────────────────────────────
  const shouldSkipEmail = Boolean(job.isAdminTriggered || job.isReAudit);
  if (env.RESEND_API_KEY && job.email && !shouldSkipEmail) {
    try {
      const { sendReportReadyEmail } = await import('../lib/resend');
      const baseUrl = (env.APP_URL || 'https://workouse.com').replace(/\/$/, '');
      const reportUrl = `${baseUrl}/audit/${auditId}`;
      await sendReportReadyEmail(env.RESEND_API_KEY, job.email, reportUrl, url);
      await sendTelemetryEvent(env, {
        category: 'system',
        action: 'EMAIL_SENT',
        auditId,
        url,
        details: { email: job.email },
      });
    } catch (err: any) {
      console.warn('Failed to send report completion email:', err);
      await sendTelemetryEvent(env, {
        category: 'error',
        action: 'EMAIL_FAILED',
        auditId,
        url,
        details: { email: job.email, error: err.message },
      });
    }
  }

  // ── Step 8: Webhook dispatch ─────────────────────────────────────────────
  try {
    const activeSubs = await env.DB.prepare(
      "SELECT id, url, secret, events FROM webhook_subscriptions WHERE status = 'active'"
    ).all();

    if (activeSubs?.results && activeSubs.results.length > 0) {
      const { dispatchWebhookWithRetry } = await import('../pages/api/webhooks/dispatch');
      const payload = {
        auditId, url, email: job.email,
        score: scores.overall, recommendation,
        issuesCount: issues.length, completedAt: processedAt,
      };
      for (const sub of activeSubs.results as any[]) {
        try {
          const events = JSON.parse(sub.events || '[]');
          if (events.includes('audit.complete') || events.includes('*')) {
            await dispatchWebhookWithRetry(sub.url, sub.secret, 'audit.complete', payload, 3);
            await sendTelemetryEvent(env, {
              category: 'system',
              action: 'WEBHOOK_DISPATCHED',
              auditId,
              url,
              details: { subscriptionId: sub.id, targetUrl: sub.url },
            });
          }
        } catch (subErr: any) {
          console.warn(`Webhook dispatch error for sub ${sub.id}:`, subErr);
        }
      }
    }
  } catch (whErr) {
    console.warn('Webhook query/dispatch warning:', whErr);
  }
}

export default {
  async queue(batch: { messages: Array<{ body: AuditQueueMessage }> }, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await processAuditJob(msg.body, env);
      } catch (err: any) {
        console.error(`Failed to process audit job ${msg.body.auditId}:`, err);
        await sendTelemetryEvent(env, {
          category: 'error',
          action: 'AUDIT_JOB_FAILED',
          auditId: msg.body.auditId,
          url: msg.body.url,
          details: { error: err.message },
        });
      }
    }
  },
};
