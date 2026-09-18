// Workouse Audit Tool — Algorithmic Score Engine
// Deterministic, multi-category weighted scoring. No AI dependency.

import type {
  PageSpeedDiagnostics,
  SecurityHeaderDiagnostics,
  SeoDiagnostics,
  AccessibilityAndStandardsDiagnostics,
  MozillaObservatoryDiagnostics,
  Pa11yDiagnostics,
  MobileResponsivenessDiagnostics,
  DataRegulationDiagnostics,
} from './audit-engine';
import type { AuditIssue } from './types';

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
 * Blends local HTTP header security checks (50%) with
 * Mozilla HTTP Observatory grade & score (50%).
 */
export function computeSecurityScore(
  security: SecurityHeaderDiagnostics,
  observatory?: MozillaObservatoryDiagnostics
): number {
  let penalty = 0;

  if (!security.isHttps)            penalty += 50; // existential risk
  if (!security.hasHsts)            penalty += 20;
  if (!security.hasCsp)             penalty += 15;
  if (!security.hasXFrameOptions)   penalty += 10;
  if (!security.hasNosniff)         penalty +=  5;
  if (!security.hasReferrerPolicy)  penalty +=  5;
  if (!security.hasPermissionsPolicy) penalty += 5;

  const headerScore = clamp(100 - penalty);

  if (observatory && typeof observatory.score === 'number') {
    const observatoryScore = clamp(observatory.score);
    return clamp(headerScore * 0.5 + observatoryScore * 0.5);
  }

  return headerScore;
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

  // Heading structure & hierarchy
  if (seo.h1Count === 0) {
    penalty += 12;
  } else if (seo.h1Count > 1) {
    penalty += 5;
  }
  if (seo.hasSkippedHeadings) {
    penalty += 8;
  }
  if (seo.emptyHeadingsCount > 0) {
    penalty += 5;
  }

  // HTML5 Semantic page structure
  if (!seo.hasSemanticLandmarks) {
    penalty += 8;
  }

  // URL hygiene & permalink structure
  if (seo.urlQuality && (seo.urlQuality.isTooLong || seo.urlQuality.hasUnderscores || seo.urlQuality.hasUppercase)) {
    penalty += 5;
  }

  // Crawlability & Indexing
  if (seo.isNoindex)        penalty += 25; // Critical indexing blocker
  if (!seo.hasCanonical)    penalty += 8;
  if (!seo.hasRobotsTxt)    penalty += 5;
  if (!seo.hasSitemapXml)   penalty += 5;

  // Social metadata
  if (!seo.hasOgTags)       penalty += 5;
  else if (!seo.hasOgImage) penalty += 5;
  if (!seo.hasTwitterCards) penalty += 3;

  // Structured data & Rich snippets
  if (!seo.hasSchemaOrg)    penalty += 5;

  // Accessibility / encoding
  if (!seo.hasCharsetMeta)  penalty += 5;
  if (!seo.hasLangAttribute) penalty += 5;

  // Image alt attributes
  if (seo.imagesWithoutAltCount > 0) {
    penalty += Math.min(seo.imagesWithoutAltCount * 3, 15);
  }
  if (seo.hasPoorAltText) {
    penalty += Math.min(seo.poorAltTextCount * 2, 8);
  }

  return clamp(100 - penalty);
}

/**
 * Compute Standards Score (0–100).
 *
 * Covers HTML spec compliance, Pa11y WCAG 2.1 AA accessibility,
 * Mobile Responsiveness, and Data Regulation Compliance (EU GDPR / US CCPA).
 */
export function computeStandardsScore(
  standards: AccessibilityAndStandardsDiagnostics,
  pa11y?: Pa11yDiagnostics,
  mobile?: MobileResponsivenessDiagnostics,
  regulation?: DataRegulationDiagnostics
): number {
  let penalty = 0;

  if (!standards.hasDoctype)       penalty += 20;
  if (!standards.hasViewportMeta)  penalty += 20;
  if (!standards.hasLangAttribute) penalty += 15;
  if (!standards.hasFavicon)       penalty += 10;
  if (!standards.hasSitemapXml)    penalty += 5;
  if (!standards.hasSecurityTxt)   penalty += 5;
  if (!standards.hasLlmsTxt)       penalty += 5;

  // Pa11y WCAG accessibility penalties
  if (pa11y) {
    penalty += Math.min(pa11y.totalErrors * 8 + pa11y.totalWarnings * 2, 30);
  }

  // Mobile Responsiveness penalties
  if (mobile) {
    if (mobile.hasHorizontalOverflow) penalty += 15;
    if (mobile.hasZoomDisabled) penalty += 10;
    if (mobile.undersizedTouchTargetsCount > 0) {
      penalty += Math.min(mobile.undersizedTouchTargetsCount * 2, 10);
    }
    if (mobile.smallTextElementsCount > 0) {
      penalty += Math.min(mobile.smallTextElementsCount * 2, 8);
    }
  }

  // Data Regulation compliance penalty integration
  if (regulation) {
    const regPenalty = Math.round((100 - regulation.overallComplianceScore) * 0.25);
    penalty += regPenalty;
  }

  return clamp(100 - penalty);
}

