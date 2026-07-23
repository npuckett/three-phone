# three-phone

**Simplified mobile hardware access for [three.js](https://threejs.org/).** A companion to
[p5-phone](https://github.com/npuckett/p5-phone) — the same permission model and the same
sensor API names, redesigned to drive real 3D scenes.

Point your phone's motion sensors, touch, microphone, camera, GPS, NFC, Bluetooth, torch,
and vibration at a WebGL scene without wrestling with iOS permission prompts, gesture
locking, or `DeviceOrientationEvent` quirks.

- 📚 **Docs & example gallery:** https://npuckett.github.io/three-phone/examples/homepage/
- 🎛️ **p5.js version:** [p5-phone](https://npuckett.github.io/p5-phone/) — the two sites cross-link example by example.

---

## Contents

- [How it loads](#how-it-loads)
- [Quick start](#quick-start)
- [The permission model](#the-permission-model)
- [Status flags](#status-flags)
- [Motion data](#motion-data)
- [Touch & picking](#touch--picking)
- [Microphone, sound & speech](#microphone-sound--speech)
- [Camera (PhoneCamera)](#camera-phonecamera)
- [NFC](#nfc)
- [GPS / geolocation](#gps--geolocation)
- [Bluetooth (BLE)](#bluetooth-ble)
- [Vibration](#vibration)
- [Torch / flashlight](#torch--flashlight)
- [Debug console](#debug-console)
- [Gesture locking](#gesture-locking)
- [Compatibility](#compatibility)
- [Differences from p5-phone](#differences-from-p5-phone)

---

## How it loads

three.js (r161+) is ESM-only — there is no global `<script>` build like p5.js. three-phone
itself **is** a plain classic script that puts everything on `window`, exactly like
p5-phone. three.js is loaded with a standard **import map**, and a tiny loader module makes
`THREE` global before it runs your sketch — so your `sketch.js` stays a beginner-friendly,
non-module script.

```html
<!-- 1) three-phone: plain script, exposes window globals -->
<script src="https://cdn.jsdelivr.net/npm/three-phone@0.1.0/dist/three-phone.min.js"></script>

<!-- 2) three.js via import map -->
<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/" } }
</script>

<!-- 3) loader: expose THREE globally, then run sketch.js -->
<script type="module">
  import * as THREE from 'three';
  window.THREE = THREE;
  const s = document.createElement('script');
  s.src = 'sketch.js';
  document.body.appendChild(s);
</script>
```

> **Script order matters.** Load `three-phone.js` first, then the import map, then the
> loader module. The loader sets `window.THREE` before injecting `sketch.js`, so your sketch
> can use the global `THREE`. If you see `THREE is undefined`, a tag is out of order.

`three` is an **optional** peer dependency: three-phone only touches `window.THREE` inside
its three.js helpers, so permissions, sensors, and hardware work with or without three.js.

## Quick start

```js
// sketch.js
let renderer, scene, camera, cube;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 5;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1));
  cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6 })
  );
  scene.add(cube);

  showDebug();               // on-screen console (great on a phone)
  setPhoneCanvas(renderer);  // tell three-phone which canvas is yours
  enableGyroTap('Tap to enable motion sensors');
  lockGestures();            // stop pull-to-refresh, pinch-zoom, etc.
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (window.sensorsEnabled) applyDeviceRotation(cube, { smooth: 0.8 });
  else cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}

init();
```

`setPhoneCanvas(renderer)` is optional — three-phone auto-detects the three.js canvas — but
it removes any ambiguity when you have multiple canvases.

## The permission model

Browsers require a **user gesture** before granting sensor/mic/camera access (and iOS is
strict about it). three-phone gives every capability the same five activation styles, named
`enable<Feature><Style>`:

| Style | Example | What it shows |
|---|---|---|
| **Tap** | `enableGyroTap(message)` | a full-screen tap overlay |
| **Button** | `enableGyroButton(text, statusText)` | a centered start button |
| **Canvas** | `enableGyroCanvas(message)` | first touch on the 3D canvas (a floating hint, no overlay) |
| **Banner** | `enableGyroBanner(message, position)` | a slim top/bottom bar |
| **On** | `enableGyroOn(selector)` | binds to your own HTML element |

Features: **Gyro/Sensor**, **Mic**, **Sound**, **Speech**, **Vibration**, **Torch**
(`Flashlight` aliases), **Nfc**, **Geo**, **Ble**, **Camera**, **All** (sensors+mic), and
**Permissions/Hardware** (any combination).

Combine capabilities in one gesture:

```js
enablePermissionsTap(['sensors', 'mic', 'vibration'], 'Tap to enable everything');
```

Accepted tokens (and their aliases): `sensors` (motion/gyro/orientation/accelerometer),
`mic`, `sound`, `speech`, `vibration`, `torch` (flashlight), `nfc`, `geo` (gps/location),
`camera`. `enableHardware*` are aliases of `enablePermissions*`.

An optional `userSetupComplete()` callback runs once after any permission succeeds, and a
`permissionsReady` `CustomEvent` fires on `window` with every flag in its `detail`.

## Status flags

Guard hardware code with the **positive-enabled pattern**:

```js
if (window.sensorsEnabled) { /* motion is live */ }
```

Flags: `sensorsEnabled`, `micEnabled`, `soundEnabled`, `speechEnabled`, `vibrationEnabled`,
`torchEnabled`/`torchActive`, `nfcEnabled`, `geoEnabled`, `cameraEnabled`, `bleConnected`,
`gesturesLocked`.

## Motion data

p5 provided motion values for free; three.js does not, so **three-phone owns them** and
exposes the same names (always in **degrees**):

| Global | Meaning |
|---|---|
| `rotationX` / `rotationY` / `rotationZ` | tilt (beta / gamma / alpha) |
| `pRotationX/Y/Z` | previous-event rotation |
| `accelerationX/Y/Z` | m/s² (matches p5: acceleration × 2) |
| `pAccelerationX/Y/Z` | previous-event acceleration |
| `rotationRateAlpha/Beta/Gamma` | deg/s (a three-phone extra) |
| `deviceOrientation` | `'portrait'` or `'landscape'` |

Callbacks & thresholds (same semantics as p5): define `deviceMoved()` and `deviceShaken()`;
tune with `setMoveThreshold(0.5)` and `setShakeThreshold(30)`.

**three.js-native helpers:**

```js
applyDeviceRotation(object3D, { smooth: 0.8 }); // per frame; smooth 0..~0.9 slerps
const q = getRotationQuaternion();              // THREE.Quaternion
const e = getRotationEuler();                   // THREE.Euler
```

## Touch & picking

The touch subsystem installs at load — no permission needed.

```js
window.touches      // [{ x, y, id }, ...] — every active finger
window.mouseX / mouseY / pmouseX / pmouseY

function touchStarted(event) { /* also touchMoved / touchEnded */ }
```

Turn a screen point into a 3D interaction:

```js
const rc = getTouchRaycaster(mouseX, mouseY, camera);   // configured THREE.Raycaster
const hit = rc.intersectObjects(meshes)[0];

const world = screenToWorld(mouseX, mouseY, camera, 0); // THREE.Vector3 at depth z
```

## Microphone, sound & speech

three-phone uses the Web Audio API directly (no p5.sound) and resumes three.js's own audio
context so `THREE.Audio` works right after the gesture.

```js
enableMicTap();
// ... then, each frame:
const level = getMicLevel();     // 0..1 (RMS)
const stream = getMicStream();   // MediaStream for THREE.AudioAnalyser / ml5
const ctx = getAudioContext();   // the shared AudioContext
```

For playback, `enableSoundTap()` unlocks audio; build sources on three.js's audio context:

```js
const listener = new THREE.AudioListener();
camera.add(listener);
function userSetupComplete() {
  if (!window.soundEnabled) return;
  const sound = new THREE.Audio(listener);
  const osc = listener.context.createOscillator();
  osc.start();
  sound.setNodeSource(osc);
}
```

`enableSpeechTap()` unlocks audio for the Web Speech API — bring your own
`SpeechRecognition`.

## Camera (PhoneCamera)

A native `getUserMedia` camera with a three.js `VideoTexture` and mirror-aware coordinate
mapping (identical to p5-phone's, so ml5 code ports over).

```js
const cam = createPhoneCamera('user', true, 'cover'); // active, mirror, mode
cam.onReady(() => scene.add(cam.createBackgroundMesh()));
enableCameraTap();
```

- **active:** `'user'` | `'environment'` · **mode:** `'fitWidth'|'fitHeight'|'cover'|'contain'|'fixed'`
- **feed:** `cam.getTexture()` (a `THREE.VideoTexture`), `cam.videoElement` (for ml5),
  `cam.createBackgroundMesh(w?, h?)` + `cam.updateBackground()` for an orthographic overlay.
- **mapping:** `cam.mapPoint(x, y)`, `cam.mapKeypoint(kp)`, `cam.mapKeypoints(kps)`,
  `cam.mapBox(box)`, `cam.mapBoxes(boxes)` — video space → canvas coordinates, mirror-aware.
- `cam.getDimensions()`, `cam.ready`, `cam.width/height`, `cam.remove()`.

The camera is created but not started until the `enableCamera*` gesture (fixes an iOS
rotation bug). See the `examples/ml5/*` sketches for BodyPose / FaceMesh / HandPose.

## NFC

```js
enableNfcTap();                          // Android Chrome 89+, HTTPS
function nfcRead(message, serialNumber) {}
setNfcTagAlias(serialNumber, 'door');    // name a tag
if (isNfcTag('door', serialNumber)) {}   // test the last read
```

## GPS / geolocation

```js
setGeoOptions({ enableHighAccuracy: true }); // before enableGeo* for real GPS
enableGeoTap();                              // HTTPS required
function geoRead(position) {}                // { latitude, longitude, accuracy, ... }
const pos = getGeoPosition();                // latest, synchronous
const meters = geoDistance(lat1, lon1, lat2, lon2, 'm'); // 'm' | 'km' | 'mi'
const inside = geoInPolygon([{lat, lon}, ...], { lat, lon });
```

## Bluetooth (BLE)

Typed, little-endian Web Bluetooth. Pairs unchanged with the
[P5PhoneBLE Arduino companion](https://github.com/npuckett/p5-phone/tree/main/companion/P5PhoneBLE).

```js
bleSetup({
  characteristics: [
    { name: 'sensor', type: 'uint16', notify: true, read: true },
    { name: 'led',    type: 'bool',   write: true }
  ]
});
enableBleTap({ label: 'Connect device' });

function bleReceive(name, value) {}   // notifications; also window.bleValues[name]
function bleReady(deviceName) {}
function bleClosed() {}
await bleWrite('led', true);
const v = await bleRead('sensor');
```

Types: `bool, int8, uint8, int16, uint16, int32, uint32, float, double, string, bytes`.
UUIDs auto-derive from the service (default `19b10000-e8f2-537e-4f6c-d104768a1214`).

## Vibration

Android only (iOS Safari has no Vibration API).

```js
enableVibrationTap();
vibrate(50);              // ms
vibrate([100, 50, 100]);  // [on, off, on, ...]
```

## Torch / flashlight

Android Chrome, HTTPS. `enableTorchTap()` starts the rear camera stream; then
`torchOn()` / `torchOff()` / `toggleTorch()` / `setTorch(bool)`, `isTorchSupported()`,
`stopTorch()`. `flashlight*` aliases exist for all of them.

## Debug console

An on-screen console — invaluable on a phone with no devtools.

```js
showDebug();               // also hideDebug(), toggleDebug()
debug('value', x);         // and debugWarn(), debugError()
```

It also captures uncaught errors and mirrors `console.error` / `console.warn`.

## Gesture locking

```js
lockGestures();                                  // fullscreen: blocks scroll/zoom/pull-to-refresh/back-swipe
lockGestures({ mode: 'embedded', element: renderer.domElement }); // just the canvas
unlockGestures();
```

## Compatibility

| Capability | iOS Safari | Android Chrome | Desktop |
|---|---|---|---|
| three.js / WebGL | ✅ | ✅ | ✅ |
| Motion sensors | ✅ after tap | ✅ (no prompt) | ⚠️ usually absent |
| Touch / picking | ✅ | ✅ | ✅ (mouse) |
| Mic / sound | ✅ after gesture | ✅ after gesture | ✅ |
| Speech | ⚠️ varies | ✅ | ⚠️ varies |
| NFC | ❌ | ✅ HTTPS | ❌ |
| GPS | ✅ HTTPS | ✅ HTTPS | ✅ |
| Camera / ML5 | ✅ | ✅ | ✅ |
| Vibration | ❌ | ✅ | ⚠️ |
| Torch | ❌ | ✅ | ❌ |
| BLE | Bluefy only | ✅ HTTPS | Chrome/Edge HTTPS |

Sensors, camera, NFC, GPS, and BLE need a **secure context** (HTTPS or `localhost`).

## Differences from p5-phone

- **Loading:** three-phone is a classic script; three.js comes via import map (p5 loads as a
  classic script too, but three.js can't). Your `sketch.js` uses `init()`/`animate()`
  instead of p5's `setup()`/`draw()`.
- **Motion values** are provided by three-phone itself and are **always in degrees** (p5's
  depend on `angleMode()`), plus `rotationRate*` which p5 lacks.
- **Sound** uses the Web Audio API and three.js audio instead of p5.sound; **mic level** is
  `getMicLevel()` instead of `p5.AudioIn.getLevel()`.
- **Camera** renders through `getTexture()` / `createBackgroundMesh()` instead of p5's
  `image()`.
- Everything else — the permission matrix, status flags, NFC, GPS, BLE, vibration, torch,
  and the debug console — matches p5-phone's API names.

## License

MIT — see [LICENSE](LICENSE). Illustration/branding shared with the p5-phone project.
