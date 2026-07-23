// ==============================================
// ml5 FACEMESH — two points in 3D
// ==============================================
// ml5 FaceMesh returns 468 face landmarks. We take the two outer eye corners
// (#33 and #263), map them onto the camera overlay with cam.mapKeypoints(), and
// draw a lit 3D bone across the eyes. The readout shows the eye separation.
// ==============================================

let R, cam, faceMesh, faces = [];
let jointA, jointB, boneMesh;
const A = 33, B = 263; // right-eye outer, left-eye outer

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
  showMl5LoadingOverlay('Loading FaceMesh…');
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: false }, () => {
    hideMl5LoadingOverlay();
    faceMesh.detectStart(cam.videoElement, (results) => { faces = results; });
    debug('FaceMesh ready — look at the camera');
  });
}

function hideAll() { jointA.visible = jointB.visible = boneMesh.visible = false; }

function animate() {
  requestAnimationFrame(animate);
  if (faces.length && faces[0].keypoints) {
    const kps = cam.mapKeypoints(faces[0].keypoints);
    const a = kps[A], b = kps[B];
    if (a && b) {
      jointA.visible = jointB.visible = boneMesh.visible = true;
      jointA.position.set(a.x, a.y, 0);
      jointB.position.set(b.x, b.y, 0);
      TPML5.placeBone(boneMesh, a.x, a.y, b.x, b.y);
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      debug('eye separation: ' + d.toFixed(0) + 'px');
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
