/**
 * Workouse Audit Tool — Nostr NIP-98 Auth & API Key Integration Test Suite
 *
 * Tests:
 * 1. Bech32 npub encoding / decoding against standard NIP-19 vectors
 * 2. NIP-98 event generation and signature verification with `/home/delirehberi/.local/bin/nak`
 * 3. Replay attack rejection (expired created_at)
 * 4. Tampered URL, HTTP method, and event ID rejection
 * 5. API key generation, SHA-256 hashing, verification, and revocation with mock D1
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  pubkeyToNpub,
  npubToPubkey,
  calculateEventId,
  verifyNip98Header,
  type NostrEvent,
} from '../src/lib/nostr-auth.ts';
import {
  generateRawApiKey,
  hashApiKey,
  createApiKey,
  verifyApiKey,
  listApiKeys,
  revokeApiKey,
} from '../src/lib/api-key-manager.ts';
import { getOrCreateApiUser, authenticateApiRequest } from '../src/lib/api-guard.ts';
import type { Env } from '../src/lib/types.ts';

// Host nak binary path as required by environment directives
const NAK_BIN = '/home/delirehberi/.local/bin/nak';
const TEST_SEC_KEY = '0000000000000000000000000000000000000000000000000000000000000001';
const EXPECTED_PUBKEY = '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
const EXPECTED_NPUB = 'npub10xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqpkge6d';

/**
 * Helper to generate a signed Nostr event using nak CLI
 */
function generateNakEvent(args: string[]): NostrEvent {
  const stdout = execFileSync(NAK_BIN, args, { encoding: 'utf-8' });
  return JSON.parse(stdout.trim()) as NostrEvent;
}

/**
 * Lightweight in-memory SQLite / D1 Mock for test execution
 */
function createMockD1(): D1Database {
  interface UserRow {
    id: string;
    pubkey: string;
    npub: string;
    tier: string;
    daily_quota: number;
    is_active: number;
    created_at: number;
    updated_at: number;
  }

  interface KeyRow {
    id: string;
    user_id: string;
    key_hash: string;
    key_prefix: string;
    name: string;
    permissions: string;
    expires_at: number | null;
    last_used_at: number | null;
    created_at: number;
  }

  const users: UserRow[] = [];
  const keys: KeyRow[] = [];

  return {
    prepare(sql: string) {
      return {
        _sql: sql,
        _params: [] as any[],
        bind(...params: any[]) {
          this._params = params;
          return this;
        },
        async first<T = unknown>(): Promise<T | null> {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('from api_users where pubkey = ?')) {
            const pub = this._params[0];
            const found = users.find((u) => u.pubkey === pub);
            return (found as unknown as T) || null;
          }
          if (s.includes('from api_keys k') && s.includes('where k.key_hash = ?')) {
            const hash = this._params[0];
            const key = keys.find((k) => k.key_hash === hash);
            if (!key) return null;
            const user = users.find((u) => u.id === key.user_id);
            if (!user) return null;
            return {
              key_id: key.id,
              user_id: key.user_id,
              key_hash: key.key_hash,
              key_prefix: key.key_prefix,
              key_name: key.name,
              permissions: key.permissions,
              expires_at: key.expires_at,
              last_used_at: key.last_used_at,
              key_created_at: key.created_at,
              u_id: user.id,
              pubkey: user.pubkey,
              npub: user.npub,
              tier: user.tier,
              daily_quota: user.daily_quota,
              is_active: user.is_active,
              user_created_at: user.created_at,
              user_updated_at: user.updated_at,
            } as unknown as T;
          }
          return null;
        },
        async all<T = unknown>(): Promise<D1Result<T>> {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.includes('from api_keys') && s.includes('where user_id = ?')) {
            const uid = this._params[0];
            const filtered = keys.filter((k) => k.user_id === uid);
            return { results: filtered as unknown as T[], success: true, meta: {} as any };
          }
          return { results: [], success: true, meta: {} as any };
        },
        async run(): Promise<D1Response> {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');
          if (s.startsWith('insert into api_users')) {
            users.push({
              id: this._params[0],
              pubkey: this._params[1],
              npub: this._params[2],
              tier: this._params[3],
              daily_quota: this._params[4],
              is_active: this._params[5],
              created_at: this._params[6],
              updated_at: this._params[7],
            });
            return { success: true, meta: { changes: 1 } as any };
          }
          if (s.startsWith('insert into api_keys')) {
            keys.push({
              id: this._params[0],
              user_id: this._params[1],
              key_hash: this._params[2],
              key_prefix: this._params[3],
              name: this._params[4],
              permissions: this._params[5],
              expires_at: this._params[6],
              last_used_at: this._params[7],
              created_at: this._params[8],
            });
            return { success: true, meta: { changes: 1 } as any };
          }
          if (s.startsWith('delete from api_keys')) {
            const uid = this._params[0];
            const target = this._params[1];
            const initLen = keys.length;
            const remain = keys.filter((k) => !(k.user_id === uid && (k.id === target || k.key_prefix === target)));
            keys.length = 0;
            keys.push(...remain);
            const changes = initLen - keys.length;
            return { success: true, meta: { changes } as any };
          }
          if (s.startsWith('update api_keys set last_used_at')) {
            const ts = this._params[0];
            const kid = this._params[1];
            const k = keys.find((item) => item.id === kid);
            if (k) k.last_used_at = ts;
            return { success: true, meta: { changes: 1 } as any };
          }
          return { success: true, meta: { changes: 0 } as any };
        },
      } as any;
    },
    batch: async () => [],
    exec: async () => ({} as any),
    dump: async () => new ArrayBuffer(0),
  } as unknown as D1Database;
}

