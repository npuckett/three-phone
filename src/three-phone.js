/*!
 * three-phone v0.1.0
 * Simplified mobile hardware access for three.js - handle motion sensors,
 * microphone, touch, camera, and browser gestures with ease.
 * Companion to p5-phone (https://github.com/npuckett/p5-phone).
 * https://github.com/npuckett/three-phone
 *
 * Copyright (c) 2025 Nick Puckett
 * Released under the MIT License
 * https://opensource.org/licenses/MIT
 *
 * Load this file as a classic <script> BEFORE your three.js import-map module.
 * All public functions are attached to `window` (enableGyroTap, rotationX, ...),
 * mirroring p5-phone's API surface as closely as the platform allows. `THREE`
 * is only touched when the three.js helpers are called, so the permission /
 * sensor / hardware features work with or without three.js present.
 */

// =============================================
// THREE-PHONE - Mobile Hardware Access for three.js
// =============================================

// Set up global error handling immediately when script loads
(function() {
  // Store original console methods before any overrides
  window._originalConsoleError = console.error;
  window._originalConsoleWarn = console.warn;

  // Only set up once
  if (window._debugErrorHandlersSet) return;
  window._debugErrorHandlersSet = true;

  // Initialize early error storage
  window._earlyErrors = window._earlyErrors || [];

  // Global error handler for JavaScript errors
  window.addEventListener('error', function(event) {
    const errorMsg = event.error?.message || event.message || 'Unknown error';
    const fileName = event.filename ? event.filename.split('/').pop() : 'unknown file';
    const line = event.lineno || 'unknown line';

    const fullError = `${errorMsg} (${fileName}:${line})`;

    console.error('🚨 Error caught:', fullError);
    if (event.error?.stack) {
      console.error('Stack:', event.error.stack);
    }

    // Store error for debug panel
    window._earlyErrors.push({
      type: 'error',
      message: 'JavaScript Error: ' + fullError,
      stack: event.error?.stack
    });

    // Auto-show debug panel when an error occurs (if SHOW_DEBUG is true)
    if (window.SHOW_DEBUG !== false && !window._debugVisible) {
      if (typeof showDebug === 'function') {
        showDebug();
      }
    }

    // If debug panel is already visible, show immediately
    if (window._debugVisible && typeof debugError === 'function') {
      debugError('JavaScript Error:', fullError);
      if (event.error?.stack) {
        debugError('Stack trace:', event.error.stack);
      }
    }
  });

  // Global handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const errorMsg = event.reason?.message || event.reason || 'Unknown promise rejection';

    console.error('🚨 Promise rejection caught:', errorMsg);

    window._earlyErrors.push({
      type: 'error',
      message: 'Unhandled Promise Rejection: ' + errorMsg
    });

    if (window._debugVisible && typeof debugError === 'function') {
      debugError('Unhandled Promise Rejection:', errorMsg);
    }
  });
})();

// Global state flags
window.sensorsEnabled = false;
window.micEnabled = false;
window.soundEnabled = false;
window.gesturesLocked = false;
window.vibrationEnabled = false;
window.speechEnabled = false;
window.nfcEnabled = false;
window.cameraEnabled = false;
window.torchEnabled = false;
window.torchSupported = false;
window.torchActive = false;
window.torchError = '';
window.torchCapability = undefined;
window.nfcError = '';
window.nfcStatus = 'idle';
window.nfcTagAliases = {};
window.lastNfcMessage = null;
window.lastNfcSerialNumber = null;
window.lastNfcAlias = '';
window.bleSupported = false;
window.bleConnected = false;
window.bleStatus = 'idle';
window.bleError = '';
window.bleDeviceName = '';
window.bleValues = {};
window.geoEnabled = false;
window.geoStatus = 'idle'; // idle | requesting-permission | active | permission-denied | unsupported | secure-context-required | error | stopped
window.geoError = '';
window.lastGeoPosition = null;
window.micLevel = 0;

// Motion data (p5-compatible names, always in DEGREES).
// p5 varies these by angleMode(); three-phone has no angleMode, so rotation
// values are always degrees — the most intuitive default for three.js.
window.rotationX = 0;          // device beta  (front/back tilt, -180..180)
window.rotationY = 0;          // device gamma (left/right tilt, -90..90)
window.rotationZ = 0;          // device alpha (compass heading, 0..360)
window.pRotationX = 0;
window.pRotationY = 0;
window.pRotationZ = 0;
window.accelerationX = 0;      // m/s^2 (matches p5: acceleration * 2)
window.accelerationY = 0;
window.accelerationZ = 0;
window.pAccelerationX = null;  // null until the first devicemotion event
window.pAccelerationY = null;
window.pAccelerationZ = null;
window.rotationRateAlpha = 0;  // deg/s (three-phone extra; p5 has no rotationRate)
window.rotationRateBeta = 0;
window.rotationRateGamma = 0;
window.deviceOrientation = 'portrait';

// Touch data (p5-compatible names). Populated by the touch subsystem at load.
window.touches = [];
window.mouseX = 0;
window.mouseY = 0;
window.pmouseX = 0;
window.pmouseY = 0;

// three-phone version, for feature detection from sketches
window.THREE_PHONE_VERSION = '0.1.0';

// Internal state
let _nfcReader = null;
let _nfcAbortController = null;
let _geoWatchId = null;
// Coarse-by-default (battery-friendly, fast fix). Sketches opt into real GPS via
// setGeoOptions({ enableHighAccuracy: true }) BEFORE calling enableGeo*.
let _geoOpts = { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 };
let _torchStream = null;
let _torchTrack = null;
let _torchVideo = null;
let _bleDevice = null;
let _bleServer = null;
let _bleChars = {};
let _bleProfile = null;
let _bleReconnectTimer = null;
let _bleReconnectAttempt = 0;
let _bleReconnectStopped = false;
let _bleNotifyHandlers = {};
const _BLE_RECONNECT_DELAYS = [1500, 3000, 6000, 12000];
const _BLE_DEFAULT_SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
const _BLE_VALID_TYPES = new Set([
  'bool', 'int8', 'uint8', 'int16', 'uint16', 'int32', 'uint32',
  'float', 'double', 'string', 'bytes'
]);

// The three.js renderer canvas three-phone binds gestures / canvas-touch to.
let _phoneCanvas = null;

// Web Audio state (mic metering + audio-context unlock). p5-phone leans on
// p5.sound; three-phone uses the Web Audio API directly and resumes THREE's
// shared audio context so THREE.Audio / PositionalAudio work after the gesture.
let _audioContext = null;
let _micStream = null;
let _micAnalyser = null;
let _micData = null;
let _micRafId = null;

const _gestureLockState = {
  locked: false,
  mode: null,
  target: null,
  listeners: [],
  historyTrapped: false,
  savedHandlers: {},
  appliedStyles: {}
};

function _resetGestureLockState() {
  _gestureLockState.locked = false;
  _gestureLockState.mode = null;
  _gestureLockState.target = null;
  _gestureLockState.listeners = [];
  _gestureLockState.historyTrapped = false;
  _gestureLockState.savedHandlers = {};
  _gestureLockState.appliedStyles = {};
}

function _addTrackedListener(node, type, handler, options) {
  node.addEventListener(type, handler, options);
  _gestureLockState.listeners.push({ node, type, handler, options });
}

function _isPermissionUIElement(target) {
  if (!target) return false;
  return (
    target.id === 'tapOverlay' ||
    (target.closest && target.closest('#tapOverlay')) ||
    target.id === 'permissionButton' ||
    target.id === 'permissionStatus' ||
    target.id === 'permissionBanner' ||
    target.id === 'permissionHint' ||
    (target.closest && (target.closest('#permissionButton') ||
      target.closest('#permissionStatus') ||
      target.closest('#permissionBanner')))
  );
}

// =========================================
// THREE.JS CANVAS DISCOVERY
// three-phone needs to know which <canvas> your renderer draws to, so it can
// bind gesture-blocking and canvas-first-touch permissions to it.
// =========================================

/**
 * Tell three-phone which canvas (or renderer) to treat as the sketch canvas.
 * Pass a THREE.WebGLRenderer, an HTMLCanvasElement, or a CSS selector string.
 * Optional — three-phone auto-detects the three.js canvas otherwise.
 */
function setPhoneCanvas(rendererOrCanvas) {
  if (!rendererOrCanvas) return null;
  if (rendererOrCanvas.domElement instanceof HTMLCanvasElement) {
    _phoneCanvas = rendererOrCanvas.domElement;
  } else if (rendererOrCanvas instanceof HTMLCanvasElement) {
    _phoneCanvas = rendererOrCanvas;
  } else if (typeof rendererOrCanvas === 'string') {
    _phoneCanvas = document.querySelector(rendererOrCanvas);
  }
  return _phoneCanvas;
}

/**
 * Find the three.js renderer canvas. Preference order:
 *   1. a canvas registered via setPhoneCanvas()
 *   2. a canvas tagged by three.js WebGLRenderer (data-engine="three.js ...")
 *   3. the first <canvas> in the document
 */
function _findThreeCanvas() {
  if (_phoneCanvas && document.body && document.body.contains(_phoneCanvas)) {
    return _phoneCanvas;
  }
  const tagged = document.querySelector('canvas[data-engine^="three.js"]');
  if (tagged) return tagged;
  return document.querySelector('canvas') || null;
}

// =========================================
// PUBLIC API - CALL THESE FROM YOUR SKETCH
// =========================================

/**
 * Lock mobile gestures to prevent browser interference
 * Call this in your setup() function
 * @param {Object} [options]
 * @param {'fullscreen'|'embedded'} [options.mode='fullscreen']
 * @param {HTMLElement} [options.element] - Canvas or container for embedded mode
 * @param {boolean} [options.warnBeforeLeave=false]
 * @param {boolean} [options.trapHistory] - Defaults to true in fullscreen mode
 */
function lockGestures(options = {}) {
  if (window.gesturesLocked) {
    unlockGestures();
  }

  const mode = options.mode === 'embedded' ? 'embedded' : 'fullscreen';
  const warnBeforeLeave = options.warnBeforeLeave === true;
  const trapHistory = options.trapHistory !== undefined
    ? options.trapHistory
    : mode === 'fullscreen';

  let target = options.element || null;
  if (mode === 'embedded') {
    if (!target) {
      target = _findThreeCanvas();
    }
    if (!target) {
      console.warn('three-phone: lockGestures embedded mode requires a canvas element. Falling back to document.');
      target = document;
    }
  }

  console.log(`🔒 Locking mobile gestures (${mode})...`);

  _gestureLockState.locked = true;
  _gestureLockState.mode = mode;
  _gestureLockState.target = target;

  if (mode === 'embedded') {
    _lockGesturesEmbedded(target);
  } else {
    _lockGesturesFullscreen({ warnBeforeLeave, trapHistory });
  }

  window.gesturesLocked = true;
  console.log('✅ Mobile gestures locked');
}

/**
 * Remove gesture blocking listeners and restore saved handlers
 */
function unlockGestures() {
  if (!_gestureLockState.locked && !window.gesturesLocked) return;

  _gestureLockState.listeners.forEach(({ node, type, handler, options }) => {
    node.removeEventListener(type, handler, options);
  });

  if (_gestureLockState.savedHandlers.onpopstate !== undefined) {
    window.onpopstate = _gestureLockState.savedHandlers.onpopstate;
  }

  if (_gestureLockState.savedHandlers.oncontextmenu !== undefined) {
    window.oncontextmenu = _gestureLockState.savedHandlers.oncontextmenu;
  }

  if (_gestureLockState.target && _gestureLockState.appliedStyles.touchAction !== undefined) {
    _gestureLockState.target.style.touchAction = _gestureLockState.appliedStyles.touchAction;
  }

  _resetGestureLockState();
  window.gesturesLocked = false;
  console.log('🔓 Mobile gestures unlocked');
}

/**
 * Enable gyroscope with a button interface
 */
function enableGyroButton(buttonText = 'ENABLE MOTION SENSORS', statusText = 'Requesting motion sensors...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via button');
  });
}

/**
 * Enable gyroscope with tap-to-start
 */
function enableGyroTap(message = 'Tap screen to enable motion sensors') {
  _createTapToEnable(message, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via tap');
  });
}

/**
 * Enable microphone with a button interface
 */
function enableMicButton(buttonText = 'ENABLE MICROPHONE', statusText = 'Requesting microphone access...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via button');
  });
}

/**
 * Enable microphone with tap-to-start
 */
function enableMicTap(message = 'Tap screen to enable microphone') {
  _createTapToEnable(message, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via tap');
  });
}

/**
 * Enable sound output with a button interface
 */
function enableSoundButton(buttonText = 'ENABLE SOUND', statusText = 'Enabling audio...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via button');
  });
}

/**
 * Enable sound output with tap-to-start
 */
function enableSoundTap(message = 'Tap screen to enable sound') {
  _createTapToEnable(message, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via tap');
  });
}

/**
 * Enable speech recognition with tap-to-start.
 * This only unlocks the audio context; create your own SpeechRecognition object.
 */
function enableSpeechTap(message = 'Tap to enable speech recognition') {
  _createTapToEnable(message, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via tap');
  });
}

/**
 * Enable speech recognition with a button interface.
 */
function enableSpeechButton(buttonText = 'ENABLE SPEECH RECOGNITION', statusText = 'Enabling speech recognition...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via button');
  });
}

/**
 * Enable vibration motor with a button interface (Android only).
 */
function enableVibrationButton(buttonText = 'ENABLE VIBRATION', statusText = 'Enabling vibration...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via button');
  });
}

/**
 * Enable vibration motor with tap-to-start (Android only).
 */
function enableVibrationTap(message = 'Tap screen to enable vibration') {
  _createTapToEnable(message, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via tap');
  });
}

/**
 * Enable camera torch/flashlight with a button interface (Android Chrome, HTTPS).
 */
function enableTorchButton(buttonText = 'ENABLE FLASHLIGHT', statusText = 'Starting flashlight...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via button');
  });
}

/**
 * Enable camera torch/flashlight with tap-to-start.
 */
function enableTorchTap(message = 'Tap screen to enable flashlight') {
  _createTapToEnable(message, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via tap');
  });
}

