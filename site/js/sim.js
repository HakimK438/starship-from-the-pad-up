// Planar ascent simulator: Earth-centred polar coordinates, no Earth rotation,
// exponential atmosphere. Simplified on purpose: the aim is to show *why* the
// numbers look the way they do, not to reproduce a flight to the second.
// Pure module: runs in the browser and in Node.

export const MU = 3.986004418e14;      // Earth GM, m^3/s^2
export const RE = 6371000;             // Earth radius, m
export const G0 = 9.80665;

// Vehicle constants (approximate, see CLAUDE.md "Working numbers")
export const VEH = {
  boosterDry: 275e3, boosterProp: 3400e3, boosterReserve: 300e3,
  shipDry: 120e3, shipProp: 1200e3,
  nBoost: 33, nShipSL: 3, nShipVac: 3,
  mdotSL: 704.8,          // kg/s per sea-level Raptor 2 (F_SL 2.26 MN, Isp 327 s)
  veVacSL: 3420,          // m/s, vacuum exhaust velocity of sea-level bell
  aeSL: 1.5,              // m^2 exit area, sea-level bell
  mdotVac: 692, veVacVac: 3727, aeVac: 3.5,
  area: Math.PI * 4.5 * 4.5,
  qLimit: 40e3,           // Pa, structural comfort limit used for the warning
};

export function atmosphere(h) {
  const k = Math.exp(-Math.max(h, 0) / 7500);
  return { rho: 1.225 * k, p: 101325 * k };
}

const A_TAB = [[0, 340], [11000, 295], [20000, 295], [32000, 308], [47000, 329], [51000, 329], [71000, 290], [85000, 282], [1e9, 282]];
export function soundSpeed(h) {
  for (let i = 1; i < A_TAB.length; i++) {
    if (h <= A_TAB[i][0]) {
      const [h0, a0] = A_TAB[i - 1], [h1, a1] = A_TAB[i];
      return a0 + (a1 - a0) * (h - h0) / (h1 - h0);
    }
  }
  return 282;
}

const cdOf = (M) => 0.32 + 0.38 * Math.exp(-(((M - 1.15) / 0.55) ** 2));

export const DEFAULTS = {
  payload: 100e3,        // kg
  kickTime: 10,          // s, begin pitch-over
  kickAngle: 4.5,        // deg, size of the initial tilt
  maxQThrottle: true,    // throttle down near Max-Q
  autoGuide: true,       // closed-loop ship steering
  manualEndPitch: 2,     // deg, used when autoGuide is false
  hotStaging: true,
  drag: true,
  gravityLoss: true,
};

/**
 * Run the full ascent. Returns { series, summary }.
 * series: one sample per `sample` seconds of flight.
 */
