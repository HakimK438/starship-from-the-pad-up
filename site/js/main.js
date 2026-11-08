import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld } from './world.js';
import { createVehicle } from './vehicle.js';
import { fxShared, createPlume, createSteam, createTrail, createDeluge, createPlasma, createFire } from './fx.js';
import { evaluate, attitude, CHAPTERS, TABLE_Y } from './director.js';
import { CONTENT, PARTS } from './content.js';
import { initWidgets } from './widgets.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const q = new URLSearchParams(location.search);
const safe = (f) => { try { return f(); } catch { return null; } };

// ------------------------------------------------ renderer
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.78;
renderer.localClippingEnabled = true;
renderer.autoClear = false;
const world = createWorld(renderer);
const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 60000);
const farCam = new THREE.PerspectiveCamera(34, 1, 800, 5e7);

const vehicle = createVehicle();
world.near.add(vehicle.root);
// sea-level plumes run several vehicle diameters before they mix out (Sutton Ch. 20)
const plumeB = createPlume(vehicle.bNozzles, { r0: 0.66, baseLen: 62 });
const plumeS = createPlume(vehicle.sNozzles.map((v, i) => v), { r0: 0.7, baseLen: 40 });
vehicle.booster.add(plumeB.mesh); vehicle.ship.add(plumeS.mesh);
const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.7);   // flame deflector plate: cut plumes at the ground
[plumeB, plumeS].forEach((p) => { p.mesh.material.clippingPlanes = [clip]; });
const steam = createSteam({ count: 900, origin: new THREE.Vector3(0, 5, 0) });
const steam2 = createSteam({ count: 500, origin: new THREE.Vector3(0, 4, 0), size: 0.7, spread: 0.8 });
const trail = createTrail(); const deluge = createDeluge(); const fire = createFire();
world.near.add(steam.points, steam2.points, trail.points, deluge.points, fire.points);
// plasma shell: ship nose profile inflated
const plasmaGeo = (() => {                         // shock layer follows the hull: rounded tail, cylinder, ogive nose
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push(new THREE.Vector2(5.4 * Math.sin(a) + 0.01, -1.2 + 2.2 * (1 - Math.cos(a)))); }
  for (let i = 1; i <= 16; i++) { const t = i / 16; const y = 1 + t * 37; pts.push(new THREE.Vector2(5.4, y)); }
  for (let i = 1; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(Math.max(0.01, 5.4 * Math.sqrt(1 - t * t)), 38 + t * 13.5)); }
  return new THREE.LatheGeometry(pts, 48);
})();
const plasma = createPlasma(plasmaGeo); vehicle.ship.add(plasma.mesh);
// ground impact glow where the plume meets the plate
const impact = new THREE.Mesh(new THREE.CircleGeometry(34, 48), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uI: { value: 0 } },
  vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform float uI; varying vec2 vU; void main(){ float d = length(vU)/34.0; float a = pow(max(1.0-d, 0.0), 2.2)*uI; gl_FragColor = vec4(vec3(1.0,0.62,0.22)*1.6*a, a);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }',
}));
impact.rotation.x = -Math.PI / 2; impact.position.y = 0.9; impact.renderOrder = 8; impact.visible = false; world.near.add(impact);

// height ruler for the Scale chapter
const ruler = new THREE.Group(); world.near.add(ruler); ruler.visible = false;
{
  const mat = new THREE.LineBasicMaterial({ color: 0x9aa8ff, transparent: true });
  const pts = [new THREE.Vector3(10, TABLE_Y, 0), new THREE.Vector3(10, TABLE_Y + 121, 0)];
  for (let m = 0; m <= 120; m += 10) { const y = TABLE_Y + m, w = m % 20 === 0 ? 3 : 1.5; pts.push(new THREE.Vector3(10, y, 0), new THREE.Vector3(10 - w, y, 0)); }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const idx = [0, 1]; for (let i = 2; i < pts.length; i += 2) idx.push(i, i + 1);
  g.setIndex(idx); ruler.add(new THREE.LineSegments(g, mat));
  for (let m = 0; m <= 120; m += 20) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 48; const x = c.getContext('2d');
    x.font = '600 30px Inter, sans-serif'; x.fillStyle = '#cdd5ff'; x.fillText(m + ' m', 4, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
    sp.scale.set(10, 3.75, 1); sp.position.set(17, TABLE_Y + m, 0); ruler.add(sp);
  }
}

