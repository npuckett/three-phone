// ==============================================
// BLE INPUT — Arduino value drives a 3D tower
// ==============================================
// bleSetup() declares a typed characteristic; connect to an Arduino running the
// P5PhoneBLE companion firmware. bleReceive() delivers notified values, which
// here set the height and color of a 3D tower.
//
// Companion firmware: p5-phone/companion/P5PhoneBLE (works unchanged with three-phone).
// (Web Bluetooth: Chrome/Edge desktop, Chrome Android, or Bluefy on iOS.)
// ==============================================

let renderer, scene, camera, tower;
let value = 0;   // 0..1023 (Arduino analogRead)

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 2, 8);
  camera.lookAt(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 6, 4); scene.add(key);

  tower = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x5dd0ff, roughness: 0.4, metalness: 0.2 })
  );
  scene.add(tower);

  // Declare the BLE profile: a single notifying 16-bit sensor value.
  bleSetup({
    characteristics: [
      { name: 'sensor', type: 'uint16', notify: true, read: true }
    ]
  });

  showDebug();
  setPhoneCanvas(renderer);
  enableBleTap({ label: 'Tap to connect your Arduino' });
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// three-phone calls this for every notified value.
function bleReceive(name, v) {
  if (name === 'sensor') { value = v; debug('sensor = ' + v); }
}
function bleReady(deviceName) { debug('connected: ' + deviceName); }
function bleClosed() { debug('disconnected'); }

function animate() {
  requestAnimationFrame(animate);
  const norm = Math.min(value / 1023, 1);
  const h = 0.5 + norm * 6;
  tower.scale.y += (h - tower.scale.y) * 0.15;
  tower.position.y = tower.scale.y / 2;
  tower.material.color.setHSL(0.6 - norm * 0.6, 0.8, 0.6);
  tower.rotation.y += 0.005;
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
