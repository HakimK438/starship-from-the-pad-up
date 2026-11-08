// Visual effects: Raptor plumes, launch steam, vapour trail, pad deluge, re-entry plasma.
// Everything is a pure function of time/uniforms so scrubbing the page back and forth stays consistent.
import * as THREE from 'three';
import { NOISE, finish } from './world.js';

export const fxShared = {
  uScale: { value: 800 },   // pixels per (unit at distance 1): renderHeight / (2 tan(fov/2))
  uTime: { value: 0 },
};

// ---------------- plume ----------------
const PLUME_VERT = /* glsl */`
uniform float uLen, uR0, uSpread, uVac, uThr, uTime;
varying float vV; varying vec3 vN; varying vec3 vView; varying float vAng; varying float vId;
void main(){
  float v = -position.y;
  float neck = 1.0 - 0.38*v*(1.0-uVac);
  float r = uR0 * (1.0 + uSpread*pow(v, 0.85)) * neck;
  vec3 p = vec3(position.x*r, position.y*uLen, position.z*r);
  vec3 n = normalize(vec3(position.x, 0.0, position.z));
  vec4 wp = vec4(p, 1.0);
  float id = 0.0;
  #ifdef USE_INSTANCING
    wp = instanceMatrix * wp;
    n = mat3(instanceMatrix) * n;
    id = float(gl_InstanceID);
  #endif
  vec4 mv = modelViewMatrix * wp;
  vV = v; vN = normalize(normalMatrix * n); vView = -mv.xyz; vAng = atan(position.z, position.x); vId = id;
  gl_Position = projectionMatrix * mv;
}`;
const PLUME_FRAG = /* glsl */`
${NOISE}
uniform float uLen, uVac, uThr, uTime, uBright, uGain;
varying float vV; varying vec3 vN; varying vec3 vView; varying float vAng; varying float vId;
void main(){
  float f = abs(dot(normalize(vN), normalize(vView)));
  float v = vV;
  float flick = 0.86 + 0.14*sin(uTime*45.0 + vId*3.1 + v*22.0);
  float turb = vnoise(vec2(vAng*2.0 + vId, v*9.0 - uTime*16.0));
  float turb2 = vnoise(vec2(vAng*5.0 - vId, v*26.0 - uTime*30.0));
  // Mach diamonds: a train of bright shock cells in the near field of an over/under-expanded jet.
  // They are sharp near the nozzle and smear out as the shear layer mixes in; gone in vacuum.
  float cell = pow(abs(cos(v*uLen*0.55 + vId*0.7)), 8.0);
  float dia = 1.0 + 1.6*cell*smoothstep(0.55, 0.05, v)*(1.0 - uVac);
  float cool = clamp(v*1.35 + (1.0 - f)*0.6 + (turb-0.5)*0.3, 0.0, 1.0);
  // sea level methalox: yellow-white core, saturated orange body, smoky red edge.
  vec3 sl = cool < 0.18 ? mix(vec3(1.0,0.90,0.70), vec3(1.0,0.68,0.25), cool/0.18)
          : cool < 0.55 ? mix(vec3(1.0,0.68,0.25), vec3(1.0,0.36,0.06), (cool-0.18)/0.37)
                        : mix(vec3(1.0,0.36,0.06), vec3(0.35,0.05,0.02), (cool-0.55)/0.45);
  // vacuum: the gas expands into a huge, faint, violet-blue cone (CO/OH/CH emission, no afterburning)
  vec3 vc = cool < 0.2 ? mix(vec3(0.95,0.9,1.0), vec3(0.58,0.62,1.0), cool/0.2)
          : mix(vec3(0.58,0.62,1.0), vec3(0.72,0.42,0.9), clamp((cool-0.2)/0.6, 0.0, 1.0));
  vec3 col = mix(sl, vc, uVac);
  float tail = 1.0 - smoothstep(mix(0.35, 0.15, uVac), 1.0, v);
  float body = pow(f, mix(1.2, 2.2, uVac)) * tail * (0.75 + 0.5*turb2);
  float a = body * dia * flick * mix(0.9, 0.22, uVac) * uThr;
  // small white-hot core right at the exit plane
  float core = smoothstep(0.07, 0.0, v) * pow(f, 0.8);
  col = mix(col, vec3(1.0,0.95,0.85), core*0.7);
  a += core * 0.8 * uThr;
  gl_FragColor = vec4(col * uBright, clamp(a * uGain, 0.0, 1.0));
}`;

