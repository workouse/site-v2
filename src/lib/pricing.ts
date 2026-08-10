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
  const price = Math.round((estimatedMinutes / 60) * HOURLY_RATE * 100) / 100;
  return { id, label, category, severity, estimatedMinutes, price };
}

export const PRICING_TABLE: Record<string, PricingEntry> = {
  'missing-title': createPricingEntry(
    'missing-title',
    'Missing or Empty Page Title',
    'SEO',
    'critical',
    20
  ),
  'missing-meta-description': createPricingEntry(
    'missing-meta-description',
    'Missing Meta Description',
    'SEO',
    'warning',
    20
  ),
  'missing-h1': createPricingEntry(
    'missing-h1',
    'Missing or Invalid H1 Heading Structure',
    'SEO',
    'warning',
    30
  ),
  'missing-canonical': createPricingEntry(
    'missing-canonical',
    'Missing Canonical Tag',
    'SEO',
    'info',
    15
  ),
  'missing-og-tags': createPricingEntry(
    'missing-og-tags',
    'Missing Open Graph Meta Tags',
    'SEO',
    'info',
    30
  ),
  'no-ssl': createPricingEntry(
    'no-ssl',
    'HTTP Without Automatic HTTPS Redirect',
    'Security',
    'critical',
    45
  ),
  'missing-hsts': createPricingEntry(
    'missing-hsts',
    'Missing HTTP Strict Transport Security (HSTS)',
    'Security',
    'critical',
    30
  ),
  'missing-csp': createPricingEntry(
    'missing-csp',
    'Missing Content-Security-Policy (CSP)',
    'Security',
    'warning',
    90
  ),
  'missing-x-frame-options': createPricingEntry(
    'missing-x-frame-options',
    'Clickjacking Vulnerability (Missing X-Frame-Options)',
    'Security',
    'warning',
    20
  ),
  'missing-referrer-policy': createPricingEntry(
    'missing-referrer-policy',
    'Missing Referrer-Policy Header',
    'Security',
    'info',
    15
  ),
  'poor-lcp': createPricingEntry(
    'poor-lcp',
    'Poor Largest Contentful Paint (LCP > 4.0s)',
    'Performance',
    'critical',
    120
  ),
  'poor-fid': createPricingEntry(
    'poor-fid',
    'High Total Blocking Time / Input Delay',
    'Performance',
    'critical',
    90
  ),
  'poor-cls': createPricingEntry(
    'poor-cls',
    'Poor Cumulative Layout Shift (CLS > 0.25)',
    'Performance',
    'warning',
    60
  ),
  'large-images': createPricingEntry(
    'large-images',
    'Unoptimized or Oversized Images',
    'Performance',
    'warning',
    60
  ),
  'render-blocking-js': createPricingEntry(
    'render-blocking-js',
    'Render-Blocking JavaScript Resources',
    'Performance',
    'warning',
    90
  ),
  'no-gzip': createPricingEntry(
    'no-gzip',
    'Disabled Gzip/Brotli Compression',
    'Performance',
    'warning',
    30
  ),
  'no-robots-txt': createPricingEntry(
    'no-robots-txt',
    'Missing robots.txt File',
    'SEO',
    'info',
    15
  ),
  'missing-schema-org': createPricingEntry(
    'missing-schema-org',
    'Missing Structured Data (Schema.org / JSON-LD)',
    'SEO',
    'info',
    45
  ),
  'invalid-title-length': createPricingEntry(
    'invalid-title-length',
    'Suboptimal Page Title Length (10-60 chars expected)',
    'SEO',
    'warning',
    15
  ),
  'invalid-meta-description-length': createPricingEntry(
    'invalid-meta-description-length',
    'Suboptimal Meta Description Length (50-160 chars expected)',
    'SEO',
    'warning',
    15
  ),
  'multiple-h1': createPricingEntry(
    'multiple-h1',
    'Multiple H1 Headings Detected (Only 1 recommended)',
    'SEO',
    'warning',
    20
  ),
  'missing-og-image': createPricingEntry(
    'missing-og-image',
    'Missing Open Graph Image Tag (og:image)',
    'SEO',
    'warning',
    20
  ),
  'missing-twitter-cards': createPricingEntry(
    'missing-twitter-cards',
    'Missing Twitter Card Meta Tags',
    'SEO',
    'info',
    15
  ),
  'missing-sitemap-xml': createPricingEntry(
    'missing-sitemap-xml',
    'Missing XML Sitemap (sitemap.xml)',
    'SEO',
    'info',
    20
  ),
  'missing-image-alt': createPricingEntry(
    'missing-image-alt',
    'Images Missing Alt Attributes',
    'SEO',
    'warning',
    30
  ),
  'missing-charset': createPricingEntry(
    'missing-charset',
    'Missing Meta Charset Tag',
    'SEO',
    'warning',
    15
  ),
  'missing-lang': createPricingEntry(
    'missing-lang',
    'Missing HTML Lang Attribute',
    'SEO',
    'info',
    15
  ),
  'missing-viewport': createPricingEntry(
    'missing-viewport',
    'Missing Viewport Meta Tag',
    'Performance',
    'critical',
    15
  ),
  'slow-ttfb': createPricingEntry(
    'slow-ttfb',
    'Slow Initial Server Response Time (TTFB > 600ms)',
    'Performance',
    'critical',
    120
  ),
};

/**
 * Serialize pricing table into compact JSON format for AI prompt context injection.
 */
export function getPricingTableJson(): string {
  return JSON.stringify(PRICING_TABLE);
}
