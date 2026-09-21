// Workouse Audit Tool — Pricing Table & Rate Engine ($35/hr)

import type { IssueCategory, IssueSeverity } from './types';

export interface PricingEntry {
  id: string;
  label: string;
  category: IssueCategory;
  severity: IssueSeverity;
  estimatedMinutes: number;
  price: number;
}

const HOURLY_RATE = 35;

function createPricingEntry(
  id: string,
  label: string,
  category: IssueCategory,
  severity: IssueSeverity,
  estimatedMinutes: number
): PricingEntry {
  const price = Math.ceil((estimatedMinutes / 60) * HOURLY_RATE);
  return { id, label, category, severity, estimatedMinutes, price };
}

export const PRICING_TABLE: Record<string, PricingEntry> = {
  'missing-title': createPricingEntry(
    'missing-title',
    'Missing Page Name in Search Engines',
    'SEO',
    'critical',
    20
  ),
  'missing-meta-description': createPricingEntry(
    'missing-meta-description',
    'Missing Search Result Summary Preview',
    'SEO',
    'warning',
    20
  ),
  'missing-h1': createPricingEntry(
    'missing-h1',
    'Missing Main Page Headline',
    'SEO',
    'warning',
    30
  ),
  'missing-canonical': createPricingEntry(
    'missing-canonical',
    'Risk of Duplicate Content Search Penalty',
    'SEO',
    'info',
    15
  ),
  'missing-og-tags': createPricingEntry(
    'missing-og-tags',
    'Unformatted Links When Shared on Social Media',
    'SEO',
    'info',
    30
  ),
  'no-ssl': createPricingEntry(
    'no-ssl',
    'Insecure Website Connection (No Automatic HTTPS)',
    'Security',
    'critical',
    45
  ),
  'missing-hsts': createPricingEntry(
    'missing-hsts',
    'Weak Secure Connection Protection',
    'Security',
    'critical',
    30
  ),
  'missing-csp': createPricingEntry(
    'missing-csp',
    'Vulnerable to Malicious Script Injections',
    'Security',
    'warning',
    90
  ),
  'missing-x-frame-options': createPricingEntry(
    'missing-x-frame-options',
    'Vulnerable to Website Impersonation & Framing',
    'Security',
    'warning',
    20
  ),
  'missing-referrer-policy': createPricingEntry(
    'missing-referrer-policy',
    'Private Visitor Data Exposed to External Sites',
    'Security',
    'info',
    15
  ),
  'poor-lcp': createPricingEntry(
    'poor-lcp',
    'Slow Overall Page Loading Speed',
    'Performance',
    'critical',
    120
  ),
  'poor-fid': createPricingEntry(
    'poor-fid',
    'Screen Freezes & Slow Touch Response',
    'Performance',
    'critical',
    90
  ),
  'poor-cls': createPricingEntry(
    'poor-cls',
    'Jumpy Page Layout & Accidental Button Clicks',
    'Performance',
    'warning',
    60
  ),
  'large-images': createPricingEntry(
    'large-images',
    'Oversized & Heavy Image Files',
    'Performance',
    'warning',
    60
  ),
  'render-blocking-js': createPricingEntry(
    'render-blocking-js',
    'Scripts Delaying What Visitors See First',
    'Performance',
    'warning',
    90
  ),
  'no-gzip': createPricingEntry(
    'no-gzip',
    'Uncompressed Page Files Slowing Down Loading',
    'Performance',
    'warning',
    30
  ),
  'no-robots-txt': createPricingEntry(
    'no-robots-txt',
    'Missing Search Engine Indexing Guidelines',
    'SEO',
    'info',
    15
  ),
  'missing-schema-org': createPricingEntry(
    'missing-schema-org',
    'Missing Star Ratings & Rich Search Snippets',
    'SEO',
    'info',
    45
  ),
  'invalid-title-length': createPricingEntry(
    'invalid-title-length',
    'Page Title Length Out of Search Display Bounds',
    'SEO',
    'warning',
    15
  ),
  'invalid-meta-description-length': createPricingEntry(
    'invalid-meta-description-length',
    'Search Result Preview Text Is Cut Off',
    'SEO',
    'warning',
    15
  ),
  'multiple-h1': createPricingEntry(
    'multiple-h1',
    'Confusing Multiple Main Page Headlines',
    'SEO',
    'warning',
    20
  ),
  'missing-og-image': createPricingEntry(
    'missing-og-image',
    'Missing Preview Picture for Social Shares',
    'SEO',
    'warning',
    20
  ),
  'missing-twitter-cards': createPricingEntry(
    'missing-twitter-cards',
    'Plain Text Social Links on X (Twitter)',
    'SEO',
    'info',
    15
  ),
  'missing-sitemap-xml': createPricingEntry(
    'missing-sitemap-xml',
    'Missing Search Engine Sitemap for Indexing',
    'SEO',
    'info',
    20
  ),
  'missing-image-alt': createPricingEntry(
    'missing-image-alt',
    'Images Missing Text Descriptions for Google & Vision',
    'SEO',
    'warning',
    30
  ),
  'missing-charset': createPricingEntry(
    'missing-charset',
    'Garbled Character Encoding Risk',
    'SEO',
    'warning',
    15
  ),
  'missing-lang': createPricingEntry(
    'missing-lang',
    'Missing Website Language Identifier',
    'SEO',
    'info',
    15
  ),
  'missing-viewport': createPricingEntry(
    'missing-viewport',
    'Not Formatted or Scaled for Mobile Phones',
    'Performance',
    'critical',
    15
  ),
  'slow-ttfb': createPricingEntry(
    'slow-ttfb',
    'Slow Initial Server Response Time',
    'Performance',
    'critical',
    120
  ),
  'legacy-stack-migration': createPricingEntry(
    'legacy-stack-migration',
    'Replace End-of-Life Core Framework Stack',
    'Performance',
    'critical',
    240
  ),
  'edge-serverless-migration': createPricingEntry(
    'edge-serverless-migration',
    'Migrate Monolithic Origin Server to Cloudflare Edge',
    'Performance',
    'warning',
    360
  ),
  'css-modernization': createPricingEntry(
    'css-modernization',
    'Upgrade Legacy Bootstrap CSS to Utility Tailwind',
    'Performance',
    'info',
    180
  ),
  'ai-agent-readiness': createPricingEntry(
    'ai-agent-readiness',
    'Implement AI Agent Readiness (`llms.txt` & JSON-LD)',
    'SEO',
    'info',
    90
  ),
  'observatory-low-grade': createPricingEntry(
    'observatory-low-grade',
    'Poor Mozilla Security Observatory Grade',
    'Security',
    'critical',
    45
  ),
  'pa11y-wcag-violations': createPricingEntry(
    'pa11y-wcag-violations',
    'WCAG 2.1 AA Accessibility Standards Violations',
    'Standards',
    'warning',
    45
  ),
  'mobile-layout-overflow': createPricingEntry(
    'mobile-layout-overflow',
    'Mobile Layout Overflow (Horizontal Scrolling)',
    'Standards',
    'warning',
    30
  ),
  'tiny-touch-targets': createPricingEntry(
    'tiny-touch-targets',
    'Undersized Mobile Touch Targets (< 44px)',
    'Standards',
    'warning',
    30
  ),
  'illegible-mobile-text': createPricingEntry(
    'illegible-mobile-text',
    'Illegible Mobile Font Sizes (< 12px)',
    'Standards',
    'warning',
    20
  ),
  'disabled-viewport-zoom': createPricingEntry(
    'disabled-viewport-zoom',
    'Mobile Pinch-to-Zoom Disabled by Viewport',
    'Standards',
    'warning',
    15
  ),
  'broken-heading-hierarchy': createPricingEntry(
    'broken-heading-hierarchy',
    'Broken Heading Outline & Skipped Levels (H1-H6)',
    'SEO',
    'warning',
    25
  ),
  'missing-semantic-landmarks': createPricingEntry(
    'missing-semantic-landmarks',
    'Missing HTML5 Semantic Page Structure (<nav>, <header>, <footer>)',
    'SEO',
    'warning',
    30
  ),
  'poor-url-structure': createPricingEntry(
    'poor-url-structure',
    'Non-Optimized URL Slug (Length, Casing, or Underscores)',
    'SEO',
    'info',
    15
  ),
  'poor-image-alt-text': createPricingEntry(
    'poor-image-alt-text',
    'Low-Quality or Redundant Image Alt Text Descriptions',
    'SEO',
    'info',
    20
  ),
  'missing-breadcrumbs-schema': createPricingEntry(
    'missing-breadcrumbs-schema',
    'Missing Breadcrumb Schema for Search Navigation Snippets',
    'SEO',
    'info',
    30
  ),
  'accidental-noindex': createPricingEntry(
    'accidental-noindex',
    'Accidental Search Engine Noindex or Crawl Blocker',
    'SEO',
    'critical',
    20
  ),
  'au-missing-privacy-policy': createPricingEntry(
    'au-missing-privacy-policy',
    'Australian Privacy Act (APPs) Missing Privacy Disclosure',
    'Standards',
    'critical',
    30
  ),
  'au-missing-terms-acl': createPricingEntry(
    'au-missing-terms-acl',
    'Australian Consumer Law (ACL) Commercial Terms Missing',
    'Standards',
    'warning',
    30
  ),
  'au-missing-abn-disclosure': createPricingEntry(
    'au-missing-abn-disclosure',
    'Missing Australian Business Number (ABN/ACN) Disclosure',
    'Standards',
    'warning',
    15
  ),
  'au-unconsented-trackers': createPricingEntry(
    'au-unconsented-trackers',
    'Australian Privacy Principles: Pre-Consent Analytics & Data Collection Risk',
    'Standards',
    'warning',
    45
  ),
  'tr-missing-kvkk-notice': createPricingEntry(
    'tr-missing-kvkk-notice',
    'KVKK (No. 6698) Mandatory Aydınlatma Metni Missing',
    'Standards',
    'critical',
    30
  ),
  'tr-missing-mersis-kunye': createPricingEntry(
    'tr-missing-mersis-kunye',
    'TTK Art. 39 / ETBİS Missing MERSİS & VKN Künye Disclosure',
    'Standards',
    'warning',
    20
  ),
  'tr-missing-ecommerce-terms': createPricingEntry(
    'tr-missing-ecommerce-terms',
    'E-Commerce Law (No. 6563) & Distance Sales Terms Missing',
    'Standards',
    'warning',
    30
  ),
  'tr-missing-cookie-policy': createPricingEntry(
    'tr-missing-cookie-policy',
    'KVKK Çerez Politikası (Cookie Policy) Notice Missing',
    'Standards',
    'warning',
    20
  ),
  'tr-unconsented-trackers': createPricingEntry(
    'tr-unconsented-trackers',
    'KVKK Data Transfer Risk: Third-Party Trackers Loaded Before Consent',
    'Standards',
    'warning',
    45
  ),
  'eu-missing-privacy-policy': createPricingEntry(
    'eu-missing-privacy-policy',
    'EU GDPR Missing Privacy Policy Disclosure',
    'Standards',
    'critical',
    30
  ),
  'eu-unconsented-trackers': createPricingEntry(
    'eu-unconsented-trackers',
    'EU ePrivacy Trackers Executed Prior to Consent',
    'Standards',
    'critical',
    45
  ),
  'eu-missing-impressum': createPricingEntry(
    'eu-missing-impressum',
    'EU E-Commerce Missing Impressum / Legal Notice',
    'Standards',
    'warning',
    20
  ),
  'eu-external-font-transfer': createPricingEntry(
    'eu-external-font-transfer',
    'EU GDPR Remote Font IP Address Transfer Risk',
    'Standards',
    'warning',
    20
  ),
  'us-ccpa-missing-optout': createPricingEntry(
    'us-ccpa-missing-optout',
    'US CCPA/CPRA Missing Opt-Out & Privacy Choices Link',
    'Standards',
    'warning',
    30
  ),
  'us-missing-terms': createPricingEntry(
    'us-missing-terms',
    'US Commercial Standards Missing Terms of Service',
    'Standards',
    'info',
    15
  ),
  'gb-missing-privacy-notice': createPricingEntry(
    'gb-missing-privacy-notice',
    'UK GDPR Missing Privacy Notice Disclosure',
    'Standards',
    'critical',
    30
  ),
  'gb-missing-company-number': createPricingEntry(
    'gb-missing-company-number',
    'UK Companies Act Missing Company Registration Number',
    'Standards',
    'warning',
    15
  ),
  'ca-missing-privacy-policy': createPricingEntry(
    'ca-missing-privacy-policy',
    'Canadian PIPEDA Missing Privacy Policy Disclosure',
    'Standards',
    'critical',
    30
  ),
  'ca-missing-terms': createPricingEntry(
    'ca-missing-terms',
    'Canadian Consumer Protection & CASL Missing Terms of Service',
    'Standards',
    'info',
    15
  ),
  'global-missing-privacy-policy': createPricingEntry(
    'global-missing-privacy-policy',
    'Missing Foundational Privacy Policy Disclosure',
    'Standards',
    'critical',
    30
  ),
  'global-missing-terms': createPricingEntry(
    'global-missing-terms',
    'Missing Foundational Terms of Service Agreement',
    'Standards',
    'info',
    15
  ),
};

/**
 * Serialize pricing table into compact JSON format for AI prompt context injection.
 */
export function getPricingTableJson(): string {
  return JSON.stringify(PRICING_TABLE);
}
