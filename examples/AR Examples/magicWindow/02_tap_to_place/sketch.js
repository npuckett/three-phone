// ==============================================
// TAP TO PLACE
// ==============================================
// Start with an empty room. Tap once to start. Then each tap drops a lit
// shape 3m out, where you are aiming. It stays in that spot in the room, so
// turn around to see them all. The rear camera feed is the background, so the
// shapes seem to float in space. A hint at the bottom says what to do.
//
// three-phone APIs: createPhoneCamera() + cam.attachBackground(),
// enablePermissionsTap(['sensors','camera']) (motion + camera in one tap),
// touchStarted() callback, getTouchRaycaster() (screen tap → ray),
// applyDeviceRotation(), setPhoneCanvas(), lockGestures(), window.arEnabled,
// the permissionsReady event (fires once the tap has started everything).
// Platforms: iOS Safari + Android Chrome (HTTPS required for camera + sensors).
// ==============================================

let renderer, scene, camera, cam, raycaster;
let placed = [];
const MAX = 30;
let hasMotion = false; // true once the phone sends a tilt reading
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
  enablePermissionsTap(['sensors', 'camera'], 'Tap to start. Then tap to drop shapes.');
  lockGestures();
  // Once the tap has started everything, show what to do.
  addEventListener('permissionsReady', () => showHint('Tap to drop a shape. Turn to see them all.'), { once: true });
  // The phone's first tilt reading. Until it comes, the view looks straight ahead.
  addEventListener('deviceorientation', (e) => { if (e.beta !== null) hasMotion = true; });
  addEventListener('resize', onResize);
  animate();
}

// Tap: drop a shape 3m along the ray you're pointing at.
function touchStarted() {
  if (!window.arEnabled) return;

  const rc = getTouchRaycaster(mouseX, mouseY, camera, raycaster);
  rc.ray.at(3, _ray); // 3m out along the aim direction

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
  mesh.scale.setScalar(0.01);          // scale-in animation
  mesh.userData.grow = 1;
  placed.push(mesh);
  scene.add(mesh);

  if (placed.length > MAX) {           // cap the world; drop the oldest
    const old = placed.shift();
    scene.remove(old);
    old.geometry.dispose();
    old.material.dispose();
  }
}

function animate() {
  requestAnimationFrame(animate);

  for (const p of placed) {
    p.userData.grow += (1 - p.userData.grow) * 0.15; // ease up to full size
    p.scale.setScalar(p.userData.grow);
    p.rotation.y += 0.006;
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
