# three-phone

**Simplified mobile hardware access for [three.js](https://threejs.org/).** A companion to
[p5-phone](https://github.com/npuckett/p5-phone) — the same permission model and the same
sensor API names, redesigned to drive real 3D scenes.

Point your phone's motion sensors, touch, microphone, camera, GPS, NFC, Bluetooth, torch,
and vibration at a WebGL scene, and share one scene across many phones, without wrestling with iOS permission prompts, gesture
locking, or `DeviceOrientationEvent` quirks.

- 📚 **Docs & example gallery:** https://npuckett.github.io/three-phone/examples/homepage/
- 🎛️ **p5.js version:** [p5-phone](https://npuckett.github.io/p5-phone/) — the two sites cross-link example by example.

---

## Contents

- [How it loads](#how-it-loads)
- [Quick start](#quick-start)
- [The permission model](#the-permission-model)
- [Status flags](#status-flags)
- [Device detection](#device-detection)
- [Motion data](#motion-data)
- [Touch & picking](#touch--picking)
- [Microphone, sound & speech](#microphone-sound--speech)
- [Camera (PhoneCamera)](#camera-phonecamera)
- [AR / XR](#ar--xr)
- [NFC](#nfc)
- [GPS / geolocation](#gps--geolocation)
- [Bluetooth (BLE)](#bluetooth-ble)
- [Share (many phones, one room)](#share-many-phones-one-room)
- [Keep the screen on](#keep-the-screen-on)
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
<script src="https://cdn.jsdelivr.net/npm/three-phone@0.2.0/dist/three-phone.min.js"></script>

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
(`Flashlight` aliases), **Nfc**, **Geo**, **Ble**, **Share**, **Camera**, **All** (sensors+mic), and
**Permissions/Hardware** (any combination).

Combine capabilities in one gesture:

```js
enablePermissionsTap(['sensors', 'mic', 'vibration'], 'Tap to enable everything');
```

Accepted tokens (and their aliases): `sensors` (motion/gyro/orientation/accelerometer),
`mic`, `sound`, `speech`, `vibration`, `torch` (flashlight), `nfc`, `geo` (gps/location),
`camera`, `share` (room/rooms: joins the room set up by `shareSetup()`, without waiting for it).
`enableHardware*` are aliases of `enablePermissions*`.

An optional `userSetupComplete()` callback runs once after any permission succeeds, and a
`permissionsReady` `CustomEvent` fires on `window` with every flag in its `detail`.

## Status flags

Guard hardware code with the **positive-enabled pattern**:

```js
if (window.sensorsEnabled) { /* motion is live */ }
```

Flags: `sensorsEnabled`, `micEnabled`, `soundEnabled`, `speechEnabled`, `vibrationEnabled`,
`torchEnabled`/`torchActive`, `nfcEnabled`, `geoEnabled`, `cameraEnabled`, `bleConnected`,
`shareConnected`, `screenAwake`, `gesturesLocked`.

## Device detection

`window.isMobile` and `window.isDesktop` are booleans set once when three-phone loads, using the
same checks as p5-phone: a mobile user agent, iPadOS (which reports a Mac user agent but has
touch), a coarse primary pointer, or touch with no fine pointer. `isDesktop` is `!isMobile`.

```js
// Rear camera, unmirrored, on phones and tablets; the mirrored webcam on laptops.
const cam = createPhoneCamera(isMobile ? 'environment' : 'user', !isMobile, 'cover');
```

Use them for choices like this and for desktop-only hints. Gate hardware code on the
`*Enabled` flags, not on `isMobile`.

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
- **switching:** set `cam.active = 'environment'` (or `'user'`) at any time. A background from
  `attachBackground()` or `createBackgroundMesh()` moves to the new feed and is re-fit once it's
  live. As in p5-phone, `onReady` is one-shot and doesn't fire again after a switch; call
  `cam.onReady(cb)` after changing `active` to run code when the new feed is live. The switch
  replaces the `<video>`, so restart anything that holds the old one, such as ml5's
  `detectStart(cam.videoElement, …)`.

The camera is created but not started until the `enableCamera*` gesture (fixes an iOS
rotation bug). See the `examples/ml5/*` sketches for BodyPose / FaceMesh / HandPose.

**ml5 note:** without p5 on the page, ml5 v1 constructors return a Promise, so write
`model = await ml5.handPose(opts)` (or use the model passed to the callback) before
calling `model.detectStart(cam.videoElement, cb)`.

## AR / XR

Two paths to augmented reality, for two different capabilities. **Magic-window AR** fuses the
camera feed with motion sensors and runs everywhere; **WebXR immersive-ar** enters the OS-level
AR session and only exists on Android Chrome.

### Magic-window AR (iOS + Android)

The camera feed becomes the scene background and `applyDeviceRotation` steers the 3D camera by
the phone's orientation — no OS-level AR needed, so it works on iOS Safari too. The `enableAR*`
helpers are sugar for `enablePermissions<Style>(['camera', 'sensors'])`: `enableARTap(message?)`,
`enableARButton(text?, statusText?)`, `enableARCanvas(message?)`, `enableARBanner(message?,
position?)`, `enableAROn(selector)`. The `'ar'` (or `'magicwindow'`) token works in combo lists
too — `enablePermissionsTap(['ar'], msg)`. `window.arEnabled` is true once camera **and** sensors
are granted, and an `ar` field is added to the `permissionsReady` event detail.

```js
const cam = createPhoneCamera('environment', false, 'cover'); // back camera, unmirrored, cover-fit
cam.onReady(() => cam.attachBackground(scene));               // camera feed → scene.background
enableARTap();                                                // camera + motion in one gesture

function animate() {
  requestAnimationFrame(animate);
  if (window.sensorsEnabled) applyDeviceRotation(camera, { smooth: 0.85 });
  renderer.render(scene, camera);
}
// on resize, keep the background cover-fit:
addEventListener('resize', () => cam.updateBackground());
```

`cam.attachBackground(scene)` sets `scene.background` to the cover-fit camera `VideoTexture` — call
it inside `cam.onReady(...)` (the video must be live), and call `cam.updateBackground()` from your
resize handler so it re-fits.

> **iOS caveat:** a single tap produces **two** prompts in sequence — the motion-permission modal
> first, then the camera prompt. Both must be accepted before `window.arEnabled` flips true.

### WebXR immersive-ar (Android Chrome only)

> **Android Chrome over HTTPS only.** iOS Safari does not support WebXR immersive-ar. On any
> unsupported platform the `enableXR*` overlay/button rewrites itself to a "not supported" message
> and never arms — so it degrades on its own.

WebXR gives you the OS-level passthrough AR session with hit-testing. Only the **Tap**, **Button**,
and **On** styles exist (no Canvas/Banner): `enableXRTap(message?, sessionInit?)`,
`enableXRButton(text?, statusText?, sessionInit?)`, `enableXROn(selector, sessionInit?)`. three.js
drives the session through `renderer.xr`, so **`setPhoneCanvas(renderer)` must run first**. Session
defaults are `requiredFeatures: ['local']`, `optionalFeatures: ['hit-test', 'dom-overlay']`; any
`sessionInit` you pass shallow-merges over these.

Two hard rules for XR sketches: drive the loop with **`renderer.setAnimationLoop`** (not
`requestAnimationFrame` — the XR display needs its own frame source), and **do not set
`scene.background`** (passthrough requires it to stay `null`).

```js
setPhoneCanvas(renderer);   // required — lets the library reach renderer.xr
enableXRTap('Tap to enter AR');

renderer.setAnimationLoop((time, frame) => {
  renderer.render(scene, camera);
});
```

`isXRSupported()` returns a `Promise<boolean>` (cached on `window.xrSupported`); the flags
`window.xrEnabled` / `window.xrActive` track the session and `endXR()` ends it. Read the current
hit-test pose with `getXRHitPose(frame)` to drive a placement reticle:

```js
renderer.setAnimationLoop((time, frame) => {
  const hit = getXRHitPose(frame); // { position, quaternion, matrix } | null
  if (hit) {
    reticle.visible = true;
    reticle.position.copy(hit.position);
    reticle.quaternion.copy(hit.quaternion);
  } else {
    reticle.visible = false;
  }
  renderer.render(scene, camera);
});
```

In-session screen taps arrive as WebXR `select` events, not DOM touches — three-phone routes them
to your global `touchStarted()`, so the same tap handler works in and out of AR. Optional
`xrSessionStarted()` / `xrSessionEnded()` callbacks fire on session start/end.

See `examples/AR Examples/magicWindow/*` (iOS + Android) and `examples/AR Examples/webxr/*`
(Android Chrome) for full sketches.

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

## Share (many phones, one room)

Sync plain JSON values across phones in the same room: one 3D scene that every phone
changes, multiplayer pieces, a projector page that adds up a class's phones. It is
p5-phone's Share with the same names, the same wire protocol and the same server, so a
three.js page and a p5.js page can be in one room together.

**The server** is p5-phone's small
[P5PhoneShare](https://github.com/npuckett/p5-phone/tree/main/companion/P5PhoneShare)
Cloudflare worker (free tier). three-phone has no worker of its own. Deploy it once for your
project:

```bash
cd p5-phone/companion/P5PhoneShare
npm install
npx wrangler login    # free Cloudflare account
npx wrangler deploy   # prints https://….workers.dev
```

```js
function init() {
  // ...renderer, scene, camera...
  shareSetup({
    host: 'https://YOUR.workers.dev',   // or ?shareHost= in the page address
    room: 'demo',                       // or ?room=
    shared: { hue: 0.75 },              // the room's starting state
    me: { x: 0, z: 0 }                  // this phone's own values
  });
  enableShareTap('Tap to join');        // or enablePermissionsTap(['gyro', 'share'], 'Tap to join')
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (shareConnected) {
    crystal.material.color.setHSL(shared.hue, 0.7, 0.6);
    for (const g of guests) placePiece(g.id, g.x, g.z); // the other phones' me
  }
  renderer.render(scene, camera);
}

function touchStarted() {
  shared.hue = Math.random();           // everyone's crystal changes
  me.x = 1; me.z = -2;                  // everyone sees your piece move
}
```

**Commands:**
- `shareSetup({ host, room, app, shared, me, keep, quiet, autoReconnect, sendInterval, disconnectWhenHidden, keepScreenOn })` returns `true` or `false` (with a console message)
  - `keep` (default off): keep the room's `shared` after the last phone leaves. `true` (7 days), a number of ms, `'30m'`, `'24h'`, `'7d'`, or `{ expire: '24h' }`. At most 30 days, at least 1 second
  - `quiet` (default `false`): do not send this phone the other phones' `me` changes, for a page that reads only `shared`. `guests` then says who is here and their role, not their live values
  - `sendInterval` (ms, default `50`): changes are batched and sent at most this often; `0` sends each change at once
  - `disconnectWhenHidden` (default `true` on phones): leave the room while the page is hidden (screen locked, another app) and rejoin when it is visible, keeping `me`
  - `keepScreenOn` (default `true`): joining asks for a screen wake lock (see [Keep the screen on](#keep-the-screen-on)); `false` leaves the screen alone
  - `?room=`, `?shareHost=` and `?app=` in the page address win over the config, and the console says so
- `enableShareTap(label | options?)`, `enableShareButton(...)`, `enableShareCanvas(...)`, `enableShareBanner(...)`, `enableShareOn(selector)`: join from a gesture. Like every `enable*` helper, they run `userSetupComplete()`
- `'share'` in `enablePermissionsTap([...])` (and the other `enablePermissions*` styles): join from the same tap as the other permissions
- `shareConnect()` / `shareDisconnect()`: join and leave from your own code
- `shareSet(path, value)` / `shareSetMe(path, value)`: write by dotted path (`'pos.x'`)
- `shareEmit(name, data?)`: a one-shot room event, not stored. Others get `shareEvent(name, data, from)`
- `shareClear()`: put `shared` back to the value given to `shareSetup()` (or `{}`) for every phone, and erase the kept copy
- `shareGuest(id)`: that guest's `me`, your own `me` for your own id, or `null`
- `guestsWith(field, value?)`: the guests that have `field`, or have it set to `value` (`guestsWith('role', 'phone')`)
- `shareStatusText()`: one sentence about the connection for a DOM label ("Tap to join room demo.", "In room demo · 2 others here", "Cannot reach the room. Trying again. (…)")
- `getShareJoinUrl()`: this page's address with `shareHost` / `room` / `app` filled in, to send to others or put in your own QR code
- `isShareSupported()`: WebSocket check

**Live objects:**
- `shared`: the room's object. Assign like a plain object (`shared.score = 1`, `shared.list.push(x)`)
- `me`: this phone's own object
- `guests`: the other phones' `me` objects, each with its `id` (it shows in `console.log` and `JSON.stringify`). Empty while you are out of the room
- `shareConnected`, `shareStatus` (`idle | connecting | connected | error | unsupported`), `shareError`, `shareRoom`, `shareClientId`, `shareIsHost`, `shareSupported`
- `shareKept` / `shareKeptUntil`: the server keeps this room, and when the kept copy goes if nothing changes (ms, like `Date.now()`)
- `shareQuiet`: the server agreed not to send this phone the other phones' `me` changes

**Optional callbacks** (global functions, like `bleReceive`):

```js
function shareReady() {}                    // in the room, shared / me / guests filled in
function shareReceive(path, value) {}       // another phone changed shared or a me
function shareEvent(name, data, from) {}    // shareEmit from another phone; from is its id
function shareJoined(id, data) {}           // a phone joined after you; data is its me
function shareLeft(id, data) {}             // a phone left; data is its last me
function shareHostChanged(isHost) {}
function shareClosed() {}
```

**Things to know:**
- Writing `me.x = ...` every frame is fine: unchanged values are not sent, and changes are batched every 50 ms.
- Last write wins. Two phones doing `shared.score += 1` at the same moment count once. For counts, keep a tally in each phone's `me` and add up `guests`, or let the host (`shareIsHost`) own the value and have the others `shareEmit()` to it.
- Values must be JSON: no `THREE.Vector3`, no functions, no `NaN`. Send `{ x, y, z }` numbers and rebuild the vector.
- `shared` changes made while out of the room are replaced by the room's state when you rejoin; `me` is kept.
- Keep, quiet, and the wire format are documented in p5-phone's
  [P5PhoneShare README](https://github.com/npuckett/p5-phone/tree/main/companion/P5PhoneShare) and
  [PROTOCOL.md](https://github.com/npuckett/p5-phone/blob/main/companion/P5PhoneShare/PROTOCOL.md).

Example: [Shared Scene](examples/Phone%20Sensor%20Examples/share/01_shared_scene/) (pieces on one floor, a shared crystal, shake to pulse).

## Keep the screen on

A sketch driven by motion, sound or a Share room goes dark after 30 seconds or so, because
only touches reset the phone's auto-lock timer. `keepScreenOn()` holds a screen wake lock
while the page is showing, and asks for it again when the page comes back (the browser
drops it whenever the page is hidden).

```js
function touchEnded() { keepScreenOn(); }   // iPhone: ask from a tap
keepScreenOn(false);                        // let the screen sleep again
if (window.screenAwake) { /* the lock is held */ }
```

- It returns a `Promise<boolean>`: `true` if the screen is being kept on. A browser without the API, a refusal (low battery) or an iframe without `allow="screen-wake-lock"` resolves `false`.
- Joining a Share room calls it for you (`shareSetup({ keepScreenOn: false })` turns that off). With `'share'` in `enablePermissionsTap`, it is asked for inside the tap.
- HTTPS (or `localhost`) only. Chrome and Edge, Safari 16.4+ on iOS, Firefox 126+.

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
| Magic-window AR | ✅ | ✅ | ❌ |
| WebXR immersive-ar | ❌ | ✅ Chrome | ❌ |
| Vibration | ❌ | ✅ | ⚠️ |
| Torch | ❌ | ✅ | ❌ |
| BLE | Bluefy only | ✅ HTTPS | Chrome/Edge HTTPS |
| Share | ✅ | ✅ | ✅ |
| Keep screen on | ✅ 16.4+ | ✅ | ✅ |

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
- **Share** uses p5-phone's P5PhoneShare worker; three-phone has no server of its own. There
  is no `showDesktopQr()` and no `Minimal` permission style in three-phone, so there is no
  `enableShareMinimal()`; use `getShareJoinUrl()` for a join link.
- Everything else — the permission matrix, status flags, device detection (`isMobile` /
  `isDesktop`), NFC, GPS, BLE, Share, the wake lock, vibration, torch, and the debug console —
  matches p5-phone's API names.

## License

MIT — see [LICENSE](LICENSE). Illustration/branding shared with the p5-phone project.