// ------------------------------------------------ quality / composer
let quality = q.get('q') || safe(() => localStorage.getItem('sb-quality')) || 'auto';
let composer = null, bloom = null, dpr = 1, W = 1, H = 1, lastTw = -1, lastEnv = 0;
function setupComposer() {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  const rp1 = new RenderPass(world.far, farCam); rp1.clear = true;
  const rp2 = new RenderPass(world.near, camera); rp2.clear = false; rp2.clearDepth = true;
  bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.3, 0.5, 1.05);
  composer.addPass(rp1); composer.addPass(rp2); composer.addPass(bloom); composer.addPass(new OutputPass());
}
function applyQuality() {
  const eff = quality === 'auto' ? 'high' : quality;
  dpr = eff === 'high' ? Math.min(devicePixelRatio, 1.75) : eff === 'medium' ? Math.min(devicePixelRatio, 1.25) : 1;
  renderer.setPixelRatio(dpr);
  if (eff === 'high') { if (!composer) setupComposer(); } else { composer = null; }
  resize();
  steam.points.material.uniforms.uSize.value = eff === 'low' ? 0.8 : 1;
  const b = $('#quality'); if (b) b.textContent = 'Graphics: ' + quality;
}
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = farCam.aspect = W / H;
  if (composer) { composer.setSize(W, H); composer.setPixelRatio(dpr); }
  fxShared.uScale.value = (H * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  measure();
}
addEventListener('resize', resize);

// ------------------------------------------------ build the story DOM
const story = $('#story');
CONTENT.forEach((ch, i) => {
  const s = document.createElement('section');
  s.className = 'chapter'; s.id = ch.id; s.dataset.i = i; s.style.setProperty('--run', ch.run || '170vh');
  s.innerHTML = `<article class="panel" aria-labelledby="h-${ch.id}">
    ${i ? `<p class="kicker"><span>Chapter ${i} of ${CONTENT.length - 1}</span><b>${ch.when || ''}</b></p>` : ''}
    ${ch.title ? `<h2 id="h-${ch.id}">${ch.title}</h2>` : ''}
    ${ch.sub ? `<p class="sub">${ch.sub}</p>` : ''}
    ${['general', 'intermediate', 'detail'].map((d) => `<div class="body d-${d}">${ch[d]}</div>`).join('')}
    ${ch.action ? `<button class="action" data-action="${ch.action[0]}">${ch.action[1]}</button>` : ''}
    <nav aria-label="Chapter navigation"><button data-go="${i - 1}" ${i ? '' : 'disabled'}>← ${i ? CONTENT[i - 1].short : ''}</button><button data-go="${i + 1}" ${i < CONTENT.length - 1 ? '' : 'disabled'}>${i < CONTENT.length - 1 ? CONTENT[i + 1].short : ''} →</button></nav>
  </article>`;
  story.appendChild(s);
});
const rail = $('#rail');
CONTENT.forEach((ch, i) => {
  const b = document.createElement('button'); b.className = 'tick'; b.dataset.i = i; b.setAttribute('aria-label', ch.title);
  b.innerHTML = `<span>${ch.short}</span>`; b.onclick = () => jumpTo(i); rail.appendChild(b);
});

// ------------------------------------------------ depth switch
let depth = q.get('depth') || safe(() => localStorage.getItem('sb-depth')) || 'general';
function setDepth(d, keep = true) {
  const T = keep ? currentT() : null;
  depth = d; document.documentElement.dataset.depth = d;
  safe(() => localStorage.setItem('sb-depth', d));
  $$('.depth button').forEach((b) => b.setAttribute('aria-checked', b.dataset.d === d));
  initWidgets(document, d);
  measure();
  if (T !== null) scrollToT(T);
}
$$('.depth button').forEach((b) => b.onclick = () => setDepth(b.dataset.d));

