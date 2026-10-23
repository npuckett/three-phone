# Changelog

All notable changes to three-phone are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **`window.isMobile` / `window.isDesktop`** — best-effort device detection, set once at load with
  the same checks as p5-phone: a mobile user agent, iPadOS (a Mac user agent with touch), a coarse
  primary pointer, or touch with no fine pointer. Sketches can now pick the rear camera on phones
  with `createPhoneCamera(isMobile ? 'environment' : 'user', …)`.
- **Tests** — `test-camera-contract.js` (camera switching) and `test-device-contract.js`, both in
  `npm test`.

### Fixed
- **Background froze or went black after a camera switch** — setting `cam.active` after
  `cam.attachBackground(scene)` left `scene.background` on the disposed old `VideoTexture`. Now,
  once the new feed is live and before `onReady` fires, both background paths point at the new
  texture and are re-fit to its aspect ratio. The `createBackgroundMesh()` path did get the new
  texture before, but it wasn't re-fit, so a feed with a different aspect ratio stretched. The old
  texture is disposed after the swap. A `scene.background` the sketch has replaced since is left
  alone, and `updateBackground()` now only fits the camera's own texture.
- **Rapid camera toggles** — a second `cam.active` change made while the first switch was still
  opening its stream was dropped, so `cam.active` and the live camera disagreed. The switch now
  ends on the latest value.

## [0.2.0] - 2026-10-08

Augmented-reality release: magic-window AR everywhere, plus WebXR immersive-ar on Android Chrome.

### Added
- **Magic-window AR helpers** — the `enableARTap/Button/Canvas/Banner/On` family (sugar for
  `enablePermissions<Style>(['camera', 'sensors'])`), the new `'ar'` / `'magicwindow'` token for
  `enablePermissions*` combo lists, the `window.arEnabled` flag (camera **and** sensors granted),
  and an `ar` field on the `permissionsReady` event detail.
- **`PhoneCamera.attachBackground(scene)`** — sets `scene.background` to the cover-fit camera
  `VideoTexture` (paired with `updateBackground()` on resize) for the simplest camera-behind-scene
  setup.
- **WebXR immersive-ar helpers** — `enableXRTap/Button/On` (Tap/Button/On only) to enter the
  OS-level AR session on Android Chrome, `isXRSupported()` → `Promise<boolean>`, `getXRHitPose()`
  for hit-test placement, `endXR()`, the `window.xrSupported/xrEnabled/xrActive` flags, in-session
  `select` → global `touchStarted()` routing, and optional `xrSessionStarted()`/`xrSessionEnded()`
  callbacks. Session defaults `requiredFeatures: ['local']`, `optionalFeatures: ['hit-test',
  'dom-overlay']`; requires `setPhoneCanvas(renderer)`.
- **Six AR/XR examples** — `examples/AR Examples/magicWindow/` (`01_look_around`, `02_tap_to_place`,
  `03_panorama`, `04_shake_physics`, iOS + Android) and `examples/AR Examples/webxr/`
  (`01_enter_ar`, `02_hit_test_place`, Android Chrome).
- **AR / XR** catalog category in the docs/example gallery.

### Fixed
- **Camera background invisible / off-center on phones** — `createBackgroundMesh()` is now
  double-sided with a y-flipped plane, so the y-down overlay camera the ml5 and camera examples use
  no longer back-face-culls it (black screen). The cover-fit math in `updateBackground()` /
  `attachBackground()` no longer double-applies the centering offset: portrait phones showed the
  right third of the frame, and mirrored (front-camera) feeds sampled off the texture entirely.
- **ml5 examples** — await `ml5.faceMesh/handPose/bodyPose(...)`; without p5 on the page the ml5 v1
  constructors return a Promise, so the callback pattern threw `detectStart is not a function`.

## [0.1.0] - 2026-07-23

Initial release: a three.js companion to [p5-phone](https://github.com/npuckett/p5-phone)
with the same permission model and sensor API names.

### Added
- **Permission engine** — the full `enable<Feature><Tap|Button|Canvas|Banner|On>` matrix for
  Gyro/Sensor, Mic, Sound, Speech, Vibration, Torch/Flashlight, Nfc, Geo, Ble, Camera, All,
  and Permissions/Hardware, plus `enablePermissionsTap([...])` combos and the
  `userSetupComplete()` / `permissionsReady` hooks.
- **Motion data engine** — three-phone owns the DeviceOrientation/DeviceMotion listeners and
  exposes p5-compatible globals (`rotationX/Y/Z`, `accelerationX/Y/Z`, `pRotation*`,
  `pAcceleration*`, `deviceOrientation`) always in degrees, plus `rotationRateAlpha/Beta/Gamma`,
  `deviceMoved()`/`deviceShaken()` callbacks, and `setMoveThreshold()`/`setShakeThreshold()`.
- **three.js-native helpers** — `applyDeviceRotation()`, `getRotationQuaternion()`,
  `getRotationEuler()`, `screenToWorld()`, `getTouchRaycaster()`, and `setPhoneCanvas()`.
- **Touch subsystem** — `window.touches`, `mouseX/mouseY/pmouseX/pmouseY`, and
  `touchStarted/touchMoved/touchEnded` callbacks (installed at load, no permission).
- **Audio** — Web Audio mic metering (`getMicLevel()`, `getMicStream()`, `getAudioContext()`)
  and sound/speech unlock that also resumes `THREE.AudioContext`.
- **PhoneCamera** — native getUserMedia camera with `getTexture()` (VideoTexture),
  `createBackgroundMesh()`, and mirror-aware coordinate mapping (`mapPoint`, `mapKeypoints`,
  `mapBox`, …) for ml5.
- **Hardware** ported from p5-phone: vibration, torch/flashlight, NFC (aliases), GPS
  (`geoDistance`/`geoInPolygon`), and the typed little-endian BLE subsystem (pairs with the
  P5PhoneBLE Arduino companion).
- **Debug console** with error capture, and fullscreen/embedded gesture locking.
- **35 examples** across movement, touch, microphone, speech, sound, vibration, torch, geo,
  camera, ml5 (BodyPose/FaceMesh/HandPose), NFC, BLE, combined, and UI-style demos — each
  redesigned to showcase three.js 3D.
- **Docs site** at `examples/homepage/` (purple theme), cross-linked to p5-phone.
- **Tests** — `test-smoke.js` (API surface), `test-motion-contract.js`, `test-ble-contract.js`,
  `test-geo-contract.js`.

### Notes
- `three` is an **optional** peer dependency — permission/sensor/hardware features work with
  or without three.js present.
- Examples pin three.js `0.185.1` via import map.
