import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Compute HMAC-SHA256 signature for payload verification
 */
async function computeHmacSha256(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(payload)
  );
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Dispatch webhook payload with up to 3 retries and exponential backoff
 */
export async function dispatchWebhookWithRetry(
  targetUrl: string,
  secret: string,
  event: string,
  payloadData: any,
  maxRetries: number = 3
): Promise<{ success: boolean; attempts: number; lastStatusCode?: number; error?: string }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const bodyString = JSON.stringify({
    event,
    timestamp,
    data: payloadData,
  });

  const signature = await computeHmacSha256(secret, bodyString);

  let attempts = 0;
  let lastError: string | undefined;
  let lastStatusCode: number | undefined;

  while (attempts < maxRetries) {
    attempts++;
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Workouse-Webhook-Dispatcher/2.0',
          'X-Workouse-Event': event,
          'X-Workouse-Timestamp': timestamp.toString(),
          'X-Workouse-Signature': `sha256=${signature}`,
        },
        body: bodyString,
      });

      lastStatusCode = response.status;
      if (response.ok) {
        return { success: true, attempts, lastStatusCode };
      }

      lastError = `HTTP Status ${response.status} ${response.statusText}`;
    } catch (err: any) {
      lastError = err.message || 'Network dispatch failure';
    }

    // Wait before next retry (exponential backoff: 1s, 2s, 3s)
    if (attempts < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, attempts * 1000));
    }
  }

  return { success: false, attempts, lastStatusCode, error: lastError };
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime?.env;

    let body: { event?: string; payload?: any; targetUrl?: string; secret?: string } = {};
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { event, payload, targetUrl, secret } = body;
    if (!event || !payload) {
      return new Response(JSON.stringify({ error: 'event and payload are required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If specific target URL provided, send directly
    if (targetUrl && secret) {
      const result = await dispatchWebhookWithRetry(targetUrl, secret, event, payload, 3);
      return new Response(JSON.stringify({ success: result.success, result }), {
        status: result.success ? 200 : 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Otherwise, dispatch to all active subscriptions matching event in D1
    if (env?.DB) {
      const activeSubs = await env.DB.prepare(
        "SELECT id, url, secret, events FROM webhook_subscriptions WHERE status = 'active'"
      ).all();

      const results = [];
      if (activeSubs?.results) {
        for (const sub of activeSubs.results as any[]) {
          let eventList: string[] = [];
          try {
            eventList = JSON.parse(sub.events || '[]');
          } catch {
            eventList = [];
          }

          if (eventList.includes(event) || eventList.includes('*')) {
            const dispatchResult = await dispatchWebhookWithRetry(sub.url, sub.secret, event, payload, 3);
            results.push({ subscriptionId: sub.id, url: sub.url, dispatchResult });
          }
        }
      }

      return new Response(JSON.stringify({ success: true, dispatchedCount: results.length, results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'No active webhooks registered.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Webhook Dispatch API error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Webhook dispatch failed.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
