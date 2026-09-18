// Workouse Audit Tool — Shared TypeScript Types

export type AuditStatus =
  | 'pending_verification'
  | 'queued'
  | 'running'
  | 'scoring'
  | 'enriching'
  | 'complete'
  | 'failed';

export type IssueCategory = 'Performance' | 'Security' | 'SEO' | 'Standards';
export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface Audit {
  id: string;
  url: string;
  email: string;
  status: AuditStatus;
  r2_key: string | null;
  created_at: number;
  completed_at: number | null;
}

export interface RawResults {
  audit_id: string;
  pagespeed_json: string;
  observatory_json: string;
  seo_json: string;
  fetched_at: number;
}

export interface ExecutiveBriefing {
  headline: string;
  bottlenecks: string[];
  opportunities: string[];
  roadmap: string[];
}

export interface AIOutput {
  audit_id: string;
  score: number;
  performance_score: number;
  security_score: number;
  seo_score: number;
  standards_score: number;
  issues_json: string;
  recommendation: 'fix' | 'rebuild';
  recommendation_reason: string;
  summary: string;
  story?: string;
  executiveBriefing?: ExecutiveBriefing;
  processed_at: number;
}

export interface AuditIssueItem {
  label?: string;
  url?: string;
  size?: string;
  wasted?: string;
  selector?: string;
  snippet?: string;
  details?: string;
}

export interface AuditIssue {
  id: string;
  title: string;
  category: IssueCategory;
  severity: IssueSeverity;
  businessImpact: string;
  estimatedMinutes: number;
  price: number;
  proof?: string;
  items?: AuditIssueItem[];
}

export interface TelemetryEvent {
  id: string;
  category: 'ai' | 'audit' | 'lead' | 'system' | 'error';
  action: string;
  auditId?: string;
  url?: string;
  details?: Record<string, any>;
  timestamp: number;
}

export type WSMessage =
  | { type: 'connected' }
  | { type: 'progress'; stage: string }
  | { type: 'complete'; reportUrl: string }
  | { type: 'error'; message: string }
  | { type: 'telemetry'; event: TelemetryEvent }
  | { type: 'telemetry_history'; events: TelemetryEvent[] };

export type PlatformType =
  | 'wordpress'
  | 'shopify'
  | 'wix'
  | 'webflow'
  | 'squarespace'
  | 'magento'
  | 'drupal'
  | 'joomla'
  | 'custom';

export type ExtensionCategory =
  | 'page_builder'
  | 'seo'
  | 'caching'
  | 'ecommerce'
  | 'forms'
  | 'reviews'
  | 'marketing'
  | 'security'
  | 'theme'
  | 'other';

export type ExtensionStatus = 'bloated' | 'legacy' | 'good' | 'optimal';

export interface DetectedExtension {
  name: string;
  slug: string;
  category: ExtensionCategory;
  currentStatus: ExtensionStatus;
  suggestedAlternative?: string;
  description?: string;
}

export type TechCategory =
  | 'CMS'
  | 'E-Commerce'
  | 'Frontend JS'
  | 'CSS Framework'
  | 'Backend / Server'
  | 'Protocol / Network';

export type TechStatus =
  | 'end-of-life'
  | 'deprecated'
  | 'legacy'
  | 'modern'
  | 'cutting-edge';

export interface DetectedTechItem {
  id: string;
  name: string;
  category: TechCategory;
  status: TechStatus;
  version?: string;
  detectedVia: string;
  modernReplacement?: string;
  description: string;
}

export interface DetectedTechStackResult {
  items: DetectedTechItem[];
  platform: PlatformType;
  platformVersion?: string;
  detectedExtensions: DetectedExtension[];
  techDebtScore: number; // 0 (modern) - 100 (critical legacy debt)
  hasEolOrDeprecated: boolean;
  summary: string;
}

export type ModernizationPriority = 'critical' | 'recommended' | 'future_proofing';

export interface ModernizationChecklistItem {
  id: string;
  title: string;
  category: 'Security & EOL' | 'Performance & Frontend' | 'Architecture & Serverless' | 'AI & PWA Readiness';
  priority: ModernizationPriority;
  currentTech: string;
  targetTech: string;
  whyModernize: string;
  businessImpact: string;
  estimatedMinutes: number;
  price: number;
}

export interface DistributedWebDiagnostics {
  // Search Console & Domain Verifications
  hasGoogleSiteVerification: boolean;
  googleVerificationToken?: string | null;
  hasMetaDomainVerification: boolean;
  hasBingVerification: boolean;
  hasYandexVerification: boolean;
  hasPinterestVerification: boolean;

  // Pixels & Analytics Integration
  hasMetaPixel: boolean;
  hasGoogleAnalyticsOrGtm: boolean;
  gtmOrGaId?: string | null;
  hasTikTokPixel: boolean;
  hasLinkedInInsight: boolean;

  // Decentralized & Identity Protocols
  hasNostrJson: boolean;
  hasAtprotoDid: boolean;
  atprotoDidValue?: string | null;
  hasFediverseLink: boolean;
  fediverseHandle?: string | null;
  hasMatrixServer: boolean;

  // Open Web Syndication & Discovery
  hasRssFeed: boolean;
  rssFeedUrl?: string | null;
  hasWebmention: boolean;
  hasLlmsTxt: boolean;
  hasSecurityTxt: boolean;

  // Summary Metrics
  detectedCount: number;
  totalChecked: number;
}

export interface ModernizationReport {
  techStack: DetectedTechStackResult;
  checklist: ModernizationChecklistItem[];
  overallDebtLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  targetStackRecommendation: string;
  platformContext: PlatformType;
  platformSummary?: string;
  distributedWeb?: DistributedWebDiagnostics;
}

// Env interface — typed Cloudflare bindings
export interface Env {
  DB: D1Database;
  EMAIL_TOKENS: KVNamespace;
  RATE_LIMITS: KVNamespace;
  AUDIT_RESULTS: R2Bucket;
  AUDIT_QUEUE: Queue;
  AUDIT_STATUS_DO: DurableObjectNamespace;
  AI: Ai;
  RESEND_API_KEY: string;
  PAGESPEED_API_KEY?: string;
  CF_AI_GATEWAY_TOKEN: string;
  CF_AI_GATEWAY_URL: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  MY_BROWSER?: Fetcher;
  ADMIN_EMAIL?: string;
  ADMIN_SECRET_KEY?: string;
  APP_URL?: string;
}

