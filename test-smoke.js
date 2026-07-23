#!/usr/bin/env node
/**
 * Smoke test for three-phone: evaluates src/three-phone.js inside a minimal
 * DOM-less sandbox and asserts that the full public API is exported on window.
 * This catches missing exports, syntax errors, and load-time crashes without a
 * browser. Run: node test-smoke.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcPath = path.join(__dirname, 'src', 'three-phone.js');
const src = fs.readFileSync(srcPath, 'utf8');

// Minimal browser-ish sandbox. The library only touches document/navigator
// inside functions (not at load), so stubs are enough to evaluate it.
const noop = () => {};
const sandbox = {
  console: { log: noop, warn: noop, error: noop, clear: noop },
  navigator: { vibrate: noop, userAgent: 'node' },
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
  Date,
  Math,
  JSON,
  Set,
  TextEncoder,
  TextDecoder,
  DataView,
  ArrayBuffer,
  Uint8Array
};
sandbox.addEventListener = noop;
sandbox.removeEventListener = noop;
sandbox.dispatchEvent = noop;
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'three-phone.js' });

// The public API three-phone promises. Grouped for readable failures.
const FEATURES = ['Gyro', 'Sensor', 'Mic', 'Sound', 'Speech', 'Vibration',
  'Torch', 'Flashlight', 'Nfc', 'Geo', 'Ble', 'Camera', 'All',
  'Permissions', 'Hardware'];
const STYLES = ['Tap', 'Button', 'Canvas', 'Banner', 'On'];

const expected = new Set([
  // Debug
  'debug', 'debugError', 'debugWarn', 'showDebug', 'hideDebug', 'toggleDebug',
  // Canvas discovery + gestures
  'setPhoneCanvas', 'lockGestures', 'unlockGestures',
  // Vibration
  'vibrate', 'stopVibration',
  // Torch
  'isTorchSupported', 'setTorch', 'torchOn', 'torchOff', 'toggleTorch', 'stopTorch',
  'setFlashlight', 'flashlightOn', 'flashlightOff', 'toggleFlashlight', 'stopFlashlight',
  // NFC
  'stopNfc', 'setNfcTagAlias', 'getNfcTagAlias', 'isNfcTag',
  // Geo
  'stopGeo', 'setGeoOptions', 'getGeoPosition', 'geoDistance', 'geoInPolygon',
  // BLE
  'isBleSupported', 'bleSetup', 'bleConnect', 'bleDisconnect', 'bleRead', 'bleWrite',
  // Camera
  'createPhoneCamera',
  // Motion thresholds + three.js helpers
  'setMoveThreshold', 'setShakeThreshold', 'getRotationQuaternion',
  'getRotationEuler', 'applyDeviceRotation', 'getTouchRaycaster', 'screenToWorld'
]);

// The full enable matrix (features x styles), minus a few combos that only some
// features expose. We check the ones every feature has: Tap/Button/Canvas/Banner/On
// exist for the core features; combos (All/Permissions/Hardware) skip a couple.
for (const feature of FEATURES) {
  for (const style of STYLES) {
    // These specific combinations are intentionally not part of the API.
    if (feature === 'All' && style === 'Button') { expected.add('enableAllButton'); continue; }
    expected.add(`enable${feature}${style}`);
  }
}
// Sound/Speech/Vibration/Torch/Nfc/Camera do have all five styles in three-phone.

const missing = [];
for (const name of expected) {
  if (typeof sandbox[name] === 'undefined') missing.push(name);
}

// Status globals should be initialized (not undefined).
const statusGlobals = ['sensorsEnabled', 'micEnabled', 'soundEnabled', 'gesturesLocked',
  'vibrationEnabled', 'speechEnabled', 'nfcEnabled', 'cameraEnabled', 'torchEnabled',
  'bleSupported', 'bleConnected', 'bleValues', 'geoEnabled', 'lastGeoPosition',
  'micLevel', 'THREE_PHONE_VERSION',
  // Motion + touch data globals
  'rotationX', 'rotationY', 'rotationZ', 'pRotationX', 'pRotationY', 'pRotationZ',
  'accelerationX', 'accelerationY', 'accelerationZ',
  'rotationRateAlpha', 'rotationRateBeta', 'rotationRateGamma', 'deviceOrientation',
  'touches', 'mouseX', 'mouseY', 'pmouseX', 'pmouseY'];
for (const name of statusGlobals) {
  if (!(name in sandbox)) missing.push('(status) ' + name);
}

// Sanity-check a couple of pure functions actually compute.
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } };
const d = sandbox.geoDistance(0, 0, 0, 1, 'km');
assert(Math.abs(d - 111.19) < 1, `geoDistance(0,0,0,1,'km') ≈ 111.19, got ${d}`);
assert(sandbox.geoInPolygon([{lat:0,lon:0},{lat:0,lon:2},{lat:2,lon:2},{lat:2,lon:0}], {lat:1,lon:1}) === true,
  'geoInPolygon should contain center point');

if (missing.length) {
  console.error('SMOKE FAIL — missing exports:\n  ' + missing.join('\n  '));
  process.exit(1);
}

if (process.exitCode) {
  console.error('SMOKE FAIL — see assertion failures above');
  process.exit(1);
}

console.log(`SMOKE PASS — ${expected.size} public globals present, pure helpers verified`);
