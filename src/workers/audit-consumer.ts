import type { Env, AuditIssue } from '../lib/types';
import { runAuditEngine, type AuditRawResults } from '../lib/audit-engine';
import { PRICING_TABLE } from '../lib/pricing';
import { computeAllScores, determineRecommendation } from '../lib/score-engine';

export interface AuditQueueMessage {
  auditId: string;
  url: string;
  email: string;
  enqueuedAt: number;
}

// ---------------------------------------------------------------------------
// Gemini AI Copy Enrichment
// ---------------------------------------------------------------------------

const ENRICHMENT_SYSTEM_PROMPT = `You are a web consultant writing for non-technical business owners.
You will receive a JSON array of audit findings. For each finding, rewrite the "businessImpact" field as a single plain-English sentence (maximum 20 words) that explains why this matters to the business owner — no technical jargon, no developer terms.
Return ONLY a valid JSON array with the same structure: [{"id":"...","businessImpact":"..."}]
Do not add any other fields, commentary, or markdown.`;

/**
 * Call Gemini 2.5 Flash via Cloudflare AI Gateway to enrich issue
 * businessImpact descriptions with marketing-friendly copy.
 *
 * Falls back silently to the original hardcoded descriptions on any failure.
 */
async function enrichIssuesWithGemini(
  issues: AuditIssue[],
  env: Env
): Promise<AuditIssue[]> {
  if (!env.CF_AI_GATEWAY_TOKEN || !env.CF_AI_GATEWAY_URL || issues.length === 0) {
    return issues;
  }

  try {
    const payload = issues.map(({ id, businessImpact }) => ({ id, businessImpact }));

    const res = await fetch(env.CF_AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'cf-aig-authorization': `Bearer ${env.CF_AI_GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: ENRICHMENT_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(payload) },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      console.warn(`Gemini enrichment API error: ${res.status} ${res.statusText}`);
      return issues;
    }

    const data: any = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';

    // Strip possible markdown code fences
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const enriched: Array<{ id: string; businessImpact: string }> = JSON.parse(cleaned);

    if (!Array.isArray(enriched)) return issues;

    // Build a lookup map and merge enriched copy back into issues
    const enrichedMap = new Map(enriched.map((e) => [e.id, e.businessImpact]));
    return issues.map((issue) => ({
      ...issue,
      businessImpact: enrichedMap.get(issue.id) ?? issue.businessImpact,
    }));
  } catch (err) {
    console.warn('Gemini enrichment failed — using fallback copy:', err);
    return issues;
  }
}

// ---------------------------------------------------------------------------
// Durable Object progress broadcast
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Rule-based issue detection
// ---------------------------------------------------------------------------

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
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category,
      severity: raw.pagespeed.lcp > 4000 ? 'critical' : 'warning',
      businessImpact: 'Slow page load causes visitors to leave before your content appears.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }
  if (raw.pagespeed.tbt > 200) {
    const p = PRICING_TABLE['poor-fid'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category,
      severity: raw.pagespeed.tbt > 500 ? 'critical' : 'warning',
      businessImpact: 'Pages feel frozen and unresponsive, driving customers away.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }
  if (raw.pagespeed.cls > 0.10) {
    const p = PRICING_TABLE['poor-cls'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category,
      severity: raw.pagespeed.cls > 0.25 ? 'critical' : 'warning',
      businessImpact: 'Buttons and links jump around as the page loads, causing accidental clicks.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }
  if (raw.pagespeed.hasUnoptimizedImages) {
    const p = PRICING_TABLE['large-images'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Oversized images slow your site and inflate visitor mobile data bills.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }
  if (raw.pagespeed.hasRenderBlockingJs) {
    const p = PRICING_TABLE['render-blocking-js'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Scripts delay what visitors see first, increasing bounce rates.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }
  if (raw.pagespeed.ttfb > 600) {
    const p = PRICING_TABLE['slow-ttfb'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Your server is slow to respond, adding invisible delay before anything loads.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  // ── Standards ─────────────────────────────────────────────────────────────
  if (raw.standards && !raw.standards.hasViewportMeta) {
    const p = PRICING_TABLE['missing-viewport'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Your site renders broken on phones, pushing away mobile visitors.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  // ── Security ──────────────────────────────────────────────────────────────
  if (!raw.security.isHttps) {
    const p = PRICING_TABLE['no-ssl'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Browsers show a "Not Secure" warning that kills visitor trust immediately.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }
  if (!raw.security.hasHsts) {
    const p = PRICING_TABLE['missing-hsts'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Traffic can be intercepted and redirected without visitor knowledge.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }
  if (!raw.security.hasCsp) {
    const p = PRICING_TABLE['missing-csp'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Attackers can inject malicious scripts that steal customer data.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }
  if (!raw.security.hasXFrameOptions) {
    const p = PRICING_TABLE['missing-x-frame-options'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Your site can be embedded in fake pages to trick your customers.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }
  if (!raw.security.hasReferrerPolicy) {
    const p = PRICING_TABLE['missing-referrer-policy'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Private page URLs and customer paths leak to third-party services.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  // ── SEO ───────────────────────────────────────────────────────────────────
  if (!raw.seo.hasTitle) {
    const p = PRICING_TABLE['missing-title'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Google cannot name your page in search results, making it invisible.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  } else if (raw.seo.titleLength < 10 || raw.seo.titleLength > 60) {
    const p = PRICING_TABLE['invalid-title-length'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Search engines truncate or ignore titles outside the ideal length range.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (!raw.seo.hasMetaDescription) {
    const p = PRICING_TABLE['missing-meta-description'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Fewer people click your search result because there is no compelling preview.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  } else if (raw.seo.metaDescriptionLength < 50 || raw.seo.metaDescriptionLength > 160) {
    const p = PRICING_TABLE['invalid-meta-description-length'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Your search snippet gets cut off or ignored, reducing click-through rates.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (raw.seo.h1Count === 0) {
    const p = PRICING_TABLE['missing-h1'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Search engines cannot determine what your page is about, hurting rankings.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  } else if (raw.seo.h1Count > 1) {
    const p = PRICING_TABLE['multiple-h1'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Multiple conflicting headings confuse search engines about your page topic.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (!raw.seo.hasCanonical) {
    const p = PRICING_TABLE['missing-canonical'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Duplicate versions of your page split search ranking power.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (!raw.seo.hasOgTags) {
    const p = PRICING_TABLE['missing-og-tags'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Links shared on LinkedIn or Facebook look plain and unprofessional.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  } else if (!raw.seo.hasOgImage) {
    const p = PRICING_TABLE['missing-og-image'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Social media shares show no image, getting far fewer clicks and shares.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (!raw.seo.hasTwitterCards) {
    const p = PRICING_TABLE['missing-twitter-cards'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Twitter/X posts linking your site display as plain unformatted text.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (!raw.seo.hasSchemaOrg) {
    const p = PRICING_TABLE['missing-schema-org'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'You miss out on rich search result features like star ratings and FAQs.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (!raw.seo.hasRobotsTxt) {
    const p = PRICING_TABLE['no-robots-txt'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Search crawlers have no guidance and may index unwanted pages.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (!raw.seo.hasSitemapXml) {
    const p = PRICING_TABLE['missing-sitemap-xml'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Search engines are slower to discover and index your pages.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (raw.seo.imagesWithoutAltCount > 0) {
    const p = PRICING_TABLE['missing-image-alt'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: `${raw.seo.imagesWithoutAltCount} image(s) are invisible to screen readers and image search.`,
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (!raw.seo.hasCharsetMeta) {
    const p = PRICING_TABLE['missing-charset'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Text can render as garbled characters in some browsers and regions.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
    });
  }

  if (!raw.seo.hasLangAttribute) {
    const p = PRICING_TABLE['missing-lang'];
    if (p) issues.push({
      id: p.id, title: p.label, category: p.category, severity: p.severity,
      businessImpact: 'Screen readers mispronounce your content and regional SEO targeting is weaker.',
      estimatedMinutes: p.estimatedMinutes, price: p.price,
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
  await notifyDO(env, auditId, 'running');

  // ── Step 2: Collect raw diagnostics ─────────────────────────────────────
  const rawResults = await runAuditEngine(url, env.PAGESPEED_API_KEY);

  const pagespeedJson = JSON.stringify(rawResults.pagespeed);
  const observatoryJson = JSON.stringify(rawResults.security);
  const seoJson = JSON.stringify(rawResults.seo);

  await env.DB.prepare(
    'INSERT INTO raw_results (audit_id, pagespeed_json, observatory_json, seo_json, fetched_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(audit_id) DO UPDATE SET pagespeed_json = excluded.pagespeed_json, observatory_json = excluded.observatory_json, seo_json = excluded.seo_json, fetched_at = excluded.fetched_at'
  ).bind(auditId, pagespeedJson, observatoryJson, seoJson, rawResults.fetchedAt).run();

  if (env.AUDIT_RESULTS) {
    await env.AUDIT_RESULTS.put(`raw_${auditId}.json`, JSON.stringify(rawResults));
  }

  // ── Step 3: Algorithmic scoring ──────────────────────────────────────────
  await env.DB.prepare('UPDATE audits SET status = ? WHERE id = ?').bind('scoring', auditId).run();
  await notifyDO(env, auditId, 'scoring');

  const scores = computeAllScores(
    rawResults.pagespeed,
    rawResults.security,
    rawResults.seo,
    rawResults.standards
  );

  let issues = evaluateIssuesFromRawMetrics(rawResults);

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const recommendation = determineRecommendation(scores, criticalCount);

  // ── Step 4: Gemini copy enrichment ───────────────────────────────────────
  await env.DB.prepare('UPDATE audits SET status = ? WHERE id = ?').bind('enriching', auditId).run();
  await notifyDO(env, auditId, 'enriching');

  issues = await enrichIssuesWithGemini(issues, env);

  // ── Step 5: Persist results ──────────────────────────────────────────────
  const recommendationReason = recommendation === 'rebuild'
    ? 'Structural deficiencies detected across multiple dimensions — performance bottlenecks, security gaps, or SEO foundations are too degraded to patch. A rebuild on Astro + Cloudflare Pages delivers a faster return on investment.'
    : 'Your site\'s foundation is solid. Targeted fixes to performance, security headers, and SEO signals will raise your score without a full rebuild.';

  const totalHours = Math.round(issues.reduce((acc, i) => acc + i.estimatedMinutes, 0) / 60);
  const totalPrice = issues.reduce((acc, i) => acc + i.price, 0);

  const summary = `Audit completed for ${url}. Score: ${scores.overall}/100 (Performance ${scores.performance} · Security ${scores.security} · SEO ${scores.seo} · Standards ${scores.standards}). Found ${issues.length} issues (${criticalCount} critical, ${warningCount} warnings). Estimated fix: ${totalHours} hours ($${totalPrice} USD).`;

  const processedAt = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO audit_results
      (audit_id, score, performance_score, security_score, seo_score, standards_score, issues_json, recommendation, recommendation_reason, summary, processed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

  await notifyDO(env, auditId, 'complete');

  // ── Step 7: Report-ready email ───────────────────────────────────────────
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
