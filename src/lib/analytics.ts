/**
 * Workouse Client-Side Google Analytics 4 (GA4) Helper
 * Measurement ID: G-NEW2M4VEX1
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    trackWorkouseEvent?: (eventName: string, params?: Record<string, any>) => void;
  }
}

/**
 * Dispatches a custom GA4 event safely across client scripts.
 * 
 * @param eventName Name of the custom or standard GA4 event
 * @param params Optional key-value payload parameters
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  } else {
    // Queue event if gtag is not yet initialized
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...params,
    });
  }
}

/**
 * Tracks an audit submission request.
 */
export function trackAuditRequested(params: { targetUrl: string; hasEmail: boolean; source?: string }): void {
  trackEvent('audit_requested', {
    target_url: params.targetUrl,
    has_email: params.hasEmail,
    source: params.source || 'hero_form',
  });
  // Backwards compatibility alias
  trackEvent('audit-requested', {
    target_url: params.targetUrl,
    has_email: params.hasEmail,
  });
}

/**
 * Tracks when a user verifies their audit email confirmation link.
 */
export function trackAuditVerified(params: { auditId: string }): void {
  trackEvent('audit_verified', {
    audit_id: params.auditId,
  });
}

/**
 * Tracks when an audit run completes processing.
 */
export function trackAuditCompleted(params: { auditId: string; score?: number; recommendation?: string }): void {
  trackEvent('audit_completed', {
    audit_id: params.auditId,
    overall_score: params.score,
    recommendation: params.recommendation,
  });
}

/**
 * Tracks user interaction / launch clicks on showcased SaaS and open-source projects.
 */
export function trackProjectClick(params: { projectName: string; projectCategory?: string; destinationUrl: string }): void {
  trackEvent('project_clicked', {
    project_name: params.projectName,
    project_category: params.projectCategory || 'General',
    destination_url: params.destinationUrl,
  });
}

// Expose on global window object for inline and component scripts
if (typeof window !== 'undefined') {
  window.trackWorkouseEvent = trackEvent;
}

