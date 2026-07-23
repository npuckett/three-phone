// ==============================================
// TOUCH BASIC — raycast picking
// ==============================================
// Touch (or click) a cube to pick it. getTouchRaycaster() turns a screen point
// into a ray you can shoot into the 3D scene; the picked cube pops and recolors.
// No permission needed — the touch subsystem is always on.
// ==============================================

let renderer, scene, camera, raycaster;
let cubes = [];

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 3, 4);
  scene.add(key);

  raycaster = new THREE.Raycaster();
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x3a2d5c, roughness: 0.5 })
      );
      c.position.set(x * 1.1, y * 1.1, 0);
      c.userData.scale = 1;
      cubes.push(c);
      scene.add(c);
    }
  }

  showDebug();
  setPhoneCanvas(renderer);
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// three-phone touch callback: fires on each new touch/click.
function touchStarted(e) {
  const rc = getTouchRaycaster(mouseX, mouseY, camera, raycaster);
  const hit = rc.intersectObjects(cubes)[0];
  if (hit) {
    const c = hit.object;
    c.userData.scale = 1.8;
    c.material.color.setHSL(Math.random(), 0.7, 0.6);
  }
}

function animate() {
  requestAnimationFrame(animate);
  for (const c of cubes) {
    c.userData.scale += (1 - c.userData.scale) * 0.1; // ease back to normal
    c.scale.setScalar(c.userData.scale);
    c.rotation.x += 0.004;
    c.rotation.y += 0.006;
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
