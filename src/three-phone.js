/*!
 * three-phone.js
 * Simplified mobile hardware access for three.js.
 * Companion library to p5-phone (https://github.com/npuckett/p5-phone).
 *
 * Load this file as a classic <script> BEFORE your three.js import-map module.
 * All public functions are attached to `window` (enableGyroTap, rotationX, ...),
 * matching p5-phone's API surface as closely as the platform allows.
 *
 * @license MIT
 */
(function () {
  'use strict';

  var THREE_PHONE_VERSION = '0.1.0';

  // The full implementation is assembled across the initial build commits.
  // This shell exists so the package builds, lints, and publishes cleanly
  // from the very first commit.
  window.THREE_PHONE_VERSION = THREE_PHONE_VERSION;

  if (typeof console !== 'undefined' && console.log) {
    console.log('three-phone ' + THREE_PHONE_VERSION + ' loaded');
  }
})();