export function runAscent(userParams = {}, opts = {}) {
  const P = { ...DEFAULTS, ...userParams };
  const dt = opts.dt ?? 0.05;
  const sample = opts.sample ?? 1;
  const tMax = opts.tMax ?? 900;

  let r = RE + 5, phi = 0, vr = 0, vt = 0;            // vt: inertial tangential speed (0 = Earth rotation ignored)
  let mBoostProp = VEH.boosterProp, mShipProp = VEH.shipProp;
  let stage = 1, t = 0, tMeco = null, tSeco = null;
  let qMax = 0, tQmax = 0, drag = 0, grav = 0, steer = 0, vIdeal = 0;
  let status = 'flying', note = '';
  const series = [];
  let nextSample = 0;
  let gammaVel = 90;
  let vrStage = 0, shipBurn = 286;

  const shipDryTotal = () => VEH.shipDry + P.payload;
  const massNow = () => stage === 1
    ? VEH.boosterDry + mBoostProp + shipDryTotal() + mShipProp
    : shipDryTotal() + mShipProp;

  while (t < tMax) {
    const h = r - RE;
    const { rho, p } = atmosphere(h);
    const v = Math.hypot(vr, vt);
    const q = 0.5 * rho * v * v;
    const M = v / soundSpeed(h);
    if (q > qMax) { qMax = q; tQmax = t; }

    // --- throttle ---
    let thr = 1;
    if (stage === 1 && P.maxQThrottle && h < 40000) {
      thr = Math.max(0.62, Math.min(1, 1 - (q - 26e3) / 14e3));
    }
    const engines = stage === 1 ? VEH.nBoost : 0;
    // thrust & mass flow
    let thrust = 0, mdot = 0;
    const burning = (stage === 1 && mBoostProp > VEH.boosterReserve && t < tMax) ||
                    (stage === 2 && mShipProp > 0 && tSeco === null);
    if (burning) {
      if (stage === 1) {
        mdot = engines * VEH.mdotSL * thr;
        thrust = engines * (VEH.mdotSL * VEH.veVacSL * thr - p * VEH.aeSL * thr);
      } else {
        const m1 = VEH.nShipSL * VEH.mdotSL, m2 = VEH.nShipVac * VEH.mdotVac;
        mdot = m1 + m2;
        thrust = m1 * VEH.veVacSL - VEH.nShipSL * p * VEH.aeSL +
                 m2 * VEH.veVacVac - VEH.nShipVac * p * VEH.aeVac;
        if (thrust < 0) thrust = 0;
      }
    }
    const m = massNow();
    const aT = thrust / m;

    // --- steering ---
    let gamma;                                         // thrust elevation above local horizontal, deg
    gammaVel = v > 1 ? Math.atan2(vr, vt) * 180 / Math.PI : 90;
    if (t < P.kickTime) {
      gamma = 90;
    } else if (stage === 1) {
      // zero angle-of-attack gravity turn after a small initial kick
      const kick = Math.max(0, 1 - (t - P.kickTime) / 4) * P.kickAngle;
      gamma = t - P.kickTime < 4 ? 90 - P.kickAngle * Math.min(1, (t - P.kickTime) / 2) : gammaVel;
      if (kick < 0) gamma = gammaVel;
    } else if (P.autoGuide) {
      // steer so the climb rate decays linearly to zero by engine cut-off
      const gEff = MU / (r * r) - vt * vt / r;
      const burnLeft = Math.max(5, mShipProp / (VEH.nShipSL * VEH.mdotSL + VEH.nShipVac * VEH.mdotVac));
      const vrTarget = Math.max(0, vrStage * Math.min(1, (burnLeft - 25) / Math.max(1, shipBurn)));
      const need = gEff + (vrTarget - vr) / 12;
      gamma = aT > 0 ? Math.asin(Math.max(-0.2, Math.min(0.995, need / aT))) * 180 / Math.PI : 0;
    } else {
      const sT = Math.min(1, (t - (tMeco ?? t)) / 300);
      gamma = gammaVel * (1 - sT) + P.manualEndPitch * sT;
    }
    const gr = gamma * Math.PI / 180;

    // --- forces ---
    const speedDir = v > 1e-3 ? [vr / v, vt / v] : [1, 0];
    const dragA = P.drag ? 0.5 * rho * v * v * cdOf(M) * VEH.area / m : 0;
    const gravA = P.gravityLoss ? MU / (r * r) : MU / (r * r) * 0.0001;
    const ar = aT * Math.sin(gr) - dragA * speedDir[0] - gravA + vt * vt / r;
    const at = aT * Math.cos(gr) - dragA * speedDir[1] - vr * vt / r;

    // loss bookkeeping (along velocity direction)
    drag += dragA * dt;
    grav += gravA * Math.max(0, speedDir[0]) * dt;
    steer += aT * (1 - Math.cos(Math.atan2(vr, vt) - gr)) * dt;
    vIdeal += aT * dt;

    // --- sample ---
    if (t >= nextSample) {
      series.push({
        t, alt: h / 1000, v: v, vr, vt, down: phi * RE / 1000, q: q / 1000, mach: M,
        mass: m / 1000, thrust: thrust / 1e6, thr, pitch: gamma, accel: aT / G0, stage,
        propB: mBoostProp / 1000, propS: mShipProp / 1000, vIdeal, drag, grav, steer,
      });
      nextSample += sample;
    }

    // --- integrate ---
    vr += ar * dt; vt += at * dt;
    r += vr * dt; phi += (vt / r) * dt;
    if (mdot > 0) { if (stage === 1) mBoostProp -= mdot * dt; else mShipProp -= mdot * dt; }
    t += dt;

    // --- events ---
    if (stage === 1 && mBoostProp <= VEH.boosterReserve) {
      stage = 2; tMeco = t; vrStage = Math.max(0, vr);
    }
    if (stage === 2 && tSeco === null && mShipProp <= 0) { tSeco = t; }
    if (r < RE) { status = 'crashed'; note = 'Hit the ground before reaching space.'; break; }
    if (tSeco !== null && (t - tSeco) > 40) break;
    if (q > VEH.qLimit * 1.35) { status = 'broke'; note = 'Aerodynamic load far beyond the structure limit.'; break; }
  }

  // --- orbit analysis ---
  const v = Math.hypot(vr, vt);
  const eps = v * v / 2 - MU / r;
  const hAng = r * vt;
  let ra = null, rp = null, ecc = null;
  if (eps < 0) {
    const a = -MU / (2 * eps);
    ecc = Math.sqrt(Math.max(0, 1 + 2 * eps * hAng * hAng / (MU * MU)));
    ra = a * (1 + ecc) - RE; rp = a * (1 - ecc) - RE;
  }
  const summary = {
    status, note, tMeco, tSeco, qMax, tQmax, apogee: ra, perigee: rp, ecc,
    vFinal: v, altFinal: r - RE, downFinal: phi * RE,
    dvIdeal: vIdeal, dragLoss: drag, gravLoss: grav, steerLoss: steer,
    qOver: qMax > VEH.qLimit,
    orbit: status === 'flying' && rp !== null && rp > 100000,
    payload: P.payload,
  };
  if (status === 'flying') {
    if (summary.orbit) note = 'Stable orbit. Perigee ' + Math.round(rp / 1000) + ' km.';
    else if (rp !== null && rp > -RE * 0.05) note = 'Suborbital: perigee is ' + Math.round(rp / 1000) + ' km, so it comes back down (like the test flights).';
    else note = 'Suborbital: falls back before completing one orbit.';
    if (qMax > VEH.qLimit) note += ' Max-Q exceeded the structure limit.';
  }
  summary.note = note;
  return { series, summary, params: P };
}
