import type { Env, AuditIssue } from '../lib/types';
import { runAuditEngine, type AuditRawResults } from '../lib/audit-engine';
import { PRICING_TABLE } from '../lib/pricing';

export interface AuditQueueMessage {
  auditId: string;
  url: string;
  email: string;
  enqueuedAt: number;
}

/**
 * Broadcast status progress to AuditStatusDO Durable Object subscribers.
 */
async function notifyDO(env: Env, auditId: string, stage: string): Promise<void> {
  if (!env.AUDIT_STATUS_DO) return;
  try {
    const doId = env.AUDIT_STATUS_DO.idFromName(auditId);
    const stub = env.AUDIT_STATUS_DO.get(doId);
    await stub.fetch('http://do/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { type: 'progress', stage } }),
    });
  } catch (err) {
    console.warn('DO notification failed:', err);
  }
}

/**
 * Deterministically match raw diagnostic metrics against PRICING_TABLE issues.
 */
function evaluateIssuesFromRawMetrics(raw: AuditRawResults): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Performance rules (Web Vitals standards)
  if (raw.pagespeed.lcp > 2500) {
    const p = PRICING_TABLE['poor-lcp'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: raw.pagespeed.lcp > 4000 ? 'critical' : 'warning', businessImpact: 'Slow LCP (>2.5s) hurts user retention and search rankings.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }
  if (raw.pagespeed.tbt > 200) {
    const p = PRICING_TABLE['poor-fid'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: raw.pagespeed.tbt > 500 ? 'critical' : 'warning', businessImpact: 'High main-thread blocking time (>200ms) delays user interaction.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }
  if (raw.pagespeed.cls > 0.10) {
    const p = PRICING_TABLE['poor-cls'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: raw.pagespeed.cls > 0.25 ? 'critical' : 'warning', businessImpact: 'Visual layout shifts cause accidental clicks and poor UX.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }
  if (raw.pagespeed.hasUnoptimizedImages) {
    const p = PRICING_TABLE['large-images'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Uncompressed images consume user bandwidth.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }
  if (raw.pagespeed.hasRenderBlockingJs) {
    const p = PRICING_TABLE['render-blocking-js'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Blocking JS delays page paint and initial display.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }
  if (raw.pagespeed.ttfb > 600) {
    const p = PRICING_TABLE['slow-ttfb'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Slow server response (>600ms) delays full page lifecycle.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  // Standards rules
  if (raw.standards && !raw.standards.hasViewportMeta) {
    const p = PRICING_TABLE['missing-viewport'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Missing viewport meta tag breaks mobile responsiveness.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  // Security rules
  if (!raw.security.isHttps) {
    const p = PRICING_TABLE['no-ssl'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'HTTP without SSL triggers browser warning banners.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }
  if (!raw.security.hasHsts) {
    const p = PRICING_TABLE['missing-hsts'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Missing HSTS leaves traffic vulnerable to downgrade attacks.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }
  if (!raw.security.hasCsp) {
    const p = PRICING_TABLE['missing-csp'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Missing CSP allows cross-site scripting (XSS) risks.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }
  if (!raw.security.hasXFrameOptions) {
    const p = PRICING_TABLE['missing-x-frame-options'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Site can be embedded in malicious clickjacking iframes.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }
  if (!raw.security.hasReferrerPolicy) {
    const p = PRICING_TABLE['missing-referrer-policy'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Leaks full URL paths to external third-party sites.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  // SEO rules
  if (!raw.seo.hasTitle) {
    const p = PRICING_TABLE['missing-title'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Missing page title causes critical search indexing loss.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  } else if (raw.seo.titleLength < 10 || raw.seo.titleLength > 60) {
    const p = PRICING_TABLE['invalid-title-length'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: `Page title length (${raw.seo.titleLength} chars) should ideally be between 10 and 60 characters.`, estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (!raw.seo.hasMetaDescription) {
    const p = PRICING_TABLE['missing-meta-description'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Lower click-through rates from search results.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  } else if (raw.seo.metaDescriptionLength < 50 || raw.seo.metaDescriptionLength > 160) {
    const p = PRICING_TABLE['invalid-meta-description-length'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: `Meta description length (${raw.seo.metaDescriptionLength} chars) should ideally be between 50 and 160 characters.`, estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (raw.seo.h1Count === 0) {
    const p = PRICING_TABLE['missing-h1'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Confuses search engine crawlers regarding core topic.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  } else if (raw.seo.h1Count > 1) {
    const p = PRICING_TABLE['multiple-h1'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: `Page has ${raw.seo.h1Count} H1 tags. Exactly 1 H1 heading per page is recommended for clear outline hierarchy.`, estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (!raw.seo.hasCanonical) {
    const p = PRICING_TABLE['missing-canonical'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Risk of duplicate content penalties.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (!raw.seo.hasOgTags) {
    const p = PRICING_TABLE['missing-og-tags'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Social media shares lack rich previews.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  } else if (!raw.seo.hasOgImage) {
    const p = PRICING_TABLE['missing-og-image'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Open Graph shares will lack visual image previews on Facebook, LinkedIn, etc.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (!raw.seo.hasTwitterCards) {
    const p = PRICING_TABLE['missing-twitter-cards'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Twitter/X card previews will display fallback unformatted links.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (!raw.seo.hasSchemaOrg) {
    const p = PRICING_TABLE['missing-schema-org'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Missing structured JSON-LD data reduces rich snippet eligibility in search results.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (!raw.seo.hasRobotsTxt) {
    const p = PRICING_TABLE['no-robots-txt'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Crawlers lack indexing guidance.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (!raw.seo.hasSitemapXml) {
    const p = PRICING_TABLE['missing-sitemap-xml'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Missing sitemap.xml slows search engine discovery of site pages.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (raw.seo.imagesWithoutAltCount > 0) {
    const p = PRICING_TABLE['missing-image-alt'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: `${raw.seo.imagesWithoutAltCount} of ${raw.seo.totalImagesCount} image(s) lack alt attributes, hurting accessibility & image search indexation.`, estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (!raw.seo.hasCharsetMeta) {
    const p = PRICING_TABLE['missing-charset'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Missing explicit meta charset tag can cause encoding render glitches in browsers.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  if (!raw.seo.hasLangAttribute) {
    const p = PRICING_TABLE['missing-lang'];
    if (p) issues.push({ id: p.id, title: p.label, category: p.category, severity: p.severity, businessImpact: 'Missing HTML lang attribute impedes screen readers and localized search targeting.', estimatedMinutes: p.estimatedMinutes, price: p.price });
  }

  return issues;
}

export async function processAuditJob(job: AuditQueueMessage, env: Env): Promise<void> {
  const { auditId, url } = job;

  // Step 1: Transition to running
  await env.DB.prepare('UPDATE audits SET status = ? WHERE id = ?').bind('running', auditId).run();
  await notifyDO(env, auditId, 'running');

  // Step 2: Diagnostic Scraping
  const rawResults = await runAuditEngine(url, env.PAGESPEED_API_KEY);

  // Store raw diagnostic data
  const pagespeedJson = JSON.stringify(rawResults.pagespeed);
  const observatoryJson = JSON.stringify(rawResults.security);
  const seoJson = JSON.stringify(rawResults.seo);

  await env.DB.prepare(
    'INSERT INTO raw_results (audit_id, pagespeed_json, observatory_json, seo_json, fetched_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(audit_id) DO UPDATE SET pagespeed_json = excluded.pagespeed_json, observatory_json = excluded.observatory_json, seo_json = excluded.seo_json, fetched_at = excluded.fetched_at'
  )
    .bind(auditId, pagespeedJson, observatoryJson, seoJson, rawResults.fetchedAt)
    .run();

  if (env.AUDIT_RESULTS) {
    await env.AUDIT_RESULTS.put(`raw_${auditId}.json`, JSON.stringify(rawResults));
  }

  // Step 3: Transition to AI Processing
  await env.DB.prepare('UPDATE audits SET status = ? WHERE id = ?').bind('ai_processing', auditId).run();
  await notifyDO(env, auditId, 'ai_processing');

  // Step 4: Rule Engine & AI evaluation
  const issues = evaluateIssuesFromRawMetrics(rawResults);

  // Calculate weighted health score
  let score = rawResults.pagespeed.score;
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  score = Math.max(10, Math.min(100, score - (criticalCount * 12 + warningCount * 5)));

  const recommendation: 'fix' | 'rebuild' = score < 60 || criticalCount >= 3 ? 'rebuild' : 'fix';
  const recommendationReason = recommendation === 'rebuild'
    ? 'Multiple structural issues, severe performance bottlenecks, or security gaps detected. Rebuilding on Astro + Cloudflare Pages is more cost-effective than patching.'
    : 'Minor performance and security header adjustments needed. Codebase can be patched directly.';

  const summary = `Audit completed for ${url}. Identified ${issues.length} total technical issues (${criticalCount} critical, ${warningCount} warnings). Estimated repair effort: ${Math.round(issues.reduce((acc, i) => acc + i.estimatedMinutes, 0) / 60)} hours ($${issues.reduce((acc, i) => acc + i.price, 0)} USD total at $35/hr rate).`;

  const processedAt = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    'INSERT INTO ai_output (audit_id, score, issues_json, recommendation, recommendation_reason, summary, processed_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(audit_id) DO UPDATE SET score = excluded.score, issues_json = excluded.issues_json, recommendation = excluded.recommendation, recommendation_reason = excluded.recommendation_reason, summary = excluded.summary, processed_at = excluded.processed_at'
  )
    .bind(
      auditId,
      score,
      JSON.stringify(issues),
      recommendation,
      recommendationReason,
      summary,
      processedAt
    )
    .run();

  // Step 5: Mark complete
  await env.DB.prepare('UPDATE audits SET status = ?, completed_at = ? WHERE id = ?')
    .bind('complete', processedAt, auditId)
    .run();

  // Log completion event in audit_logs
  try {
    const logId = Math.random().toString(36).substring(2, 14);
    await env.DB.prepare(
      'INSERT INTO audit_logs (id, audit_id, action, details_json, timestamp) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(logId, auditId, 'audit_completed', JSON.stringify({ score, issuesCount: issues.length }), processedAt)
      .run();
  } catch (logErr) {
    console.warn('Failed to write audit_log:', logErr);
  }

  await notifyDO(env, auditId, 'complete');

  // Step 6: Dispatch completion email if Resend key bound
  if (env.RESEND_API_KEY && job.email) {
    try {
      const { sendReportReadyEmail } = await import('../lib/resend');
      const baseUrl = (env.APP_URL || 'https://workouse.com').replace(/\/$/, '');
      const reportUrl = `${baseUrl}/audit/${auditId}`;
      await sendReportReadyEmail(env.RESEND_API_KEY, job.email, reportUrl, url);
    } catch (err) {
      console.warn('Failed to send report completion email:', err);
    }
  }

  // Step 7: Webhook notification dispatch (audit.complete)
  try {
    const activeSubs = await env.DB.prepare(
      "SELECT id, url, secret, events FROM webhook_subscriptions WHERE status = 'active'"
    ).all();

    if (activeSubs?.results && activeSubs.results.length > 0) {
      const { dispatchWebhookWithRetry } = await import('../pages/api/webhooks/dispatch');
      const payload = { auditId, url, email: job.email, score, recommendation, issuesCount: issues.length, completedAt: processedAt };
      for (const sub of activeSubs.results as any[]) {
        try {
          const events = JSON.parse(sub.events || '[]');
          if (events.includes('audit.complete') || events.includes('*')) {
            await dispatchWebhookWithRetry(sub.url, sub.secret, 'audit.complete', payload, 3);
          }
        } catch (subErr) {
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
      } catch (err) {
        console.error(`Failed to process audit job ${msg.body.auditId}:`, err);
      }
    }
  },
};


