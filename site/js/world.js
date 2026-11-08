// The place: sky, terrain, Gulf, the Earth for high altitude, launch mount and tower.
// Units are metres. +y is up, the rocket flies toward +x (east, over the Gulf).
import * as THREE from 'three';

export const RE = 6371000;

// Append three's tone-mapping/colour-space chunks so custom shaders match built-in materials
// whether they render to the screen or into the post-processing target.
export const finish = (src) => src.replace(/\}\s*$/, '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}');

// ---------- shared GLSL ----------
export const NOISE = /* glsl */`
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float hash31(vec3 p){ p = fract(p*0.3183099+vec3(.1,.2,.3)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
float vnoise3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x), mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x), f.y);
  float b=mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x), mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x), f.y);
  return mix(a,b,f.z); }
float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=0.5; } return s; }
float fbm3(vec3 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*vnoise3(p); p=p*2.07+11.3; a*=0.5; } return s; }
float sstep(float a, float b, float x){ float t = clamp((x-a)/(b-a), 0.0, 1.0); return t*t*(3.0-2.0*t); }
#define smoothstep sstep
`;

// Sunset sky. d: view direction, sun: sun direction, tw: 0 sunset .. 1 deep dusk
export const SKY = /* glsl */`
// the sun's disc and inner glow, drawn once along the true view direction
vec3 sunDisc(vec3 d, vec3 sun, float k){
  float s = max(dot(d, sun), 0.0);
  return vec3(1.0,0.82,0.55) * pow(s, 120.0) * 0.7 * k + vec3(1.0,0.95,0.85) * smoothstep(0.99965, 0.99985, s) * 14.0 * k;
}
vec3 skyBase(vec3 d, vec3 sun, float tw){
  float e = d.y;
  float az = max(dot(normalize(d.xz + 1e-5), normalize(sun.xz)), 0.0);
  float towardSun = pow(az, 3.0);
  vec3 zen  = mix(vec3(0.045,0.085,0.24), vec3(0.008,0.012,0.045), tw);
  vec3 mid  = mix(vec3(0.30,0.34,0.55),  vec3(0.06,0.06,0.17), tw);
  vec3 hazeB = mix(vec3(0.40,0.42,0.58), vec3(0.12,0.11,0.24), tw);
  vec3 hazeO = mix(vec3(0.92,0.42,0.17), vec3(0.50,0.18,0.20), tw);
  vec3 hor  = mix(hazeB, hazeO, towardSun);
  float h = clamp(e, 0.0, 1.0);
  vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, h));
  c = mix(c, zen, smoothstep(0.12, 0.85, h));
  c = mix(c, hor*0.55, smoothstep(0.0, -0.25, e));
  float s = max(dot(d, sun), 0.0);
  c += vec3(1.0,0.55,0.22) * pow(s, 8.0) * 0.30 * (1.0 - tw*0.7);
  return c;
}
vec3 skyCol(vec3 d, vec3 sun, float tw){ return skyBase(d, sun, tw) + sunDisc(d, sun, 1.0 - tw); }
`;

