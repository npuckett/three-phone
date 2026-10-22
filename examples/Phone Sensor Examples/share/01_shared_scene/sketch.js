// ==============================================
// SHARED SCENE — many phones, one 3D space
// ==============================================
// Every phone in the room is a piece on the same floor. Tap the floor to move
// your piece (me.x, me.z); tilt the phone to lean it (me.tilt). Tap the crystal
// to recolor it for everyone (shared.hue). Shake to make the crystal pulse on
// every phone, and your own piece jump on theirs (shareEmit + shareEvent's
// third argument, the sender's id).
//
// One tap asks for motion and joins the room: enablePermissionsTap(['gyro',
// 'share']). Joining also keeps the screen on, so a phone does not drop out of
// the room when its screen would lock.
//
// THE SERVER: Share uses p5-phone's P5PhoneShare worker (once, for your project):
//   cd p5-phone/companion/P5PhoneShare && npm install && npx wrangler login && npx wrangler deploy
//   → paste the printed https://….workers.dev into SHARE_HOST below,
//   or open this page with ?shareHost=https://….workers.dev&room=my-room
// INVITE FRIENDS: send them getShareJoinUrl() (the console prints it once you join).
// ==============================================

const SHARE_HOST = 'https://YOUR_SUBDOMAIN.workers.dev'; // ← your wrangler deploy URL (or use ?shareHost=)

let renderer, scene, camera, raycaster, floor, crystal, label;
let myPiece;
const pieces = new Map(); // guest id -> mesh
let pulse = 0;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0b16);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 7, 9);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x201830, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(3, 8, 4);
  scene.add(key);

  floor = new THREE.Mesh(
    new THREE.CircleGeometry(5, 64),
    new THREE.MeshStandardMaterial({ color: 0x1f1830, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  scene.add(new THREE.PolarGridHelper(5, 8, 5, 64, 0x3a2d5c, 0x2a2140));

  crystal = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.8, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1, flatShading: true })
  );
  crystal.position.y = 1.2;
  scene.add(crystal);

  raycaster = new THREE.Raycaster();

  // A random color and a spot on the floor before joining. Both survive the join.
  const myHue = Math.random();
  shareSetup({
    host: SHARE_HOST,
    room: 'shared-scene',
    app: 'three-shared-scene',
    shared: { hue: 0.75 },
    me: { hue: myHue, x: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 4, tilt: 0 }
  });
  myPiece = makePiece(myHue);
  scene.add(myPiece);

  label = document.createElement('div');
  label.style.cssText = 'position:fixed;left:0;right:0;top:12px;text-align:center;color:#fff;' +
    'font:15px -apple-system,BlinkMacSystemFont,sans-serif;pointer-events:none;text-shadow:0 1px 3px #000';
  document.body.appendChild(label);

  setPhoneCanvas(renderer);
  enablePermissionsTap(['gyro', 'share'], 'Tap to join the room');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function makePiece(hue) {
  const piece = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 1, 24),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, 0.7, 0.55), roughness: 0.4 })
  );
  piece.geometry.translate(0, 0.5, 0); // stand on the floor, lean from the base
  piece.userData.jump = 0;
  return piece;
}

// Tap the crystal to recolor it for everyone; tap the floor to move your piece.
function touchStarted() {
  if (!shareConnected) return;
  getTouchRaycaster(mouseX, mouseY, camera, raycaster);
  if (raycaster.intersectObject(crystal).length) {
    shared.hue = Math.random(); // a value to set, not to add to: last write wins is fine
    return;
  }
  const hit = raycaster.intersectObject(floor)[0];
  if (hit) {
    me.x = round2(hit.point.x);
    me.z = round2(hit.point.z);
  }
}

// Shake: tell the room. Every phone pulses its crystal and makes the sender's piece jump.
function deviceShaken() {
  if (shareConnected) shareEmit('pulse');
  pulse = 1;
  myPiece.userData.jump = 1;
}

function shareEvent(name, data, from) {
  if (name !== 'pulse') return;
  pulse = 1;
  const piece = pieces.get(from);
  if (piece) piece.userData.jump = 1;
}

function shareReady() {
  debug('joined as ' + (shareIsHost ? 'host' : 'guest') + ' · invite: ' + getShareJoinUrl());
}
function shareJoined(id, data) { debug('a phone joined (' + guests.length + ' others now)'); }
function shareLeft(id, data) { debug('a phone left (' + guests.length + ' others now)'); }

function animate() {
  requestAnimationFrame(animate);

  // My tilt, sent at most every 50 ms by Share; whole degrees so a steady hand sends nothing.
  if (shareConnected && window.sensorsEnabled) me.tilt = Math.round(rotationY);

  placePiece(myPiece, me);

  // One piece per guest: add the new ones, drop the ones that left.
  const here = new Set();
  for (const g of guests) {
    here.add(g.id);
    let piece = pieces.get(g.id);
    if (!piece) {
      piece = makePiece(typeof g.hue === 'number' ? g.hue : 0);
      piece.position.set(g.x || 0, 0, g.z || 0);
      pieces.set(g.id, piece);
      scene.add(piece);
    }
    placePiece(piece, g);
  }
  for (const [id, piece] of pieces) {
    if (!here.has(id)) {
      scene.remove(piece);
      pieces.delete(id);
    }
  }

  crystal.material.color.setHSL(typeof shared.hue === 'number' ? shared.hue : 0.75, 0.7, 0.6);
  crystal.rotation.y += 0.01;
  pulse *= 0.92;
  crystal.scale.setScalar(1 + pulse * 0.6);

  label.textContent = statusLine();
  renderer.render(scene, camera);
}

// Ease a piece toward its phone's values, so 20 updates a second look smooth.
function placePiece(piece, data) {
  piece.position.x += ((data.x || 0) - piece.position.x) * 0.2;
  piece.position.z += ((data.z || 0) - piece.position.z) * 0.2;
  const lean = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(data.tilt || 0, -45, 45));
  piece.rotation.z += (-lean - piece.rotation.z) * 0.2;
  piece.userData.jump *= 0.9;
  piece.position.y = Math.sin(piece.userData.jump * Math.PI) * 0.8;
}

function statusLine() {
  const hostMissing = SHARE_HOST.includes('YOUR_SUBDOMAIN') && !/[?&]shareHost=/.test(location.search);
  if (hostMissing && !shareConnected) return 'Set SHARE_HOST in sketch.js, or open a link with ?shareHost=…';
  if (shareConnected) return shareStatusText() + (shareIsHost ? ' · you are host' : '');
  return shareStatusText();
}

function round2(v) { return Math.round(v * 100) / 100; }

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();