const enableFlashlightButton = enableTorchButton;
const enableFlashlightTap = enableTorchTap;

/**
 * Enable NFC tag reading with a button interface (Android Chrome 89+).
 */
function enableNfcButton(buttonText = 'ENABLE NFC', statusText = 'Enabling NFC...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via button');
  });
}

/**
 * Enable NFC tag reading with tap-to-start (Android Chrome 89+).
 */
function enableNfcTap(message = 'Tap screen to enable NFC') {
  _createTapToEnable(message, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via tap');
  });
}

/**
 * Enable GPS/geolocation with a button interface (HTTPS required).
 */
function enableGeoButton(buttonText = 'ENABLE LOCATION', statusText = 'Enabling GPS...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via button');
  });
}

/**
 * Enable GPS/geolocation with tap-to-start (HTTPS required).
 */
function enableGeoTap(message = 'Tap screen to enable GPS') {
  _createTapToEnable(message, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via tap');
  });
}

/**
 * Enable both motion sensors and microphone with a button interface.
 */
function enableAllButton(buttonText = 'ENABLE MOTION & MICROPHONE', statusText = 'Requesting permissions...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via button');
  });
}

/**
 * Enable both motion sensors and microphone with tap-to-start.
 */
function enableAllTap(message = 'Tap screen to enable motion sensors & microphone') {
  _createTapToEnable(message, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via tap');
  });
}

/**
 * Enable any combination of hardware permissions with tap-to-start.
 * @param {string|string[]} permissions - e.g. ['sensors', 'mic', 'camera']
 * @param {string} message - Tap overlay message
 */
function enablePermissionsTap(permissions, message = 'Tap screen to enable hardware') {
  _createTapToEnable(message, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via tap:', enabledPermissions);
  });
}

/**
 * Enable any combination of hardware permissions with a button interface.
 */
function enablePermissionsButton(permissions, buttonText = 'ENABLE HARDWARE', statusText = 'Requesting permissions...') {
  _createPermissionButton(buttonText, statusText, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via button:', enabledPermissions);
  });
}

// =========================================
// CANVAS-FIRST-TOUCH — enableXxxCanvas()
// Permissions fire on the user's first touch/click on the three.js canvas.
// =========================================

function enableGyroCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via canvas touch');
  });
}

function enableMicCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via canvas touch');
  });
}

function enableSoundCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via canvas touch');
  });
}

function enableSpeechCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via canvas touch');
  });
}

function enableVibrationCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via canvas touch');
  });
}

function enableTorchCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via canvas touch');
  });
}

const enableFlashlightCanvas = enableTorchCanvas;

function enableNfcCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via canvas touch');
  });
}

function enableGeoCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via canvas touch');
  });
}

function enableAllCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via canvas touch');
  });
}

/**
 * Enable camera with tap-to-start.
 */
function enableCameraTap(message = 'Tap screen to enable camera') {
  _createTapToEnable(message, async () => {
    await _requestCameraPermission();
    console.log('✅ Camera enabled via tap');
  });
}

/**
 * Enable camera with a button interface.
 */
function enableCameraButton(buttonText = 'ENABLE CAMERA', statusText = 'Requesting camera...') {
  _createPermissionButton(buttonText, statusText, async () => {
    await _requestCameraPermission();
    console.log('✅ Camera enabled via button');
  });
}

function enableCameraCanvas(message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    await _requestCameraPermission();
    console.log('✅ Camera enabled via canvas touch');
  });
}

function enablePermissionsCanvas(permissions, message = 'Touch to start') {
  _createCanvasToEnable(message, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via canvas touch:', enabledPermissions);
  });
}

// =========================================
// BANNER UI — enableXxxBanner()
// =========================================

function enableGyroBanner(message = 'Tap to enable motion sensors', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via banner');
  });
}

function enableMicBanner(message = 'Tap to enable microphone', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via banner');
  });
}

function enableSoundBanner(message = 'Tap to enable sound', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via banner');
  });
}

function enableSpeechBanner(message = 'Tap to enable speech recognition', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via banner');
  });
}

function enableVibrationBanner(message = 'Tap to enable vibration', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via banner');
  });
}

function enableTorchBanner(message = 'Tap to enable flashlight', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via banner');
  });
}

const enableFlashlightBanner = enableTorchBanner;

function enableNfcBanner(message = 'Tap to enable NFC', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via banner');
  });
}

function enableGeoBanner(message = 'Tap to enable GPS', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via banner');
  });
}

function enableAllBanner(message = 'Tap to enable sensors & microphone', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via banner');
  });
}

function enableCameraBanner(message = 'Tap to enable camera', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    await _requestCameraPermission();
    console.log('✅ Camera enabled via banner');
  });
}

function enablePermissionsBanner(permissions, message = 'Tap to enable hardware', position = 'top') {
  _createBannerToEnable(message, position, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via banner:', enabledPermissions);
  });
}

// =========================================
// CUSTOM ELEMENT BINDING — enableXxxOn()
// =========================================

function enableGyroOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestMotionPermissions();
    console.log('✅ Gyroscope enabled via custom element');
  });
}

function enableMicOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestMicrophonePermissions();
    console.log('✅ Microphone enabled via custom element');
  });
}

function enableSoundOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestSoundOutput();
    console.log('✅ Sound output enabled via custom element');
  });
}

function enableSpeechOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestSpeechPermission();
    console.log('✅ Speech recognition enabled via custom element');
  });
}

function enableVibrationOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestVibrationPermission();
    console.log('✅ Vibration enabled via custom element');
  });
}

function enableTorchOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestTorchPermission();
    console.log('✅ Torch enabled via custom element');
  });
}

const enableFlashlightOn = enableTorchOn;

function enableNfcOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestNfcPermission();
    console.log('✅ NFC enabled via custom element');
  });
}

function enableGeoOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestGeoPermission();
    console.log('✅ GPS enabled via custom element');
  });
}

function _bleConnectFromUI(source) {
  if (!_bleProfile) {
    debugWarn('Call bleSetup() in setup() before connecting.');
    return;
  }
  bleConnect().then(() => {
    console.log('✅ BLE connect initiated via ' + source);
  }).catch(() => {});
}

function enableBleButton(options = {}) {
  const label = options.label || 'Connect device';
  const status = options.statusText || 'Connecting...';
  _createPermissionButton(label, status, () => {
    _bleConnectFromUI('button');
  });
}

function enableBleTap(options = {}) {
  const message = options.label || options.message || 'Tap to connect Bluetooth device';
  _createTapToEnable(message, () => {
    _bleConnectFromUI('tap');
  });
}

function enableBleCanvas(options = {}) {
  const message = options.label || options.message || 'Touch to connect';
  _createCanvasToEnable(message, () => {
    _bleConnectFromUI('canvas');
  });
}

function enableBleBanner(options = {}) {
  const message = options.label || options.message || 'Tap to connect Bluetooth';
  const position = options.position || 'top';
  _createBannerToEnable(message, position, () => {
    _bleConnectFromUI('banner');
  });
}

function enableBleOn(selector) {
  _bindPermissionTo(selector, () => {
    _bleConnectFromUI('custom element');
  });
}

function enableAllOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestMotionPermissionsCore();
    await _requestMicrophonePermissionsCore();
    _notifySketchReady();
    console.log('✅ Motion sensors and microphone enabled via custom element');
  });
}

function enableCameraOn(selector) {
  _bindPermissionTo(selector, async () => {
    await _requestCameraPermission();
    console.log('✅ Camera enabled via custom element');
  });
}

function enablePermissionsOn(selector, permissions) {
  _bindPermissionTo(selector, async () => {
    const enabledPermissions = await _requestPermissionsCore(permissions);
    _notifySketchReady();
    console.log('Hardware permissions enabled via custom element:', enabledPermissions);
  });
}

/**
 * Trigger vibration on device.
 * @param {number|number[]} pattern - Duration in ms or [vibrate, pause, vibrate, ...]
 */
function vibrate(pattern) {
  if (!window.vibrationEnabled) {
    console.warn('⚠️ Vibration not enabled. Call enableVibrationTap() or enableVibrationButton() first.');
    return false;
  }

  if (!navigator.vibrate) {
    console.warn('⚠️ Vibration API not supported on this device');
    return false;
  }

  return navigator.vibrate(pattern);
}

/**
 * Stop any ongoing vibration
 */
function stopVibration() {
  if (navigator.vibrate) {
    navigator.vibrate(0);
  }
}

/**
 * Check whether the current torch stream reports controllable torch support.
 */
function isTorchSupported() {
  return !!window.torchSupported;
}

/**
 * Set camera torch/flashlight state. Starts a rear camera stream if needed.
 * @param {boolean} enabled - true to turn on, false to turn off
 * @returns {Promise<boolean>}
 */
async function setTorch(enabled) {
  try {
    window.torchError = '';

    if (!_torchTrack || _torchTrack.readyState !== 'live') {
      await _requestTorchPermissionCore();
    }

    if (!_torchTrack || _torchTrack.readyState !== 'live') {
      window.torchError = 'No live rear camera track is available for torch control.';
      return false;
    }

    await _torchTrack.applyConstraints({ advanced: [{ torch: !!enabled }] });
    window.torchActive = !!enabled;
    _refreshTorchState();
    return true;
  } catch (error) {
    window.torchError = error && error.message ? error.message : String(error);
    console.warn('⚠️ Torch control failed:', error);
    if (_debugVisible) {
      debugWarn('Torch control failed: ' + window.torchError);
    }
    return false;
  }
}

function torchOn() {
  return setTorch(true);
}

function torchOff() {
  return setTorch(false);
}

function toggleTorch() {
  return setTorch(!window.torchActive);
}

const flashlightOn = torchOn;
const flashlightOff = torchOff;
const toggleFlashlight = toggleTorch;
const setFlashlight = setTorch;

/**
 * Turn the torch off and release the internal camera stream.
 */
async function stopTorch() {
  if (_torchTrack && _torchTrack.readyState === 'live') {
    try {
      await _torchTrack.applyConstraints({ advanced: [{ torch: false }] });
    } catch (error) {
      window.torchError = error && error.message ? error.message : String(error);
    }
  }

  if (_torchStream) {
    _torchStream.getTracks().forEach(track => track.stop());
  }

  if (_torchVideo) {
    _torchVideo.pause();
    _torchVideo.srcObject = null;
  }

  _torchStream = null;
  _torchTrack = null;
  _torchVideo = null;
  window.torchEnabled = false;
  window.torchSupported = false;
  window.torchActive = false;
  window.torchCapability = undefined;
}

const stopFlashlight = stopTorch;

/**
 * Stop NFC scanning
 */
function stopNfc() {
  if (_nfcAbortController) {
    _nfcAbortController.abort();
    _nfcAbortController = null;
  }
  _nfcReader = null;
  window.nfcEnabled = false;
  window.nfcStatus = 'stopped';
  console.log('NFC scanning stopped');
}

// =========================================
// GPS / GEOLOCATION (navigator.geolocation)
// Cross-platform. HTTPS required. Coarse-by-default.
// =========================================

/**
 * Stop GPS watch and release the position subscription.
 */
function stopGeo() {
  if (_geoWatchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try { navigator.geolocation.clearWatch(_geoWatchId); } catch (e) { /* ignore */ }
  }
  _geoWatchId = null;
  window.geoEnabled = false;
  window.geoStatus = 'stopped';
  console.log('GPS watch stopped');
}

/**
 * Update GPS options. Call BEFORE enableGeo* for the options to apply.
 * Defaults: { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 }
 */
function setGeoOptions(opts) {
  if (opts && typeof opts === 'object') {
    if (typeof opts.enableHighAccuracy === 'boolean') _geoOpts.enableHighAccuracy = opts.enableHighAccuracy;
    if (typeof opts.timeout === 'number') _geoOpts.timeout = opts.timeout;
    if (typeof opts.maximumAge === 'number') _geoOpts.maximumAge = opts.maximumAge;
  }
  return _geoOpts;
}

/**
 * Return the most recent normalized position synchronously, or null.
 */
function getGeoPosition() {
  return window.lastGeoPosition;
}

/**
 * Great-circle distance between two lat/lon points (Haversine).
 * units: 'm' (meters, default), 'km', or 'mi'.
 */
