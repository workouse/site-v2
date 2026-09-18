import type { Env, AuditIssue, PlatformType, ExecutiveBriefing } from './types';
import { sendTelemetryEvent } from './telemetry';

export interface StoryScores {
  overall: number;
  performance: number;
  security: number;
  seo: number;
  standards: number;
}

export interface GenerateStoryParams {
  url: string;
  auditId?: string;
  scores: StoryScores;
  issues: AuditIssue[];
  recommendation: 'fix' | 'rebuild';
  platform?: PlatformType;
  platformVersion?: string;
  detectedExtensionsCount?: number;
  techstackSummary?: string;
  rawResults?: {
    pagespeed?: {
      lcp?: number;
      cls?: number;
      tbt?: number;
      ttfb?: number;
    };
    security?: {
      isHttps?: boolean;
      hasHsts?: boolean;
      hasCsp?: boolean;
    };
    seo?: {
      hasTitle?: boolean;
      hasMetaDescription?: boolean;
      hasH1?: boolean;
    };
    mobile?: {
      hasHorizontalOverflow?: boolean;
      undersizedTouchTargetsCount?: number;
    };
  };
}

const STORY_SYSTEM_PROMPT = `You are an elite digital strategist and senior web architect creating a punchy, high-impact Executive Briefing for a business owner based on automated website audit data.

Your goal is to provide a scannable, persuasive executive assessment that builds trust, clearly articulates lost business revenue/conversions, and positions our engineering team (Workouse) as the trusted crew to fix everything at a flat $35/hr rate.

STRICT JSON OUTPUT REQUIREMENT:
Respond ONLY with a valid JSON object matching this schema without markdown code fences or conversational text:
{
  "headline": "A bold, authoritative 1-sentence bottom-line diagnosis of the website's health, speed, and visitor impact.",
  "bottlenecks": [
    "Bottleneck 1: High-impact friction point in human terms (e.g. mobile delay, conversion drop-off, heavy script lag)",
    "Bottleneck 2: Core technical blocker explained without esoteric jargon (e.g. uncompressed images, missing SSL/CSP)",
    "Bottleneck 3: Critical visibility or mobile usability problem"
  ],
  "opportunities": [
    "Opportunity 1: Tangible speed gain (e.g. instant sub-second mobile page loads)",
    "Opportunity 2: Business & SEO ROI (e.g. lift mobile checkout conversions, boost Google search ranking)",
    "Opportunity 3: Trust & protection (e.g. eliminate security warnings and GDPR/CCPA privacy risks)"
  ],
  "roadmap": [
    "Roadmap step 1: Specific high-impact technical remediation (e.g. Cloudflare edge caching, image optimization pipeline)",
    "Roadmap step 2: Clear execution promise (e.g. Workouse delivers fixed-rate optimization in 48 hours)"
  ]
}

GUIDELINES:
1. "headline" must be direct and authoritative, addressing the domain's core condition.
2. "bottlenecks": Provide exactly 2 to 3 bullet items. Focus on visitor impact (lost inquiries, cart abandonment, sluggish mobile response).
3. "opportunities": Provide exactly 2 to 3 bullet items showing clear upside after fixes.
4. "roadmap": Provide 2 concrete remediation steps tailored to the detected platform (WordPress, Shopify, Webflow, Wix, or Custom).
5. Avoid overly dense developer jargon (translate LCP, CLS, TTFB into real customer sensations like "pages shifting on click" or "3.4s delay before product display").`;

/**
 * Clean domain helper for conversational addressing
 */
export function cleanDomainName(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  }
}

/**
 * Generate a deterministic, high-quality structured executive briefing
 */
