/**
 * Unit tests for the Atmosphere pointer-parallax math.
 */
import {
  computePointerOffset,
  toPx,
  POINTER_MAX_X_PX,
  POINTER_MAX_Y_PX,
} from '../src/scripts/atmosphere.ts';

const BOUNDS = { left: 100, top: 50, width: 1440, height: 660 };
const CENTER_X = BOUNDS.left + BOUNDS.width / 2;
const CENTER_Y = BOUNDS.top + BOUNDS.height / 2;

function runTests(): void {
  console.log('--- Starting Atmosphere Unit Tests ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string): void {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const center = computePointerOffset(CENTER_X, CENTER_Y, BOUNDS);
  assert(center.x === 0 && center.y === 0, 'centre of the hero maps to no offset');

  const bottomRight = computePointerOffset(BOUNDS.left + BOUNDS.width, BOUNDS.top + BOUNDS.height, BOUNDS);
  assert(
    bottomRight.x === POINTER_MAX_X_PX && bottomRight.y === POINTER_MAX_Y_PX,
    'bottom-right corner maps to +max offset',
  );

  const topLeft = computePointerOffset(BOUNDS.left, BOUNDS.top, BOUNDS);
  assert(
    topLeft.x === -POINTER_MAX_X_PX && topLeft.y === -POINTER_MAX_Y_PX,
    'top-left corner maps to -max offset',
  );

  const halfway = computePointerOffset(CENTER_X + BOUNDS.width / 4, CENTER_Y - BOUNDS.height / 4, BOUNDS);
  assert(
    halfway.x === POINTER_MAX_X_PX / 2 && halfway.y === -POINTER_MAX_Y_PX / 2,
    'offset is linear between centre and edge',
  );

  const outside = computePointerOffset(-10_000, 10_000, BOUNDS);
  assert(
    outside.x === -POINTER_MAX_X_PX && outside.y === POINTER_MAX_Y_PX,
    'positions outside the hero are clamped to the design limits',
  );

  const empty = computePointerOffset(10, 10, { left: 0, top: 0, width: 0, height: 0 });
  assert(empty.x === 0 && empty.y === 0, 'zero-size bounds yield no offset');

  const nonFinite = computePointerOffset(Number.NaN, Number.POSITIVE_INFINITY, BOUNDS);
  assert(
    nonFinite.x === 0 && nonFinite.y === POINTER_MAX_Y_PX,
    'NaN collapses to centre and infinity clamps to the limit',
  );

  const custom = computePointerOffset(BOUNDS.left + BOUNDS.width, CENTER_Y, BOUNDS, 3, 2);
  assert(custom.x === 3 && custom.y === 0, 'custom maxima are respected');

  assert(toPx(0) === '0px', 'toPx formats zero');
  assert(toPx(-0) === '0px', 'toPx avoids negative zero');
  assert(toPx(1.23456) === '1.23px', 'toPx rounds to two decimals');
  assert(toPx(-5.999) === '-6px', 'toPx rounds negative values');

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

runTests();
