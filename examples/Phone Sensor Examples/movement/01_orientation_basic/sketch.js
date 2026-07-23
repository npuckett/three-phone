// ==============================================
// ORIENTATION BASIC
// ==============================================
// Reads rotationX / rotationY / rotationZ (device tilt, in degrees) and turns
// a lit 3D "phone" so it matches how you are holding your real device.
//
// three.js goodies over 2D: real lighting, a soft contact shadow, perspective.
// ==============================================

let renderer, scene, camera, phone;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 1.2, 6);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xbfa6ff, 0x120a1f, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  scene.add(key);

  // A phone-shaped slab.
  phone = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 3.0, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.4, metalness: 0.2 })
  );
  body.castShadow = true;
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 2.6, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.15, emissive: 0x1a2340, emissiveIntensity: 0.5 })
  );
  screen.position.z = 0.12;
  phone.add(body, screen);
  scene.add(phone);

  // Ground to catch the shadow.
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(6, 48),
    new THREE.ShadowMaterial({ opacity: 0.35 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.6;
  ground.receiveShadow = true;
  scene.add(ground);

  showDebug();
  setPhoneCanvas(renderer);
  enableGyroTap();
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (window.sensorsEnabled) {
    applyDeviceRotation(phone, { smooth: 0.8 });
    debug('X ' + rotationX.toFixed(0) + '°  Y ' + rotationY.toFixed(0) + '°  Z ' + rotationZ.toFixed(0) + '°');
  } else {
    phone.rotation.y += 0.01;
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