function geoDistance(lat1, lon1, lat2, lon2, units) {
  const R = units === 'km' ? 6371 : (units === 'mi' ? 3959 : 6371000);
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Point-in-geofence test via ray casting (pnpoly).
 * polygon: array of { lat, lon } vertices. point: { lat, lon }.
 */
function geoInPolygon(polygon, point) {
  if (!Array.isArray(polygon) || polygon.length < 3 || !point) return false;
  const px = point.lon;
  const py = point.lat;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon, yi = polygon[i].lat;
    const xj = polygon[j].lon, yj = polygon[j].lat;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-15) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Normalize a GeolocationPosition DOM object into a plain object.
 */
function _normalizeGeoPosition(position) {
  const c = position.coords;
  return {
    latitude: c.latitude,
    longitude: c.longitude,
    accuracy: c.accuracy,
    altitude: c.altitude,
    altitudeAccuracy: c.altitudeAccuracy,
    heading: c.heading,
    speed: c.speed,
    timestamp: position.timestamp
  };
}

function _handleGeoPosition(position) {
  const normalized = _normalizeGeoPosition(position);
  window.lastGeoPosition = normalized;
  window.geoStatus = 'active';
  window.geoError = '';
  window.geoEnabled = true;
  if (typeof geoRead === 'function') {
    try { geoRead(normalized); } catch (e) { console.error('geoRead callback error:', e); }
  }
  if (_debugVisible) {
    debug('GPS: ' + normalized.latitude.toFixed(5) + ', ' + normalized.longitude.toFixed(5) + ' ±' + Math.round(normalized.accuracy) + 'm');
  }
}

function _handleGeoError(error, isStream) {
  // PositionError.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
  if (error && error.code === 1) {
    window.geoStatus = 'permission-denied';
    window.geoError = 'Location permission denied. Check browser site settings and OS-level Location Services (iOS: Settings → Privacy & Security → Location Services → Safari; Android: Settings → Location).';
    if (_debugVisible) debugWarn('GPS permission denied');
  } else if (error && error.code === 3) {
    if (!window.lastGeoPosition) {
      window.geoStatus = 'error';
      window.geoError = 'GPS timeout. Cold start can take 5-30s — try again, preferably outdoors.';
    }
    if (_debugVisible) debugWarn('GPS timeout (cold start can take 5-30s)');
  } else {
    window.geoStatus = 'error';
    window.geoError = (error && error.message)
      ? 'Location unavailable: ' + error.message + '. Move outdoors or retry.'
      : 'Location unavailable. Move outdoors or retry.';
    if (_debugVisible) debugWarn('GPS error: ' + (error && error.message ? error.message : 'unavailable'));
  }
  if (error && error.code !== 3) {
    window.geoEnabled = false;
  }
  if (typeof onGeoError === 'function') {
    try { onGeoError(error); } catch (e) { console.error('onGeoError callback error:', e); }
  }
}

async function _requestGeoPermissionCore() {
  try {
    if (window.geoEnabled && _geoWatchId !== null) {
      return true;
    }
    window.geoError = '';

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      console.warn('⚠️ GPS requires HTTPS (or localhost). Blocked on insecure origins.');
      window.geoEnabled = false;
      window.geoStatus = 'secure-context-required';
      window.geoError = 'GPS requires HTTPS. Serve this sketch from an HTTPS URL, not plain HTTP.';
      if (_debugVisible) debugWarn('GPS requires HTTPS');
      return false;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      console.warn('⚠️ Geolocation API not supported on this device/browser');
      window.geoEnabled = false;
      window.geoStatus = 'unsupported';
      window.geoError = 'Geolocation is not supported in this browser.';
      if (_debugVisible) debugWarn('Geolocation not supported');
      return false;
    }

    window.geoStatus = 'requesting-permission';

    await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, _geoOpts);
    }).then(_handleGeoPosition, (err) => { throw err; });

    _geoWatchId = navigator.geolocation.watchPosition(_handleGeoPosition, (err) => {
      _handleGeoError(err, true);
    }, _geoOpts);

    console.log('✅ GPS watch active');
    return true;

  } catch (error) {
    _handleGeoError(error, false);
    return false;
  }
}

function _normalizeNfcText(value) {
  return value == null ? '' : String(value).trim();
}

function _normalizeNfcTagId(serialNumber) {
  return _normalizeNfcText(serialNumber).toLowerCase();
}

function _nfcTextMatches(firstValue, secondValue) {
  const firstText = _normalizeNfcText(firstValue).toLowerCase();
  const secondText = _normalizeNfcText(secondValue).toLowerCase();
  return firstText !== '' && firstText === secondText;
}

/**
 * Give an NFC tag a human-friendly alias. Empty alias removes the stored name.
 */
function setNfcTagAlias(serialNumber, alias) {
  const tagId = _normalizeNfcTagId(serialNumber);
  const tagAlias = _normalizeNfcText(alias);

  if (!tagId) {
    console.warn('three-phone: setNfcTagAlias() needs an NFC serial number');
    return '';
  }

  if (!tagAlias) {
    delete window.nfcTagAliases[tagId];
  } else {
    window.nfcTagAliases[tagId] = tagAlias;
  }

  if (_normalizeNfcTagId(window.lastNfcSerialNumber) === tagId) {
    window.lastNfcAlias = tagAlias;
    if (window.lastNfcMessage) {
      window.lastNfcMessage.alias = tagAlias;
    }
  }

  return tagAlias;
}

/**
 * Get the human-friendly alias for an NFC tag serial number.
 */
function getNfcTagAlias(serialNumber = window.lastNfcSerialNumber) {
  const tagId = _normalizeNfcTagId(serialNumber);
  return tagId ? (window.nfcTagAliases[tagId] || '') : '';
}

/**
 * Check whether the most recently read NFC tag matches an alias or serial number.
 */
function isNfcTag(aliasOrSerialNumber, serialNumber = window.lastNfcSerialNumber) {
  const tagId = _normalizeNfcTagId(serialNumber);
  const targetText = _normalizeNfcText(aliasOrSerialNumber);

  if (!tagId || !targetText) {
    return false;
  }

  if (tagId === _normalizeNfcTagId(targetText)) {
    return true;
  }

  return _nfcTextMatches(getNfcTagAlias(serialNumber), targetText);
}

// =========================================
// INTERNAL PERMISSION HANDLERS
// =========================================

// Core permission logic (without notification) — used by combo functions.
async function _requestMotionPermissionsCore() {
  try {
    // Request motion sensor permissions (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {

      const orientationPermission = await DeviceOrientationEvent.requestPermission();
      console.log('Orientation permission:', orientationPermission);

      if (typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function') {
        const motionPermission = await DeviceMotionEvent.requestPermission();
        console.log('Motion permission:', motionPermission);
      }
    }

    _installMotionListeners();
    window.sensorsEnabled = true;

  } catch (error) {
    console.error('Motion sensor permission error:', error);
    if (_debugVisible) {
      debugError('Motion sensor permission error:', error);
    }
    // Enable anyway for non-iOS devices (Android doesn't require requestPermission)
    _installMotionListeners();
    window.sensorsEnabled = true;
  }
}

// =========================================
// AUDIO: microphone level + sound/speech unlock (Web Audio)
// =========================================

/**
 * Get (lazily create) the shared Web Audio AudioContext three-phone uses.
 * Returns null if the browser has no Web Audio support.
 */
function getAudioContext() {
  if (!_audioContext) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _audioContext = new AC();
  }
  return _audioContext;
}

// Resume three-phone's context AND three.js's shared audio context (if present),
// so THREE.Audio/PositionalAudio start after the user gesture.
async function _resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try { await ctx.resume(); } catch (e) { /* ignore */ }
  }
  if (window.THREE && window.THREE.AudioContext &&
      typeof window.THREE.AudioContext.getContext === 'function') {
    try {
      const tctx = window.THREE.AudioContext.getContext();
      if (tctx && tctx.state === 'suspended') await tctx.resume();
    } catch (e) { /* ignore */ }
  }
  return ctx;
}

/**
 * Current microphone input level, 0..1 (RMS). Read this in your animate loop.
 */
function getMicLevel() {
  return window.micLevel;
}

/**
 * The live microphone MediaStream (for THREE.AudioAnalyser, ml5, etc.), or null.
 */
function getMicStream() {
  return _micStream;
}

function _startMicLevelLoop() {
  if (_micRafId) return;
  const tick = () => {
    if (_micAnalyser && _micData) {
      _micAnalyser.getByteTimeDomainData(_micData);
      let sum = 0;
      for (let i = 0; i < _micData.length; i++) {
        const v = (_micData[i] - 128) / 128;
        sum += v * v;
      }
      window.micLevel = Math.sqrt(sum / _micData.length);
    }
    _micRafId = requestAnimationFrame(tick);
  };
  _micRafId = requestAnimationFrame(tick);
}

async function _requestMicrophonePermissionsCore() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('⚠️ getUserMedia not available; microphone unavailable.');
      if (_debugVisible) debugWarn('Microphone unavailable (no getUserMedia)');
      window.micEnabled = false;
      return;
    }

    const ctx = await _resumeAudioContext();

    if (!_micStream) {
      _micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }

    if (ctx && !_micAnalyser) {
      const source = ctx.createMediaStreamSource(_micStream);
      _micAnalyser = ctx.createAnalyser();
      _micAnalyser.fftSize = 1024;
      _micAnalyser.smoothingTimeConstant = 0.8;
      source.connect(_micAnalyser);
      _micData = new Uint8Array(_micAnalyser.fftSize);
      _startMicLevelLoop();
    }

    window.micEnabled = true;
    console.log('✅ Microphone level metering active');
  } catch (error) {
    console.error('Microphone permission error:', error);
    if (_debugVisible) {
      debugError('Microphone permission error:', error);
    }
    window.micEnabled = false;
  }
}

async function _requestSoundOutputCore() {
  try {
    await _resumeAudioContext();
    window.soundEnabled = true;
    console.log('✅ Sound output enabled (audio context resumed)');
  } catch (error) {
    console.error('Sound output error:', error);
    if (_debugVisible) {
      debugError('Sound output error:', error);
    }
    window.soundEnabled = true; // no permission needed; enable anyway
  }
}

async function _requestSpeechPermissionCore() {
  // Unlock the audio context for the Web Speech API WITHOUT creating a mic
  // analyser (that would conflict with SpeechRecognition on some browsers).
  try {
    await _resumeAudioContext();
    window.speechEnabled = true;
    console.log('✅ Speech recognition audio unlocked');
  } catch (error) {
    console.error('Speech permission error:', error);
    if (_debugVisible) {
      debugError('Speech permission error:', error);
    }
    window.speechEnabled = true;
  }
}

async function _requestCameraPermissionCore() {
  // Initialize any PhoneCamera instances created before the gesture. Deferring
  // init until here fixes the iOS bug where a camera started before permission
  // came up rotated.
  try {
    let cameraStarted = false;
    if (Array.isArray(window._phoneCameras)) {
      for (const cam of window._phoneCameras) {
        if (!cam) continue;
        if (!cam._ready && !cam._video) {
          await cam._initializeCamera();
        }
        if (cam._ready || cam._video) cameraStarted = true;
      }
    }
    window.cameraEnabled = cameraStarted;
    if (!cameraStarted) {
      console.warn('three-phone: No PhoneCamera found. Create one with createPhoneCamera() before enabling camera permissions.');
      return false;
    }
    if (typeof userCameraReady === 'function') {
      try { userCameraReady(); } catch (e) { console.error('userCameraReady callback error:', e); }
    }
    return true;
  } catch (error) {
    console.error('Camera permission error:', error);
    if (_debugVisible) {
      debugError('Camera permission error:', error);
    }
    window.cameraEnabled = false;
    return false;
  }
}

// =========================================
// MOTION DATA ENGINE
// p5-phone delegates motion data to p5's built-in globals. three.js has none,
// so three-phone owns the DeviceOrientation/DeviceMotion listeners and exposes
// the same window globals p5 does (rotationX/Y/Z, accelerationX/Y/Z, ...),
// plus three.js-native helpers below.
// =========================================

let _moveThreshold = 0.5;   // p5 default
let _shakeThreshold = 30;   // p5 default

/**
 * Set the movement threshold for deviceMoved(). Default 0.5.
 */
function setMoveThreshold(value) {
  if (typeof value === 'number') _moveThreshold = value;
}

/**
 * Set the shake threshold for deviceShaken(). Default 30.
 */
function setShakeThreshold(value) {
  if (typeof value === 'number') _shakeThreshold = value;
}

// --- Pure, testable motion math (see test-motion-contract.js) ---

// Map a DeviceOrientationEvent's (alpha, beta, gamma) to p5's rotation globals.
function _computeOrientationGlobals(alpha, beta, gamma) {
  return {
    rotationX: (beta == null ? 0 : beta),   // p5 rotationX = beta
    rotationY: (gamma == null ? 0 : gamma),  // p5 rotationY = gamma
    rotationZ: (alpha == null ? 0 : alpha)   // p5 rotationZ = alpha
  };
}

// Shake metric (matches p5): |ΔaccelX| + |ΔaccelY|.
function _shakeDelta(accX, accY, pAccX, pAccY) {
  return Math.abs(accX - pAccX) + Math.abs(accY - pAccY);
}

// Move test (matches p5): any per-axis acceleration delta exceeds the threshold.
function _moveExceeded(accX, accY, accZ, pAccX, pAccY, pAccZ, threshold) {
  return Math.abs(accX - pAccX) > threshold ||
         Math.abs(accY - pAccY) > threshold ||
         Math.abs(accZ - pAccZ) > threshold;
}

// Device orientation (alpha,beta,gamma in DEGREES) + screen angle (DEGREES) to a
// world quaternion for driving an Object3D. Standard three.js
// DeviceOrientationControls math, implemented without a THREE dependency so it
// can be unit-tested and used before THREE loads. Returns {x,y,z,w} (normalized).
function _orientationToQuaternion(alpha, beta, gamma, screenAngleDeg) {
  const deg2rad = Math.PI / 180;
  const x = (beta || 0) * deg2rad;   // Euler X = beta
  const y = (alpha || 0) * deg2rad;  // Euler Y = alpha
  const z = -(gamma || 0) * deg2rad; // Euler Z = -gamma
  const orient = (screenAngleDeg || 0) * deg2rad;

  // Quaternion from Euler, order 'YXZ'
  const c1 = Math.cos(x / 2), s1 = Math.sin(x / 2);
  const c2 = Math.cos(y / 2), s2 = Math.sin(y / 2);
  const c3 = Math.cos(z / 2), s3 = Math.sin(z / 2);
  let qx = s1 * c2 * c3 + c1 * s2 * s3;
  let qy = c1 * s2 * c3 - s1 * c2 * s3;
  let qz = c1 * c2 * s3 - s1 * s2 * c3;
  let qw = c1 * c2 * c3 + s1 * s2 * s3;

  // Multiply by q1 = quaternion(-sqrt(0.5), 0, 0, sqrt(0.5)) — camera/object
  // looks out the back of the device rather than the top.
  const h = Math.sqrt(0.5);
  const b1x = -h, b1y = 0, b1z = 0, b1w = h;
  let rx = qw * b1x + qx * b1w + qy * b1z - qz * b1y;
  let ry = qw * b1y - qx * b1z + qy * b1w + qz * b1x;
  let rz = qw * b1z + qx * b1y - qy * b1x + qz * b1w;
  let rw = qw * b1w - qx * b1x - qy * b1y - qz * b1z;

  // Multiply by q0 = axis-angle about world Z by -orient (screen rotation).
  const s = Math.sin(-orient / 2), cw = Math.cos(-orient / 2);
  const b0x = 0, b0y = 0, b0z = s, b0w = cw;
  const ox = rw * b0x + rx * b0w + ry * b0z - rz * b0y;
  const oy = rw * b0y - rx * b0z + ry * b0w + rz * b0x;
  const oz = rw * b0z + rx * b0y - ry * b0x + rz * b0w;
  const ow = rw * b0w - rx * b0x - ry * b0y - rz * b0z;

  const len = Math.sqrt(ox * ox + oy * oy + oz * oz + ow * ow) || 1;
  return { x: ox / len, y: oy / len, z: oz / len, w: ow / len };
}

