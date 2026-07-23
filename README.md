# three-phone

**Simplified mobile hardware access for [three.js](https://threejs.org/).** A companion to
[p5-phone](https://github.com/npuckett/p5-phone) — same permission model, same sensor API
names, redesigned to drive real 3D scenes.

Point your phone's motion sensors, touch, microphone, camera, GPS, NFC, Bluetooth, torch,
and vibration at a WebGL scene without wrestling with iOS permission prompts, gesture
locking, or `DeviceOrientationEvent` quirks.

> 🚧 **Work in progress.** The library and examples are being built out commit by commit.
> See [CHANGELOG.md](CHANGELOG.md) for status.

## Quick start

three-phone loads as a plain `<script>` and exposes global functions, exactly like p5-phone.
three.js is loaded via a standard import map; a tiny loader module makes `THREE` global so
your `sketch.js` stays a beginner-friendly non-module script:

```html
<!-- three-phone: classic script, exposes window globals -->
<script src="https://cdn.jsdelivr.net/npm/three-phone@0.1.0/dist/three-phone.min.js"></script>

<!-- three.js via import map -->
<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/" } }
</script>

<!-- loader: expose THREE globally, then run your sketch -->
<script type="module">
  import * as THREE from 'three';
  window.THREE = THREE;
  const s = document.createElement('script');
  s.src = 'sketch.js';
  document.body.appendChild(s);
</script>
```

```js
// sketch.js
function setup() {
  // create your renderer/scene/camera here
  showDebug();
  enableGyroTap();   // tap the screen to grant motion permission (iOS)
  lockGestures();    // stop pull-to-refresh, pinch-zoom, etc.
}
```

## Companion library

three-phone mirrors [**p5-phone**](https://npuckett.github.io/p5-phone/) for the p5.js
world. The two documentation sites cross-link example by example.

## License

MIT — see [LICENSE](LICENSE).
