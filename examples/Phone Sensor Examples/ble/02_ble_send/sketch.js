// ==============================================
// BLE SEND — tap a 3D switch to write to Arduino
// ==============================================
// bleWrite() sends a typed value to the peripheral. Here a 3D toggle switch
// writes a boolean 'led' characteristic — flip it to turn the Arduino's LED
// on/off.
//
// Companion firmware: p5-phone/companion/P5PhoneBLE.
// ==============================================

let renderer, scene, camera, raycaster, lever, base;
let on = false;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 6);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 4, 3); scene.add(key);
  raycaster = new THREE.Raycaster();

  base = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.6, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x2a2140, roughness: 0.7 })
  );
  scene.add(base);

  lever = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 1.1, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xff5d8f, roughness: 0.3, metalness: 0.4, emissive: 0x000000 })
  );
  lever.position.y = 0.7;
  scene.add(lever);

  bleSetup({
    characteristics: [
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

function touchStarted() {
  const rc = getTouchRaycaster(mouseX, mouseY, camera, raycaster);
  if (rc.intersectObjects([lever, base]).length) {
    on = !on;
    if (window.bleConnected) {
      bleWrite('led', on);
      debug('LED → ' + (on ? 'ON' : 'OFF'));
    } else {
      debug('connect first, then tap the switch');
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  lever.rotation.z += ((on ? -0.6 : 0.6) - lever.rotation.z) * 0.2;
  lever.material.emissive.setHex(on ? 0x551133 : 0x000000);
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