// --- Listeners + dispatch ---

function _currentScreenAngle() {
  if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle;
  }
  if (typeof window.orientation === 'number') return window.orientation;
  return 0;
}

function _updateDeviceOrientationLabel() {
  const angle = _currentScreenAngle();
  window.deviceOrientation = (angle === 90 || angle === -90 || angle === 270)
    ? 'landscape' : 'portrait';
}

function _onDeviceOrientation(e) {
  window.pRotationX = window.rotationX;
  window.pRotationY = window.rotationY;
  window.pRotationZ = window.rotationZ;
  const g = _computeOrientationGlobals(e.alpha, e.beta, e.gamma);
  window.rotationX = g.rotationX;
  window.rotationY = g.rotationY;
  window.rotationZ = g.rotationZ;
}

function _onDeviceMotion(e) {
  window.pAccelerationX = window.accelerationX;
  window.pAccelerationY = window.accelerationY;
  window.pAccelerationZ = window.accelerationZ;

  const acc = e.acceleration || { x: 0, y: 0, z: 0 };
  window.accelerationX = (acc.x || 0) * 2;
  window.accelerationY = (acc.y || 0) * 2;
  window.accelerationZ = (acc.z || 0) * 2;

  const rr = e.rotationRate || {};
  window.rotationRateAlpha = rr.alpha || 0;
  window.rotationRateBeta = rr.beta || 0;
  window.rotationRateGamma = rr.gamma || 0;

  _handleMotionCallbacks();
}

function _handleMotionCallbacks() {
  if (typeof deviceMoved === 'function') {
    if (_moveExceeded(window.accelerationX, window.accelerationY, window.accelerationZ,
        window.pAccelerationX || 0, window.pAccelerationY || 0, window.pAccelerationZ || 0,
        _moveThreshold)) {
      try { deviceMoved(); } catch (err) { console.error('deviceMoved callback error:', err); }
    }
  }
  if (typeof deviceShaken === 'function') {
    if (window.pAccelerationX !== null &&
        _shakeDelta(window.accelerationX, window.accelerationY,
          window.pAccelerationX, window.pAccelerationY) > _shakeThreshold) {
      try { deviceShaken(); } catch (err) { console.error('deviceShaken callback error:', err); }
    }
  }
}

function _installMotionListeners() {
  if (window._threePhoneMotionInstalled) return;
  window._threePhoneMotionInstalled = true;
  window.addEventListener('deviceorientation', _onDeviceOrientation, false);
  window.addEventListener('devicemotion', _onDeviceMotion, false);
  _updateDeviceOrientationLabel();
  window.addEventListener('orientationchange', _updateDeviceOrientationLabel, false);
  if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', _updateDeviceOrientationLabel);
  }
}

// =========================================
// THREE.JS-NATIVE MOTION HELPERS
// These touch window.THREE lazily; they warn (once) if three.js is absent.
// =========================================

let _tmpDeviceQuat = null;

function _deviceQuaternionRaw() {
  // DeviceOrientationControls mapping: alpha=rotationZ, beta=rotationX, gamma=rotationY
  return _orientationToQuaternion(window.rotationZ, window.rotationX, window.rotationY, _currentScreenAngle());
}

/**
 * Get the device's world rotation as a quaternion.
 * @param {THREE.Quaternion} [target] - optional quaternion to fill
 * @returns {THREE.Quaternion|{x,y,z,w}}
 */
function getRotationQuaternion(target) {
  const q = _deviceQuaternionRaw();
  if (target && typeof target.set === 'function') {
    target.set(q.x, q.y, q.z, q.w);
    return target;
  }
  if (window.THREE && window.THREE.Quaternion) {
    return new window.THREE.Quaternion(q.x, q.y, q.z, q.w);
  }
  return q;
}

/**
 * Get the device's world rotation as a THREE.Euler.
 * @param {THREE.Euler} [target] - optional euler to fill
 */
function getRotationEuler(target) {
  if (!window.THREE || !window.THREE.Euler) {
    debugError('getRotationEuler() needs three.js — load THREE before calling it.');
    return { x: window.rotationX, y: window.rotationY, z: window.rotationZ };
  }
  const q = getRotationQuaternion();
  const e = target || new window.THREE.Euler();
  e.setFromQuaternion(q);
  return e;
}

/**
 * Rotate an Object3D to match the device's current attitude. Call every frame.
 * @param {THREE.Object3D} object3D
 * @param {Object} [opts]
 * @param {number} [opts.smooth=0] - 0 = snap; higher (up to ~0.9) = smoother slerp
 */
function applyDeviceRotation(object3D, opts = {}) {
  if (!object3D || !object3D.quaternion) {
    debugError('applyDeviceRotation() needs a THREE.Object3D.');
    return;
  }
  const smooth = Math.max(0, Math.min(0.99, opts.smooth || 0));
  const q = _deviceQuaternionRaw();
  if (window.THREE && smooth > 0 && typeof object3D.quaternion.slerp === 'function') {
    if (!_tmpDeviceQuat) _tmpDeviceQuat = new window.THREE.Quaternion();
    _tmpDeviceQuat.set(q.x, q.y, q.z, q.w);
    object3D.quaternion.slerp(_tmpDeviceQuat, 1 - smooth);
  } else {
    object3D.quaternion.set(q.x, q.y, q.z, q.w);
  }
}

// =========================================
// TOUCH SUBSYSTEM
// p5 gives sketches touches[]/mouseX/touchStarted() for free. three-phone
// installs pointer listeners at load and exposes the same globals + callbacks.
// =========================================

const _activePointers = new Map();

function _rebuildTouches() {
  window.touches = Array.from(_activePointers.values()).map(p => ({ x: p.x, y: p.y, id: p.id }));
}

function _updateMouse(e) {
  window.pmouseX = window.mouseX;
  window.pmouseY = window.mouseY;
  window.mouseX = e.clientX;
  window.mouseY = e.clientY;
}

function _installTouchListeners() {
  if (window._threePhoneTouchInstalled) return;
  window._threePhoneTouchInstalled = true;

  const onDown = (e) => {
    _activePointers.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
    _rebuildTouches();
    _updateMouse(e);
    if (typeof touchStarted === 'function') {
      try { touchStarted(e); } catch (err) { console.error('touchStarted callback error:', err); }
    }
  };
  const onMove = (e) => {
    _updateMouse(e);
    if (_activePointers.has(e.pointerId)) {
      const p = _activePointers.get(e.pointerId);
      p.x = e.clientX;
      p.y = e.clientY;
      _rebuildTouches();
      if (typeof touchMoved === 'function') {
        try { touchMoved(e); } catch (err) { console.error('touchMoved callback error:', err); }
      }
    }
  };
  const onUp = (e) => {
    _activePointers.delete(e.pointerId);
    _rebuildTouches();
    _updateMouse(e);
    if (typeof touchEnded === 'function') {
      try { touchEnded(e); } catch (err) { console.error('touchEnded callback error:', err); }
    }
  };

  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onUp, { passive: true });
}

/**
 * Convert screen (client) coordinates to normalized device coordinates using
 * the three.js canvas rect.
 */
function _screenToNDC(x, y) {
  const canvas = _findThreeCanvas();
  const rect = canvas && canvas.getBoundingClientRect
    ? canvas.getBoundingClientRect()
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const nx = ((x - rect.left) / rect.width) * 2 - 1;
  const ny = -(((y - rect.top) / rect.height) * 2 - 1);
  return { x: nx, y: ny };
}

/**
 * Build (or reuse) a THREE.Raycaster aimed from the camera through a screen point.
 * @param {number} x - client X (e.g. touches[0].x or mouseX)
 * @param {number} y - client Y
 * @param {THREE.Camera} camera
 * @param {THREE.Raycaster} [raycaster] - optional raycaster to reuse
 */
function getTouchRaycaster(x, y, camera, raycaster) {
  if (!window.THREE || !window.THREE.Raycaster) {
    debugError('getTouchRaycaster() needs three.js — load THREE before calling it.');
    return null;
  }
  const rc = raycaster || new window.THREE.Raycaster();
  const ndc = _screenToNDC(x, y);
  rc.setFromCamera(new window.THREE.Vector2(ndc.x, ndc.y), camera);
  return rc;
}

/**
 * Project a screen point into the 3D world at depth z (world Z plane).
 * @param {number} x - client X
 * @param {number} y - client Y
 * @param {THREE.Camera} camera
 * @param {number} [z=0] - target world Z
 * @returns {THREE.Vector3|null}
 */
function screenToWorld(x, y, camera, z = 0) {
  if (!window.THREE || !window.THREE.Vector3) {
    debugError('screenToWorld() needs three.js — load THREE before calling it.');
    return null;
  }
  const ndc = _screenToNDC(x, y);
  const v = new window.THREE.Vector3(ndc.x, ndc.y, 0.5);
  v.unproject(camera);
  if (camera.isPerspectiveCamera) {
    v.sub(camera.position).normalize();
    const dist = (z - camera.position.z) / v.z;
    return camera.position.clone().add(v.multiplyScalar(dist));
  }
  v.z = z;
  return v;
}

async function _requestVibrationPermissionCore() {
  try {
    if (!navigator.vibrate) {
      console.warn('⚠️ Vibration API not supported on this device (likely iOS)');
      if (_debugVisible) {
        debugWarn('Vibration API not supported on this device');
      }
      window.vibrationEnabled = false;
      return;
    }

    const vibrateSuccess = navigator.vibrate(1);

    if (vibrateSuccess) {
      window.vibrationEnabled = true;
      console.log('✅ Vibration enabled');
    } else {
      console.warn('⚠️ Vibration API available but vibration failed');
      window.vibrationEnabled = false;
    }

  } catch (error) {
    console.error('Vibration permission error:', error);
    if (_debugVisible) {
      debugError('Vibration permission error:', error);
    }
    window.vibrationEnabled = false;
  }
}

async function _requestTorchPermissionCore() {
  try {
    window.torchError = '';

    if (_torchTrack && _torchTrack.readyState === 'live') {
      _refreshTorchState();
      return true;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      window.torchError = 'getUserMedia is not available in this browser.';
      window.torchEnabled = false;
      return false;
    }

    _torchStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    _torchTrack = _torchStream.getVideoTracks()[0] || null;
    if (!_torchTrack) {
      window.torchError = 'No video track was returned for torch control.';
      window.torchEnabled = false;
      return false;
    }

    _torchVideo = document.createElement('video');
    _torchVideo.muted = true;
    _torchVideo.autoplay = true;
    _torchVideo.playsInline = true;
    _torchVideo.srcObject = _torchStream;

    try {
      await _torchVideo.play();
    } catch (error) {
      console.warn('three-phone: Torch video preview could not play, continuing with live track.', error);
    }

    _refreshTorchState();
    window.torchEnabled = _torchTrack.readyState === 'live';
    console.log('✅ Torch camera stream ready');
    return window.torchEnabled;
  } catch (error) {
    window.torchError = error && error.message ? error.message : String(error);
    console.error('Torch permission error:', error);
    if (_debugVisible) {
      debugError('Torch permission error:', error);
    }
    await stopTorch();
    return false;
  }
}

function _refreshTorchState() {
  window.torchSupported = false;
  window.torchCapability = undefined;

  if (!_torchTrack || _torchTrack.readyState !== 'live') {
    window.torchEnabled = false;
    window.torchActive = false;
    return;
  }

  window.torchEnabled = true;

  if (_torchTrack.getCapabilities) {
    try {
      const capabilities = _torchTrack.getCapabilities();
      window.torchCapability = capabilities ? capabilities.torch : undefined;
      window.torchSupported = _canControlTorch(window.torchCapability);
    } catch (error) {
      window.torchError = error && error.message ? error.message : String(error);
    }
  }

  if (_torchTrack.getSettings) {
    try {
      const settings = _torchTrack.getSettings();
      if (typeof settings.torch === 'boolean') {
        window.torchActive = settings.torch;
      }
    } catch (error) {
      window.torchError = error && error.message ? error.message : String(error);
    }
  }
}

function _canControlTorch(value) {
  if (Array.isArray(value)) {
    return value.includes(true) && value.includes(false);
  }

  return value === true;
}

