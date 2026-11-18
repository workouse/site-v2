/**
 * Unit tests for the legacy /#audit redirect decision (src/components/audit/audit-redirect.ts).
 */
import {
  getLegacyAuditRedirect,
  LEGACY_AUDIT_HASH,
} from '../src/components/audit/audit-redirect.ts';

const AUDIT_DESTINATION = '/audit';

function runTests(): void {
  console.log('--- Starting Legacy Audit Redirect Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string): void {
    if (condition) {
      passed++;
      console.log(`  ✅ ${testName}`);
    } else {
      failed++;
      console.error(`  ❌ ${testName}`);
    }
  }

  console.log('Testing getLegacyAuditRedirect...');
  assert(LEGACY_AUDIT_HASH === '#audit', 'legacy anchor is #audit');
  assert(
    getLegacyAuditRedirect('#audit', AUDIT_DESTINATION) === AUDIT_DESTINATION,
    'legacy #audit hash forwards to the destination',
  );
  assert(
    getLegacyAuditRedirect('', AUDIT_DESTINATION) === null,
    'empty hash does not forward',
  );
  assert(
    getLegacyAuditRedirect('#main', AUDIT_DESTINATION) === null,
    'unrelated anchor does not forward',
  );
  assert(
    getLegacyAuditRedirect('#audit-logs', AUDIT_DESTINATION) === null,
    'prefix match on another anchor does not forward',
  );
  assert(
    getLegacyAuditRedirect('#Audit', AUDIT_DESTINATION) === null,
    'fragment matching is case-sensitive, like element ids',
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    throw new Error(`${failed} legacy audit redirect test(s) failed`);
  }
  console.log('🎉 Legacy audit redirect helper verified.');
}

runTests();
