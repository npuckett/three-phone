// ==============================================
// SPEECH RECOGNITION — floating 3D words
// ==============================================
// three-phone's enableSpeechTap() unlocks the audio context; you bring your own
// SpeechRecognition (Web Speech API). Each recognized word spawns a 3D text
// sprite that drifts up and fades. (Best on Android Chrome; iOS support varies.)
// ==============================================

let renderer, scene, camera;
let words = [];
let recognition = null;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 1));

  showDebug();
  setPhoneCanvas(renderer);
  enableSpeechTap('Tap to enable speech recognition');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// three-phone calls userSetupComplete() after a permission is granted.
function userSetupComplete() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { debug('SpeechRecognition not supported on this browser'); return; }
  if (recognition) return;
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.onresult = (e) => {
    const said = e.results[e.results.length - 1][0].transcript.trim();
    said.split(/\s+/).forEach((w, i) => spawnWord(w, i));
    debug('heard: ' + said);
  };
  recognition.onend = () => { if (window.speechEnabled) recognition.start(); };
  try { recognition.start(); } catch (err) {}
}

// Render text to a 2D canvas → CanvasTexture → Sprite (three.js has no text builtin).
function spawnWord(text, offset) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 76px -apple-system, sans-serif';
  ctx.fillStyle = '#e8ddff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(4, 1, 1);
  sprite.position.set((Math.random() - 0.5) * 4, -3 + offset * 0.3, (Math.random() - 0.5) * 2);
  sprite.userData.vy = 0.01 + Math.random() * 0.02;
  words.push(sprite);
  scene.add(sprite);
  if (words.length > 24) { const old = words.shift(); scene.remove(old); }
}

function animate() {
  requestAnimationFrame(animate);
  for (const w of words) {
    w.position.y += w.userData.vy;
    w.material.opacity = Math.max(0, 1 - (w.position.y + 3) / 8);
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
