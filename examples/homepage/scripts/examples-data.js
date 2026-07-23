// Example catalog data for the three-phone docs site.
window.THREEPHONE_EXAMPLES_BASE_URL = 'https://npuckett.github.io/three-phone/examples/';
window.THREEPHONE_GITHUB_BASE_URL = 'https://github.com/npuckett/three-phone/tree/main/';

// The parallel p5-phone site — used to cross-link each example to its p5.js twin.
var P5PHONE_BASE = 'https://npuckett.github.io/p5-phone/examples/';
var THREE_V = '0.185';

window.THREEPHONE_EXAMPLES = [
  // ---------- Start ----------
  { id: 'blank-template', title: 'Blank Template', category: 'Start', subcategory: 'Starter', level: 'Starter', three: THREE_V,
    description: 'Lit three.js scene plus the three-phone permission pattern — the copy-to-start skeleton.',
    path: 'blankTemplate/', sourcePath: 'examples/blankTemplate', capabilities: ['setup', 'lockGestures'], platforms: ['iOS', 'Android', 'Desktop'] },

  // ---------- Input · Touch ----------
  { id: 'touch-basic', title: 'Touch Basic', category: 'Input', subcategory: 'Touch', level: 'Starter', three: THREE_V,
    description: 'Raycast-pick cubes with getTouchRaycaster(); the picked cube pops and recolors.',
    path: 'Phone%20Sensor%20Examples/touch/01_touch_basic/', sourcePath: 'examples/Phone%20Sensor%20Examples/touch/01_touch_basic', capabilities: ['touch'], platforms: ['iOS', 'Android', 'Desktop'] },
  { id: 'touch-zones', title: 'Touch Zones', category: 'Input', subcategory: 'Touch', level: 'Starter', three: THREE_V,
    description: 'Four screen quadrants toggle colored spotlights on a central sculpture.',
    path: 'Phone%20Sensor%20Examples/touch/02_touch_zones/', sourcePath: 'examples/Phone%20Sensor%20Examples/touch/02_touch_zones', capabilities: ['touch'], platforms: ['iOS', 'Android', 'Desktop'] },
  { id: 'touch-count', title: 'Touch Count', category: 'Input', subcategory: 'Touch', level: 'Starter', three: THREE_V,
    description: 'One glowing orbiter per finger, placed with screenToWorld() from window.touches.',
    path: 'Phone%20Sensor%20Examples/touch/03_touch_count/', sourcePath: 'examples/Phone%20Sensor%20Examples/touch/03_touch_count', capabilities: ['touch'], platforms: ['iOS', 'Android', 'Desktop'] },
  { id: 'touch-distance', title: 'Touch Distance', category: 'Input', subcategory: 'Touch', level: 'Intermediate', three: THREE_V,
    description: 'Pinch distance between two fingers dollies the camera into a 3D diorama.',
    path: 'Phone%20Sensor%20Examples/touch/04_touch_distance/', sourcePath: 'examples/Phone%20Sensor%20Examples/touch/04_touch_distance', capabilities: ['touch'], platforms: ['iOS', 'Android', 'Desktop'] },
  { id: 'touch-angle', title: 'Touch Angle', category: 'Input', subcategory: 'Touch', level: 'Intermediate', three: THREE_V,
    description: 'Two-finger angle twists an object around the view axis with an arc helper.',
    path: 'Phone%20Sensor%20Examples/touch/05_touch_angle/', sourcePath: 'examples/Phone%20Sensor%20Examples/touch/05_touch_angle', capabilities: ['touch'], platforms: ['iOS', 'Android', 'Desktop'] },

  // ---------- Input · Movement ----------
  { id: 'orientation-basic', title: 'Orientation Basic', category: 'Input', subcategory: 'Movement', level: 'Starter', three: THREE_V,
    description: 'A lit 3D phone matches your device attitude via applyDeviceRotation(), with a contact shadow.',
    path: 'Phone%20Sensor%20Examples/movement/01_orientation_basic/', sourcePath: 'examples/Phone%20Sensor%20Examples/movement/01_orientation_basic', capabilities: ['motion', 'orientation'], platforms: ['iOS', 'Android'] },
  { id: 'rotational-velocity', title: 'Rotational Velocity', category: 'Input', subcategory: 'Movement', level: 'Intermediate', three: THREE_V,
    description: 'Three rings spin at rotationRateAlpha/Beta/Gamma and glow with turn speed.',
    path: 'Phone%20Sensor%20Examples/movement/02_rotational_velocity/', sourcePath: 'examples/Phone%20Sensor%20Examples/movement/02_rotational_velocity', capabilities: ['motion', 'gyroscope'], platforms: ['iOS', 'Android'] },
  { id: 'acceleration', title: 'Acceleration', category: 'Input', subcategory: 'Movement', level: 'Intermediate', three: THREE_V,
    description: 'accelerationX/Y/Z roll a ball around a shadowed floor with wall bounces.',
    path: 'Phone%20Sensor%20Examples/movement/03_acceleration/', sourcePath: 'examples/Phone%20Sensor%20Examples/movement/03_acceleration', capabilities: ['motion', 'accelerometer'], platforms: ['iOS', 'Android'] },
  { id: 'device-shaken', title: 'Device Shaken', category: 'Input', subcategory: 'Movement', level: 'Intermediate', three: THREE_V,
    description: 'deviceShaken() fires an InstancedMesh particle burst and a vibration.',
    path: 'Phone%20Sensor%20Examples/movement/04_device_shaken/', sourcePath: 'examples/Phone%20Sensor%20Examples/movement/04_device_shaken', capabilities: ['motion', 'deviceShaken', 'vibration'], platforms: ['iOS', 'Android'] },
  { id: 'device-moved', title: 'Device Moved', category: 'Input', subcategory: 'Movement', level: 'Intermediate', three: THREE_V,
    description: 'deviceMoved() drops ripples into a vertex-displaced water plane.',
    path: 'Phone%20Sensor%20Examples/movement/05_device_moved/', sourcePath: 'examples/Phone%20Sensor%20Examples/movement/05_device_moved', capabilities: ['motion', 'deviceMoved'], platforms: ['iOS', 'Android'] },
  { id: 'device-orientation', title: 'Device Orientation', category: 'Input', subcategory: 'Movement', level: 'Intermediate', three: THREE_V,
    description: 'Portrait/landscape relays a grid of 3D tiles and tweens the camera FOV.',
    path: 'Phone%20Sensor%20Examples/movement/06_device_orientation/', sourcePath: 'examples/Phone%20Sensor%20Examples/movement/06_device_orientation', capabilities: ['motion', 'deviceOrientation'], platforms: ['iOS', 'Android'] },

  // ---------- Input · Microphone / Speech ----------
  { id: 'mic-level', title: 'Microphone Level', category: 'Input', subcategory: 'Microphone', level: 'Starter', three: THREE_V,
    description: 'getMicLevel() displaces and lights an icosahedron blob — audio-reactive geometry.',
    path: 'Phone%20Sensor%20Examples/microphone/01_mic_level/', sourcePath: 'examples/Phone%20Sensor%20Examples/microphone/01_mic_level', capabilities: ['microphone'], platforms: ['iOS', 'Android', 'Desktop'] },
  { id: 'speech-recognition', title: 'Speech Recognition', category: 'Input', subcategory: 'Speech', level: 'Intermediate', three: THREE_V,
    description: 'Recognized words spawn drifting 3D text sprites (Web Speech API).',
    path: 'Phone%20Sensor%20Examples/microphone/02_speech_recognition/', sourcePath: 'examples/Phone%20Sensor%20Examples/microphone/02_speech_recognition', capabilities: ['microphone', 'speech'], platforms: ['Android', 'Desktop'] },

  // ---------- Input · BLE / NFC / GPS ----------
  { id: 'ble-input', title: 'BLE Input', category: 'Input', subcategory: 'BLE', level: 'Advanced', three: THREE_V,
    description: 'A notified Arduino value drives a 3D tower height and color.',
    path: 'Phone%20Sensor%20Examples/ble/01_ble_input/', sourcePath: 'examples/Phone%20Sensor%20Examples/ble/01_ble_input', capabilities: ['ble'], platforms: ['Android', 'Desktop'],
    companion: { label: 'Arduino companion (P5PhoneBLE)', href: 'https://github.com/npuckett/p5-phone/tree/main/companion/P5PhoneBLE', absolute: true } },
  { id: 'nfc-read', title: 'NFC Read', category: 'Input', subcategory: 'NFC', level: 'Intermediate', three: THREE_V,
    description: 'Tag reads spawn floating 3D cards showing serial + text records.',
    path: 'Phone%20Sensor%20Examples/nfc/01_nfc_read/', sourcePath: 'examples/Phone%20Sensor%20Examples/nfc/01_nfc_read', capabilities: ['nfc'], platforms: ['Android'] },
  { id: 'nfc-two-tag', title: 'NFC Two-Tag Themes', category: 'Input', subcategory: 'NFC', level: 'Intermediate', three: THREE_V,
    description: 'setNfcTagAlias() + isNfcTag() switch day/night scene themes.',
    path: 'Phone%20Sensor%20Examples/nfc/02_two_tag_effects/', sourcePath: 'examples/Phone%20Sensor%20Examples/nfc/02_two_tag_effects', capabilities: ['nfc', 'aliases'], platforms: ['Android'] },
  { id: 'geo-watch', title: 'GPS Watch', category: 'Input', subcategory: 'GPS', level: 'Intermediate', three: THREE_V,
    description: 'A 3D radar disc: geoRead() scales an accuracy ring; geoDistance() drives a home beacon.',
    path: 'Phone%20Sensor%20Examples/geo/01_geo_watch/', sourcePath: 'examples/Phone%20Sensor%20Examples/geo/01_geo_watch', capabilities: ['geo', 'geoDistance'], platforms: ['iOS', 'Android', 'Desktop'] },

  // ---------- Input · Camera (three.js + ML5) ----------
  { id: 'camera-color-tracking', title: 'Color Tracking', category: 'Input', subcategory: 'Camera', family: 'Camera Basics', level: 'Advanced', three: THREE_V,
    description: 'PhoneCamera VideoTexture background; a lit 3D marker tracks a tapped color via cam.mapPoint().',
    path: 'Phone%20Sensor%20Examples/camera/01_color_tracking/', sourcePath: 'examples/Phone%20Sensor%20Examples/camera/01_color_tracking', capabilities: ['camera', 'color'], platforms: ['iOS', 'Android', 'Desktop'] },
  { id: 'ml5-bodypose', title: 'BodyPose (two points)', category: 'Input', subcategory: 'Camera', family: 'Three.js + ML5 Examples', level: 'Advanced', three: THREE_V,
    description: 'ml5 BodyPose: two wrist keypoints become lit 3D spheres joined by a bone.',
    path: 'ml5/BodyPose_two_points/', sourcePath: 'examples/ml5/BodyPose_two_points', capabilities: ['camera', 'ml5', 'bodypose'], platforms: ['iOS', 'Android', 'Desktop'],
    companion: { label: 'p5.js version (PHONE_BodyPose)', href: P5PHONE_BASE + 'ml5/PHONE_BodyPose_two_points/', absolute: true } },
  { id: 'ml5-facemesh', title: 'FaceMesh (two points)', category: 'Input', subcategory: 'Camera', family: 'Three.js + ML5 Examples', level: 'Advanced', three: THREE_V,
    description: 'ml5 FaceMesh: the two eye corners become 3D spheres joined by a bone.',
    path: 'ml5/FaceMesh_two_points/', sourcePath: 'examples/ml5/FaceMesh_two_points', capabilities: ['camera', 'ml5', 'facemesh'], platforms: ['iOS', 'Android', 'Desktop'],
    companion: { label: 'p5.js version (PHONE_FaceMesh)', href: P5PHONE_BASE + 'ml5/PHONE_FaceMesh_two_points/', absolute: true } },
  { id: 'ml5-handpose', title: 'HandPose (two points)', category: 'Input', subcategory: 'Camera', family: 'Three.js + ML5 Examples', level: 'Advanced', three: THREE_V,
    description: 'ml5 HandPose: thumb and index tips become 3D spheres; pinch distance readout.',
    path: 'ml5/HandPose_two_points/', sourcePath: 'examples/ml5/HandPose_two_points', capabilities: ['camera', 'ml5', 'handpose'], platforms: ['iOS', 'Android', 'Desktop'],
    companion: { label: 'p5.js version (PHONE_HandPose)', href: P5PHONE_BASE + 'ml5/PHONE_HandPose_two_points/', absolute: true } },

  // ---------- Output · Sound ----------
  { id: 'sound-dual-audio', title: 'Dual Audio (spatial)', category: 'Output', subcategory: 'Sound', level: 'Intermediate', three: THREE_V,
    description: 'Two orbs each carry THREE.PositionalAudio; an orbiting camera pans them left/right.',
    path: 'Phone%20Sensor%20Examples/sound/01_dual_audio/', sourcePath: 'examples/Phone%20Sensor%20Examples/sound/01_dual_audio', capabilities: ['sound'], platforms: ['iOS', 'Android', 'Desktop'] },
  { id: 'sound-volume-touches', title: 'Volume by Touch', category: 'Output', subcategory: 'Sound', level: 'Intermediate', three: THREE_V,
    description: 'Touch Y sets volume/filter; a THREE.AudioAnalyser feeds a 3D EQ ring.',
    path: 'Phone%20Sensor%20Examples/sound/02_volume_touches/', sourcePath: 'examples/Phone%20Sensor%20Examples/sound/02_volume_touches', capabilities: ['sound', 'touch'], platforms: ['iOS', 'Android', 'Desktop'] },
  { id: 'sound-motion-synth', title: 'Motion Synth', category: 'Output', subcategory: 'Sound', level: 'Advanced', three: THREE_V,
    description: 'Device tilt sets an oscillator pitch and filter; a torus-knot morphs with it.',
    path: 'Phone%20Sensor%20Examples/sound/03_motion_synth/', sourcePath: 'examples/Phone%20Sensor%20Examples/sound/03_motion_synth', capabilities: ['sound', 'motion'], platforms: ['iOS', 'Android'] },

  // ---------- Output · Vibration / Torch ----------
  { id: 'haptic-feedback', title: 'Haptic Feedback', category: 'Output', subcategory: 'Vibration', level: 'Starter', three: THREE_V,
    description: '3D buttons depress on tap and fire distinct vibrate() patterns.',
    path: 'Phone%20Sensor%20Examples/vibration/01_haptic_feedback/', sourcePath: 'examples/Phone%20Sensor%20Examples/vibration/01_haptic_feedback', capabilities: ['vibration', 'touch'], platforms: ['Android'] },
  { id: 'torch-touch-toggle', title: 'Torch Touch Toggle', category: 'Output', subcategory: 'Torch', level: 'Starter', three: THREE_V,
    description: 'Tap a 3D lantern to toggle the real flashlight with toggleTorch() + a matching light.',
    path: 'Phone%20Sensor%20Examples/torch/01_torch_touch_toggle/', sourcePath: 'examples/Phone%20Sensor%20Examples/torch/01_torch_touch_toggle', capabilities: ['torch', 'touch'], platforms: ['Android'] },
  { id: 'torch-disco', title: 'Torch Disco', category: 'Output', subcategory: 'Torch', level: 'Intermediate', three: THREE_V,
    description: 'The flashlight strobes on an interval synced to a hue-cycling 3D scene.',
    path: 'Phone%20Sensor%20Examples/torch/02_torch_disco/', sourcePath: 'examples/Phone%20Sensor%20Examples/torch/02_torch_disco', capabilities: ['torch', 'touch'], platforms: ['Android'] },
  { id: 'torch-shake-toggle', title: 'Torch Shake Toggle', category: 'Output', subcategory: 'Torch', level: 'Intermediate', three: THREE_V,
    description: 'Shaking flips the torch (enablePermissionsTap(["sensors","torch"])) with a flash.',
    path: 'Phone%20Sensor%20Examples/torch/03_shake_toggle/', sourcePath: 'examples/Phone%20Sensor%20Examples/torch/03_shake_toggle', capabilities: ['torch', 'motion', 'deviceShaken', 'combined permissions'], platforms: ['Android'] },

  // ---------- Output · BLE ----------
  { id: 'ble-send', title: 'BLE Send', category: 'Output', subcategory: 'BLE', level: 'Advanced', three: THREE_V,
    description: 'Tap a 3D switch to bleWrite() a boolean LED characteristic to the Arduino.',
    path: 'Phone%20Sensor%20Examples/ble/02_ble_send/', sourcePath: 'examples/Phone%20Sensor%20Examples/ble/02_ble_send', capabilities: ['ble', 'touch'], platforms: ['Android', 'Desktop'],
    companion: { label: 'Arduino companion (P5PhoneBLE)', href: 'https://github.com/npuckett/p5-phone/tree/main/companion/P5PhoneBLE', absolute: true } },
  { id: 'ble-both', title: 'BLE Both', category: 'Output', subcategory: 'BLE', level: 'Advanced', three: THREE_V,
    description: 'Bidirectional 3D dashboard: a notified value drives a dial; a button writes back.',
    path: 'Phone%20Sensor%20Examples/ble/03_ble_both/', sourcePath: 'examples/Phone%20Sensor%20Examples/ble/03_ble_both', capabilities: ['ble', 'touch'], platforms: ['Android', 'Desktop'],
    companion: { label: 'Arduino companion (P5PhoneBLE)', href: 'https://github.com/npuckett/p5-phone/tree/main/companion/P5PhoneBLE', absolute: true } },

  // ---------- Reference · UI Styles ----------
  { id: 'ui-banner', title: 'Banner Style', category: 'Reference', subcategory: 'UI Styles', level: 'Starter', three: THREE_V,
    description: 'enableGyroBanner() shows a slim top/bottom bar on an orientation cube.',
    path: 'UIStyles/banner-style/', sourcePath: 'examples/UIStyles/banner-style', capabilities: ['setup', 'motion'], platforms: ['iOS', 'Android'] },
  { id: 'ui-canvas', title: 'Canvas Style', category: 'Reference', subcategory: 'UI Styles', level: 'Starter', three: THREE_V,
    description: 'enableGyroCanvas() waits for the first touch on the three.js canvas — no overlay.',
    path: 'UIStyles/canvas-style/', sourcePath: 'examples/UIStyles/canvas-style', capabilities: ['setup', 'motion'], platforms: ['iOS', 'Android'] },
  { id: 'ui-custom', title: 'Custom Element', category: 'Reference', subcategory: 'UI Styles', level: 'Starter', three: THREE_V,
    description: 'enableGyroOn("#start") binds the permission request to your own HTML button.',
    path: 'UIStyles/custom-element/', sourcePath: 'examples/UIStyles/custom-element', capabilities: ['setup', 'motion'], platforms: ['iOS', 'Android'] },

  // ---------- Reference · Combined ----------
  { id: 'permissions-combo', title: 'Permissions Combo', category: 'Reference', subcategory: 'Combined', level: 'Advanced', three: THREE_V,
    description: 'enablePermissionsTap(["sensors","mic","vibration"]) — tilt a ball over mic-reactive terrain with haptic ticks.',
    path: 'Phone%20Sensor%20Examples/combined/01_permissions_combo/', sourcePath: 'examples/Phone%20Sensor%20Examples/combined/01_permissions_combo', capabilities: ['motion', 'microphone', 'vibration', 'combined permissions'], platforms: ['iOS', 'Android'] },
];

// Attach a p5.js cross-link to every example whose path exists 1:1 in p5-phone,
// unless the entry already declares its own companion link.
(function () {
  window.THREEPHONE_EXAMPLES.forEach(function (ex) {
    if (ex.companion) return;
    if (ex.path.indexOf('Phone%20Sensor%20Examples/') === 0 ||
        ex.path.indexOf('UIStyles/') === 0 ||
        ex.path === 'blankTemplate/') {
      ex.companion = { label: 'p5.js version (p5-phone)', href: P5PHONE_BASE + ex.path, absolute: true };
    }
  });
})();