export function createPlume(nozzles, { r0 = 0.62, baseLen = 36 } = {}) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 16, 14, true);
  g.translate(0, -0.5, 0);
  const uniforms = {
    uLen: { value: baseLen }, uR0: { value: r0 }, uSpread: { value: 0.9 }, uVac: { value: 0 },
    uThr: { value: 0 }, uTime: fxShared.uTime, uBright: { value: 0.85 }, uGain: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: PLUME_VERT, fragmentShader: finish(PLUME_FRAG),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(g, mat, nozzles.length);
  const m = new THREE.Matrix4();
  nozzles.forEach((p, i) => { m.makeTranslation(p.x, p.y, p.z); mesh.setMatrixAt(i, m); });
  mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; mesh.renderOrder = 10;
  mesh.visible = false;
  return {
    mesh, uniforms,
    // thr 0..1, alt in metres: plume widens and turns blue-violet as the air thins
    set(thr, altM, scaleLen = 1) {
      const vac = 1 - Math.exp(-altM / 16000);
      uniforms.uThr.value = thr; uniforms.uVac.value = vac;
      uniforms.uSpread.value = 0.9 + 15 * vac * vac;
      uniforms.uLen.value = baseLen * (0.45 + 0.55 * thr) * (1 + 0.8 * vac) * scaleLen;
      mesh.visible = thr > 0.01;
    },
    // many additive cones overlap: scale each one so 33 engines read as a fire, not a white blob
    setCount(n) { mesh.count = n; uniforms.uGain.value = Math.min(1, 1.5 / Math.sqrt(Math.max(1, n))); },
  };
}

// ---------------- steam / dust cloud ----------------
const STEAM_VERT = /* glsl */`
attribute vec4 aSeed;
uniform float uT, uScale, uSize, uFire, uSpread;
uniform vec3 uOrigin;
varying float vA; varying float vOrange; varying float vSeed; varying float vShade;
void main(){
  float birth = aSeed.x * 13.0 - 1.0;
  float age = uT - birth;
  float life = 46.0;
  float ang = aSeed.y * 6.2832;
  // the flame trench / deflector turns the jet sideways: steam and dust race outward along the ground
  // and decelerate (exp drag), then slowly rise as the warm cloud becomes buoyant.
  float a0 = max(age, 0.0);
  float spd = 25.0 + aSeed.z * 75.0;
  float tau = 2.5 + aSeed.w * 4.0;
  float rad = 12.0 + spd * tau * (1.0 - exp(-a0/tau)) * uSpread;
  float rise = 1.5 + aSeed.z*5.0 + a0 * (0.3 + aSeed.w*aSeed.w*2.2) + 30.0*(1.0-exp(-a0/14.0))*aSeed.w*aSeed.w;
  vec3 pos = uOrigin + vec3(cos(ang)*rad, rise, sin(ang)*rad);
  // billow: slow swirl
  pos.x += sin(a0*0.35 + aSeed.y*20.0) * 3.0; pos.z += cos(a0*0.31 + aSeed.w*20.0) * 3.0;
  float size = (16.0 + a0 * 6.5 * (0.5 + aSeed.w)) * (0.6 + 0.8*aSeed.z);
  size = min(size, 210.0) * uSize;
  float vis = step(0.0, age) * step(age, life);
  vA = vis * smoothstep(0.0, 1.2, age) * (1.0 - smoothstep(life*0.3, life*0.85, age));
  float glowR = exp(-rad/180.0);
  vOrange = clamp((1.0 - age/14.0), 0.0, 1.0) * glowR * uFire;
  vShade = rise / 120.0;
  vSeed = aSeed.x*17.0 + aSeed.y*31.0;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  // puffs that swallow the camera become a flat veil: fade them out up close
  vA *= smoothstep(0.35, 1.6, -mv.z / max(size, 1.0));
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(size * uScale / max(-mv.z, 1.0), 0.0, 700.0) * vis;
}`;
const STEAM_FRAG = /* glsl */`
${NOISE}
uniform vec3 uSunTint; uniform float uDim;
varying float vA; varying float vOrange; varying float vSeed; varying float vShade;
float puff(vec2 p){ float s=0.0, a=0.55; for(int i=0;i<3;i++){ s += a*vnoise(p); p = p*2.1 + 5.3; a*=0.5; } return s; }
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c)*2.0;
  if(d > 1.0 || vA < 0.003) discard;
  float n = puff(c*2.6 + vSeed);
  float n2 = puff(c*7.0 - vSeed*1.7);
  float shape = smoothstep(1.0, 0.15, d + (n-0.5)*0.9 + (n2-0.5)*0.25); shape *= shape;
  // volume cue: tops catch the low sun and sky, undersides sit in shadow or in the engine glow
  float up = 1.0 - gl_PointCoord.y;
  vec3 grey = vec3(0.86,0.84,0.84) * uSunTint * (0.48 + 0.6*up + 0.2*(n2-0.5));
  vec3 fire = vec3(1.0,0.50,0.14) * (1.25 + 0.7*n);
  float underGlow = clamp(vOrange*(0.6 + 0.9*gl_PointCoord.y), 0.0, 1.0);
  vec3 col = mix(grey, fire, underGlow);
  col *= uDim;
  gl_FragColor = vec4(col, shape * vA * 0.5);
}`;

