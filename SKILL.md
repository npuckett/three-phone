---
name: three-phone
description: Mobile hardware access (motion, touch, mic, camera, NFC, GPS, BLE, vibration, torch) and multi-phone Share rooms for three.js sketches. Use when a user builds a phone-sensor-driven or many-phones-one-scene three.js scene.
version: 0.2.0
---

# three-phone

three-phone gives three.js the phone-hardware API that [p5-phone](https://github.com/npuckett/p5-phone)
gives p5.js: one-line permission helpers, motion/touch globals, and three.js-native helpers.
It loads as a **classic `<script>`** and puts everything on `window`.

## Golden rules

1. **Load order is fixed:** `three-phone.js` (classic script) → import map → a `type="module"`
   loader that sets `window.THREE` then injects `sketch.js`. `sketch.js` is a **plain
   non-module script** that uses the global `THREE`. Wrong order → `THREE is undefined`.
2. **Every capability needs a user gesture.** Call an `enable<Feature><Style>` helper; the
   real permission request runs inside the tap/click handler. Never `await` before it.
3. **Guard hardware code** with the positive-enabled flag: `if (window.sensorsEnabled) {…}`.
4. **Motion data is three-phone's**, not three.js's: read `rotationX/Y/Z`,
   `accelerationX/Y/Z`, define `deviceMoved()`/`deviceShaken()`. Values are in **degrees**.
5. **Call `setPhoneCanvas(renderer)`** in setup so gesture-locking and canvas-touch bind to
   the right canvas (optional; auto-detected otherwise).

## HTML baseline (copy verbatim)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>html, body { margin: 0; height: 100%; overflow: hidden; }</style>
  <script src="https://cdn.jsdelivr.net/npm/three-phone@0.2.0/dist/three-phone.min.js"></script>
  <script type="importmap">
  { "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/" } }
  </script>
</head>
<body>
  <script type="module">
    import * as THREE from 'three';
    window.THREE = THREE;
    const s = document.createElement('script'); s.src = 'sketch.js'; document.body.appendChild(s);
  </script>
