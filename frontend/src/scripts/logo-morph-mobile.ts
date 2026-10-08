// A standalone "nuvion" logo ⇄ neural-network morph for mobile, ported from the standalone prototype
// (design-reference: nuvion-morph-3d-mobile.html). Lives in the footer's CTA panel (always a forced-dark
// panel, regardless of site theme — see Footer.astro), before its title, lazily initialized only once that
// panel is about to scroll into view, so it never adds load on the pages it's used on until someone actually
// scrolls there. Starts already showing the network; same interaction as the standalone prototype — drag
// horizontally to rotate, a quick tap morphs it into the wordmark and back.
import * as THREE from "three";

export interface LogoMorphMobileOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
}

// The footer panel is always dark (never the light theme), so this is the only palette needed — same colors
// as the desktop hero's own additive-blended build.
const DARK_PALETTE = {
  blending: THREE.AdditiveBlending as THREE.Blending,
  alphaBoost: 1,
  rimSoftness: 0,
  letterA: new THREE.Color("#f4f7ff"),
  letterB: new THREE.Color("#a3c6ff"),
  orange: new THREE.Color("#e84a18"),
  orangeHot: new THREE.Color("#ff8a3a"),
  netRim: new THREE.Color("#eef3ff"),
  steel: new THREE.Color("#9fb3d6"),
  haze: new THREE.Color("#a3c6ff"),
};

export function initLogoMorphMobile({ canvas, container }: LogoMorphMobileOptions): () => void {
  return buildScene(canvas, container, DARK_PALETTE);
}