const GROUND_GLSL = /* glsl */`
${NOISE}
${SKY}
uniform vec3 uSun; uniform float uTw; uniform float uFade; uniform float uTime;
uniform vec3 uGlowPos; uniform float uGlow;
varying vec3 vW;

float shoreX(float z){ return 1650.0 + 90.0*sin(z*0.0021) + 40.0*sin(z*0.0083+1.3); }

void main(){
  vec3 V = normalize(cameraPosition - vW);
  vec3 up = vec3(0.0,1.0,0.0);
  vec3 col;
  vec2 p = vW.xz;
  float dist = length(vW - cameraPosition);
  float sx = shoreX(p.y);
  float dx = p.x - sx;

  // ---- land ----
  float n1 = fbm(p*0.0016);
  float n2 = fbm(p*0.012 + 3.0);
  float n3 = vnoise(p*0.35);
  vec3 sand  = vec3(0.64,0.55,0.42);
  vec3 salt  = vec3(0.78,0.74,0.66);
  vec3 scrub = vec3(0.17,0.19,0.11);
  vec3 wet   = vec3(0.20,0.17,0.14);
  vec3 land = mix(sand, salt, smoothstep(0.35,0.7,n1));
  land = mix(land, scrub, smoothstep(0.55,0.75,n2)*0.8);
  land = mix(land, wet, smoothstep(0.62,0.38,n1)*0.5);
  land *= 0.9 + 0.2*n3;

  // lagoon ponds on the tidal flat (west of the pad), mirror-like
  float pondMask = smoothstep(0.52, 0.58, fbm(p*0.0011 + vec2(7.0,2.0))) * smoothstep(-80.0, -400.0, p.x) ;
  pondMask *= smoothstep(150.0, 400.0, length(p));
  float lagoon = smoothstep(-1500.0, -2600.0, p.x) * 0.9;   // large lagoon far west
  pondMask = max(pondMask, lagoon * smoothstep(0.35,0.5,fbm(p*0.0004+3.0)));

  // pad concrete
  float r = length(p);
  vec3 concrete = vec3(0.50,0.50,0.52) * (0.85+0.15*vnoise(p*0.8));
  land = mix(land, concrete, smoothstep(95.0, 80.0, r));
  land = mix(land, vec3(0.16,0.16,0.18), smoothstep(30.0, 24.0, r));      // flame deflector plate

  // lighting for land: dusk ambient + warm low sun
  float sunUp = max(dot(up, uSun), 0.0);
  vec3 amb = mix(vec3(0.34,0.32,0.46), vec3(0.06,0.06,0.13), uTw);
  vec3 lit = amb + vec3(1.0,0.55,0.28) * sunUp * 1.2 * (1.0 - uTw);
  land *= lit;
  land += vec3(1.0,0.45,0.16) * pow(max(dot(-V, uSun),0.0), 8.0) * 0.06 * (1.0-uTw); // rim warm backlight

  // ---- water ----
  vec3 wn = normalize(vec3((vnoise(p*0.07 + uTime*0.15)-0.5)*0.25, 1.0, (vnoise(p*0.09 - uTime*0.12 + 9.0)-0.5)*0.25));
  vec3 R = reflect(-V, wn); R.y = abs(R.y);
  float fres = 0.04 + 0.96*pow(1.0 - max(dot(V, wn),0.0), 5.0);
  vec3 deep = mix(vec3(0.02,0.10,0.13), vec3(0.005,0.02,0.05), uTw);
  vec3 water = mix(deep, skyCol(R, uSun, uTw), clamp(fres*1.25, 0.0, 1.0));
  // glitter path: each wave facet that tilts the low sun into the eye flashes
  vec3 wn2 = normalize(vec3((vnoise(p*0.6 + uTime*0.9)-0.5)*0.5, 1.0, (vnoise(p*0.7 - uTime*0.8 + 4.0)-0.5)*0.5));
  vec3 R2 = reflect(-V, wn2);
  float glit = pow(max(dot(R2, uSun), 0.0), 900.0) * 9.0 + pow(max(dot(R, uSun), 0.0), 60.0) * 0.5;
  water += vec3(1.0,0.78,0.5) * glit * (1.0 - uTw);
  // calm lagoon is a near perfect mirror, with a softer sun streak
  vec3 Rl = reflect(-V, normalize(vec3(wn.x*0.15, 1.0, wn.z*0.15))); Rl.y = abs(Rl.y);
  vec3 pond = mix(deep*1.3, skyCol(Rl, uSun, uTw), clamp(0.15 + fres*1.1, 0.0, 1.0));
  pond += vec3(1.0,0.75,0.45) * pow(max(dot(reflect(-V, normalize(wn2*vec3(0.3,1.0,0.3))), uSun), 0.0), 400.0) * 4.0 * (1.0 - uTw);

  col = land;
  col = mix(col, pond, pondMask);
  // beach + surf
  float beach = smoothstep(-60.0, 0.0, dx) * (1.0 - smoothstep(0.0, 70.0, dx));
  col = mix(col, vec3(0.78,0.72,0.60)*lit*1.1, beach*0.8);
  float wet2 = smoothstep(-8.0, 6.0, dx);
  float sea = smoothstep(18.0, 40.0, dx);
  vec3 seaCol = water;
  float surf = exp(-pow((dx - 30.0 - 6.0*sin(p.y*0.05+uTime*0.6))/10.0, 2.0)) * (0.5+0.5*vnoise(vec2(p.y*0.2, uTime*0.7)));
  seaCol += vec3(0.9,0.85,0.8) * surf * 0.35 * lit;
  // bands of waves further out
  float waves = pow(0.5+0.5*sin(dx*0.09 - uTime*0.9 + 2.0*vnoise(vec2(p.y*0.01, dx*0.01))), 6.0) * smoothstep(300.0, 80.0, dx) * 0.25;
  seaCol += vec3(0.8,0.75,0.7) * waves * lit;
  col = mix(col, mix(vec3(0.34,0.30,0.26)*lit, seaCol, sea), wet2);

  // engine glow on the ground
  float gd = length(vW - uGlowPos);
  col += vec3(1.0,0.50,0.16) * (exp(-gd/140.0)*1.1 + exp(-gd/40.0)*1.4) * uGlow;

  // haze toward the horizon (matches the sky dome)
  vec3 hd = normalize(vec3(vW.x - cameraPosition.x, 0.03, vW.z - cameraPosition.z));
  vec3 haze = skyCol(hd, uSun, uTw);
  float fogK = 1.0 - exp(-dist/9500.0);
  col = mix(col, haze, clamp(fogK, 0.0, 1.0));
  float a = 1.0 - uFade;
  gl_FragColor = vec4(col, a);
}
`;

