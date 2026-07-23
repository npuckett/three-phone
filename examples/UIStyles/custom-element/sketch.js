// ==============================================
// UI STYLE DEMO — custom-element
// ==============================================
// Same little orientation cube; only the permission UI differs.
// enableGyroOn('#start') binds the request to your own HTML button.
// ==============================================

let renderer, scene, camera, cube;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 4, 2);
  scene.add(key);

  cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.4, metalness: 0.2 })
  );
  scene.add(cube);

  showDebug();
  setPhoneCanvas(renderer);
  enableGyroOn('#start');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (window.sensorsEnabled) applyDeviceRotation(cube, { smooth: 0.8 });
  else cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