// ------------------------------------------------ scroll <-> T
let tops = [], heights = [];
function measure() {
  const secs = $$('.chapter');
  tops = secs.map((s) => s.offsetTop); heights = secs.map((s) => s.offsetHeight);
}
function currentT() {
  const y = scrollY;
  let c = 0; for (let i = 0; i < tops.length; i++) if (y >= tops[i] - 1) c = i;
  return c + Math.min(1, Math.max(0, (y - tops[c]) / (heights[c] || 1)));
}
function scrollToT(T) {
  const c = Math.min(tops.length - 1, Math.floor(T)); window.scrollTo(0, tops[c] + (T - c) * heights[c]);
}
function jumpTo(i) { cancelAuto(); window.scrollTo({ top: tops[i], behavior: 'smooth' }); }

// auto-play: animate T with a per-chapter pace, scroll follows. Any user input cancels it.
let auto = null;
const PACE = [1.6, 1.6, 2, 2, 2, 9, 15, 20, 13, 16, 2.5, 26, 18, 4];       // seconds per chapter
function playFrom(T0, T1) {
  cancelAuto();
  auto = { T: T0, T1 };
  $('#stop').hidden = false;
}
function cancelAuto() { auto = null; $('#stop').hidden = true; }
['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((e) => addEventListener(e, (ev) => { if (auto && !(ev.target.id === 'stop')) cancelAuto(); }, { passive: true }));
$('#stop').onclick = cancelAuto;
// notes on/off, chapter buttons and keyboard: ←/→ chapters, H hides the notes to see the scene
function toggleNotes(force) {
  const off = force ?? !document.documentElement.classList.contains('notes-off');
  document.documentElement.classList.toggle('notes-off', off);
  $('#notes').textContent = off ? 'Show notes' : 'Hide notes';
}
$('#notes').onclick = () => toggleNotes();
addEventListener('keydown', (e) => {
  if (e.target.closest('input,select,textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
  const c = Math.floor(currentT() + 1e-3);
  if (e.key === 'ArrowRight' || e.key === 'n') { e.preventDefault(); jumpTo(Math.min(CONTENT.length - 1, c + 1)); }
  if (e.key === 'ArrowLeft' || e.key === 'p') { e.preventDefault(); jumpTo(Math.max(0, c - 1)); }
  if (e.key === 'h') toggleNotes();
});
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]'); if (g) { jumpTo(+g.dataset.go); return; }
  const a = e.target.closest('[data-action]'); if (!a) return;
  const k = a.dataset.action;
  if (k === 'begin') jumpTo(1);
  if (k === 'watch') { window.scrollTo(0, 0); playFrom(0, CONTENT.length - 0.001); }
  if (k === 'ignite') playFrom(5, 9.999);
  if (k === 'reentry') playFrom(11, 12.999);
  if (k === 'catch') playFrom(12, 13.999);
});

// ------------------------------------------------ labels (anchored to 3D parts)
const labelsEl = $('#labels'); const card = $('#partcard');
const labelIds = { 2: ['nose', 'headerTanks', 'shipTanks', 'fwdflap', 'aftflap', 'shipRaptors', 'hotstage', 'gridfin', 'boosterLOX', 'boosterCH4', 'boosterRaptors'], 3: ['headerTanks', 'shipTanks', 'boosterLOX', 'boosterCH4', 'downcomer'], 4: ['boosterRaptors'] };
const labelEls = {};
Object.keys(PARTS).forEach((id) => {
  const b = document.createElement('button'); b.className = 'label'; b.textContent = PARTS[id].name; b.hidden = true;
  b.onclick = () => { openCard(id); }; labelsEl.appendChild(b); labelEls[id] = b;
});
function openCard(id) {
  const p = PARTS[id]; if (!p) return;
  card.innerHTML = `<button class="x" aria-label="Close">×</button><h3>${p.name}</h3><p>${p[depth] || p.general}</p>`;
  card.hidden = false; $('.x', card).onclick = () => (card.hidden = true);
}
const tmpV = new THREE.Vector3();
function updateLabels(S) {
  const ids = S.labels ? (labelIds[S.chapter] || []) : [];
  for (const id in labelEls) {
    const el = labelEls[id], on = ids.includes(id);
    if (!on) { el.hidden = true; continue; }
    vehicle.partWorld(id, tmpV); const w = tmpV.clone(); w.project(camera);
    const vis = w.z < 1 && Math.abs(w.x) < 1.05 && Math.abs(w.y) < 1.05;
    el.hidden = !vis;
    if (vis) { const x = (w.x * 0.5 + 0.5) * W + (W > 980 ? 0 : 0), y = (-w.y * 0.5 + 0.5) * H; el.style.transform = `translate(${x + 14}px,${y - 12}px)`; }
  }
  if (!S.labels && !card.hidden) card.hidden = true;
}

