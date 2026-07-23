// ==============================================
// PERMISSIONS COMBO — sensors + mic + vibration
// ==============================================
// One tap grants three permissions at once:
//   enablePermissionsTap(['sensors', 'mic', 'vibration']).
// Tilt to steer a ball across audio-reactive terrain; shout to raise the hills;
// hitting a hill buzzes (vibrate) on Android.
// ==============================================

let renderer, scene, camera, ball, terrain, geo, base = [];
let vx = 0, vz = 0, lastBuzz = 0;
const SEG = 40, SIZE = 12;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  scene.fog = new THREE.Fog(0x0e0b16, 8, 20);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0x8899ff, 0x101020, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(4, 8, 4); scene.add(key);

  geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  for (let i = 0; i < geo.attributes.position.count; i++) base.push(0);
  terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6d5cff, roughness: 0.7, metalness: 0.1, flatShading: true }));
  terrain.rotation.x = -Math.PI / 2;
  scene.add(terrain);

  ball = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.25, metalness: 0.3 }));
  scene.add(ball);

  showDebug();
  setPhoneCanvas(renderer);
  enablePermissionsTap(['sensors', 'mic', 'vibration'], 'Tap to enable motion + mic + vibration');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function heightAt(x, z, t, mic) {
  return Math.sin(x * 0.5 + t) * Math.cos(z * 0.5 - t) * (0.6 + mic * 3);
}

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.0006;
  const mic = getMicLevel();

  // Sculpt the terrain (louder → taller hills).
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, heightAt(pos.getX(i), pos.getY(i), t, mic));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  // Tilt steers the ball.
  if (window.sensorsEnabled) {
    vx += (rotationY / 90) * 0.01;
    vz += (rotationX / 90) * 0.01;
  }
  vx *= 0.95; vz *= 0.95;
  ball.position.x = Math.max(-SIZE / 2, Math.min(SIZE / 2, ball.position.x + vx));
  ball.position.z = Math.max(-SIZE / 2, Math.min(SIZE / 2, ball.position.z + vz));
  const ground = heightAt(ball.position.x, ball.position.z, t, mic);
  ball.position.y = ground + 0.4;

  // Buzz when the terrain pushes up hard under the ball.
  if (ground > 1.6 && performance.now() - lastBuzz > 400) {
    if (window.vibrationEnabled) vibrate(30);
    lastBuzz = performance.now();
  }

  // Chase camera.
  camera.position.lerp(new THREE.Vector3(ball.position.x, ball.position.y + 4, ball.position.z + 7), 0.08);
  camera.lookAt(ball.position);

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
