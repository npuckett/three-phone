#!/usr/bin/env node
/**
 * Contract tests for three-phone's WebXR helpers. WebXR is a browser-only,
 * device-gated API, so these lock the parts that must behave sanely with NO
 * WebXR present: the pure/guarded functions return safe values instead of
 * throwing, and the 'ar' permission token normalizes without warning.
 *
 * Evaluates the whole of src/three-phone.js in a smoke-style DOM-less sandbox
 * (navigator.xr deliberately absent). Run: node test-xr-contract.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcPath = path.join(__dirname, 'src', 'three-phone.js');
const src = fs.readFileSync(srcPath, 'utf8');

// Capture warnings so we can assert the 'ar' token does NOT warn.
const warnLog = [];
const noop = () => {};
const sandbox = {
  console: { log: noop, warn: (...a) => warnLog.push(a.join(' ')), error: noop, clear: noop },
  navigator: { vibrate: noop, userAgent: 'node' }, // no `xr` — WebXR unavailable
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
  requestAnimationFrame: noop,
  Date, Math, JSON, Set, Promise, Object,
  TextEncoder, TextDecoder, DataView, ArrayBuffer, Uint8Array
};
sandbox.addEventListener = noop;
sandbox.removeEventListener = noop;
sandbox.dispatchEvent = noop;
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'three-phone.js' });

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log('  ✓ ' + name);
  } else {
    console.error('  ✗ ' + name);
    failures++;
  }
}

console.log('WebXR helpers degrade safely with no navigator.xr:');

// getXRHitPose(null) → null (no frame).
check('getXRHitPose(null) returns null', sandbox.getXRHitPose(null) === null);

// endXR() with no active session is a safe no-op (must not throw).
let endThrew = false;
try { sandbox.endXR(); } catch (e) { endThrew = true; }
check('endXR() is a safe no-op without a session', endThrew === false);

// isXRSupported() resolves false (never rejects) when navigator.xr is absent.
const supportedPromise = sandbox.isXRSupported();
check('isXRSupported() returns a Promise', supportedPromise && typeof supportedPromise.then === 'function');

console.log("'ar' permission token normalizes without an 'Unknown permission type' warning:");

// enablePermissionsTap(['ar']) must not emit the unknown-permission warning.
warnLog.length = 0;
sandbox.enablePermissionsTap(['ar']);
const arWarned = warnLog.some((w) => /Unknown permission type/.test(w));
check("enablePermissionsTap(['ar']) does not warn 'Unknown permission type'", arWarned === false);

supportedPromise.then((ok) => {
  check('isXRSupported() resolves false when navigator.xr is absent', ok === false);
  check('window.xrSupported cached false after the check', sandbox.xrSupported === false);

  if (failures) {
    console.error(`\nXR CONTRACT FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nXR CONTRACT PASS');
}).catch((err) => {
  console.error('XR CONTRACT FAIL — isXRSupported() rejected:', err);
  process.exit(1);
});
