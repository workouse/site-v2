/**
 * Workouse Audit Tool - RBAC & Bearer Token Authentication Security Engine
 *
 * Implements Role-Based Access Control (RBAC) enforcing Bearer token authentication
 * for protected Admin endpoints (/api/admin/*).
 */

export interface AuthUser {
  id: string;
  role: 'admin' | 'operator';
  email?: string;
}

export interface AuthResult {
  authorized: boolean;
  user?: AuthUser;
  error?: string;
  status?: number;
}

/**
 * Verify incoming HTTP Authorization header against expected Bearer token and role claims.
 */
export async function verifyRBAC(
  request: Request,
  env: any,
  requiredRole: 'admin' | 'operator' = 'admin'
): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  
  if (!authHeader) {
    return {
      authorized: false,
      error: 'Missing Authorization header. Standard Bearer token required.',
      status: 401,
    };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      authorized: false,
      error: 'Invalid Authorization header format. Expected format: Bearer <token>',
      status: 401,
    };
  }

  const token = parts[1].trim();
  const configuredSecret = env?.ADMIN_SECRET_KEY || 'workouse_admin_secret_dev_key_2026';

  // Support direct secret token match or JWT payload check
  if (token === configuredSecret) {
    return {
      authorized: true,
      user: {
        id: 'admin_root',
        role: 'admin',
        email: env?.ADMIN_EMAIL || 'admin@workouse.com',
      },
    };
  }

  // Basic JWT structure check if token is signed JWT (3 parts separated by dots)
  if (token.split('.').length === 3) {
    try {
      const isValidSignature = await verifyJwtSignature(token, configuredSecret);
      if (!isValidSignature) {
        return {
          authorized: false,
          error: 'Invalid JWT token cryptographic signature.',
          status: 401,
        };
      }

      const payloadBase64 = token.split('.')[1];
      const normalizedBase64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = JSON.parse(atob(normalizedBase64));
      
      const userRole = payloadJson.role || 'operator';
      
      if (requiredRole === 'admin' && userRole !== 'admin') {
        return {
          authorized: false,
          error: 'Insufficient permissions. Admin role required.',
          status: 403,
        };
      }

      return {
        authorized: true,
        user: {
          id: payloadJson.sub || 'user_admin',
          role: userRole,
          email: payloadJson.email,
        },
      };
    } catch {
      return {
        authorized: false,
        error: 'Invalid or corrupted Bearer JWT token structure.',
        status: 401,
      };
    }
  }

  return {
    authorized: false,
    error: 'Invalid Bearer token credentials.',
    status: 401,
  };
}

/**
 * Helper to verify JWT HMAC-SHA256 signature using Web Crypto API.
 */
async function verifyJwtSignature(token: string, secret: string): Promise<boolean> {
  try {
    const jwtParts = token.split('.');
    if (jwtParts.length !== 3) return false;
    const [headerB64, payloadB64, signatureB64] = jwtParts;
    const data = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const base64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    const binarySig = atob(padded);
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    return await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      sigBytes,
      encoder.encode(data)
    );
  } catch {
    return false;
  }
}

/**
 * Convenience middleware function for Astro API routes to enforce admin RBAC guard.
 * Returns Response if unauthorized, or null if authorization succeeds.
 */
export async function requireAdminAuth(request: Request, env: any): Promise<Response | null> {
  const auth = await verifyRBAC(request, env, 'admin');
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({
        error: auth.error || 'Unauthorized access.',
        code: auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
      }),
      {
        status: auth.status || 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer realm="Workouse Admin Portal"',
        },
      }
    );
  }
  return null;
}
