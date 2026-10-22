window.THREEPHONE_PERMISSION_MATRIX = [
  { capability: 'Motion sensors', status: 'window.sensorsEnabled', tap: 'enableGyroTap(message)', button: 'enableGyroButton(text)', canvas: 'enableGyroCanvas(message)', banner: 'enableGyroBanner(message, position)', custom: 'enableGyroOn(selector)', notes: 'Enables rotationX/Y/Z, accelerationX/Y/Z, deviceMoved(), deviceShaken(), and the applyDeviceRotation() helper.' },
  { capability: 'Microphone', status: 'window.micEnabled', tap: 'enableMicTap(message)', button: 'enableMicButton(text)', canvas: 'enableMicCanvas(message)', banner: 'enableMicBanner(message, position)', custom: 'enableMicOn(selector)', notes: 'Starts a Web Audio analyser; read the level with getMicLevel().' },
  { capability: 'Sound output', status: 'window.soundEnabled', tap: 'enableSoundTap(message)', button: 'enableSoundButton(text)', canvas: 'enableSoundCanvas(message)', banner: 'enableSoundBanner(message, position)', custom: 'enableSoundOn(selector)', notes: 'Resumes three-phone AND THREE.AudioContext so THREE.Audio / PositionalAudio play after the gesture.' },
  { capability: 'Speech recognition', status: 'window.speechEnabled', tap: 'enableSpeechTap(message)', button: 'enableSpeechButton(text)', canvas: 'enableSpeechCanvas(message)', banner: 'enableSpeechBanner(message, position)', custom: 'enableSpeechOn(selector)', notes: 'Unlocks the audio context. Create your own SpeechRecognition after permission.' },
  { capability: 'Vibration', status: 'window.vibrationEnabled', tap: 'enableVibrationTap(message)', button: 'enableVibrationButton(text)', canvas: 'enableVibrationCanvas(message)', banner: 'enableVibrationBanner(message, position)', custom: 'enableVibrationOn(selector)', notes: 'Android-only. Use vibrate(pattern) for haptics.' },
  { capability: 'Torch / flashlight', status: 'window.torchEnabled, window.torchActive', tap: 'enableTorchTap(message)', button: 'enableTorchButton(text)', canvas: 'enableTorchCanvas(message)', banner: 'enableTorchBanner(message, position)', custom: 'enableTorchOn(selector)', notes: 'Android Chrome-oriented. Starts a rear camera stream; control with torchOn(), torchOff(), toggleTorch().' },
  { capability: 'NFC', status: 'window.nfcEnabled', tap: 'enableNfcTap(message)', button: 'enableNfcButton(text)', canvas: 'enableNfcCanvas(message)', banner: 'enableNfcBanner(message, position)', custom: 'enableNfcOn(selector)', notes: 'Android Chrome 89+ over HTTPS only. Use nfcRead(message, serialNumber).' },
  { capability: 'GPS / geolocation', status: 'window.geoEnabled', tap: 'enableGeoTap(message)', button: 'enableGeoButton(text)', canvas: 'enableGeoCanvas(message)', banner: 'enableGeoBanner(message, position)', custom: 'enableGeoOn(selector)', notes: 'iOS Safari + Android Chrome over HTTPS. Coarse by default; setGeoOptions({ enableHighAccuracy: true }) for real GPS. Use geoRead(position).' },
  { capability: 'Bluetooth (BLE)', status: 'window.bleConnected', tap: 'enableBleTap(options?)', button: 'enableBleButton(options?)', canvas: 'enableBleCanvas(options?)', banner: 'enableBleBanner(options?)', custom: 'enableBleOn(selector)', notes: 'Call bleSetup() first. Chrome/Edge over HTTPS. iOS: Bluefy browser.' },
  { capability: 'Share (multi-phone room)', status: 'window.shareConnected', tap: 'enableShareTap(label | options?)', button: 'enableShareButton(label | options?)', canvas: 'enableShareCanvas(label | options?)', banner: 'enableShareBanner(label | options?)', custom: 'enableShareOn(selector)', notes: "Call shareSetup() first. Any browser with WebSocket. Joining also keeps the screen on. 'share' works in enablePermissions* lists." },
  { capability: 'Camera', status: 'window.cameraEnabled || cam.ready', tap: 'enableCameraTap(message)', button: 'enableCameraButton(text)', canvas: 'enableCameraCanvas(message)', banner: 'enableCameraBanner(message, position)', custom: 'enableCameraOn(selector)', notes: 'Pair with createPhoneCamera(); use cam.getTexture() / cam.createBackgroundMesh() to show the feed in three.js.' },
  { capability: 'AR (camera + sensors)', status: 'window.arEnabled', tap: 'enableARTap(message)', button: 'enableARButton(text)', canvas: 'enableARCanvas(message)', banner: 'enableARBanner(message, position)', custom: 'enableAROn(selector)', notes: "Sugar for enablePermissionsTap(['camera','sensors']). iOS shows two prompts (motion, then camera) from one tap." },
  { capability: 'WebXR immersive-ar', status: 'window.xrActive', tap: 'enableXRTap(message)', button: 'enableXRButton(text)', canvas: '—', banner: '—', custom: 'enableXROn(selector)', notes: 'Android Chrome over HTTPS only. Session request must happen inside the gesture; use renderer.setAnimationLoop.' },
  { capability: 'Motion + microphone', status: 'window.sensorsEnabled && window.micEnabled', tap: 'enableAllTap(message)', button: 'enableAllButton(text)', canvas: 'enableAllCanvas(message)', banner: 'enableAllBanner(message, position)', custom: 'enableAllOn(selector)', notes: 'Convenience flow for sketches that need both sensors and mic.' },
  { capability: 'Any combination', status: 'depends on selected permissions', tap: "enablePermissionsTap(['sensors', 'torch'])", button: "enablePermissionsButton(['torch', 'vibration'], text)", canvas: "enablePermissionsCanvas(['camera', 'mic'])", banner: "enablePermissionsBanner(['sensors', 'nfc'], msg)", custom: "enablePermissionsOn(selector, ['camera', 'mic'])", notes: "Use sensors, mic, sound, speech, vibration, torch, nfc, geo, camera, and share in any combination (enablePermissionsTap(['gyro', 'share']) asks for motion and joins the room in one tap). enableHardware* aliases also work." }
];