// ------------------------------------------------ audio (synthesised rumble, off by default)
let audio = null;
function toggleSound() {
  if (!audio) {
    // Three layers of real rocket noise, synthesised (no audio files to download):
    //  rumble: brown noise below ~150 Hz that you feel more than hear
    //  roar:   broadband turbulent-mixing noise, strongest a few hundred Hz
    //  crackle: sparse, sharp, one-sided pressure spikes from shocklets in the supersonic jet,
    //           the "tearing canvas" sound of big launches
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const sr = ac.sampleRate, len = sr * 6;
    const stereo = (fill) => { const b = ac.createBuffer(2, len, sr); for (let c = 0; c < 2; c++) fill(b.getChannelData(c)); return b; };
    const brown = stereo((d) => { let l = 0; for (let i = 0; i < len; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
    const pink = stereo((d) => { let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + 0.029 * w; b1 = 0.985 * b1 + 0.032 * w; b2 = 0.95 * b2 + 0.048 * w; d[i] = (b0 + b1 + b2 + 0.02 * w) * 1.6; } });
    const crk = stereo((d) => { let e = 0; for (let i = 0; i < len; i++) { if (Math.random() < 90 / sr) e = 0.4 + Math.random() * 0.9; d[i] = e * (Math.random() < 0.5 ? 1 : 0.35) + (Math.random() * 2 - 1) * 0.03; e *= 0.93; } });
    const loop = (buf) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 5); return s; };
    const sat = ac.createWaveShaper(); { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); } sat.curve = c; }
    const master = ac.createGain(); master.gain.value = 0.8;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;     // distance / air absorption
    const g = ac.createGain(), g2 = ac.createGain(), g3 = ac.createGain(); g.gain.value = g2.gain.value = g3.gain.value = 0;
    const rlp = ac.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 140;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.5;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    loop(brown).connect(rlp).connect(g).connect(sat);
    loop(pink).connect(bp).connect(g3).connect(sat);
    loop(crk).connect(hp).connect(g2).connect(sat);
    sat.connect(lp).connect(master).connect(ac.destination);
    audio = { ac, g, g2, g3, lp, on: true };
  } else { audio.on = !audio.on; }
  if (audio.ac.state === 'suspended') audio.ac.resume();
  $('#sound').textContent = 'Sound: ' + (audio.on ? 'on' : 'off');
}
$('#sound').onclick = toggleSound;
$('#quality').onclick = () => { quality = { auto: 'high', high: 'medium', medium: 'low', low: 'auto' }[quality]; safe(() => localStorage.setItem('sb-quality', quality)); applyQuality(); };