export function generateStoryFallbackBriefing(params: GenerateStoryParams): ExecutiveBriefing {
  const domain = cleanDomainName(params.url);
  const { scores, issues, recommendation, platform, rawResults } = params;

  const isSpeedStruggling = scores.performance < 65;
  const isSecurityWeak = scores.security < 70;
  const isSeoWeak = scores.seo < 75;
  const isMobileStruggling =
    (rawResults?.mobile?.undersizedTouchTargetsCount ?? 0) > 0 ||
    (rawResults?.mobile?.hasHorizontalOverflow ?? false);

  const criticalIssues = issues.filter((i) => i.severity === 'critical');
  const warningIssues = issues.filter((i) => i.severity === 'warning');

  // 1. Headline determination
  let headline = '';
  if (scores.overall >= 85) {
    headline = `${domain} has a high-performing digital foundation, with only minor optimizations needed to achieve peak sub-second speeds.`;
  } else if (platform === 'shopify') {
    headline = `${domain}'s storefront has strong merchandising, but heavy background app scripts and mobile lag are silently hurting checkout conversion rates.`;
  } else if (platform === 'wordpress') {
    headline = `${domain} has established solid brand content, but server-side plugin overhead and unoptimized media are creating high mobile bounce rates.`;
  } else if (isSpeedStruggling && isSecurityWeak) {
    headline = `${domain} is experiencing critical mobile loading delays and missing security seals, exposing your business to lost inquiries and visitor drop-off.`;
  } else if (isSpeedStruggling) {
    headline = `${domain} is losing an estimated 15–25% of mobile visitors due to prolonged page load delays and layout instability.`;
  } else if (isSecurityWeak) {
    headline = `${domain} performs adequately in speed, but missing security and privacy headers leave your domain vulnerable to browser warnings.`;
  } else {
    headline = `${domain} has strong digital potential, but several hidden performance and search visibility bottlenecks are holding back growth.`;
  }

  // 2. Bottlenecks (2-3 bullet items)
  const bottlenecks: string[] = [];
  if (isSpeedStruggling || (rawResults?.pagespeed?.lcp && rawResults.pagespeed.lcp > 2500)) {
    const lcpSec = rawResults?.pagespeed?.lcp ? (rawResults.pagespeed.lcp / 1000).toFixed(1) : '3.2+';
    bottlenecks.push(`Mobile visitors experience a ${lcpSec}s delay before main content renders, driving impatient buyers away.`);
  } else if (issues.some((i) => i.id === 'large-images' || i.id === 'render-blocking-js')) {
    bottlenecks.push('Unoptimized image payloads and render-blocking scripts add unnecessary weight to initial page visits.');
  }

  if (isSecurityWeak || issues.some((i) => i.id === 'missing-hsts' || i.id === 'missing-csp' || i.id.startsWith('eu-'))) {
    bottlenecks.push('Missing Content Security Policy and HTTP security headers leave visitor data and brand trust exposed.');
  }

  if (isMobileStruggling || issues.some((i) => i.id === 'tiny-touch-targets' || i.id === 'mobile-layout-overflow')) {
    bottlenecks.push('Cramped smartphone touch targets and viewport layout shifts trigger accidental clicks and user frustration.');
  } else if (isSeoWeak || issues.some((i) => i.id === 'missing-meta-description' || i.id === 'missing-schema-org')) {
    bottlenecks.push('Incomplete search metadata and structured schema prevent Google from generating high-converting rich snippets.');
  }

  if (bottlenecks.length < 2) {
    bottlenecks.push(`${criticalIssues.length + warningIssues.length} itemized friction points are accumulating technical debt and slowing down customer engagement.`);
  }

  // 3. Opportunities (2-3 bullet items)
  const opportunities: string[] = [];
  opportunities.push('Sub-second global loading speed across all mobile networks and desktop browsers.');
  if (platform === 'shopify') {
    opportunities.push('Faster product browsing and streamlined checkout to capture abandoned shopping carts.');
  } else if (platform === 'wordpress') {
    opportunities.push('Lightweight edge caching to eliminate server lag while keeping your familiar WordPress workflow.');
  } else {
    opportunities.push('Higher Google search rankings and rich snippet presence to drive qualified organic traffic.');
  }
  opportunities.push('Rock-solid enterprise security and guaranteed GDPR & US privacy compliance.');

  // 4. Roadmap (2 bullet items)
  const roadmap: string[] = [];
  if (platform === 'shopify') {
    roadmap.push('Prune bloated third-party tracking scripts and optimize theme asset delivery via Cloudflare edge.');
    roadmap.push('Workouse engineering deploys full store optimizations within 48 hours at flat $35/hr rate.');
  } else if (platform === 'wordpress') {
    roadmap.push('Implement Cloudflare global edge HTML caching, optimize media pipeline, and streamline heavy plugins.');
    roadmap.push('Workouse engineering handles the entire tune-up without downtime at flat $35/hr rate.');
  } else if (platform === 'webflow' || platform === 'wix') {
    roadmap.push('Configure edge reverse-proxy caching and streamline client-side animation execution.');
    roadmap.push('Workouse engineering delivers complete speed modernization at flat $35/hr rate.');
  } else if (recommendation === 'rebuild') {
    roadmap.push('Modernize architecture onto ultra-fast Cloudflare Pages and Astro serverless edge.');
    roadmap.push('Workouse engineering handles end-to-end migration with zero loss of existing SEO ranking.');
  } else {
    roadmap.push('Deploy targeted code refinements, hardened security headers, and responsive asset tuning.');
    roadmap.push('Workouse engineering executes all itemized repairs with full verification at flat $35/hr rate.');
  }

  return {
    headline,
    bottlenecks: bottlenecks.slice(0, 3),
    opportunities: opportunities.slice(0, 3),
    roadmap: roadmap.slice(0, 2),
  };
}

/**
 * Convert structured briefing to human-readable plain text
 */
export function briefingToPlainText(briefing: ExecutiveBriefing): string {
  const p1 = briefing.headline;
  const p2 = `Key Friction Points:\n• ${briefing.bottlenecks.join('\n• ')}`;
  const p3 = `Expected Growth & Resolution:\n• ${briefing.opportunities.join('\n• ')}\n\n${briefing.roadmap.join(' ')}`;
  return `${p1}\n\n${p2}\n\n${p3}`;
}

/**
 * Parse any story representation (JSON or legacy text) into an ExecutiveBriefing
 */
