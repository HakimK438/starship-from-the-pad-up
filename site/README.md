# Starship, from the pad up

Frontend-only 3D learning site (three.js, no build step, no backend).

## Run
Double-click `start.bat` (needs Python), or run `python -m http.server 8123` in this folder and open http://localhost:8123.
ES modules do not load from `file://`, so a local server is required.
To publish, upload only this `site/` folder (any static host).

## Use
- Scroll to fly the whole flight. Top switch: General / Intermediate / Detail.
- "Watch the whole flight" (first screen) auto-plays everything; "Ignite", "Play re-entry", "Play booster catch" play single chapters. Any scroll/touch/key stops auto-play.
- Chapter 2-4: click the labels on the rocket. Chapter 10: change the settings and press Run flight.
- Sound (synthesised rumble) is off until you press it. Graphics: auto / high / medium / low.
- Debug a scene: `?T=6.3` (chapter 6, 30%), `?depth=detail`, `?q=low`.

## Files
`js/sim.js` ascent physics (shared by the simulator and the telemetry strip), `js/director.js` scroll-to-scene mapping,
`js/world.js` sky/terrain/Earth/pad/tower, `js/vehicle.js` Starship model, `js/fx.js` plume/steam/plasma,
`js/content.js` all text (3 depths), `js/widgets.js` interactive widgets. Three.js is vendored in `vendor/` (r170).
