// Workouse Audit Tool — Algorithmic Score Engine
// Deterministic, multi-category weighted scoring. No AI dependency.

import type {
  PageSpeedDiagnostics,
  SecurityHeaderDiagnostics,
  SeoDiagnostics,
  AccessibilityAndStandardsDiagnostics,
} from './audit-engine';

export interface CategoryScores {
  performance: number;
  security: number;
  seo: number;
  standards: number;
  overall: number;
}

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Compute Performance Score (0–100).
 *
 * Blends rule-based Core Web Vitals penalties (50%) with the
 * Lighthouse performance score (50%) so mobile field data is
 * respected alongside our own thresholds.
 */
export function computePerformanceScore(pagespeed: PageSpeedDiagnostics): number {
  let rulePenalty = 0;

  // LCP — Largest Contentful Paint
  if (pagespeed.lcp > 4000) {
    rulePenalty += 25;
  } else if (pagespeed.lcp > 2500) {
    rulePenalty += 12;
  }

  // TBT — Total Blocking Time (proxy for FID/INP)
  if (pagespeed.tbt > 500) {
    rulePenalty += 20;
  } else if (pagespeed.tbt > 200) {
    rulePenalty += 10;
  }

  // CLS — Cumulative Layout Shift
  if (pagespeed.cls > 0.25) {
    rulePenalty += 15;
  } else if (pagespeed.cls > 0.10) {
    rulePenalty += 7;
  }

  // TTFB — Time to First Byte
  if (pagespeed.ttfb > 600) {
    rulePenalty += 15;
  } else if (pagespeed.ttfb > 400) {
    rulePenalty += 7;
  }

  // Image & JS delivery
  if (pagespeed.hasUnoptimizedImages) rulePenalty += 8;
  if (pagespeed.hasRenderBlockingJs) rulePenalty += 8;

  const ruleScore = clamp(100 - rulePenalty);

  // Blend with Lighthouse score (both equally weighted)
  const lighthouseScore = clamp(pagespeed.score);
  return clamp(ruleScore * 0.5 + lighthouseScore * 0.5);
}

/**
 * Compute Security Score (0–100).
 *
 * Pure rule-based — each missing critical security control
 * carries a proportional penalty reflecting real-world risk severity.
 */
export function computeSecurityScore(security: SecurityHeaderDiagnostics): number {
  let penalty = 0;

  if (!security.isHttps)            penalty += 50; // existential risk
  if (!security.hasHsts)            penalty += 20;
  if (!security.hasCsp)             penalty += 15;
  if (!security.hasXFrameOptions)   penalty += 10;
  if (!security.hasNosniff)         penalty +=  5;
  if (!security.hasReferrerPolicy)  penalty +=  5;
  if (!security.hasPermissionsPolicy) penalty += 5;

  return clamp(100 - penalty);
}

/**
 * Compute SEO Score (0–100).
 *
 * Covers on-page signals, structured data, social metadata,
 * and crawlability indicators.
 */
export function computeSeoScore(seo: SeoDiagnostics): number {
  let penalty = 0;

  // Title
  if (!seo.hasTitle) {
    penalty += 20;
  } else if (seo.titleLength < 10 || seo.titleLength > 60) {
    penalty += 7;
  }

  // Meta description
  if (!seo.hasMetaDescription) {
    penalty += 15;
  } else if (seo.metaDescriptionLength < 50 || seo.metaDescriptionLength > 160) {
    penalty += 5;
  }

  // Heading structure
  if (seo.h1Count === 0) {
    penalty += 12;
  } else if (seo.h1Count > 1) {
    penalty += 5;
  }

  // Crawlability
  if (!seo.hasCanonical)    penalty += 8;
  if (!seo.hasRobotsTxt)    penalty += 5;
  if (!seo.hasSitemapXml)   penalty += 5;

  // Social metadata
  if (!seo.hasOgTags)       penalty += 5;
  else if (!seo.hasOgImage) penalty += 5;
  if (!seo.hasTwitterCards) penalty += 3;

  // Structured data
  if (!seo.hasSchemaOrg)    penalty += 5;

  // Accessibility / encoding
  if (!seo.hasCharsetMeta)  penalty += 5;
  if (!seo.hasLangAttribute) penalty += 5;

  // Image alt attributes — 3 pts per missing, capped at 15
  if (seo.imagesWithoutAltCount > 0) {
    penalty += Math.min(seo.imagesWithoutAltCount * 3, 15);
  }

  return clamp(100 - penalty);
}

/**
 * Compute Standards Score (0–100).
 *
 * Covers HTML spec compliance, mobile readiness, discoverability,
 * and modern agent/security ecosystem signals.
 */
export function computeStandardsScore(standards: AccessibilityAndStandardsDiagnostics): number {
  let penalty = 0;

  if (!standards.hasDoctype)       penalty += 25;
  if (!standards.hasViewportMeta)  penalty += 20;
  if (!standards.hasLangAttribute) penalty += 15;
  if (!standards.hasFavicon)       penalty += 10;
  if (!standards.hasSitemapXml)    penalty += 10;
  if (!standards.hasSecurityTxt)   penalty += 10;
  if (!standards.hasLlmsTxt)       penalty += 10;

  return clamp(100 - penalty);
}

/**
 * Compute the composite overall score from category sub-scores.
 *
 * Weights reflect Workouse's positioning as a performance + security shop:
 *   Performance  40%
 *   Security     30%
 *   SEO          20%
 *   Standards    10%
 */
export function computeOverallScore(scores: Omit<CategoryScores, 'overall'>): number {
  return clamp(
    scores.performance * 0.40 +
    scores.security    * 0.30 +
    scores.seo         * 0.20 +
    scores.standards   * 0.10
  );
}

/**
 * Determine fix vs. rebuild recommendation.
 *
 * Rebuild is recommended when the site has structural problems across
 * multiple dimensions — not just a handful of tweakable issues.
 */
export function determineRecommendation(
  scores: CategoryScores,
  criticalCount: number
): 'fix' | 'rebuild' {
  if (
    scores.overall < 55 ||
    criticalCount >= 3 ||
    scores.security < 40
  ) {
    return 'rebuild';
  }
  return 'fix';
}

/**
 * Run all category scoring functions and return the full CategoryScores object.
 */
export function computeAllScores(
  pagespeed: PageSpeedDiagnostics,
  security: SecurityHeaderDiagnostics,
  seo: SeoDiagnostics,
  standards: AccessibilityAndStandardsDiagnostics
): CategoryScores {
  const performance = computePerformanceScore(pagespeed);
  const securityScore = computeSecurityScore(security);
  const seoScore = computeSeoScore(seo);
  const standardsScore = computeStandardsScore(standards);
  const overall = computeOverallScore({
    performance,
    security: securityScore,
    seo: seoScore,
    standards: standardsScore,
  });

  return {
    performance,
    security: securityScore,
    seo: seoScore,
    standards: standardsScore,
    overall,
  };
}
