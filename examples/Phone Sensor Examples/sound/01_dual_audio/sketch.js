// ==============================================
// DUAL AUDIO — spatial sound with THREE.PositionalAudio
// ==============================================
// enableSoundTap() unlocks audio; then two glowing orbs each play a tone from a
// THREE.PositionalAudio. The camera slowly orbits, so you HEAR them pan left and
// right (use headphones). Tap an orb to mute/unmute it.
// No audio files — the tones come from Web Audio oscillators.
// ==============================================

let renderer, scene, camera, listener, raycaster;
let orbs = [];
let t0 = 0;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.8));
  raycaster = new THREE.Raycaster();

  listener = new THREE.AudioListener();
  camera.add(listener);

  makeOrb(-2.4, 0x5dd0ff, 220);   // left, low tone
  makeOrb(2.4, 0xff5d8f, 330);    // right, higher tone

  showDebug();
  setPhoneCanvas(renderer);
  enableSoundTap('Tap to enable spatial sound');
  lockGestures();
  addEventListener('resize', onResize);
  t0 = performance.now();
  animate();
}

function makeOrb(x, color, freq) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 32, 32),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.3 })
  );
  mesh.position.set(x, 0, 0);
  mesh.userData = { color, freq, on: true, sound: null };
  scene.add(mesh);
  orbs.push(mesh);
}

// After the sound gesture, build the oscillators on THREE's audio context.
function userSetupComplete() {
  if (!window.soundEnabled) return;
  const ctx = listener.context;
  for (const orb of orbs) {
    if (orb.userData.sound) continue;
    const sound = new THREE.PositionalAudio(listener);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = orb.userData.freq;
    osc.start();
    sound.setNodeSource(osc);
    sound.setRefDistance(1.5);
    orb.add(sound);
    orb.userData.sound = sound;
  }
}

function touchStarted() {
  const rc = getTouchRaycaster(mouseX, mouseY, camera, raycaster);
  const hit = rc.intersectObjects(orbs)[0];
  if (hit && hit.object.userData.sound) {
    const o = hit.object.userData;
    o.on = !o.on;
    hit.object.userData.sound.setVolume(o.on ? 1 : 0);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const t = (performance.now() - t0) * 0.0004;
  camera.position.set(Math.sin(t) * 6, 1.5, Math.cos(t) * 6);
  camera.lookAt(0, 0, 0);
  for (const orb of orbs) {
    orb.material.emissiveIntensity = orb.userData.on ? 0.4 + Math.sin(performance.now() * 0.005) * 0.2 : 0.05;
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