export function createWorld(renderer) {
  const near = new THREE.Scene();
  const far = new THREE.Scene();
  // low western sun, behind-left of the default view: the stack is side-lit with a warm edge, not a flat silhouette
  const sunDir = new THREE.Vector3(-0.42, 0.05, -0.9).normalize();

  const uniforms = {
    uSun: { value: sunDir.clone() }, uTw: { value: 0 }, uFade: { value: 0 }, uTime: { value: 0 },
    uGlowPos: { value: new THREE.Vector3(0, 8, 0) }, uGlow: { value: 0 },
  };

  // ---------- far pass: sky dome + Earth ----------
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: { ...uniforms, uAlt: { value: 0 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */`varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: finish(/* glsl */`
      ${NOISE}${SKY}
      uniform vec3 uSun; uniform float uTw; uniform float uAlt; uniform float uTime;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        // horizon sinks with altitude: the sky colour band follows the geometric horizon dip
        float dip = -sqrt(2.0*max(uAlt,0.0)*1000.0/6371000.0);
        vec3 dd = normalize(vec3(d.x, d.y - dip*0.9, d.z));
        float atmos = exp(-uAlt/14.0);
        vec3 sky = skyBase(dd, uSun, uTw);
        // thin streaky clouds
        vec2 cp = d.xz / (abs(d.y) + 0.22);
        float cl = smoothstep(0.50, 0.85, fbm(cp*vec2(1.6,4.5) + vec2(uTime*0.004,0.0))) * smoothstep(0.0,0.08,d.y) * smoothstep(0.55,0.15,d.y);
        float sunAz = pow(max(dot(normalize(d.xz+1e-5), normalize(uSun.xz)),0.0), 2.0);
        vec3 cloudCol = mix(vec3(0.55,0.5,0.62), vec3(1.0,0.55,0.32), sunAz) * (1.0-uTw*0.8);
        sky = mix(sky, cloudCol, cl*0.65*atmos);
        // space
        vec3 sp = d*260.0; vec3 cell = floor(sp);
        vec3 off = vec3(hash31(cell+1.7), hash31(cell+4.1), hash31(cell+9.3)) - 0.5;
        float sh = hash31(cell);
        float st = step(0.985, sh) * smoothstep(0.34, 0.0, length(fract(sp) - 0.5 - off*0.5));
        float tw = 0.75 + 0.25*sin(uTime*2.0 + sh*60.0);
        vec3 stars = vec3(st*(0.6 + 2.2*fract(sh*91.0))*tw) * vec3(0.85,0.9,1.0);
        float night = 1.0 - atmos;
        float starVis = max(night, uTw*0.9) ;
        vec3 spaceBlack = vec3(0.004,0.005,0.012);
        vec3 col = mix(spaceBlack, sky, atmos) + stars * starVis * smoothstep(-0.02, 0.1, d.y + 0.15);
        // one sun: dimmed by twilight in the air, full strength in space
        col += sunDisc(d, uSun, mix(1.0 - uTw, 1.0, night)) * smoothstep(-0.03, 0.0, d.y - dip);
        gl_FragColor = vec4(col, 1.0);
      }`),
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), domeMat);
  dome.scale.setScalar(2e7); dome.renderOrder = -100; dome.frustumCulled = false;
  far.add(dome);

  const earthMat = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uAlt: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vW; varying vec3 vN; void main(){ vN = normalize(position); vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: finish(/* glsl */`
      ${NOISE}${SKY}
      uniform vec3 uSun; uniform float uTw; uniform float uAlt; uniform float uTime;
      uniform sampler2D uDay, uNight, uClouds, uWater;
      varying vec3 vW; varying vec3 vN;
      // Real NASA imagery (Blue Marble, Black Marble). This frame is local to Starbase:
      // +x east, +y up, +z south. Rotate into Earth-fixed axes and look up latitude/longitude.
      vec2 latLonUV(vec3 n){
        const float LAT = 0.45373, LON = -1.69571;           // 25.997 N, 97.157 W
        vec3 E = vec3(-sin(LON), cos(LON), 0.0);
        vec3 N = vec3(-sin(LAT)*cos(LON), -sin(LAT)*sin(LON), cos(LAT));
        vec3 U = vec3(cos(LAT)*cos(LON), cos(LAT)*sin(LON), sin(LAT));
        vec3 p = normalize(n.x*E + n.y*U - n.z*N);
        return vec2(atan(p.y, p.x)/6.2831853 + 0.5, asin(clamp(p.z,-1.0,1.0))/3.1415927 + 0.5);
      }
      void main(){
        vec3 n = normalize(vN);
        vec3 V = normalize(cameraPosition - vW);
        // Teaching choice: the pad is at sunset, but seen from orbit a twilight Earth shows nothing.
        // Above ~30 km the planet is lit by a higher sun so its real oceans, land and clouds are readable.
        vec3 S = normalize(mix(uSun, normalize(uSun + vec3(0.0, 0.55, 0.0)), smoothstep(30.0, 120.0, uAlt)));
        float ndl = dot(n, S);
        float lit = smoothstep(-0.12, 0.35, ndl);
        vec2 uv = latLonUV(n);
        vec3 surf = texture2D(uDay, uv).rgb * 1.25;
        float water = texture2D(uWater, uv).r;
        float cl = texture2D(uClouds, uv + vec2(uTime*0.0000015, 0.0)).r;
        // sun glint on open water
        vec3 H = normalize(S + V);
        float glint = pow(max(dot(n,H),0.0), 220.0) * water * lit * (1.0 - cl);
        vec3 col = mix(surf, vec3(0.92,0.93,0.96), cl*0.85);
        col *= (0.02 + 0.95*lit) * mix(vec3(1.0), vec3(1.0,0.72,0.52), 1.0-smoothstep(0.0,0.45,ndl));
        col += vec3(1.0,0.85,0.65)*glint*1.4;
        // city lights on the night side (Black Marble), dimmed under cloud
        float city = smoothstep(0.22, 0.75, texture2D(uNight, uv).r);
        col += vec3(1.0,0.72,0.38) * city*city * 0.9 * (1.0 - smoothstep(-0.12, 0.06, ndl)) * (1.0 - 0.7*cl);
        // atmosphere seen from above: blue Rayleigh haze thickens toward the limb, warm on the terminator
        // At the launch site the sun is just setting (ndl ~ 0.05): the ground below is in dusk, blue-grey,
        // and only the limb toward the sun turns orange.
        float ndv = max(dot(n,V),0.0);
        float rim = pow(1.0 - ndv, 6.0);                       // thick only right at the horizon
        float limb = rim;
        float toSun = pow(max(dot(-V, S), 0.0), 3.0);
        vec3 atm = mix(vec3(0.22,0.36,0.75), vec3(1.0,0.45,0.18), limb*toSun*(1.0-smoothstep(0.0,0.4,ndl)));
        col = mix(col, atm * (0.10 + 0.7*smoothstep(-0.1,0.5,ndl) + 0.5*limb*toSun), clamp(0.06 + rim*0.85, 0.0, 0.9));
        gl_FragColor = vec4(col, 1.0);
      }`),
  });
  {
    const tl = new THREE.TextureLoader(), maxAniso = renderer.capabilities.getMaxAnisotropy();
    const load = (f, srgb) => { const t = tl.load('img/' + f); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, maxAniso); t.wrapS = THREE.RepeatWrapping; return t; };
    earthMat.uniforms.uDay = { value: load('earth-day.webp', true) };
    earthMat.uniforms.uNight = { value: load('earth-night.webp') };
    earthMat.uniforms.uClouds = { value: load('earth-clouds.webp') };
    earthMat.uniforms.uWater = { value: load('earth-water.webp') };
  }
  const earth = new THREE.Mesh(new THREE.SphereGeometry(RE, 192, 128), earthMat);
  earth.position.set(0, -RE, 0); earth.frustumCulled = false;
  far.add(earth);

  const atmoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { ...uniforms, uAlt: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vW; varying vec3 vN; void main(){ vN = normalize(position); vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: finish(/* glsl */`
      uniform vec3 uSun; uniform float uAlt; varying vec3 vW; varying vec3 vN;
      void main(){
        vec3 n = normalize(vN); vec3 V = normalize(cameraPosition - vW);
        // a thin glowing limb seen edge-on: blue on the day side, orange only toward the sunset
        float f = pow(1.0 - max(dot(n,V),0.0), 7.0);
        float ndl = dot(n, uSun);
        float sunSide = smoothstep(-0.25, 0.25, ndl);
        float toSun = pow(max(dot(-V, uSun), 0.0), 4.0) * (1.0 - smoothstep(0.0, 0.35, ndl));
        vec3 c = mix(vec3(0.30,0.55,1.0), vec3(1.0,0.5,0.2), toSun*0.6) * f * sunSide * 1.1;
        float vis = smoothstep(40.0, 120.0, uAlt);
        gl_FragColor = vec4(c*vis, 1.0);
      }`),
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(RE + 40000, 256, 160), atmoMat);
  atmo.position.copy(earth.position); atmo.frustumCulled = false; atmo.renderOrder = 2;
  far.add(atmo);

  // ---------- near pass: ground ----------
  const groundMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true, uniforms,
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: finish(GROUND_GLSL),
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.renderOrder = -20; ground.frustumCulled = false;
  near.add(ground);

  // ---------- lights ----------
  const sun = new THREE.DirectionalLight(0xffa968, 3.2);
  sun.position.copy(sunDir).multiplyScalar(1000);
  near.add(sun);
  const hemi = new THREE.HemisphereLight(0x7f86c4, 0x3a2e28, 0.55);
  near.add(hemi);
  const glow = new THREE.PointLight(0xff8a2a, 0, 600, 1.4);
  near.add(glow);

  // environment map for the metal, built from the same sky
  const envScene = new THREE.Scene();
  const envDomeMat = domeMat.clone();
  const envDome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), envDomeMat);
  envDome.scale.setScalar(100);
  envScene.add(envDome);
  // steel mostly mirrors the ground and the horizon: a warm, sunlit sand floor keeps it silver instead of navy
  const envFloor = new THREE.Mesh(new THREE.CircleGeometry(80, 24), new THREE.MeshBasicMaterial({ color: 0x8a7462 }));
  envFloor.rotation.x = -Math.PI / 2; envFloor.position.y = -1; envScene.add(envFloor);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = pmrem.fromScene(envScene, 0.02);
  near.environment = envRT.texture;
  near.environmentIntensity = 0.9;
  function rebuildEnv(tw) {
    envDomeMat.uniforms.uTw.value = tw;
    envFloor.material.color.setHex(0x8a7462).multiplyScalar(1 - 0.75 * tw);
    const old = envRT; envRT = pmrem.fromScene(envScene, 0.02); near.environment = envRT.texture; old.dispose();
  }

  // ---------- pad & tower ----------
  const pad = new THREE.Group(); near.add(pad);
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a8f98, metalness: 0.85, roughness: 0.5 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x2f3238, metalness: 0.8, roughness: 0.6 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x8d8d90, metalness: 0.0, roughness: 0.95 });
  const white = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, metalness: 0.3, roughness: 0.55 });

  // launch mount: table on six legs, clamps on top
  const TABLE_Y = 20;
  const table = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 6, 40), darkSteel);
  table.position.y = TABLE_Y - 3; pad.add(table);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10.8, 0.6, 8, 48), steel);
  ring.rotation.x = Math.PI / 2; ring.position.y = TABLE_Y + 0.05; pad.add(ring);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + Math.PI / 6;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.0, TABLE_Y - 5, 16), concrete);
    leg.position.set(Math.cos(a) * 9.5, (TABLE_Y - 5) / 2, Math.sin(a) * 9.5); pad.add(leg);
  }
  for (let i = 0; i < 20; i++) {                       // the 20 clamps that hold the booster down
    const a = i / 20 * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.1), steel);
    c.position.set(Math.cos(a) * 5.3, TABLE_Y + 1.2, Math.sin(a) * 5.3); c.rotation.y = -a; pad.add(c);
  }
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 0.6, 48), new THREE.MeshStandardMaterial({ color: 0x1c1d21, metalness: 0.7, roughness: 0.55 }));
  plate.position.y = 0.3; pad.add(plate);

  // tower: four chord legs with X bracing, built from instanced thin boxes
  const TOWER_H = 146, TW = 11.5, TX = -19.5, TZ = 0, SEG = 4.2;
  const tower = new THREE.Group(); tower.position.set(TX, 0, TZ); pad.add(tower);
  const nSeg = Math.floor(TOWER_H / SEG);
  const bars = [];
  const hw = TW / 2;
  const corners = [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]];
  for (let s = 0; s < nSeg; s++) {
    const y0 = s * SEG, y1 = y0 + SEG;
    for (let c = 0; c < 4; c++) {
      const [ax, az] = corners[c], [bx, bz] = corners[(c + 1) % 4];
      bars.push([[ax, y0, az], [ax, y1, az], 0.38]);                                   // chord
      bars.push([[ax, y0, az], [bx, y1, bz], 0.16]);                                   // diagonals
      bars.push([[bx, y0, bz], [ax, y1, az], 0.16]);
    }
    for (const y of [y0]) for (let c = 0; c < 4; c++) {                                // horizontals
      const [ax, az] = corners[c], [bx, bz] = corners[(c + 1) % 4];
      bars.push([[ax, y, az], [bx, y, bz], 0.2]);
    }
  }
  const barGeo = new THREE.BoxGeometry(1, 1, 1);
  const barMat = new THREE.MeshStandardMaterial({ color: 0x56606c, metalness: 0.7, roughness: 0.55 });
  const barInst = new THREE.InstancedMesh(barGeo, barMat, bars.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3a = new THREE.Vector3(), v3b = new THREE.Vector3(), sc = new THREE.Vector3(), mid = new THREE.Vector3();
  bars.forEach(([a, b, w], i) => {
    v3a.set(...a); v3b.set(...b);
    const len = v3a.distanceTo(v3b);
    mid.addVectors(v3a, v3b).multiplyScalar(0.5);
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v3b.clone().sub(v3a).normalize());
    sc.set(w, w, len);
    m4.compose(mid, q, sc); barInst.setMatrixAt(i, m4);
  });
  barInst.instanceMatrix.needsUpdate = true; barInst.frustumCulled = false;
  tower.add(barInst);
  // tower top, mast, beacon
  const topBox = new THREE.Mesh(new THREE.BoxGeometry(TW + 1.5, 4, TW + 1.5), darkSteel); topBox.position.y = TOWER_H + 2; tower.add(topBox);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 26, 8), steel); mast.position.y = TOWER_H + 17; tower.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3322 }));
  beacon.position.y = TOWER_H + 30.5; tower.add(beacon);
  // base building
  const base = new THREE.Mesh(new THREE.BoxGeometry(TW + 8, 9, TW + 8), concrete); base.position.y = 4.5; tower.add(base);

  // chopsticks: carriage plus two truss arms that open and close
  const carriage = new THREE.Group(); tower.add(carriage);
  const carriageBox = new THREE.Mesh(new THREE.BoxGeometry(5, 9, TW + 3), darkSteel); carriageBox.position.set(hw + 2.5, 0, 0); carriage.add(carriageBox);
  const armLen = 24;
  const armGeo = (() => {                                       // a small truss: top/bottom chords and zig-zag web, merged as boxes
    const g = new THREE.Group();
    const mat = barMat;
    const chord = (x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); g.add(m); };
    chord(armLen / 2, 2.2, 0, armLen, 0.5, 0.5); chord(armLen / 2, -2.2, 0, armLen, 0.5, 0.5);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const x0 = i * armLen / n, x1 = (i + 1) * armLen / n;
      const dx = x1 - x0, dy = (i % 2 ? -1 : 1) * 4.4;
      const len = Math.hypot(dx, dy);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 0.3), mat);
      m.position.set((x0 + x1) / 2, 0, 0); m.rotation.z = Math.atan2(dy, dx); g.add(m);
    }
    // catch pad that hugs the vehicle
    const pads = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 7), steel); pads.position.set(armLen, 0, 0); g.add(pads);
    return g;
  })();
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.add(armGeo.clone()); armR.add(armGeo.clone());
  armL.position.set(hw + 5, 0, -hw + 1.5); armR.position.set(hw + 5, 0, hw - 1.5);
  carriage.add(armL, armR);
  function setChopsticks(open, carriageY) {
    // open: 0 closed around the vehicle, 1 wide open
    carriage.position.y = carriageY;
    const a = THREE.MathUtils.lerp(-0.04, 0.78, open);
    armL.rotation.y = a;      // pivots swing the tips apart
    armR.rotation.y = -a;
  }
  // mid-height service arm
  const qd = new THREE.Mesh(new THREE.BoxGeometry(18, 1.6, 1.6), barMat); qd.position.set(hw + 9, 104, 0); tower.add(qd);
  const qd2 = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, 1.6), barMat); qd2.position.set(hw + 7, 52, 3); tower.add(qd2);

  // tank farm: white vertical tanks + spheres + pipes
  const farm = new THREE.Group(); farm.position.set(130, 0, -70); pad.add(farm);
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Group();
    const h = 15 + (i % 2) * 5;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, h, 24), white); body.position.y = h / 2 + 1; t.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), white); dome.position.y = h + 1; t.add(dome);
    t.position.set((i % 3) * 11, 0, Math.floor(i / 3) * 12); farm.add(t);
  }
  for (let i = 0; i < 2; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), white); s.position.set(40 + i * 17, 7, 8); farm.add(s);
  }
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 90, 8), steel); pipe.rotation.z = Math.PI / 2; pipe.position.set(-45, 1.2, 14); farm.add(pipe);

  // production site on the far shore (silhouettes)
  const silh = new THREE.MeshStandardMaterial({ color: 0x2a2530, roughness: 0.9, metalness: 0.1 });
  const site = new THREE.Group(); site.position.set(-2300, 0, -2900); near.add(site);
  [[0, 90, 120], [170, 108, 120], [340, 92, 120]].forEach(([x, h, w]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 90), silh); b.position.set(x, h / 2, 0); site.add(b);
  });
  const lowBlock = new THREE.Mesh(new THREE.BoxGeometry(520, 26, 130), silh); lowBlock.position.set(190, 13, 80); site.add(lowBlock);

  // pad light that follows the engine fire
  function setGlow(pos, intensity) {
    uniforms.uGlowPos.value.copy(pos); uniforms.uGlow.value = intensity;
    glow.position.copy(pos); glow.intensity = intensity * 9000;
  }

  const api = {
    near, far, uniforms, sunDir, tableY: TABLE_Y, towerPos: new THREE.Vector3(TX, 0, TZ), towerH: TOWER_H,
    setChopsticks, setGlow, rebuildEnv, beacon, sun, hemi, ground, earth, domeMat, atmoMat, earthMat, pad, tower,
    update(time, camPos, altKm, twilight) {
      uniforms.uTime.value = time;
      domeMat.uniforms.uAlt.value = altKm; earthMat.uniforms.uAlt.value = altKm; atmoMat.uniforms.uAlt.value = altKm;
      domeMat.uniforms.uTime.value = time; earthMat.uniforms.uTime.value = time;
      uniforms.uTw.value = twilight;
      uniforms.uFade.value = THREE.MathUtils.smoothstep(altKm, 9, 28);
      ground.visible = uniforms.uFade.value < 0.999;
      ground.position.set(camPos.x, 0, camPos.z);            // follow the camera so the edge never shows
      beacon.visible = Math.floor(time * 0.8) % 2 === 0;
      dome.position.copy(camPos);
      // above the lower atmosphere sunlight is no longer reddened and dimmed by a long air path:
      // it gets whiter and stronger, while sky light (hemi) fades toward black space
      const high = THREE.MathUtils.smoothstep(altKm, 3, 45);
      sun.intensity = 3.2 * (1 - twilight * 0.9) * (1 - high) + 4.5 * high;
      sun.color.setRGB(1.0, THREE.MathUtils.lerp(0.66 - twilight * 0.2, 0.94, high), THREE.MathUtils.lerp(0.41 - twilight * 0.1, 0.86, high));
      hemi.intensity = (0.55 * (1 - twilight * 0.6) + 0.1) * (1 - 0.75 * high);
      near.environmentIntensity = THREE.MathUtils.lerp(0.9, 0.35, Math.max(THREE.MathUtils.smoothstep(altKm, 20, 90), twilight));
    },
  };
  return api;
}
