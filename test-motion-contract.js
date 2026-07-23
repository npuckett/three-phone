#!/usr/bin/env node
/**
 * Contract tests for three-phone's pure motion math. three-phone owns motion
 * data (p5 provided it for free), so these lock the mapping and thresholds to
 * p5's semantics and the device-orientation quaternion math to three.js's
 * DeviceOrientationControls.
 *
 * Loads the real implementations by slicing them out of src/three-phone.js.
 * Run: node test-motion-contract.js
 */

const fs = require('fs');
const path = require('path');

function loadMotionMath() {
  const srcPath = path.join(__dirname, 'src', 'three-phone.js');
  const src = fs.readFileSync(srcPath, 'utf8');
  const start = src.indexOf('function _computeOrientationGlobals');
  const end = src.indexOf('function _currentScreenAngle');
  if (start === -1 || end === -1) {
    throw new Error('Could not locate motion math in src/three-phone.js');
  }
  const block = src.slice(start, end);
  const factory = new Function(
    'Math',
    block +
    '\nreturn { _computeOrientationGlobals, _shakeDelta, _moveExceeded, _orientationToQuaternion };'
  );
  return factory(Math);
}

const m = loadMotionMath();

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log('  ✓ ' + name);
  } else {
    console.error('  ✗ ' + name);
    failures++;
  }
}
function approx(a, b, eps = 1e-6) { return Math.abs(a - b) < eps; }
function quatApprox(q, exp, eps = 1e-6) {
  return approx(q.x, exp.x, eps) && approx(q.y, exp.y, eps) &&
         approx(q.z, exp.z, eps) && approx(q.w, exp.w, eps);
}

console.log('Orientation → rotation globals (rotationX=beta, rotationY=gamma, rotationZ=alpha):');
const g = m._computeOrientationGlobals(30, 45, 10);
check('beta 45 → rotationX 45', g.rotationX === 45);
check('gamma 10 → rotationY 10', g.rotationY === 10);
check('alpha 30 → rotationZ 30', g.rotationZ === 30);
const gz = m._computeOrientationGlobals(null, null, null);
check('null inputs coerce to 0', gz.rotationX === 0 && gz.rotationY === 0 && gz.rotationZ === 0);

console.log('Shake metric (|Δx| + |Δy|) vs default threshold 30:');
check('small motion below 30 → no shake', m._shakeDelta(10, 5, 2, 1) === 12);
check('|Δx|+|Δy| = 40 exceeds 30', m._shakeDelta(40, 0, 0, 0) > 30);
check('exactly 30 does NOT exceed (strict >)', !(m._shakeDelta(30, 0, 0, 0) > 30));

console.log('Move test vs default threshold 0.5:');
check('single axis 1.0 > 0.5 → moved', m._moveExceeded(1, 0, 0, 0, 0, 0, 0.5) === true);
check('all axes below 0.5 → not moved', m._moveExceeded(0.3, 0.2, 0.1, 0, 0, 0, 0.5) === false);
check('z-axis delta triggers', m._moveExceeded(0, 0, 0.6, 0, 0, 0, 0.5) === true);

console.log('Orientation → world quaternion (DeviceOrientationControls math):');
const h = Math.sqrt(0.5);
const qRest = m._orientationToQuaternion(0, 0, 0, 0);
check('flat device (0,0,0,0) → (-√0.5, 0, 0, √0.5)', quatApprox(qRest, { x: -h, y: 0, z: 0, w: h }));
const qBeta90 = m._orientationToQuaternion(0, 90, 0, 0);
check('beta 90 (0,90,0,0) → identity', quatApprox(qBeta90, { x: 0, y: 0, z: 0, w: 1 }));
const qScreen = m._orientationToQuaternion(0, 90, 0, 180);
check('beta 90 with screen 180 → (0,0,-1,0)', quatApprox(qScreen, { x: 0, y: 0, z: -1, w: 0 }));
const anyQ = m._orientationToQuaternion(37, 12, -8, 90);
check('arbitrary input stays unit-length', approx(
  Math.sqrt(anyQ.x * anyQ.x + anyQ.y * anyQ.y + anyQ.z * anyQ.z + anyQ.w * anyQ.w), 1));

if (failures) {
  console.error(`\nMOTION CONTRACT FAIL — ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nMOTION CONTRACT PASS');
