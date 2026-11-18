/**
 * Unit tests for the SiteHeader navigation helpers (src/scripts/nav.ts).
 */
import {
  isPathActive,
  panelOffsetLeft,
  PANEL_INSET_PX,
} from '../src/scripts/nav.ts';

function runTests(): void {
  console.log('--- Starting Site Navigation Unit Tests ---');
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

  console.log('Testing isPathActive...');
  assert(isPathActive('/work', '/work'), 'exact match is active');
  assert(isPathActive('/work', '/work/'), 'trailing slash on current path is ignored');
  assert(isPathActive('/blog', '/blog/some-post'), 'nested route under href is active');
  assert(!isPathActive('/work', '/workshop'), 'shared prefix without segment boundary is not active');
  assert(!isPathActive('/work', '/'), 'home path does not activate /work');
  assert(isPathActive('/', '/'), 'home href is active on home');
  assert(!isPathActive('/', '/work'), 'home href is not active on other pages');
  assert(!isPathActive('/#audit', '/'), 'hash-only destination is never current');
  assert(!isPathActive('/#audit', '/#audit'), 'hash destination stays inactive even on same path');

  console.log('Testing panelOffsetLeft...');
  assert(PANEL_INSET_PX === 24, 'panel inset matches the spec (24px)');
  assert(panelOffsetLeft(376, 0) === 352, 'Services panel lands at 352px in the 1440 frame');
  assert(panelOffsetLeft(844, 24) === 796, 'offset is relative to the header origin');
  assert(panelOffsetLeft(100, 100, 0) === 0, 'custom inset of zero aligns exactly');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    throw new Error(`${failed} navigation test(s) failed`);
  }
  console.log('🎉 Site navigation helpers verified.');
}

runTests();
