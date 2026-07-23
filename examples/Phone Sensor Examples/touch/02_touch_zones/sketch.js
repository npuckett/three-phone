// ==============================================
// TOUCH ZONES
// ==============================================
// Split the screen into four quadrants. Whichever zone you hold lights a
// matching colored spotlight on a central sculpture. Uses mouseX/mouseY and
// window.touches to know where you are pressing.
// ==============================================

let renderer, scene, camera, blob;
let lights = [];
const zoneColors = [0xff5d8f, 0x5dd0ff, 0xffd166, 0x63e6a3];

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08060f);
  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7);

  scene.add(new THREE.AmbientLight(0x1a1530, 1));

  blob = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.1, 0.36, 160, 24),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3, metalness: 0.5 })
  );
  scene.add(blob);

  // Four spotlights, one per quadrant, aimed at the sculpture.
  const positions = [[-4, 4], [4, 4], [-4, -4], [4, -4]];
  for (let i = 0; i < 4; i++) {
    const l = new THREE.SpotLight(zoneColors[i], 0, 20, Math.PI / 5, 0.4);
    l.position.set(positions[i][0], positions[i][1], 5);
    l.target = blob;
    lights.push(l);
    scene.add(l);
  }

  showDebug();
  setPhoneCanvas(renderer);
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function zoneOf(x, y) {
  const col = x < innerWidth / 2 ? 0 : 1;
  const row = y < innerHeight / 2 ? 0 : 1;
  return row * 2 + col; // 0 TL, 1 TR, 2 BL, 3 BR
}

function animate() {
  requestAnimationFrame(animate);
  blob.rotation.x += 0.005;
  blob.rotation.y += 0.008;

  // Which zones are currently pressed?
  const active = new Set();
  for (const t of window.touches) active.add(zoneOf(t.x, t.y));

  for (let i = 0; i < 4; i++) {
    const target = active.has(i) ? 60 : 0;
    lights[i].intensity += (target - lights[i].intensity) * 0.15;
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
