// ==============================================
// NFC TWO-TAG THEMES
// ==============================================
// Give two NFC tags friendly names with setNfcTagAlias(), then isNfcTag() lets
// you react to each by name. Here one tag switches the scene to a warm "day"
// theme and the other to a cool "night" theme (materials, fog, light color).
//
// SETUP: tap "day" tag first to learn it, then "night" — or hard-code serials.
// (Android Chrome 89+ over HTTPS.)
// ==============================================

let renderer, scene, camera, crystal, light;
let learned = [];   // first two distinct serials become day/night
let theme = 'day';

const THEMES = {
  day:   { bg: 0xf3e9d2, fog: 0xf3e9d2, light: 0xfff2c0, mat: 0xff8c42 },
  night: { bg: 0x0a1030, fog: 0x0a1030, light: 0x6d9bff, mat: 0x8b5cf6 }
};

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a1030, 6, 16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  scene.add(new THREE.AmbientLight(0x333333, 1));
  light = new THREE.DirectionalLight(0xffffff, 1.6);
  light.position.set(2, 4, 4);
  scene.add(light);

  crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.8, 0),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.2, metalness: 0.4, flatShading: true })
  );
  scene.add(crystal);

  applyTheme('night');
  showDebug();
  setPhoneCanvas(renderer);
  enableNfcTap('Tap to enable NFC, then scan two tags');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function nfcRead(message, serial) {
  if (!learned.includes(serial) && learned.length < 2) {
    const name = learned.length === 0 ? 'day' : 'night';
    setNfcTagAlias(serial, name);
    learned.push(serial);
    debug('learned "' + name + '" tag: ' + serial);
  }
  if (isNfcTag('day', serial)) applyTheme('day');
  else if (isNfcTag('night', serial)) applyTheme('night');
  else applyTheme(theme === 'day' ? 'night' : 'day');  // unknown tag toggles
}

function applyTheme(name) {
  theme = name;
  const t = THEMES[name];
  scene.background = new THREE.Color(t.bg);
  scene.fog.color.setHex(t.fog);
  light.color.setHex(t.light);
  crystal.material.color.setHex(t.mat);
  debug('theme → ' + name);
}

function animate() {
  requestAnimationFrame(animate);
  crystal.rotation.x += 0.006;
  crystal.rotation.y += 0.009;
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
