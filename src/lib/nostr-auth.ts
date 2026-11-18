/**
 * Workouse Audit Tool — Nostr NIP-98 HTTP Authentication & Cryptographic Engine
 *
 * Implements NIP-98 HTTP Request Authentication:
 * - Base64 event parsing & JSON validation
 * - Strict kind: 27235 verification
 * - ±60s replay protection window
 * - 'u' (URL) and 'method' tag verification
 * - Canonical NIP-01 serialization and SHA-256 ID validation
 * - Schnorr / secp256k1 signature validation via @noble/curves
 * - NIP-19 npub (bech32) encoding / decoding utilities
 */

import { schnorr } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface Nip98ValidationResult {
  isValid: boolean;
  event?: NostrEvent;
  pubkey?: string;
  npub?: string;
  error?: string;
  statusCode?: number;
}

export interface Nip98Options {
  maxTimeDeltaSeconds?: number;
  expectedUrl?: string;
  expectedMethod?: string;
  requestBody?: string | ArrayBuffer | Uint8Array;
}

const DEFAULT_MAX_TIME_DELTA_SECONDS = 60;
const NIP98_KIND = 27235;

// Bech32 Alphabet for NIP-19 encoding
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

/**
 * Convert 8-bit array to 5-bit array for Bech32 encoding
 */
function convertBits(data: Uint8Array, fromBits: number, toBits: number, pad: boolean): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  const maxAcc = (1 << (fromBits + toBits - 1)) - 1;

  for (let i = 0; i < data.length; ++i) {
    const value = data[i];
    if (value < 0 || value >> fromBits !== 0) {
      throw new Error(`Invalid value: ${value}`);
    }
    acc = ((acc << fromBits) | value) & maxAcc;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
    throw new Error('Invalid padding in convertBits');
  }

  return ret;
}

/**
 * Bech32 Polymod checksum calculator
 */
function bech32Polymod(values: number[]): number {
  let chk = 1;
  for (let p = 0; p < values.length; ++p) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[p];
    if ((top >> 0) & 1) chk ^= 0x3b6a57b2;
    if ((top >> 1) & 1) chk ^= 0x26508e6d;
    if ((top >> 2) & 1) chk ^= 0x1ea119fa;
    if ((top >> 3) & 1) chk ^= 0x3d4233dd;
    if ((top >> 4) & 1) chk ^= 0x2a1462b3;
  }
  return chk;
}

/**
 * Bech32 HRP expander
 */
function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (let p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) & 31);
  }
  return ret;
}

/**
 * Encode raw bytes with HRP prefix into Bech32 string (NIP-19)
 */
export function bech32Encode(hrp: string, data: Uint8Array): string {
  const values = convertBits(data, 8, 5, true);
  const combined = bech32HrpExpand(hrp).concat(values);
  const mod = bech32Polymod(combined.concat([0, 0, 0, 0, 0, 0])) ^ 1;
  const checksum: number[] = [];
  for (let p = 0; p < 6; ++p) {
    checksum.push((mod >> (5 * (5 - p))) & 31);
  }
  let ret = `${hrp}1`;
  for (let p = 0; p < values.length; ++p) {
    ret += BECH32_CHARSET.charAt(values[p]);
  }
  for (let p = 0; p < checksum.length; ++p) {
    ret += BECH32_CHARSET.charAt(checksum[p]);
  }
  return ret;
}

/**
 * Decode Bech32 string into HRP and Uint8Array payload
 */
export function bech32Decode(str: string): { hrp: string; data: Uint8Array } {
  const lower = str.toLowerCase();
  const pos = lower.lastIndexOf('1');
  if (pos < 1 || pos + 7 > lower.length || lower.length > 90) {
    throw new Error('Invalid bech32 string length or separator');
  }

  const hrp = lower.slice(0, pos);
  const data: number[] = [];
  for (let i = pos + 1; i < lower.length; ++i) {
    const d = BECH32_CHARSET.indexOf(lower.charAt(i));
    if (d === -1) {
      throw new Error(`Invalid bech32 character: ${lower.charAt(i)}`);
    }
    data.push(d);
  }

  if (bech32Polymod(bech32HrpExpand(hrp).concat(data)) !== 1) {
    throw new Error('Invalid bech32 checksum');
  }

  const decodedBits = convertBits(new Uint8Array(data.slice(0, -6)), 5, 8, false);
  return { hrp, data: new Uint8Array(decodedBits) };
}