</body>
</html>
```

Sketch skeleton: `init()` (once, build renderer/scene/camera + enable helpers + `animate()`)
and `animate()` (per frame, `requestAnimationFrame`). These map to p5's `setup()`/`draw()`.

## Permission matrix

`enable<Feature><Tap|Button|Canvas|Banner|On>` for **Gyro/Sensor, Mic, Sound, Speech,
Vibration, Torch (Flashlight), Nfc, Geo, Ble, Share, Camera, All, Permissions/Hardware**.

- `enableGyroTap(message)`, `enableGyroButton(text, statusText)`,
  `enableGyroCanvas(message)`, `enableGyroBanner(message, 'top'|'bottom')`,
  `enableGyroOn('#selector')`.
- Combine: `enablePermissionsTap(['sensors','mic','vibration'], msg)`. Tokens: `sensors, mic,
  sound, speech, vibration, torch, nfc, geo, camera, share` (plus aliases). BLE takes an options
  object: `enableBleTap({ label, statusText, position })`; Share takes a label string or the
  same options object: `enableShareTap('Tap to join')`.
- **AR (magic window)** → all five styles: `enableARTap/Button/Canvas/Banner/On` — sugar for
  `enablePermissions<Style>(['camera','sensors'])`. Combo token `'ar'`/`'magicwindow'` also
  works. Status: `window.arEnabled` (camera **and** sensors granted); `ar` field on the
  `permissionsReady` detail. **iOS fires two prompts from one tap** (motion, then camera).
- **WebXR** (immersive-ar) → **Tap/Button/On only**: `enableXRTap(msg?, sessionInit?)`,
  `enableXRButton(text?, statusText?, sessionInit?)`, `enableXROn(selector, sessionInit?)`.
  Status: `window.xrActive` (also `xrEnabled`, `xrSupported`). **Android Chrome over HTTPS
  only**; on unsupported devices the control rewrites to "not supported" and never arms.
- Optional `userSetupComplete()` runs after any grant; `permissionsReady` event fires on
  `window`.

## Per-feature cheatsheet

**Motion** → `enableGyroTap()`; then `rotationX/Y/Z` (deg), `accelerationX/Y/Z` (m/s²),
`rotationRateAlpha/Beta/Gamma` (deg/s), `deviceOrientation`. Callbacks `deviceMoved()`,
`deviceShaken()`; `setMoveThreshold(0.5)`, `setShakeThreshold(30)`. three.js helpers:
`applyDeviceRotation(obj, { smooth })`, `getRotationQuaternion()`, `getRotationEuler()`.

**Touch** (no permission) → `window.touches[]`, `mouseX/mouseY/pmouseX/pmouseY`,
`touchStarted/touchMoved/touchEnded(event)`. Picking: `getTouchRaycaster(x, y, camera)`,
`screenToWorld(x, y, camera, z)`.

**Mic/sound** → `enableMicTap()` then `getMicLevel()` (0..1), `getMicStream()`,
`getAudioContext()`. `enableSoundTap()` resumes `THREE.AudioContext`; build `THREE.Audio` on
`listener.context`. `enableSpeechTap()` unlocks audio for your own `SpeechRecognition`.

**Camera** → `cam = createPhoneCamera(active, mirror, mode)`, `enableCameraTap()`,
`cam.onReady(cb)`, `cam.getTexture()`, `cam.createBackgroundMesh()`, `cam.mapKeypoints(kps)`
(video→canvas coords for ml5), `cam.videoElement` (feed ml5). Init is deferred to the gesture.
No p5 here, so ml5 v1 constructors return a Promise: `model = await ml5.handPose(opts)`.

**AR (magic window)** (iOS + Android) → `cam = createPhoneCamera('environment', false, 'cover')`,
`cam.onReady(() => cam.attachBackground(scene))` (camera feed → `scene.background`),
`enableARTap()`, then per frame `applyDeviceRotation(camera, { smooth })`. Call
`cam.updateBackground()` on resize. Status `window.arEnabled`. Uses a normal
`requestAnimationFrame` loop.

**WebXR** (Android Chrome, HTTPS) → `setPhoneCanvas(renderer)` **first**, then
`enableXRTap(msg?, sessionInit?)`. Loop with **`renderer.setAnimationLoop((time, frame) => …)`**
(never `requestAnimationFrame`), and **do not set `scene.background`**. Placement:
`getXRHitPose(frame)` → `{ position, quaternion, matrix } | null` for a reticle. In-session taps
route to global `touchStarted()`. `isXRSupported()` → `Promise<boolean>`; `endXR()`; flags
`xrActive`/`xrEnabled`; optional `xrSessionStarted()`/`xrSessionEnded()`.

**NFC** (Android Chrome, HTTPS) → `enableNfcTap()`, `nfcRead(message, serial)`,
`setNfcTagAlias(serial, name)`, `isNfcTag(name, serial)`.

**GPS** (HTTPS) → `setGeoOptions({ enableHighAccuracy: true })`, `enableGeoTap()`,
`geoRead(position)`, `getGeoPosition()`, `geoDistance(...)`, `geoInPolygon(...)`.

**BLE** → `bleSetup({ characteristics:[{ name, type, read?, write?, notify? }] })`,
`enableBleTap()`, `bleReceive(name, value)`, `bleWrite(name, value)`, `bleRead(name)`,
`window.bleValues`. Types: bool/int8/uint8/int16/uint16/int32/uint32/float/double/string/bytes.

**Share** (any browser; many phones, one room) → `shareSetup({ host, room, shared?, me?, keep?,
quiet? })` in `init()`, then `enableShareTap('Tap to join')` or `'share'` in
`enablePermissionsTap(['gyro','share'])`. Read and write the proxies `shared` (the room's) and
`me` (this phone's); read `guests` (other phones' `me`, each with `.id`). `shareEmit(name, data)`
→ others' `shareEvent(name, data, from)`. Callbacks `shareReady`, `shareReceive(path, value)`,
`shareJoined(id, data)`, `shareLeft(id, data)`, `shareHostChanged(isHost)`, `shareClosed`.
Helpers `shareGuest(id)`, `guestsWith(field, value?)`, `shareStatusText()`, `getShareJoinUrl()`,
`shareSet/shareSetMe(path, value)`, `shareClear()`. Flags `shareConnected`, `shareIsHost`,
`shareStatus`, `shareKept`/`shareKeptUntil`, `shareQuiet`. `?shareHost=&room=` in the URL win.
The server is p5-phone's `companion/P5PhoneShare` worker (`npx wrangler deploy`).

**Keep the screen on** → `keepScreenOn()` (from a tap on iPhone) → `Promise<boolean>`,
`keepScreenOn(false)`, `window.screenAwake`. Joining a Share room asks for it automatically
(`shareSetup({ keepScreenOn: false })` to opt out).

**Vibration** (Android) → `enableVibrationTap()`, `vibrate(ms | [on,off,...])`.

**Torch** (Android Chrome) → `enableTorchTap()`, `torchOn/torchOff/toggleTorch/setTorch`,
`isTorchSupported()`.

**Debug** → `showDebug()`, `debug()/debugWarn()/debugError()`.

**Gestures** → `lockGestures()` (or `{ mode:'embedded', element }`), `unlockGestures()`.

## Common mistakes to avoid

- Making `sketch.js` a module or importing THREE inside it — it must be a classic script and
  use the global `THREE` the loader set.
- Awaiting anything before the enable helper's permission call (breaks iOS's transient
  activation requirement).
- Assuming vibration/torch/NFC work on iOS Safari — they don't; degrade gracefully.
- Reading `getMicLevel()` before `enableMicTap()` has been granted (it stays 0).
- Forgetting `renderer.render(scene, camera)` in `animate()`.
- Using `requestAnimationFrame` in a WebXR sketch — it must drive the loop with
  `renderer.setAnimationLoop((time, frame) => …)` so the XR display supplies frames (and so
  `frame` is available for `getXRHitPose`).
- Setting `scene.background` in a WebXR AR scene — passthrough needs it `null`; a background
  hides the camera feed.
- Expecting WebXR (`enableXR*`) to work on iOS — it doesn't; iOS Safari has no immersive-ar.
  Use magic-window AR (`enableAR*`) there instead.
- Calling `cam.attachBackground(scene)` before `cam.onReady(...)` — the video isn't live yet,
  so it no-ops. Always call it inside the `onReady` callback.
- Putting a `THREE.Vector3`, `Color` or any class instance in `shared`/`me` — Share values must
  be plain JSON. Write `me.x = v.x; me.z = v.z` and rebuild the vector when reading `guests`.
- Counting with `shared.n += 1` from many phones — two phones at once count once (last write
  wins). Let the host (`shareIsHost`) own the count and have the others `shareEmit()` to it.
- Forgetting `cam.updateBackground()` in the resize handler — the magic-window background stops
  cover-fitting the canvas.
