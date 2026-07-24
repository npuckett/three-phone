// ==============================================
// ENTER AR (WebXR)
// ==============================================
// The minimal WebXR immersive-ar starter. Tap the overlay to enter AR; a lit
// spinning cube (~15cm) floats 1.5m in front of you against the live camera
// passthrough. Copy-paste this as the base for any WebXR sketch.
//
// three-phone APIs: setPhoneCanvas(renderer) — REQUIRED so the library can find
// your renderer and drive renderer.xr for the session. enableXRTap(message) —
// full-screen tap overlay that checks immersive-ar support first (on desktop /
// iOS it rewrites itself to an "AR not supported" message — that IS the
// fallback, no extra handling needed). xrSessionStarted()/xrSessionEnded() —
// optional lifecycle hooks. showDebug()/debug() — on-screen log.
//
// Android Chrome only — iOS Safari does not support WebXR immersive-ar.
//
// setAnimationLoop note: we drive the frame with
// renderer.setAnimationLoop(...) instead of requestAnimationFrame. rAF stops
// firing inside an immersive session and never delivers an XRFrame, so it can
// never work for XR. setAnimationLoop works fine pre-session too, so we use it
// from line one — the same loop renders the desktop preview and the AR scene.
// scene.background is left null and the renderer is created with alpha:true so
// the camera passthrough shows through in AR.
// ==============================================

let renderer, scene, camera, cube;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  // Solid backdrop for the desktop / pre-session preview. In AR the WebXR layer
  // is transparent (alpha:true + scene.background stays null) so passthrough
  // shows through — three's WebXRManager handles the alpha for us.
  renderer.setClearColor(0x0e0b16, 1);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  // NOTE: no scene.background — it must stay null so AR passthrough is visible.
  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 100);

  scene.add(new THREE.HemisphereLight(0xbfa6ff, 0x120a1f, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(1, 3, 2);
  scene.add(key);

  // One 15cm cube, 1.5m straight ahead.
  cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.4, metalness: 0.2 })
  );
  cube.position.set(0, 0, -1.5);
  scene.add(cube);

  showDebug();
  setPhoneCanvas(renderer);      // REQUIRED before enableXR* — how XR finds the renderer.
  enableXRTap('Tap to enter AR');
  addEventListener('resize', onResize);

  // setAnimationLoop from line one — works pre-session and is the ONLY loop
  // that keeps firing (with an XRFrame) once immersive-ar starts.
  renderer.setAnimationLoop((time, frame) => animate(time, frame));
}

function animate(time, frame) {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.013;
  renderer.render(scene, camera);
}

// Optional WebXR lifecycle hooks — the library calls these on session start/end.
function xrSessionStarted() {
  debug('AR session started');
}

function xrSessionEnded() {
  debug('AR session ended');
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
