// ==============================================
// ml5 BODYPOSE — two points in 3D
// ==============================================
// ml5 BodyPose (MoveNet) tracks body keypoints. We take the two wrists
// (left #9, right #10), map them onto the camera overlay with cam.mapKeypoints(),
// and connect them with a lit 3D bone. The readout shows the wrist span.
// ==============================================

let R, cam, bodyPose, poses = [];
let jointA, jointB, boneMesh;
const A = 9, B = 10; // left_wrist, right_wrist

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
  showMl5LoadingOverlay('Loading BodyPose…');
  bodyPose = ml5.bodyPose('MoveNet', { flipped: false }, () => {
    hideMl5LoadingOverlay();
    bodyPose.detectStart(cam.videoElement, (results) => { poses = results; });
    debug('BodyPose ready — step back so your body is visible');
  });
}

function hideAll() { jointA.visible = jointB.visible = boneMesh.visible = false; }

function confident(kp) { return kp && (kp.confidence === undefined || kp.confidence > 0.3); }

function animate() {
  requestAnimationFrame(animate);
  if (poses.length) {
    const kps = cam.mapKeypoints(poses[0].keypoints);
    const a = kps[A], b = kps[B];
    if (confident(a) && confident(b)) {
      jointA.visible = jointB.visible = boneMesh.visible = true;
      jointA.position.set(a.x, a.y, 0);
      jointB.position.set(b.x, b.y, 0);
      TPML5.placeBone(boneMesh, a.x, a.y, b.x, b.y);
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      debug('wrist span: ' + d.toFixed(0) + 'px');
    } else {
      hideAll();
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