async function _requestNfcPermissionCore() {
  try {
    if (window.nfcEnabled && _nfcReader) {
      return true;
    }

    window.nfcError = '';
    window.nfcStatus = 'starting';

    if (!('NDEFReader' in window)) {
      console.warn('⚠️ Web NFC API not supported on this device/browser (Android Chrome 89+ required)');
      if (_debugVisible) {
        debugWarn('Web NFC not supported on this device/browser');
      }
      window.nfcEnabled = false;
      window.nfcStatus = 'unsupported';
      window.nfcError = window.isSecureContext === false
        ? 'NFC requires HTTPS. Serve this sketch from an HTTPS URL, not plain HTTP.'
        : 'Web NFC is not supported in this browser. Use Android Chrome 89+ over HTTPS.';
      return false;
    }

    window.nfcStatus = 'requesting-permission';
    _nfcAbortController = new AbortController();
    _nfcReader = new NDEFReader();

    _nfcReader.onreading = (event) => {
      const serialNumber = event.serialNumber || '';
      const decoder = new TextDecoder();
      const records = [];

      for (const record of event.message.records) {
        const entry = {
          recordType: record.recordType,
          mediaType: record.mediaType || null,
          id: record.id || null,
          data: null,
          raw: record.data
        };

        if (record.recordType === 'text' || record.recordType === 'url') {
          entry.data = decoder.decode(record.data);
        } else if (record.recordType === 'mime' && record.mediaType) {
          try {
            const text = decoder.decode(record.data);
            if (record.mediaType.includes('json')) {
              entry.data = JSON.parse(text);
            } else {
              entry.data = text;
            }
          } catch (e) {
            entry.data = record.data;
          }
        } else {
          entry.data = record.data;
        }

        records.push(entry);
      }

      const alias = getNfcTagAlias(serialNumber);
      const message = { serialNumber: serialNumber, alias: alias, records: records };
      window.lastNfcMessage = message;
      window.lastNfcSerialNumber = serialNumber;
      window.lastNfcAlias = alias;
      window.nfcStatus = 'tag-read';
      window.nfcError = '';

      if (typeof nfcRead === 'function') {
        nfcRead(message, serialNumber);
      }

      console.log('NFC tag read — serial:', serialNumber, 'records:', records.length);
      if (_debugVisible) {
        debug('NFC tag read: ' + serialNumber);
      }
    };

    _nfcReader.onreadingerror = (event) => {
      console.warn('⚠️ NFC read error — tag may be incompatible or out of range');
      window.nfcError = 'NFC read error. Make sure the tag is NDEF formatted and hold it near the phone NFC antenna.';
      if (_debugVisible) {
        debugWarn('NFC read error — tag incompatible or out of range');
      }
    };

    await _nfcReader.scan({ signal: _nfcAbortController.signal });
    window.nfcEnabled = true;
    window.nfcStatus = 'scanning';
    console.log('✅ NFC scanning active');
    return true;

  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.warn('⚠️ NFC permission denied by user');
      window.nfcStatus = 'permission-denied';
      window.nfcError = 'NFC permission was denied. Reload and tap Allow if Chrome asks.';
      if (_debugVisible) {
        debugWarn('NFC permission denied');
      }
    } else if (error.name === 'NotSupportedError') {
      console.warn('⚠️ NFC not supported on this device');
      window.nfcStatus = 'unsupported';
      window.nfcError = 'NFC is not supported on this device/browser, or this page is not using HTTPS.';
      if (_debugVisible) {
        debugWarn('NFC not supported on this device');
      }
    } else if (error.name === 'SecurityError') {
      console.warn('⚠️ NFC requires a secure HTTPS context');
      window.nfcStatus = 'secure-context-required';
      window.nfcError = 'NFC requires HTTPS. Serve this sketch from an HTTPS URL, not plain HTTP.';
      if (_debugVisible) {
        debugWarn('NFC requires HTTPS');
      }
    } else {
      console.error('NFC permission error:', error);
      window.nfcStatus = 'error';
      window.nfcError = error && error.message ? error.message : 'NFC could not start.';
      if (_debugVisible) {
        debugError('NFC error: ' + error.message);
      }
    }
    window.nfcEnabled = false;
    _nfcReader = null;
    _nfcAbortController = null;
    return false;
  }
}

// =========================================
// BLUETOOTH LOW ENERGY (Web Bluetooth)
// Typed characteristics, little-endian wire format.
// =========================================

function _bleDeriveUUID(serviceUUID, index) {
  const normalized = String(serviceUUID).toLowerCase();
  const parts = normalized.split('-');
  if (parts.length !== 5 || parts[0].length < 4) {
    return normalized;
  }
  parts[0] = parts[0].slice(0, -4) + index.toString(16).padStart(4, '0');
  return parts.join('-');
}

function isBleSupported() {
  if (window.isSecureContext === false) {
    window.bleSupported = false;
    window.bleStatus = 'unsupported';
    window.bleError = 'Web Bluetooth requires HTTPS. Serve this sketch from an HTTPS URL, not plain HTTP.';
    return false;
  }

  if (!('bluetooth' in navigator)) {
    window.bleSupported = false;
    window.bleStatus = 'unsupported';
    window.bleError =
      'Web Bluetooth is unavailable. Use Chrome/Edge on desktop or Chrome on Android, ' +
      'over HTTPS. On iPhone/iPad, install the free "Bluefy" browser app and open this ' +
      'page there.';
    return false;
  }

  window.bleSupported = true;
  if (window.bleStatus === 'unsupported') {
    window.bleStatus = 'idle';
    window.bleError = '';
  }
  return true;
}

function bleSetup(config) {
  if (!config || !Array.isArray(config.characteristics) || config.characteristics.length === 0) {
    debugError('bleSetup() requires a characteristics array with at least one entry.');
    return false;
  }

  const serviceUUID = (config.serviceUUID || _BLE_DEFAULT_SERVICE_UUID).toLowerCase();
  const characteristics = [];
  const seenNames = new Set();

  const uuidParts = serviceUUID.split('-');
  if (uuidParts.length !== 5 || uuidParts[0].length < 4) {
    debugWarn('bleSetup(): serviceUUID should be a hyphenated 128-bit UUID; auto-derivation requires that format.');
  }

  for (let i = 0; i < config.characteristics.length; i++) {
    const entry = config.characteristics[i];
    const name = entry && entry.name;
    const type = entry && entry.type;

    if (!name || typeof name !== 'string') {
      debugError('bleSetup(): each characteristic needs a name string.');
      return false;
    }
    if (seenNames.has(name)) {
      debugError('bleSetup(): duplicate characteristic name "' + name + '".');
      return false;
    }
    seenNames.add(name);
    if (!_BLE_VALID_TYPES.has(type)) {
      debugError('bleSetup(): unknown type "' + type + '" for "' + name + '".');
      return false;
    }
    if (!entry.read && !entry.write && !entry.notify) {
      debugError('bleSetup(): characteristic "' + name + '" needs read, write, and/or notify.');
      return false;
    }
    if (entry.read && !entry.write && !entry.notify) {
      debugWarn('bleSetup(): "' + name + '" is read-only; call bleRead("' + name + '") to poll values.');
    }

    characteristics.push({
      name: name,
      uuid: (entry.uuid || _bleDeriveUUID(serviceUUID, i + 1)).toLowerCase(),
      type: type,
      read: !!entry.read,
      write: !!entry.write,
      notify: !!entry.notify
    });
  }

  _bleProfile = {
    serviceUUID: serviceUUID,
    namePrefix: config.namePrefix || '',
    autoReconnect: config.autoReconnect === true,
    characteristics: characteristics
  };

  window.bleValues = {};
  window.bleStatus = isBleSupported() ? 'idle' : 'unsupported';
  debug('BLE profile ready: ' + characteristics.length + ' characteristic(s)');
  return true;
}

function _bleEncode(type, value) {
  let view;
  switch (type) {
    case 'bool':
      view = new DataView(new ArrayBuffer(1));
      view.setUint8(0, value ? 1 : 0);
      return view.buffer;
    case 'int8':
      view = new DataView(new ArrayBuffer(1));
      view.setInt8(0, value);
      return view.buffer;
    case 'uint8':
      view = new DataView(new ArrayBuffer(1));
      view.setUint8(0, value);
      return view.buffer;
    case 'int16':
      view = new DataView(new ArrayBuffer(2));
      view.setInt16(0, value, true);
      return view.buffer;
    case 'uint16':
      view = new DataView(new ArrayBuffer(2));
      view.setUint16(0, value, true);
      return view.buffer;
    case 'int32':
      view = new DataView(new ArrayBuffer(4));
      view.setInt32(0, value, true);
      return view.buffer;
    case 'uint32':
      view = new DataView(new ArrayBuffer(4));
      view.setUint32(0, value, true);
      return view.buffer;
    case 'float':
      view = new DataView(new ArrayBuffer(4));
      view.setFloat32(0, value, true);
      return view.buffer;
    case 'double':
      view = new DataView(new ArrayBuffer(8));
      view.setFloat64(0, value, true);
      return view.buffer;
    case 'string':
      return new TextEncoder().encode(String(value));
    case 'bytes':
      if (value instanceof ArrayBuffer) return value;
      if (ArrayBuffer.isView(value)) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
      return value;
    default:
      return new ArrayBuffer(0);
  }
}

function _bleDecode(type, dataView) {
  switch (type) {
    case 'bool':
      return dataView.getUint8(0) !== 0;
    case 'int8':
      return dataView.getInt8(0);
    case 'uint8':
      return dataView.getUint8(0);
    case 'int16':
      return dataView.getInt16(0, true);
    case 'uint16':
      return dataView.getUint16(0, true);
    case 'int32':
      return dataView.getInt32(0, true);
    case 'uint32':
      return dataView.getUint32(0, true);
    case 'float':
      return dataView.getFloat32(0, true);
    case 'double':
      return dataView.getFloat64(0, true);
    case 'string': {
      const decoded = new TextDecoder().decode(dataView);
      if (decoded.length > 20) {
        debugWarn('BLE notified string exceeds 20 bytes; phase 1 may truncate or miss data.');
      }
      return decoded;
    }
    case 'bytes':
      return new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
    default:
      return undefined;
  }
}

function _bleHandleNotify(name, type, event) {
  const value = _bleDecode(type, event.target.value);
  window.bleValues[name] = value;
  debug('BLE ' + name + ' = ' + value);
  if (typeof bleReceive === 'function') {
    bleReceive(name, value);
  }
}

function _bleDetachNotificationListeners() {
  for (const name in _bleNotifyHandlers) {
    const entry = _bleNotifyHandlers[name];
    if (entry && entry.ch && entry.handler) {
      entry.ch.removeEventListener('characteristicvaluechanged', entry.handler);
    }
  }
  _bleNotifyHandlers = {};
}

async function _bleAttachCharacteristics(service) {
  _bleDetachNotificationListeners();
  _bleChars = {};
  for (const c of _bleProfile.characteristics) {
    const ch = await service.getCharacteristic(c.uuid);
    _bleChars[c.name] = { ch: ch, type: c.type };
    if (c.notify) {
      await ch.startNotifications();
      const handler = (e) => {
        _bleHandleNotify(c.name, c.type, e);
      };
      ch.addEventListener('characteristicvaluechanged', handler);
      _bleNotifyHandlers[c.name] = { ch: ch, handler: handler };
    }
  }
}

function _bleScheduleReconnect() {
  if (!_bleProfile || !_bleProfile.autoReconnect || !_bleDevice || _bleReconnectStopped) {
    return;
  }
  if (_bleReconnectTimer) {
    clearTimeout(_bleReconnectTimer);
  }
  const delay = _BLE_RECONNECT_DELAYS[
    Math.min(_bleReconnectAttempt, _BLE_RECONNECT_DELAYS.length - 1)
  ];
  _bleReconnectTimer = setTimeout(async () => {
    _bleReconnectTimer = null;
    if (!_bleDevice || !_bleDevice.gatt || _bleReconnectStopped) {
      return;
    }
    try {
      window.bleStatus = 'connecting';
      _bleServer = await _bleDevice.gatt.connect();
      const service = await _bleServer.getPrimaryService(_bleProfile.serviceUUID);
      await _bleAttachCharacteristics(service);
      window.bleConnected = true;
      window.bleStatus = 'connected';
      _bleReconnectAttempt = 0;
      debug('BLE reconnected: ' + (window.bleDeviceName || 'device'));
      if (typeof bleReady === 'function') {
        bleReady(window.bleDeviceName);
      }
    } catch (e) {
      _bleReconnectAttempt++;
      window.bleStatus = 'disconnected';
      debugWarn('BLE auto-reconnect failed (attempt ' + _bleReconnectAttempt + ')');
      _bleScheduleReconnect();
    }
  }, delay);
}

async function bleConnect() {
  if (!isBleSupported()) {
    debugError(window.bleError || 'Web Bluetooth is not supported.');
    return false;
  }
  if (!_bleProfile) {
    debugError('Call bleSetup() in setup() before bleConnect().');
    return false;
  }

  try {
    if (navigator.bluetooth.getAvailability) {
      const available = await navigator.bluetooth.getAvailability();
      if (!available) {
        window.bleStatus = 'error';
        window.bleError = 'Bluetooth adapter is unavailable or powered off.';
        debugError(window.bleError);
        return false;
      }
    }

    window.bleStatus = 'requesting';
    window.bleError = '';

    const filters = _bleProfile.namePrefix
      ? [{ namePrefix: _bleProfile.namePrefix, services: [_bleProfile.serviceUUID] }]
      : [{ services: [_bleProfile.serviceUUID] }];

    _bleDevice = await navigator.bluetooth.requestDevice({
      filters: filters,
      optionalServices: [_bleProfile.serviceUUID]
    });

    _bleDevice.addEventListener('gattserverdisconnected', _bleOnDisconnected);

    window.bleStatus = 'connecting';
    _bleServer = await _bleDevice.gatt.connect();
    const service = await _bleServer.getPrimaryService(_bleProfile.serviceUUID);
    await _bleAttachCharacteristics(service);

    window.bleConnected = true;
    window.bleStatus = 'connected';
    window.bleDeviceName = _bleDevice.name || 'device';
    _bleReconnectStopped = false;
    _bleReconnectAttempt = 0;
    debug('BLE connected: ' + window.bleDeviceName);
    if (typeof bleReady === 'function') {
      bleReady(window.bleDeviceName);
    }
    return true;
  } catch (err) {
    if (err.name === 'NotFoundError') {
      window.bleStatus = 'idle';
      window.bleError = '';
      debug('BLE device picker cancelled.');
      return false;
    }
    window.bleStatus = 'error';
    window.bleConnected = false;
    window.bleError = err && err.message ? err.message : 'BLE connect failed.';
    debugError('BLE connect failed: ' + window.bleError);
    return false;
  }
}

function _bleOnDisconnected() {
  window.bleConnected = false;
  window.bleStatus = 'disconnected';
  _bleServer = null;
  _bleDetachNotificationListeners();
  _bleChars = {};
  debugWarn('BLE disconnected');
  if (typeof bleClosed === 'function') {
    bleClosed();
  }

  if (_bleProfile && _bleProfile.autoReconnect && _bleDevice && !_bleReconnectStopped) {
    _bleScheduleReconnect();
  }
}

function bleDisconnect() {
  _bleReconnectStopped = true;
  _bleReconnectAttempt = 0;
  if (_bleReconnectTimer) {
    clearTimeout(_bleReconnectTimer);
    _bleReconnectTimer = null;
  }
  if (_bleDevice && _bleDevice.gatt && _bleDevice.gatt.connected) {
    _bleDevice.gatt.disconnect();
  }
  window.bleConnected = false;
  window.bleStatus = 'idle';
  _bleServer = null;
  _bleDetachNotificationListeners();
  _bleChars = {};
  debug('BLE disconnected by sketch');
}

