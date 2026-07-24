// ==============================================
// SHAKE PHYSICS
// ==============================================
// Tap to drop shapes into the room (like Tap to Place), but now they fall,
// bounce off an invisible floor, and drift with your motion. Shake the phone
// to fling everything into the air with a haptic buzz.
//
// three-phone APIs: createPhoneCamera() + cam.attachBackground(),
// enablePermissionsTap(['ar','vibration']) (camera + motion + haptics in one
// tap), touchStarted(), getTouchRaycaster(), applyDeviceRotation(),
// deviceShaken() + setShakeThreshold() + vibrate(), accelerationX/Y,
// setPhoneCanvas(), lockGestures(), showDebug(), window.arEnabled.
// Platforms: iOS Safari + Android Chrome (HTTPS required for camera + sensors).
// ==============================================

let renderer, scene, camera, cam, raycaster;
let bodies = [];
const MAX = 30;
const FLOOR = -1.5;      // invisible floor plane (metres below eye level)
const _ray = new THREE.Vector3();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16); // preview color until the camera is live

  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xbfa6ff, 0x120a1f, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 6, 4);
  scene.add(key);

  raycaster = new THREE.Raycaster();

  cam = createPhoneCamera('environment', false, 'cover');
  cam.onReady(() => cam.attachBackground(scene)); // camera feed becomes the background

  showDebug();
  setPhoneCanvas(renderer);
  enablePermissionsTap(['ar', 'vibration'], 'Tap to start');
  setShakeThreshold(25);
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// Tap: drop a shape 3m out with zero starting velocity — gravity takes it down.
function touchStarted() {
  if (!window.arEnabled) return;

  const rc = getTouchRaycaster(mouseX, mouseY, camera, raycaster);
  rc.ray.at(3, _ray);

  const geos = [
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.SphereGeometry(0.26, 24, 18),
    new THREE.IcosahedronGeometry(0.3, 0)
  ];
  const mesh = new THREE.Mesh(
    geos[Math.floor(Math.random() * geos.length)],
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.65, 0.55),
      roughness: 0.4, metalness: 0.2
    })
  );
  mesh.position.copy(_ray);
  mesh.userData.vel = new THREE.Vector3();
  bodies.push(mesh);
  scene.add(mesh);

  if (bodies.length > MAX) {          // cap the world; drop the oldest
    const old = bodies.shift();
    scene.remove(old);
    old.geometry.dispose();
    old.material.dispose();
  }

  debug(bodies.length + ' bodies');
}

// Shake: fling everything with a random impulse + a haptic buzz.
function deviceShaken() {
  for (const b of bodies) {
    b.userData.vel.x += (Math.random() - 0.5) * 6;
    b.userData.vel.y += Math.random() * 6 + 2;
    b.userData.vel.z += (Math.random() - 0.5) * 6;
  }
  vibrate(80);
  debug('shake!');
}

function animate() {
  requestAnimationFrame(animate);

  const dt = 1 / 60;
  const gravity = -6;      // m/s^2 (gentle, so shapes stay on screen)

  for (const b of bodies) {
    const v = b.userData.vel;
    v.y += gravity * dt;

    // Nudge with real-world motion once sensors are live.
    if (window.arEnabled) {
      v.x += accelerationX * dt * 0.5;
      v.y += accelerationY * dt * 0.5;
    }

    v.multiplyScalar(0.99);                 // mild air drag
    b.position.addScaledVector(v, dt);

    if (b.position.y < FLOOR) {             // damped bounce off the floor
      b.position.y = FLOOR;
      v.y *= -0.55;
      v.x *= 0.85;
      v.z *= 0.85;
    }

    b.rotation.x += v.x * dt;
    b.rotation.z += v.z * dt;
  }

  if (window.arEnabled) applyDeviceRotation(camera, { smooth: 0.15 });

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (cam) cam.updateBackground();
}

init();
