/**
 * Pure helper for the legacy /#audit redirect.
 *
 * Hash fragments never reach the server, so the forward runs in the browser.
 * Kept free of DOM and Astro imports so it can be unit-tested under
 * `node --experimental-strip-types`.
 */

export const LEGACY_AUDIT_HASH = '#audit';

/**
 * Returns the destination to forward to when the URL fragment is the legacy
 * audit anchor, or null when no forward should happen.
 */
export function getLegacyAuditRedirect(hash: string, destination: string): string | null {
  return hash === LEGACY_AUDIT_HASH ? destination : null;
}
