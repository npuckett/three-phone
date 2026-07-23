// ==============================================
// THREE-PHONE BLANK TEMPLATE
// ==============================================
// A minimal starting point: a lit 3D scene + the three-phone permission pattern.
//
// three.js mental model vs p5.js:
//   init()    ≈ setup()  — runs once, build the scene
//   animate() ≈ draw()   — runs every frame
//
// Copy this folder to start a new sketch.
// ==============================================

let renderer, scene, camera, shape;

function init() {
  // --- renderer + canvas ---
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  // --- scene + camera ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5);

  // --- lights ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x221a33, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 2);
  scene.add(key);

  // --- a shape to look at ---
  shape = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.3, 0),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.35, metalness: 0.1, flatShading: true })
  );
  scene.add(shape);

  // --- three-phone setup ---
  showDebug();           // on-screen console (handy on a phone)
  setPhoneCanvas(renderer);
  enableGyroTap();       // tap the screen to grant motion permission (iOS)
  lockGestures();        // stop pull-to-refresh, pinch-zoom, etc.

  window.addEventListener('resize', onResize);
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  if (window.sensorsEnabled) {
    // Once permission is granted, drive the shape with the device.
    applyDeviceRotation(shape, { smooth: 0.85 });
  } else {
    shape.rotation.y += 0.006;
    shape.rotation.x += 0.003;
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
