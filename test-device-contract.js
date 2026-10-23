#!/usr/bin/env node
/**
 * Contract tests for three-phone's device detection: window.isMobile /
 * window.isDesktop must be booleans set at load with the same checks as
 * p5-phone's _isMobileDevice() — mobile user agent, iPadOS (Mac user agent
 * with touch), a coarse primary pointer, or touch without any fine pointer.
 *
 * Loads src/three-phone.js into a fresh DOM-less sandbox per device profile.
 * Run: node test-device-contract.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcPath = path.join(__dirname, 'src', 'three-phone.js');
const src = fs.readFileSync(srcPath, 'utf8');

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
};

// Load the library for one device profile. `media` maps a media query to
// whether it matches; omit it to simulate a browser without matchMedia.
function load({ userAgent, maxTouchPoints = 0, media }) {
  const noop = () => {};
  let matchMediaCalls = 0;
  const sandbox = {
    console: { log: noop, warn: noop, error: noop, clear: noop },
    navigator: { vibrate: noop, userAgent, maxTouchPoints },
    document: {
      addEventListener: noop,
      querySelector: () => null,
      createElement: () => ({ style: {}, addEventListener: noop, appendChild: noop }),
      getElementById: () => null,
      readyState: 'complete',
      head: { appendChild: noop },
      body: { appendChild: noop, contains: () => false }
    },
    setTimeout: noop,
    clearTimeout: noop,
    requestAnimationFrame: noop
  };
  if (media) {
    sandbox.matchMedia = (q) => { matchMediaCalls++; return { matches: !!media[q] }; };
  }
  sandbox.addEventListener = noop;
  sandbox.removeEventListener = noop;
  sandbox.dispatchEvent = noop;
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'three-phone.js' });
  sandbox.matchMediaCalls = () => matchMediaCalls;
  return sandbox;
}

const MOUSE = { '(pointer: coarse)': false, '(any-pointer: fine)': true };
const FINGER = { '(pointer: coarse)': true, '(any-pointer: fine)': false };

const cases = [
  ['iPhone Safari', { userAgent: UA.iphone, maxTouchPoints: 5, media: FINGER }, true],
  ['Android Chrome', { userAgent: UA.android, maxTouchPoints: 5, media: FINGER }, true],
  ['iPadOS (Mac user agent + touch)', { userAgent: UA.mac, maxTouchPoints: 5, media: FINGER }, true],
  ['Android tablet in desktop mode (coarse pointer)', { userAgent: UA.linux, maxTouchPoints: 5, media: FINGER }, true],
  ['touch-only, coarse not reported, no fine pointer', { userAgent: UA.linux, maxTouchPoints: 1, media: { '(pointer: coarse)': false, '(any-pointer: fine)': false } }, true],
  ['Mac desktop Safari', { userAgent: UA.mac, maxTouchPoints: 0, media: MOUSE }, false],
  ['Windows touch laptop (fine primary pointer)', { userAgent: UA.windows, maxTouchPoints: 10, media: MOUSE }, false],
  ['no matchMedia, desktop UA', { userAgent: UA.windows }, false]
];

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log('  ✓ ' + name);
  } else {
    console.error('  ✗ ' + name);
    failures++;
  }
}

console.log('window.isMobile / window.isDesktop per device:');
for (const [name, profile, expectMobile] of cases) {
  const w = load(profile);
  check(`${name} → ${expectMobile ? 'mobile' : 'desktop'}`,
    w.isMobile === expectMobile && w.isDesktop === !expectMobile);
}

console.log('Set at load and cached:');
const w = load({ userAgent: UA.mac, maxTouchPoints: 0, media: MOUSE });
check('isMobile and isDesktop are booleans', typeof w.isMobile === 'boolean' && typeof w.isDesktop === 'boolean');
const callsAtLoad = w.matchMediaCalls();
w.navigator.userAgent = UA.iphone;
w.navigator.maxTouchPoints = 5;
check('re-running detection after load returns the cached result', w._isMobileDevice() === false);
check('cached call does not query matchMedia again', w.matchMediaCalls() === callsAtLoad);

if (failures) {
  console.error(`\nDEVICE CONTRACT FAIL — ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nDEVICE CONTRACT PASS');
