#!/usr/bin/env node
/**
 * End-to-end checks for three-phone Share: real browsers talking to the real companion
 * worker. Starts `wrangler dev` for p5-phone's companion/P5PhoneShare (see
 * test-share-common.js for how it is found) on 127.0.0.1:8798, opens several emulated
 * phones with Playwright's Chromium, and checks what a class would hit: joining from
 * every activation style and from 'share' in enablePermissionsTap, late joiners,
 * shared/me/guests sync, events with the sender's id, shareJoined/shareLeft, the helpers,
 * host handoff, reconnect, hidden pages, concurrent writes, URL join links, the wake lock,
 * keep, quiet, and the three.js share examples.
 *
 * Modelled on p5-phone's test-share-e2e.js, test-share-keep-e2e.js and
 * test-share-quiet-e2e.js. Those also test the worker on the wire; this file tests
 * three-phone's client against it.
 *
 * Needs: a p5-phone checkout with `npm install` run in companion/P5PhoneShare and
 * Playwright's Chromium (npx playwright install chromium); network access for the
 * three.js CDN build the examples import.
 * Run: node test-share-e2e.js   (or: npm run test:share)
 * SHARE_E2E_LIB=dist/three-phone.min.js tests the build that npm publishes instead of src/.
 */

const fs = require('fs');
const path = require('path');
const { findShareServerDir, loadPlaywright, waitForHttp, startWorker } = require('./test-share-common');

const SERVER_DIR = findShareServerDir();
if (!SERVER_DIR) {
  console.error('test-share-e2e: no P5PhoneShare worker found. Set P5_PHONE_DIR=/path/to/p5-phone ' +
    '(or SHARE_SERVER_DIR=/path/to/P5PhoneShare), or put a p5-phone checkout next to this repo.');
  process.exit(1);
}
const { chromium, devices } = loadPlaywright(SERVER_DIR);

const ORIGIN = 'http://localhost:9997';
const PORT = 8798;
const HOST = `http://127.0.0.1:${PORT}`;
const LIB = path.resolve(__dirname, process.env.SHARE_E2E_LIB || 'src/three-phone.js');
const RUN = Date.now().toString(36);
const DAY = 24 * 60 * 60 * 1000;

const STYLES = {
  tap: { call: `enableShareTap({ label: 'join' });`, selector: '#tapOverlay' },
  button: { call: `enableShareButton({ label: 'join' });`, selector: '#permissionButton' },
  banner: { call: `enableShareBanner({ label: 'join' });`, selector: '#permissionBanner' },
  canvas: { call: `enableShareCanvas({ label: 'join' });`, selector: '#c' },
  on: { call: `enableShareOn('#customBtn');`, selector: '#customBtn' },
  label: { call: `enableShareTap('join');`, selector: '#tapOverlay' },
  // 'share' in the permission list joins from the same tap as the other permissions.
  perms: { call: `enablePermissionsTap(['vibration', 'share'], 'join');`, selector: '#tapOverlay' },
};

