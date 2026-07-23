// ==============================================
// VOLUME BY TOUCH — audio-reactive EQ ring
// ==============================================
// Drag up/down to set volume + brightness of a looping tone. A THREE.AudioAnalyser
// reads the live signal and drives a ring of 3D EQ bars.
// enableSoundTap() unlocks audio; the tone is a Web Audio oscillator.
// ==============================================

let renderer, scene, camera, listener, sound, analyser;
let bars = [];
const N = 32;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 3.5, 7);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 1));
  listener = new THREE.AudioListener();
  camera.add(listener);

  for (let i = 0; i < N; i++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 1, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x2a0f52 })
    );
    const a = (i / N) * Math.PI * 2;
    bar.position.set(Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4);
    bar.lookAt(0, 0, 0);
    bars.push(bar);
    scene.add(bar);
  }

  showDebug();
  setPhoneCanvas(renderer);
  enableSoundTap('Tap to enable sound');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function userSetupComplete() {
  if (!window.soundEnabled || sound) return;
  const ctx = listener.context;
  sound = new THREE.Audio(listener);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 110;
  osc.start();
  sound.setNodeSource(osc);
  sound.setVolume(0.4);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  sound.setFilter(filter);
  analyser = new THREE.AudioAnalyser(sound, 64);
}

function animate() {
  requestAnimationFrame(animate);

  if (sound && window.touches.length) {
    const y = window.touches[0].y / innerHeight;    // 0 top .. 1 bottom
    sound.setVolume(1 - y);                          // higher = louder
    sound.filters[0] && (sound.filters[0].frequency.value = 300 + (1 - y) * 3000);
    debug('volume ' + (1 - y).toFixed(2));
  }

  if (analyser) {
    const data = analyser.getFrequencyData();
    for (let i = 0; i < N; i++) {
      const v = data[i] / 255;
      bars[i].scale.y = 0.3 + v * 6;
      bars[i].material.emissiveIntensity = 0.2 + v * 2;
    }
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
