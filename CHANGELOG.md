# Changelog

All notable changes to three-phone are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

Share and the screen wake lock from p5-phone 1.16.0: many phones, one three.js scene.

### Added
- **Share: multi-phone rooms with shared state**, ported from p5-phone 1.16.0 with the same API
  names, the same wire protocol (v2) and the same server, p5-phone's
  [P5PhoneShare](https://github.com/npuckett/p5-phone/tree/main/companion/P5PhoneShare)
  Cloudflare worker. three-phone has no worker of its own, and a three.js page and a p5.js page
  can be in one room together.
  - `shareSetup({ host, room, app, shared, me, keep, quiet, autoReconnect, sendInterval,
    disconnectWhenHidden, keepScreenOn })`. `?shareHost=`, `?room=` and `?app=` in the address win
    over the config, and the console says so when they replace a value the sketch set.
  - Joining: `enableShareTap/Button/Canvas/Banner/On` (a label string or an options object), each
    running `userSetupComplete()` like the other `enable*` helpers; `'share'` (aliases `room`,
    `rooms`) in `enablePermissions*` lists, which joins from the same tap without waiting for the
    room; and `shareConnect()` / `shareDisconnect()`.
  - The live objects `shared`, `me` and `guests` (each guest has an enumerable `id`, and `guests`
    is empty while the page is out of the room), plus `shareSet(path, value)` and
    `shareSetMe(path, value)` for dotted paths.
  - `shareEmit(name, data)` and the `shareEvent(name, data, from)` callback, with the sender's id.
  - Callbacks `shareReady`, `shareReceive(path, value)`, `shareClosed`, `shareHostChanged(isHost)`,
    `shareJoined(id, data)` and `shareLeft(id, data)`, as global functions like `bleReceive`.
  - Keep (`shareSetup({ keep: '24h' })`, `shareKept`, `shareKeptUntil`, `shareClear()`) and quiet
    (`shareSetup({ quiet: true })`, `shareQuiet`).
  - Helpers `shareGuest(id)`, `guestsWith(field, value?)`, `shareStatusText()`,
    `getShareJoinUrl()` and `isShareSupported()`, and the status globals `shareSupported`,
    `shareConnected`, `shareStatus`, `shareError`, `shareRoom`, `shareClientId`, `shareIsHost`.
- **`keepScreenOn(on = true)`** and `window.screenAwake`: a screen wake lock that is asked for
  again when the page comes back. Joining a Share room asks for it (inside the tap for `'share'` in
  `enablePermissions*`); `shareSetup({ keepScreenOn: false })` turns that off.
- **Example `share/01_shared_scene`**: every phone is a piece on one floor. Tap to move it, tilt to
  lean it, tap the crystal to recolor it for everyone, shake to pulse every phone's crystal and
  jump your piece on theirs. Joins with `enablePermissionsTap(['gyro', 'share'])`. Added to the
  homepage (Input · Share), with a Share API section, a permission-matrix row and a
  compatibility row.
- `npm test` runs `test-share-contract.js` (102 checks: the path, JSON, URL, keep and quiet
  helpers, and the worker's `protocol.ts` when a p5-phone checkout is found).
- `npm run test:share` (`test-share-e2e.js`, 121 checks): starts `wrangler dev` for p5-phone's
  worker and drives emulated phones in Chromium through every join style, sync, events with the
  sender id, joins and leaves, the helpers, reconnect, hidden pages, host handoff, concurrent
  writes, join links, the wake lock, keep, quiet and the example. It finds the worker through
  `SHARE_SERVER_DIR`, `P5_PHONE_DIR`, or a `p5-phone` folder next to the repo, and uses that
  checkout's Playwright when this repo has none.
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

### Not ported
- `enableShareMinimal()` and the desktop QR (`showDesktopQr()`): three-phone has no Minimal
  permission style and no QR panel. `getShareJoinUrl()` gives the join link for a QR of your own.

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
