# Changelog

All notable changes to three-phone are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

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
