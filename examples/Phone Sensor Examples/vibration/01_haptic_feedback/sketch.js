// ==============================================
// HAPTIC FEEDBACK — 3D buttons that buzz
// ==============================================
// Three 3D buttons; tapping one presses it in and fires a different vibrate()
// pattern. (Vibration is Android-only — iOS Safari has no Vibration API.)
// ==============================================

let renderer, scene, camera, raycaster;
let buttons = [];

const patterns = [
  { label: 'tap', color: 0x5dd0ff, pattern: 40 },
  { label: 'double', color: 0xffd166, pattern: [60, 60, 60] },
  { label: 'long', color: 0xff5d8f, pattern: 400 }
];

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 3, 6);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2, 6, 3); key.castShadow = true; scene.add(key);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.3 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.4; floor.receiveShadow = true; scene.add(floor);

  raycaster = new THREE.Raycaster();
  patterns.forEach((p, i) => {
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 0.5, 40),
      new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.4, metalness: 0.2 })
    );
    b.position.set((i - 1) * 2.4, 0, 0);
    b.castShadow = true;
    b.userData = { rest: 0, press: 0, def: p };
    buttons.push(b);
    scene.add(b);
  });

  showDebug();
  setPhoneCanvas(renderer);
  enableVibrationTap('Tap to enable vibration');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function touchStarted() {
  const rc = getTouchRaycaster(mouseX, mouseY, camera, raycaster);
  const hit = rc.intersectObjects(buttons)[0];
  if (hit) {
    hit.object.userData.press = 1;
    const def = hit.object.userData.def;
    vibrate(def.pattern);
    debug('vibrate: ' + def.label);
  }
}

function animate() {
  requestAnimationFrame(animate);
  for (const b of buttons) {
    b.userData.press *= 0.85;
    b.position.y = -b.userData.press * 0.3;
    b.material.emissive.setScalar(b.userData.press * 0.3);
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
