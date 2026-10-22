/**
 * Shared bits for the Share tests. three-phone has no worker of its own: Share talks to
 * p5-phone's companion worker (p5-phone/companion/P5PhoneShare), so the tests use that
 * folder in a p5-phone checkout instead of a copy.
 *
 * Where the worker is, in this order:
 *   SHARE_SERVER_DIR=/path/to/P5PhoneShare
 *   P5_PHONE_DIR=/path/to/p5-phone            (uses companion/P5PhoneShare inside it)
 *   a p5-phone folder next to this repo or next to any folder above it
 *     (../p5-phone from a normal checkout, and also from a .claude/worktrees/<name> worktree)
 *
 * The e2e tests need Playwright. three-phone does not install it: it is taken from this
 * repo's node_modules if there, otherwise from the p5-phone checkout's.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

function findShareServerDir() {
  const ok = (dir) => dir && fs.existsSync(path.join(dir, 'wrangler.jsonc'));
  if (process.env.SHARE_SERVER_DIR) {
    const dir = path.resolve(process.env.SHARE_SERVER_DIR);
    if (!ok(dir)) throw new Error('SHARE_SERVER_DIR has no wrangler.jsonc: ' + dir);
    return dir;
  }
  if (process.env.P5_PHONE_DIR) {
    const dir = path.resolve(process.env.P5_PHONE_DIR, 'companion', 'P5PhoneShare');
    if (!ok(dir)) throw new Error('P5_PHONE_DIR has no companion/P5PhoneShare: ' + dir);
    return dir;
  }
  let cur = __dirname;
  for (;;) {
    const dir = path.join(path.dirname(cur), 'p5-phone', 'companion', 'P5PhoneShare');
    if (ok(dir)) return dir;
    const up = path.dirname(cur);
    if (up === cur) return null;
    cur = up;
  }
}

function loadPlaywright(serverDir) {
  try {
    return require('playwright');
  } catch (e) {
    const p5dir = path.resolve(serverDir, '..', '..');
    return require(path.join(p5dir, 'node_modules', 'playwright'));
  }
}

function waitForHttp(url, ms) {
  const end = Date.now() + ms;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      http.get(url, (res) => { res.resume(); resolve(); }).on('error', () => {
        if (Date.now() > end) reject(new Error('worker did not start: ' + url));
        else setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

function startWorker(serverDir, port) {
  const child = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1'], {
    cwd: serverDir,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  child.getLog = () => log;
  return child;
}

module.exports = { findShareServerDir, loadPlaywright, waitForHttp, startWorker };