// ------------------------------------------------ frame loop
const hud = { event: $('#event'), phase: $('#t-phase'), time: $('#t-time'), alt: $('#t-alt'), spd: $('#t-spd'), q: $('#t-q'), qk: $('#t-qk'), thr: $('#t-thr'), mass: $('#t-mass') };
const fmtAlt = (km) => km < 1 ? Math.round(km * 1000) + ' m' : km < 100 ? km.toFixed(1) + ' km' : Math.round(km) + ' km';
const fmtSpd = (v) => v < 1000 ? Math.round(v) + ' m/s' : (v / 1000).toFixed(2) + ' km/s';
function updateHud(S) {
  const t = S.tele; if (!t) return;
  hud.phase.textContent = t.phase; hud.time.textContent = t.t || '–';
  hud.alt.textContent = fmtAlt(t.alt || 0); hud.spd.textContent = fmtSpd(t.v || 0);
  if (t.stag) { hud.qk.textContent = 'Shock-layer temperature (ideal gas)'; hud.q.textContent = Math.round(t.stag.ideal / 10) * 10 + ' °C'; }
  else if (t.q != null) { hud.qk.textContent = 'Dynamic pressure'; hud.q.textContent = t.q.toFixed(1) + ' kPa'; }
  else { hud.qk.textContent = 'Dynamic pressure'; hud.q.textContent = '0 kPa'; }
  hud.thr.textContent = t.thrust != null ? t.thrust.toFixed(1) + ' MN' : '–';
  hud.mass.textContent = t.mass != null ? Math.round(t.mass) + ' t' : '–';
  hud.event.textContent = S.event || '';
  hud.event.style.opacity = S.event ? 1 : 0;
}
let Td = 0, Tt = 0, clock = new THREE.Clock(), frames = 0, acc = 0, lastChapter = -1;
const debugT = q.has('T') ? parseFloat(q.get('T')) : null;
const camPos = new THREE.Vector3();