const rows = [];
function check(scenario, name, ok, detail) {
  rows.push({ scenario, check: name, ok: !!ok, detail: detail === undefined ? '' : String(detail).slice(0, 90) });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- pages ----------

// A three-phone sketch without three.js: Share does not touch THREE, so the API checks
// run without the CDN. The examples scenario loads the real three.js examples.
function sketch({ config, pre = '', enable }) {
  return `
window.evlog = [];
function init(){
  setPhoneCanvas(document.getElementById('c'));
  window.setupResult = shareSetup(${JSON.stringify(config)});
  ${pre}
  ${enable}
  window.ready = true;
}
function shareReady(){ evlog.push('ready'); }
function shareReceive(p, v){ evlog.push('recv:' + p); }
function shareEvent(n, d, from){ evlog.push('event:' + n + ':' + JSON.stringify(d)); evlog.push('eventFrom:' + n + ':' + from); }
function shareHostChanged(h){ evlog.push('host:' + h); }
function shareClosed(){ evlog.push('closed'); }
function shareJoined(id, d){ evlog.push('joined:' + id + ':' + (d && d.name)); }
function shareLeft(id, d){ evlog.push('left:' + id + ':' + (d && d.name)); }
function userSetupComplete(){ evlog.push('usc'); }
init();`;
}

function html(body) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/src/three-phone.js"></script></head>
<body style="margin:0"><canvas id="c" style="position:fixed;left:0;top:0;width:100vw;height:100vh;background:#222"></canvas>
<button id="customBtn" style="position:fixed;bottom:10px;left:10px;z-index:5;padding:20px">custom</button>
<script>${body}</script></body></html>`;
}

async function route(p, pageHtml) {
  // three-phone from the CDN or the local dist build is always served from LIB, so the
  // examples are tested against the code in this checkout.
  await p.route(/cdn\.jsdelivr\.net\/npm\/three-phone@[^/]+\/dist\/three-phone(\.min)?\.js/, (r) =>
    r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(LIB) }));
  await p.route(ORIGIN + '/**', (r) => {
    const pathname = decodeURIComponent(new URL(r.request().url()).pathname);
    if (pathname === '/' && pageHtml) return r.fulfill({ contentType: 'text/html', body: pageHtml });
    const isLib = pathname === '/src/three-phone.js' || /\/dist\/three-phone(\.min)?\.js$/.test(pathname);
    const file = isLib ? LIB : path.join(__dirname, pathname);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return r.fulfill({ status: 404, body: '' });
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'application/javascript';
    return r.fulfill({ contentType: type, body: fs.readFileSync(file) });
  });
}

// A stand-in for navigator.wakeLock that counts requests (headless Chromium has no screen
// to keep on). sendDelay simulates a phone on a slow network: every outgoing frame
// leaves late (in order).
async function newContext(browser, { touch = false, sendDelay = 0 } = {}) {
  const ctx = await browser.newContext(touch ? devices['Pixel 7'] : { viewport: { width: 800, height: 600 } });
  await ctx.addInitScript((delay) => {
    window.__wsSent = [];
    const orig = WebSocket.prototype.send;
    WebSocket.prototype.send = function (d) {
      window.__wsSent.push(d);
      if (delay) setTimeout(() => orig.call(this, d), delay);
      else orig.call(this, d);
    };
    window.__wake = { requests: 0, held: null };
    const wakeLock = {
      request(type) {
        window.__wake.requests++;
        const s = new EventTarget();
        s.type = type;
        s.released = false;
        s.release = () => {
          if (!s.released) { s.released = true; s.dispatchEvent(new Event('release')); }
          return Promise.resolve();
        };
        window.__wake.held = s;
        return Promise.resolve(s);
      },
    };
    Object.defineProperty(Navigator.prototype, 'wakeLock', { configurable: true, get: () => wakeLock });
  }, sendDelay);
  return ctx;
}

async function openClient(ctx, { config, pre, style = 'tap', query = '' }) {
  const p = await ctx.newPage();
  p.errors = [];
  p.cons = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => p.cons.push(m.type() + ': ' + m.text()));
  await route(p, html(sketch({ config, pre, enable: STYLES[style].call })));
  await p.goto(ORIGIN + '/' + query);
  await p.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
  return p;
}

async function tapToJoin(p, style = 'tap', touch = false) {
  const selector = STYLES[style].selector;
  await p.waitForSelector(selector);
  await p.waitForTimeout(style === 'banner' ? 500 : 150);
  const box = await p.locator(selector).first().boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (touch) await p.touchscreen.tap(x, y);
  else await p.mouse.click(x, y);
  return waitFor(p, () => window.shareConnected === true, 8000);
}

async function waitFor(p, fn, ms = 4000, arg) {
  try {
    await p.waitForFunction(fn, arg, { timeout: ms, polling: 50 });
    return true;
  } catch (e) {
    return false;
  }
}

const state = (p) => p.evaluate(() => ({
  connected: window.shareConnected,
  isHost: window.shareIsHost,
  id: window.shareClientId,
  status: window.shareStatus,
  error: window.shareError,
  room: window.shareRoom,
  kept: window.shareKept,
  keptUntil: window.shareKeptUntil,
  quiet: window.shareQuiet,
  now: Date.now(),
  shared: JSON.parse(JSON.stringify(window.shared)),
  me: JSON.parse(JSON.stringify(window.me)),
  guests: window.guests.map((g) => Object.assign({ id: g.id }, JSON.parse(JSON.stringify(g)))),
  evlog: (window.evlog || []).slice(),
  awake: window.screenAwake,
  wakeRequests: window.__wake.requests,
}));

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const patchCount = (p) => p.evaluate(() => window.__wsSent.filter((s) => /"type":"(patch|batch)"/.test(s)).length);
const setHidden = (p, hidden) => p.evaluate((h) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

// Join and leave without a gesture, for the keep and quiet checks.
async function openPhone(browser, config, extra = {}) {
  return openClient(await newContext(browser), Object.assign({ config, style: 'on' }, extra));
}
const join = (p) => tapToJoin(p, 'on');
const leave = async (p) => { await p.context().close(); };
// No queued or unechoed shared writes: the worker has applied everything this phone wrote.
const settled = (p) => waitFor(p, () => _shareOutbox.length === 0 && _sharePending.size === 0, 4000);

// ---------- scenarios ----------

async function coreSync(browser) {
  const S = 'core';
  const room = `core-${RUN}`;
  const ctxA = await newContext(browser, { touch: true });
  const ctxB = await newContext(browser);
  const A = await openClient(ctxA, { config: { host: HOST, room, shared: { score: 0, nested: { a: 1 } }, me: { name: 'A', x: 0 } } });
  check(S, 'guests is empty before joining', (await state(A)).guests.length === 0);
  check(S, 'shareStatusText before joining says tap to join', /Tap to join room/.test(await A.evaluate(() => shareStatusText())));
  check(S, 'A joins by tap', await tapToJoin(A, 'tap', true));
  await waitFor(A, () => window.evlog.includes('ready'));
  let a = await state(A);
  check(S, 'first joiner is host and seeds shared', a.isHost && eq(a.shared, { score: 0, nested: { a: 1 } }), JSON.stringify(a.shared));
  check(S, 'shareReady fired', a.evlog.includes('ready'));

  const B = await openClient(ctxB, { style: 'button', config: { host: HOST, room, shared: { score: 99, other: true }, me: { name: 'B' } } });
  check(S, 'B joins by button', await tapToJoin(B, 'button'));
  let b = await state(B);
  check(S, 'late joiner gets room state, not its own seed', eq(b.shared, { score: 0, nested: { a: 1 } }) && !b.isHost, JSON.stringify(b.shared));
  check(S, 'late joiner sees existing guest', b.guests.some((g) => g.id === a.id && g.name === 'A'), JSON.stringify(b.guests));
  check(S, 'existing guest sees late joiner', await waitFor(A, (id) => window.guests.some((g) => g.id === id && g.name === 'B'), 4000, b.id));
  check(S, 'shareJoined fires for a later joiner', await waitFor(A, (id) => window.evlog.includes('joined:' + id + ':B'), 4000, b.id));
  check(S, 'shareJoined does not fire for phones already there', !b.evlog.some((e) => e.startsWith('joined:')), b.evlog.join(','));
  check(S, 'enableShareTap / Button run userSetupComplete', a.evlog.includes('usc') && b.evlog.includes('usc'));
  const helpers = await B.evaluate((ids) => ({
    other: shareGuest(ids.a) && shareGuest(ids.a).name,
    self: shareGuest(ids.b) === me,
    missing: shareGuest('nobody'),
    withName: guestsWith('name').length,
    namedA: guestsWith('name', 'A').length,
    withNothing: guestsWith('nothing').length,
    status: shareStatusText(),
    json: JSON.stringify(guests),
  }), { a: a.id, b: b.id });
  check(S, 'shareGuest finds a guest, me, or null', helpers.other === 'A' && helpers.self && helpers.missing === null, JSON.stringify(helpers));
  check(S, 'guestsWith filters by field and value', helpers.withName === 1 && helpers.namedA === 1 && helpers.withNothing === 0, JSON.stringify(helpers));
  check(S, 'shareStatusText says the room and who is here', /In room .*1 other here/.test(helpers.status), helpers.status);
  check(S, 'guest ids show in JSON', helpers.json.includes(a.id), helpers.json);
  check(S, 'guests never includes yourself', !b.guests.some((g) => g.id === b.id) && !(await state(A)).guests.some((g) => g.id === a.id));

  await A.evaluate(() => { shared.score = 5; });
  check(S, 'shared set propagates', await waitFor(B, () => shared.score === 5));
  check(S, 'shareReceive fires on remote patch', (await state(B)).evlog.includes('recv:score'));
  await A.evaluate(() => { shared.nested.a = 2; });
  check(S, 'nested set propagates', await waitFor(B, () => shared.nested && shared.nested.a === 2));
  await A.evaluate(() => { delete shared.nested; });
  check(S, 'delete propagates', await waitFor(B, () => !('nested' in shared)));
  await B.evaluate(() => { shareSet('deep.path.x', 3); });
  check(S, 'shareSet dotted path propagates', await waitFor(A, () => shared.deep && shared.deep.path && shared.deep.path.x === 3));
  await A.evaluate(() => { me.x = 0.7; });
  check(S, 'me set shows in others\' guests', await waitFor(B, (id) => window.guests.some((g) => g.id === id && g.x === 0.7), 4000, a.id));
  await A.evaluate(() => { shareSetMe('pose.y', 2); });
  check(S, 'shareSetMe dotted path shows in guests', await waitFor(B, (id) => window.guests.some((g) => g.id === id && g.pose && g.pose.y === 2), 4000, a.id));

  await A.evaluate(() => { shareEmit('boom', { k: 1 }); });
  check(S, 'shareEmit reaches others', await waitFor(B, () => window.evlog.includes('event:boom:{"k":1}')));
  check(S, 'shareEvent gets the sender id', await waitFor(B, (id) => window.evlog.includes('eventFrom:boom:' + id), 4000, a.id));
  await A.waitForTimeout(200);
  check(S, 'shareEmit does not echo to sender', !(await state(A)).evlog.some((e) => e.startsWith('event:boom')));

  await A.evaluate(() => { shared.list = [1, 2]; });
  check(S, 'array assignment propagates', await waitFor(B, () => Array.isArray(shared.list) && shared.list.join() === '1,2'));
  await A.evaluate(() => { shared.list.push(3); });
  check(S, 'array push propagates', await waitFor(B, () => Array.isArray(shared.list) && shared.list.join() === '1,2,3', 2000));
  await A.evaluate(() => { shared.list[0] = 9; });
  check(S, 'array index set propagates', await waitFor(B, () => Array.isArray(shared.list) && shared.list[0] === 9, 2000));

  // A sketch that writes me.x every frame should not flood the worker while the value is unchanged.
  const before = await patchCount(A);
  await A.evaluate(() => { for (let i = 0; i < 10; i++) me.x = 0.25; });
  await A.waitForTimeout(300);
  const sent = (await patchCount(A)) - before;
  check(S, 'unchanged value is not re-sent', sent <= 1, `${sent} patches for 10 identical writes`);
  const beforeDrag = await patchCount(A);
  await A.evaluate(() => new Promise((resolve) => {
    let i = 0;
    const t = setInterval(() => { me.x = i / 100; me.y = 1 - i / 100; if (++i >= 60) { clearInterval(t); resolve(); } }, 16);
  }));
  await A.waitForTimeout(200);
  const dragFrames = (await patchCount(A)) - beforeDrag;
  check(S, 'per-frame drag is batched', dragFrames <= 30, `${dragFrames} frames for 120 writes in 1 s`);
  check(S, 'batched drag arrives intact', await waitFor(B, (id) => window.guests.some((g) => g.id === id && g.x === 59 / 100 && g.y === 1 - 59 / 100), 3000, a.id));

  // A client must not be able to reach Object.prototype on other phones.
  await B.evaluate(() => {
    _shareSocket.send(JSON.stringify({ type: 'patch', v: _SHARE_PROTOCOL_VERSION, scope: 'shared', path: '__proto__.polluted', value: 'yes' }));
  });
  await A.waitForTimeout(600);
  check(S, '__proto__ path cannot pollute other phones', !(await A.evaluate(() => ({}).polluted === 'yes')));
  check(S, 'a rejected write does not drop the connection', await B.evaluate(() => window.shareConnected && window.shareStatus === 'connected'));
  const jsonErr = await A.evaluate(() => { const r = shareSet('bad', () => 1); return r; });
  check(S, 'shareSet refuses a function value', jsonErr === false);

  // Something set before joining must survive the join.
  const C = await openClient(await newContext(browser, { touch: true }), {
    config: { host: HOST, room, me: { name: 'C' } },
    pre: `me.color = 'red';`,
  });
  await tapToJoin(C, 'tap', true);
  const c = await state(C);
  check(S, 'me set before joining survives the join', c.me.color === 'red', JSON.stringify(c.me));
  check(S, 'others see me set before joining', await waitFor(B, (id) => window.guests.some((g) => g.id === id && g.color === 'red'), 3000, c.id));

  // Reconnect: drop B's socket and let auto-reconnect bring it back with its state.
  await B.evaluate(() => { me.status = 'here'; });
  await waitFor(A, (id) => window.guests.some((g) => g.id === id && g.status === 'here'), 3000, b.id);
  await B.evaluate(() => { _shareSocket.close(4000, 'test drop'); });
  check(S, 'shareClosed fires on drop', await waitFor(B, () => window.evlog.includes('closed')));
  // The reconnect waits 1.5 s, so the page is out of the room right now.
  check(S, 'guests empties while out of the room', await B.evaluate(() => !window.shareConnected && window.guests.length === 0));
  check(S, 'auto-reconnects', await waitFor(B, () => window.shareConnected === true, 10000));
  b = await state(B);
  check(S, 'me survives reconnect', b.me.status === 'here' && b.me.name === 'B', JSON.stringify(b.me));
  check(S, 'shared survives reconnect', b.shared.score === 5, JSON.stringify(b.shared));
  check(S, 'guests fills again after rejoining', b.guests.length === 2, JSON.stringify(b.guests));

  // A phone that locks its screen leaves at once, and rejoins with its state when it wakes.
  const cId = (await state(C)).id;
  await setHidden(C, true);
  check(S, 'hidden phone disconnects', await waitFor(C, () => !window.shareConnected && window.shareStatus === 'idle', 3000));
  check(S, 'hidden phone leaves guests at once', await waitFor(B, (id) => !window.guests.some((g) => g.id === id), 3000, cId));
  check(S, 'shareLeft fires with the leaver\'s last me', await waitFor(B, (id) => window.evlog.includes('left:' + id + ':C'), 3000, cId));
  check(S, 'a hidden phone keeps no guests', (await C.evaluate(() => window.guests.length)) === 0);
  await C.waitForTimeout(2500);
  check(S, 'hidden phone does not auto-reconnect', !(await C.evaluate(() => window.shareConnected)));
  await setHidden(C, false);
  check(S, 'visible again: rejoins', await waitFor(C, () => window.shareConnected === true, 6000));
  check(S, 'visible again: me kept', (await state(C)).me.color === 'red');
  check(S, 'a desktop page stays in the room while hidden', await (async () => {
    await setHidden(B, true);
    await B.waitForTimeout(800);
    const still = await B.evaluate(() => window.shareConnected);
    await setHidden(B, false);
    return still;
  })());

  // Host handoff: the host leaves.
  await ctxA.close();
  check(S, 'host leaves: a remaining phone becomes host', await waitFor(B, () => window.shareIsHost === true, 6000)
    || await waitFor(C, () => window.shareIsHost === true, 1000));
  check(S, 'shareHostChanged(true) fires on the new host', (await state(B)).evlog.includes('host:true') || (await state(C)).evlog.includes('host:true'));
  check(S, 'exactly one host', (await B.evaluate(() => window.shareIsHost)) !== (await C.evaluate(() => window.shareIsHost)));

  // shareDisconnect empties guests and stops reconnecting.
  await B.evaluate(() => shareDisconnect());
  await B.waitForTimeout(2000);
  const bd = await state(B);
  check(S, 'shareDisconnect: idle, no guests, no reconnect', !bd.connected && bd.status === 'idle' && bd.guests.length === 0 && !bd.isHost, JSON.stringify(bd));
  check(S, 'no page errors', !B.errors.length && !C.errors.length, B.errors.concat(C.errors).join(' | '));
  await ctxB.close();
  await C.context().close();
}

// Two phones write the same key at nearly the same time; one is on a slow network.
async function concurrentWrites(browser) {
  const S = 'concurrent';
  const room = `conc-${RUN}`;
  const X = await openClient(await newContext(browser), { config: { host: HOST, room, shared: { color: 'none' } } });
  const Y = await openClient(await newContext(browser, { sendDelay: 300 }), { config: { host: HOST, room } });
  await tapToJoin(X);
  await tapToJoin(Y);
  await Y.waitForTimeout(700);
  await Y.evaluate(() => { shared.color = 'blue'; });
  await X.waitForTimeout(60);
  await X.evaluate(() => { shared.color = 'red'; });
  await X.waitForTimeout(1500);
  const Z = await openClient(await newContext(browser), { config: { host: HOST, room } });
  await tapToJoin(Z);
  const [x, y, z] = [await state(X), await state(Y), await state(Z)];
  check(S, 'all phones converge on the worker value', x.shared.color === z.shared.color && y.shared.color === z.shared.color,
    `X=${x.shared.color} Y=${y.shared.color} worker=${z.shared.color}`);
  await X.evaluate(() => { for (let i = 1; i <= 20; i++) shared.drag = i; });
  const seen = await X.evaluate(() => new Promise((resolve) => {
    const vals = [];
    const t = setInterval(() => vals.push(shared.drag), 10);
    setTimeout(() => { clearInterval(t); resolve(vals); }, 600);
  }));
  check(S, 'own writes are not rewound by echoes', seen.every((v) => v === 20), `saw ${[...new Set(seen)].join(',')}`);
  check(S, 'others get the final dragged value', await waitFor(Z, () => shared.drag === 20));
  for (const p of [X, Y, Z]) await p.context().close();
}

async function styles(browser) {
  const S = 'styles';
  for (const style of Object.keys(STYLES)) {
    const ctx = await newContext(browser, { touch: true });
    const p = await openClient(ctx, { style, config: { host: HOST, room: `style-${style}-${RUN}` } });
    const joined = await tapToJoin(p, style, true);
    await p.waitForTimeout(300);
    const s = await state(p);
    // (window.touches is not checked: three-phone's overlays stop the pointerup that lifts the
    // finger, for every enable* helper, not only Share. That is its own fix.)
    check(S, `${style}: joins and runs userSetupComplete`, joined && s.evlog.includes('usc') && !p.errors.length,
      `joined=${joined} usc=${s.evlog.includes('usc')} ${p.errors.join(' | ')}`);
    await ctx.close();
  }
  // 'share' with no shareSetup() says what is missing, and the other permissions still run.
  const ctx = await newContext(browser, { touch: true });
  const p = await ctx.newPage();
  p.cons = [];
  p.on('console', (m) => p.cons.push(m.type() + ': ' + m.text()));
  await route(p, html(`window.evlog=[]; function userSetupComplete(){ evlog.push('usc'); } enablePermissionsTap(['share'], 'join'); window.ready = true;`));
  await p.goto(ORIGIN + '/');
  await p.waitForSelector('#tapOverlay');
  await p.waitForTimeout(150);
  await p.touchscreen.tap(200, 400);
  await waitFor(p, () => evlog.includes('usc'), 3000);
  check(S, "'share' without shareSetup(): a console error and userSetupComplete still runs",
    p.cons.some((t) => /'share' in the permission list needs shareSetup\(\)/.test(t)) && (await p.evaluate(() => evlog.includes('usc'))),
    p.cons.slice(-3).join(' | '));
  await ctx.close();
}

async function joinLink(browser) {
  const S = 'join link';
  const q = `?shareHost=${encodeURIComponent(HOST)}&room=link-${RUN}&app=cls`;
  const p = await openClient(await newContext(browser), { query: q, config: { host: 'https://wrong.invalid', room: 'wrong' } });
  const joined = await tapToJoin(p);
  const s = await state(p);
  check(S, 'URL params override config', joined && s.room === `cls:link-${RUN}`, s.room);
  check(S, 'the console notes the ?room= override', p.cons.some((t) => /address has \?room=link-.*instead of room: 'wrong'/.test(t)), p.cons.filter((t) => /address/.test(t)).join(' | '));
  check(S, 'the console notes the ?shareHost= override', p.cons.some((t) => /address has \?shareHost=.*instead of the host/.test(t)));
  const url = await p.evaluate(() => getShareJoinUrl());
  const u = new URL(url);
  check(S, 'getShareJoinUrl carries host/room/app', u.searchParams.get('shareHost') === HOST && u.searchParams.get('room') === `link-${RUN}` && u.searchParams.get('app') === 'cls', url);
  check(S, 'isShareSupported() is true with WebSocket', await p.evaluate(() => isShareSupported() === true && window.shareSupported === true));
  await p.context().close();

  const bad = await openClient(await newContext(browser), { config: { host: 'http://127.0.0.1:1', room: 'nope' } });
  await tapToJoin(bad);
  const failed = await waitFor(bad, () => window.shareStatus === 'error' && window.shareConnected === false, 5000);
  check('errors', 'unreachable host reports error status', failed, await bad.evaluate(() => window.shareStatus + ' ' + window.shareError));
  const badText = await bad.evaluate(() => shareStatusText());
  check('errors', 'shareStatusText explains an unreachable host', /Cannot reach the room/.test(badText), badText);
  await bad.context().close();

  const none = await openClient(await newContext(browser), { config: { room: 'x' } });
  check('errors', 'shareSetup() with no host fails with a message', (await none.evaluate(() => window.setupResult)) === false
    && none.cons.some((t) => /shareSetup\(\) needs a host/.test(t)));
  await none.context().close();
}

async function wakeLock(browser) {
  const S = 'wake lock';
  const A = await openClient(await newContext(browser, { touch: true }), { config: { host: HOST, room: `wake-${RUN}` } });
  check(S, 'no wake lock before joining', (await state(A)).wakeRequests === 0 && (await state(A)).awake === false);
  await tapToJoin(A, 'tap', true);
  let a = await state(A);
  check(S, 'joining asks for a screen wake lock', a.wakeRequests >= 1 && a.awake === true, `requests=${a.wakeRequests} awake=${a.awake}`);
  // The browser drops the lock when the page is hidden; it is asked for again when it is back.
  await A.evaluate(() => window.__wake.held && window.__wake.held.release());
  check(S, 'screenAwake goes false when the browser drops the lock', await waitFor(A, () => window.screenAwake === false, 1000));
  const n = a.wakeRequests;
  await setHidden(A, true);
  await setHidden(A, false);
  check(S, 'asked for again when the page comes back', await waitFor(A, (k) => window.__wake.requests > k && window.screenAwake === true, 4000, n));
  await A.context().close();

  const P = await openClient(await newContext(browser, { touch: true }), { style: 'perms', config: { host: HOST, room: `wake-${RUN}` } });
  await tapToJoin(P, 'perms', true);
  check(S, "'share' in enablePermissionsTap asks for it in the tap", (await state(P)).awake === true);
  await P.context().close();

  const O = await openClient(await newContext(browser, { touch: true }), { config: { host: HOST, room: `wake-${RUN}`, keepScreenOn: false } });
  await tapToJoin(O, 'tap', true);
  check(S, 'shareSetup({ keepScreenOn: false }) leaves the screen alone', (await state(O)).wakeRequests === 0);
  const r = await O.evaluate(async () => {
    const on = await keepScreenOn();
    const awakeOn = window.screenAwake;
    const off = await keepScreenOn(false);
    return { on, awakeOn, off, awakeOff: window.screenAwake, released: window.__wake.held.released };
  });
  check(S, 'keepScreenOn() / keepScreenOn(false) on their own', r.on === true && r.awakeOn === true && r.off === false && r.awakeOff === false && r.released, JSON.stringify(r));
  await O.context().close();

  // A browser with no Wake Lock API: joining still works and nothing throws.
  const ctx = await newContext(browser);
  await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'wakeLock', { configurable: true, get: () => undefined }); });
  const N = await openClient(ctx, { config: { host: HOST, room: `wake-${RUN}` } });
  const joined = await tapToJoin(N);
  check(S, 'no Wake Lock API: joins anyway, screenAwake false', joined && (await state(N)).awake === false && !N.errors.length);
  check(S, 'no Wake Lock API: keepScreenOn() resolves false', (await N.evaluate(() => keepScreenOn())) === false);
  await ctx.close();
}

async function keep(browser) {
  const cfg = (room, extra = {}) => Object.assign({ host: HOST, room: `${room}-${RUN}` }, extra);
  let S = 'keep';
  let A = await openPhone(browser, cfg('k1', { shared: { marks: {} }, keep: { expire: 60000 } }));
  check(S, 'shareKept is false before joining', (await state(A)).kept === false && (await state(A)).keptUntil === 0);
  check(S, 'phone A joins', await join(A));
  let a = await state(A);
  check(S, 'shareKept is true when the server keeps the room', a.kept === true);
  check(S, 'shareKeptUntil is about 60 s ahead', a.keptUntil > a.now + 55000 && a.keptUntil <= a.now + 60500, a.keptUntil - a.now);
  await A.evaluate(() => { shared.hello = 'wall'; shared.marks.m1 = { x: 1 }; });
  check(S, 'the write is applied by the server', await settled(A));
  check(S, 'a change moves shareKeptUntil forward', await waitFor(A, (t) => window.shareKeptUntil > t, 4000, a.keptUntil));
  await leave(A);
  await sleep(500);
  let B = await openPhone(browser, cfg('k1', { shared: { other: true } }));
  await join(B);
  let b = await state(B);
  check(S, 'a later phone sees what A left', eq(b.shared, { marks: { m1: { x: 1 } }, hello: 'wall' }), JSON.stringify(b.shared));
  check(S, 'and shareKept is true without asking', b.kept === true && b.keptUntil > b.now);
  await leave(B);

  A = await openPhone(browser, cfg('k2', { shared: { marks: {} } }));
  await join(A);
  await A.evaluate(() => { shared.hello = 'wall'; });
  await settled(A);
  check(S, 'without keep, shareKept stays false', (await state(A)).kept === false && (await state(A)).keptUntil === 0);
  await leave(A);
  await sleep(500);
  B = await openPhone(browser, cfg('k2', { shared: { marks: {} } }));
  await join(B);
  check(S, 'without keep the room is empty for the next phone', eq((await state(B)).shared, { marks: {} }), JSON.stringify((await state(B)).shared));
  await leave(B);

  S = 'shareClear';
  A = await openPhone(browser, cfg('k3', { shared: { marks: {} }, keep: '1h' }));
  B = await openPhone(browser, cfg('k3', { shared: { marks: {} } }));
  await join(A);
  await join(B);
  a = await state(A);
  check(S, "keep: '1h' is read as an hour", a.kept && a.keptUntil - a.now > 59 * 60000 && a.keptUntil - a.now <= 3600000, a.keptUntil - a.now);
  await A.evaluate(() => { shared.marks.a = 1; });
  await B.evaluate(() => { shared.marks.b = 2; });
  check(S, 'both phones see both marks', await waitFor(A, () => shared.marks.a === 1 && shared.marks.b === 2)
    && await waitFor(B, () => shared.marks.a === 1 && shared.marks.b === 2));
  check(S, 'shareClear() returns true while connected', (await B.evaluate(() => shareClear())) === true);
  check(S, 'it wipes the room for the other phone', await waitFor(A, () => Object.keys(shared.marks).length === 0 && Object.keys(shared).length === 1));
  check(S, 'and for the phone that called it', await waitFor(B, () => Object.keys(shared.marks).length === 0 && Object.keys(shared).length === 1));
  await A.evaluate(() => { shareClear(); shared.after = 1; });
  check(S, 'a write made just after shareClear() stays', await waitFor(B, () => shared.after === 1, 3000) && await waitFor(A, () => shared.after === 1, 3000));
  await leave(A);
  const notConnected = await B.evaluate(() => { shareDisconnect(); return shareClear(); });
  check(S, 'shareClear() returns false when not connected', notConnected === false);
  await leave(B);

  S = 'keep options';
  A = await openPhone(browser, cfg('k4', { keep: 'a week' }));
  check(S, 'a bad keep value fails shareSetup() with a message', (await A.evaluate(() => window.setupResult)) === false
    && A.cons.some((t) => /^error: .*keep must be/.test(t)), A.cons.slice(-2).join(' | '));
  await leave(A);
  A = await openPhone(browser, cfg('k5', { keep: '90d' }));
  await join(A);
  a = await state(A);
  check(S, 'over 30 days is cut to 30 days, with a console note', a.keptUntil - a.now > 29.9 * DAY && a.keptUntil - a.now <= 30 * DAY && A.cons.some((t) => /at most 30 days/.test(t)));
  await leave(A);
  A = await openPhone(browser, cfg('k6'));
  await join(A);
  B = await openPhone(browser, cfg('k6', { keep: true }));
  await join(B);
  check(S, 'asking for keep in an open room without it: shareKept false, console warning',
    (await state(B)).kept === false && B.cons.some((t) => /not kept/.test(t)));
  await leave(A);
  await leave(B);
}

async function quiet(browser) {
  const cfg = (room, extra = {}) => Object.assign({ host: HOST, room: `${room}-${RUN}` }, extra);
  const S = 'quiet';
  const bad = await openPhone(browser, cfg('q0', { quiet: 'yes' }));
  check(S, "quiet: 'yes' fails shareSetup() with a message", (await bad.evaluate(() => window.setupResult)) === false
    && bad.cons.some((t) => /^error: .*quiet must be true or false/.test(t)));
  await leave(bad);

  const P = await openPhone(browser, cfg('q1', { shared: { average: 0 }, me: { role: 'projector' } }));
  const N = await openPhone(browser, cfg('q1', { me: { role: 'phone', name: 'plain' } }));
  const Q = await openPhone(browser, cfg('q1', { me: { role: 'phone', name: 'q' }, quiet: true }));
  check(S, 'shareQuiet is false before joining', (await state(Q)).quiet === false);
  for (const p of [P, N, Q]) await join(p);
  check(S, 'only the quiet phone has shareQuiet', (await state(P)).quiet === false && (await state(N)).quiet === false && (await state(Q)).quiet === true);
  check(S, "a quiet phone's guests lists everyone else, with roles", await waitFor(Q, () => guests.length === 2 && guestsWith('role', 'phone').length === 1 && guestsWith('role', 'projector').length === 1));
  const nId = await N.evaluate(() => shareClientId);
  await N.evaluate(() => { me.x = 0.25; });
  check(S, "the projector sees a plain phone's value live", await waitFor(P, (id) => { const g = shareGuest(id); return g && g.x === 0.25; }, 4000, nId));
  await sleep(500);
  check(S, 'the quiet phone does not', (await Q.evaluate((id) => shareGuest(id).x, nId)) === undefined);
  check(S, 'shareReceive() never ran for a me change on the quiet phone', !(await state(Q)).evlog.includes('recv:x'));
  await Q.evaluate(() => { me.x = 0.1; });
  const qId = await Q.evaluate(() => shareClientId);
  check(S, "a quiet phone's own value reaches the projector", await waitFor(P, (id) => { const g = shareGuest(id); return g && g.x === 0.1; }, 4000, qId));
  await P.evaluate(() => { shared.average = 0.6; shareEmit('wave', { n: 1 }); });
  check(S, 'shared and events still reach the quiet phone', await waitFor(Q, () => shared.average === 0.6 && evlog.includes('event:wave:{"n":1}')));
  await Q.evaluate(() => shareDisconnect());
  check(S, 'shareQuiet is false again after shareDisconnect()', (await state(Q)).quiet === false);
  check(S, 'no page errors', ![P, N, Q].some((p) => p.errors.length));
  for (const p of [P, N, Q]) await leave(p);
}

async function examples(browser) {
  const dir = 'examples/Phone Sensor Examples/share';
  for (const name of fs.readdirSync(path.join(__dirname, dir)).sort()) {
    const S = 'example';
    const q = `?shareHost=${encodeURIComponent(HOST)}&room=ex-${name}-${RUN}`;
    const url = `${ORIGIN}/${dir.split('/').map(encodeURIComponent).join('/')}/${name}/index.html${q}`;
    const phones = [];
    for (let i = 0; i < 2; i++) {
      const ctx = await newContext(browser, { touch: true });
      const p = await ctx.newPage();
      p.errors = [];
      p.on('pageerror', (e) => p.errors.push(e.message));
      await route(p);
      await p.goto(url);
      await waitFor(p, () => typeof window.shareStatus === 'string' && document.querySelector('canvas'), 20000);
      await p.waitForTimeout(400);
      const overlay = await p.$('#tapOverlay,#permissionButton,#permissionBanner');
      if (overlay) {
        const box = await overlay.boundingBox();
        await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await p.touchscreen.tap(200, 400);
      }
      await waitFor(p, () => window.shareConnected === true, 8000);
      phones.push(p);
    }
    const [p1, p2] = phones;
    const xBefore = await p1.evaluate(() => me.x);
    const box = await p1.locator('canvas').boundingBox();
    await p1.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * 0.7);
    await p1.waitForTimeout(800);
    const s1 = await state(p1);
    const s2 = await state(p2);
    const sees = s2.guests.some((g) => g.id === s1.id);
    check(S, `${name}: two phones join and see each other`, s1.connected && s2.connected && sees && !p1.errors.length && !p2.errors.length,
      `c=${s1.connected}/${s2.connected} guests=${s2.guests.length} ${p1.errors.concat(p2.errors).join(' | ')}`);
    check(S, `${name}: a tap left of center on the floor moves that piece`, s1.me.x !== xBefore && s1.me.x < 0, `${xBefore} -> ${s1.me.x}`);
    check(S, `${name}: and the other phone sees it`, await waitFor(p2, (a) => {
      const g = shareGuest(a.id); return g && g.x === a.x && g.z === a.z;
    }, 4000, { id: s1.id, x: s1.me.x, z: s1.me.z }), JSON.stringify(s2.guests));
    await p2.evaluate(() => { shared.hue = 0.1; });
    check(S, `${name}: shared.hue reaches the first phone`, await waitFor(p1, () => shared.hue === 0.1));
    await p2.evaluate(() => {
      const sketchEvent = window.shareEvent;
      window.shareEvent = (n, d, from) => { window.__pulseFrom = from; sketchEvent(n, d, from); };
    });
    await p1.evaluate(() => deviceShaken());
    check(S, `${name}: a shake reaches the other phone with the sender id`, await waitFor(p2, (id) => {
      return window.__pulseFrom === id;
    }, 4000, s1.id));
    for (const p of phones) await p.context().close();
  }
}

(async () => {
  const worker = startWorker(SERVER_DIR, PORT);
  let browser;
  const stop = () => { try { process.kill(-worker.pid); } catch (e) { /* already gone */ } };
  process.on('exit', stop);
  try {
    await waitForHttp(HOST + '/', 60000);
    // The test pages come from Playwright's router, so Chromium treats them as public and
    // blocks their WebSocket to 127.0.0.1. Real sketches reach a public workers.dev URL.
    browser = await chromium.launch({ args: ['--disable-features=LocalNetworkAccessChecks'] });
    const only = process.env.SHARE_E2E_ONLY ? process.env.SHARE_E2E_ONLY.split(',') : null;
    const scenarios = { coreSync, concurrentWrites, styles, joinLink, wakeLock, keep, quiet, examples };
    for (const [name, fn] of Object.entries(scenarios)) {
      if (!only || only.includes(name)) await fn(browser);
    }
  } catch (err) {
    console.error(err);
    check('harness', 'ran to completion', false, err.message);
    if (process.env.SHARE_E2E_LOG) console.error(worker.getLog());
  } finally {
    if (browser) await browser.close();
    stop();
  }
  console.table(rows);
  const failed = rows.filter((r) => !r.ok);
  console.log(failed.length ? `${failed.length} of ${rows.length} FAILED` : `All ${rows.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
