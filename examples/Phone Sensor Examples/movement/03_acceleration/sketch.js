// ==============================================
// ACCELERATION
// ==============================================
// accelerationX / Y / Z (m/s²) push a ball around a shadowed floor. Tilt and
// move your phone to roll it; it bounces off the walls.
// ==============================================

let renderer, scene, camera, ball, floor;
let vx = 0, vz = 0;
const BOUND = 3.2;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 6.5, 5.5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xbfa6ff, 0x120a1f, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3, 8, 4);
  key.castShadow = true;
  scene.add(key);

  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * BOUND + 1, 2 * BOUND + 1),
    new THREE.MeshStandardMaterial({ color: 0x241a38, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.25, metalness: 0.3 })
  );
  ball.position.y = 0.5;
  ball.castShadow = true;
  scene.add(ball);

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
    // Acceleration nudges velocity; a little damping keeps it controllable.
    vx += accelerationX * 0.0016;
    vz += -accelerationY * 0.0016;   // phone Y maps to floor Z
    vx *= 0.96; vz *= 0.96;
    ball.position.x += vx;
    ball.position.z += vz;

    // Bounce off the walls.
    if (ball.position.x > BOUND) { ball.position.x = BOUND; vx *= -0.6; }
    if (ball.position.x < -BOUND) { ball.position.x = -BOUND; vx *= -0.6; }
    if (ball.position.z > BOUND) { ball.position.z = BOUND; vz *= -0.6; }
    if (ball.position.z < -BOUND) { ball.position.z = -BOUND; vz *= -0.6; }

    ball.rotation.z -= vx * 2;
    ball.rotation.x += vz * 2;
    debug('accel ' + accelerationX.toFixed(1) + ', ' + accelerationY.toFixed(1) + ', ' + accelerationZ.toFixed(1));
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
