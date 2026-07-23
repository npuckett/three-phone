// ==============================================
// TORCH TOUCH TOGGLE — a 3D lantern
// ==============================================
// Tap the lantern to toggle the phone's real flashlight with toggleTorch(). A
// matching 3D point light turns on/off so the scene mirrors the hardware.
// (Torch is Android Chrome + HTTPS; iOS Safari has no torch API.)
// ==============================================

let renderer, scene, camera, raycaster, lantern, glow, lamp;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08060f);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.AmbientLight(0x221a33, 1));
  raycaster = new THREE.Raycaster();

  lantern = new THREE.Group();
  const cage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.1, 2, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide })
  );
  glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0x000000 })
  );
  lantern.add(cage, glow);
  scene.add(lantern);

  lamp = new THREE.PointLight(0xfff2c0, 0, 20);
  lamp.position.set(0, 0, 0);
  scene.add(lamp);

  showDebug();
  setPhoneCanvas(renderer);
  enableTorchTap('Tap to enable flashlight');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function touchStarted() {
  const rc = getTouchRaycaster(mouseX, mouseY, camera, raycaster);
  if (rc.intersectObject(lantern, true).length) {
    toggleTorch();
    debug('torch: ' + (window.torchActive ? 'ON' : 'OFF'));
  }
}

function animate() {
  requestAnimationFrame(animate);
  lantern.rotation.y += 0.004;
  const on = window.torchActive;
  glow.material.emissive.setHex(on ? 0xfff2c0 : 0x000000);
  lamp.intensity += ((on ? 60 : 0) - lamp.intensity) * 0.2;
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
