// ==============================================
// MICROPHONE LEVEL — audio-reactive geometry
// ==============================================
// getMicLevel() returns the current input loudness (0..1). It drives the size,
// vertex displacement, and glow of an icosahedron. Whistle, talk, or clap.
// ==============================================

let renderer, scene, camera, blob, baseGeo, basePositions = [];

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.9));
  const key = new THREE.PointLight(0xb98bff, 40, 20);
  key.position.set(2, 3, 4);
  scene.add(key);

  baseGeo = new THREE.IcosahedronGeometry(1.2, 5);
  const p = baseGeo.attributes.position;
  for (let i = 0; i < p.count; i++) basePositions.push(new THREE.Vector3().fromBufferAttribute(p, i));
  blob = new THREE.Mesh(
    baseGeo,
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x2a0f52, roughness: 0.25, metalness: 0.3 })
  );
  scene.add(blob);

  showDebug();
  setPhoneCanvas(renderer);
  enableMicTap();
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  const level = getMicLevel();            // 0..1
  const t = performance.now() * 0.001;

  const p = baseGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = basePositions[i];
    const noise = Math.sin(v.x * 4 + t * 3) * Math.cos(v.y * 4 + t * 2);
    const scale = 1 + level * 1.6 * (0.5 + 0.5 * noise);
    p.setXYZ(i, v.x * scale, v.y * scale, v.z * scale);
  }
  p.needsUpdate = true;
  baseGeo.computeVertexNormals();

  blob.material.emissiveIntensity = 0.3 + level * 3;
  blob.rotation.y += 0.004;

  if (window.micEnabled) debug('mic level: ' + level.toFixed(3));
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
