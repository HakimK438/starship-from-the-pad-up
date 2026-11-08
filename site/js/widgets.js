// Small interactive widgets embedded in the chapters. Each is built lazily when first visible.
import { runAscent, DEFAULTS, MU, RE, G0 } from './sim.js';

const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
const slider = (id, label, min, max, step, val, unit) =>
  `<label>${label}<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"><output data-for="${id}">${val}${unit}</output></label>`;
function wire(root, onChange) {
  root.querySelectorAll('input[type=range]').forEach((i) => i.addEventListener('input', () => {
    const o = root.querySelector(`output[data-for="${i.id}"]`); if (o) o.textContent = i.value + (o.dataset.unit || o.textContent.replace(/^[-\d.]+/, ''));
    onChange();
  }));
}
const val = (root, id) => parseFloat(root.querySelector('#' + id).value);

const W = {};

W.scalebars = (root) => {
  const items = [['Starship', 121, 1], ['Saturn V', 110.6], ['Statue of Liberty', 93], ['Falcon 9', 70], ['Space Shuttle stack', 56], ['Ship only', 50]];
  root.innerHTML = '<div class="bars">' + items.map(([n, h, hl]) => `<div><span>${n}</span><span style="display:block"><i class="${hl ? 'hl' : ''}" style="width:${h / 121 * 100}%"></i></span><span class="num">${h} m</span></div>`).join('') + '</div><p class="note">Heights in metres. The ruler beside the rocket in 3D uses the same scale.</p>';
};

W.propellant = (root) => {
  const lox = 0.783, ch4 = 0.217, vl = lox / 1141, vc = ch4 / 422, vt = vl + vc;
  root.innerHTML = `<div class="bars">
    <div><span>By mass</span><span style="display:flex;gap:2px"><i style="width:${lox * 100}%;background:#8fc4ff"></i><i style="width:${ch4 * 100}%;background:#ffb25e"></i></span><span class="num">78 / 22</span></div>
    <div><span>By volume</span><span style="display:flex;gap:2px"><i style="width:${vl / vt * 100}%;background:#8fc4ff"></i><i style="width:${vc / vt * 100}%;background:#ffb25e"></i></span><span class="num">57 / 43</span></div></div>
    <p class="note">Blue is liquid oxygen (about 1,141 kg/m³). Amber is liquid methane (about 422 kg/m³). Ratio 3.6 : 1 by mass.</p>
    <table><tr><th>Pair (Sutton Table 5-5)</th><th>Isp, s</th></tr><tr><td>O₂ + H₂ (O/F 4.0)</td><td class="num">389.5</td></tr><tr><td>O₂ + CH₄ (O/F 3.0)</td><td class="num">311</td></tr><tr><td>O₂ + RP-1 (O/F 2.24)</td><td class="num">300</td></tr></table>`;
};

