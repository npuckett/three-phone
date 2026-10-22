// ==============================================
// MAGIC WINDOW — look around
// ==============================================
// The phone becomes a window into a 3D world. A ring of floating shapes
// surrounds you. Tap once to start. Then turn around slowly and tilt the
// phone to look at them. The rear camera feed sits behind the scene, so the
// shapes feel pinned in your room. A hint at the bottom says what to do.
//
// three-phone APIs: createPhoneCamera() + cam.attachBackground() (camera feed
// as scene.background), enablePermissionsTap(['sensors', 'camera']) (motion
// + camera in one tap),
// applyDeviceRotation() (drives the camera from the gyroscope),
// setPhoneCanvas(), lockGestures(), window.arEnabled, the permissionsReady
// event (fires once the tap has started everything).
// Platforms: iOS Safari + Android Chrome (HTTPS required for camera + sensors).
// ==============================================

let renderer, scene, camera, cam;
let props = [];
let hasMotion = false; // true once the phone sends a tilt reading

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16); // preview color until the camera is live

  // At the origin, looking out. applyDeviceRotation() will steer this.
  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xbfa6ff, 0x120a1f, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 6, 4);
  scene.add(key);

  // Ring of lit shapes at varied azimuths / elevations, 3–5m out.
  const geos = [
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.SphereGeometry(0.45, 32, 24),
    new THREE.IcosahedronGeometry(0.5, 0)
  ];
  const COUNT = 9;
  for (let i = 0; i < COUNT; i++) {
    const az = (i / COUNT) * Math.PI * 2;
    const el = (Math.random() - 0.5) * 1.1;          // elevation spread
    const r = 3 + Math.random() * 2;                 // 3–5m out
    const mesh = new THREE.Mesh(
      geos[i % geos.length],
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i / COUNT, 0.65, 0.55),
        roughness: 0.4, metalness: 0.2
      })
    );
    mesh.position.set(
      Math.cos(az) * Math.cos(el) * r,
      Math.sin(el) * r,
      Math.sin(az) * Math.cos(el) * r
    );
    mesh.userData.spin = 0.003 + Math.random() * 0.006;
    mesh.userData.phase = Math.random() * Math.PI * 2;
    mesh.userData.baseY = mesh.position.y;
    props.push(mesh);
    scene.add(mesh);
  }

  cam = createPhoneCamera('environment', false, 'cover');
  cam.onReady(() => cam.attachBackground(scene)); // camera feed becomes the background

  setPhoneCanvas(renderer);
  // Motion goes first. An iPhone only asks for motion straight from the tap.
  enablePermissionsTap(['sensors', 'camera'], 'Tap to start AR');
  lockGestures();
  // Once the tap has started everything, show what to do.
  addEventListener('permissionsReady', () => showHint('Turn around slowly. The shapes stay in the room.'), { once: true });
  // The phone's first tilt reading. Until it comes, the view looks straight ahead.
  addEventListener('deviceorientation', (e) => { if (e.beta !== null) hasMotion = true; });
  addEventListener('resize', onResize);
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const t = performance.now() * 0.001;
  for (const p of props) {
    p.rotation.x += p.userData.spin;
    p.rotation.y += p.userData.spin * 0.7;
    p.position.y = p.userData.baseY + Math.sin(t + p.userData.phase) * 0.15; // idle bob
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
