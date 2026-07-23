// ==============================================
// BLE BOTH — bidirectional 3D dashboard
// ==============================================
// Read AND write in one profile: a notifying 'sensor' value drives a 3D dial,
// and tapping a 3D button writes a boolean 'led' back to the Arduino.
//
// Companion firmware: p5-phone/companion/P5PhoneBLE.
// ==============================================

let renderer, scene, camera, raycaster, needle, button;
let value = 0, on = false;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 1, 7);
  camera.lookAt(0, 0.5, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 4, 3); scene.add(key);
  raycaster = new THREE.Raycaster();

  // Dial face.
  const face = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.2, 48), new THREE.MeshStandardMaterial({ color: 0x1b1430, roughness: 0.8 }));
  face.rotation.x = Math.PI / 2; face.position.set(-1.5, 1, 0); scene.add(face);
  needle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 0.12), new THREE.MeshStandardMaterial({ color: 0x5dd0ff, emissive: 0x0a3a55 }));
  needle.geometry.translate(0, 0.85, 0);
  needle.position.set(-1.5, 1, 0.15); scene.add(needle);

  // Write button.
  button = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 40), new THREE.MeshStandardMaterial({ color: 0xff5d8f, roughness: 0.4 }));
  button.position.set(2, 0.6, 0); scene.add(button);

  bleSetup({
    characteristics: [
      { name: 'sensor', type: 'uint16', notify: true, read: true },
      { name: 'led', type: 'bool', write: true }
    ]
  });

  showDebug();
  setPhoneCanvas(renderer);
  enableBleTap({ label: 'Tap to connect your Arduino' });
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function bleReceive(name, v) { if (name === 'sensor') value = v; }
function bleReady(d) { debug('connected: ' + d); }

function touchStarted() {
  const rc = getTouchRaycaster(mouseX, mouseY, camera, raycaster);
  if (rc.intersectObject(button).length) {
    on = !on;
    if (window.bleConnected) { bleWrite('led', on); debug('LED → ' + (on ? 'ON' : 'OFF')); }
    else debug('connect first');
  }
}

function animate() {
  requestAnimationFrame(animate);
  const norm = Math.min(value / 1023, 1);
  const targetAngle = -Math.PI * 0.75 + norm * Math.PI * 1.5; // sweep 270°
  needle.rotation.z += (targetAngle - needle.rotation.z) * 0.15;
  button.position.y = 0.6 - (on ? 0.15 : 0);
  button.material.emissive.setHex(on ? 0x551133 : 0x000000);
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
