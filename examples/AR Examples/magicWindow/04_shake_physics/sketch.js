// ==============================================
// SHAKE PHYSICS
// ==============================================
// Tap once to start. Then tap to drop shapes into the room (like Tap to
// Place). Now they fall, bounce off an invisible floor, and drift a little
// with your motion. Shake the phone to toss them up with a buzz. Each shape
// is pulled back toward the spot where you dropped it, so it lands there
// again. A hint at the bottom says what to do.
//
// three-phone APIs: createPhoneCamera() + cam.attachBackground(),
// enablePermissionsTap(['sensors','camera','vibration']) (motion + camera +
// haptics in one tap), touchStarted(), getTouchRaycaster(), applyDeviceRotation(),
// deviceShaken() + setShakeThreshold() + vibrate(), accelerationX/Y,
// setPhoneCanvas(), lockGestures(), window.arEnabled, the permissionsReady
// event (fires once the tap has started everything).
// Platforms: iOS Safari + Android Chrome (HTTPS required for camera + sensors).
// ==============================================

let renderer, scene, camera, cam, raycaster;
let bodies = [];
const MAX = 30;
let hasMotion = false; // true once the phone sends a tilt reading
const FLOOR = -1.5;      // invisible floor plane (metres below eye level)
const PULL = 3;          // how hard each shape is pulled back to its spot
const MAX_SPEED = 8;     // m/s, so nothing flies off
const SHAKE_COOLDOWN = 600; // ms. One shake fires deviceShaken() many times.
let lastShake = 0;
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

  setPhoneCanvas(renderer);
  // Motion goes first. An iPhone only asks for motion straight from the tap.
  enablePermissionsTap(['sensors', 'camera', 'vibration'], 'Tap to start. Then tap to drop shapes.');
  setShakeThreshold(25);
  lockGestures();
  // Once the tap has started everything, show what to do.
  addEventListener('permissionsReady', () => showHint('Tap to drop shapes. Shake the phone to toss them up.'), { once: true });
  // The phone's first tilt reading. Until it comes, the view looks straight ahead.
  addEventListener('deviceorientation', (e) => { if (e.beta !== null) hasMotion = true; });
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
  mesh.userData.home = mesh.position.clone(); // the spot it comes back to
  bodies.push(mesh);
  scene.add(mesh);

  if (bodies.length > MAX) {          // cap the world; drop the oldest
    const old = bodies.shift();
    scene.remove(old);
    old.geometry.dispose();
    old.material.dispose();
  }
}

// Shake: toss everything up with a haptic buzz. One shake counts once.
function deviceShaken() {
  const now = performance.now();
  if (now - lastShake < SHAKE_COOLDOWN) return;
  lastShake = now;

  for (const b of bodies) {
    if (b.position.y > FLOOR + 0.5) continue;      // still in the air, leave it
    b.userData.vel.y = 4 + Math.random();          // up about 1 to 1.5 m
    b.userData.vel.x += (Math.random() - 0.5) * 1; // a little sideways
    b.userData.vel.z += (Math.random() - 0.5) * 1;
  }
  vibrate(80);
}

function animate() {
  requestAnimationFrame(animate);

  const dt = 1 / 60;
  const gravity = -6;      // m/s^2 (gentle, so shapes stay on screen)

  for (const b of bodies) {
    const v = b.userData.vel;
    v.y += gravity * dt;

    // Nudge with real-world motion once sensors are live.
    // Capped at 3, so a hard shake can't push shapes out of view.
    if (window.arEnabled) {
      v.x += THREE.MathUtils.clamp(accelerationX, -3, 3) * dt * 0.5;
      v.y += THREE.MathUtils.clamp(accelerationY, -3, 3) * dt * 0.5;
    }

    // Pull gently back toward the spot where it was dropped.
    const home = b.userData.home;
    v.x += (home.x - b.position.x) * PULL * dt;
    v.z += (home.z - b.position.z) * PULL * dt;

    v.multiplyScalar(0.99);                 // mild air drag
    v.clampLength(0, MAX_SPEED);            // speed limit
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

  if (window.arEnabled && hasMotion) applyDeviceRotation(camera, { smooth: 0.15 });

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (cam) cam.updateBackground();
}

// A short line of instructions at the bottom of the screen.
// Touches pass straight through it.
function showHint(text) {
  const hint = document.createElement('div');
  hint.id = 'hint';
  hint.textContent = text;
  hint.style.cssText =
    'position:fixed; left:50%; bottom:24px; transform:translateX(-50%);' +
    'width:max-content; max-width:90vw; box-sizing:border-box;' +
    'padding:10px 18px; border-radius:20px; background:rgba(0,0,0,0.55);' +
    'color:#fff; text-align:center;' +
    'font:16px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;' +
    'pointer-events:none; z-index:10;';
  document.body.appendChild(hint);
}

init();
