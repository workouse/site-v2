import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;
    const body: any = await request.json().catch(() => ({}));

    const inputEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const inputSecret = typeof body.secret === 'string' ? body.secret.trim() : '';

    if (!inputEmail || !inputSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Both Admin Email and Secret Key are required.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const expectedEmail = (env?.ADMIN_EMAIL || 'admin@workouse.com').trim().toLowerCase();
    const expectedSecret = env?.ADMIN_SECRET_KEY || 'workouse_admin_secret_dev_key_2026';

    const isEmailValid = inputEmail === expectedEmail;
    const isSecretValid = inputSecret === expectedSecret;

    if (!isEmailValid || !isSecretValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid admin credentials. Please verify your email and secret key.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: expectedSecret,
        user: {
          id: 'admin_root',
          email: expectedEmail,
          role: 'admin',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Admin Login API Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'An unexpected error occurred during authentication.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
