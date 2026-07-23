// Shared three.js helpers for the ml5 "two points" examples.
// An orthographic overlay (top-left origin, pixels) sits over the camera feed;
// two lit 3D spheres are joined by a 3D "bone" cylinder.
window.TPML5 = (function () {
  function makeScene(W, H) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Top-left origin, y increases downward — matches PhoneCamera.mapPoint().
    const camera = new THREE.OrthographicCamera(0, W, 0, H, -1000, 1000);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.PointLight(0xffffff, 1.4, 6000);
    light.position.set(W / 2, H / 2, 500);
    scene.add(light);

    return { renderer, scene, camera, light };
  }

  function joint(scene, color) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(24, 28, 28),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.2 })
    );
    m.renderOrder = 2;
    m.material.depthTest = false;
    scene.add(m);
    return m;
  }

  function bone(scene) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 7, 1, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x3a2d5c, emissiveIntensity: 0.6, roughness: 0.4 })
    );
    m.renderOrder = 1;
    m.material.depthTest = false;
    scene.add(m);
    return m;
  }

  // Point/scale the bone cylinder (local +Y axis) from a → b.
  function placeBone(boneMesh, ax, ay, bx, by) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    boneMesh.position.set(mx, my, 0);
    boneMesh.scale.y = len;
    boneMesh.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
  }

  return { makeScene, joint, bone, placeBone };
})();