/**
 * Generate actionable AuditIssues from Data Regulation diagnostics.
 */
export function generateRegulationIssues(regulation?: DataRegulationDiagnostics): AuditIssue[] {
  if (!regulation) return [];

  const issues: AuditIssue[] = [];

  // EU Checks
  if (!regulation.eu.hasPrivacyPolicy) {
    issues.push({
      id: 'eu-missing-privacy-policy',
      title: 'EU GDPR Violation: Missing Privacy Policy Disclosure',
      category: 'Standards',
      severity: 'critical',
      businessImpact: 'GDPR Article 13 mandates clear privacy disclosures for data processing. Missing a privacy notice creates severe regulatory compliance risk under EU law.',
      estimatedMinutes: 30,
      price: 150,
      proof: 'No valid privacy policy link found in footer/header navigation.',
    });
  }

  if (regulation.eu.hasUnconsentedTrackers && !regulation.eu.hasCmp) {
    const items = regulation.eu.detectedTrackers.map((name) => ({
      label: name,
      details: 'Third-party tracking script executed without prior user consent',
    }));
    issues.push({
      id: 'eu-unconsented-trackers',
      title: 'EU ePrivacy Non-Compliance: Third-Party Trackers Loaded Before Consent',
      category: 'Standards',
      severity: 'critical',
      businessImpact: `Active analytics/marketing scripts (${regulation.eu.detectedTrackers.join(', ')}) execute prior to explicit user consent without a Consent Management Platform (CMP).`,
      estimatedMinutes: 45,
      price: 225,
      proof: `Detected scripts: ${regulation.eu.detectedTrackers.join(', ')}`,
      items: items.length > 0 ? items : undefined,
    });
  }

  if (!regulation.eu.hasImpressumOrLegal) {
    issues.push({
      id: 'eu-missing-impressum',
      title: 'EU E-Commerce Non-Compliance: Missing Impressum / Legal Notice',
      category: 'Standards',
      severity: 'warning',
      businessImpact: 'EU Telemedia directives (§5 TMG / E-Commerce Act) require explicit legal identification and contact details for business websites.',
      estimatedMinutes: 20,
      price: 100,
      proof: 'No Impressum or Legal Notice link found in document structure.',
    });
  }

  if (regulation.eu.hasExternalFontTransfer) {
    issues.push({
      id: 'eu-external-font-transfer',
      title: 'EU Data Privacy Risk: Remote Google Fonts IP Address Transfer',
      category: 'Standards',
      severity: 'warning',
      businessImpact: 'Directly calling remote Google Fonts transfers user IP addresses to third-party US servers without consent (in violation of EU court rulings). Recommend self-hosting fonts.',
      estimatedMinutes: 20,
      price: 100,
      proof: 'External Google Fonts request detected (fonts.googleapis.com / fonts.gstatic.com).',
    });
  }

  // US Checks
  if (!regulation.us.hasDoNotSellOrShare && regulation.eu.hasUnconsentedTrackers) {
    issues.push({
      id: 'us-ccpa-missing-optout',
      title: 'US CCPA/CPRA Risk: Missing "Do Not Sell or Share My Personal Info" Opt-Out',
      category: 'Standards',
      severity: 'warning',
      businessImpact: 'California Consumer Privacy Act (CCPA/CPRA) requires an explicit "Do Not Sell or Share My Personal Info" or "Your Privacy Choices" link for sites utilizing third-party trackers.',
      estimatedMinutes: 30,
      price: 150,
      proof: 'No Do Not Sell or Privacy Choices link/modal detected.',
    });
  }

  if (!regulation.us.hasTermsOfService) {
    issues.push({
      id: 'us-missing-terms',
      title: 'US Commercial Standard: Missing Terms of Service',
      category: 'Standards',
      severity: 'info',
      businessImpact: 'Absence of binding Terms of Service leaves user agreements and legal liabilities unmanaged.',
      estimatedMinutes: 15,
      price: 75,
      proof: 'No Terms of Service link found.',
    });
  }

  return issues;
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

import type { PlatformType } from './types';

/**
 * Generate platform-tailored recommendation reasoning text.
 */
export function getRecommendationReason(
  recommendation: 'fix' | 'rebuild',
  platform?: PlatformType
): string {
  if (platform === 'wordpress') {
    return recommendation === 'rebuild'
      ? 'Your WordPress website suffers from severe speed and architecture bottlenecks. Executing a comprehensive modernization—deploying Cloudflare APO edge caching, pruning bloated page builders, and configuring Redis—will unlock sub-second speed without disrupting your content workflow.'
      : 'Your WordPress site has a solid foundation! Implementing Cloudflare edge caching, lightweight image optimization, and fine-tuning plugin assets will immediately boost your Core Web Vitals and Google rankings.';
  }

  if (platform === 'shopify') {
    return recommendation === 'rebuild'
      ? 'Your Shopify store is experiencing high mobile friction from third-party app scripts. Migrating to an Online Store 2.0 Dawn-based architecture with native Liquid sections and Cloudflare Zaraz edge tagging will drastically accelerate checkout speed and lift conversion rates.'
      : 'Your Shopify store has great potential! Pruning redundant app scripts, leveraging native Liquid image filters, and streamlining review widgets will accelerate mobile browsing and boost sales.';
  }

  if (platform === 'wix') {
    return recommendation === 'rebuild'
      ? 'Your Wix website is held back by legacy client-side JavaScript bundles. Upgrading to modern Wix Studio or transitioning to Webflow will eliminate mobile layout reflows and dramatically improve user engagement.'
      : 'A few targeted refinements to your Wix setup—optimizing font delivery, pruning widget iframes, and caching assets—will quickly improve your visitor experience.';
  }

  if (platform === 'webflow') {
    return recommendation === 'rebuild'
      ? 'Your Webflow site has great design but suffers from interaction script bloat and uncached origin requests. Implementing Cloudflare edge caching and converting heavy JS animations to CSS will deliver instant global speeds.'
      : 'Your Webflow foundation is strong! Implementing global reverse-proxy edge caching and streamlining custom code embeds will maximize performance.';
  }

  if (platform === 'squarespace') {
    return recommendation === 'rebuild'
      ? 'Your Squarespace site is constrained by legacy layout rendering. Upgrading to Squarespace 7.1 Fluid Engine or migrating to Webflow will unlock true mobile responsiveness and faster load times.'
      : 'Streamlining code injections and optimizing image assets will quickly lift your Squarespace site\'s Core Web Vitals.';
  }

  if (platform === 'magento') {
    return recommendation === 'rebuild'
      ? 'Your Magento store is bogged down by heavy RequireJS and Knockout.js frontend bloat. Modernizing with a Hyvä Theme (Tailwind + Alpine.js) and Varnish edge caching will transform your store into a sub-second sales powerhouse.'
      : 'Enabling full-page edge caching and database query optimization will resolve key bottlenecks on your Magento store.';
  }

  return recommendation === 'rebuild'
    ? 'Your current website has fundamental speed and layout bottlenecks that are frustrating visitors and costing you sales. Building a brand-new, ultra-fast website will bring you far better customer results and long-term growth.'
    : 'Your website has a great foundation! Making a few quick tune-ups to speed, mobile display, and search visibility will quickly boost your visitor experience and customer trust.';
}

/**
 * Run all category scoring functions and return the full CategoryScores object.
 */
export function computeAllScores(
  pagespeed: PageSpeedDiagnostics,
  security: SecurityHeaderDiagnostics,
  seo: SeoDiagnostics,
  standards: AccessibilityAndStandardsDiagnostics,
  observatory?: MozillaObservatoryDiagnostics,
  pa11y?: Pa11yDiagnostics,
  mobile?: MobileResponsivenessDiagnostics,
  regulation?: DataRegulationDiagnostics
): CategoryScores {
  const performance = computePerformanceScore(pagespeed);
  const securityScore = computeSecurityScore(security, observatory);
  const seoScore = computeSeoScore(seo);
  const standardsScore = computeStandardsScore(standards, pa11y, mobile, regulation);
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

