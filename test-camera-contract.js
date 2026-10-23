#!/usr/bin/env node
/**
 * Contract tests for PhoneCamera switching (cam.active = 'environment').
 * A switch replaces the stream, the <video>, and the VideoTexture, so every
 * background the camera drives — scene.background (attachBackground) and the
 * overlay mesh (createBackgroundMesh) — must be re-pointed at the new texture
 * and re-fit once the new video has dimensions. onReady must keep p5-phone's
 * semantics: one-shot, not re-fired by a switch, and a callback registered
 * during a switch fires once the new feed is live.
 *
 * Evaluates the whole of src/three-phone.js in a DOM-less sandbox with a fake
 * getUserMedia, fake <video> elements, and a minimal fake THREE.
 * Run: node test-camera-contract.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcPath = path.join(__dirname, 'src', 'three-phone.js');
const src = fs.readFileSync(srcPath, 'utf8');

// --- fake media ------------------------------------------------------------
const streams = [];
const videos = [];

function makeStream(facingMode) {
  const track = { stopped: false, stop() { this.stopped = true; } };
  const stream = { facingMode, tracks: [track], getTracks() { return this.tracks; } };
  streams.push(stream);
  return stream;
}
const liveStreams = () => streams.filter((s) => s.tracks.some((t) => !t.stopped));

function makeVideo() {
  const listeners = {};
  const v = {
    tagName: 'VIDEO', style: {}, readyState: 0, videoWidth: 0, videoHeight: 0, parentNode: null,
    setAttribute() {},
    addEventListener(type, fn, opts) { (listeners[type] = listeners[type] || []).push({ fn, once: !!(opts && opts.once) }); },
    removeEventListener() {},
    play() { return Promise.resolve(); },
    // Simulate the first frame arriving: dimensions known, readyState >= 2.
    load(w, h) {
      this.videoWidth = w; this.videoHeight = h; this.readyState = 4;
      const ls = listeners.loadeddata || [];
      listeners.loadeddata = ls.filter((l) => !l.once);
      ls.forEach((l) => l.fn());
    }
  };
  videos.push(v);
  return v;
}

// --- fake THREE ------------------------------------------------------------
class Vec { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
class VideoTexture {
  constructor(video) {
    this.isVideoTexture = true; this.image = video; this.disposed = false; this.needsUpdate = false;
    this.repeat = new Vec(1, 1); this.offset = new Vec(); this.center = new Vec();
  }
  dispose() { this.disposed = true; }
}
const THREE = {
  VideoTexture,
  SRGBColorSpace: 'srgb',
  ClampToEdgeWrapping: 1001,
  DoubleSide: 2,
  PlaneGeometry: class { constructor(w, h) { this.width = w; this.height = h; } },
  MeshBasicMaterial: class { constructor(opts) { Object.assign(this, opts); this.needsUpdate = false; } },
  Mesh: class { constructor(g, m) { this.geometry = g; this.material = m; this.position = new Vec(); this.scale = new Vec(1, 1, 1); } }
};

// --- sandbox ---------------------------------------------------------------
const noop = () => {};
const body = {
  appendChild(el) { el.parentNode = body; },
  removeChild(el) { el.parentNode = null; },
  contains: () => false
};
const sandbox = {
  console: { log: noop, warn: noop, error: noop, clear: noop },
  navigator: {
    vibrate: noop,
    userAgent: 'node',
    mediaDevices: { getUserMedia: (c) => Promise.resolve(makeStream(c.video.facingMode)) }
  },
  document: {
    addEventListener: noop,
    querySelector: () => null,
    createElement: (tag) => (tag === 'video' ? makeVideo() : { style: {}, addEventListener: noop, appendChild: noop }),
    getElementById: () => null,
    readyState: 'complete',
    head: { appendChild: noop },
    body
  },
  setTimeout: noop,
  clearTimeout: noop,
  requestAnimationFrame: noop,
  innerWidth: 400,   // portrait phone canvas (no <canvas> found → window size)
  innerHeight: 800,
  THREE
};
sandbox.addEventListener = noop;
sandbox.removeEventListener = noop;
sandbox.dispatchEvent = noop;
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'three-phone.js' });

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log('  ✓ ' + name);
  } else {
    console.error('  ✗ ' + name);
    failures++;
  }
}
const near = (a, b) => Math.abs(a - b) < 1e-6;
const flush = () => new Promise((r) => setImmediate(r));
const lastVideo = () => videos[videos.length - 1];

// Cover-fit repeat.x for a 400x800 canvas: (canvasAspect / videoAspect), negated when mirrored.
const coverRx = (vw, vh, mirror) => (0.5 / (vw / vh)) * (mirror ? -1 : 1);

(async () => {
  const cam = sandbox.createPhoneCamera('user', true, 'cover');
  const scene = { background: null };
  let firstReady = 0;
  cam.onReady(() => { firstReady++; cam.attachBackground(scene); });

  // The enableCamera* gesture runs this.
  await sandbox._requestCameraPermissionCore();
  await flush();
  lastVideo().load(640, 480);
  const mesh = cam.createBackgroundMesh();
  const tex0 = cam.getTexture();

  console.log('Initial camera:');
  check('onReady fired once when the feed went live', firstReady === 1);
  check('attachBackground set scene.background to the camera texture', scene.background === tex0);
  check('overlay mesh uses the same texture', mesh.material.map === tex0);
  check('scene.background cover-fit to the 640x480 front feed (mirrored)', near(tex0.repeat.x, coverRx(640, 480, true)));

  // --- switch to the rear camera -----------------------------------------
  cam.active = 'environment';
  cam.mirror = false; // typical: rear camera unmirrored, set in the same tick
  await flush();
  const oldVideo = videos[0];

  console.log('Switch requested (new feed not live yet):');
  check('getUserMedia asked for facingMode "environment"', streams[streams.length - 1].facingMode === 'environment');
  check('old stream stopped', streams[0].tracks.every((t) => t.stopped));
  check('old <video> removed from the DOM', oldVideo.parentNode === null);
  check('cam.ready is false until the new feed is live', cam.ready === false);
  check('old texture not disposed while scene.background still shows it', tex0.disposed === false);

  let duringSwitchReady = 0;
  let bgBoundBeforeCallback = false;
  cam.onReady(() => {
    duringSwitchReady++;
    bgBoundBeforeCallback = scene.background === cam.getTexture();
  });

  lastVideo().load(1280, 720);
  const tex1 = cam.getTexture();

  console.log('New feed live:');
  check('cam.ready is true again', cam.ready === true);
  check('a new VideoTexture was created for the new <video>', tex1 && tex1 !== tex0 && tex1.image === lastVideo());
  check('scene.background re-pointed at the new texture', scene.background === tex1);
  check('overlay mesh re-pointed at the new texture', mesh.material.map === tex1 && mesh.material.needsUpdate === true);
  check('new texture cover-fit to the 1280x720 rear feed (unmirrored)', near(tex1.repeat.x, coverRx(1280, 720, false)) && near(tex1.repeat.y, 1));
  check('old texture disposed once nothing shows it', tex0.disposed === true);
  check('onReady registered before the switch did not re-fire (p5-phone parity)', firstReady === 1);
  check('onReady registered during the switch fired exactly once', duringSwitchReady === 1);
  check('…and saw the new background already bound', bgBoundBeforeCallback === true);
  check('exactly one live stream', liveStreams().length === 1);

  // --- a background the sketch replaced is left alone ---------------------
  const userBg = { isColor: true };
  scene.background = userBg;
  cam.active = 'user';
  await flush();
  lastVideo().load(640, 480);

  console.log('Sketch replaced scene.background before switching:');
  check('scene.background left as the sketch set it', scene.background === userBg);
  check('overlay mesh still follows the switch', mesh.material.map === cam.getTexture());

  // --- rapid double toggle -------------------------------------------------
  scene.background = cam.getTexture();
  const beforeToggle = videos.length;
  cam.active = 'environment';
  cam.active = 'user';          // lands while the first switch is opening its stream
  for (let i = 0; i < 5; i++) await flush();
  // A first frame arriving on a feed that was already replaced must be ignored.
  const staleVideos = videos.slice(beforeToggle, -1);
  staleVideos.forEach((v) => v.load(1280, 720));
  const readyAfterStale = cam.ready;
  lastVideo().load(640, 480);

  console.log('Rapid double toggle (environment → user before the first stream opens):');
  check('feed ends on the latest active ("user")', liveStreams().length === 1 && liveStreams()[0].facingMode === 'user');
  check('cam.active and the live stream agree', cam.active === liveStreams()[0].facingMode);
  check('cam.video is the live feed', cam.video === lastVideo() && lastVideo().parentNode === body);
  check('a stale feed reaching loadeddata does not mark the camera ready', staleVideos.length === 0 || readyAfterStale === false);
  check('scene.background follows to the final texture', scene.background === cam.getTexture() && cam.getTexture().image === lastVideo());

  if (failures) {
    console.error(`\nCAMERA CONTRACT FAIL — ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nCAMERA CONTRACT PASS');
})().catch((err) => {
  console.error('CAMERA CONTRACT FAIL — threw:', err);
  process.exit(1);
});