async function bleRead(name) {
  const entry = _bleChars[name];
  if (!entry) {
    debugError('BLE no characteristic named "' + name + '"');
    return undefined;
  }
  const profileEntry = _bleProfile && _bleProfile.characteristics.find((c) => c.name === name);
  if (!profileEntry || !profileEntry.read) {
    debugError('BLE characteristic "' + name + '" is not declared with read: true');
    return undefined;
  }
  try {
    const dataView = await entry.ch.readValue();
    const value = _bleDecode(entry.type, dataView);
    window.bleValues[name] = value;
    debug('BLE read ' + name + ' = ' + value);
    if (typeof bleReceive === 'function') {
      bleReceive(name, value);
    }
    return value;
  } catch (err) {
    debugError('BLE read "' + name + '" failed: ' + (err && err.message ? err.message : err));
    return undefined;
  }
}

async function bleWrite(name, value, opts = {}) {
  const entry = _bleChars[name];
  if (!entry) {
    debugError('BLE no characteristic named "' + name + '"');
    return false;
  }
  if (entry.type === 'string') {
    const byteLength = new TextEncoder().encode(String(value)).byteLength;
    if (byteLength > 20) {
      debugWarn('BLE write string exceeds 20 bytes; many peripherals truncate without MTU negotiation.');
    }
  }
  const data = _bleEncode(entry.type, value);
  try {
    if (opts.ack === false) {
      await entry.ch.writeValueWithoutResponse(data);
    } else {
      await entry.ch.writeValueWithResponse(data);
    }
    return true;
  } catch (err) {
    debugError('BLE write "' + name + '" failed: ' + (err && err.message ? err.message : err));
    return false;
  }
}

function _normalizePermissionList(permissions) {
  const aliasMap = {
    sensor: 'sensors',
    sensors: 'sensors',
    motion: 'sensors',
    orientation: 'sensors',
    gyro: 'sensors',
    gyroscope: 'sensors',
    accelerometer: 'sensors',
    mic: 'mic',
    microphone: 'mic',
    audioin: 'mic',
    sound: 'sound',
    audio: 'sound',
    audiooutput: 'sound',
    output: 'sound',
    speech: 'speech',
    voice: 'speech',
    recognition: 'speech',
    vibration: 'vibration',
    vibrate: 'vibration',
    haptic: 'vibration',
    haptics: 'vibration',
    torch: 'torch',
    flashlight: 'torch',
    flash: 'torch',
    light: 'torch',
    nfc: 'nfc',
    tag: 'nfc',
    tags: 'nfc',
    geo: 'geo',
    gps: 'geo',
    location: 'geo',
    geolocation: 'geo',
    camera: 'camera',
    video: 'camera',
    webcam: 'camera'
  };

  const source = Array.isArray(permissions)
    ? permissions
    : (typeof permissions === 'string' ? permissions.split(/[\s,]+/) : []);
  const normalized = [];

  for (const permission of source) {
    const key = String(permission).trim().toLowerCase().replace(/[-_]/g, '');
    if (!key) continue;

    if (key === 'all') {
      for (const defaultPermission of ['sensors', 'mic']) {
        if (!normalized.includes(defaultPermission)) {
          normalized.push(defaultPermission);
        }
      }
      continue;
    }

    const normalizedPermission = aliasMap[key];
    if (!normalizedPermission) {
      console.warn('three-phone: Unknown permission type:', permission);
      continue;
    }

    if (!normalized.includes(normalizedPermission)) {
      normalized.push(normalizedPermission);
    }
  }

  if (normalized.length === 0) {
    console.warn('three-phone: No valid permission types provided. Use sensors, mic, sound, speech, vibration, torch, nfc, geo, or camera.');
  }

  return normalized;
}

async function _requestPermissionsCore(permissions) {
  const normalized = _normalizePermissionList(permissions);

  for (const permission of normalized) {
    if (permission === 'sensors') {
      await _requestMotionPermissionsCore();
    } else if (permission === 'mic') {
      await _requestMicrophonePermissionsCore();
    } else if (permission === 'sound') {
      await _requestSoundOutputCore();
    } else if (permission === 'speech') {
      await _requestSpeechPermissionCore();
    } else if (permission === 'vibration') {
      await _requestVibrationPermissionCore();
    } else if (permission === 'torch') {
      await _requestTorchPermissionCore();
    } else if (permission === 'nfc') {
      await _requestNfcPermissionCore();
    } else if (permission === 'geo') {
      await _requestGeoPermissionCore();
    } else if (permission === 'camera') {
      await _requestCameraPermissionCore();
    }
  }

  return normalized;
}

// Wrapped versions that notify the sketch (used by single-permission functions).
async function _requestMotionPermissions() {
  await _requestMotionPermissionsCore();
  _notifySketchReady();
}

async function _requestMicrophonePermissions() {
  await _requestMicrophonePermissionsCore();
  _notifySketchReady();
}

async function _requestSoundOutput() {
  await _requestSoundOutputCore();
  _notifySketchReady();
}

async function _requestSpeechPermission() {
  await _requestSpeechPermissionCore();
  _notifySketchReady();
}

async function _requestVibrationPermission() {
  await _requestVibrationPermissionCore();
  _notifySketchReady();
}

async function _requestTorchPermission() {
  const enabled = await _requestTorchPermissionCore();
  _notifySketchReady();
  return enabled;
}

async function _requestNfcPermission() {
  const enabled = await _requestNfcPermissionCore();
  _notifySketchReady();
  return enabled;
}

async function _requestGeoPermission() {
  const enabled = await _requestGeoPermissionCore();
  _notifySketchReady();
  return enabled;
}

async function _requestCameraPermission() {
  const enabled = await _requestCameraPermissionCore();
  _notifySketchReady();
  return enabled;
}

function _notifySketchReady() {
  if (typeof userSetupComplete === 'function') {
    userSetupComplete();
  }

  window.dispatchEvent(new CustomEvent('permissionsReady', {
    detail: {
      sensors: window.sensorsEnabled,
      microphone: window.micEnabled,
      sound: window.soundEnabled,
      speech: window.speechEnabled,
      vibration: window.vibrationEnabled,
      torch: window.torchEnabled,
      nfc: window.nfcEnabled,
      geo: window.geoEnabled,
      camera: window.cameraEnabled,
      gestures: window.gesturesLocked
    }
  }));
}

// =========================================
// UI CREATION HELPERS
// =========================================

function _createPermissionButton(buttonText, statusText, onClickHandler) {
  _removeExistingUI();
  let activating = false;

  const button = document.createElement('button');
  button.id = 'permissionButton';
  button.textContent = buttonText;
  button.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px 40px;
    font-size: 18px;
    font-weight: bold;
    background: linear-gradient(135deg, #7c4dff 0%, #6a1b9a 100%);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    transition: transform 0.2s ease;
    touch-action: manipulation;
  `;

  const status = document.createElement('div');
  status.id = 'permissionStatus';
  status.textContent = statusText;
  status.style.cssText = `
    position: fixed;
    top: 60%;
    left: 50%;
    transform: translate(-50%, 0);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-align: center;
    z-index: 999998;
    display: none;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translate(-50%, -50%) scale(1.05)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translate(-50%, -50%) scale(1)';
  });

  const handleButtonClick = async () => {
    if (!activating && button.parentNode) {
      activating = true;
      button.style.display = 'none';
      status.style.display = 'block';

      await onClickHandler();

      status.style.display = 'none';
      _removeExistingUI();
    }
  };

  button.addEventListener('click', handleButtonClick);
  button.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleButtonClick();
  });
  button.addEventListener('pointerup', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleButtonClick();
  });

  document.body.appendChild(button);
  document.body.appendChild(status);
}

function _createTapToEnable(message, onTapHandler) {
  _removeExistingUI();
  let activating = false;

  const overlay = document.createElement('div');
  overlay.id = 'tapOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    cursor: pointer;
    touch-action: manipulation;
  `;

  const messageDiv = document.createElement('div');
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    color: white;
    font-size: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-align: center;
    padding: 40px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  `;

  overlay.appendChild(messageDiv);

  const handleActivation = async () => {
    if (!activating && overlay.parentNode) {
      activating = true;
      messageDiv.textContent = 'Enabling...';
      await onTapHandler();
      if (overlay.parentNode) {
        document.body.removeChild(overlay);
      }
    }
  };

  overlay.addEventListener('click', handleActivation);
  overlay.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleActivation();
  });
  overlay.addEventListener('pointerup', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleActivation();
  });

  document.body.appendChild(overlay);
}

function _removeExistingUI() {
  const button = document.getElementById('permissionButton');
  const status = document.getElementById('permissionStatus');
  const overlay = document.getElementById('tapOverlay');
  const banner = document.getElementById('permissionBanner');
  const hint = document.getElementById('permissionHint');

  if (button) button.remove();
  if (status) status.remove();
  if (overlay) overlay.remove();
  if (banner) banner.remove();
  if (hint) hint.remove();
}

// =========================================
// ALTERNATIVE UI STYLES
// =========================================

/**
 * Canvas-first-touch: permissions fire on the first touch/click on the three.js
 * canvas. No blocking overlay; an optional DOM hint floats over the canvas.
 * @param {string|null} message - Optional hint text (or null for no hint)
 * @param {function} onActivateHandler - Async permission handler
 */
