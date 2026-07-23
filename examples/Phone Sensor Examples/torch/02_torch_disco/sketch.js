// ==============================================
// TORCH DISCO — strobe + color cycle
// ==============================================
// While enabled, the real flashlight strobes on an interval (torchOn/torchOff)
// in sync with a hue-cycling 3D scene. Tap to start/stop the party.
// (Android Chrome + HTTPS; iOS Safari has no torch API.)
// ==============================================

let renderer, scene, camera, ball, spot, raycaster;
let running = false, strobe = null, hue = 0;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08060f);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.AmbientLight(0x151022, 1));
  spot = new THREE.PointLight(0xffffff, 30, 30);
  spot.position.set(0, 2, 4);
  scene.add(spot);
  raycaster = new THREE.Raycaster();

  ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.4, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.9, flatShading: true })
  );
  scene.add(ball);

  showDebug();
  setPhoneCanvas(renderer);
  enableTorchTap('Tap to enable flashlight');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function touchStarted() {
  if (!window.torchEnabled) return;   // wait until the torch stream is ready
  running = !running;
  debug('disco: ' + (running ? 'ON' : 'OFF'));
  if (running) {
    let on = false;
    strobe = setInterval(() => { on = !on; setTorch(on); }, 180);
  } else {
    clearInterval(strobe); strobe = null; setTorch(false);
  }
}

function animate() {
  requestAnimationFrame(animate);
  ball.rotation.x += 0.01; ball.rotation.y += 0.014;
  if (running) {
    hue = (hue + 0.01) % 1;
    spot.color.setHSL(hue, 1, 0.6);
    ball.material.color.setHSL((hue + 0.5) % 1, 0.8, 0.6);
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
