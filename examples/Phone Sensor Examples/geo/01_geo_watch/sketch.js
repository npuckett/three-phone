// ==============================================
// GPS WATCH — 3D radar
// ==============================================
// geoRead() delivers your position as it updates. This draws a 3D radar disc:
// an accuracy ring that scales with GPS accuracy, and — once you have a fix — a
// beacon whose glow grows as geoDistance() to a saved "home" point shrinks.
// (Requires HTTPS; on http://localhost it also works.)
// ==============================================

let renderer, scene, camera, ring, sweep, beacon;
let home = null;   // first fix becomes "home"

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06120c);
  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 5, 5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0x63e6a3, 0x04140a, 1));

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(3, 64),
    new THREE.MeshStandardMaterial({ color: 0x0d3320, roughness: 0.9 })
  );
  disc.rotation.x = -Math.PI / 2;
  scene.add(disc);

  for (let r = 1; r <= 3; r++) {
    const g = new THREE.Mesh(new THREE.RingGeometry(r - 0.02, r, 64), new THREE.MeshBasicMaterial({ color: 0x1f7a4d, side: THREE.DoubleSide }));
    g.rotation.x = -Math.PI / 2; g.position.y = 0.01; scene.add(g);
  }

  ring = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.5, 48), new THREE.MeshBasicMaterial({ color: 0x63e6a3, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; scene.add(ring);

  sweep = new THREE.Mesh(new THREE.CircleGeometry(3, 32, 0, Math.PI / 6), new THREE.MeshBasicMaterial({ color: 0x63e6a3, transparent: true, opacity: 0.15, side: THREE.DoubleSide }));
  sweep.rotation.x = -Math.PI / 2; sweep.position.y = 0.015; scene.add(sweep);

  beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x000000 }));
  beacon.position.y = 0.25; scene.add(beacon);

  showDebug();
  setPhoneCanvas(renderer);
  setGeoOptions({ enableHighAccuracy: true });
  enableGeoTap('Tap to enable GPS');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// three-phone calls this each time a new position arrives.
function geoRead(pos) {
  if (!home) home = { lat: pos.latitude, lon: pos.longitude };
  // Accuracy ring: worse accuracy → bigger ring.
  const acc = Math.min(pos.accuracy || 50, 100);
  ring.scale.setScalar(0.5 + acc / 40);
  debug('lat ' + pos.latitude.toFixed(5) + '  lon ' + pos.longitude.toFixed(5) + '  ±' + Math.round(acc) + 'm');
}

function animate() {
  requestAnimationFrame(animate);
  sweep.rotation.z -= 0.02;
  const pos = getGeoPosition();
  if (pos && home) {
    const d = geoDistance(pos.latitude, pos.longitude, home.lat, home.lon, 'm');
    const near = Math.max(0, 1 - d / 200);          // within 200m glows
    beacon.material.emissive.setHex(0xffd166);
    beacon.material.emissiveIntensity = near;
    beacon.scale.setScalar(0.7 + near);
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
