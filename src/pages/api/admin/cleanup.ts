import type { APIRoute } from 'astro';
import { requireAdminAuth } from '../../../lib/auth';
import { purgeExpiredAudits } from '../../../lib/cleanup-engine';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;

    const authError = await requireAdminAuth(request, env);
    if (authError) {
      return authError;
    }

    const summary = await purgeExpiredAudits(env, 30);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        message: `Purged ${summary.auditsPurged} audit(s) and ${summary.r2ObjectsPurged} R2 file(s) older than 30 days.`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Cleanup API error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Cleanup operation failed.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