function _createCanvasToEnable(message, onActivateHandler) {
  _removeExistingUI();

  let activated = false;
  let canvasWaitTimer = null;
  let documentFallbackAttached = false;
  let hintEl = null;
  const maxAttempts = 50;
  let attempts = 0;

  const removeHint = () => {
    if (hintEl && hintEl.parentNode) hintEl.remove();
    hintEl = null;
  };

  const cleanupListeners = () => {
    if (canvasWaitTimer) {
      clearTimeout(canvasWaitTimer);
      canvasWaitTimer = null;
    }
    document.removeEventListener('touchstart', handleFirstInteraction, true);
    document.removeEventListener('mousedown', handleFirstInteraction, true);
  };

  // Show an optional floating hint (three.js has no built-in text drawing, so
  // this is a DOM overlay rather than something painted on the canvas).
  if (message) {
    hintEl = document.createElement('div');
    hintEl.id = 'permissionHint';
    hintEl.textContent = message;
    hintEl.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: 8%;
      transform: translateX(-50%);
      color: white;
      font-size: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.55);
      border-radius: 8px;
      z-index: 999999;
      pointer-events: none;
      text-align: center;
    `;
    document.body.appendChild(hintEl);
  }

  const handleFirstInteraction = async () => {
    if (activated) return;
    activated = true;

    removeHint();
    cleanupListeners();

    await onActivateHandler();
  };

  const attachDocumentFallback = () => {
    if (documentFallbackAttached) return;
    documentFallbackAttached = true;
    document.addEventListener('touchstart', handleFirstInteraction, { once: true, capture: true });
    document.addEventListener('mousedown', handleFirstInteraction, { once: true, capture: true });
  };

  const waitForCanvas = () => {
    attempts++;
    const canvas = _findThreeCanvas();
    if (canvas) {
      canvas.addEventListener('touchstart', handleFirstInteraction, { once: true, capture: true });
      canvas.addEventListener('mousedown', handleFirstInteraction, { once: true, capture: true });
    } else if (attempts < maxAttempts) {
      attachDocumentFallback();
      canvasWaitTimer = setTimeout(waitForCanvas, 50);
    } else {
      attachDocumentFallback();
      debugWarn('three-phone: canvas not found after waiting; using document fallback for permission tap.');
    }
  };

  waitForCanvas();
}

/**
 * Banner UI: a slim notification-style banner at top or bottom of screen.
 */
function _createBannerToEnable(message, position, onActivateHandler) {
  _removeExistingUI();
  let activating = false;

  const banner = document.createElement('div');
  banner.id = 'permissionBanner';

  const isTop = position === 'top';
  banner.style.cssText = `
    position: fixed;
    ${isTop ? 'top: 0;' : 'bottom: 0;'}
    left: 0;
    width: 100%;
    padding: 16px 20px;
    background: linear-gradient(135deg, #7c4dff 0%, #6a1b9a 100%);
    color: white;
    font-size: 16px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-align: center;
    z-index: 999999;
    cursor: pointer;
    touch-action: manipulation;
    box-shadow: ${isTop ? '0 2px 10px rgba(0,0,0,0.3)' : '0 -2px 10px rgba(0,0,0,0.3)'};
    transition: opacity 0.3s ease, transform 0.3s ease;
    transform: translateY(${isTop ? '-100%' : '100%'});
  `;

  banner.textContent = message;
  document.body.appendChild(banner);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.style.transform = 'translateY(0)';
    });
  });

  const handleActivation = async () => {
    if (activating || !banner.parentNode) return;
    activating = true;

    banner.textContent = 'Enabling...';
    banner.style.pointerEvents = 'none';

    await onActivateHandler();

    banner.style.transform = `translateY(${isTop ? '-100%' : '100%'})`;
    banner.style.opacity = '0';
    setTimeout(() => {
      if (banner.parentNode) banner.remove();
    }, 300);
  };

  banner.addEventListener('click', handleActivation);
  banner.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleActivation();
  });
  banner.addEventListener('pointerup', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleActivation();
  });
}

/**
 * Custom element binding: attach a permission trigger to any existing element.
 */
function _bindPermissionTo(selector, onActivateHandler) {
  let activated = false;

  const attach = () => {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`three-phone: Element "${selector}" not found. Retrying...`);
      setTimeout(attach, 100);
      return;
    }

    const handleActivation = async () => {
      if (activated) return;
      activated = true;

      await onActivateHandler();
    };

    element.addEventListener('click', handleActivation);
    element.addEventListener('touchend', function(e) {
      e.preventDefault();
      e.stopPropagation();
      handleActivation();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
}

// =========================================
// GESTURE BLOCKING IMPLEMENTATION
// =========================================

function _lockGesturesEmbedded(target) {
  _gestureLockState.appliedStyles.touchAction = target.style.touchAction;
  target.style.touchAction = 'none';

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartedOnTarget = false;

  const touchStartHandler = function(e) {
    touchStartedOnTarget = target.contains(e.target);
    if (!touchStartedOnTarget || !e.touches || e.touches.length === 0) return;

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const touchMoveHandler = function(e) {
    if (!touchStartedOnTarget || !target.contains(e.target)) return;
    if (!e.touches || e.touches.length === 0) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY;

    if (window.pageYOffset === 0 && deltaY > 0) {
      e.preventDefault();
      return;
    }

    if (_isPermissionUIElement(e.target)) return;

    e.preventDefault();
  };

  let lastTouchEnd = 0;
  const touchEndHandler = function(e) {
    if (!touchStartedOnTarget || !target.contains(e.target)) return;
    if (_isPermissionUIElement(e.target)) return;

    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };

  const gestureHandler = function(e) {
    if (target.contains(e.target)) {
      e.preventDefault();
    }
  };

  const contextMenuHandler = function(e) {
    if (target.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const captureOptions = { passive: false, capture: true };
  _addTrackedListener(target, 'touchstart', touchStartHandler, captureOptions);
  _addTrackedListener(target, 'touchmove', touchMoveHandler, captureOptions);
  _addTrackedListener(target, 'touchend', touchEndHandler, false);
  _addTrackedListener(target, 'gesturestart', gestureHandler, false);
  _addTrackedListener(target, 'gesturechange', gestureHandler, false);
  _addTrackedListener(target, 'gestureend', gestureHandler, false);
  _addTrackedListener(target, 'contextmenu', contextMenuHandler, false);
}

function _lockGesturesFullscreen(options) {
  const { warnBeforeLeave, trapHistory } = options;

  if (trapHistory) {
    _gestureLockState.savedHandlers.onpopstate = window.onpopstate;
    window.history.pushState(null, '', window.location.href);
    _gestureLockState.historyTrapped = true;

    const popstateHandler = function() {
      window.history.pushState(null, '', window.location.href);
    };
    window.onpopstate = popstateHandler;
  }

  if (warnBeforeLeave) {
    const beforeUnloadHandler = function(e) {
      e.preventDefault();
      e.returnValue = '';
    };
    _addTrackedListener(window, 'beforeunload', beforeUnloadHandler, false);
  }

  let touchStartX = 0;
  let touchStartY = 0;
  const edgeThreshold = 20;

  const touchStartHandler = function(e) {
    if (e.touches && e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;

      if (touchStartX < edgeThreshold ||
          touchStartX > window.innerWidth - edgeThreshold) {
        e.preventDefault();
      }
    }
  };

  const touchMoveHandler = function(e) {
    if (!e.touches || e.touches.length === 0) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;

    if ((touchStartX < edgeThreshold && deltaX > 0) ||
        (touchStartX > window.innerWidth - edgeThreshold && deltaX < 0)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (window.pageYOffset === 0 && deltaY > 0) {
      e.preventDefault();
    }

    if (e.target && e.target.tagName === 'CANVAS' &&
        !document.getElementById('tapOverlay') &&
        !document.getElementById('permissionButton')) {
      e.preventDefault();
    }
  };

  const captureOptions = { passive: false, capture: true };
  _addTrackedListener(document, 'touchstart', touchStartHandler, captureOptions);
  _addTrackedListener(document, 'touchmove', touchMoveHandler, captureOptions);

  const gestureHandler = function(e) {
    e.preventDefault();
  };
  _addTrackedListener(document, 'gesturestart', gestureHandler, false);
  _addTrackedListener(document, 'gesturechange', gestureHandler, false);
  _addTrackedListener(document, 'gestureend', gestureHandler, false);

  let lastTouchEnd = 0;
  const touchEndHandler = function(e) {
    if (_isPermissionUIElement(e.target)) return;

    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };
  _addTrackedListener(document, 'touchend', touchEndHandler, false);

  _gestureLockState.savedHandlers.oncontextmenu = window.oncontextmenu;
  window.oncontextmenu = function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };
}

// =========================================
// DEBUG SYSTEM - ON-SCREEN CONSOLE
// =========================================

let _debugPanel = null;
let _debugVisible = false;
let _debugMessages = [];
const MAX_DEBUG_MESSAGES = 20;

/**
 * Show the on-screen debug panel
 */
function showDebug() {
  _createDebugPanel();
  _debugPanel.style.display = 'block';
  _debugVisible = true;
  window._debugVisible = true;

  _setupConsoleOverrides();
  _displayEarlyErrors();
}

/**
 * Hide the on-screen debug panel
 */
function hideDebug() {
  if (_debugPanel) {
    _debugPanel.style.display = 'none';
    _debugVisible = false;
  }
}

/**
 * Toggle the debug panel visibility
 */
function toggleDebug() {
  if (_debugVisible) {
    hideDebug();
  } else {
    showDebug();
  }
}

/**
 * Debug function - works like console.log but shows on screen.
 */
function debug(...args) {
  console.log(...args);

  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  _addDebugMessage(message, 'log');
}

/**
 * Error function - shows errors on screen with red styling.
 */
function debugError(...args) {
  const originalError = window._originalConsoleError || console.error;
  originalError.apply(console, args);

  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  _addDebugMessage(`❌ ERROR: ${message}`, 'error');
}

/**
 * Warning function - shows warnings on screen with yellow styling.
 */
function debugWarn(...args) {
  const originalWarn = window._originalConsoleWarn || console.warn;
  originalWarn.apply(console, args);

  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  _addDebugMessage(`⚠️ WARNING: ${message}`, 'warning');
}

function _addDebugMessage(message, type = 'log') {
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });

  const timestampedMessage = {
    text: `[${timestamp}] ${message}`,
    type: type
  };

  _debugMessages.push(timestampedMessage);
  if (_debugMessages.length > MAX_DEBUG_MESSAGES) {
    _debugMessages.shift();
  }

  if (_debugPanel) {
    _updateDebugDisplay();
  }
}

debug.clear = function() {
  _debugMessages = [];
  if (_debugPanel) {
    _updateDebugDisplay();
  }
  console.clear();
};

function _setupConsoleOverrides() {
  if (window._consoleOverrideSet) return;
  window._consoleOverrideSet = true;

  if (typeof console.error === 'function') {
    window._originalConsoleError = console.error;
  }
  if (typeof console.warn === 'function') {
    window._originalConsoleWarn = console.warn;
  }

  console.error = function(...args) {
    try {
      window._originalConsoleError.apply(console, args);
    } catch (e) { /* prevent override from breaking error flow */ }
    if (_debugVisible) {
      debugError(...args);
    }
  };

  console.warn = function(...args) {
    try {
      window._originalConsoleWarn.apply(console, args);
    } catch (e) { /* prevent override from breaking warn flow */ }
    if (_debugVisible) {
      debugWarn(...args);
    }
  };
}

function _displayEarlyErrors() {
  if (window._earlyErrors && window._earlyErrors.length > 0) {
    debugError(`🚨 Found ${window._earlyErrors.length} early error(s):`);
    window._earlyErrors.forEach(error => {
      debugError(error.message);
      if (error.stack) {
        debugError('Stack trace:', error.stack);
      }
    });
    window._earlyErrors = [];
  }
}

function _createDebugPanel() {
  if (_debugPanel) return;

  _debugPanel = document.createElement('div');
  _debugPanel.id = 'mobile-debug-panel';
  _debugPanel.innerHTML = `
    <div id="mobile-debug-header">
      <span>Debug</span>
      <button id="mobile-debug-close">×</button>
    </div>
    <div id="mobile-debug-content"></div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #mobile-debug-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      max-width: calc(100vw - 40px);
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: #ffffff;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      display: none;
    }

    #mobile-debug-header {
      background: rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px 8px 0 0;
    }

    #mobile-debug-header span {
      font-weight: bold;
      font-size: 13px;
    }

    #mobile-debug-close {
      background: none;
      border: none;
      color: #ffffff;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #mobile-debug-close:hover {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    #mobile-debug-content {
      padding: 12px;
      max-height: 340px;
      overflow-y: auto;
      word-wrap: break-word;
      line-height: 1.4;
    }

    .debug-message {
      margin-bottom: 4px;
      white-space: pre-wrap;
    }

    .debug-message.error {
      color: #ff6b6b;
      background: rgba(255, 107, 107, 0.1);
      padding: 4px;
      border-radius: 3px;
      border-left: 3px solid #ff6b6b;
    }

    .debug-message.warning {
      color: #ffd93d;
      background: rgba(255, 217, 61, 0.1);
      padding: 4px;
      border-radius: 3px;
      border-left: 3px solid #ffd93d;
    }

    .debug-timestamp {
      color: #888;
      font-size: 10px;
    }

    @media (max-width: 480px) {
      #mobile-debug-panel {
        width: calc(100vw - 20px);
        right: 10px;
        top: 10px;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(_debugPanel);

  document.getElementById('mobile-debug-close').onclick = hideDebug;

  _updateDebugDisplay();
}

function _updateDebugDisplay() {
  if (!_debugPanel) return;

  const content = document.getElementById('mobile-debug-content');
  if (!content) return;

  content.replaceChildren();
  for (const msg of _debugMessages) {
    const div = document.createElement('div');
    div.className = 'debug-message';
    if (typeof msg === 'object' && msg !== null && msg.type) {
      div.classList.add(msg.type);
      div.textContent = msg.text;
    } else {
      div.textContent = typeof msg === 'string' ? msg : String(msg);
    }
    content.appendChild(div);
  }

  content.scrollTop = content.scrollHeight;
}

// =========================================
// PHONE CAMERA - native getUserMedia + three.js VideoTexture
// Same public shape as p5-phone's PhoneCamera, minus p5 internals. Coordinate
// mapping (mapPoint/mapKeypoint/mapBox) matches p5-phone so ml5 code ports over;
// getTexture()/createBackgroundMesh() replace p5's image() override for three.js.
// =========================================

class PhoneCamera {
  constructor(active = 'user', mirror = true, mode = 'fitHeight') {
    this._active = active;
    this._mirror = mirror;
    this._mode = mode;
    this._fixedWidth = 640;
    this._fixedHeight = 480;
    this._video = null;   // native HTMLVideoElement
    this._stream = null;
    this._ready = false;
    this._onReadyCallback = null;
    this._texture = null;
    this._bgMesh = null;
    this._bgWidth = 0;
    this._bgHeight = 0;

    if (!window._phoneCameras) window._phoneCameras = [];
    window._phoneCameras.push(this);
    // Not initialized until an enableCamera* gesture (iOS rotation-bug fix).
  }

  // --- read-only ---
  get ready() { return this._ready; }
  get video() { return this._video; }
  get videoElement() { return this._video; } // native element (ml5-friendly)
  get width() { return this._ready ? this.getDimensions().width : 0; }
  get height() { return this._ready ? this.getDimensions().height : 0; }

  // --- read-write ---
  get active() { return this._active; }
  set active(value) {
    if (value !== 'user' && value !== 'environment') {
      debugError('PhoneCamera: active must be "user" or "environment"');
      return;
    }
    if (this._active !== value) {
      this._active = value;
      if (this._ready || this._video) this._switchCamera();
    }
  }
  get mirror() { return this._mirror; }
  set mirror(value) { this._mirror = !!value; }
  get mode() { return this._mode; }
  set mode(value) {
    const valid = ['fitWidth', 'fitHeight', 'cover', 'contain', 'fixed'];
    if (!valid.includes(value)) {
      debugError('PhoneCamera: mode must be one of: ' + valid.join(', '));
      return;
    }
    this._mode = value;
  }
  get fixedWidth() { return this._fixedWidth; }
  set fixedWidth(value) { this._fixedWidth = Math.max(1, value); }
  get fixedHeight() { return this._fixedHeight; }
  set fixedHeight(value) { this._fixedHeight = Math.max(1, value); }

  onReady(callback) {
    this._onReadyCallback = callback;
    if (this._ready && this._video && this._video.readyState >= 2) {
      callback();
      this._onReadyCallback = null;
    }
  }

