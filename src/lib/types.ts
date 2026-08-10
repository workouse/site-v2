// Workouse Audit Tool — Shared TypeScript Types

export type AuditStatus =
  | 'pending_verification'
  | 'queued'
  | 'running'
  | 'ai_processing'
  | 'complete'
  | 'failed';

export type IssueCategory = 'Performance' | 'Security' | 'SEO';
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

export interface AIOutput {
  audit_id: string;
  score: number;
  issues_json: string;
  recommendation: 'fix' | 'rebuild';
  recommendation_reason: string;
  summary: string;
  processed_at: number;
}

export interface AuditIssue {
  id: string;
  title: string;
  category: IssueCategory;
  severity: IssueSeverity;
  businessImpact: string;
  estimatedMinutes: number;
  price: number;
}

export type WSMessage =
  | { type: 'connected' }
  | { type: 'progress'; stage: string }
  | { type: 'complete'; reportUrl: string }
  | { type: 'error'; message: string };

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
  ADMIN_EMAIL?: string;
  ADMIN_SECRET_KEY?: string;
  APP_URL?: string;
}

