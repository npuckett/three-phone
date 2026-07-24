// ==============================================
// HIT-TEST PLACE (WebXR)
// ==============================================
// The Enter-AR starter plus WebXR hit-testing. Point your phone at a real
// surface: a ring reticle snaps onto it. Tap to drop a small lit, random-hued
// cone at the reticle. Caps at 20 objects.
//
// three-phone APIs: setPhoneCanvas(renderer) — REQUIRED so the library can find
// your renderer and drive renderer.xr. enableXRTap(message) — full-screen tap
// overlay; requests 'hit-test' as an optional feature, and on unsupported
// platforms (desktop / iOS) rewrites itself to "AR not supported" — that IS the
// fallback, no extra handling needed. getXRHitPose(frame) — the latest surface
// hit for this frame as {position, quaternion, matrix} (or null). touchStarted()
// — in immersive-ar, screen taps arrive as XR "select" events and the library
// routes them here. xrSessionStarted()/xrSessionEnded() — lifecycle hooks.
// showDebug()/debug() — on-screen log.
//
// Android Chrome only — iOS Safari does not support WebXR immersive-ar.
//
// setAnimationLoop note: the frame is driven by
// renderer.setAnimationLoop((time, frame) => ...) instead of
// requestAnimationFrame. rAF stops inside an immersive session and never
// delivers the XRFrame that getXRHitPose(frame) needs, so setAnimationLoop is
// mandatory here. It runs fine pre-session too, so it drives the desktop
// preview as well. scene.background stays null and the renderer uses alpha:true
// so the AR camera passthrough shows through.
// ==============================================

let renderer, scene, camera, reticle, hintCube;
const placed = [];
const MAX_OBJECTS = 20;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setClearColor(0x0e0b16, 1);   // desktop / pre-session preview backdrop
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  // NOTE: no scene.background — keep it null so AR passthrough is visible.
  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 100);

  scene.add(new THREE.HemisphereLight(0xbfa6ff, 0x120a1f, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(1, 3, 2);
  scene.add(key);

  // Reticle: a flat ring driven directly by the hit-test matrix.
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6 })
  );
  reticle.matrixAutoUpdate = false;   // we copy the hit matrix in ourselves
  reticle.visible = false;
  scene.add(reticle);

  // Pre-session preview hint: a small spinning cube (hidden once in AR).
  hintCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.4, metalness: 0.2 })
  );
  hintCube.position.set(0, 0, -1.5);
  scene.add(hintCube);

  showDebug();
  setPhoneCanvas(renderer);      // REQUIRED before enableXR*.
  enableXRTap('Tap to enter AR');
  addEventListener('resize', onResize);

  renderer.setAnimationLoop((time, frame) => animate(time, frame));
}

function animate(time, frame) {
  if (hintCube.visible) {
    hintCube.rotation.x += 0.01;
    hintCube.rotation.y += 0.013;
  }
  // In AR, park the reticle on whatever surface the phone is aimed at.
  const hit = getXRHitPose(frame);
  reticle.visible = !!hit;
  if (hit) reticle.matrix.copy(hit.matrix);
  renderer.render(scene, camera);
}

// XR "select" (screen tap) is routed here by the library. Drop an object at the
// reticle when it is on a surface.
function touchStarted() {
  if (!reticle.visible) return;
  if (placed.length >= MAX_OBJECTS) return;

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.04, 0.08, 24),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.55),
      roughness: 0.4,
      metalness: 0.1
    })
  );
  // Take the reticle's current pose from its matrix.
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  reticle.matrix.decompose(pos, quat, scl);
  cone.position.copy(pos);
  cone.quaternion.copy(quat);
  scene.add(cone);
  placed.push(cone);
  debug('Placed ' + placed.length + ' / ' + MAX_OBJECTS);
}

function xrSessionStarted() {
  hintCube.visible = false;   // hide the preview hint once passthrough is live
  debug('AR session started — aim at a surface, then tap');
}

function xrSessionEnded() {
  hintCube.visible = true;
  reticle.visible = false;
  debug('AR session ended');
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