async function runTests() {
  console.log('🧪 Starting Phase 1: Nostr-Native Authentication Test Suite...\n');

  // 1. Bech32 npub conversions
  console.log('  Testing Bech32 npub conversions (NIP-19)...');
  const encodedNpub = pubkeyToNpub(EXPECTED_PUBKEY);
  assert.equal(encodedNpub, EXPECTED_NPUB, 'npub encoding must match test vector');

  const decodedPubkey = npubToPubkey(EXPECTED_NPUB);
  assert.equal(decodedPubkey, EXPECTED_PUBKEY, 'npub decoding must restore original pubkey');
  console.log('  ✅ Bech32 npub conversions verified.');

  // 2. NIP-98 Generation with host nak CLI & Verification
  console.log('  Testing NIP-98 signature verification generated via nak...');
  const testUrl = 'https://workouse.com/api/v1/auth/token';
  const testMethod = 'POST';

  const nakEvent = generateNakEvent([
    'event',
    '-k',
    '27235',
    '-t',
    `u=${testUrl}`,
    '-t',
    `method=${testMethod}`,
    '--sec',
    TEST_SEC_KEY,
  ]);

  assert.equal(nakEvent.kind, 27235);
  assert.equal(nakEvent.pubkey, EXPECTED_PUBKEY);

  const base64Event = Buffer.from(JSON.stringify(nakEvent)).toString('base64');
  const authHeader = `Nostr ${base64Event}`;

  const validResult = await verifyNip98Header(authHeader, {
    expectedUrl: testUrl,
    expectedMethod: testMethod,
  });

  assert.equal(validResult.isValid, true, `Verification should pass: ${validResult.error}`);
  assert.equal(validResult.pubkey, EXPECTED_PUBKEY);
  assert.equal(validResult.npub, EXPECTED_NPUB);
  console.log('  ✅ Valid NIP-98 signature verified successfully.');

  // 3. Replay Protection: Expired timestamp
  console.log('  Testing Replay Protection (timestamp freshness)...');
  const oldTimestamp = Math.floor(Date.now() / 1000) - 300; // 5 minutes ago
  const expiredEvent = generateNakEvent([
    'event',
    '-k',
    '27235',
    '-t',
    `u=${testUrl}`,
    '-t',
    `method=${testMethod}`,
    '--created-at',
    String(oldTimestamp),
    '--sec',
    TEST_SEC_KEY,
  ]);

  const expiredHeader = `Nostr ${Buffer.from(JSON.stringify(expiredEvent)).toString('base64')}`;
  const expiredResult = await verifyNip98Header(expiredHeader, {
    expectedUrl: testUrl,
    expectedMethod: testMethod,
  });

  assert.equal(expiredResult.isValid, false, 'Expired event must be rejected');
  assert.match(expiredResult.error || '', /out of acceptable time window/i);
  console.log('  ✅ Replay attack correctly rejected.');

  // 4. Tampered Method / URL check
  console.log('  Testing HTTP Method & URL mismatch rejection...');
  const methodMismatch = await verifyNip98Header(authHeader, {
    expectedUrl: testUrl,
    expectedMethod: 'GET', // Event was POST
  });
  assert.equal(methodMismatch.isValid, false);
  assert.match(methodMismatch.error || '', /method mismatch/i);

  const urlMismatch = await verifyNip98Header(authHeader, {
    expectedUrl: 'https://evil.com/api/v1/auth/token',
    expectedMethod: 'POST',
  });
  assert.equal(urlMismatch.isValid, false);
  assert.match(urlMismatch.error || '', /URL mismatch/i);
  console.log('  ✅ Tampered method and URL correctly rejected.');

  // 5. Tampered Signature / Payload ID integrity
  console.log('  Testing Event ID and signature tampering rejection...');
  const tamperedEvent = { ...nakEvent, content: 'tampered-payload' };
  const tamperedHeader = `Nostr ${Buffer.from(JSON.stringify(tamperedEvent)).toString('base64')}`;
  const tamperedResult = await verifyNip98Header(tamperedHeader, {
    expectedUrl: testUrl,
    expectedMethod: testMethod,
  });
  assert.equal(tamperedResult.isValid, false);
  console.log('  ✅ Tampered event correctly rejected.');

  // 6. API Key Manager Tests
  console.log('  Testing API Key Lifecycle (generation, hashing, verification, revocation)...');
  const mockDb = createMockD1();

  // Create JIT Nostr user
  const user = await getOrCreateApiUser(mockDb, EXPECTED_PUBKEY);
  assert.equal(user.pubkey, EXPECTED_PUBKEY);
  assert.equal(user.tier, 'free');
  assert.equal(user.daily_quota, 50);

  // Issue new API Key
  const issuedKey = await createApiKey(mockDb, {
    userId: user.id,
    name: 'Test Agent Key',
    permissions: ['audit:read', 'audit:write'],
    expiresInDays: 30,
  });

  assert.match(issuedKey.rawKey, /^wk_live_[0-9a-f]{48}$/);
  assert.equal(issuedKey.keyPrefix, issuedKey.rawKey.slice(0, 16));
  assert.equal(issuedKey.name, 'Test Agent Key');

  // Verify Bearer Key
  const verified = await verifyApiKey(mockDb, issuedKey.rawKey);
  assert.equal(verified.isValid, true);
  assert.equal(verified.user?.id, user.id);
  assert.equal(verified.key?.name, 'Test Agent Key');

  // List Keys
  const userKeys = await listApiKeys(mockDb, user.id);
  assert.equal(userKeys.length, 1);
  assert.equal(userKeys[0].key_prefix, issuedKey.keyPrefix);

  // Revoke Key
  const revoked = await revokeApiKey(mockDb, user.id, issuedKey.keyId);
  assert.equal(revoked, true);

  const verifyRevoked = await verifyApiKey(mockDb, issuedKey.rawKey);
  assert.equal(verifyRevoked.isValid, false);
  console.log('  ✅ API Key lifecycle verified.');

  // 7. Full Request Guard Authentication Test
  console.log('  Testing Unified API Access Guard with Request objects...');
  const dummyEnv: Env = {
    DB: mockDb,
  } as unknown as Env;

  // Dual auth test with fresh NIP-98 request
  const freshNakEvent = generateNakEvent([
    'event',
    '-k',
    '27235',
    '-t',
    `u=${testUrl}`,
    '-t',
    `method=${testMethod}`,
    '--sec',
    TEST_SEC_KEY,
  ]);

  const reqNip98 = new Request(testUrl, {
    method: 'POST',
    headers: {
      Authorization: `Nostr ${Buffer.from(JSON.stringify(freshNakEvent)).toString('base64')}`,
    },
  });

  const nip98Auth = await authenticateApiRequest(reqNip98, dummyEnv);
  assert.equal(nip98Auth.authorized, true);
  assert.equal(nip98Auth.context?.authType, 'nip98');
  assert.equal(nip98Auth.context?.user.pubkey, EXPECTED_PUBKEY);

  // New API key for request test
  const reqKey = await createApiKey(mockDb, { userId: user.id, name: 'Live Key' });
  const reqBearer = new Request(testUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${reqKey.rawKey}`,
    },
  });

  const bearerAuth = await authenticateApiRequest(reqBearer, dummyEnv);
  assert.equal(bearerAuth.authorized, true);
  assert.equal(bearerAuth.context?.authType, 'api_key');
  assert.equal(bearerAuth.context?.user.id, user.id);
  console.log('  ✅ Unified Request Guard verified.');

  console.log('\n🎉 ALL Phase 1 Nostr-Native Authentication tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
