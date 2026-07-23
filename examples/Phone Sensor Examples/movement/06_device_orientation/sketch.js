// ==============================================
// DEVICE ORIENTATION (portrait / landscape)
// ==============================================
// three-phone sets window.deviceOrientation to 'portrait' or 'landscape' as you
// rotate the phone. Here it re-lays a grid of 3D tiles and eases the camera
// field-of-view between the two layouts.
// ==============================================

let renderer, scene, camera;
let tiles = [];
let targetFov = 55;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(2, 3, 4);
  scene.add(key);

  const palette = [0x8b5cf6, 0x5dd0ff, 0xff5d8f, 0xffd166, 0x63e6a3, 0xb98bff];
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 0.3),
      new THREE.MeshStandardMaterial({ color: palette[i], roughness: 0.4, metalness: 0.2 })
    );
    tiles.push(t);
    scene.add(t);
  }

  layout('portrait');
  showDebug();
  setPhoneCanvas(renderer);
  enableGyroTap();
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function layout(orient) {
  // portrait = tall 2x3 grid; landscape = wide 3x2 grid.
  const cols = orient === 'landscape' ? 3 : 2;
  const rows = orient === 'landscape' ? 2 : 3;
  const gap = 2.1;
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (i >= tiles.length) break;
      tiles[i].userData.target = new THREE.Vector3(
        (c - (cols - 1) / 2) * gap,
        ((rows - 1) / 2 - r) * gap,
        0
      );
      i++;
    }
  }
  targetFov = orient === 'landscape' ? 70 : 50;
}

function animate() {
  requestAnimationFrame(animate);
  layout(window.deviceOrientation);          // cheap; recomputes targets each frame
  for (const t of tiles) {
    if (t.userData.target) t.position.lerp(t.userData.target, 0.1);
    t.rotation.y += 0.01;
  }
  camera.fov += (targetFov - camera.fov) * 0.08;
  camera.updateProjectionMatrix();
  debug('orientation: ' + window.deviceOrientation);
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