function buildScene(canvas: HTMLCanvasElement, container: HTMLElement, palette: typeof DARK_PALETTE): () => void {
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const randUnit = (out = new THREE.Vector3()) => {
    const th = Math.random() * Math.PI * 2;
    const z = Math.random() * 2 - 1;
    const r = Math.sqrt(1 - z * z);
    return out.set(r * Math.cos(th), r * Math.sin(th), z);
  };
  const smooth = (x: number) => x * x * (3 - 2 * x);

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || ((navigator as any).deviceMemory || 4) <= 3;
  const CFG = {
    letterParticles: lowEnd ? 9000 : 13000,
    dotParticles: lowEnd ? 320 : 450,
    hazeParticles: lowEnd ? 900 : 1500,
    wispRatio: 0.08,
    shedRatio: 0.12,
    shedAmount: 1.0,
    airDrag: 1.3,
    buoyancy: 0.18,
    worldWidth: 9,
    depthScale: 1.0,
    maxRotY: 0.65,
    dragSensitivity: 2.6,
    maxPixelRatio: 1.5,
  };
  const NCFG = {
    nodes: lowEnd ? 16 : 20,
    orangeRatio: 0.4,
    shellDensity: lowEnd ? 1700 : 2300,
    linkSlots: lowEnd ? 48 : 64,
    linkParticles: lowEnd ? 60 : 75,
    targetLinks: lowEnd ? 32 : 44,
    maxLinkDist: 2.6,
    maxDegree: 6,
    dustParticles: lowEnd ? 600 : 1000,
    traceCount: lowEnd ? 16 : 26,
    autoSpin: 0.12,
    swipeTurn: 2 * Math.PI,
    spinFriction: 1.4,
    nodeSpring: 22,
    nodeDamping: 3.2,
    nodeLagMax: 0.45,
    breakRate: 1.6,
    motionScale: 3.2,
  };
  const MORPH = { toNetDuration: 2.6, toLogoDuration: 2.4, handoff: 0.72, fadeDuration: 0.9, swirl: 1.4 };
  const LOGO_COMP = Math.sqrt(34000 / CFG.letterParticles);
  const SHELL_COMP = Math.sqrt(5200 / NCFG.shellDensity);
  const LINK_COMP = Math.sqrt(110 / NCFG.linkParticles);

  interface NodeDef {
    base: THREE.Vector3;
    r: number;
    orange: boolean;
    freq: THREE.Vector3;
    phase: THREE.Vector3;
    drift: number;
    pos: THREE.Vector3;
    off: THREE.Vector3;
    vel: THREE.Vector3;
    flash: number;
    degree: number;
  }
  const nodes: NodeDef[] = [];
  for (let tries = 0; nodes.length < NCFG.nodes && tries < 5000; tries++) {
    const p = new THREE.Vector3(gauss() * 1.5, gauss() * 1.25, gauss() * 1.2);
    if (p.length() > 3.4) continue;
    const r = Math.random() < 0.25 ? rnd(0.14, 0.2) : rnd(0.22, 0.4);
    if (nodes.some((n) => n.base.distanceTo(p) < n.r + r + 0.55)) continue;
    nodes.push({
      base: p,
      r,
      orange: Math.random() < NCFG.orangeRatio,
      freq: new THREE.Vector3(rnd(0.15, 0.4), rnd(0.15, 0.4), rnd(0.15, 0.4)),
      phase: new THREE.Vector3(rnd(0, 6.3), rnd(0, 6.3), rnd(0, 6.3)),
      drift: rnd(0.12, 0.3),
      pos: p.clone(),
      off: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      flash: 0,
      degree: 0,
    });
  }
  const NN = nodes.length;
  const nodeCdf: number[] = [];
  {
    let acc = 0;
    for (const n of nodes) {
      acc += n.r * n.r;
      nodeCdf.push(acc);
    }
    for (let i = 0; i < NN; i++) nodeCdf[i] /= acc;
  }
  const pickNode = () => {
    const r = Math.random();
    let i = 0;
    while (nodeCdf[i] < r) i++;
    return i;
  };

  const R_PX = 4;
  const STEP = 0.25;
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / STEP));
    return Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, dir: number) => {
    const n = Math.ceil((Math.abs(a1 - a0) * Math.max(rx, ry)) / STEP);
    return Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / n;
      return [cx + rx * Math.cos(a), cy + dir * ry * Math.sin(a)];
    });
  };
  const superellipse = (cx: number, cy: number, rx: number, ry: number, e: number) => {
    const n = 900;
    const sp = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 2 / e);
    return Array.from({ length: n + 1 }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [cx + rx * sp(Math.cos(a)), cy + ry * sp(Math.sin(a))];
    });
  };
  const join = (...segs: number[][][]) => segs.flat();
  const V_A = [137.5, 4, 158, 47.5] as const;
  const V_B = [158, 47.5, 178.5, 4] as const;
  const PATHS: { pts: number[][]; avoid?: number[][]; closed?: boolean; noStartCap?: boolean }[] = [
    { pts: join(line(3.5, 35, 3.5, 20), arc(22.5, 20, 19, 16, Math.PI, 0, -1), line(41.5, 20, 41.5, 47.5)) },
    { pts: join(line(70.5, 4, 70.5, 31), arc(89.5, 31, 19, 16, Math.PI, 0, 1), line(108.5, 31, 108.5, 4)) },
    { pts: line(...V_A), avoid: [[...V_B]] },
    { pts: line(...V_B), avoid: [[...V_A]], noStartCap: true },
    { pts: line(206.5, 15.5, 206.5, 47.5) },
    { pts: superellipse(257, 25.5, 21, 21.5, 2), closed: true },
    { pts: join(line(307.5, 47.5, 307.5, 20), arc(326.5, 20, 19, 16, Math.PI, 0, -1), line(345.5, 20, 345.5, 35)) },
  ];
  const DOTS: [number, number][] = [
    [3.5, 47.5],
    [207, 4],
    [345.5, 47.5],
  ];
  const DOT_R_PX = 4.1;
  const S = CFG.worldWidth / 350;
  const toWorld = (x: number, y: number): [number, number] => [(x - 175) * S, -(y - 26) * S];

  function prepPaths() {
    const out: any[] = [];
    let total = 0;
    for (const P of PATHS) {
      const pts = P.pts;
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const len = cum[cum.length - 1];
      const capA = P.closed || P.noStartCap ? 0 : R_PX;
      const capB = P.closed ? 0 : R_PX;
      out.push({ ...P, avoid: P.avoid || [], cum, len, capA, capB, ext: len + capA + capB });
      total += len + capA + capB;
    }
    return { paths: out, total };
  }
  function insideSeg(px: number, py: number, z: number, seg: number[], R: number, RZ: number, limit: number) {
    const [x0, y0, x1, y1] = seg;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy;
    const t = ((px - x0) * dx + (py - y0) * dy) / l2;
    if (t < 0 || t > 1) return false;
    const d = Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t)) * S;
    return (d / R) ** 2 + (z / RZ) ** 2 < limit;
  }
  function samplePath(P: any, s: number) {
    const { pts, cum } = P;
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cum[m] < s) lo = m;
      else hi = m;
    }
    const a = pts[lo];
    const b = pts[hi];
    const f = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    return { x: a[0] + tx * f, y: a[1] + ty * f, tx: tx / tl, ty: ty / tl };
  }
  const shellR = () => (Math.random() < 0.8 ? 0.88 + Math.random() * 0.12 : Math.sqrt(Math.random()) * 0.88);

  function buildLogoGeometry() {
    const { paths, total: totalLen } = prepPaths();
    const total = CFG.letterParticles + CFG.dotParticles * DOTS.length + CFG.hazeParticles;
    const pos = new Float32Array(total * 3);
    const nor = new Float32Array(total * 3);
    const scatter = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    const rand = new Float32Array(total * 4);
    const size = new Float32Array(total);
    const type = new Float32Array(total);
    const tNode = new Float32Array(total);
    const tOff = new Float32Array(total * 3);
    const c = new THREE.Color();
    const n3 = new THREE.Vector3();
    const u = new THREE.Vector3();
    let i = 0;
    const R = R_PX * S;
    const RZ = R * CFG.depthScale;

    const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number, color: THREE.Color, s: number, t: number) => {
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      n3.set(nx, ny, nz).normalize();
      nor[i * 3] = n3.x;
      nor[i * 3 + 1] = n3.y;
      nor[i * 3 + 2] = n3.z;
      const r = 6 + Math.random() * 9;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      scatter[i * 3] = r * Math.sin(ph) * Math.cos(th);
      scatter[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.6;
      scatter[i * 3 + 2] = r * Math.cos(ph);
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
      rand.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      size[i] = s;
      type[i] = t;
      const ni = pickNode();
      const nr = nodes[ni].r;
      randUnit(u);
      if (t > 0.5 && t < 1.5) u.multiplyScalar(nr * 0.22 * Math.cbrt(Math.random()));
      else u.multiplyScalar(nr * rnd(0.92, 1.0));
      tNode[i] = ni;
      tOff[i * 3] = u.x;
      tOff[i * 3 + 1] = u.y;
      tOff[i * 3 + 2] = u.z;
      i++;
    };
    const letterColor = () => c.copy(palette.letterA).lerp(palette.letterB, Math.random() * 0.5);
    const letterType = () => {
      const r = Math.random();
      return r < CFG.wispRatio ? 3 : r < CFG.wispRatio + CFG.shedRatio ? 4 : 0;
    };
    const letterSize = () => (1.6 + Math.random() * 1.6) * LOGO_COMP;
    const rejected = (px: number, py: number, z: number, avoid: number[][]) => avoid.some((seg) => insideSeg(px, py, z, seg, R, RZ, 1.02));

    for (let k = 0; k < CFG.letterParticles; k++) {
      let s = Math.random() * totalLen;
      let P = paths[0];
      for (const p of paths) {
        if (s <= p.ext) {
          P = p;
          break;
        }
        s -= p.ext;
      }
      let s0 = s - P.capA;
      let along = 0;
      if (s0 < 0) {
        along = s0;
        s0 = 0;
      } else if (s0 > P.len) {
        along = s0 - P.len;
        s0 = P.len;
      }
      const q = samplePath(P, s0);
      const a = along / R_PX;
      const rho = Math.sqrt(Math.max(0, 1 - a * a));
      const nx2 = -q.ty;
      const ny2 = q.tx;
      const th = Math.random() * Math.PI * 2;
      const rr = shellR();
      const cx = Math.cos(th) * rho;
      const sz = Math.sin(th) * rho;
      const ux = q.tx * a + nx2 * cx;
      const uy = q.ty * a + ny2 * cx;
      const ox = ux * rr * R_PX;
      const oy = uy * rr * R_PX;
      const oz = sz * RZ * rr;
      if (P.avoid.length && rejected(q.x + ox, q.y + oy, oz, P.avoid)) continue;
      const [wx, wy] = toWorld(q.x + ox, q.y + oy);
      push(wx, wy, oz, ux / R, -uy / R, sz / RZ, letterColor(), letterSize(), letterType());
    }
    for (const [x, y] of DOTS) {
      const [wx, wy] = toWorld(x, y);
      const r = DOT_R_PX * S;
      for (let k = 0; k < CFG.dotParticles; k++) {
        randUnit(u);
        const rr = shellR();
        c.copy(palette.orange).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.1);
        push(wx + u.x * r * rr, wy - u.y * r * rr, u.z * r * rr, u.x, -u.y, u.z, c, (1.3 + Math.random() * 1.4) * LOGO_COMP, 1);
      }
    }
    for (let k = 0; k < CFG.hazeParticles; k++) {
      c.copy(palette.haze).lerp(palette.letterA, Math.random() * 0.4);
      push((Math.random() - 0.5) * 14, gauss() * 1.1, gauss() * 1.6, 0, 0, 1, c, 3 + Math.random() * 7, 2);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aType", new THREE.BufferAttribute(type, 1));
    g.setAttribute("aTNode", new THREE.BufferAttribute(tNode, 1));
    g.setAttribute("aTOff", new THREE.BufferAttribute(tOff, 3));
    g.setDrawRange(0, i);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
    return g;
  }

  const SIZE_FN = /* glsl */ `uniform float uSizeScale, uCamZ;
    float pSize(float s, float pr, float z) { return max(1.0, s * pr * uSizeScale * (uCamZ / -z)); }`;

  const logoVert = /* glsl */ `
    uniform float uTime, uProgress, uPixelRatio, uMorph, uLogoFade;
    uniform vec3 uLightDir;
    uniform vec4 uNodes[${NN}];
    uniform mat4 uNetToLogo;
    ${SIZE_FN}
    attribute vec4 aOffset;
    attribute vec3 aScatter, aTOff;
    attribute vec4 aRand;
    attribute float aSize, aType, aTNode;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float t = uTime;
      vec3 base = position;
      float alphaMul = 1.0;
      bool isHaze = aType > 1.5 && aType < 2.5;
      bool isWisp = aType > 2.5 && aType < 3.5;
      if (isHaze) {
        base.x = mod(base.x + t * 0.10 * (0.4 + aRand.x) + 7.0, 14.0) - 7.0;
        alphaMul = smoothstep(7.0, 5.0, abs(base.x));
      }
      float pr = clamp(uProgress * 1.7 - aRand.w * 0.7, 0.0, 1.0);
      pr = 1.0 - pow(1.0 - pr, 3.0);
      vec3 p = mix(aScatter, base, pr);
      vec3 ph = aRand.xyz * 6.2831;
      vec3 wave = vec3(
        sin(t * 0.35 + base.y * 1.7 + ph.x) + 0.5 * sin(t * 0.81 + base.x * 2.3 + ph.y),
        cos(t * 0.30 + base.x * 1.3 + ph.y) + 0.5 * cos(t * 0.67 + base.z * 2.9 + ph.z),
        sin(t * 0.25 + base.x * 0.9 + base.y * 1.1 + ph.z));
      p += wave * (isHaze ? 0.3 : 0.008);
      if (isWisp) {
        float life = fract(t * 0.07 * (0.6 + aRand.x) + aRand.w);
        p += normal * life * 0.35 + vec3(0.25, 0.55, 0.0) * life * life + wave * life * 0.12;
        alphaMul = smoothstep(0.0, 0.08, life) * (1.0 - life);
      }
      float m = clamp(uMorph * 1.5 - aRand.w * 0.5, 0.0, 1.0);
      m = m * m * (3.0 - 2.0 * m);
      p += aOffset.xyz * pr * (1.0 - m);
      bool detached = aOffset.w < 0.995;
      if (m > 0.0) {
        vec4 nd = uNodes[int(aTNode + 0.5)];
        vec3 target = (uNetToLogo * vec4(nd.xyz + aTOff, 1.0)).xyz;
        vec3 swirl = normalize(aRand.xyz - 0.5 + 1e-3) * ${MORPH.swirl.toFixed(2)} * sin(3.14159 * m);
        swirl += vec3(sin(t * 1.3 + ph.x), cos(t * 1.1 + ph.y), sin(t * 0.9 + ph.z)) * 0.25 * sin(3.14159 * m);
        p = mix(p, target, m) + swirl;
        if (isWisp || isHaze) alphaMul = mix(alphaMul, isHaze ? 0.0 : 1.0, m);
      }
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = pSize(aSize * mix(1.0, 0.8, m), uPixelRatio, mv.z);
      vec3 n = normalize(normalMatrix * normal);
      vec3 L = normalize(uLightDir);
      float diff = max(dot(n, L), 0.0);
      float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);
      float rim = pow(1.0 - abs(n.z), 2.5);
      float light = 0.6 + 0.8 * diff + 0.5 * spec + 0.3 * rim;
      float facing = smoothstep(-0.45, 0.2, n.z);
      float baseA;
      if (isHaze) { light = 0.8; facing = 1.0; baseA = 0.07; }
      else if (isWisp) { baseA = 0.45; facing = 1.0; }
      else baseA = 0.95;
      if (detached) { facing = 1.0; light = max(light, 0.9); }
      facing = mix(facing, 1.0, m);
      vec3 col = mix(color, mix(color, vec3(1.0, 0.55, 0.25), 0.35), sin(3.14159 * m));
      vColor = col * light * 1.15;
      float twinkle = 0.85 + 0.15 * sin(t * 1.7 + aRand.z * 40.0);
      vAlpha = baseA * twinkle * alphaMul * aOffset.w * mix(0.14, 1.0, facing) * mix(0.35, 1.0, pr) * uLogoFade;
    }
  `;
  const softFrag = /* glsl */ `
    precision mediump float;
    uniform float uAlphaBoost;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = pow(1.0 - d * 2.0, 1.2);
      gl_FragColor = vec4(vColor, min(1.0, a * vAlpha * uAlphaBoost));
    }
  `;
  const nodeVert = /* glsl */ `
    uniform float uTime, uPixelRatio, uFade, uNetScale, uRimSoftness;
    uniform vec4 uNodes[${NN}];
    uniform vec3 uLightDir, uRimOff, uRimOn, uHot;
    ${SIZE_FN}
    attribute float aNode, aKind, aSize, aOrange;
    attribute vec4 aRand;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec4 nd = uNodes[int(aNode + 0.5)];
      float flash = nd.w, t = uTime;
      vec3 local = position;
      if (aKind > 0.5 && aKind < 1.5) local *= 1.0 + 0.18 * sin(t * 2.6 + aRand.x * 6.28);
      vec4 mv = modelViewMatrix * vec4(nd.xyz + local, 1.0);
      gl_Position = projectionMatrix * mv;
      float size = aSize * uNetScale;
      if (aKind > 1.5) size *= 1.0 + flash * 0.8;
      gl_PointSize = pSize(size, uPixelRatio, mv.z);
      float fade = clamp(uFade * 1.4 - aRand.w * 0.4, 0.0, 1.0);
      if (aKind < 0.5) {
        vec3 n = normalize(normalMatrix * normal);
        vec3 L = normalize(uLightDir);
        float fres = pow(1.0 - abs(n.z), 2.2);
        float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 26.0);
        float spec2 = pow(max(dot(reflect(-normalize(vec3(0.6, -0.3, 0.5)), n), vec3(0.0, 0.0, 1.0)), 0.0), 14.0);
        float facing = smoothstep(-0.5, 0.15, n.z);
        vec3 rimCol = aOrange > 0.5 ? mix(uRimOff, uHot, 0.3) : uRimOn;
        // The glass-shell look (bright glowing rim, hollow centre) only reads right under additive blending on
        // a dark bg. Under normal blending on a light bg it reads as a hard dark ring instead — uRimSoftness
        // (0 dark theme / 1 light theme) flattens both the colour and alpha toward a soft, even tint instead.
        vec3 sharpColor = rimCol * (0.25 + 1.3 * fres) + vec3(1.0) * spec * 1.4 + uHot * spec2 * 0.35 + uHot * flash * 0.6;
        vec3 softColor = rimCol * 0.62 + uHot * flash * 0.4;
        vColor = mix(sharpColor, softColor, uRimSoftness);
        float sharpAlpha = (0.07 + 0.85 * fres + spec * 0.9) * mix(0.18, 1.0, facing);
        float softAlpha = 0.3 * mix(0.55, 1.0, facing);
        vAlpha = mix(sharpAlpha, softAlpha, uRimSoftness) * fade;
      } else if (aKind < 1.5) {
        vColor = mix(uRimOff, uHot, 0.5 + 0.5 * aRand.y) * (1.4 + flash * 1.5);
        vAlpha = 0.9 * fade;
      } else {
        vColor = uRimOff * (0.8 + flash * 1.2);
        vAlpha = (0.16 + flash * 0.25) * fade;
      }
    }
  `;
  const linkVert = /* glsl */ `
    uniform float uPixelRatio, uFade, uNetScale;
    ${SIZE_FN}
    attribute float aAlpha, aSize;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = pSize(aSize * uNetScale, uPixelRatio, mv.z);
      vColor = color * 1.7;
      vAlpha = aAlpha * uFade;
    }
  `;
  const bgVert = /* glsl */ `
    uniform float uTime, uPixelRatio, uFade;
    ${SIZE_FN}
    attribute vec4 aRand;
    attribute float aSize, aType, aTrace;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float t = uTime;
      vec3 p = position;
      float a = 1.0;
      if (aType < 0.5) {
        vec3 ph = aRand.xyz * 6.2831;
        p += vec3(sin(t * 0.21 + ph.x), cos(t * 0.17 + ph.y), sin(t * 0.13 + ph.z)) * 0.35;
        a = 0.55 + 0.45 * sin(t * (1.0 + aRand.w * 3.0) + aRand.x * 40.0);
      } else if (aType < 1.5) {
        p += vec3(sin(t * 0.07 + aRand.x * 6.0), cos(t * 0.06 + aRand.y * 6.0), 0.0) * 0.4;
      } else {
        float head = mod(t * (0.5 + aRand.y) + aRand.x * 30.0, 18.0);
        float d = aTrace - head;
        a = 1.0 + 6.0 * exp(-d * d * 6.0) * step(d, 0.0) + 3.0 * exp(-d * d * 40.0);
      }
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = pSize(aSize, uPixelRatio, mv.z);
      vColor = color;
      vAlpha = aRand.z * a * uFade;
    }
  `;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio, CFG.maxPixelRatio);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  scene.add(camera);
  const additive = { transparent: true, depthWrite: false, blending: palette.blending, vertexColors: true };
  const lightDir = new THREE.Vector3(-0.45, 0.6, 0.7);
  const alphaBoost = { value: palette.alphaBoost };

  // Starts already in the network — mode below is "net", not "logo", so these are its steady-state values.
  const U = {
    pr: { value: pixelRatio },
    sizeScale: { value: 1 },
    camZ: { value: 12 },
    netScale: { value: 1 },
    netFade: { value: 1 },
    time: { value: 0 },
    nodes: { value: nodes.map(() => new THREE.Vector4()) },
    light: { value: lightDir },
  };
  const common = { uPixelRatio: U.pr, uSizeScale: U.sizeScale, uCamZ: U.camZ, uTime: U.time, uAlphaBoost: alphaBoost };

  const logoU = {
    ...common,
    uProgress: { value: 1 },
    uLightDir: U.light,
    uMorph: { value: 1 },
    uLogoFade: { value: 0 },
    uNodes: U.nodes,
    uNetToLogo: { value: new THREE.Matrix4() },
  };
  const geometry = buildLogoGeometry();
  const logoMaterial = new THREE.ShaderMaterial({ uniforms: logoU, vertexShader: logoVert, fragmentShader: softFrag, ...additive });
  const points = new THREE.Points(geometry, logoMaterial);
  scene.add(points);

  const physics = (() => {
    const N = geometry.drawRange.count;
    const P = geometry.attributes.position.array as Float32Array;
    const NOR = geometry.attributes.normal.array as Float32Array;
    const TYP = geometry.attributes.aType.array as Float32Array;
    const offArr = new Float32Array(geometry.attributes.position.count * 4);
    for (let i = 0; i < offArr.length; i += 4) offArr[i + 3] = 1;
    const offAttr = new THREE.BufferAttribute(offArr, 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aOffset", offAttr);
    const act: number[] = [];
    for (let i = 0; i < N; i++) if (TYP[i] > 3.5) act.push(i);
    const vel = new Float32Array(N * 3);
    const life = new Float32Array(N);
    const lifeRate = new Float32Array(N);
    const det = new Uint8Array(N);
    let busy = 0;
    function step(dt: number, dthx: number, dthy: number) {
      if (dt <= 0) return;
      const wx = dthx / dt;
      const wy = dthy / dt;
      const motion = Math.min(1, Math.hypot(wx, wy) / 0.9);
      if (motion < 0.02 && busy === 0) return;
      const pDetach = 0.9 * motion * CFG.shedAmount * dt;
      const airDecay = Math.exp(-CFG.airDrag * dt);
      busy = 0;
      for (const i of act) {
        const i3 = i * 3;
        const i4 = i * 4;
        if (det[i]) {
          let dx = offArr[i4];
          let dy = offArr[i4 + 1];
          let dz = offArr[i4 + 2];
          let vx = vel[i3];
          let vy = vel[i3 + 1];
          let vz = vel[i3 + 2];
          const x = P[i3] + dx;
          const y = P[i3 + 1] + dy;
          const z = P[i3 + 2] + dz;
          dx -= dthy * z;
          dy += dthx * z;
          dz -= dthx * y - dthy * x;
          const tvx = vx - dthy * vz;
          const tvy = vy + dthx * vz;
          const tvz = vz - (dthx * vy - dthy * vx);
          vx = tvx * airDecay + (Math.random() - 0.5) * 0.5 * dt;
          vy = tvy * airDecay + (CFG.buoyancy + (Math.random() - 0.5) * 0.5) * dt;
          vz = tvz * airDecay + (Math.random() - 0.5) * 0.5 * dt;
          dx += vx * dt;
          dy += vy * dt;
          dz += vz * dt;
          life[i] -= lifeRate[i] * dt;
          if (life[i] <= 0) {
            det[i] = 0;
            dx = dy = dz = vx = vy = vz = 0;
            offArr[i4 + 3] = 0;
          } else {
            const l = life[i];
            offArr[i4 + 3] = Math.min(0.99, l * 6) * Math.pow(l, 0.8) * 0.99;
          }
          offArr[i4] = dx;
          offArr[i4 + 1] = dy;
          offArr[i4 + 2] = dz;
          vel[i3] = vx;
          vel[i3 + 1] = vy;
          vel[i3 + 2] = vz;
          busy++;
        } else if (offArr[i4 + 3] < 1) {
          offArr[i4 + 3] = Math.min(1, offArr[i4 + 3] + dt * 1.5);
          busy++;
        } else if (Math.random() < pDetach) {
          const px = P[i3];
          const py = P[i3 + 1];
          const pz = P[i3 + 2];
          det[i] = 1;
          life[i] = 1;
          lifeRate[i] = 1 / (1.2 + Math.random() * 2.2);
          const carry = 0.25 + Math.random() * 0.55;
          const push = 0.12 + Math.random() * 0.3;
          vel[i3] = wy * pz * carry + NOR[i3] * push;
          vel[i3 + 1] = -wx * pz * carry + NOR[i3 + 1] * push;
          vel[i3 + 2] = (wx * py - wy * px) * carry + NOR[i3 + 2] * push;
          offArr[i4 + 3] = 0.99;
          busy++;
        }
      }
      offAttr.needsUpdate = true;
    }
    return { step };
  })();

  const network = new THREE.Group();
  const dustGroup = new THREE.Group();
  scene.add(dustGroup, network);
  let nodeMaterial!: THREE.ShaderMaterial;
  let nodeGeometry!: THREE.BufferGeometry;
  {
    const P: number[] = [];
    const N: number[] = [];
    const NI: number[] = [];
    const K: number[] = [];
    const SZ: number[] = [];
    const OR: number[] = [];
    const RA: number[] = [];
    const u = new THREE.Vector3();
    nodes.forEach((n, i) => {
      const shell = Math.round(NCFG.shellDensity * 4 * Math.PI * n.r * n.r * 0.25);
      for (let k = 0; k < shell; k++) {
        randUnit(u);
        const rr = Math.random() < 0.9 ? rnd(0.95, 1.0) : rnd(0.75, 0.95);
        P.push(u.x * n.r * rr, u.y * n.r * rr, u.z * n.r * rr);
        N.push(u.x, u.y, u.z);
        NI.push(i);
        K.push(0);
        SZ.push(rnd(1.2, 2.4) * SHELL_COMP);
        OR.push(n.orange ? 1 : 0);
        RA.push(Math.random(), Math.random(), Math.random(), Math.random());
      }
      const core = Math.round(30 + n.r * 110);
      for (let k = 0; k < core; k++) {
        randUnit(u).multiplyScalar(n.r * 0.22 * Math.cbrt(Math.random()));
        P.push(u.x, u.y, u.z);
        N.push(0, 0, 1);
        NI.push(i);
        K.push(1);
        SZ.push(rnd(1.6, 3.4) * 1.2);
        OR.push(1);
        RA.push(Math.random(), Math.random(), Math.random(), Math.random());
      }
      P.push(0, 0, 0);
      N.push(0, 0, 1);
      NI.push(i);
      K.push(2);
      SZ.push(n.r * 260);
      OR.push(1);
      RA.push(Math.random(), Math.random(), Math.random(), Math.random());
    });
    nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    nodeGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    nodeGeometry.setAttribute("aNode", new THREE.Float32BufferAttribute(NI, 1));
    nodeGeometry.setAttribute("aKind", new THREE.Float32BufferAttribute(K, 1));
    nodeGeometry.setAttribute("aSize", new THREE.Float32BufferAttribute(SZ, 1));
    nodeGeometry.setAttribute("aOrange", new THREE.Float32BufferAttribute(OR, 1));
    nodeGeometry.setAttribute("aRand", new THREE.Float32BufferAttribute(RA, 4));
    nodeGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    nodeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...common,
        uFade: U.netFade,
        uNetScale: U.netScale,
        uNodes: U.nodes,
        uLightDir: U.light,
        uRimOff: { value: palette.netRim },
        // Pale near-white, not the more saturated steel-blue (matches the desktop hero's own hardcoded rim
        // color) — steel here was reading as a distinct blue border around every sphere once scaled up.
        uRimOn: { value: new THREE.Color("#dbe6ff") },
        uHot: { value: palette.orangeHot },
        uRimSoftness: { value: palette.rimSoftness },
      },
      vertexShader: nodeVert,
      fragmentShader: softFrag,
      ...additive,
      vertexColors: false,
    });
    network.add(new THREE.Points(nodeGeometry, nodeMaterial));
  }

  let dustGeometry!: THREE.BufferGeometry;
  let dustMaterial!: THREE.ShaderMaterial;
  let traceGeometry!: THREE.BufferGeometry;
  let traceMaterial!: THREE.ShaderMaterial;
  let tracePoints!: THREE.Points;
  {
    type Bucket = { P: number[]; C: number[]; RA: number[]; SZ: number[]; T: number[]; TR: number[] };
    const make = (): Bucket => ({ P: [], C: [], RA: [], SZ: [], T: [], TR: [] });
    const dust = make();
    const traces = make();
    const c = new THREE.Color();
    const add = (o: Bucket, x: number, y: number, z: number, col: THREE.Color, size: number, type: number, alpha: number, tr = 0) => {
      o.P.push(x, y, z);
      o.C.push(col.r, col.g, col.b);
      o.RA.push(Math.random(), Math.random(), alpha, Math.random());
      o.SZ.push(size);
      o.T.push(type);
      o.TR.push(tr);
    };
    for (let k = 0; k < NCFG.dustParticles; k++) {
      const r = rnd(2.5, 12);
      const u = randUnit();
      const hot = Math.random() < 0.55;
      c.copy(hot ? palette.orangeHot : palette.netRim).lerp(palette.orange, hot ? Math.random() * 0.5 : 0);
      add(dust, u.x * r * 0.9, u.y * r * 1.4, u.z * r, c, rnd(1.4, 3.6), 0, rnd(0.25, 0.9));
    }
    for (let k = 0; k < 20; k++) {
      c.copy(Math.random() < 0.7 ? palette.orange : palette.steel);
      add(dust, rnd(-8, 8), rnd(-12, 12), rnd(-12, -4), c, rnd(40, 110), 1, rnd(0.04, 0.1));
    }
    const dirs: [number, number][] = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [0.7071, 0.7071],
      [0.7071, -0.7071],
      [-0.7071, 0.7071],
      [-0.7071, -0.7071],
    ];
    for (let k = 0; k < NCFG.traceCount; k++) {
      let x = rnd(-10, 10);
      let y = rnd(-20, 20);
      let along = 0;
      let d = Math.floor(Math.random() * 4);
      const segs = 2 + Math.floor(Math.random() * 4);
      const col = Math.random() < 0.3 ? palette.orange : palette.steel;
      const alpha = rnd(0.05, 0.11);
      const pad = (px: number, py: number) => {
        for (let a = 0; a < 14; a++) {
          const th = (a / 14) * Math.PI * 2;
          add(traces, px + Math.cos(th) * 0.18, py + Math.sin(th) * 0.18, 0, col, 2.4, 2, alpha * 1.3, along);
        }
      };
      pad(x, y);
      for (let s = 0; s < segs; s++) {
        const len = rnd(1.2, 5);
        const [dx, dy] = dirs[d];
        for (let q = 0; q < len; q += 0.09) add(traces, x + dx * q, y + dy * q, 0, col, 2.4, 2, alpha, along + q);
        x += dx * len;
        y += dy * len;
        along += len;
        d = d < 4 ? (Math.random() < 0.5 ? 4 + Math.floor(Math.random() * 4) : (d + (Math.random() < 0.5 ? 1 : 3)) % 4) : Math.floor(Math.random() * 4);
      }
      pad(x, y);
    }
    const bgU = { ...common, uFade: U.netFade };
    const build = (o: Bucket) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(o.P, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(o.C, 3));
      g.setAttribute("aRand", new THREE.Float32BufferAttribute(o.RA, 4));
      g.setAttribute("aSize", new THREE.Float32BufferAttribute(o.SZ, 1));
      g.setAttribute("aType", new THREE.Float32BufferAttribute(o.T, 1));
      g.setAttribute("aTrace", new THREE.Float32BufferAttribute(o.TR, 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
      const mat = new THREE.ShaderMaterial({ uniforms: bgU, vertexShader: bgVert, fragmentShader: softFrag, ...additive });
      return { geo: g, mat, points: new THREE.Points(g, mat) };
    };
    const dustBuilt = build(dust);
    dustGeometry = dustBuilt.geo;
    dustMaterial = dustBuilt.mat;
    dustGroup.add(dustBuilt.points);
    const traceBuilt = build(traces);
    traceGeometry = traceBuilt.geo;
    traceMaterial = traceBuilt.mat;
    tracePoints = traceBuilt.points;
    tracePoints.position.z = -16;
    camera.add(tracePoints);
  }

  const LS = NCFG.linkSlots;
  const LK = NCFG.linkParticles;
  const LP = LS * LK;
  const lPos = new Float32Array(LP * 3);
  const lCol = new Float32Array(LP * 3);
  const lAlpha = new Float32Array(LP);
  const lSize = new Float32Array(LP);
  const lT = new Float32Array(LP);
  const lJit = new Float32Array(LP * 3);
  const lSeed = new Float32Array(LP);
  const lVel = new Float32Array(LP * 3);
  const lLife = new Float32Array(LP);
  const lRate = new Float32Array(LP);
  const lHalo = new Uint8Array(LP);
  for (let i = 0; i < LP; i++) {
    lT[i] = Math.random();
    lHalo[i] = Math.random() < 0.22 ? 1 : 0;
    const j = randUnit().multiplyScalar(lHalo[i] ? rnd(0.03, 0.09) : rnd(0, 0.014));
    lJit[i * 3] = j.x;
    lJit[i * 3 + 1] = j.y;
    lJit[i * 3 + 2] = j.z;
    lSeed[i] = Math.random();
    lSize[i] = (lHalo[i] ? rnd(3.5, 6.5) : rnd(1.8, 3.2)) * LINK_COMP;
    const c = palette.orange.clone().lerp(palette.orangeHot, Math.random() * 0.8);
    lCol[i * 3] = c.r;
    lCol[i * 3 + 1] = c.g;
    lCol[i * 3 + 2] = c.b;
  }
  interface Slot {
    state: number;
    a: number;
    b: number;
    grow: number;
    speed: number;
    bend: number;
    bendPh: number;
    bendSpd: number;
    phase: number;
  }
  const slot: Slot[] = Array.from({ length: LS }, () => ({
    state: 0,
    a: 0,
    b: 0,
    grow: 0,
    speed: 1,
    bend: 0,
    bendPh: 0,
    bendSpd: 0,
    phase: 0,
  }));
  const linked = new Set<number>();
  const key = (a: number, b: number) => (a < b ? a * 64 + b : b * 64 + a);
  const linkGeometry = new THREE.BufferGeometry();
  const lPosAttr = new THREE.BufferAttribute(lPos, 3).setUsage(THREE.DynamicDrawUsage);
  const lAlphaAttr = new THREE.BufferAttribute(lAlpha, 1).setUsage(THREE.DynamicDrawUsage);
  linkGeometry.setAttribute("position", lPosAttr);
  linkGeometry.setAttribute("aAlpha", lAlphaAttr);
  linkGeometry.setAttribute("color", new THREE.BufferAttribute(lCol, 3));
  linkGeometry.setAttribute("aSize", new THREE.BufferAttribute(lSize, 1));
  linkGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  const linkMaterial = new THREE.ShaderMaterial({
    uniforms: { ...common, uFade: U.netFade, uNetScale: U.netScale },
    vertexShader: linkVert,
    fragmentShader: softFrag,
    ...additive,
  });
  network.add(new THREE.Points(linkGeometry, linkMaterial));

  function formLink() {
    const s = slot.find((q) => q.state === 0);
    if (!s) return;
    const a = Math.floor(Math.random() * NN);
    if (nodes[a].degree >= NCFG.maxDegree) return;
    const cands: [number, number][] = [];
    for (let b = 0; b < NN; b++) {
      if (b === a || linked.has(key(a, b)) || nodes[b].degree >= NCFG.maxDegree) continue;
      const d = nodes[a].base.distanceTo(nodes[b].base);
      if (d < NCFG.maxLinkDist) cands.push([d, b]);
    }
    if (!cands.length) return;
    cands.sort((x, y) => x[0] - y[0]);
    const b = cands[Math.floor(Math.random() * Math.min(3, cands.length))][1];
    Object.assign(s, {
      state: 1,
      a,
      b,
      grow: 0,
      speed: 1 / rnd(0.35, 0.8),
      bend: rnd(0.04, 0.2) * (Math.random() < 0.5 ? -1 : 1),
      bendPh: rnd(0, 6.3),
      bendSpd: rnd(-0.6, 0.6),
      phase: rnd(0, 6.3),
    });
    linked.add(key(a, b));
    nodes[a].degree++;
    nodes[b].degree++;
  }
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const uAx = new THREE.Vector3();
  const vAx = new THREE.Vector3();
  const bendV = new THREE.Vector3();
  const omega = new THREE.Vector3();

  function breakLink(s: Slot, strength = 1) {
    const si = slot.indexOf(s);
    dir.subVectors(nodes[s.b].pos, nodes[s.a].pos).normalize();
    const tb = rnd(0.25, 0.75);
    for (let j = 0; j < LK; j++) {
      const i = si * LK + j;
      const i3 = i * 3;
      if (lAlpha[i] <= 0.001) {
        lLife[i] = 0;
        continue;
      }
      const t = lT[i];
      const side = t < tb ? -1 : 1;
      const near = 1 - Math.min(1, Math.abs(t - tb) * 2.2);
      const recoil = (0.4 + near * 2.6) * rnd(0.6, 1.2) * strength;
      const px = lPos[i3];
      const py = lPos[i3 + 1];
      const pz = lPos[i3 + 2];
      const carry = rnd(0.35, 0.8);
      lVel[i3] = dir.x * side * recoil + (omega.y * pz - omega.z * py) * carry + gauss() * 0.25;
      lVel[i3 + 1] = dir.y * side * recoil + (omega.z * px - omega.x * pz) * carry + gauss() * 0.25;
      lVel[i3 + 2] = dir.z * side * recoil + (omega.x * py - omega.y * px) * carry + gauss() * 0.25;
      lLife[i] = 1;
      lRate[i] = 1 / rnd(0.7, 1.8);
    }
    s.state = 3;
    linked.delete(key(s.a, s.b));
    nodes[s.a].degree--;
    nodes[s.b].degree--;
    nodes[s.a].flash = Math.min(1.5, nodes[s.a].flash + 0.8);
    nodes[s.b].flash = Math.min(1.5, nodes[s.b].flash + 0.8);
  }

  let formAcc = 0;
  function updateLinks(dt: number, t: number, qrel: THREE.Quaternion, motion: number, allowForm: boolean) {
    let alive = 0;
    for (const s of slot) if (s.state === 1 || s.state === 2) alive++;
    for (const s of slot) {
      if (s.state !== 2) continue;
      const d = nodes[s.a].pos.distanceTo(nodes[s.b].pos);
      const stretch = Math.max(0, d / NCFG.maxLinkDist - 1.3);
      if (Math.random() < (0.012 + NCFG.breakRate * motion * motion + stretch * 4) * dt) breakLink(s, 0.6 + motion);
    }
    if (allowForm) {
      const deficit = Math.max(0, NCFG.targetLinks - alive) / NCFG.targetLinks;
      formAcc += (14 * deficit + 0.25) * (0.15 + 0.85 * Math.pow(1 - motion, 2)) * dt;
      while (formAcc >= 1) {
        formLink();
        formAcc -= 1;
      }
    }
    for (let si = 0; si < LS; si++) {
      const s = slot[si];
      const base = si * LK;
      if (s.state === 0) continue;
      if (s.state === 3) {
        const drag = Math.exp(-1.5 * dt);
        let any = false;
        for (let j = 0; j < LK; j++) {
          const i = base + j;
          const i3 = i * 3;
          if (lLife[i] <= 0) {
            lAlpha[i] = 0;
            continue;
          }
          any = true;
          tmpA.set(lPos[i3], lPos[i3 + 1], lPos[i3 + 2]).applyQuaternion(qrel);
          tmpB.set(lVel[i3], lVel[i3 + 1], lVel[i3 + 2]).applyQuaternion(qrel).multiplyScalar(drag);
          tmpB.y += 0.05 * dt;
          tmpA.addScaledVector(tmpB, dt);
          lPos[i3] = tmpA.x;
          lPos[i3 + 1] = tmpA.y;
          lPos[i3 + 2] = tmpA.z;
          lVel[i3] = tmpB.x;
          lVel[i3 + 1] = tmpB.y;
          lVel[i3 + 2] = tmpB.z;
          lLife[i] -= lRate[i] * dt;
          const l = Math.max(0, lLife[i]);
          lAlpha[i] = (lHalo[i] ? 0.25 : 1.2) * Math.pow(l, 1.4) * (0.6 + 0.6 * l);
        }
        if (!any) s.state = 0;
        continue;
      }
      if (s.state === 1) {
        s.grow += s.speed * dt;
        if (s.grow >= 1) {
          s.grow = 1;
          s.state = 2;
          nodes[s.a].flash += 0.4;
          nodes[s.b].flash += 0.4;
        }
      }
      const nA = nodes[s.a];
      const nB = nodes[s.b];
      dir.subVectors(nB.pos, nA.pos);
      const L = dir.length();
      dir.divideScalar(L);
      uAx.set(0, 1, 0).cross(dir);
      if (uAx.lengthSq() < 1e-4) uAx.set(1, 0, 0).cross(dir);
      uAx.normalize();
      vAx.crossVectors(dir, uAx);
      const ph = s.bendPh + t * s.bendSpd;
      bendV.copy(uAx).multiplyScalar(Math.cos(ph)).addScaledVector(vAx, Math.sin(ph)).multiplyScalar(s.bend * L);
      tmpA.copy(nA.pos).addScaledVector(dir, nA.r * 0.82);
      tmpB.copy(nB.pos).addScaledVector(dir, -nB.r * 0.82);
      const half = s.grow * 0.5;
      for (let j = 0; j < LK; j++) {
        const i = base + j;
        const i3 = i * 3;
        const tt = lT[i];
        const arcK = 4 * tt * (1 - tt);
        const wob = 0.7 + 0.3 * Math.sin(t * 2.2 + lSeed[i] * 30);
        lPos[i3] = tmpA.x + (tmpB.x - tmpA.x) * tt + bendV.x * arcK + lJit[i3] * wob;
        lPos[i3 + 1] = tmpA.y + (tmpB.y - tmpA.y) * tt + bendV.y * arcK + lJit[i3 + 1] * wob;
        lPos[i3 + 2] = tmpA.z + (tmpB.z - tmpA.z) * tt + bendV.z * arcK + lJit[i3 + 2] * wob;
        const edge = Math.min(tt, 1 - tt);
        if (edge > half) {
          lAlpha[i] = 0;
          continue;
        }
        const front = s.state === 1 ? Math.exp(-Math.pow((half - edge) * 18, 2)) * 2 : 0;
        const pulse = Math.pow(0.5 + 0.5 * Math.sin(tt * L * 5 - t * 5 + s.phase), 6);
        lAlpha[i] = (lHalo[i] ? 0.2 : 0.95) * (0.6 + 1.2 * pulse + front);
      }
    }
    lPosAttr.needsUpdate = true;
    lAlphaAttr.needsUpdate = true;
  }

  const tmpN = new THREE.Vector3();
  const tmpW = new THREE.Vector3();
  function updateNodes(dt: number, t: number, qrel: THREE.Quaternion) {
    const decay = Math.exp(-NCFG.nodeDamping * dt);
    nodes.forEach((n, i) => {
      tmpN.set(Math.sin(t * n.freq.x + n.phase.x), Math.sin(t * n.freq.y + n.phase.y), Math.sin(t * n.freq.z + n.phase.z))
        .multiplyScalar(n.drift)
        .add(n.base);
      tmpW.copy(n.pos).applyQuaternion(qrel);
      n.off.subVectors(tmpW, tmpN);
      n.vel.applyQuaternion(qrel).addScaledVector(n.off, -NCFG.nodeSpring * dt).multiplyScalar(decay);
      n.off.addScaledVector(n.vel, dt);
      if (n.off.length() > NCFG.nodeLagMax) {
        n.off.setLength(NCFG.nodeLagMax);
        n.vel.multiplyScalar(0.7);
      }
      n.pos.copy(tmpN).add(n.off);
      n.flash *= Math.exp(-2.2 * dt);
      U.nodes.value[i].set(n.pos.x, n.pos.y, n.pos.z, n.flash);
    });
  }

  const REF_LOGO_PX = 1040;
  function fit() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    const aspect = w / h;
    camera.aspect = aspect;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(11, (CFG.worldWidth * 0.62) / (tanH * aspect));
    camera.position.set(0, 0, dist);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    const logoPx = (w * CFG.worldWidth) / (2 * dist * tanH * aspect);
    U.camZ.value = dist;
    U.sizeScale.value = (logoPx / REF_LOGO_PX) * 1.09;
    const halfW = dist * tanH * aspect;
    const s = THREE.MathUtils.clamp((halfW * 0.82) / 3.3, 0.85, 1.7);
    network.scale.setScalar(s);
    U.netScale.value = s / 0.85;
  }
  fit();
  const resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(container);

  // Opens already showing the network. Same interaction as the standalone prototype: drag horizontally to
  // rotate (the logo follows the drag directly; the network also picks up the swipe's speed as inertia once
  // released), and a quick, stationary tap morphs logo⇄network.
  let mode: "logo" | "toNet" | "net" | "toLogo" = "net";
  let modeT = 0;
  const rot = { yaw: 0, pitch: 0, vel: 0, pOff: 0 };
  const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  let dragging = false;
  let dragX0 = 0;
  let dragY0 = 0;
  let downT = 0;
  let moved = 0;
  let logoDrag0 = 0;
  let logoDrag = 0;
  let lastX = 0;
  let lastXT = 0;
  let fingerVel = 0;
  let lastInput = -10;

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    moved = 0;
    dragX0 = lastX = e.clientX;
    dragY0 = e.clientY;
    downT = lastXT = performance.now();
    logoDrag0 = logoDrag = points.rotation.y;
    fingerVel = 0;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragX0;
    moved = Math.max(moved, Math.hypot(dx, e.clientY - dragY0));
    const now = performance.now();
    const w = container.clientWidth;
    logoDrag = THREE.MathUtils.clamp(logoDrag0 + (dx / w) * CFG.dragSensitivity, -CFG.maxRotY * 1.4, CFG.maxRotY * 1.4);
    const step = ((e.clientX - lastX) / w) * NCFG.swipeTurn;
    if (mode === "net" || mode === "toNet") rot.yaw += step;
    const dtm = Math.max(1, now - lastXT) / 1000;
    fingerVel = fingerVel * 0.6 + (step / dtm) * 0.4;
    lastX = e.clientX;
    lastXT = now;
    lastInput = clock.elapsedTime;
  };
  function toggle() {
    if (mode === "logo" && logoU.uProgress.value >= 1) {
      rot.yaw = points.rotation.y;
      rot.pitch = points.rotation.x;
      rot.vel = 0;
      rot.pOff = rot.pitch;
      for (const s of slot) {
        if (s.state !== 0) {
          if (s.state !== 3) {
            linked.delete(key(s.a, s.b));
            nodes[s.a].degree--;
            nodes[s.b].degree--;
          }
          s.state = 0;
        }
      }
      lAlpha.fill(0);
      formAcc = 0;
      mode = "toNet";
      modeT = 0;
    } else if (mode === "net") {
      for (const s of slot) if (s.state === 1 || s.state === 2) breakLink(s, 2.4);
      points.rotation.y = wrapAngle(rot.yaw);
      points.rotation.x = wrapAngle(rot.pitch);
      rot.vel = 0;
      mode = "toLogo";
      modeT = 0;
    }
  }
  const endDrag = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (e.type === "pointerup" && moved < 10 && performance.now() - downT < 300) toggle();
    else if (mode === "net" || mode === "toNet") rot.vel = THREE.MathUtils.clamp(fingerVel, -9, 9);
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  let visible = true;
  let onScreen = true;
  let running = false;
  let raf = 0;
  let fpsFrames = 0;
  let fpsTime = 0;
  let fpsChecked = false;
  const clock = new THREE.Clock();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const qCurr = new THREE.Quaternion();
  const qPrev = new THREE.Quaternion();
  const qrel = new THREE.Quaternion();
  const qIdentity = new THREE.Quaternion();
  const invLogo = new THREE.Matrix4();
  let motionS = 0;

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    modeT += dt;
    U.time.value = t;
    logoU.uProgress.value = Math.min(1, t / 3.2);

    if (mode === "toNet") {
      const m = Math.min(1, modeT / MORPH.toNetDuration);
      logoU.uMorph.value = m;
      const f = Math.min(1, Math.max(0, (modeT - MORPH.handoff * MORPH.toNetDuration) / MORPH.fadeDuration));
      U.netFade.value = smooth(f);
      logoU.uLogoFade.value = 1 - smooth(Math.min(1, Math.max(0, (f - 0.25) / 0.75)));
      if (m >= 1 && f >= 1) {
        mode = "net";
        modeT = 0;
      }
    } else if (mode === "toLogo") {
      const m = 1 - Math.min(1, modeT / MORPH.toLogoDuration);
      logoU.uMorph.value = m;
      U.netFade.value = 1 - smooth(Math.min(1, modeT / MORPH.fadeDuration));
      logoU.uLogoFade.value = smooth(Math.min(1, modeT / 0.5));
      if (m <= 0) {
        mode = "logo";
        modeT = 0;
        U.netFade.value = 0;
      }
    }
    const logoVisible = logoU.uLogoFade.value > 0.001;
    const netVisible = U.netFade.value > 0.001 || mode !== "logo";
    points.visible = logoVisible;
    network.visible = dustGroup.visible = netVisible;

    const ty = dragging ? logoDrag : Math.sin(t * 0.22) * 0.3;
    const tx = Math.sin(t * 0.17) * 0.06;
    const k = 1 - Math.pow(dragging ? 0.002 : t - lastInput < 1.5 ? 0.12 : 0.3, dt);
    const ldy = (ty - points.rotation.y) * k;
    const ldx = (tx - points.rotation.x) * k;
    points.rotation.y += ldy;
    points.rotation.x += ldx;
    points.updateMatrixWorld();
    if (mode === "logo") physics.step(dt, ldx, ldy);

    if (mode === "logo") {
      rot.yaw = points.rotation.y;
      rot.pitch = points.rotation.x;
    } else {
      if (!dragging) {
        rot.yaw += (NCFG.autoSpin + rot.vel) * dt;
        rot.vel *= Math.exp(-NCFG.spinFriction * dt);
      }
      rot.pOff *= Math.exp(-0.5 * dt);
      const pitchTarget = Math.sin(t * 0.19) * 0.45 + rot.pOff;
      rot.pitch += (pitchTarget - rot.pitch) * (1 - Math.pow(0.2, dt));
    }
    euler.set(rot.pitch, rot.yaw, 0);
    qPrev.copy(qCurr);
    qCurr.setFromEuler(euler);
    network.quaternion.copy(qCurr);
    network.updateMatrixWorld();
    dustGroup.quaternion.slerpQuaternions(qIdentity, qCurr, 0.3);

    qrel.copy(qCurr).invert().multiply(qPrev);
    const w = qrel.w < 0 ? -1 : 1;
    const idt = 1 / Math.max(dt, 1e-4);
    omega.set(-2 * qrel.x * w * idt, -2 * qrel.y * w * idt, -2 * qrel.z * w * idt);
    const motion = Math.min(1, omega.length() / NCFG.motionScale);
    motionS += (motion - motionS) * (1 - Math.exp(-(motion > motionS ? 8 : 1.5) * dt));

    updateNodes(dt, t, mode === "logo" ? qIdentity : qrel);
    if (netVisible) updateLinks(dt, t, qrel, motionS, mode === "net" || (mode === "toNet" && U.netFade.value > 0.3));

    invLogo.copy(points.matrixWorld).invert();
    logoU.uNetToLogo.value.multiplyMatrices(invLogo, network.matrixWorld);

    renderer.render(scene, camera);

    if (!fpsChecked && t > 3.5) {
      fpsFrames++;
      fpsTime += dt;
      if (fpsTime > 2) {
        fpsChecked = true;
        if (fpsFrames / fpsTime < 45 && pixelRatio > 1) {
          pixelRatio = 1;
          renderer.setPixelRatio(1);
          U.pr.value = 1;
          fit();
        }
      }
    }
    raf = requestAnimationFrame(tick);
  }
  function updateRunning() {
    const should = visible && onScreen;
    if (should && !running) {
      running = true;
      clock.getDelta();
      raf = requestAnimationFrame(tick);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }
  const onVisibility = () => {
    visible = !document.hidden;
    updateRunning();
  };
  document.addEventListener("visibilitychange", onVisibility);
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    updateRunning();
  });
  io.observe(container);
  updateRunning();

  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", endDrag);
    canvas.removeEventListener("pointercancel", endDrag);
    geometry.dispose();
    logoMaterial.dispose();
    nodeGeometry.dispose();
    nodeMaterial.dispose();
    linkGeometry.dispose();
    linkMaterial.dispose();
    dustGeometry.dispose();
    dustMaterial.dispose();
    traceGeometry.dispose();
    traceMaterial.dispose();
    renderer.dispose();
  };
}
