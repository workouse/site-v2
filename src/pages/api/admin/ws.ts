import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env;

  const urlObj = new URL(request.url);
  const token = urlObj.searchParams.get('token') || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing admin token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate admin token (simple token existence check matching requireAdminAuth logic)
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader === 'websocket' && env?.AUDIT_STATUS_DO) {
    const doId = env.AUDIT_STATUS_DO.idFromName('admin-global-telemetry');
    const stub = env.AUDIT_STATUS_DO.get(doId);
    return stub.fetch(request);
  }

  return new Response(JSON.stringify({ error: 'Expected WebSocket upgrade request' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
};
