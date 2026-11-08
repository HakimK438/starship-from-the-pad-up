// Procedural Starship (Super Heavy booster + ship). Proportions from the Starship Report:
// 9 m diameter, booster 71 m, ship 50 m, 121 m stacked. 33 booster Raptors, 6 ship Raptors.
// Origin of each stage is the centre of its base. +y is the stage axis.
import * as THREE from 'three';

const R = 4.5;
export const DIM = { R, boosterH: 71, shipH: 50, stackH: 121 };

function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// brushed stainless with a weld seam every ring (1.83 m)
function steelTexture(ringsAround = 1) {
  const draw = (g, w, h) => {
    g.fillStyle = '#c9ced4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${150 + Math.random() * 90},${155 + Math.random() * 90},${165 + Math.random() * 90},0.08)`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 40, 1); }
    // faint vertical panel streaks
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,95,105,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, 0, 1 + Math.random() * 3, h); }
    g.fillStyle = 'rgba(60,64,72,0.55)'; g.fillRect(0, h - 3, w, 3);       // weld seam
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, h - 5, w, 1.5);
  };
  return canvasTex(512, 128, draw, [ringsAround, 1]);
}
function tileTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h / s + 1; y++) for (let x = 0; x < w / s + 1; x++) {
      const ox = (y % 2) * s / 2;
      g.fillStyle = `rgb(${14 + Math.random() * 10},${14 + Math.random() * 10},${16 + Math.random() * 10})`;
      g.beginPath();
      const cx = x * s + ox, cy = y * s * 0.87, rr = s * 0.54;
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.9)'; g.lineWidth = 2; g.stroke();
    }
  }, [6, 12]);
}
function slotTexture() {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#25272c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0a0a0c';
    for (let x = 0; x < w; x += 16) g.fillRect(x + 3, 8, 8, h - 16);
  }, [4, 1]);
}
function latticeTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#9aa0a8';
    const n = 8, t = 4;
    for (let i = 0; i <= n; i++) { g.fillRect(i * (w - t) / n, 0, t, h); g.fillRect(0, i * (h - t) / n, w, t); }
  });
}

function bellGeometry(exitR, len, throatR = 0.16) {
  const pts = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = throatR + (exitR - throatR) * Math.pow(t, 0.62);   // parabolic-ish bell
    pts.push(new THREE.Vector2(r, -len * t));
  }
  pts.push(new THREE.Vector2(exitR - 0.05, -len));
  const g = new THREE.LatheGeometry(pts, 18);
  return g;
}

