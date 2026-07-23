// ==============================================
// DEVICE MOVED
// ==============================================
// deviceMoved() fires whenever the phone moves more than the move threshold.
// setMoveThreshold() tunes it. Each move drops a ripple into a displaced water
// plane; hold still and the water calms.
// ==============================================

let renderer, scene, camera, water, geo, base = [];
let ripples = [];
const SEG = 48, SIZE = 8;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 5, 6);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0x88aaff, 0x101020, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 6, 2);
  scene.add(key);

  geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) base.push(pos.getZ(i));
  water = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x6d5cff, roughness: 0.25, metalness: 0.5, flatShading: true })
  );
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  showDebug();
  setPhoneCanvas(renderer);
  setMoveThreshold(1.2);
  enableGyroTap('Tap to enable motion sensors');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// three-phone calls this when the device moves past the threshold.
function deviceMoved() {
  ripples.push({ x: (Math.random() - 0.5) * SIZE, y: (Math.random() - 0.5) * SIZE, t: 0, amp: 0.8 });
  if (ripples.length > 12) ripples.shift();
}

function animate() {
  requestAnimationFrame(animate);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i);
    let z = base[i];
    for (const r of ripples) {
      const d = Math.hypot(px - r.x, py - r.y);
      z += Math.sin(d * 2.2 - r.t * 6) * r.amp * Math.exp(-d * 0.5) * Math.exp(-r.t * 1.4);
    }
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  for (const r of ripples) r.t += 0.02;
  ripples = ripples.filter(r => r.t < 3);

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
