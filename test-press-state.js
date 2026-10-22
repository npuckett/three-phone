#!/usr/bin/env node
/**
 * Browser check for the permission-activation UIs: taps every activation style with
 * touch (Pixel 7 emulation) and with a mouse, and asserts three-phone's touch state is
 * fully released afterwards (touches[] empty, touchEnded() fired).
 * Regression: the Tap, Button and Banner UIs (and the XR ones) used to stopPropagation()
 * the pointerup, so the window listener in _installTouchListeners saw the press and
 * never the release, leaving a ghost entry in touches[].
 *
 * Modelled on p5-phone's test-press-state.js. Needs Playwright's Chromium
 * (npx playwright install chromium). Playwright comes from this repo's node_modules if
 * installed, else from a p5-phone checkout (P5_PHONE_DIR, or ../p5-phone next to this repo
 * or one of its parents). No network: three.js is not loaded.
 * Run: node test-press-state.js   (or: npm run test:press)
 * PRESS_LIB=dist/three-phone.min.js tests the build that npm publishes instead of src/.
 */

const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (e) {
    const dirs = [];
    if (process.env.P5_PHONE_DIR) dirs.push(path.resolve(process.env.P5_PHONE_DIR));
    for (let d = __dirname; ; d = path.dirname(d)) {
      dirs.push(path.join(path.dirname(d), 'p5-phone'));
      if (path.dirname(d) === d) break;
    }
    for (const d of dirs) {
      const p = path.join(d, 'node_modules', 'playwright');
      if (fs.existsSync(p)) return require(p);
    }
    console.error('test-press-state: Playwright not found. npm install playwright here, or set P5_PHONE_DIR=/path/to/p5-phone.');
    process.exit(1);
  }
}
const { chromium, devices } = loadPlaywright();

const ORIGIN = 'http://localhost:9996';
const LIB = path.resolve(__dirname, process.env.PRESS_LIB || 'src/three-phone.js');

// Vibration needs no browser permission, so the handler resolves immediately: the
// hardest case, because the UI is removed while the tap is still finishing. The XR
// styles run against a stubbed navigator.xr and renderer, so the session "starts" and
// the UI goes away too.
const STYLES = {
  tap: { call: `enableVibrationTap('tap');`, selector: '#tapOverlay' },
  button: { call: `enableVibrationButton('go', 'wait');`, selector: '#permissionButton' },
  banner: { call: `enableVibrationBanner('banner');`, selector: '#permissionBanner' },
  canvas: { call: `enableVibrationCanvas('touch');`, selector: '#c' },
  on: { call: `enableVibrationOn('#customBtn');`, selector: '#customBtn' },
  perms: { call: `enablePermissionsTap(['vibration'], 'tap');`, selector: '#tapOverlay' },
  xrTap: { call: `enableXRTap('ar');`, selector: '#tapOverlay', xr: true },
  xrButton: { call: `enableXRButton('ar');`, selector: '#permissionButton', xr: true },
  xrOn: { call: `enableXROn('#customBtn');`, selector: '#customBtn', xr: true },
};

const fakeXR = () => {
  // navigator.xr is a getter on Navigator.prototype, so plain assignment is ignored.
  Object.defineProperty(navigator, 'xr', {
    configurable: true,
    value: {
      isSessionSupported: async () => true,
      requestSession: async () => new EventTarget(),
    },
  });
};

const page = (call) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/three-phone.js"></script></head>
<body style="margin:0;background:#333">
<canvas id="c" style="position:fixed;inset:0;width:100%;height:100%"></canvas>
<button id="customBtn" style="position:fixed;bottom:10px;left:10px;z-index:5;padding:20px">custom</button>
<script>
window.evlog = [];
const canvas = document.getElementById('c');
// A stand-in WebGLRenderer: enough for setPhoneCanvas() and the XR session start.
setPhoneCanvas({ domElement: canvas, xr: { enabled: false, setReferenceSpaceType() {}, async setSession() {} } });
function touchStarted(){ evlog.push('touchStarted'); }
function touchEnded(){ evlog.push('touchEnded'); }
${call}
window.ready = true;
</script></body></html>`;

async function open(ctx, html) {
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.route(ORIGIN + '/**', (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    if (pathname === '/three-phone.js') return route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(LIB) });
    return route.fulfill({ status: 404, body: '' });
  });
  await p.goto(ORIGIN + '/');
  await p.waitForFunction(() => window.ready === true, null, { timeout: 15000 });
  return { p, errors };
}

(async () => {
  const browser = await chromium.launch();
  const rows = [];

  for (const input of ['touch', 'mouse']) {
    for (const [style, { call, selector, xr }] of Object.entries(STYLES)) {
      const ctx = await browser.newContext(input === 'touch' ? devices['Pixel 7'] : { viewport: { width: 900, height: 700 } });
      if (xr) await ctx.addInitScript(fakeXR);
      const { p, errors } = await open(ctx, page(call));
      await p.waitForSelector(selector);
      await p.waitForTimeout(500); // banner slide-in, XR support check
      const box = await p.locator(selector).boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      if (input === 'touch') await p.touchscreen.tap(x, y);
      else await p.mouse.click(x, y);
      await p.waitForTimeout(600);
      const r = await p.evaluate((isXR) => ({
        touches: (window.touches || []).length,
        enabled: isXR ? window.xrActive === true : window.vibrationEnabled === true,
        uiGone: !document.querySelector('#tapOverlay,#permissionButton,#permissionBanner'),
        events: window.evlog.join(','),
      }), !!xr);
      const ok = r.touches === 0 && /touchEnded/.test(r.events) && r.enabled && r.uiGone && !errors.length;
      rows.push({ input, style, ...r, errors: errors.join('; ').slice(0, 60), ok });
      await ctx.close();
    }
  }

  await browser.close();
  console.log('lib: ' + path.relative(__dirname, LIB));
  console.table(rows);
  const failed = rows.filter((r) => !r.ok);
  console.log(failed.length ? `${failed.length} of ${rows.length} FAILED` : `All ${rows.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
