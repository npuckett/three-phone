// ==============================================
// TOUCH DISTANCE — pinch to dolly
// ==============================================
// Measure the distance between two fingers (window.touches[0] and [1]) and use
// it to dolly the camera in and out of a little 3D diorama. Pinch to zoom.
// ==============================================

let renderer, scene, camera, diorama;
let pinchStart = null, camStartZ = 8;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 1.5, 8);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 2);
  scene.add(key);

  diorama = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 0.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a2140, roughness: 0.9 })
  );
  diorama.add(ground);
  const colors = [0x8b5cf6, 0x5dd0ff, 0xff5d8f, 0xffd166];
  for (let i = 0; i < 8; i++) {
    const h = 0.6 + Math.random() * 1.8;
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, h, 0.5),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.4 })
    );
    const a = (i / 8) * Math.PI * 2;
    b.position.set(Math.cos(a) * 1.8, 0.2 + h / 2, Math.sin(a) * 1.8);
    diorama.add(b);
  }
  scene.add(diorama);

  showDebug();
  setPhoneCanvas(renderer);
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function pinchDist() {
  const t = window.touches;
  if (t.length < 2) return null;
  return Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y);
}

function animate() {
  requestAnimationFrame(animate);
  diorama.rotation.y += 0.004;

  const d = pinchDist();
  if (d !== null) {
    if (pinchStart === null) { pinchStart = d; camStartZ = camera.position.z; }
    // Farther apart → closer in.
    camera.position.z = THREE.MathUtils.clamp(camStartZ - (d - pinchStart) * 0.02, 3, 14);
    debug('pinch ' + d.toFixed(0) + 'px  cam z ' + camera.position.z.toFixed(1));
  } else {
    pinchStart = null;
  }
  camera.lookAt(0, 0.5, 0);

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