window.THREEPHONE_API_SECTIONS = [
  {
    id: 'core',
    title: 'Core Setup',
    description: 'Functions most sketches call before enabling hardware. Point three-phone at your renderer canvas with setPhoneCanvas().',
    relatedApis: [
      { label: 'WebGLRenderer', href: 'https://threejs.org/docs/#api/en/renderers/WebGLRenderer', summary: 'The three.js renderer whose canvas three-phone binds gestures to.' },
      { label: 'Pointer Events', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events', summary: 'The unified mouse+touch events behind the touch subsystem.' }
    ],
    items: [
      { name: 'lockGestures', signature: 'lockGestures(options?)', summary: 'Disables browser gestures that interfere with mobile sketches. Default fullscreen mode blocks scroll, zoom, pull-to-refresh, context menu, and back-swipe. Use { mode: "embedded", element: canvas } for a canvas inside a scrollable page.', tags: ['setup', 'mobile'] },
      { name: 'unlockGestures', signature: 'unlockGestures()', summary: 'Removes gesture blocking and restores saved handlers.', tags: ['setup', 'mobile'] },
      { name: 'setPhoneCanvas', signature: 'setPhoneCanvas(rendererOrCanvas)', summary: 'Tell three-phone which canvas is your scene. Accepts a THREE.WebGLRenderer, a canvas, or a CSS selector. Optional — the three.js canvas is auto-detected otherwise.', tags: ['setup'] },
      { name: 'userSetupComplete', signature: 'function userSetupComplete() { ... }', summary: 'Optional sketch callback three-phone calls once after a permission request succeeds.', tags: ['callback'] }
    ]
  },
  {
    id: 'motion',
    title: 'Motion Sensors',
    description: 'three-phone owns the DeviceOrientation/DeviceMotion listeners and exposes p5-compatible globals (always in degrees), plus three.js-native helpers.',
    relatedApis: [
      { label: 'DeviceOrientationEvent', href: 'https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent', summary: 'The browser event behind rotationX/Y/Z.' },
      { label: 'THREE.Quaternion', href: 'https://threejs.org/docs/#api/en/math/Quaternion', summary: 'What getRotationQuaternion()/applyDeviceRotation() drive.' }
    ],
    items: [
      { name: 'enableGyroTap', signature: 'enableGyroTap(message)', summary: 'Full-screen tap overlay to request motion permission. (enableSensorTap is an alias.)', tags: ['tap', 'motion'] },
      { name: 'rotationX / Y / Z', signature: 'window.rotationX // beta, gamma, alpha (degrees)', summary: 'Device tilt in degrees: rotationX=beta, rotationY=gamma, rotationZ=alpha. pRotationX/Y/Z hold the previous values.', tags: ['motion', 'orientation'] },
      { name: 'accelerationX / Y / Z', signature: 'window.accelerationX // m/s^2', summary: 'Device acceleration (matches p5: acceleration * 2). pAccelerationX/Y/Z hold the previous values.', tags: ['motion', 'accelerometer'] },
      { name: 'rotationRateAlpha / Beta / Gamma', signature: 'window.rotationRateAlpha // deg/s', summary: 'How fast the device is turning, in degrees per second (a three-phone extra p5 lacks).', tags: ['motion', 'gyroscope'] },
      { name: 'deviceMoved / deviceShaken', signature: 'function deviceShaken() { ... }', summary: 'Callbacks fired when movement/shake cross the thresholds. Tune with setMoveThreshold() (0.5) and setShakeThreshold() (30).', tags: ['motion', 'deviceMoved', 'deviceShaken', 'threshold'] },
      { name: 'applyDeviceRotation', signature: 'applyDeviceRotation(object3D, { smooth })', summary: 'Rotate an Object3D to match device attitude each frame. smooth (0..~0.9) slerps for a softer follow.', tags: ['motion', 'orientation'] },
      { name: 'getRotationQuaternion / getRotationEuler', signature: 'getRotationQuaternion(target?)', summary: 'The device orientation as a THREE.Quaternion or THREE.Euler for driving your own transforms.', tags: ['motion', 'orientation'] },
      { name: 'window.sensorsEnabled', signature: 'window.sensorsEnabled', summary: 'True once motion sensors are active (or the Android no-op path succeeds).', tags: ['status'] }
    ]
  },
  {
    id: 'touch',
    title: 'Touch & Picking',
    description: 'Installed at load — no permission needed. p5-compatible touch globals plus three.js raycasting helpers.',
    relatedApis: [
      { label: 'THREE.Raycaster', href: 'https://threejs.org/docs/#api/en/core/Raycaster', summary: 'What getTouchRaycaster() configures for you.' }
    ],
    items: [
      { name: 'touches', signature: 'window.touches // [{ x, y, id }]', summary: 'Every active finger. Also window.mouseX/mouseY/pmouseX/pmouseY.', tags: ['touch'] },
      { name: 'touchStarted / touchMoved / touchEnded', signature: 'function touchStarted(event) { ... }', summary: 'Optional callbacks fired on pointer down/move/up.', tags: ['touch'] },
      { name: 'getTouchRaycaster', signature: 'getTouchRaycaster(x, y, camera, raycaster?)', summary: 'Build a raycaster from a screen point through the camera to pick 3D objects.', tags: ['touch'] },
      { name: 'screenToWorld', signature: 'screenToWorld(x, y, camera, z?)', summary: 'Project a screen point into the 3D world at depth z.', tags: ['touch'] }
    ]
  },
  {
    id: 'audio',
    title: 'Microphone, Sound & Speech',
    description: 'A Web Audio mic analyser plus audio-context unlock that also resumes three.js audio.',
    relatedApis: [
      { label: 'THREE.AudioAnalyser', href: 'https://threejs.org/docs/#api/en/audio/AudioAnalyser', summary: 'Feed it getMicStream() or a THREE.Audio for reactive visuals.' },
      { label: 'Web Speech API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API', summary: 'Bring your own SpeechRecognition after enableSpeechTap().' }
    ],
    items: [
      { name: 'enableMicTap', signature: 'enableMicTap(message)', summary: 'Request the microphone and start level metering.', tags: ['tap', 'microphone'] },
      { name: 'getMicLevel', signature: 'getMicLevel() // 0..1', summary: 'Current input loudness (RMS). Read it in your animate loop.', tags: ['microphone'] },
      { name: 'getMicStream / getAudioContext', signature: 'getMicStream()', summary: 'The live MediaStream and shared AudioContext for THREE.AudioAnalyser, ml5, etc.', tags: ['microphone'] },
      { name: 'enableSoundTap', signature: 'enableSoundTap(message)', summary: 'Unlock audio playback and resume THREE.AudioContext so THREE.Audio / PositionalAudio start.', tags: ['tap', 'sound'] },
      { name: 'enableSpeechTap', signature: 'enableSpeechTap(message)', summary: 'Unlock audio for the Web Speech API without creating a mic analyser.', tags: ['tap', 'speech'] }
    ]
  },
  {
    id: 'camera',
    title: 'Camera (PhoneCamera)',
    description: 'A native getUserMedia camera with a three.js VideoTexture and mirror-aware coordinate mapping for ml5.',
    relatedApis: [
      { label: 'THREE.VideoTexture', href: 'https://threejs.org/docs/#api/en/textures/VideoTexture', summary: 'What cam.getTexture() returns.' },
      { label: 'ml5.js', href: 'https://docs.ml5js.org/', summary: 'Feed cam.videoElement to bodyPose / faceMesh / handPose.' }
    ],
    items: [
      { name: 'createPhoneCamera', signature: "createPhoneCamera(active?, mirror?, mode?)", summary: "Create a camera. active 'user'|'environment'; mode 'fitWidth'|'fitHeight'|'cover'|'contain'|'fixed'. Init happens on the enableCamera* gesture.", tags: ['camera'] },
      { name: 'enableCameraTap', signature: 'enableCameraTap(message)', summary: 'Request camera permission and start any created PhoneCameras.', tags: ['tap', 'camera'] },
      { name: 'cam.getTexture', signature: 'cam.getTexture()', summary: 'A lazily-created THREE.VideoTexture of the feed (sRGB).', tags: ['camera'] },
      { name: 'cam.createBackgroundMesh', signature: 'cam.createBackgroundMesh(width?, height?)', summary: 'A screen-filling plane with the camera texture for an ortho overlay. Call cam.updateBackground() on resize.', tags: ['camera'] },
      { name: 'cam.mapKeypoints', signature: 'cam.mapKeypoints(keypoints)', summary: 'Map ml5 keypoints from video space to canvas coordinates (mirror-aware). Also mapPoint / mapKeypoint / mapBox(es).', tags: ['camera', 'ml5'] }
    ]
  },
  {
    id: 'ar',
    title: 'Magic-Window AR',
    description: 'Camera-feed AR that runs in any mobile browser: a live rear-camera background plus gyro look-around, no WebXR required. Enable it from a user tap, then attach the feed behind your scene.',
    relatedApis: [
      { label: 'THREE.VideoTexture', href: 'https://threejs.org/docs/#api/en/textures/VideoTexture', summary: 'The camera feed PhoneCamera.attachBackground() renders behind the scene.' },
      { label: 'DeviceOrientationEvent', href: 'https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent', summary: 'The sensor behind applyDeviceRotation() look-around.' }
    ],
    items: [
      { name: 'enableARTap', signature: 'enableARTap(message)', summary: "One tap requests both camera and motion for magic-window AR. Full family: enableARButton(text), enableARCanvas(message), enableARBanner(message, position), enableAROn(selector). The 'ar' token also works in enablePermissionsTap(['ar', 'vibration']) and friends.", tags: ['tap', 'ar', 'camera', 'motion'] },
      { name: 'cam.attachBackground', signature: 'cam.attachBackground(scene)', summary: 'Set the PhoneCamera feed as a screen-filling scene background. Call it inside cam.onReady(); call cam.updateBackground() on resize.', tags: ['ar', 'camera'] },
      { name: 'applyDeviceRotation', signature: 'applyDeviceRotation(camera, { smooth })', summary: 'Drive the camera (or any Object3D) from device attitude for look-around. smooth (0..~0.9) slerps for a softer follow. Shared with Motion Sensors.', tags: ['ar', 'motion', 'orientation'] },
      { name: 'window.arEnabled', signature: 'if (window.arEnabled) { ... }', summary: 'True once camera and motion are both active for the magic-window flow.', tags: ['status', 'ar'] }
    ]
  },
  {
    id: 'xr',
    title: 'WebXR (immersive-ar)',
    description: 'True immersive-ar sessions via the WebXR Device API on Android Chrome. Note: drive the scene with renderer.setAnimationLoop (not requestAnimationFrame), do not set scene.background, and serve over HTTPS — Android Chrome only.',
    relatedApis: [
      { label: 'WebXR Device API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API', summary: 'The underlying immersive-ar session API.' },
      { label: 'WebXR Hit Test', href: 'https://developer.mozilla.org/en-US/docs/Web/API/XRHitTestResult', summary: 'Real-surface hits that getXRHitPose() reads from the frame.' }
    ],
    items: [
      { name: 'enableXRTap', signature: 'enableXRTap(message)', summary: 'One tap requests an immersive-ar session. Also enableXRButton(text) and enableXROn(selector). The session request must happen inside the gesture.', tags: ['tap', 'xr'] },
      { name: 'isXRSupported', signature: 'isXRSupported() // Promise<boolean>', summary: 'Resolve whether immersive-ar is available before offering an XR entry point.', tags: ['xr'] },
      { name: 'getXRHitPose', signature: 'getXRHitPose(frame)', summary: 'Read the current hit-test pose from the XRFrame for reticle placement. Use it inside the setAnimationLoop callback.', tags: ['xr', 'hit-test'] },
      { name: 'endXR', signature: 'endXR()', summary: 'End the active immersive-ar session. xrSessionStarted() / xrSessionEnded() callbacks fire on entry and exit.', tags: ['xr'] },
      { name: 'xrSupported / xrEnabled / xrActive', signature: 'if (window.xrActive) { ... }', summary: 'Status flags: xrSupported (device capable), xrEnabled (helper armed), xrActive (session running). XR select events route through touchStarted().', tags: ['status', 'xr'] },
      { name: 'Render loop & setup', signature: 'renderer.setAnimationLoop(render)', summary: 'WebXR requires renderer.setAnimationLoop — not requestAnimationFrame. Do not set scene.background (the passthrough camera shows through). Android Chrome over HTTPS only.', tags: ['xr'] }
    ]
  },
  {
    id: 'nfc',
    title: 'NFC',
    description: 'Read NFC tags on Android Chrome and give them friendly names.',
    relatedApis: [
      { label: 'Web NFC', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API', summary: 'The underlying NDEFReader API.' }
    ],
    items: [
      { name: 'enableNfcTap', signature: 'enableNfcTap(message)', summary: 'Start NFC scanning (Android Chrome 89+, HTTPS).', tags: ['tap', 'nfc'] },
      { name: 'nfcRead', signature: 'function nfcRead(message, serialNumber) { ... }', summary: 'Callback fired when a tag is read.', tags: ['nfc'] },
      { name: 'setNfcTagAlias / isNfcTag', signature: "setNfcTagAlias(serial, 'name')", summary: 'Name a tag, then test the last read with isNfcTag("name").', tags: ['nfc', 'aliases'] }
    ]
  },
  {
    id: 'geo',
    title: 'GPS / Geolocation',
    description: 'Watch position over HTTPS with helpful geo math.',
    relatedApis: [
      { label: 'Geolocation API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API', summary: 'The underlying watchPosition API.' }
    ],
    items: [
      { name: 'enableGeoTap', signature: 'enableGeoTap(message)', summary: 'Start a position watch. setGeoOptions({ enableHighAccuracy: true }) before it for real GPS.', tags: ['tap', 'geo'] },
      { name: 'geoRead / getGeoPosition', signature: 'function geoRead(position) { ... }', summary: 'Callback per update; getGeoPosition() reads the latest synchronously.', tags: ['geo'] },
      { name: 'geoDistance / geoInPolygon', signature: "geoDistance(lat1, lon1, lat2, lon2, 'm')", summary: 'Haversine distance and point-in-geofence tests.', tags: ['geo', 'geoDistance'] }
    ]
  },
  {
    id: 'ble',
    title: 'Bluetooth (BLE)',
    description: 'Typed, little-endian Web Bluetooth that pairs with the P5PhoneBLE Arduino companion.',
    relatedApis: [
      { label: 'Web Bluetooth', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API', summary: 'The underlying GATT API.' }
    ],
    items: [
      { name: 'bleSetup', signature: 'bleSetup({ characteristics: [...] })', summary: 'Declare typed characteristics (bool/int/float/string/bytes) with read/write/notify. UUIDs auto-derive from the service.', tags: ['ble'] },
      { name: 'enableBleTap', signature: 'enableBleTap(options?)', summary: 'Connect from a user gesture. Also bleConnect() / bleDisconnect().', tags: ['tap', 'ble'] },
      { name: 'bleWrite / bleRead / bleReceive', signature: "bleWrite('led', true)", summary: 'Write and read typed values; bleReceive(name, value) fires on notifications. Values also live in window.bleValues.', tags: ['ble'] }
    ]
  },
  {
    id: 'share',
    title: 'Share (many phones, one room)',
    description: "Sync plain JSON across phones in one room, so every phone changes the same 3D scene. Same API, wire protocol and server as p5-phone's Share: deploy p5-phone's P5PhoneShare worker (free Cloudflare tier) once for your project.",
    relatedApis: [
      { label: 'P5PhoneShare worker', href: 'https://github.com/npuckett/p5-phone/tree/main/companion/P5PhoneShare', summary: 'The PartyServer room three-phone and p5-phone both talk to. npx wrangler deploy prints your host URL.' },
      { label: 'Screen Wake Lock API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API', summary: 'What keepScreenOn() and joining a room use.' }
    ],
    items: [
      { name: 'shareSetup', signature: "shareSetup({ host, room, shared?, me?, keep?, quiet?, keepScreenOn? })", summary: "Configure the room in init(). ?shareHost= and ?room= in the address win (the console says so). keep: '24h' keeps shared after the last phone leaves; quiet: true skips the other phones' me changes; keepScreenOn: false skips the wake lock.", tags: ['share', 'setup'] },
      { name: 'enableShareTap', signature: "enableShareTap('Tap to join')", summary: "Join from a gesture (also Button, Canvas, Banner, On). Runs userSetupComplete(). Or put 'share' in enablePermissionsTap(['gyro', 'share']). Low level: shareConnect() / shareDisconnect().", tags: ['tap', 'share'] },
      { name: 'shared / me / guests', signature: 'shared.hue = 0.3; me.x = 1; for (const g of guests) ...', summary: "shared is the room's object, me is this phone's, guests the other phones' me (each with .id; empty while out of the room). Plain JSON only: no THREE.Vector3. shareSet(path, value) and shareSetMe(path, value) write by dotted path.", tags: ['share'] },
      { name: 'shareEmit / shareEvent', signature: 'shareEmit(name, data?) → function shareEvent(name, data, from) {}', summary: "One-shot room events, not stored. from is the sender's id, so shareGuest(from) is its me.", tags: ['share', 'callback'] },
      { name: 'shareReady / shareReceive / shareJoined / shareLeft', signature: 'function shareJoined(id, data) { ... }', summary: 'Optional callbacks: in the room; another phone changed a value (path, value); a phone joined after you; a phone left (its last me). Also shareHostChanged(isHost) and shareClosed().', tags: ['share', 'callback'] },
      { name: 'shareGuest / guestsWith / shareStatusText', signature: "guestsWith('role', 'phone')", summary: 'shareGuest(id) finds a guest (or your own me); guestsWith(field, value?) filters guests; shareStatusText() is one sentence about the connection for a DOM label.', tags: ['share'] },
      { name: 'shareClear / shareKept / shareQuiet', signature: 'shareClear()', summary: "shareClear() puts shared back to its starting value for every phone and erases the kept copy. shareKept / shareKeptUntil and shareQuiet say what the server agreed to.", tags: ['share', 'status'] },
      { name: 'getShareJoinUrl', signature: 'getShareJoinUrl()', summary: 'This page with shareHost, room and app in the address, to send to others or put in your own QR code. isShareSupported() checks for WebSocket.', tags: ['share'] },
      { name: 'keepScreenOn', signature: 'keepScreenOn(on = true) // Promise<boolean>', summary: 'Keep the screen on while the page shows, asking again when it comes back. Call it from a tap on iPhone. Joining a room calls it; window.screenAwake is true while it holds.', tags: ['share', 'wake lock'] }
    ]
  },
  {
    id: 'vibration',
    title: 'Vibration',
    description: 'Haptics on Android (iOS Safari has no Vibration API).',
    relatedApis: [
      { label: 'Vibration API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate', summary: 'The underlying navigator.vibrate.' }
    ],
    items: [
      { name: 'enableVibrationTap', signature: 'enableVibrationTap(message)', summary: 'Enable vibration from a user gesture.', tags: ['tap', 'vibration'] },
      { name: 'vibrate', signature: 'vibrate(pattern)', summary: 'Vibrate for a duration (ms) or a [on, off, on, ...] pattern.', tags: ['vibration'] }
    ]
  },
  {
    id: 'torch',
    title: 'Torch / Flashlight',
    description: 'Control the rear-camera torch on Android Chrome.',
    relatedApis: [
      { label: 'MediaStreamTrack torch', href: 'https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints#torch', summary: 'The underlying track constraint.' }
    ],
    items: [
      { name: 'enableTorchTap', signature: 'enableTorchTap(message)', summary: 'Start the rear camera stream for torch control.', tags: ['tap', 'torch'] },
      { name: 'torchOn / torchOff / toggleTorch', signature: 'toggleTorch()', summary: 'Control the flashlight. isTorchSupported() reports capability. flashlight* aliases exist.', tags: ['torch'] }
    ]
  },
  {
    id: 'debug',
    title: 'Debug Console',
    description: 'An on-screen console, invaluable on a phone with no devtools.',
    relatedApis: [],
    items: [
      { name: 'showDebug / hideDebug / toggleDebug', signature: 'showDebug()', summary: 'Show the on-screen panel; it also captures errors and console output.', tags: ['debug'] },
      { name: 'debug / debugWarn / debugError', signature: "debug('value', x)", summary: 'Log to the panel and the browser console.', tags: ['debug'] }
    ]
  },
  {
    id: 'status',
    title: 'Status Flags',
    description: 'Guard hardware code with the positive-enabled pattern.',
    relatedApis: [],
    items: [
      { name: 'window.sensorsEnabled', signature: 'if (window.sensorsEnabled) { ... }', summary: 'Also micEnabled, soundEnabled, speechEnabled, vibrationEnabled, torchEnabled, nfcEnabled, geoEnabled, cameraEnabled, bleConnected, shareConnected, screenAwake, gesturesLocked.', tags: ['status'] },
      { name: 'permissionsReady', signature: "addEventListener('permissionsReady', e => ...)", summary: 'A window CustomEvent dispatched after any permission succeeds; detail carries every flag.', tags: ['status', 'callback'] }
    ]
  }
];
