// ==============================================
// TOUCH COUNT — one orbiter per finger
// ==============================================
// window.touches is an array of every active finger ({x, y, id}). Each finger
// spawns a glowing sphere that follows it in 3D via screenToWorld().
// Try it with multiple fingers.
// ==============================================

let renderer, scene, camera, core;
let orbiters = [];
const MAX = 10;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.8));

  core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.8, 1),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x3b1d6e, flatShading: true })
  );
  scene.add(core);

  for (let i = 0; i < MAX; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x5dd0ff, emissive: 0x0a3a55, emissiveIntensity: 1 })
    );
    s.visible = false;
    orbiters.push(s);
    scene.add(s);
  }

  showDebug();
  setPhoneCanvas(renderer);
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  core.rotation.y += 0.008;

  for (let i = 0; i < MAX; i++) {
    const s = orbiters[i];
    if (i < window.touches.length) {
      const t = window.touches[i];
      const world = screenToWorld(t.x, t.y, camera, 0);
      if (world) {
        s.visible = true;
        s.position.lerp(world, 0.4);
        s.material.color.setHSL((i / MAX), 0.8, 0.6);
      }
    } else {
      s.visible = false;
    }
  }

  debug('fingers: ' + window.touches.length);
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
