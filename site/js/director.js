// Scroll director: maps T (chapter index + progress through that chapter) to a complete,
// deterministic scene state: where each stage is, engine throttle, camera shot, telemetry.
// Ascent chapters (6-9) read the same simulator that powers "Fly it yourself".
import * as THREE from 'three';
import { runAscent, RE } from './sim.js';

export const CHAPTERS = ['hero', 'scale', 'anatomy', 'propellant', 'raptor', 'thrust', 'liftoff', 'ascent', 'staging', 'orbit', 'simulator', 'reentry', 'catch', 'library'];

const TABLE_Y = 20;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const D2R = Math.PI / 180;

// reference flight from the simulator (default parameters)
const REF = runAscent({}, { sample: 0.25 });
const SER = REF.series;
export const REF_SUMMARY = REF.summary;
const T_MECO = REF.summary.tMeco, T_SECO = REF.summary.tSeco;

function simAt(t) {
  const last = SER[SER.length - 1];
  if (t <= 0) return SER[0];
  if (t >= last.t) return last;
  const i = Math.min(SER.length - 2, Math.floor(t / 0.25));
  const a = SER[i], b = SER[i + 1], f = (t - a.t) / (b.t - a.t || 1);
  const o = {};
  for (const k in a) o[k] = typeof a[k] === 'number' ? a[k] + (b[k] - a[k]) * f : a[k];
  return o;
}
// place a body on the spherical Earth: alt (m) above surface, downrange arc (m)
function polar(altM, downM, out) {
  const ang = downM / RE, r = RE + altM;
  return out.set(r * Math.sin(ang), r * Math.cos(ang) - RE, 0);
}
const fmtT = (t) => {
  const s = Math.abs(Math.round(t)), m = Math.floor(s / 60), ss = s % 60;
  return (t < 0 ? 'T−' : 'T+') + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
};

// re-entry table: p, altitude km, speed m/s, elapsed s, distance-to-go m (to the landing point)
const REENTRY = [
  [0.00, 122, 7560, 0, 520e3], [0.10, 95, 7480, 60, 450e3], [0.22, 75, 7050, 120, 330e3], [0.36, 62, 5600, 175, 220e3],
  [0.50, 50, 3600, 235, 120e3], [0.64, 38, 2000, 290, 60e3], [0.76, 26, 1000, 340, 30e3], [0.86, 15, 450, 390, 15e3],
  [0.92, 9, 190, 430, 5e3], [1.00, 1.2, 80, 470, 2.4e3],
];
function tbl(T, p, col) {
  for (let i = 1; i < T.length; i++) if (p <= T[i][0]) {
    const a = T[i - 1], b = T[i], f = (p - a[0]) / (b[0] - a[0] || 1); return lerp(a[col], b[col], f);
  }
  return T[T.length - 1][col];
}

const V = () => new THREE.Vector3();
const qz = (deg) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -deg * D2R);
const qy = (deg) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deg * D2R);
export const attitude = (pitchDeg, rollDeg) => qz(pitchDeg).multiply(qy(rollDeg));
const axisOf = (pitchDeg, out) => out.set(Math.sin(pitchDeg * D2R), Math.cos(pitchDeg * D2R), 0);

function base() {
  return {
    boost: { pos: new THREE.Vector3(0, TABLE_Y, 0), pitch: 0, roll: 0, vis: true, thr: 0, count: 33, fins: 0 },
    ship: { pos: new THREE.Vector3(0, TABLE_Y + 71, 0), pitch: 0, roll: 0, vis: true, thr: 0, count: 6, fwd: 0, aft: 0, plasma: 0 },
    explode: 0, xray: 0, chopOpen: 1, chopY: 88, tw: 0.0, launchT: -100, landT: -100, deluge: 0, glow: 0, shake: 0,
    trail: false, trailTo: null, ruler: 0, labels: false, camAlt: 0, wind: new THREE.Vector3(0, 0, -1),
    tele: null, event: null, windDir: 0,
  };
}
// stack both stages on the pad / in flight
function stack(S, basePos, pitchDeg, sep = 0) {
  S.boost.pos.copy(basePos); S.boost.pitch = pitchDeg;
  const a = axisOf(pitchDeg, V());
  S.ship.pos.copy(basePos).addScaledVector(a, 71 + sep); S.ship.pitch = pitchDeg;
}

