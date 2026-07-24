// ==============================================
// PANORAMA VIEWER
// ==============================================
// No camera feed here — instead you stand inside a giant sphere painted with a
// 360° photo (an equirectangular panorama). Tilt and turn your phone to look
// around the scene as if you were there.
//
// three-phone APIs: enableGyroTap() (motion sensors in one tap),
// applyDeviceRotation() (drives the camera from the gyroscope),
// setPhoneCanvas(), lockGestures(), showDebug(), window.sensorsEnabled.
// Platforms: iOS Safari + Android Chrome (HTTPS required for motion sensors).
//
// Panorama: kloppenheim_06 by Greg Zaal, CC0, polyhaven.com (downscaled to 2K).
// ==============================================

let renderer, scene, camera;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);

  // Camera lives at the centre of the sphere.
  camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 0, 0);

  // A big sphere, viewed from the inside (BackSide) — the panorama lines its walls.
  const geo = new THREE.SphereGeometry(50, 60, 40);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  const sphere = new THREE.Mesh(geo, mat);
  scene.add(sphere);

  new THREE.TextureLoader().load(
    'pano.jpg',
    (tex) => {                       // success: use the photo
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.needsUpdate = true;
    },
    undefined,
    () => {                          // error: paint a procedural sky so rotation still reads
      const tex = makeFallbackSky();
      mat.map = tex;
      mat.needsUpdate = true;
      debug('pano.jpg missing — using procedural sky');
    }
  );

  showDebug();
  setPhoneCanvas(renderer);
  enableGyroTap('Tap to look around');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// Sky-to-horizon gradient with a few painted bands so turning is obvious.
function makeFallbackSky() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#1a2a6c');
  g.addColorStop(0.5, '#6a8cc9');
  g.addColorStop(0.55, '#c9b28c');
  g.addColorStop(1.0, '#3a2a1a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);

  // Vertical marker bands (like compass posts) so left/right motion is visible.
  const bands = ['#ff5c8a', '#5cffb0', '#ffd75c', '#5cc9ff'];
  for (let i = 0; i < bands.length; i++) {
    ctx.fillStyle = bands[i];
    ctx.globalAlpha = 0.85;
    ctx.fillRect(i * 256 + 118, 40, 20, 432);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function animate() {
  requestAnimationFrame(animate);
  if (window.sensorsEnabled) applyDeviceRotation(camera, { smooth: 0.1 });
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
