// ==============================================
// TORCH SHAKE TOGGLE
// ==============================================
// Combine two features: enablePermissionsTap(['sensors','torch']). Shaking the
// phone flips the real flashlight and pops a white flash of particles.
// (Torch is Android Chrome only.)
// ==============================================

let renderer, scene, camera, orb, flash;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08060f);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.AmbientLight(0x201830, 1));
  const lamp = new THREE.PointLight(0xb98bff, 30, 20); lamp.position.set(2, 3, 4); scene.add(lamp);

  orb = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 48, 48),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x000000, roughness: 0.3, metalness: 0.3 })
  );
  scene.add(orb);

  // A quick full-scene flash overlay via a big additive sphere.
  flash = new THREE.Mesh(
    new THREE.SphereGeometry(20, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.BackSide })
  );
  scene.add(flash);

  showDebug();
  setPhoneCanvas(renderer);
  setShakeThreshold(28);
  enablePermissionsTap(['sensors', 'torch'], 'Tap to enable motion + flashlight');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function deviceShaken() {
  toggleTorch();
  flash.material.opacity = 0.9;
  debug('shake → torch ' + (window.torchActive ? 'ON' : 'OFF'));
}

function animate() {
  requestAnimationFrame(animate);
  orb.rotation.y += 0.006;
  orb.material.emissive.setHex(window.torchActive ? 0x4a2a80 : 0x000000);
  flash.material.opacity *= 0.85;
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