function apply(S, time, dt) {
  const b = S.boost, s = S.ship;
  vehicle.booster.visible = b.vis; vehicle.ship.visible = s.vis;
  vehicle.booster.position.copy(b.pos); vehicle.booster.quaternion.copy(attitude(b.pitch, b.roll));
  vehicle.ship.position.copy(s.pos); vehicle.ship.quaternion.copy(attitude(s.pitch, s.roll));
  vehicle.setExplode(S.explode); vehicle.setXray(S.xray); vehicle.setFlaps(s.fwd, s.aft); vehicle.setGridFins(b.fins);
  vehicle.setEngineHeat(b.thr, s.thr);
  const altB = Math.max(0, b.pos.y - 15 + (b.pos.x * b.pos.x) / (2 * 6371000)), altS = Math.max(0, s.pos.y - 15);
  plumeB.set(b.thr, altB); plumeS.set(s.thr, altS);
  plumeB.setCount(b.count); plumeS.setCount(Math.min(6, s.count));
  steam.set(S.launchT, Math.max(0, 1 - S.launchT / 40)); steam2.set(S.landT, 1 - Math.min(1, Math.max(0, S.landT) / 30));
  steam2.points.material.uniforms.uT.value = S.landT;
  deluge.set(time, S.deluge);
  // flame along the pad while the engines are still close to the deflector
  fire.set(S.launchT, b.vis ? b.thr * (1 - THREE.MathUtils.smoothstep(b.pos.y, 60, 220)) : 0);
  impact.visible = b.thr > 0.05 && b.pos.y < 140 && b.vis; impact.material.uniforms.uI.value = b.thr * (1 - Math.min(1, (b.pos.y - 20) / 120));
  plasma.set(s.plasma); plasma.uniforms.uWind.value.copy(S.wind);
  trail.update((u, out) => { out.set(S.trailTo.x * u * u, 20 + (S.trailTo.y - 20) * u, 0); }, S.trail);
  ruler.visible = S.ruler > 0.01; ruler.children[0].material.opacity = S.ruler;
  ruler.children.forEach((c) => { if (c.material && c.isSprite) c.material.opacity = S.ruler; });
  world.setChopsticks(S.chopOpen, S.chopY);
  const glowPos = b.pos.clone(); glowPos.y = Math.max(8, Math.min(b.pos.y, 60));
  world.setGlow(glowPos, S.glow);
  // camera
  const sc = S.cam, sh = S.shake || 0;
  camera.position.copy(sc.pos);
  if (sh > 0.01) camera.position.add(new THREE.Vector3(Math.sin(time * 61) + Math.sin(time * 37.3), Math.sin(time * 53.1), Math.cos(time * 47)).multiplyScalar(0.35 * sh));
  camera.lookAt(sc.tgt);
  if (Math.abs(camera.fov - sc.fov) > 0.01) { camera.fov = farCam.fov = sc.fov; resize(); }
  // composition: push the subject right of the text panel on wide screens
  // (mobile: the notes are a bottom sheet, so lift the subject into the top half instead)
  const shift = W > 980 ? -0.15 * W : 0, lift = W > 980 ? 0 : 0.2 * H;
  camera.setViewOffset(W, H, shift, lift, W, H); camera.updateProjectionMatrix();
  farCam.position.copy(camera.position); farCam.quaternion.copy(camera.quaternion); farCam.updateProjectionMatrix();
  const camAlt = Math.max(0, camera.position.y / 1000);
  world.update(time, camera.position, camAlt, S.tw);
  if (Math.abs(S.tw - lastTw) > 0.06 && time - lastEnv > 0.4) { world.rebuildEnv(S.tw); lastTw = S.tw; lastEnv = time; }
  // audio follows the engines and the distance
  if (audio && audio.on) {
    const thr = Math.max(b.thr, s.thr * 0.6), near = 1 / (1 + Math.max(0, camAlt) * 0.6 + Math.max(0, camera.position.distanceTo(b.pos) - 100) / 900);
    const alt = Math.max(0, 1 - altB / 60000);
    const k = thr * near * alt, now = audio.ac.currentTime;
    audio.g.gain.setTargetAtTime(k * 1.0, now, 0.12);
    audio.g3.gain.setTargetAtTime(k * 0.55, now, 0.12);
    audio.g2.gain.setTargetAtTime(k * near * 0.5, now, 0.12);                     // crackle needs to be close
    audio.lp.frequency.setTargetAtTime(400 + 7000 * near * near * thr, now, 0.15);  // far away = muffled rumble
  }
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1), time = clock.elapsedTime;
  fxShared.uTime.value = time;
  if (debugT !== null) { Td = debugT; }
  else {
    if (auto) {
      const c = Math.min(PACE.length - 1, Math.floor(auto.T));
      auto.T += dt / PACE[c];
      if (auto.T >= auto.T1) { auto.T = auto.T1; cancelAuto(); }
      else scrollToT(auto.T);
      Td = auto.T ?? Td;
    } else { Tt = currentT(); Td += (Tt - Td) * (1 - Math.exp(-dt * 8)); if (Math.abs(Tt - Td) < 1e-4) Td = Tt; }
  }
  const S = evaluate(Td, W / H);
  apply(S, time, dt);
  updateHud(S); updateLabels(S);
  if (S.chapter !== lastChapter) {
    lastChapter = S.chapter;
    $$('.tick').forEach((t, i) => t.classList.toggle('on', i === S.chapter));
    $$('.chapter').forEach((el, i) => el.classList.toggle('near', Math.abs(i - S.chapter) <= 1));
  }
  $('#rail').style.setProperty('--prog', (Td / (CHAPTERS.length - 1)).toFixed(4));
  if (composer) composer.render(); else { renderer.clear(); renderer.render(world.far, farCam); renderer.clearDepth(); renderer.render(world.near, camera); }
  // adaptive quality in the first seconds
  if (quality === 'auto' && frames < 200) { acc += dt; frames++; if (frames === 120) { const ms = acc / frames * 1000; if (ms > 30) { quality = 'medium'; applyQuality(); acc = 0; frames = 100; } } if (frames === 200 && acc / 100 > 0.032) { quality = 'low'; applyQuality(); } }
}

// ------------------------------------------------ boot
document.documentElement.dataset.depth = depth;
applyQuality();
setDepth(depth, false);
measure();
addEventListener('load', measure);
document.fonts && document.fonts.ready.then(measure);
renderer.compile(world.near, camera);
requestAnimationFrame(() => { $('#veil').classList.add('gone'); });
frame();
window.__sb = { evaluate, vehicle, world, renderer, steam, steam2, plumeB, plumeS, trail, deluge, plasma, impact, scrollToT, measure };