/**
 * Convert 64-character hex Nostr public key to bech32 npub string (NIP-19)
 */
export function pubkeyToNpub(pubkeyHex: string): string {
  const cleanHex = pubkeyHex.trim().toLowerCase();
  if (cleanHex.length !== 64 || !/^[0-9a-f]{64}$/.test(cleanHex)) {
    throw new Error('Invalid hex pubkey format: expected 64 hex characters');
  }
  const bytes = hexToBytes(cleanHex);
  return bech32Encode('npub', bytes);
}

/**
 * Convert bech32 npub string to 64-character hex public key
 */
export function npubToPubkey(npubStr: string): string {
  const { hrp, data } = bech32Decode(npubStr.trim().toLowerCase());
  if (hrp !== 'npub' || data.length !== 32) {
    throw new Error('Invalid npub bech32 string: expected npub prefix with 32 bytes');
  }
  return bytesToHex(data);
}

/**
 * Compute canonical NIP-01 event ID hash (SHA-256 of serialized array)
 */
export function calculateEventId(event: {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}): string {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  const hashBytes = sha256(utf8ToBytes(serialized));
  return bytesToHex(hashBytes);
}

/**
 * Normalize and compare request URLs for NIP-98 matching
 */
export function matchRequestUrl(eventUrl: string, expectedUrl: string): boolean {
  try {
    const eUrl = new URL(eventUrl);
    const reqUrl = new URL(expectedUrl);

    // Host and pathname must strictly match
    if (eUrl.host.toLowerCase() !== reqUrl.host.toLowerCase()) {
      return false;
    }

    const normalizePath = (p: string) => p.replace(/\/+$/, '') || '/';
    return normalizePath(eUrl.pathname) === normalizePath(reqUrl.pathname);
  } catch {
    // If URL parsing fails, perform strict substring / trimmed comparison
    return eventUrl.trim() === expectedUrl.trim();
  }
}

/**
 * Validate incoming NIP-98 Authorization header string against expected request criteria
 */
