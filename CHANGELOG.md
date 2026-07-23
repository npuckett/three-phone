# Changelog

All notable changes to three-phone are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Project scaffold: `package.json` (npm name `three-phone`), MIT `LICENSE`, CI and
  GitHub Pages workflows, build tooling (terser), and a library shell at
  `src/three-phone.js`.
- Companion-library positioning against [p5-phone](https://github.com/npuckett/p5-phone):
  same permission model, same sensor API names, three.js-native rendering.

### Notes
- `three` is an **optional** peer dependency — the library only touches `window.THREE`
  when its three.js helpers are called, so permission/sensor/hardware features work with
  or without three.js present.
- Examples pin three.js `0.185.1` via import map.

## [0.1.0] - Unreleased
- Initial scaffold.