  // --- internal ---
  async _initializeCamera() {
    if (this._ready || this._video) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      debugError('PhoneCamera: getUserMedia is not available in this browser.');
      return;
    }
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this._active },
        audio: false
      });
      const v = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.playsInline = true;
      v.muted = true;
      v.autoplay = true;
      v.srcObject = this._stream;
      // Keep it in the DOM (some browsers pause detached video) but invisible.
      v.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(v);
      this._video = v;
      try { await v.play(); } catch (e) { /* will play on loadeddata */ }

      const markReady = () => {
        this._ready = true;
        if (this._onReadyCallback) {
          const cb = this._onReadyCallback;
          this._onReadyCallback = null;
          cb();
        }
      };
      if (v.readyState >= 2) markReady();
      else v.addEventListener('loadeddata', markReady, { once: true });
      console.log('✅ PhoneCamera ready');
    } catch (err) {
      debugError('PhoneCamera init failed: ' + (err && err.message ? err.message : err));
    }
  }

  async _switchCamera() {
    if (this._stream) this._stream.getTracks().forEach(t => t.stop());
    if (this._video && this._video.parentNode) this._video.parentNode.removeChild(this._video);
    if (this._texture && this._texture.dispose) this._texture.dispose();
    this._video = null;
    this._stream = null;
    this._texture = null;
    this._ready = false;
    await this._initializeCamera();
    if (this._bgMesh) {
      this._bgMesh.material.map = this.getTexture();
      this._bgMesh.material.needsUpdate = true;
    }
    console.log('✅ PhoneCamera switched to ' + this._active + ' camera');
  }

  _canvasSize() {
    const c = _findThreeCanvas();
    const w = c ? (c.clientWidth || c.width) : window.innerWidth;
    const h = c ? (c.clientHeight || c.height) : window.innerHeight;
    return { w, h };
  }

  remove() {
    if (this._stream) this._stream.getTracks().forEach(t => t.stop());
    if (this._video && this._video.parentNode) this._video.parentNode.removeChild(this._video);
    if (this._texture && this._texture.dispose) this._texture.dispose();
    this._video = null;
    this._stream = null;
    this._texture = null;
    this._ready = false;
    if (window._phoneCameras && Array.isArray(window._phoneCameras)) {
      const idx = window._phoneCameras.indexOf(this);
      if (idx !== -1) window._phoneCameras.splice(idx, 1);
    }
  }

  /**
   * Dimensions of the video as drawn on the canvas for the current mode.
   * Returns { x, y, width, height, scaleX, scaleY } in canvas (CSS) pixels.
   */
  getDimensions() {
    if (!this._ready || !this._video) {
      return { x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1 };
    }
    const videoWidth = this._video.videoWidth;
    const videoHeight = this._video.videoHeight;
    if (!videoWidth || !videoHeight) {
      return { x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1 };
    }

    const size = this._canvasSize();
    const canvasWidth = size.w;
    const canvasHeight = size.h;
    let drawWidth, drawHeight, drawX, drawY;

    if (this._mode === 'fixed') {
      drawWidth = this._fixedWidth;
      drawHeight = this._fixedHeight;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = (canvasHeight - drawHeight) / 2;
    } else if (this._mode === 'fitWidth') {
      drawWidth = canvasWidth;
      drawHeight = (videoHeight / videoWidth) * drawWidth;
      drawX = 0;
      drawY = (canvasHeight - drawHeight) / 2;
    } else if (this._mode === 'fitHeight') {
      drawHeight = canvasHeight;
      drawWidth = (videoWidth / videoHeight) * drawHeight;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = 0;
    } else if (this._mode === 'cover') {
      const scale = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
      drawWidth = videoWidth * scale;
      drawHeight = videoHeight * scale;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = (canvasHeight - drawHeight) / 2;
    } else { // contain
      const scale = Math.min(canvasWidth / videoWidth, canvasHeight / videoHeight);
      drawWidth = videoWidth * scale;
      drawHeight = videoHeight * scale;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = (canvasHeight - drawHeight) / 2;
    }

    return {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
      scaleX: drawWidth / videoWidth,
      scaleY: drawHeight / videoHeight
    };
  }

  /** Map a video-space point to canvas coordinates (mirror-aware). */
  mapPoint(x, y) {
    const dims = this.getDimensions();
    let scaledX = x * dims.scaleX;
    const scaledY = y * dims.scaleY;
    if (this._mirror) scaledX = dims.width - scaledX;
    return { x: scaledX + dims.x, y: scaledY + dims.y };
  }

  mapKeypoint(keypoint) {
    if (!keypoint || typeof keypoint.x === 'undefined' || typeof keypoint.y === 'undefined') {
      debugWarn('PhoneCamera.mapKeypoint: invalid keypoint');
      return keypoint;
    }
    const mapped = this.mapPoint(keypoint.x, keypoint.y);
    return { ...keypoint, x: mapped.x, y: mapped.y };
  }

  mapKeypoints(keypoints) {
    if (!Array.isArray(keypoints)) {
      debugWarn('PhoneCamera.mapKeypoints: expected array');
      return keypoints;
    }
    return keypoints.map(kp => this.mapKeypoint(kp));
  }

  mapBox(box) {
    if (!box) {
      debugWarn('PhoneCamera.mapBox: invalid box');
      return box;
    }
    const boxX = typeof box.x !== 'undefined' ? box.x : box.xMin;
    const boxY = typeof box.y !== 'undefined' ? box.y : box.yMin;
    const boxWidth = typeof box.width !== 'undefined' ? box.width : box.xMax - box.xMin;
    const boxHeight = typeof box.height !== 'undefined' ? box.height : box.yMax - box.yMin;
    const nx = Number(boxX), ny = Number(boxY), nw = Number(boxWidth), nh = Number(boxHeight);
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nw) || !Number.isFinite(nh)) {
      debugWarn('PhoneCamera.mapBox: invalid box');
      return box;
    }
    const topLeft = this.mapPoint(nx, ny);
    const bottomRight = this.mapPoint(nx + nw, ny + nh);
    const mappedX = Math.min(topLeft.x, bottomRight.x);
    const mappedY = Math.min(topLeft.y, bottomRight.y);
    const mappedWidth = Math.abs(bottomRight.x - topLeft.x);
    const mappedHeight = Math.abs(bottomRight.y - topLeft.y);
    return {
      ...box,
      x: mappedX, y: mappedY, width: mappedWidth, height: mappedHeight,
      xMin: mappedX, yMin: mappedY, xMax: mappedX + mappedWidth, yMax: mappedY + mappedHeight
    };
  }

  mapBoxes(boxes) {
    if (!Array.isArray(boxes)) {
      debugWarn('PhoneCamera.mapBoxes: expected array');
      return boxes;
    }
    return boxes.map(box => this.mapBox(box));
  }

  // --- three.js integration ---

  /** Lazily create (and return) a THREE.VideoTexture for the camera feed. */
  getTexture() {
    if (!window.THREE || !window.THREE.VideoTexture) {
      debugError('PhoneCamera.getTexture() needs three.js — load THREE first.');
      return null;
    }
    if (!this._texture && this._video) {
      this._texture = new window.THREE.VideoTexture(this._video);
      if ('SRGBColorSpace' in window.THREE) this._texture.colorSpace = window.THREE.SRGBColorSpace;
    }
    return this._texture;
  }

  /**
   * Build a screen-filling background mesh (a plane with the camera VideoTexture)
   * for an orthographic overlay whose coordinate space is top-left origin,
   * 0..width by 0..height — the setup the ml5 examples use. Honors mode/mirror.
   * @param {number} [width] - defaults to the current canvas width
   * @param {number} [height] - defaults to the current canvas height
   * @returns {THREE.Mesh|null}
   */
  createBackgroundMesh(width, height) {
    if (!window.THREE || !window.THREE.PlaneGeometry) {
      debugError('PhoneCamera.createBackgroundMesh() needs three.js — load THREE first.');
      return null;
    }
    const size = this._canvasSize();
    const W = width || size.w;
    const H = height || size.h;
    const tex = this.getTexture();
    const geo = new window.THREE.PlaneGeometry(W, H);
    const mat = new window.THREE.MeshBasicMaterial({ map: tex, depthTest: false, depthWrite: false });
    const mesh = new window.THREE.Mesh(geo, mat);
    mesh.position.set(W / 2, H / 2, -10);
    mesh.renderOrder = -1;
    this._bgMesh = mesh;
    this._bgWidth = W;
    this._bgHeight = H;
    this.updateBackground();
    return mesh;
  }

  /** Re-fit the background texture (cover) to the canvas + video aspect. Call on resize. */
  updateBackground() {
    if (!this._bgMesh || !this._video || !window.THREE) return;
    const tex = this._bgMesh.material.map;
    if (!tex || !tex.repeat) return;
    const vw = this._video.videoWidth, vh = this._video.videoHeight;
    if (!vw || !vh) return;
    const Ac = this._bgWidth / this._bgHeight;
    const Av = vw / vh;
    let rx = 1, ry = 1, ox = 0, oy = 0;
    if (Av > Ac) { rx = Ac / Av; ox = (1 - rx) / 2; }
    else { ry = Av / Ac; oy = (1 - ry) / 2; }
    if (this._mirror) { rx = -Math.abs(rx); ox = 1 - ox; }
    tex.wrapS = window.THREE.ClampToEdgeWrapping;
    tex.wrapT = window.THREE.ClampToEdgeWrapping;
    tex.center.set(0.5, 0.5);
    tex.repeat.set(rx, ry);
    tex.offset.set(ox, oy);
    tex.needsUpdate = true;
  }
}

/**
 * Create a new PhoneCamera.
 * @param {string} active - 'user' (front) or 'environment' (back)
 * @param {boolean} mirror - mirror the video horizontally (default true)
 * @param {string} mode - 'fitWidth'|'fitHeight'|'cover'|'contain'|'fixed'
 * @returns {PhoneCamera}
 */
function createPhoneCamera(active = 'user', mirror = true, mode = 'fitHeight') {
  return new PhoneCamera(active, mirror, mode);
}

// =========================================
// GLOBAL EXPORTS
// =========================================

// Debug
window.debug = debug;
window.debugError = debugError;
window.debugWarn = debugWarn;
window.showDebug = showDebug;
window.hideDebug = hideDebug;
window.toggleDebug = toggleDebug;

// Canvas discovery
window.setPhoneCanvas = setPhoneCanvas;

// Gesture locking
window.lockGestures = lockGestures;
window.unlockGestures = unlockGestures;

// Tap + Button styles
window.enableGyroTap = enableGyroTap;
window.enableGyroButton = enableGyroButton;
window.enableSensorTap = enableGyroTap;
window.enableSensorButton = enableGyroButton;
window.enableMicTap = enableMicTap;
window.enableMicButton = enableMicButton;
window.enableSoundTap = enableSoundTap;
window.enableSoundButton = enableSoundButton;
window.enableSpeechTap = enableSpeechTap;
window.enableSpeechButton = enableSpeechButton;
window.enableVibrationTap = enableVibrationTap;
window.enableVibrationButton = enableVibrationButton;
window.enableTorchTap = enableTorchTap;
window.enableTorchButton = enableTorchButton;
window.enableFlashlightTap = enableFlashlightTap;
window.enableFlashlightButton = enableFlashlightButton;
window.enableNfcTap = enableNfcTap;
window.enableNfcButton = enableNfcButton;
window.enableGeoTap = enableGeoTap;
window.enableGeoButton = enableGeoButton;
window.enableCameraTap = enableCameraTap;
window.enableCameraButton = enableCameraButton;
window.enableBleTap = enableBleTap;
window.enableBleButton = enableBleButton;
window.enableAllTap = enableAllTap;
window.enableAllButton = enableAllButton;
window.enablePermissionsTap = enablePermissionsTap;
window.enablePermissionsButton = enablePermissionsButton;
window.enableHardwareTap = enablePermissionsTap;
window.enableHardwareButton = enablePermissionsButton;

// Canvas-first-touch style
window.enableGyroCanvas = enableGyroCanvas;
window.enableSensorCanvas = enableGyroCanvas;
window.enableMicCanvas = enableMicCanvas;
window.enableSoundCanvas = enableSoundCanvas;
window.enableSpeechCanvas = enableSpeechCanvas;
window.enableVibrationCanvas = enableVibrationCanvas;
window.enableTorchCanvas = enableTorchCanvas;
window.enableFlashlightCanvas = enableFlashlightCanvas;
window.enableNfcCanvas = enableNfcCanvas;
window.enableGeoCanvas = enableGeoCanvas;
window.enableBleCanvas = enableBleCanvas;
window.enableAllCanvas = enableAllCanvas;
window.enableCameraCanvas = enableCameraCanvas;
window.enablePermissionsCanvas = enablePermissionsCanvas;
window.enableHardwareCanvas = enablePermissionsCanvas;

// Banner style
window.enableGyroBanner = enableGyroBanner;
window.enableSensorBanner = enableGyroBanner;
window.enableMicBanner = enableMicBanner;
window.enableSoundBanner = enableSoundBanner;
window.enableSpeechBanner = enableSpeechBanner;
window.enableVibrationBanner = enableVibrationBanner;
window.enableTorchBanner = enableTorchBanner;
window.enableFlashlightBanner = enableFlashlightBanner;
window.enableNfcBanner = enableNfcBanner;
window.enableGeoBanner = enableGeoBanner;
window.enableBleBanner = enableBleBanner;
window.enableAllBanner = enableAllBanner;
window.enableCameraBanner = enableCameraBanner;
window.enablePermissionsBanner = enablePermissionsBanner;
window.enableHardwareBanner = enablePermissionsBanner;

// Custom element binding
window.enableGyroOn = enableGyroOn;
window.enableSensorOn = enableGyroOn;
window.enableMicOn = enableMicOn;
window.enableSoundOn = enableSoundOn;
window.enableSpeechOn = enableSpeechOn;
window.enableVibrationOn = enableVibrationOn;
window.enableTorchOn = enableTorchOn;
window.enableFlashlightOn = enableFlashlightOn;
window.enableNfcOn = enableNfcOn;
window.enableGeoOn = enableGeoOn;
window.enableBleOn = enableBleOn;
window.enableAllOn = enableAllOn;
window.enableCameraOn = enableCameraOn;
window.enablePermissionsOn = enablePermissionsOn;
window.enableHardwareOn = enablePermissionsOn;

// Vibration
window.vibrate = vibrate;
window.stopVibration = stopVibration;

// Torch / flashlight
window.isTorchSupported = isTorchSupported;
window.setTorch = setTorch;
window.torchOn = torchOn;
window.torchOff = torchOff;
window.toggleTorch = toggleTorch;
window.stopTorch = stopTorch;
window.setFlashlight = setFlashlight;
window.flashlightOn = flashlightOn;
window.flashlightOff = flashlightOff;
window.toggleFlashlight = toggleFlashlight;
window.stopFlashlight = stopFlashlight;

// NFC
window.stopNfc = stopNfc;
window.setNfcTagAlias = setNfcTagAlias;
window.getNfcTagAlias = getNfcTagAlias;
window.isNfcTag = isNfcTag;

// GPS / geolocation
window.stopGeo = stopGeo;
window.setGeoOptions = setGeoOptions;
window.getGeoPosition = getGeoPosition;
window.geoDistance = geoDistance;
window.geoInPolygon = geoInPolygon;

// BLE
window.isBleSupported = isBleSupported;
window.bleSetup = bleSetup;
window.bleConnect = bleConnect;
window.bleDisconnect = bleDisconnect;
window.bleRead = bleRead;
window.bleWrite = bleWrite;

// Audio (mic metering + audio-context unlock)
window.getAudioContext = getAudioContext;
window.getMicLevel = getMicLevel;
window.getMicStream = getMicStream;

// Motion data + thresholds
window.setMoveThreshold = setMoveThreshold;
window.setShakeThreshold = setShakeThreshold;

// three.js-native motion + input helpers
window.getRotationQuaternion = getRotationQuaternion;
window.getRotationEuler = getRotationEuler;
window.applyDeviceRotation = applyDeviceRotation;
window.getTouchRaycaster = getTouchRaycaster;
window.screenToWorld = screenToWorld;

// Camera (the PhoneCamera engine and camera permission core land in a later commit)
window.createPhoneCamera = createPhoneCamera;

// Install the touch subsystem immediately (no permission needed, like p5).
_installTouchListeners();

if (typeof console !== 'undefined' && console.log) {
  console.log('three-phone ' + window.THREE_PHONE_VERSION + ' loaded');
}
