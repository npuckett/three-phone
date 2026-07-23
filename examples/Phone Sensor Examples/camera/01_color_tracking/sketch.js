// ==============================================
// CAMERA COLOR TRACKING
// ==============================================
// PhoneCamera streams the rear camera as a THREE.VideoTexture background (in an
// orthographic overlay). Tap anywhere to pick a target color; a lit 3D marker
// then tracks the centroid of that color in the video, mapped with cam.mapPoint().
// ==============================================

let renderer, scene, camera, cam, bg, marker, lamp;
let sampleCanvas, sampleCtx;
let target = null;      // { r, g, b }
const SW = 80, SH = 60; // downsampled scan size

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  // Orthographic overlay with top-left origin (matches cam.mapPoint output).
  camera = new THREE.OrthographicCamera(0, innerWidth, 0, innerHeight, -100, 100);

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  lamp = new THREE.PointLight(0xffffff, 1.2, 600);
  scene.add(lamp);

  // Lit 3D marker ball.
  marker = new THREE.Mesh(
    new THREE.SphereGeometry(28, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.3, emissive: 0x222222 })
  );
  marker.visible = false;
  scene.add(marker);

  sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = SW; sampleCanvas.height = SH;
  sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

  cam = createPhoneCamera('environment', false, 'cover');
  cam.onReady(() => {
    bg = cam.createBackgroundMesh(innerWidth, innerHeight);
    scene.add(bg);
  });

  showDebug();
  setPhoneCanvas(renderer);
  enableCameraTap('Tap to enable the camera');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// Tap: sample the camera pixel under the finger to set the target color.
function touchStarted() {
  if (!cam || !cam.ready) return;
  const v = cam.videoElement;
  if (!v || !v.videoWidth) return;
  sampleCtx.drawImage(v, 0, 0, SW, SH);
  // Map screen tap → video pixel (inverse of cover mapping is approximate; sample center-ish).
  const vx = Math.floor((mouseX / innerWidth) * SW);
  const vy = Math.floor((mouseY / innerHeight) * SH);
  const d = sampleCtx.getImageData(Math.max(0, Math.min(SW - 1, vx)), Math.max(0, Math.min(SH - 1, vy)), 1, 1).data;
  target = { r: d[0], g: d[1], b: d[2] };
  marker.material.color.setRGB(target.r / 255, target.g / 255, target.b / 255);
  debug('target color ' + target.r + ',' + target.g + ',' + target.b);
}

function animate() {
  requestAnimationFrame(animate);

  if (cam && cam.ready && target) {
    const v = cam.videoElement;
    sampleCtx.drawImage(v, 0, 0, SW, SH);
    const px = sampleCtx.getImageData(0, 0, SW, SH).data;
    let sx = 0, sy = 0, n = 0;
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const i = (y * SW + x) * 4;
        const dr = px[i] - target.r, dg = px[i + 1] - target.g, db = px[i + 2] - target.b;
        if (dr * dr + dg * dg + db * db < 2200) { sx += x; sy += y; n++; }
      }
    }
    if (n > 4) {
      // Centroid in video space → canvas coords via the camera's mapping.
      const vw = v.videoWidth, vh = v.videoHeight;
      const p = cam.mapPoint((sx / n) * (vw / SW), (sy / n) * (vh / SH));
      marker.visible = true;
      marker.position.set(p.x, p.y, 1);
      lamp.position.set(p.x, p.y, 120);
    } else {
      marker.visible = false;
    }
  }

  renderer.render(scene, camera);
}

function onResize() {
  camera.right = innerWidth; camera.bottom = innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (cam && cam._bgMesh) { scene.remove(cam._bgMesh); bg = cam.createBackgroundMesh(innerWidth, innerHeight); scene.add(bg); }
}

init();