export async function verifyNip98Header(
  authHeader: string | null,
  options: Nip98Options = {}
): Promise<Nip98ValidationResult> {
  if (!authHeader) {
    return {
      isValid: false,
      error: 'Missing Authorization header. Expected: Authorization: Nostr <base64-event>',
      statusCode: 401,
    };
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'nostr') {
    return {
      isValid: false,
      error: 'Invalid Authorization header format. Expected format: Nostr <base64-encoded-event-json>',
      statusCode: 401,
    };
  }

  const base64Payload = parts[1];
  let rawJson: string;

  try {
    // Support URL-safe base64 and standard base64
    const normalizedBase64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (normalizedBase64.length % 4)) % 4;
    const padded = normalizedBase64 + '='.repeat(padLen);
    rawJson = atob(padded);
  } catch {
    return {
      isValid: false,
      error: 'Failed to decode base64 Nostr event payload.',
      statusCode: 401,
    };
  }

  let event: NostrEvent;
  try {
    event = JSON.parse(rawJson) as NostrEvent;
  } catch {
    return {
      isValid: false,
      error: 'Nostr event payload is not valid JSON.',
      statusCode: 401,
    };
  }

  // Structural checks
  if (
    typeof event !== 'object' ||
    event === null ||
    typeof event.id !== 'string' ||
    typeof event.pubkey !== 'string' ||
    typeof event.sig !== 'string' ||
    typeof event.created_at !== 'number' ||
    typeof event.kind !== 'number' ||
    !Array.isArray(event.tags) ||
    typeof event.content !== 'string'
  ) {
    return {
      isValid: false,
      error: 'Malformed Nostr event structure. Missing mandatory NIP-01 fields.',
      statusCode: 401,
    };
  }

  // Kind check (must be 27235)
  if (event.kind !== NIP98_KIND) {
    return {
      isValid: false,
      error: `Invalid event kind: ${event.kind}. NIP-98 requires kind 27235.`,
      statusCode: 401,
    };
  }

  // Replay check: ±maxTimeDeltaSeconds
  const maxDelta = options.maxTimeDeltaSeconds ?? DEFAULT_MAX_TIME_DELTA_SECONDS;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const timeDifference = Math.abs(nowInSeconds - event.created_at);

  if (timeDifference > maxDelta) {
    return {
      isValid: false,
      error: `Event timestamp created_at (${event.created_at}) is out of acceptable time window (current: ${nowInSeconds}, delta: ${timeDifference}s > max ${maxDelta}s).`,
      statusCode: 401,
    };
  }

  // Tag extraction
  const uTag = event.tags.find((t) => t[0] === 'u')?.[1];
  const methodTag = event.tags.find((t) => t[0] === 'method')?.[1];
  const payloadTag = event.tags.find((t) => t[0] === 'payload')?.[1];

  if (!uTag) {
    return {
      isValid: false,
      error: 'Missing required ["u", "<url>"] tag in NIP-98 event.',
      statusCode: 401,
    };
  }

  if (!methodTag) {
    return {
      isValid: false,
      error: 'Missing required ["method", "<METHOD>"] tag in NIP-98 event.',
      statusCode: 401,
    };
  }

  // Method matching
  if (options.expectedMethod) {
    if (methodTag.toUpperCase() !== options.expectedMethod.toUpperCase()) {
      return {
        isValid: false,
        error: `HTTP method mismatch. Event specified '${methodTag}', request is '${options.expectedMethod}'.`,
        statusCode: 401,
      };
    }
  }

  // URL matching
  if (options.expectedUrl) {
    if (!matchRequestUrl(uTag, options.expectedUrl)) {
      return {
        isValid: false,
        error: `Request URL mismatch. Event specified '${uTag}', expected '${options.expectedUrl}'.`,
        statusCode: 401,
      };
    }
  }

  // Optional payload hash check
  if (payloadTag && options.requestBody) {
    let bodyBytes: Uint8Array;
    if (typeof options.requestBody === 'string') {
      bodyBytes = utf8ToBytes(options.requestBody);
    } else if (options.requestBody instanceof ArrayBuffer) {
      bodyBytes = new Uint8Array(options.requestBody);
    } else {
      bodyBytes = options.requestBody;
    }

    const calculatedPayloadHash = bytesToHex(sha256(bodyBytes));
    if (calculatedPayloadHash.toLowerCase() !== payloadTag.toLowerCase()) {
      return {
        isValid: false,
        error: 'Payload hash in event does not match request body SHA-256.',
        statusCode: 401,
      };
    }
  }

  // Event ID integrity check (re-calculate SHA256 of NIP-01 serialized form)
  const calculatedId = calculateEventId(event);
  if (calculatedId.toLowerCase() !== event.id.toLowerCase()) {
    return {
      isValid: false,
      error: `Event ID integrity mismatch. Calculated ${calculatedId}, received ${event.id}.`,
      statusCode: 401,
    };
  }

  // Schnorr signature verification
  try {
    const sigBytes = hexToBytes(event.sig.trim());
    const idBytes = hexToBytes(event.id.trim());
    const pubkeyBytes = hexToBytes(event.pubkey.trim());
    const isSigValid = schnorr.verify(sigBytes, idBytes, pubkeyBytes);
    if (!isSigValid) {
      return {
        isValid: false,
        error: 'Cryptographic Schnorr signature verification failed for event.',
        statusCode: 401,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      error: `Signature verification error: ${msg}`,
      statusCode: 401,
    };
  }

  // Generate bech32 npub
  let npubStr: string;
  try {
    npubStr = pubkeyToNpub(event.pubkey);
  } catch {
    npubStr = event.pubkey;
  }

  return {
    isValid: true,
    event,
    pubkey: event.pubkey.toLowerCase(),
    npub: npubStr,
  };
}

/**
 * Convenience helper to verify incoming Astro/Worker Request using NIP-98
 */
export async function verifyNip98Request(
  request: Request,
  options: Partial<Nip98Options> = {}
): Promise<Nip98ValidationResult> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  return verifyNip98Header(authHeader, {
    expectedUrl: options.expectedUrl ?? request.url,
    expectedMethod: options.expectedMethod ?? request.method,
    maxTimeDeltaSeconds: options.maxTimeDeltaSeconds,
    requestBody: options.requestBody,
  });
}
