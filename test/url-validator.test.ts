/**
 * Unit tests for URL Validator and Verification Engine
 */
import {
  normalizeUrl,
  isPrivateIp,
  isPrivateOrReservedHost,
  isValidDomainFormat,
  validateAuditUrl,
} from '../src/lib/url-validator.ts';

async function runTests() {
  console.log('--- Starting URL Validator Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Normalization tests
  assert(normalizeUrl('example.com') === 'https://example.com', 'normalizeUrl adds https://');
  assert(normalizeUrl('http://example.com') === 'http://example.com', 'normalizeUrl preserves http://');
  assert(normalizeUrl('  https://test.com/path  ') === 'https://test.com/path', 'normalizeUrl trims whitespace');

  // 2. Private & SSRF IP Detection tests
  assert(isPrivateIp('127.0.0.1') === true, '127.0.0.1 is detected as private/loopback');
  assert(isPrivateIp('10.0.5.12') === true, '10.0.5.12 is detected as private');
  assert(isPrivateIp('172.16.0.1') === true, '172.16.0.1 is detected as private');
  assert(isPrivateIp('172.31.255.254') === true, '172.31.255.254 is detected as private');
  assert(isPrivateIp('192.168.1.1') === true, '192.168.1.1 is detected as private');
  assert(isPrivateIp('169.254.169.254') === true, '169.254.169.254 is detected as link-local/cloud metadata');
  assert(isPrivateIp('0.0.0.0') === true, '0.0.0.0 is detected as private');
  assert(isPrivateIp('::1') === true, '::1 (IPv6 loopback) is detected as private');
  assert(isPrivateIp('8.8.8.8') === false, '8.8.8.8 is detected as public');
  assert(isPrivateIp('1.1.1.1') === false, '1.1.1.1 is detected as public');

  // 3. Reserved host & pseudo-TLD tests
  assert(isPrivateOrReservedHost('localhost') === true, 'localhost is reserved');
  assert(isPrivateOrReservedHost('my-app.local') === true, '.local is reserved');
  assert(isPrivateOrReservedHost('service.internal') === true, '.internal is reserved');
  assert(isPrivateOrReservedHost('test.test') === true, '.test is reserved');
  assert(isPrivateOrReservedHost('example.com') === false, 'example.com is not reserved');

  // 4. Domain Format tests
  const capioCheck = isValidDomainFormat('capio');
  assert(!capioCheck.valid, 'Single word "capio" fails domain format check');

  const capioSlashCheck = isValidDomainFormat('capio');
  assert(!capioSlashCheck.valid, '"https://capio/" hostname "capio" is rejected');

  const validDomain = isValidDomainFormat('workouse.com');
  assert(validDomain.valid, '"workouse.com" is valid domain format');

  const validSubdomain = isValidDomainFormat('app.staging.example.co.uk');
  assert(validSubdomain.valid, '"app.staging.example.co.uk" is valid domain format');

  const invalidDoubleDot = isValidDomainFormat('workouse..com');
  assert(!invalidDoubleDot.valid, 'Consecutive dots "workouse..com" are rejected');

  const invalidHyphen = isValidDomainFormat('-workouse.com');
  assert(!invalidHyphen.valid, 'Leading hyphen "-workouse.com" is rejected');

  const numericTld = isValidDomainFormat('workouse.123');
  assert(!numericTld.valid, 'Numeric TLD "workouse.123" is rejected');

  // 5. Full async pipeline validateAuditUrl (without DNS for unit tests)
  const result1 = await validateAuditUrl('https://capio/', { checkDns: false });
  assert(!result1.isValid, 'validateAuditUrl rejects "https://capio/"');

  const result2 = await validateAuditUrl('capio', { checkDns: false });
  assert(!result2.isValid, 'validateAuditUrl rejects "capio"');

  const result3 = await validateAuditUrl('http://127.0.0.1:8080', { checkDns: false });
  assert(!result3.isValid, 'validateAuditUrl rejects "127.0.0.1"');

  const result4 = await validateAuditUrl('https://workouse.com/about', { checkDns: false });
  assert(result4.isValid && result4.domainHost === 'workouse.com', 'validateAuditUrl accepts "https://workouse.com/about" and extracts host');

  const result5 = await validateAuditUrl('www.google.com', { checkDns: false });
  assert(result5.isValid && result5.domainHost === 'google.com', 'validateAuditUrl strips www. into domainHost');

  // 6. Test DNS resolution for known public domain vs non-existent domain
  console.log('Testing DNS Resolution (Cloudflare 1.1.1.1 DoH)...');
  const realDomainResult = await validateAuditUrl('https://google.com', { checkDns: true });
  assert(realDomainResult.isValid, 'google.com resolves via public DNS');

  const fakeDomainResult = await validateAuditUrl('https://this-domain-definitely-does-not-exist-9988771122.com', { checkDns: true });
  assert(!fakeDomainResult.isValid, 'Non-existent domain is rejected by DNS check');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