// ---------------------------------------------------------------- chapter states
function chapterState(c, p) {
  const S = base();
  const sub = (x) => x;
  switch (c) {
    case 0: {                                                      // standing at Starbase
      S.tele = { phase: 'On the pad', t: 'T−00:45:00', alt: 0, v: 0 };
      break;
    }
    case 1: {
      S.ruler = sm(0.02, 0.2, p) * (1 - sm(0.9, 1, p));
      S.tele = { phase: 'On the pad', t: 'T−00:45:00', alt: 0, v: 0 };
      break;
    }
    case 2: {
      S.explode = sm(0.08, 0.62, p);
      S.ship.fwd = S.ship.aft = sm(0.55, 0.8, p) * 0.55;
      S.labels = true;
      stack(S, new THREE.Vector3(0, TABLE_Y, 0), 0, S.explode * 33);
      S.tele = { phase: 'On the pad', t: 'T−00:45:00', alt: 0, v: 0 };
      break;
    }
    case 3: {
      S.explode = lerp(0.6, 0.3, sm(0, 0.4, p)); S.xray = sm(0, 0.14, p);
      S.labels = true;
      stack(S, new THREE.Vector3(0, TABLE_Y, 0), 0, S.explode * 33);
      S.tele = { phase: 'Fuelling', t: 'T−00:35:00', alt: 0, v: 0 };
      break;
    }
    case 4: {
      S.explode = lerp(0.3, 0, sm(0, 0.35, p)); S.xray = (1 - sm(0, 0.35, p)) * 0.6;
      S.labels = p < 0.4;
      stack(S, new THREE.Vector3(0, TABLE_Y, 0), 0, S.explode * 33);
      S.boost.thr = 0; S.tele = { phase: 'Engine section', t: 'T−00:02:00', alt: 0, v: 0 };
      break;
    }
    case 5: {                                                      // ignition, clamps still holding
      S.launchT = p * 7;
      const r = sm(0.0, 0.8, p);
      S.boost.thr = 0.08 + 0.92 * r;
      S.deluge = sm(0, 0.06, p);
      S.glow = S.boost.thr;
      stack(S, new THREE.Vector3(0, TABLE_Y, 0), 0);
      S.shake = 0.25 + 0.75 * r;
      S.tele = { phase: 'Ignition: clamps hold', t: fmtT(-7 + p * 7), alt: 0, v: 0, thrust: 74.5 * S.boost.thr };
      S.event = p < 0.15 ? 'Water deluge on, engines starting' : p < 0.85 ? 'Thrust building while clamps hold the booster down' : 'Full thrust confirmed: clamps release';
      break;
    }
    case 6: {                                                      // liftoff and tower clearance
      const t = p * 50;
      const s = simAt(t);
      S.launchT = 7 + t;
      S.boost.thr = s.thr;
      S.deluge = 1 - sm(8, 25, S.launchT);
      const pos = V(); polar(s.alt * 1000 + 15, s.down * 1000, pos); pos.y += 0;
      const pitch = 90 - s.pitch;
      stack(S, pos, Math.max(0, pitch >= 89.9 ? 0 : pitch) + (s.alt * 1000 / RE) / D2R * 0);
      S.glow = Math.max(0, 1 - s.alt * 1000 / 400) * s.thr;
      S.shake = 0.8 * (1 - sm(0.2, 0.8, p));
      S.trail = s.alt > 0.15; S.trailTo = pos.clone();
      S.tele = { phase: 'Ascent', t: fmtT(t), alt: s.alt, v: s.v, q: s.q, mach: s.mach, thrust: s.thrust, mass: s.mass, g: s.accel };
      S.event = t < 1 ? 'Clamps release. Liftoff' : t < 8 ? 'Clearing the tower: the rocket is still slow, so thrust is spent fighting gravity' : t < 11 ? 'Pitch-over begins: a small tilt toward the east' : 'Gravity does the turning from here';
      break;
    }
    case 7: {                                                      // Max-Q and gravity turn
      const t = lerp(50, T_MECO - 6, p);
      const s = simAt(t);
      S.launchT = 7 + t; S.boost.thr = s.thr;
      const pos = V(); polar(s.alt * 1000 + 15, s.down * 1000, pos);
      const pitch = 90 - s.pitch + (s.down * 1000 / RE) / D2R;
      stack(S, pos, pitch);
      S.shake = clamp01(s.q / 32) * 0.8;
      S.trail = true; S.trailTo = pos.clone();
      S.tele = { phase: 'Ascent', t: fmtT(t), alt: s.alt, v: s.v, q: s.q, mach: s.mach, thrust: s.thrust, mass: s.mass, g: s.accel };
      const tq = REF.summary.tQmax;
      S.event = Math.abs(t - tq) < 7 ? 'Max-Q: peak aerodynamic pressure (' + (REF.summary.qMax / 1000).toFixed(0) + ' kPa)' : t < tq ? 'Accelerating faster than the air thins: pressure on the vehicle keeps rising' : 'Past Max-Q: the air is thinning faster than speed is growing';
      if (s.mach > 0.95 && s.mach < 1.15) S.event = 'Passing Mach 1';
      break;
    }
    case 8: {                                                      // hot staging, flip, boostback
      const tm = T_MECO;
      const t = lerp(tm - 8, tm + 22, p);
      const sh = simAt(t);
      const ref = simAt(tm - 1);
      const toDeg = (d) => (d * 1000 / RE) / D2R;
      const pos = V(); polar(sh.alt * 1000 + 15, sh.down * 1000, pos);
      const pitch0 = 90 - ref.pitch + toDeg(ref.down);
      const shipPitch = 90 - sh.pitch + toDeg(sh.down);
      const flip = sm(tm + 3, tm + 12, t);
      const relSep = t < tm ? 0 : 0.5 * 7.5 * Math.pow(Math.max(0, t - tm - 0.5), 2);   // ship pulls away
      S.boost.pos.copy(pos);
      S.boost.pitch = pitch0 + 180 * flip;
      S.ship.pos.copy(pos).addScaledVector(axisOf(pitch0, V()), 71 + relSep);
      S.ship.pitch = lerp(pitch0, shipPitch, sm(tm, tm + 12, t));
      S.boost.thr = t < tm ? sh.thr : (t < tm + 1.5 ? 1 - (t - tm) / 1.5 : (t > tm + 13 && t < tm + 21 ? 0.6 : 0));
      S.boost.count = t > tm + 1.5 ? 13 : 33;
      S.boost.fins = sm(tm + 5, tm + 9, t);
      S.ship.thr = clamp01((t - (tm - 2.5)) / 1.5);
      S.launchT = 7 + t;
      S.shake = t < tm + 4 ? 0.5 : 0.1;
      S.tele = { phase: 'Hot staging', t: fmtT(t), alt: sh.alt, v: sh.v, q: sh.q, mach: sh.mach, thrust: sh.thrust, mass: sh.mass, g: sh.accel };
      S.event = t < tm - 2.5 ? 'Booster burning to the planned cut-off' : t < tm ? 'Hot staging: ship engines light while still attached' : t < tm + 3 ? 'Booster engines off, the ship pushes itself away' : t < tm + 13 ? 'Booster flips with cold-gas thrusters and grid fins' : 'Boostback burn: 13 engines turn the booster toward home';
      break;
    }
    case 9: {                                                      // powered flight to orbit
      const t = lerp(T_MECO + 22, T_SECO + 12, p);
      const s = simAt(t);
      S.boost.vis = false;
      const pos = V(); polar(s.alt * 1000, s.down * 1000, pos);
      S.ship.pos.copy(pos); S.ship.pitch = 90 - s.pitch + (s.down * 1000 / RE) / D2R;
      S.ship.thr = t < T_SECO ? 1 : 0; S.ship.count = 6;
      S.launchT = 7 + t;
      S.tele = { phase: t < T_SECO ? 'Ship burn' : 'Coasting', t: fmtT(t), alt: s.alt, v: s.v, q: 0, mach: null, thrust: s.thrust, mass: s.mass, g: s.accel };
      S.event = t < T_SECO ? 'Six Raptors push the ship sideways. Altitude barely matters now: speed is the goal' : 'Engine cut-off. The ship coasts around Earth';
      S.camAlt = s.alt;
      break;
    }
    case 10: {                                                     // coast, simulator chapter
      const s = simAt(T_SECO + 12);
      S.boost.vis = false;
      const pos = V(); polar(s.alt * 1000, (s.down + p * 800) * 1000, pos);
      S.ship.pos.copy(pos); S.ship.pitch = 90 + ((s.down + p * 800) * 1000 / RE) / D2R;
      S.tele = { phase: 'Coasting', t: fmtT(T_SECO + 12 + p * 600), alt: s.alt, v: s.v, q: 0, mach: null, thrust: 0, mass: s.mass, g: 0 };
      S.event = 'In orbit, the ship is falling around the Earth, which is why everything inside floats';
      S.camAlt = s.alt;
      break;
    }
    case 11: {                                                     // re-entry
      const alt = tbl(REENTRY, p, 1) * 1000, speed = tbl(REENTRY, p, 2), el = tbl(REENTRY, p, 3), togo = tbl(REENTRY, p, 4);
      S.boost.vis = false;
      const pos = V(); polar(alt, 2500 - togo, pos);
      const gam = lerp(1.5, 88, Math.pow(p, 2.2));                  // flight-path angle below horizontal
      const roll = -90 * sm(0, 0.08, p);
      const e = lerp(22, 2, sm(0.05, 0.8, p));                      // nose-up angle of the body axis in the early belly-flop
      const flipK = sm(0.9, 0.985, p);
      const pitch = lerp(90 - e, 0, flipK) + (pos.x / RE) / D2R;
      S.ship.pos.copy(pos); S.ship.pitch = pitch; S.ship.roll = roll * (1 - flipK);
      S.ship.fwd = S.ship.aft = sm(0.05, 0.14, p) * (1 - sm(0.93, 1, p));
      S.ship.plasma = sm(0.04, 0.26, p) * (1 - sm(0.55, 0.86, p));
      S.ship.count = 3; S.ship.thr = sm(0.9, 0.95, p);
      S.wind.set(Math.cos(gam * D2R), -Math.sin(gam * D2R), 0);
      S.landT = (p - 0.92) * 60;
      S.glow = 0; S.camAlt = alt / 1000; S.tw = 0;
      S.shake = S.ship.plasma * 0.5;
      S.tele = { phase: 'Re-entry', t: 'E+' + String(Math.floor(el / 60)).padStart(2, '0') + ':' + String(Math.round(el % 60)).padStart(2, '0'), alt: alt / 1000, v: speed, q: 0, mach: speed / (alt > 80000 ? 280 : 300), stag: stagnationEstimate(speed, alt), plasma: S.ship.plasma };
      S.event = p < 0.1 ? 'Entry interface: the thin upper air starts to bite' : p < 0.5 ? 'Peak heating: the heat shield takes the full load' : p < 0.86 ? 'Belly flop: flaps steer, the body is the brake' : p < 0.93 ? 'Flip manoeuvre: three Raptors relight' : 'Landing burn';
      break;
    }
    case 12: {                                                     // booster catch
      S.ship.vis = false; S.boost.count = 13;
      const alt = lerp(900, 0, Math.pow(sm(0, 0.62, p), 1.0));
      const settle = sm(0.55, 0.78, p);
      const hover = lerp(0, 8, 0) ;
      const y = lerp(TABLE_Y + 1.6 + 640 * Math.pow(1 - sm(0, 0.58, p), 2.2), 29, settle) - 0;
      S.boost.pos.set(lerp(-6, 0, 0.0) * (1 - settle) + 0, Math.max(y, 28.5), 0);
      S.boost.pitch = 0;
      S.boost.fins = 1 - sm(0.8, 1, p) * 0.0;
      const landing = sm(0.0, 0.1, p) * (1 - sm(0.72, 0.8, p));
      S.boost.thr = landing * (0.45 + 0.4 * sm(0.4, 0.7, p));
      S.boost.count = p < 0.6 ? 13 : 3;
      S.chopOpen = 1 - sm(0.74, 0.92, p);
      S.chopY = 90;
      S.landT = lerp(-2, 40, p);
      S.glow = S.boost.thr * (1 - sm(0.5, 0.0 + 0.5, 1 - (S.boost.pos.y / 200)));
      S.deluge = 0;                                     // no pad deluge for a catch: the booster hovers 60 m up at the arms
      S.shake = S.boost.thr * 0.3;
      S.tw = lerp(0.35, 0.5, p);
      S.camAlt = 0;
      S.tele = { phase: 'Landing burn', t: 'L−' + String(Math.max(0, Math.round((1 - p) * 30))).padStart(2, '0') + 's', alt: Math.max(0, (S.boost.pos.y - 20) / 1000), v: p > 0.62 ? 0 : (1 - p) * 220, thrust: 74.5 * S.boost.thr * 0.2, mass: 330, vUnit: 'm/s' };
      S.event = p < 0.25 ? 'Grid fins steer the falling booster back to the tower' : p < 0.55 ? 'Landing burn: 13 engines, then 3, slow it to a near stop' : p < 0.74 ? 'Hover: the booster is steered between the chopsticks' : p < 0.9 ? 'Chopsticks close on the catch pins' : 'Caught: engines off, no landing legs needed';
      break;
    }
    case 13: {
      S.ship.vis = false; S.boost.pos.set(0, 29, 0); S.boost.pitch = 0; S.boost.fins = 1; S.chopOpen = 0.0; S.chopY = 90;
      S.tw = lerp(0.5, 0.85, p);
      S.deluge = 0; S.launchT = -100;
      S.tele = { phase: 'Safe on the pad', t: '', alt: 0, v: 0 };
      break;
    }
  }
  return S;
}

