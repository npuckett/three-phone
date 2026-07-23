// ==============================================
// ROTATIONAL VELOCITY
// ==============================================
// three-phone exposes rotationRateAlpha / Beta / Gamma (degrees per second) —
// how FAST the device is turning, straight from the motion sensor.
// Three rings spin at those rates and glow brighter the faster they turn.
// ==============================================

let renderer, scene, camera;
let ringX, ringY, ringZ;

function makeRing(color) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.12, 24, 80),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, roughness: 0.3, metalness: 0.4 })
  );
  return m;
}

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 3, 4);
  scene.add(key);

  ringX = makeRing(0xff5d8f);           // beta  → rotate around X
  ringY = makeRing(0x5dd0ff);           // gamma → rotate around Y
  ringY.rotation.y = Math.PI / 2;
  ringZ = makeRing(0xb98bff);           // alpha → rotate around Z
  ringZ.rotation.x = Math.PI / 2;
  scene.add(ringX, ringY, ringZ);

  showDebug();
  setPhoneCanvas(renderer);
  enableGyroTap();
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function glow(mesh, rateDegPerSec) {
  const speed = Math.min(Math.abs(rateDegPerSec) / 200, 1); // 0..1
  mesh.material.emissiveIntensity = 0.15 + speed * 1.2;
}

function animate() {
  requestAnimationFrame(animate);
  if (window.sensorsEnabled) {
    // Convert deg/s to radians per frame (~1/60 s).
    const k = (Math.PI / 180) / 60;
    ringX.rotation.x += rotationRateBeta * k;
    ringY.rotation.z += rotationRateGamma * k;
    ringZ.rotation.z += rotationRateAlpha * k;
    glow(ringX, rotationRateBeta);
    glow(ringY, rotationRateGamma);
    glow(ringZ, rotationRateAlpha);
  } else {
    ringX.rotation.x += 0.01; ringY.rotation.z += 0.008; ringZ.rotation.z += 0.012;
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
