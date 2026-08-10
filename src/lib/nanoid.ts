// Workouse Audit Tool — Lightweight Crypto-Safe ID & Token Generator

const ALPHANUMERIC = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a cryptographically secure random alphanumeric ID string.
 * Default length is 10 characters.
 */
export function generateId(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let id = '';
  const alphabetLength = ALPHANUMERIC.length;
  for (let i = 0; i < length; i++) {
    id += ALPHANUMERIC[bytes[i] % alphabetLength];
  }
  return id;
}

/**
 * Generate a cryptographically secure random hex verification token.
 * Default is 32 random bytes (64 hex characters).
 */
export function generateToken(bytesCount = 32): string {
  const bytes = new Uint8Array(bytesCount);
  crypto.getRandomValues(bytes);
  let token = '';
  for (let i = 0; i < bytesCount; i++) {
    token += bytes[i].toString(16).padStart(2, '0');
  }
  return token;
}
