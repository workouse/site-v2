import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime?.env;
  const auditId = params.id;

  if (!auditId) {
    return new Response('Audit ID missing', { status: 400 });
  }

  if (!env?.AUDIT_RESULTS) {
    return new Response('R2 storage bucket not configured', { status: 404 });
  }

  try {
    const url = new URL(request.url);
    const isMobile = url.searchParams.get('type') === 'mobile' || url.searchParams.get('viewport') === 'mobile';
    const key = isMobile ? `screenshots/${auditId}_mobile.jpg` : `screenshots/${auditId}.jpg`;

    let object = await env.AUDIT_RESULTS.get(key);
    // Fall back to desktop screenshot if mobile screenshot is not available
    if (!object && isMobile) {
      object = await env.AUDIT_RESULTS.get(`screenshots/${auditId}.jpg`);
    }

    if (!object) {
      return new Response('Screenshot not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Type', 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    headers.set('etag', object.httpEtag);

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('Screenshot retrieval error:', err);
    return new Response('Failed to retrieve screenshot', { status: 500 });
  }
};
