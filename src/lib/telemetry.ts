import type { Env, TelemetryEvent } from './types';

/**
 * Broadcast a structured real-time telemetry event to the global Admin Durable Object instance
 * (admin-global-telemetry).
 */
export async function sendTelemetryEvent(
  env: Env,
  eventInput: {
    category: 'ai' | 'audit' | 'lead' | 'system' | 'error';
    action: string;
    auditId?: string;
    url?: string;
    details?: Record<string, any>;
  }
): Promise<void> {
  if (!env?.AUDIT_STATUS_DO) return;

  const event: TelemetryEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    category: eventInput.category,
    action: eventInput.action,
    auditId: eventInput.auditId,
    url: eventInput.url,
    details: eventInput.details,
    timestamp: Date.now(),
  };

  try {
    const globalDoId = env.AUDIT_STATUS_DO.idFromName('admin-global-telemetry');
    const stub = env.AUDIT_STATUS_DO.get(globalDoId);

    await stub.fetch('http://do/broadcast-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    });

    // Also forward to audit-specific DO instance if auditId is provided & category is audit stage
    if (eventInput.auditId && eventInput.category === 'audit') {
      const auditDoId = env.AUDIT_STATUS_DO.idFromName(eventInput.auditId);
      const auditStub = env.AUDIT_STATUS_DO.get(auditDoId);
      await auditStub.fetch('http://do/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { type: 'progress', stage: eventInput.action } }),
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to send DO telemetry event:', err);
  }
}
