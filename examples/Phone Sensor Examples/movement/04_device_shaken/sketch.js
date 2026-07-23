// ==============================================
// DEVICE SHAKEN
// ==============================================
// deviceShaken() is a callback three-phone calls when you shake the phone hard
// enough. setShakeThreshold() tunes the sensitivity. Each shake fires an
// instanced particle burst and a short vibration.
// ==============================================

let renderer, scene, camera, core;
let particles, particleData = [];
const COUNT = 300;
let _dummy;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 3, 4);
  scene.add(key);

  core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x3b1d6e, roughness: 0.3, flatShading: true })
  );
  scene.add(core);

  // Instanced particles reuse one geometry+material for hundreds of confetti bits.
  particles = new THREE.InstancedMesh(
    new THREE.TetrahedronGeometry(0.1),
    new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x553300, roughness: 0.5 }),
    COUNT
  );
  _dummy = new THREE.Object3D();
  for (let i = 0; i < COUNT; i++) {
    particleData.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0 });
    _dummy.position.set(9999, 9999, 9999);
    _dummy.updateMatrix();
    particles.setMatrixAt(i, _dummy.matrix);
  }
  scene.add(particles);

  showDebug();
  setPhoneCanvas(renderer);
  setShakeThreshold(30);
  enablePermissionsTap(['sensors', 'vibration'], 'Tap to enable motion + vibration');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// three-phone calls this on every shake.
function deviceShaken() {
  vibrate(80);
  for (let i = 0; i < COUNT; i++) {
    const p = particleData[i];
    p.pos.set(0, 0, 0);
    p.vel.set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(0.4);
    p.life = 1;
  }
  core.material.emissiveIntensity = 2;
}

function animate() {
  requestAnimationFrame(animate);
  core.rotation.y += 0.01;
  core.material.emissiveIntensity *= 0.94;

  for (let i = 0; i < COUNT; i++) {
    const p = particleData[i];
    if (p.life > 0) {
      p.vel.y -= 0.01;         // gravity
      p.pos.add(p.vel);
      p.life -= 0.012;
      _dummy.position.copy(p.pos);
      const s = Math.max(p.life, 0.001);
      _dummy.scale.setScalar(s);
      _dummy.rotation.set(p.pos.x * 3, p.pos.y * 3, 0);
    } else {
      _dummy.position.set(9999, 9999, 9999);
      _dummy.scale.setScalar(0.001);
    }
    _dummy.updateMatrix();
    particles.setMatrixAt(i, _dummy.matrix);
  }
  particles.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