W.rocketeq = (root) => {
  root.innerHTML = `<b>Rocket equation: how much speed can you buy?</b>
    ${slider('isp', 'Specific impulse', 280, 450, 1, 350, ' s')}${slider('prop', 'Propellant', 100, 3500, 50, 1200, ' t')}${slider('dry', 'Dry mass + payload', 50, 600, 10, 220, ' t')}
    <canvas width="440" height="180"></canvas><div class="readout"></div><p class="note">The curve shows Δv against propellant mass: it flattens. Doubling the propellant does not double the speed.</p>`;
  const cv = root.querySelector('canvas'), g = cv.getContext('2d');
  const upd = () => {
    const isp = val(root, 'isp'), prop = val(root, 'prop'), dry = val(root, 'dry'), c = isp * G0;
    const dv = (p) => c * Math.log((dry + p) / dry);
    g.clearRect(0, 0, 440, 180); g.strokeStyle = 'rgba(201,206,214,.2)'; g.fillStyle = '#a9b0c6'; g.font = '11px Inter';
    const maxDv = dv(3500); g.beginPath();
    for (let p = 0; p <= 3500; p += 50) { const x = 30 + p / 3500 * 400, y = 160 - dv(p) / maxDv * 140; p ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.strokeStyle = '#9aa8ff'; g.lineWidth = 2; g.stroke();
    const x = 30 + prop / 3500 * 400, y = 160 - dv(prop) / maxDv * 140;
    g.fillStyle = '#ff9a3c'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
    const need = 160 - 9400 / maxDv * 140; if (need > 10) { g.setLineDash([4, 4]); g.strokeStyle = '#ff5a1f'; g.beginPath(); g.moveTo(30, need); g.lineTo(430, need); g.stroke(); g.setLineDash([]); g.fillStyle = '#ff5a1f'; g.fillText('9.4 km/s to orbit', 36, need - 4); }
    g.fillStyle = '#a9b0c6'; g.fillText('propellant →', 360, 175); g.fillText('Δv', 4, 14);
    root.querySelector('.readout').innerHTML = `Mass ratio <em>${((dry + prop) / dry).toFixed(2)}</em> · Δv = <em>${(dv(prop) / 1000).toFixed(2)} km/s</em>`;
  };
  wire(root, upd); upd();
};

W.thrustalt = (root) => {
  root.innerHTML = `<b>Why two kinds of Raptor?</b>${slider('alt', 'Altitude', 0, 100, 1, 0, ' km')}
    <canvas width="440" height="170"></canvas><div class="readout"></div>
    <p class="note">F = F<sub>vac</sub> − p<sub>a</sub>·A<sub>e</sub>. A wide vacuum bell gains more in space but loses more in air (and the flow can separate from the wall at sea level).</p>`;
  const cv = root.querySelector('canvas'), g = cv.getContext('2d');
  const FSL = 2.26e6, aeSL = 1.5, aeV = 3.5, FvSL = FSL + 101325 * aeSL, FvV = 2.58e6;
  const p = (km) => 101325 * Math.exp(-km * 1000 / 7500);
  const upd = () => {
    const alt = val(root, 'alt'); g.clearRect(0, 0, 440, 170);
    const draw = (Fv, ae, col) => { g.beginPath(); for (let k = 0; k <= 100; k += 2) { const F = Math.max(0, Fv - p(k) * ae) / 1e6, x = 30 + k / 100 * 400, y = 150 - F / 2.8 * 130; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = col; g.lineWidth = 2; g.stroke(); };
    draw(FvSL, aeSL, '#ff9a3c'); draw(FvV, aeV, '#9aa8ff');
    g.fillStyle = '#a9b0c6'; g.font = '11px Inter'; g.fillText('thrust per engine, MN vs altitude', 34, 14);
    g.fillStyle = '#ff9a3c'; g.fillText('sea-level bell', 330, 40); g.fillStyle = '#9aa8ff'; g.fillText('vacuum bell', 340, 56);
    const x = 30 + alt / 100 * 400; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 150); g.stroke();
    root.querySelector('.readout').innerHTML = `Sea-level bell <em>${((FvSL - p(alt) * aeSL) / 1e6).toFixed(2)} MN</em> · vacuum bell <em>${(Math.max(0, FvV - p(alt) * aeV) / 1e6).toFixed(2)} MN</em>`;
  };
  wire(root, upd); upd();
};

W.cycles = (root) => {
  root.innerHTML = `<b>Engine cycles</b> <select><option value="gg">Gas generator</option><option value="sc">Staged combustion</option><option value="ff" selected>Full-flow staged (Raptor)</option></select>
    <svg viewBox="0 0 440 200" width="100%" role="img" aria-label="Engine cycle diagram"><style>.f{stroke:#ffb25e}.o{stroke:#8fc4ff}.g{stroke:#ff6a2a}.fl{fill:none;stroke-width:3;stroke-dasharray:6 6;animation:d 1s linear infinite}@keyframes d{to{stroke-dashoffset:-12}}text{font:600 11px Inter;fill:#eceef5}rect{fill:#1b2340;stroke:#c9ced6;stroke-opacity:.5}</style><g id="d"></g></svg>
    <p class="note"></p>`;
  const d = root.querySelector('#d'), note = root.querySelector('.note'), sel = root.querySelector('select');
  const box = (x, y, w, h, t) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle">${t}</text>`;
  const line = (cl, pts) => `<polyline class="fl ${cl}" points="${pts}"/>`;
  const draw = () => {
    const m = sel.value;
    let s = box(20, 20, 60, 30, 'Methane') + box(20, 150, 60, 30, 'Oxygen') + box(180, 70, 80, 60, 'Main chamber') + box(340, 85, 80, 30, 'Nozzle');
    s += line('g', '260,100 340,100');
    if (m === 'gg') { s += box(110, 20, 60, 30, 'Gas gen.') + box(110, 150, 60, 30, 'Pump'); s += line('f', '80,35 110,35') + line('f', '170,35 215,35 215,70') + line('o', '80,165 110,165') + line('o', '170,165 215,165 215,130'); note.textContent = 'A small side burner drives the turbine, then its exhaust is dumped overboard. Simple, but that exhaust carries away energy.'; }
    if (m === 'sc') { s += box(110, 20, 60, 30, 'Preburner') + box(110, 150, 60, 30, 'Pump'); s += line('f', '80,35 110,35') + line('o', '80,165 110,165') + line('g', '170,35 215,35 215,70') + line('o', '170,165 215,165 215,130'); note.textContent = 'One preburner drives the turbines and all of its exhaust goes on into the main chamber. More efficient, and the pressure is higher.'; }
    if (m === 'ff') { s += box(110, 20, 60, 30, 'Fuel-rich preburner') + box(110, 150, 60, 30, 'Ox-rich preburner'); s += line('f', '80,35 110,35') + line('o', '80,165 110,165') + line('g', '170,35 215,35 215,70') + line('g', '170,165 215,165 215,130'); note.textContent = 'Two preburners. Fuel-rich gas and oxygen-rich gas both flow through turbines, then meet as gas in the chamber: complete mixing, no coking, high efficiency.'; }
    d.innerHTML = s;
  };
  sel.onchange = draw; draw();
};

W.orbit = (root) => {
  root.innerHTML = `<b>Newton's cannon</b>${slider('v', 'Horizontal speed', 3, 11, 0.05, 6, ' km/s')}<canvas width="440" height="260"></canvas><div class="readout"></div>
    <p class="note">Launched horizontally from 100 km up. Below 7.85 km/s the path meets the Earth.</p>`;
  const cv = root.querySelector('canvas'), g = cv.getContext('2d'); const R0 = RE + 100000;
  const upd = () => {
    const v = val(root, 'v') * 1000; g.clearRect(0, 0, 440, 260);
    const sc = 100 / RE, cx = 220, cy = 150;
    g.fillStyle = '#12308a'; g.beginPath(); g.arc(cx, cy, RE * sc, 0, 7); g.fill(); g.strokeStyle = '#6fa8ff'; g.stroke();
    const eps = v * v / 2 - MU / R0, h = R0 * v;
    let path = [], r = R0, th = 0, vr = 0, vt = v, hit = false;
    for (let t = 0; t < 14000 && !hit; t += 8) {
      const a = -MU / (r * r) + vt * vt / r; vr += a * 8; vt += (-vr * vt / r) * 8; r += vr * 8; th += vt / r * 8;
      if (r < RE) { hit = true; r = RE; }
      path.push([cx + r * sc * Math.sin(th), cy - r * sc * Math.cos(th)]);
      if (th > 6.4) break;
    }
    g.strokeStyle = hit ? '#ff5a1f' : '#ff9a3c'; g.lineWidth = 2; g.beginPath(); path.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    let txt;
    if (eps >= 0) txt = 'Escape trajectory: it never comes back.';
    else { const a = -MU / (2 * eps), e = Math.sqrt(Math.max(0, 1 + 2 * eps * h * h / (MU * MU))), rp = a * (1 - e) - RE; txt = rp > 80000 ? `Stable orbit. Perigee <em>${Math.round(rp / 1000)} km</em>, apogee <em>${Math.round((a * (1 + e) - RE) / 1000)} km</em>.` : `Comes back down: <em>perigee ${Math.round(rp / 1000)} km</em> is below the surface.`; }
    root.querySelector('.readout').innerHTML = txt;
  };
  wire(root, upd); upd();
};

W.heat = (root) => {
  root.innerHTML = `<b>Shock-layer temperature (ideal gas)</b>${slider('sp', 'Speed', 500, 7500, 100, 5000, ' m/s')}<div class="readout"></div>
    <p class="note">T₀ = T∞(1 + (γ−1)/2·M²), with T∞ ≈ 230 K and a ≈ 290 m/s. Real air dissociates and ionises, so the true value is far lower than this ideal number.</p>`;
  const upd = () => { const v = val(root, 'sp'), M = v / 290, T = 230 * (1 + 0.2 * M * M);
    root.querySelector('.readout').innerHTML = `Mach <em>${M.toFixed(1)}</em> · ideal T₀ <em>${Math.round(T - 273).toLocaleString()} °C</em> · tile limit about <em>1,400 °C</em>`; };
  wire(root, upd); upd();
};

W.sim = (root) => {
  root.innerHTML = `<b>Ascent simulator</b>
    ${slider('pay', 'Payload', 0, 250, 10, 100, ' t')}${slider('kick', 'Pitch kick', 0.5, 9, 0.1, 4.5, '°')}${slider('kt', 'Kick time', 5, 25, 1, 10, ' s')}
    <label>Options<span><input type="checkbox" id="mq" checked> Max-Q throttle &nbsp;<input type="checkbox" id="dr" checked> Drag &nbsp;<input type="checkbox" id="ag" checked> Auto-guide</span><span></span></label>
    <button class="btn" id="go">Run flight</button>
    <canvas width="440" height="220"></canvas><div class="readout"></div><p class="note"></p>`;
  const cv = root.querySelector('canvas'), g = cv.getContext('2d'), out = root.querySelector('.readout'), note = root.querySelector('.note');
  const go = () => {
    const P = { payload: val(root, 'pay') * 1000, kickAngle: val(root, 'kick'), kickTime: val(root, 'kt'), maxQThrottle: root.querySelector('#mq').checked, drag: root.querySelector('#dr').checked, autoGuide: root.querySelector('#ag').checked };
    const { series, summary: s } = runAscent(P, { sample: 2 });
    g.clearRect(0, 0, 440, 220);
    const maxA = Math.max(150, ...series.map((r) => r.alt)), maxV = 9, maxT = Math.max(...series.map((r) => r.t)) || 1;
    const plot = (key, scale, col) => { g.beginPath(); series.forEach((r, i) => { const x = 30 + r.t / maxT * 400, y = 200 - r[key] / scale * 170; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.strokeStyle = col; g.lineWidth = 2; g.stroke(); };
    plot('alt', maxA, '#9aa8ff'); series.forEach(() => 0); g.beginPath(); series.forEach((r, i) => { const x = 30 + r.t / maxT * 400, y = 200 - (r.v / 1000) / maxV * 170; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.strokeStyle = '#ff9a3c'; g.stroke();
    g.fillStyle = '#a9b0c6'; g.font = '11px Inter'; g.fillText('blue: altitude (km, max ' + Math.round(maxA) + ')   amber: speed (0–9 km/s)   time →', 34, 14);
    if (s.tMeco) { const x = 30 + s.tMeco / maxT * 400; g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 200); g.stroke(); g.fillText('staging', x + 4, 30); }
    const ok = s.orbit ? 'var(--ice)' : 'var(--ember)';
    out.innerHTML = `<span style="color:${ok}">${s.status === 'flying' ? (s.orbit ? 'ORBIT' : 'SUBORBITAL') : s.status.toUpperCase()}</span> · Max-Q <em>${(s.qMax / 1000).toFixed(0)} kPa</em> at T+${Math.round(s.tQmax)} s · MECO T+${s.tMeco ? Math.round(s.tMeco) : '–'} s · final speed <em>${(s.vFinal / 1000).toFixed(2)} km/s</em>`;
    note.textContent = s.note + ` Gravity loss ${Math.round(s.gravLoss)} m/s, drag loss ${Math.round(s.dragLoss)} m/s, steering loss ${Math.round(s.steerLoss)} m/s.`;
  };
  root.querySelector('#go').onclick = go; go();
};

// ---- 33-engine map: which Raptors run in each phase
W.engines = (root) => {
  const pos = [];
  for (let i = 0; i < 3; i++) { const a = i / 3 * 6.2832 + 0.5; pos.push([Math.cos(a) * 0.98, Math.sin(a) * 0.98, 0]); }
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832 + 0.15; pos.push([Math.cos(a) * 2.45, Math.sin(a) * 2.45, 1]); }
  for (let i = 0; i < 20; i++) { const a = i / 20 * 6.2832; pos.push([Math.cos(a) * 3.85, Math.sin(a) * 3.85, 2]); }
  const phases = {
    liftoff: [33, 'Liftoff and ascent: all 33 run. Total ≈ 74 MN. The inner 13 gimbal to steer.'],
    boost: [13, 'Boostback: the 13 central engines reverse the booster’s course. The outer 20 are fixed and cannot steer.'],
    land13: [13, 'Landing burn start: 13 engines remove most of the speed quickly, keeping gravity loss short.'],
    land3: [3, 'Final approach: 3 engines, throttled down, give fine control near a hover for the catch.'],
  };
  root.innerHTML = `<b>The 33-engine map</b> <select>${Object.keys(phases).map((k) => `<option value="${k}">${{ liftoff: 'Liftoff', boost: 'Boostback', land13: 'Landing burn: start', land3: 'Landing burn: final' }[k]}</option>`).join('')}</select>
    <svg viewBox="-50 -50 100 100" width="100%" style="max-width:260px;display:block;margin:10px auto" role="img" aria-label="Booster engine layout"></svg>
    <div class="readout"></div><p class="note"></p>`;
  const svg = root.querySelector('svg'), sel = root.querySelector('select');
  const draw = () => {
    const [n, txt] = phases[sel.value];
    let s = '<circle r="45" fill="#11162a" stroke="#c9ced6" stroke-opacity=".4"/>';
    pos.forEach(([x, y, ring], i) => {
      const on = i < n, gim = ring < 2;
      s += `<circle cx="${x * 11}" cy="${y * 11}" r="${ring === 2 ? 4.4 : 4.6}" fill="${on ? '#ff9a3c' : '#2a3150'}" ${on ? 'style="filter:drop-shadow(0 0 2px #ff5a1f)"' : ''} stroke="${gim ? '#9aa8ff' : '#c9ced6'}" stroke-width="${gim ? 1 : 0.4}" stroke-opacity="${gim ? 0.9 : 0.4}"/>`;
    });
    svg.innerHTML = s;
    root.querySelector('.readout').innerHTML = `<em>${n}</em> engines running · up to <em>${(n * 2.26).toFixed(1)} MN</em> at full throttle`;
    root.querySelector('.note').innerHTML = txt + ' <br>Blue outline: gimballing engine. Layout 3 + 10 + 20 (Starship Report).';
  };
  sel.onchange = draw; draw();
};

// ---- Max-Q: q = ½ρv² from the same simulator that drives the flight
let refFlight = null;
const ref = () => (refFlight ||= runAscent({}, { sample: 1 }));
W.maxq = (root) => {
  root.innerHTML = `<b>Why dynamic pressure peaks once</b><canvas width="440" height="200"></canvas><div class="readout"></div>
    <p class="note">Ice: air density (falls with height). Steel: speed squared (grows). Amber: their product, q = ½ρv². First 170 s of the reference flight.</p>`;
  const g = root.querySelector('canvas').getContext('2d');
  const s = ref().series.filter((r) => r.t <= 170);
  const rows = s.map((r) => ({ t: r.t, rho: 1.225 * Math.exp(-r.alt / 7.5), v2: r.v * r.v, q: r.q }));
  const mx = (k) => Math.max(...rows.map((r) => r[k]));
  const plot = (k, col, w) => { const m = mx(k); g.beginPath(); rows.forEach((r, i) => { const x = 30 + r.t / 170 * 400, y = 180 - r[k] / m * 160; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.strokeStyle = col; g.lineWidth = w; g.stroke(); };
  g.strokeStyle = 'rgba(201,206,214,.2)'; g.beginPath(); g.moveTo(30, 180); g.lineTo(430, 180); g.stroke();
  plot('rho', '#9aa8ff', 1.5); plot('v2', '#c9ced6', 1.5); plot('q', '#ff9a3c', 2.5);
  const pk = rows.reduce((a, b) => (b.q > a.q ? b : a));
  const x = 30 + pk.t / 170 * 400; g.setLineDash([3, 4]); g.strokeStyle = 'rgba(255,154,60,.6)'; g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 180); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#ff9a3c'; g.font = '600 11px Inter'; g.fillText('Max-Q', x + 4, 30);
  g.fillStyle = '#a9b0c6'; g.font = '11px Inter'; g.fillText('time after liftoff →', 340, 196);
  const alt = ref().series.find((r) => r.t >= pk.t);
  root.querySelector('.readout').innerHTML = `Peak <em>${pk.q.toFixed(0)} kPa</em> at T+<em>${Math.round(pk.t)} s</em>, altitude ≈ <em>${alt.alt.toFixed(1)} km</em>, speed ≈ <em>${Math.round(alt.v)} m/s</em>`;
};

// ---- Δv budget: where the engines' ideal Δv goes
W.budget = (root) => {
  const s = ref().summary;
  const parts = [['Final speed', s.vFinal, '#9aa8ff'], ['Gravity loss', s.gravLoss, '#ff5a1f'], ['Drag loss', s.dragLoss, '#ff9a3c'], ['Steering loss', s.steerLoss, '#c9ced6']];
  const tot = parts.reduce((a, p) => a + p[1], 0);
  root.innerHTML = `<b>The Δv budget of this flight</b>
    <div style="display:flex;height:22px;border-radius:6px;overflow:hidden;margin:12px 0 8px">${parts.map(([, v, c]) => `<i style="width:${v / tot * 100}%;background:${c}"></i>`).join('')}</div>
    <div class="bars">${parts.map(([n, v, c]) => `<div><span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c};margin-right:6px"></i>${n}</span><span></span><span class="num">${(v / 1000).toFixed(2)} km/s</span></div>`).join('')}</div>
    <p class="note">Ideal Δv from the rocket equation ≈ ${(s.dvIdeal / 1000).toFixed(2)} km/s. Losses are the integrals of g·sinγ, D/m and (1 − cos α)·F/m. Small differences come from rounding and Earth-frame effects.</p>`;
};

// ---- one stage vs two: the rocket equation per stage
W.staging = (root) => {
  root.innerHTML = `<b>One stage or two?</b>${slider('spay', 'Payload', 0, 250, 10, 100, ' t')}<canvas width="440" height="150"></canvas><div class="readout"></div>
    <p class="note">Same engines, same propellant (booster 3,100 t usable + ship 1,200 t). One stage must carry the empty booster tanks all the way. Dashed line: ≈ 9.4 km/s needed for orbit.</p>`;
  const g = root.querySelector('canvas').getContext('2d');
  const upd = () => {
    const p = val(root, 'spay');
    const m0 = 275 + 3400 + 120 + 1200 + p, s1 = 3.2 * Math.log(m0 / (m0 - 3100)), s2 = 3.6 * Math.log((1320 + p) / (120 + p));
    const one = 3.3 * Math.log(m0 / (m0 - 4300));
    g.clearRect(0, 0, 440, 150); const X = (v) => 110 + v / 11 * 320;
    g.font = '600 12px Inter'; g.fillStyle = '#a9b0c6'; g.fillText('One stage', 8, 46); g.fillText('Two stages', 8, 106);
    g.fillStyle = '#c9ced6'; g.fillRect(110, 30, X(one) - 110, 24);
    g.fillStyle = '#ff9a3c'; g.fillRect(110, 90, X(s1) - 110, 24); g.fillStyle = '#9aa8ff'; g.fillRect(X(s1), 90, X(s1 + s2) - X(s1), 24);
    g.fillStyle = '#1a0e02'; g.fillText('booster', 116, 107); g.fillText('ship', X(s1) + 6, 107);
    g.setLineDash([4, 4]); g.strokeStyle = '#ff5a1f'; g.beginPath(); g.moveTo(X(9.4), 18); g.lineTo(X(9.4), 125); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ff5a1f'; g.font = '11px Inter'; g.fillText('orbit', X(9.4) + 4, 136);
    root.querySelector('.readout').innerHTML = `One stage <em>${one.toFixed(1)} km/s</em> · two stages <em>${(s1 + s2).toFixed(1)} km/s</em> (${s1.toFixed(1)} + ${s2.toFixed(1)}) · ${s1 + s2 >= 9.4 ? 'reaches orbit' : 'short of orbit'}`;
  };
  wire(root, upd); upd();
};

// ---- belly flop vs tail-first terminal speed
W.terminal = (root) => {
  root.innerHTML = `<b>Why fall belly-first?</b>${slider('tm', 'Ship mass', 60, 300, 10, 150, ' t')}${slider('th', 'Altitude', 0, 20, 1, 0, ' km')}
    <canvas width="440" height="110"></canvas><div class="readout"></div>
    <p class="note">Terminal speed v = √(2mg / (ρ·C<sub>D</sub>·A)). Belly: A ≈ 450 m², C<sub>D</sub> ≈ 1.0. Tail-first: A ≈ 64 m², C<sub>D</sub> ≈ 0.8. Approximate values.</p>`;
  const g = root.querySelector('canvas').getContext('2d');
  const upd = () => {
    const m = val(root, 'tm') * 1000, h = val(root, 'th'), rho = 1.225 * Math.exp(-h / 7.5);
    const vb = Math.sqrt(2 * m * 9.81 / (rho * 1.0 * 450)), vt = Math.sqrt(2 * m * 9.81 / (rho * 0.8 * 64));
    g.clearRect(0, 0, 440, 110); const sc = 300 / Math.max(vt, 300);
    g.font = '600 12px Inter'; g.fillStyle = '#a9b0c6'; g.fillText('Belly-first', 8, 36); g.fillText('Tail-first', 8, 86);
    g.fillStyle = '#9aa8ff'; g.fillRect(100, 20, vb * sc, 24); g.fillStyle = '#ff5a1f'; g.fillRect(100, 70, vt * sc, 24);
    g.fillStyle = '#eceef5'; g.fillText(Math.round(vb) + ' m/s', 106 + vb * sc, 36); g.fillText(Math.round(vt) + ' m/s', Math.min(106 + vt * sc, 380), 86);
    const ke = (v) => 0.5 * m * v * v / 1e9;
    root.querySelector('.readout').innerHTML = `Belly-first <em>${Math.round(vb)} m/s</em> vs tail-first <em>${Math.round(vt)} m/s</em>. The landing burn must remove <em>${(vt / vb).toFixed(1)}×</em> more speed, ${(ke(vt) / ke(vb)).toFixed(0)}× the energy, if the ship falls tail-first.`;
  };
  wire(root, upd); upd();
};

W.library = (root) => {
  const ids = ['MdAKrzOLQTg', '_qwLHlVjRyw', 'gA6ppby3JC8', '_krgcofiM6M', 'C3iHAgwIYtI', 'ApMrILhTulI', 'j2BdNDTlWbo', 'CMGiNKcVSek', 'Pn6e1O5bEyA', 'rcd_SQZDlnk', 'ANe_HW4X8oc', '-a0ecQMq-rM', 'EthkNLasUa8'];
  root.innerHTML = '<b>Your watch list</b><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-top:10px">' + ids.map((id, i) => `<a href="https://youtu.be/${id}" target="_blank" rel="noopener" style="color:inherit;font:600 12px Inter"><img loading="lazy" alt="Video ${i + 1}" src="https://img.youtube.com/vi/${id}/mqdefault.jpg" style="width:100%;border-radius:6px;display:block">Video ${i + 1}</a>`).join('') + '</div>';
};

export function initWidgets(root = document) {
  root.querySelectorAll('.widget[data-widget]').forEach((w) => {
    if (w.dataset.ready || !w.offsetParent) return;
    const f = W[w.dataset.widget]; if (!f) return;
    w.dataset.ready = '1'; f(w);
  });
}
