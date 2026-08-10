import type { APIRoute } from 'astro';
import { upsertResendContact, RESEND_SUBSCRIPTION_SEGMENT_ID } from '../../lib/resend';

export const prerender = false;

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    let body: { email?: string; siteUrl?: string } = {};

    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const email = body.email?.trim().toLowerCase();
    let siteUrl = body.siteUrl?.trim();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email parameter is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid email address.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!siteUrl) {
      try {
        const reqUrl = new URL(request.url);
        siteUrl = reqUrl.origin;
      } catch {
        siteUrl = 'https://workouse.com';
      }
    }

    const resendApiKey = env?.RESEND_API_KEY || 'mock_key_for_dev';

    await upsertResendContact({
      apiKey: resendApiKey,
      email,
      siteUrl,
      segmentId: RESEND_SUBSCRIPTION_SEGMENT_ID,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you for subscribing to Workouse campaign updates!',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Newsletter subscription API error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'An unexpected server error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