export function createVehicle() {
  const root = new THREE.Group();
  const booster = new THREE.Group(), ship = new THREE.Group();
  root.add(booster, ship);

  const hullMats = [];
  const steelMat = (ringHeight) => {
    const m = new THREE.MeshStandardMaterial({
      // 304L stainless: bright, mildly rough metal. Full metalness made it a pure mirror of the dusk sky (navy).
      color: 0xe6e9ee, metalness: 0.82, roughness: 0.34, map: steelTexture(1), bumpMap: null,
    });
    m.map.repeat.set(1, Math.max(1, ringHeight / 1.83));
    hullMats.push(m); return m;
  };
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tileTexture(), metalness: 0.15, roughness: 0.55 });
  hullMats.push(tileMat);
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x3a3733, metalness: 0.85, roughness: 0.5 });
  const copper = new THREE.MeshStandardMaterial({ color: 0x7b5a3f, metalness: 0.9, roughness: 0.4 });
  const loxMat = new THREE.MeshStandardMaterial({ color: 0x8fc4ff, metalness: 0.4, roughness: 0.35, emissive: 0x1c4a8a, emissiveIntensity: 0.55, transparent: true, opacity: 0 });
  const ch4Mat = new THREE.MeshStandardMaterial({ color: 0xffb25e, metalness: 0.4, roughness: 0.35, emissive: 0x9a4a10, emissiveIntensity: 0.5, transparent: true, opacity: 0 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xb9c4d4, metalness: 0.8, roughness: 0.35, transparent: true, opacity: 0 });
  const innerMats = [loxMat, ch4Mat, pipeMat];

  const sections = [];      // {group, y0, y1, vehicle}
  const parts = {};         // id -> {obj, label, anchor}
  const section = (veh, name, y0, y1) => {
    const g = new THREE.Group(); g.name = name; g.position.y = y0;
    (veh === 'booster' ? booster : ship).add(g);
    const s = { group: g, y0, y1, veh, name, base: y0 };
    sections.push(s); return s;
  };
  const cyl = (h, mat, y = 0, r = R) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64, 1, true), mat); m.position.y = y + h / 2; return m; };
  const cap = (r, mat, up = true) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat); if (!up) m.rotation.x = Math.PI; return m; };
  const register = (id, label, obj, anchor) => { parts[id] = { id, label, obj, anchor: anchor || new THREE.Vector3() }; };

  // ====================== BOOSTER ======================
  // B1 engine section 0..5 (33 Raptors)
  const bEng = section('booster', 'Engine section', 0, 5);
  bEng.group.add(cyl(5, steelMat(5)));
  const skirt = cyl(1.4, darkMetal, 0, R + 0.02); bEng.group.add(skirt);
  const bellSL = bellGeometry(0.6, 2.3);
  const bMat = new THREE.MeshStandardMaterial({ color: 0x4a4540, metalness: 0.9, roughness: 0.45, side: THREE.DoubleSide, emissive: 0x000000 });
  const bPos = [];
  for (let i = 0; i < 3; i++) { const a = i / 3 * 6.2832 + 0.5; bPos.push([Math.cos(a) * 0.98, Math.sin(a) * 0.98, 'inner']); }
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832 + 0.15; bPos.push([Math.cos(a) * 2.45, Math.sin(a) * 2.45, 'mid']); }
  for (let i = 0; i < 20; i++) { const a = i / 20 * 6.2832; bPos.push([Math.cos(a) * 3.85, Math.sin(a) * 3.85, 'outer']); }
  const bEngines = new THREE.InstancedMesh(bellSL, bMat, bPos.length);
  const m4 = new THREE.Matrix4();
  bPos.forEach(([x, z], i) => { m4.makeTranslation(x, 0.9, z); bEngines.setMatrixAt(i, m4); });
  bEngines.instanceMatrix.needsUpdate = true; bEngines.frustumCulled = false;
  bEng.group.add(bEngines);
  // engine chambers + plumbing inside the skirt
  const chambers = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.5, 1.5, 10), copper, bPos.length);
  bPos.forEach(([x, z], i) => { m4.makeTranslation(x, 1.9, z); chambers.setMatrixAt(i, m4); });
  chambers.instanceMatrix.needsUpdate = true; chambers.frustumCulled = false; bEng.group.add(chambers);
  const bNozzles = bPos.map(([x, z]) => new THREE.Vector3(x, 0.9 - 2.3, z));
  register('boosterRaptors', '33 Raptor engines', bEng.group, new THREE.Vector3(0, -1, 4.6));

  // B2 methane tank 5..31 + LOX downcomer
  const bCH4 = section('booster', 'Methane tank', 5, 31);
  bCH4.group.add(cyl(26, steelMat(26)));
  const ch4t = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.25, R - 0.25, 25.5, 40), ch4Mat); ch4t.position.y = 13; bCH4.group.add(ch4t);
  const down = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 29, 16), pipeMat); down.position.y = 11.5; bCH4.group.add(down);
  register('boosterCH4', 'Methane tank', bCH4.group, new THREE.Vector3(0, 13, 4.6));
  register('downcomer', 'LOX downcomer', down, new THREE.Vector3(0, 6, 0));

  // B3 LOX tank 31..66
  const bLOX = section('booster', 'Liquid-oxygen tank', 31, 66);
  bLOX.group.add(cyl(35, steelMat(35)));
  const loxt = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.25, R - 0.25, 34.5, 40), loxMat); loxt.position.y = 17.5; bLOX.group.add(loxt);
  register('boosterLOX', 'Liquid-oxygen tank', bLOX.group, new THREE.Vector3(0, 17, 4.6));

  // B4 hot-stage ring + grid fins 66..71
  const bTop = section('booster', 'Hot-stage ring and grid fins', 66, 71);
  bTop.group.add(cyl(2.2, steelMat(2.2)));
  const slots = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 2.8, 64, 1, true), new THREE.MeshStandardMaterial({ map: slotTexture(), metalness: 0.6, roughness: 0.6 }));
  slots.position.y = 3.6; bTop.group.add(slots);
  register('hotstage', 'Hot-stage ring', slots, new THREE.Vector3(0, 3.6, 4.6));
  const finMat = new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 0.9, roughness: 0.4, map: latticeTexture(), alphaTest: 0.5, side: THREE.DoubleSide });
  const gridFins = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const hinge = new THREE.Group();
    hinge.position.set(Math.cos(a) * (R + 0.05), 0.2, Math.sin(a) * (R + 0.05));
    hinge.rotation.y = -a + Math.PI / 2;                        // local +z along the hull surface, local +x radial
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.8), finMat);
    fin.position.set(0, 0, 3.1); fin.rotation.y = Math.PI / 2;        // stowed: lying flat against the hull
    const pivot = new THREE.Group(); pivot.add(fin); hinge.add(pivot);
    bTop.group.add(hinge); gridFins.push({ pivot, fin });
  }
  register('gridfin', 'Grid fins', gridFins[0].pivot, new THREE.Vector3(0, 0, 3.1));

  // ====================== SHIP ======================
  // S1 engine bay 0..8 + aft flaps + 6 Raptors
  const sEng = section('ship', 'Ship engine bay', 0, 8);
  sEng.group.add(cyl(8, steelMat(8)));
  const sBase = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.1, R - 0.1, 0.4, 48), darkMetal); sBase.position.y = 0.2; sEng.group.add(sBase);
  const bellRVac = bellGeometry(1.15, 3.1, 0.2);
  const rslPos = [], rvPos = [];
  for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + i * 2.0944; rslPos.push([Math.cos(a) * 1.0, Math.sin(a) * 1.0]); }
  for (let i = 0; i < 3; i++) { const a = Math.PI / 6 + i * 2.0944; rvPos.push([Math.cos(a) * 2.85, Math.sin(a) * 2.85]); }
  const sRSL = new THREE.InstancedMesh(bellSL, bMat, 3), sRV = new THREE.InstancedMesh(bellRVac, bMat, 3);
  rslPos.forEach(([x, z], i) => { m4.makeTranslation(x, 0.6, z); sRSL.setMatrixAt(i, m4); });
  rvPos.forEach(([x, z], i) => { m4.makeTranslation(x, 0.6, z); sRV.setMatrixAt(i, m4); });
  sRSL.frustumCulled = sRV.frustumCulled = false; sEng.group.add(sRSL, sRV);
  const sNozzles = [
    ...rslPos.map(([x, z]) => new THREE.Vector3(x, 0.6 - 2.3, z)),
    ...rvPos.map(([x, z]) => new THREE.Vector3(x, 0.6 - 3.1, z)),
  ];
  register('shipRaptors', '6 Raptors: 3 sea-level + 3 vacuum', sEng.group, new THREE.Vector3(0, 1, 4.6));

  // S2 main tanks 8..32
  const sTanks = section('ship', 'Ship main tanks', 8, 32);
  sTanks.group.add(cyl(24, steelMat(24)));
  const sLox = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.25, R - 0.25, 13.5, 40), loxMat); sLox.position.y = 17.5; sTanks.group.add(sLox);
  const sCh4 = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.25, R - 0.25, 10, 40), ch4Mat); sCh4.position.y = 5.2; sTanks.group.add(sCh4);
  register('shipTanks', 'Main propellant tanks', sTanks.group, new THREE.Vector3(0, 12, 4.6));

  // S3 header tanks + forward flaps 32..38
  const sHdr = section('ship', 'Header tanks', 32, 38);
  sHdr.group.add(cyl(6, steelMat(6)));
  const hLox = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.8, 24), loxMat); hLox.position.set(-1.8, 3, 0); sHdr.group.add(hLox);
  const hCh4 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.0, 24), ch4Mat); hCh4.position.set(1.9, 3, 0); sHdr.group.add(hCh4);
  register('headerTanks', 'Header tanks', sHdr.group, new THREE.Vector3(0, 3, 4.6));

  // S4 nose and payload bay 38..50
  const sNose = section('ship', 'Nose and payload bay', 38, 50);
  const noseR = 4.5, noseL = 12;
  const rho = (noseR * noseR + noseL * noseL) / (2 * noseR);
  const nosePts = [];
  for (let i = 0; i <= 28; i++) { const x = (i / 28) * noseL; const y = Math.sqrt(Math.max(rho * rho - x * x, 0)) + noseR - rho; nosePts.push(new THREE.Vector2(Math.max(y, 0.01), x)); }
  const noseGeo = new THREE.LatheGeometry(nosePts, 64);
  const noseMat = steelMat(10);
  const noseMesh = new THREE.Mesh(noseGeo, noseMat); sNose.group.add(noseMesh);
  const payloadMat = new THREE.MeshStandardMaterial({ color: 0xd8dde6, metalness: 0.2, roughness: 0.5, transparent: true, opacity: 0, wireframe: true });
  innerMats.push(payloadMat);
  const payload = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, 9, 24, 3), payloadMat); payload.position.y = 5.3; sNose.group.add(payload);
  register('nose', 'Nosecone and payload bay (about 1,000 m³)', sNose.group, new THREE.Vector3(0, 8, 3.2));

  // heat shield: black tiles over the windward half (centred on -z), shell wraps the whole ship
  const shieldGroup = new THREE.Group(); ship.add(shieldGroup);
  const shieldBody = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, 36, 48, 1, true, Math.PI * 0.5 + 0.05, Math.PI - 0.1), tileMat);
  // CylinderGeometry theta 0 is +z; start so the half covers -z
  shieldBody.position.y = 2 + 18; shieldBody.rotation.y = 0;
  const shieldNosePts = nosePts.map(p => new THREE.Vector2(p.x + 0.05, p.y));
  const shieldNose = new THREE.Mesh(new THREE.LatheGeometry(shieldNosePts, 48, Math.PI * 0.5 + 0.05, Math.PI - 0.1), tileMat);
  shieldNose.position.y = 38;
  shieldGroup.add(shieldBody, shieldNose);
    register('tiles', 'Heat-shield tiles', shieldBody, new THREE.Vector3(0, 0, -4.7));

  // flaps: trapezoid plates, stowed against the hull, hinge on the windward edge
  const flapShape = (span, chord, tipChord) => {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(span, (chord - tipChord) / 2); s.lineTo(span, (chord + tipChord) / 2); s.lineTo(0, chord); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false });
    g.translate(0, -chord / 2, -0.25); return g;
  };
  const flapMat = new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.3, roughness: 0.55 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xcfd3d9, metalness: 1, roughness: 0.35 });
  const makeFlap = (side, y, span, chord, tip) => {
    const hinge = new THREE.Group();
    hinge.position.set(side * (R - 0.15), y, -3.0);               // near the windward edge
    const pivot = new THREE.Group(); hinge.add(pivot);
    const plate = new THREE.Mesh(flapShape(span, chord, tip), flapMat);
    // plate lies in the plane tangent to the hull (stowed). local +x is outward along span after rotation.
    plate.rotation.set(0, 0, 0);
    pivot.add(plate);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.55), edgeMat); rim.position.set(span, 0, 0); rim.scale.set(1, chord * 4.6, 1); pivot.add(rim);
    ship.add(hinge);
    return { hinge, pivot, side };
  };
  const flaps = {
    fwd: [makeFlap(-1, 33.5, 4.6, 7.2, 4.4), makeFlap(1, 33.5, 4.6, 7.2, 4.4)],
    aft: [makeFlap(-1, 6.8, 6.4, 11.5, 7.5), makeFlap(1, 6.8, 6.4, 11.5, 7.5)],
  };
  register('fwdflap', 'Forward flaps', flaps.fwd[0].pivot, new THREE.Vector3(-3, 33.5, 0));
  register('aftflap', 'Aft flaps', flaps.aft[0].pivot, new THREE.Vector3(-3, 6.8, 0));
  // sections own the hull visual; flaps live on the ship root so explode can offset them with their section
  const flapSections = { fwd: sHdr, aft: sEng };

  // ---------- state setters ----------
  let explodeAmt = 0, xrayAmt = 0, flapFwd = 0, flapAft = 0;
  const gaps = { booster: 5, ship: 5 };
  function layout() {
    const bs = sections.filter(s => s.veh === 'booster'), ss = sections.filter(s => s.veh === 'ship');
    bs.forEach((s, i) => { s.group.position.y = s.base + explodeAmt * i * 9; });
    ss.forEach((s, i) => { s.group.position.y = s.base + explodeAmt * i * 9; });
    // flaps and shield follow their section so they do not float
    const eAft = explodeAmt * ss.indexOf(flapSections.aft) * 9, eFwd = explodeAmt * ss.indexOf(flapSections.fwd) * 9;
    flaps.aft.forEach(f => { f.hinge.position.y = 6.8 + eAft; });
    flaps.fwd.forEach(f => { f.hinge.position.y = 33.5 + eFwd; });
    shieldGroup.position.y = explodeAmt * 9 * 1.5;
    gridFins.forEach(g => { g.pivot.parent.position.y = 0.2; });
  }
  function applyFlaps() {
    // 0 = stowed against the hull (plate folded toward +z), 1 = out at 90 degrees as a belly-flop wing
    const set = (arr, d) => arr.forEach(f => { f.pivot.scale.x = f.side; f.pivot.rotation.y = -f.side * (1 - d) * Math.PI / 2 * 0.97; });
    set(flaps.fwd, flapFwd); set(flaps.aft, flapAft);
  }
  applyFlaps();

  return {
    root, booster, ship, parts, sections, bNozzles, sNozzles, flaps, gridFins, hullMats,
    setExplode(x) { explodeAmt = x; layout(); },
    setXray(x) {
      xrayAmt = x;
      hullMats.forEach(m => { m.transparent = x > 0.01; m.opacity = 1 - 0.9 * x; m.depthWrite = x < 0.25; m.needsUpdate = true; });
      innerMats.forEach(m => { m.opacity = Math.min(1, x * 1.4) * (m === payloadMat ? 0.9 : 0.92); m.visible = x > 0.01; });
      bMat.opacity = 1;
    },
    setFlaps(fwd, aft) { flapFwd = fwd; flapAft = aft; applyFlaps(); },
    setGridFins(x) { gridFins.forEach(g => { g.pivot.rotation.y = -x * Math.PI / 2; g.pivot.position.z = 0; }); },
    setEngineHeat(b, s) { bMat.emissive.setRGB(0.9 * b, 0.28 * b, 0.05 * b); bMat.emissiveIntensity = 0.5 * Math.max(b, s); },
    partWorld(id, out = new THREE.Vector3()) {
      const p = parts[id]; if (!p) return out.set(0, 0, 0);
      out.copy(p.anchor); p.obj.localToWorld(out); return out;
    },
  };
}
