// ==============================================
// ml5 HANDPOSE — two points in 3D
// ==============================================
// PhoneCamera streams the front camera behind an orthographic overlay. ml5
// HandPose finds hand landmarks; we take two (thumb tip #4 and index tip #8),
// map them to canvas space with cam.mapKeypoints(), and draw them as lit 3D
// spheres joined by a 3D bone. The readout shows the pinch distance.
// ==============================================

let R, cam, handPose, hands = [];
let jointA, jointB, boneMesh;
const A = 4, B = 8; // thumb tip, index tip

function init() {
  R = TPML5.makeScene(innerWidth, innerHeight);
  jointA = TPML5.joint(R.scene, 0x5dd0ff);
  jointB = TPML5.joint(R.scene, 0xff5d8f);
  boneMesh = TPML5.bone(R.scene);
  hideAll();

  showDebug();
  setPhoneCanvas(R.renderer);
  cam = createPhoneCamera('user', true, 'cover');
  cam.onReady(onCameraReady);
  enableCameraTap('Tap to enable the camera');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

function onCameraReady() {
  R.scene.add(cam.createBackgroundMesh(innerWidth, innerHeight));
  showMl5LoadingOverlay('Loading HandPose…');
  handPose = ml5.handPose({ flipped: false }, () => {
    hideMl5LoadingOverlay();
    handPose.detectStart(cam.videoElement, (results) => { hands = results; });
    debug('HandPose ready — show your hand');
  });
}

function hideAll() { jointA.visible = jointB.visible = boneMesh.visible = false; }

function animate() {
  requestAnimationFrame(animate);
  if (hands.length) {
    const kps = cam.mapKeypoints(hands[0].keypoints);
    const a = kps[A], b = kps[B];
    if (a && b) {
      jointA.visible = jointB.visible = boneMesh.visible = true;
      jointA.position.set(a.x, a.y, 0);
      jointB.position.set(b.x, b.y, 0);
      TPML5.placeBone(boneMesh, a.x, a.y, b.x, b.y);
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const pinch = d < 60;
      boneMesh.material.emissive.setHex(pinch ? 0xffd166 : 0x3a2d5c);
      debug('pinch distance: ' + d.toFixed(0) + 'px' + (pinch ? '  ✦ PINCH' : ''));
    }
  } else {
    hideAll();
  }
  R.renderer.render(R.scene, R.camera);
}

function onResize() {
  R.renderer.setSize(innerWidth, innerHeight);
  R.camera.right = innerWidth; R.camera.bottom = innerHeight; R.camera.updateProjectionMatrix();
  if (cam && cam._bgMesh) { R.scene.remove(cam._bgMesh); R.scene.add(cam.createBackgroundMesh(innerWidth, innerHeight)); }
}

init();
