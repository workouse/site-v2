/**
 * Workouse Audit Tool - URL Validation & Verification Engine
 *
 * Implements strict domain syntax validation, SSRF protection (blocking private/loopback/cloud metadata IPs),
 * reserved TLD filtering, and active public DNS resolution via Cloudflare 1.1.1.1 DoH.
 */

export interface UrlValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  domainHost?: string;
  error?: string;
}

export interface UrlValidationOptions {
  checkDns?: boolean;
  dnsTimeoutMs?: number;
}

// Reserved pseudo-TLDs that cannot be publicly audited on the open internet
const RESERVED_TLDS = new Set([
  'local',
  'localhost',
  'test',
  'example',
  'invalid',
  'internal',
  'lan',
  'home',
  'arpa',
  'onion',
  'corp',
  'intranet',
]);

// Standard IPv4 octet regex
const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * Normalizes an incoming raw URL string by trimming and adding default https protocol if missing.
 */
export function normalizeUrl(rawUrl: string): string {
  let cleaned = rawUrl.trim().replace(/^['"<([{\\]+|['">)\]}\\]+$/g, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

/**
 * Checks if a given IP address belongs to private, loopback, link-local, carrier-grade NAT, or multicast ranges.
 */
export function isPrivateIp(ip: string): boolean {
  // Strip bracket notation for IPv6 if present
  const cleanIp = ip.replace(/^\[|\]$/g, '').toLowerCase();

  // Check IPv4
  const ipv4Match = cleanIp.match(IPV4_REGEX);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    if (a > 255 || b > 255 || c > 255 || d > 255) {
      return true; // Invalid IP
    }

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (Private network)
    if (a === 10) return true;

    // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (Link-local / Cloud metadata service e.g. 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 100.64.0.0/10 (Carrier-grade NAT: 100.64.0.0 - 100.127.255.255)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved / Broadcast)
    if (a >= 240) return true;

    return false;
  }

  // Check IPv6
  if (cleanIp.includes(':')) {
    // Loopback
    if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;
    // Unspecified
    if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true;
    // Link-local (fe80::/10)
    if (/^fe[89ab]/i.test(cleanIp)) return true;
    // Unique local address (fc00::/7: fc00 - fdff)
    if (/^f[cd]/i.test(cleanIp)) return true;
    // Multicast (ff00::/8)
    if (/^ff/i.test(cleanIp)) return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1 etc.)
    if (cleanIp.startsWith('::ffff:')) {
      const mappedIpv4 = cleanIp.slice(7);
      return isPrivateIp(mappedIpv4);
    }
  }

  return false;
}

/**
 * Checks if a hostname is private, loopback, or reserved pseudo-domain.
 */
export function isPrivateOrReservedHost(hostname: string): boolean {
  const clean = hostname.toLowerCase().trim().replace(/\.$/, '');

  if (clean === 'localhost') return true;

  if (isPrivateIp(clean)) return true;

  const parts = clean.split('.');
  const tld = parts[parts.length - 1];
  if (RESERVED_TLDS.has(tld)) return true;

  return false;
}

/**
 * Validates domain format syntactically.
 * Enforces valid FQDN structure (must contain at least one dot separating domain and TLD,
 * valid label characters, and a valid TLD of >= 2 letters or IDN punycode).
 */
export function isValidDomainFormat(hostname: string): { valid: boolean; error?: string } {
  const clean = hostname.toLowerCase().trim().replace(/\.$/, '');

  if (!clean) {
    return { valid: false, error: 'Hostname cannot be empty.' };
  }

  if (clean.length > 253) {
    return { valid: false, error: 'Domain name is too long (maximum 253 characters).' };
  }

  if (isPrivateOrReservedHost(clean)) {
    return {
      valid: false,
      error: 'Private, internal, or reserved network addresses cannot be audited.',
    };
  }

  const labels = clean.split('.');

  // Must have at least 2 labels (e.g. domain.com or sub.domain.co.uk)
  if (labels.length < 2) {
    return {
      valid: false,
      error: `"${hostname}" is not a valid public domain. A top-level domain is required (e.g., example.com).`,
    };
  }

  // Label validation
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label.length === 0) {
      return { valid: false, error: 'Domain name contains empty labels or consecutive dots.' };
    }
    if (label.length > 63) {
      return { valid: false, error: `Domain label "${label}" exceeds 63 characters.` };
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return { valid: false, error: `Domain label "${label}" cannot start or end with a hyphen.` };
    }
    // Allow alphanumeric characters and hyphens (or punycode xn--)
    if (!/^[a-z0-9-]+$/.test(label)) {
      return { valid: false, error: `Domain label "${label}" contains invalid characters.` };
    }
  }

  // TLD validation (last label)
  const tld = labels[labels.length - 1];
  // TLD cannot be all digits
  if (/^\d+$/.test(tld)) {
    return { valid: false, error: 'Top-level domain (TLD) cannot be purely numeric.' };
  }

  // TLD must be at least 2 characters (e.g. com, io, co, agency) or punycode (xn--)
  if (!tld.startsWith('xn--') && (!/^[a-z]{2,24}$/.test(tld))) {
    return { valid: false, error: `"${tld}" is not a valid top-level domain.` };
  }

  return { valid: true };
}