export function createSteam({ count = 900, origin = new THREE.Vector3(0, 6, 0), size = 1, spread = 1 } = {}) {
  const geo = new THREE.BufferGeometry();
  const seed = new Float32Array(count * 4);
  let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < count * 4; i++) seed[i] = rnd();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const uniforms = {
    uT: { value: -10 }, uScale: fxShared.uScale, uSize: { value: size }, uFire: { value: 1 }, uSpread: { value: spread },
    uOrigin: { value: origin.clone() }, uSunTint: { value: new THREE.Color(1.0, 0.86, 0.78) }, uDim: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: STEAM_VERT, fragmentShader: finish(STEAM_FRAG), transparent: true, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5; pts.visible = false;
  return { points: pts, uniforms, set(t, fire = 1) { uniforms.uT.value = t; uniforms.uFire.value = fire; pts.visible = t > -1 && t < 60; } };
}

// ---------------- ground fire at ignition ----------------
// The deflector turns the exhaust 90°: a sheet of flame races out along the pad and rolls up into the steam.
// Each puff is born, runs outward, cools from yellow-white through orange to smoky red, and dies within ~3 s.
const FIRE_VERT = /* glsl */`
attribute vec4 aSeed;
uniform float uT, uScale, uAmt;
varying float vA; varying float vHeat; varying float vSeed;
void main(){
  float birth = 0.3 + aSeed.x * 16.0;
  float life = 1.4 + aSeed.w * 1.8;
  float age = uT - birth;
  float k = clamp(age / life, 0.0, 1.0);
  float ang = aSeed.y * 6.2832;
  float spd = 55.0 + aSeed.z * 70.0;
  float rad = 14.0 + spd * 1.2 * (1.0 - exp(-max(age,0.0)/1.2));
  float rise = 1.0 + aSeed.z*4.0 + 9.0*k*k*(0.5 + aSeed.w);
  vec3 pos = vec3(cos(ang)*rad, rise, sin(ang)*rad);
  float size = (9.0 + 26.0*k) * (0.7 + 0.6*aSeed.z);
  float vis = step(0.0, age) * step(age, life);
  vA = vis * smoothstep(0.0, 0.08, k) * (1.0 - smoothstep(0.45, 1.0, k)) * uAmt;
  vHeat = 1.0 - k;
  vSeed = aSeed.x*23.0 + aSeed.z*7.0;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(size * uScale / max(-mv.z, 1.0), 0.0, 600.0) * vis;
}`;
const FIRE_FRAG = /* glsl */`
${NOISE}
varying float vA; varying float vHeat; varying float vSeed;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0;
  if(d > 1.0 || vA < 0.003) discard;
  float n = vnoise(c*5.0 + vSeed) * 0.6 + vnoise(c*11.0 - vSeed) * 0.4;
  float shape = smoothstep(1.0, 0.1, d + (n-0.5)*0.9);
  vec3 col = vHeat > 0.65 ? mix(vec3(1.0,0.55,0.16), vec3(1.0,0.80,0.45), (vHeat-0.65)/0.35)
           : vHeat > 0.3 ? mix(vec3(0.95,0.32,0.06), vec3(1.0,0.62,0.22), (vHeat-0.3)/0.35)
           : mix(vec3(0.25,0.06,0.02), vec3(0.95,0.32,0.06), vHeat/0.3);
  gl_FragColor = vec4(col * (1.0 + 0.9*vHeat), shape * vA * 0.7);
}`;
export function createFire(count = 700) {
  const geo = new THREE.BufferGeometry();
  const seed = new Float32Array(count * 4); let s = 777; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < seed.length; i++) seed[i] = rnd();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const uniforms = { uT: { value: -10 }, uScale: fxShared.uScale, uAmt: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: FIRE_VERT, fragmentShader: finish(FIRE_FRAG), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 7; pts.visible = false;
  return { points: pts, uniforms, set(t, amt) { uniforms.uT.value = t; uniforms.uAmt.value = amt; pts.visible = amt > 0.01 && t > 0 && t < 20; } };
}