// Ideal-gas stagnation temperature (Anderson, Ch. 8), the real value is lower (dissociation)
export function stagnationEstimate(v, altM) {
  const a = altM > 80000 ? 280 : altM > 50000 ? 290 : 300;
  const M = v / a, g = 1.4;
  const T = (altM > 60000 ? 230 : altM > 30000 ? 225 : 255);
  return { ideal: T * (1 + (g - 1) / 2 * M * M) - 273.15, M };
}

// ---------------------------------------------------------------- cameras
const orbit = (center, dist, az, el, out) => out.set(
  center.x + dist * Math.sin(az) * Math.cos(el), center.y + dist * Math.sin(el), center.z + dist * Math.cos(az) * Math.cos(el));

function midOf(S) { return S.boost.pos.clone().lerp(S.ship.pos, 0.5).addScaledVector(axisOf(S.boost.pitch, V()), 28); }

function cameraFor(c, p, S, aspect) {
  const cam = { pos: V(), tgt: V(), fov: 34 };
  const wide = aspect < 0.9;                                       // portrait: pull back
  const k = wide ? 1.45 : 1;
  switch (c) {
    case 0: {
      const az = lerp(0.26, 0.06, p), tgt = new THREE.Vector3(0, 72, 0);
      orbit(tgt, 310 * k, az, -0.2, cam.pos); cam.pos.y = Math.max(cam.pos.y, 5);
      cam.tgt.copy(tgt); cam.fov = 34; break;
    }
    case 1: {
      const e = sm(0, 1, p);
      cam.pos.set(lerp(36, 52, e) * k, lerp(3, 128, e), lerp(100, 78, e) * k);
      cam.tgt.set(0, lerp(36, 112, e), 0); cam.fov = lerp(52, 44, e); break;
    }
    case 2: {
      const ex = S.explode;
      const tgt = new THREE.Vector3(0, 70 + 30 * ex, 0);
      orbit(tgt, (205 + 115 * ex) * k, lerp(0.55, -0.4, p), -0.06 + 0.06 * p, cam.pos);
      cam.tgt.copy(tgt); cam.fov = 38; break;
    }
    case 3: {
      const tgt = new THREE.Vector3(0, lerp(52, 112, sm(0.25, 0.8, p)), 0);
      orbit(tgt, 150 * k, lerp(-0.2, 0.5, p), 0.05, cam.pos);
      cam.tgt.copy(tgt); cam.fov = 40; break;
    }
    case 4: {
      const a = lerp(0.5, -0.9, sm(0, 1, p));
      cam.pos.set(Math.sin(a) * 20 * k + 3, lerp(4, 8, p), Math.cos(a) * 24 * k);
      cam.tgt.set(0, 24 + 4 * p, 0); cam.fov = 62 - 10 * p; break;
    }
    case 5: {
      const r = sm(0, 1, p);
      cam.pos.set(lerp(78, 66, r) * k, lerp(9, 16, r), lerp(74, 56, r) * k);
      cam.tgt.set(0, 26, 0); cam.fov = 44; break;
    }
    case 6: {
      const alt = S.boost.pos.y;
      const h = Math.max(0, alt - 20);
      cam.pos.set((120 + 0.18 * h) * k, 10 + 0.1 * h, (250 + 0.55 * h) * k);
      const tgt = S.boost.pos.clone().addScaledVector(axisOf(S.boost.pitch, V()), 55);
      tgt.y = Math.max(tgt.y, 50);
      cam.tgt.copy(tgt); cam.fov = lerp(42, 28, sm(0, 1, p)); break;
    }
    case 7: {
      const m = midOf(S);
      const a = axisOf(S.boost.pitch, V());
      const side = new THREE.Vector3(0.35, 0, 1).normalize();
      cam.pos.copy(m).addScaledVector(side, 240 * k).addScaledVector(a, lerp(40, 0, p) - 30);
      cam.tgt.copy(m).addScaledVector(a, -4); cam.fov = 30; break;
    }
    case 8: {
      const mid = S.boost.pos.clone().lerp(S.ship.pos, 0.5).addScaledVector(axisOf(S.ship.pitch, V()), 25);
      const gapLen = S.boost.pos.distanceTo(S.ship.pos);
      const side = new THREE.Vector3(0.2, 0.1, 1).normalize();
      cam.pos.copy(mid).addScaledVector(side, Math.max(260, gapLen * 1.1) * k);
      cam.tgt.copy(mid); cam.fov = 32; break;
    }
    case 9: {
      const m = S.ship.pos.clone().addScaledVector(axisOf(S.ship.pitch, V()), 22);
      const az = lerp(-0.35, 0.55, p);
      const dist = lerp(150, 230, sm(0.1, 1, p)) * k;
      const forward = axisOf(S.ship.pitch, V());
      cam.pos.copy(m).addScaledVector(new THREE.Vector3(Math.sin(az), 0.05, Math.cos(az)), dist).addScaledVector(forward, -30);
      cam.tgt.copy(m); cam.fov = 38; break;
    }
    case 10: {
      const m = S.ship.pos.clone().addScaledVector(axisOf(S.ship.pitch, V()), 20);
      const az = lerp(0.2, 1.3, p);
      cam.pos.copy(m).add(new THREE.Vector3(Math.sin(az) * 190 * k, 20, Math.cos(az) * 190 * k));
      cam.tgt.copy(m); cam.fov = 38; break;
    }
    case 11: {
      const m = S.ship.pos.clone().addScaledVector(axisOf(S.ship.pitch, V()), 25);
      const flipK = sm(0.9, 0.985, p);
      const dist = lerp(200, 150, p) * k;
      cam.pos.copy(m).add(new THREE.Vector3(30 * (1 - flipK) - 20 * flipK, lerp(25, 6, p) , dist));
      cam.tgt.copy(m); cam.fov = 36; break;
    }
    case 12: {
      const y = S.boost.pos.y;
      const tgt = new THREE.Vector3(-8, Math.max(60, y * 0.55 + 36), 0);
      cam.pos.set(lerp(95, 70, p) * k, Math.max(32, y * 0.4 + 24), lerp(175, 130, p) * k);
      cam.tgt.copy(tgt); cam.fov = lerp(40, 38, p); break;
    }
    case 13: {
      const tgt = new THREE.Vector3(-4, 70, 0);
      orbit(tgt, 210 * k, lerp(0.35, -0.25, p), -0.2, cam.pos);
      cam.pos.y = Math.max(cam.pos.y, 6);
      cam.tgt.copy(tgt); cam.fov = 36; break;
    }
  }
  return cam;
}

// public: evaluate the whole scene for T
export function evaluate(T, aspect = 1.6) {
  const maxT = CHAPTERS.length - 1e-4;
  T = Math.min(Math.max(T, 0), maxT);
  const c = Math.floor(T), p = T - c;
  const S = chapterState(c, p);
  const camA = cameraFor(c, p, S, aspect);
  const blendStart = 0.9;
  if (c < CHAPTERS.length - 1 && p > blendStart) {
    const S2 = chapterState(c + 1, 0);
    const camB = cameraFor(c + 1, 0, S2, aspect);
    const w = sm(blendStart, 1, p);
    camA.pos.lerp(camB.pos, w); camA.tgt.lerp(camB.tgt, w); camA.fov = lerp(camA.fov, camB.fov, w);
    S.tw = lerp(S.tw, S2.tw, w);
    S.xray = lerp(S.xray, S2.xray, w);
  }
  S.cam = camA; S.chapter = c; S.p = p;
  return S;
}

export { TABLE_Y };
