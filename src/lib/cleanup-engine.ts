/**
 * Workouse Audit Tool - Automated Cleanup & Purge Engine
 *
 * Automatically purges audits, D1 records, and R2 bucket storage artifacts
 * older than 30 days.
 */

import type { Env } from './types';

export interface PurgeSummary {
  auditsPurged: number;
  r2ObjectsPurged: number;
  cutoffTimestamp: number;
}

/**
 * Deletes all audits created before (now - maxAgeDays).
 * Default retention period: 30 days (2,592,000 seconds).
 */
export async function purgeExpiredAudits(
  env: Env | any,
  maxAgeDays: number = 30
): Promise<PurgeSummary> {
  const summary: PurgeSummary = {
    auditsPurged: 0,
    r2ObjectsPurged: 0,
    cutoffTimestamp: Math.floor(Date.now() / 1000) - maxAgeDays * 86400,
  };

  if (!env?.DB) {
    return summary;
  }

  try {
    const queryRes = await env.DB.prepare(
      'SELECT id, r2_key FROM audits WHERE created_at < ?'
    )
      .bind(summary.cutoffTimestamp)
      .all();

    const expiredAudits = queryRes as { results?: Array<{ id: string; r2_key: string | null }> };

    if (!expiredAudits || !expiredAudits.results || expiredAudits.results.length === 0) {
      return summary;
    }

    const auditIds: string[] = [];
    const r2Keys: string[] = [];

    for (const row of expiredAudits.results) {
      auditIds.push(row.id);
      if (row.r2_key) {
        r2Keys.push(row.r2_key);
      }
    }

    // 2. Delete R2 Bucket objects if R2 is bound
    if (env.AUDIT_RESULTS && r2Keys.length > 0) {
      for (const key of r2Keys) {
        try {
          await env.AUDIT_RESULTS.delete(key);
          summary.r2ObjectsPurged++;
        } catch (r2Err) {
          console.error(`Failed to delete R2 key ${key}:`, r2Err);
        }
      }
    }

    // 3. Batch delete from D1 database tables using parameter bindings
    for (const auditId of auditIds) {
      try {
        await env.DB.batch([
          env.DB.prepare('DELETE FROM raw_results WHERE audit_id = ?').bind(auditId),
          env.DB.prepare('DELETE FROM audit_results WHERE audit_id = ?').bind(auditId),
          env.DB.prepare('DELETE FROM audit_logs WHERE audit_id = ?').bind(auditId),
          env.DB.prepare('DELETE FROM audit_leads WHERE audit_id = ?').bind(auditId),
          env.DB.prepare('DELETE FROM audits WHERE id = ?').bind(auditId),
        ]);
        summary.auditsPurged++;
      } catch (dbErr) {
        console.error(`Failed to purge D1 records for audit ${auditId}:`, dbErr);
      }
    }

    console.log(
      `[CLEANUP] Purged ${summary.auditsPurged} audit(s) and ${summary.r2ObjectsPurged} R2 object(s) older than ${maxAgeDays} days (cutoff: ${summary.cutoffTimestamp}).`
    );

    return summary;
  } catch (err) {
    console.error('Error executing purgeExpiredAudits:', err);
    return summary;
  }
}

/**
 * Permanently deletes a single audit record, including its associated D1 records
 * and R2 storage objects if available.
 */
export async function deleteAuditRecord(
  env: Env | any,
  auditId: string
): Promise<{ success: boolean; error?: string }> {
  if (!auditId || typeof auditId !== 'string') {
    return { success: false, error: 'Invalid audit ID provided.' };
  }

  if (!env?.DB) {
    return { success: true };
  }

  try {
    // 1. Fetch R2 key before deleting record
    const auditRecord = (await env.DB.prepare('SELECT r2_key FROM audits WHERE id = ?')
      .bind(auditId)
      .first()) as { r2_key?: string | null } | null;

    // 2. Delete R2 file if exists
    if (auditRecord?.r2_key && env.AUDIT_RESULTS) {
      try {
        await env.AUDIT_RESULTS.delete(auditRecord.r2_key);
      } catch (r2Err) {
        console.error(`Failed to delete R2 key ${auditRecord.r2_key} for audit ${auditId}:`, r2Err);
      }
    }

    // 3. Batch delete from all D1 tables
    await env.DB.batch([
      env.DB.prepare('DELETE FROM raw_results WHERE audit_id = ?').bind(auditId),
      env.DB.prepare('DELETE FROM audit_results WHERE audit_id = ?').bind(auditId),
      env.DB.prepare('DELETE FROM audit_logs WHERE audit_id = ?').bind(auditId),
      env.DB.prepare('DELETE FROM audit_leads WHERE audit_id = ?').bind(auditId),
      env.DB.prepare('DELETE FROM audits WHERE id = ?').bind(auditId),
    ]);

    return { success: true };
  } catch (err: any) {
    console.error(`Failed to delete audit record ${auditId}:`, err);
    return { success: false, error: err.message || 'Failed to delete audit record from database.' };
  }
}