// ---------------- vapour trail ----------------
const TRAIL_VERT = /* glsl */`
attribute float aU; attribute float aSeed;
uniform float uScale, uSize;
varying float vA; varying float vS;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float alt = position.y;
  float thin = 1.0 - smoothstep(18000.0, 52000.0, alt);       // the trail disappears as the air thins
  float behind = 1.0 - aU;                                    // 0 at the rocket, 1 at the pad
  float size = (6.0 + behind*55.0 + aSeed*10.0) * uSize;
  vA = thin * smoothstep(0.0, 0.02, behind) * (1.0 - 0.55*behind);
  vS = aSeed;
  gl_PointSize = clamp(size * uScale / max(-mv.z, 1.0), 0.0, 400.0);
}`;
const TRAIL_FRAG = /* glsl */`
${NOISE}
uniform vec3 uTint; varying float vA; varying float vS;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c)*2.0;
  if(d > 1.0 || vA < 0.004) discard;
  float n = vnoise(c*4.0 + vS*40.0);
  float shape = smoothstep(1.0, 0.2, d + (n-0.5)*0.7);
  gl_FragColor = vec4(uTint, shape * vA * 0.38);
}`;
export function createTrail(count = 260) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), u = new Float32Array(count), sd = new Float32Array(count);
  for (let i = 0; i < count; i++) { u[i] = i / (count - 1); sd[i] = Math.random(); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aU', new THREE.BufferAttribute(u, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  const uniforms = { uScale: fxShared.uScale, uSize: { value: 1 }, uTint: { value: new THREE.Color(0.96, 0.9, 0.86) } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: TRAIL_VERT, fragmentShader: finish(TRAIL_FRAG), transparent: true, depthWrite: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 4; pts.visible = false;
  const tmp = new THREE.Vector3();
  return {
    points: pts, uniforms,
    // pathFn(u) -> Vector3 for u in [0,1] (0 = pad, 1 = current rocket position)
    update(pathFn, visible) {
      pts.visible = visible;
      if (!visible) return;
      const a = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        pathFn(u[i], tmp);
        const jitter = (1 - u[i]) * 14;
        a[i * 3] = tmp.x + (sd[i] - 0.5) * jitter; a[i * 3 + 1] = tmp.y; a[i * 3 + 2] = tmp.z + (sd[(i * 7) % count] - 0.5) * jitter;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// ---------------- water deluge ----------------
const DELUGE_VERT = /* glsl */`
attribute vec4 aSeed;
uniform float uT, uScale, uAmt;
varying float vA;
void main(){
  float life = 1.9;
  float tau = mod(uT*0.9 + aSeed.x*life, life);
  float ang = floor(aSeed.y*24.0)/24.0*6.2832 + aSeed.z*0.12;
  float vh = 12.0 + aSeed.w*14.0, vy = 9.0 + aSeed.z*9.0;
  float r = 15.0 + vh*tau;
  vec3 pos = vec3(cos(ang)*r, 2.5 + vy*tau - 4.9*tau*tau, sin(ang)*r);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = uAmt * smoothstep(0.0, 0.2, tau) * (1.0 - smoothstep(life*0.7, life, tau)) * step(0.0, pos.y);
  gl_PointSize = clamp(0.45 * uScale / max(-mv.z, 1.0), 1.0, 5.0);
}`;
const DELUGE_FRAG = /* glsl */`varying float vA; void main(){ float d = length(gl_PointCoord-0.5)*2.0; if(d>1.0||vA<0.01) discard; gl_FragColor = vec4(0.85,0.88,0.92, vA*(1.0-d)*0.35); }`;
export function createDeluge(count = 2400) {
  const geo = new THREE.BufferGeometry();
  const seed = new Float32Array(count * 4); for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const uniforms = { uT: { value: 0 }, uScale: fxShared.uScale, uAmt: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: DELUGE_VERT, fragmentShader: finish(DELUGE_FRAG), transparent: true, depthWrite: false });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 6; pts.visible = false;
  return { points: pts, uniforms, set(time, amt) { uniforms.uT.value = time; uniforms.uAmt.value = amt; pts.visible = amt > 0.01; } };
}

// ---------------- re-entry plasma ----------------
export function createPlasma(noseGeo) {
  const uniforms = { uI: { value: 0 }, uWind: { value: new THREE.Vector3(0, 0, -1) }, uTime: fxShared.uTime };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    // shock layer: the air piled up in front of the belly is compressed and heated until it glows.
    // Brightest where the flow hits head-on (stagnation region), a fresnel halo at the silhouette,
    // and pink-violet (ionised N2/O2 emission) on the flanks, like the real flight footage.
    vertexShader: /* glsl */`varying vec3 vWN; varying vec3 vWP; varying float vH; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vWP = w.xyz; vWN = normalize(mat3(modelMatrix)*normal); vH = position.y; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: finish(/* glsl */`
      ${NOISE}
      uniform float uI; uniform vec3 uWind; uniform float uTime;
      varying vec3 vWN; varying vec3 vWP; varying float vH;
      void main(){
        vec3 N = normalize(vWN), V = normalize(cameraPosition - vWP);
        vec3 wind = length(uWind) > 1e-4 ? normalize(uWind) : vec3(0.0,0.0,-1.0);
        float w = max(dot(N, wind), 0.0);
        float lee = 1.0 - w;
        float n = fbm(vec2(vH*0.35 - uTime*3.0, atan(N.z, N.x)*2.0 + uTime*1.5));
        float fres = pow(1.0 - abs(dot(N, V)), 2.5);
        float edge = pow(w, 1.2);
        float I = 1.4 * uI * (edge*(0.55+0.7*n)*(0.35 + 0.9*fres) + 0.35*lee*n*fres);
        vec3 hot = mix(vec3(1.0,0.42,0.16), vec3(1.0,0.86,0.66), pow(w, 4.0));
        hot = mix(hot, vec3(0.95,0.32,0.75), 0.55*lee);
        gl_FragColor = vec4(hot * 2.2, clamp(I, 0.0, 0.95));
      }`),
  });
  const mesh = new THREE.Mesh(noseGeo, mat); mesh.renderOrder = 11; mesh.visible = false; mesh.frustumCulled = false;
  return { mesh, uniforms, set(i) { uniforms.uI.value = i; mesh.visible = i > 0.01; } };
}