/**
 * Verifies if the domain exists and resolves in public DNS using Cloudflare 1.1.1.1 DNS-over-HTTPS.
 */
export async function resolvePublicDns(
  hostname: string,
  timeoutMs: number = 2500
): Promise<{ resolved: boolean; error?: string }> {
  const clean = hostname.toLowerCase().trim().replace(/\.$/, '');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(clean)}&type=A`;
    const res = await fetch(dohUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/dns-json',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      // In case of DoH service issues, fail-open to not block legitimate requests
      return { resolved: true };
    }

    const data: any = await res.json();

    // DNS RCODEs: 0 = NOERROR, 3 = NXDOMAIN
    if (data.Status === 3) {
      return {
        resolved: false,
        error: `Domain "${clean}" does not exist in public DNS (NXDOMAIN). Please verify the spelling and ensure the site is live.`,
      };
    }

    // Check if answers exist or if there's an A/AAAA/CNAME record
    const hasAnswers = Array.isArray(data.Answer) && data.Answer.length > 0;
    if (data.Status === 0 && !hasAnswers) {
      // Try resolving AAAA as fallback
      try {
        const aaaaRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(clean)}&type=AAAA`, {
          method: 'GET',
          headers: { Accept: 'application/dns-json' },
        });
        if (aaaaRes.ok) {
          const aaaaData: any = await aaaaRes.json();
          if (Array.isArray(aaaaData.Answer) && aaaaData.Answer.length > 0) {
            return { resolved: true };
          }
        }
      } catch {
        // Ignore fallback error
      }

      return {
        resolved: false,
        error: `Domain "${clean}" has no active DNS A/AAAA records. Please ensure your domain is configured with web hosting.`,
      };
    }

    return { resolved: true };
  } catch (err: any) {
    // If request timed out or network is offline in dev, allow syntactic validation to pass
    if (err.name === 'AbortError') {
      console.warn(`[url-validator] DNS resolution timed out for "${clean}" after ${timeoutMs}ms.`);
    } else {
      console.warn(`[url-validator] DNS resolution failed for "${clean}":`, err.message);
    }
    return { resolved: true };
  }
}

/**
 * Complete verification pipeline for an incoming audit URL.
 */
export async function validateAuditUrl(
  rawUrl: string,
  options: UrlValidationOptions = {}
): Promise<UrlValidationResult> {
  const { checkDns = true, dnsTimeoutMs = 2500 } = options;

  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { isValid: false, error: 'Please enter a website URL to audit.' };
  }

  const normalized = normalizeUrl(rawUrl);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    return { isValid: false, error: 'Please provide a valid website URL.' };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { isValid: false, error: 'Only HTTP and HTTPS URLs are supported.' };
  }

  const hostname = parsedUrl.hostname;

  // Domain syntax & SSRF validation
  const domainFormatCheck = isValidDomainFormat(hostname);
  if (!domainFormatCheck.valid) {
    return { isValid: false, error: domainFormatCheck.error };
  }

  // Active DNS reachability check
  if (checkDns) {
    const dnsResult = await resolvePublicDns(hostname, dnsTimeoutMs);
    if (!dnsResult.resolved) {
      return { isValid: false, error: dnsResult.error };
    }
  }

  let domainHost = hostname.toLowerCase();
  if (domainHost.startsWith('www.')) {
    domainHost = domainHost.slice(4);
  }

  return {
    isValid: true,
    normalizedUrl: parsedUrl.toString(),
    domainHost,
  };
}