export function parseStoryToBriefing(
  rawStory: string | null | undefined,
  fallbackParams?: GenerateStoryParams
): ExecutiveBriefing {
  if (rawStory && rawStory.trim().length > 0) {
    const trimmed = rawStory.trim();

    // Try parsing as direct JSON
    try {
      const jsonStr = trimmed
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

      const parsed = JSON.parse(jsonStr);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.headline === 'string' &&
        Array.isArray(parsed.bottlenecks) &&
        Array.isArray(parsed.opportunities)
      ) {
        return {
          headline: parsed.headline,
          bottlenecks: parsed.bottlenecks.map(String).filter((b: string) => b.length > 0),
          opportunities: parsed.opportunities.map(String).filter((o: string) => o.length > 0),
          roadmap: Array.isArray(parsed.roadmap)
            ? parsed.roadmap.map(String).filter((r: string) => r.length > 0)
            : ['Workouse handles the complete optimization at flat $35/hr rate.'],
        };
      }
    } catch {
      // Not JSON, parse legacy multi-paragraph text
      const paragraphs = trimmed
        .split('\n\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      if (paragraphs.length >= 2) {
        const headline = paragraphs[0];
        const bottlenecks = paragraphs[1]
          .split(/(?<=[.!?])\s+/)
          .filter((s) => s.length > 15)
          .slice(0, 3);
        const opportunities = (paragraphs[2] || '')
          .split(/(?<=[.!?])\s+/)
          .filter((s) => s.length > 15)
          .slice(0, 3);

        return {
          headline,
          bottlenecks: bottlenecks.length > 0 ? bottlenecks : ['Identified performance friction points requiring remediation.'],
          opportunities: opportunities.length > 0 ? opportunities : ['Sub-second page speeds and increased conversion rates.'],
          roadmap: ['Workouse engineering deploys complete optimizations at flat $35/hr rate.'],
        };
      }
    }
  }

  // Fallback to deterministic briefing if provided, or default
  if (fallbackParams) {
    return generateStoryFallbackBriefing(fallbackParams);
  }

  return {
    headline: 'Website health analysis completed with itemized optimization opportunities.',
    bottlenecks: ['Identified bottlenecks affecting mobile speed and user retention.'],
    opportunities: ['Sub-second load times and enhanced Google search ranking.'],
    roadmap: ['Workouse engineering deploys all targeted fixes at flat $35/hr rate.'],
  };
}

/**
 * Generate a deterministic story fallback string (JSON format)
 */
export function generateStoryFallback(params: GenerateStoryParams): string {
  const briefing = generateStoryFallbackBriefing(params);
  return JSON.stringify(briefing);
}

/**
 * Generate an executive story narrative using Cloudflare AI Gateway with automatic fallback
 */
export async function generateAuditStory(
  params: GenerateStoryParams,
  env: Env
): Promise<string> {
  const fallbackBriefing = generateStoryFallbackBriefing(params);
  const fallbackJsonStr = JSON.stringify(fallbackBriefing);

  if (!env.CF_AI_GATEWAY_TOKEN || !env.CF_AI_GATEWAY_URL) {
    return fallbackJsonStr;
  }

  const domain = cleanDomainName(params.url);
  const promptContext = {
    domain,
    url: params.url,
    platform: params.platform || 'custom',
    platformVersion: params.platformVersion,
    detectedExtensionsCount: params.detectedExtensionsCount || 0,
    overallScore: params.scores.overall,
    scores: {
      speedScore: params.scores.performance,
      securityScore: params.scores.security,
      seoScore: params.scores.seo,
      standardsScore: params.scores.standards,
    },
    recommendation: params.recommendation,
    criticalBottlenecks: params.issues
      .filter((i) => i.severity === 'critical')
      .map((i) => i.title),
    warningBottlenecks: params.issues
      .filter((i) => i.severity === 'warning')
      .map((i) => i.title),
    techstackSummary: params.techstackSummary || 'Modern Web Stack',
  };

  const startTime = Date.now();
  try {
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
          { role: 'system', content: STORY_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Generate the executive briefing JSON for ${domain} using these audit findings:\n${JSON.stringify(promptContext, null, 2)}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`AI story generation API error: ${res.status} ${res.statusText} — ${errText}`);
      await sendTelemetryEvent(env, {
        category: 'error',
        action: 'AI_STORY_GATEWAY_ERROR',
        auditId: params.auditId,
        url: params.url,
        details: { status: res.status, statusText: res.statusText, durationMs, errorBody: errText },
      });
      return fallbackJsonStr;
    }

    const data: any = await res.json();
    const content: string = data?.choices?.[0]?.message?.content?.trim() ?? '';

    if (content && content.length > 20) {
      // Validate that it parses as a valid ExecutiveBriefing
      const briefing = parseStoryToBriefing(content, params);
      const cleaned = JSON.stringify(briefing);

      await sendTelemetryEvent(env, {
        category: 'ai',
        action: 'AI_STORY_GENERATED',
        auditId: params.auditId,
        url: params.url,
        details: { durationMs, headlineLength: briefing.headline.length },
      });

      return cleaned;
    }

    return fallbackJsonStr;
  } catch (err: any) {
    console.warn('AI story generation exception, using fallback:', err);
    return fallbackJsonStr;
  }
}
