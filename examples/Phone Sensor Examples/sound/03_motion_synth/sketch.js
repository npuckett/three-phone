// ==============================================
// MOTION SYNTH — tilt to play
// ==============================================
// Combine motion + sound: device tilt (rotationX / rotationY) sets an oscillator's
// pitch and filter, and a glowing torus-knot morphs with the sound. Tilt to play.
// Uses enablePermissionsTap(['sensors','sound']).
// ==============================================

let renderer, scene, camera, listener, sound, filter, knot;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.9));
  const key = new THREE.PointLight(0xb98bff, 40, 20); key.position.set(2, 3, 4); scene.add(key);
  listener = new THREE.AudioListener();
  camera.add(listener);

  knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.1, 0.34, 200, 32),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x2a0f52, roughness: 0.3, metalness: 0.4 })
  );
  scene.add(knot);

  showDebug();
  setPhoneCanvas(renderer);
  enablePermissionsTap(['sensors', 'sound'], 'Tap to enable motion + sound');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function userSetupComplete() {
  if (!window.soundEnabled || sound) return;
  const ctx = listener.context;
  sound = new THREE.Audio(listener);
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 220;
  osc.start();
  sound.setNodeSource(osc);
  sound.setVolume(0.5);
  filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;
  sound.setFilter(filter);
}

function animate() {
  requestAnimationFrame(animate);

  if (window.sensorsEnabled && sound) {
    // rotationX (-180..180) → pitch; rotationY (-90..90) → filter cutoff.
    const pitch = 120 + ((rotationX + 180) / 360) * 500;
    const cutoff = 300 + ((rotationY + 90) / 180) * 4000;
    sound.source && (sound.source.frequency.value += (pitch - sound.source.frequency.value) * 0.1);
    filter.frequency.value += (cutoff - filter.frequency.value) * 0.1;
    knot.scale.setScalar(0.9 + ((rotationY + 90) / 180) * 0.5);
    knot.material.emissiveIntensity = 0.3 + ((rotationX + 180) / 360) * 2;
    debug('pitch ' + pitch.toFixed(0) + 'Hz  cutoff ' + cutoff.toFixed(0) + 'Hz');
  }
  knot.rotation.x += 0.006;
  knot.rotation.y += 0.008;

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
