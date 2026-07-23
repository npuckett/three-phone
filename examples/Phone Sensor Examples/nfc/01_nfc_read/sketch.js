// ==============================================
// NFC READ — floating tag card
// ==============================================
// nfcRead(message, serial) fires when you tap an NFC tag to the phone. Each read
// spawns a 3D card showing the serial number and any text record. It flips in
// and drifts. (Web NFC is Android Chrome 89+ over HTTPS only.)
// ==============================================

let renderer, scene, camera;
let cards = [];

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(2, 3, 4); scene.add(key);

  showDebug();
  setPhoneCanvas(renderer);
  enableNfcTap('Tap to enable NFC, then hold a tag near the phone');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// three-phone NFC callback.
function nfcRead(message, serial) {
  let text = '';
  for (const r of message.records) {
    if (r.recordType === 'text' || r.recordType === 'url') { text = String(r.data); break; }
  }
  spawnCard(serial || 'unknown', text);
  debug('NFC ' + serial + (text ? ' — ' + text : ''));
}

function makeLabelTexture(serial, text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 320;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1230'; ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#b98bff'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 496, 304);
  ctx.fillStyle = '#b98bff'; ctx.font = 'bold 40px monospace'; ctx.fillText('NFC TAG', 30, 70);
  ctx.fillStyle = '#e8ddff'; ctx.font = '26px monospace';
  ctx.fillText(serial.slice(0, 22), 30, 140);
  if (text) { ctx.fillStyle = '#ffd166'; ctx.font = 'bold 30px sans-serif'; ctx.fillText(text.slice(0, 20), 30, 220); }
  return new THREE.CanvasTexture(c);
}

function spawnCard(serial, text) {
  const card = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.9, 0.08),
    new THREE.MeshStandardMaterial({ map: makeLabelTexture(serial, text), roughness: 0.5, metalness: 0.1 })
  );
  card.position.set((Math.random() - 0.5) * 2, -2.5, 0);
  card.rotation.y = Math.PI;         // flips in
  card.userData.vy = 0.02;
  cards.push(card);
  scene.add(card);
  if (cards.length > 8) { scene.remove(cards.shift()); }
}

function animate() {
  requestAnimationFrame(animate);
  for (const c of cards) {
    c.position.y += c.userData.vy;
    c.userData.vy *= 0.98;
    c.rotation.y += (0 - c.rotation.y) * 0.08;
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
