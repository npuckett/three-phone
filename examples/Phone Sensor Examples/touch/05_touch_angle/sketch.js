// ==============================================
// TOUCH ANGLE — twist to rotate
// ==============================================
// The angle of the line between two fingers spins a 3D object around the view
// axis. Twist your two fingers like a knob. An arc helper shows the angle.
// ==============================================

let renderer, scene, camera, knot, arc;
let angleStart = null, objStartZ = 0;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 3, 4);
  scene.add(key);

  knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.1, 0.34, 180, 28),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.3, metalness: 0.4 })
  );
  scene.add(knot);

  // A thin ring that traces the current twist angle.
  arc = new THREE.Mesh(
    new THREE.RingGeometry(1.7, 1.85, 48, 1, 0, 0.01),
    new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide })
  );
  arc.visible = false;
  scene.add(arc);

  showDebug();
  setPhoneCanvas(renderer);
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function twoFingerAngle() {
  const t = window.touches;
  if (t.length < 2) return null;
  return Math.atan2(t[1].y - t[0].y, t[1].x - t[0].x);
}

function animate() {
  requestAnimationFrame(animate);

  const a = twoFingerAngle();
  if (a !== null) {
    if (angleStart === null) { angleStart = a; objStartZ = knot.rotation.z; }
    knot.rotation.z = objStartZ - (a - angleStart);
    arc.visible = true;
    arc.geometry.dispose();
    const sweep = ((a - angleStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    arc.geometry = new THREE.RingGeometry(1.7, 1.85, 64, 1, 0, sweep || 0.01);
    debug('twist ' + THREE.MathUtils.radToDeg(a - angleStart).toFixed(0) + '°');
  } else {
    angleStart = null;
    arc.visible = false;
    knot.rotation.y += 0.006;
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
