// WEGG ⇄ Nuvion particle-morph hero, adapted from the standalone design reference (wegg-nuvion-morph-3d.html) to
// live inside a normal page: sized to its own container (not the viewport), pointer interaction scoped to that
// container (not the whole window), particle count scaled down on small screens, idle camera sway skipped under
// prefers-reduced-motion, and the render loop paused via IntersectionObserver while the hero is off-screen. Used
// only by src/pages/parceiros/wegg.astro — this page is intentionally isolated from the rest of the site, so this
// script lives apart from scripts/site.ts too.
import * as THREE from "three";

const CFG = {
  hold: 2.0,
  morphDuration: 2.4,
  swirl: 0.9,
  wispRatio: 0.08,
  shedRatio: 0.12,
  shedAmount: 1.0,
  springMin: 60,
  springMax: 160,
  springDamping: 6.5,
  wobbleMax: 0.045,
  airDrag: 1.3,
  buoyancy: 0.18,
  worldWidth: 9,
  maxRotY: 0.55,
  maxRotX: 0.4,
};
const COL = {
  slate: new THREE.Color("#6f93bd"),
  slateLight: new THREE.Color("#e3edf8"),
  white: new THREE.Color("#f4f7ff"),
  blue: new THREE.Color("#a3c6ff"),
  orange: new THREE.Color("#e84a18"),
  haze: new THREE.Color("#6f8fb8"),
};

const gauss = () => {
  let u = 0,
    v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const shellR = () => (Math.random() < 0.8 ? 0.88 + Math.random() * 0.12 : Math.sqrt(Math.random()) * 0.88);

function genNuvion(n: number) {
  const R_PX = 4,
    STEP = 0.25,
    DOT_R_PX = 4.1;
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const k = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / STEP));
    return Array.from({ length: k + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / k, y0 + ((y1 - y0) * i) / k]);
  };
  const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, dir: number) => {
    const k = Math.ceil((Math.abs(a1 - a0) * Math.max(rx, ry)) / STEP);
    return Array.from({ length: k + 1 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / k;
      return [cx + rx * Math.cos(a), cy + dir * ry * Math.sin(a)];
    });
  };
  const circle = (cx: number, cy: number, rx: number, ry: number) =>
    Array.from({ length: 901 }, (_, i) => {
      const a = (i / 900) * Math.PI * 2;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    });
  const join = (...s: number[][][]) => s.flat();
  const V_A = [137.5, 4, 158, 47.5],
    V_B = [158, 47.5, 178.5, 4];
  const PATHS: { pts: number[][]; avoid?: number[][]; closed?: boolean; noStartCap?: boolean }[] = [
    { pts: join(line(3.5, 35, 3.5, 20), arc(22.5, 20, 19, 16, Math.PI, 0, -1), line(41.5, 20, 41.5, 47.5)) },
    { pts: join(line(70.5, 4, 70.5, 31), arc(89.5, 31, 19, 16, Math.PI, 0, 1), line(108.5, 31, 108.5, 4)) },
    { pts: line(V_A[0], V_A[1], V_A[2], V_A[3]), avoid: [V_B] },
    { pts: line(V_B[0], V_B[1], V_B[2], V_B[3]), avoid: [V_A], noStartCap: true },
    { pts: line(206.5, 15.5, 206.5, 47.5) },
    { pts: circle(257, 25.5, 21, 21.5), closed: true },
    { pts: join(line(307.5, 47.5, 307.5, 20), arc(326.5, 20, 19, 16, Math.PI, 0, -1), line(345.5, 20, 345.5, 35)) },
  ];
  const DOTS = [
    [3.5, 47.5],
    [207, 4],
    [345.5, 47.5],
  ];
  const S = CFG.worldWidth / 350;
  const toWorld = (x: number, y: number) => [(x - 175) * S, -(y - 26) * S];
  const R = R_PX * S;

  let total = 0;
  const paths = PATHS.map((P) => {
    const cum = [0];
    for (let i = 1; i < P.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(P.pts[i][0] - P.pts[i - 1][0], P.pts[i][1] - P.pts[i - 1][1]));
    const len = cum[cum.length - 1];
    const capA = P.closed || P.noStartCap ? 0 : R_PX,
      capB = P.closed ? 0 : R_PX;
    total += len + capA + capB;
    return { ...P, avoid: P.avoid || [], cum, len, capA, ext: len + capA + capB };
  });
  const samplePath = (P: (typeof paths)[number], s: number) => {
    const { pts, cum } = P;
    let lo = 0,
      hi = cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cum[m] < s) lo = m;
      else hi = m;
    }
    const a = pts[lo],
      b = pts[hi],
      f = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
    const tx = b[0] - a[0],
      ty = b[1] - a[1],
      tl = Math.hypot(tx, ty) || 1;
    return { x: a[0] + tx * f, y: a[1] + ty * f, tx: tx / tl, ty: ty / tl };
  };
  const insideSeg = (px: number, py: number, z: number, [x0, y0, x1, y1]: number[]) => {
    const dx = x1 - x0,
      dy = y1 - y0,
      t = ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy);
    if (t < 0 || t > 1) return false;
    const d = Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t)) * S;
    return (d / R) ** 2 + (z / R) ** 2 < 1.02;
  };

  const out = { P: new Float32Array(n * 3), N: new Float32Array(n * 3), C: new Float32Array(n * 3) };
  const c = new THREE.Color(),
    nv = new THREE.Vector3();
  let i = 0;
  const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, col: THREE.Color) => {
    out.P.set([x, y, z], i * 3);
    nv.set(nx, ny, nz).normalize();
    out.N.set([nv.x, nv.y, nv.z], i * 3);
    out.C.set([col.r, col.g, col.b], i * 3);
    i++;
  };
  const dotsEach = Math.round((n * 0.038) / 3);
  const nLetters = n - dotsEach * 3;
  while (i < nLetters) {
    let s = Math.random() * total,
      P = paths[0];
    for (const p of paths) {
      if (s <= p.ext) {
        P = p;
        break;
      }
      s -= p.ext;
    }
    let s0 = s - P.capA,
      along = 0;
    if (s0 < 0) {
      along = s0;
      s0 = 0;
    } else if (s0 > P.len) {
      along = s0 - P.len;
      s0 = P.len;
    }
    const q = samplePath(P, s0);
    const a = along / R_PX,
      rho = Math.sqrt(Math.max(0, 1 - a * a));
    const nx2 = -q.ty,
      ny2 = q.tx,
      th = Math.random() * Math.PI * 2,
      rr = shellR();
    const cx = Math.cos(th) * rho,
      sz = Math.sin(th) * rho;
    const ux = q.tx * a + nx2 * cx,
      uy = q.ty * a + ny2 * cx;
    const ox = ux * rr * R_PX,
      oy = uy * rr * R_PX,
      oz = sz * R * rr;
    if (P.avoid.length && P.avoid.some((sg) => insideSeg(q.x + ox, q.y + oy, oz, sg))) continue;
    const [wx, wy] = toWorld(q.x + ox, q.y + oy);
    put(wx, wy, oz, ux, -uy, sz, c.copy(COL.white).lerp(COL.blue, Math.random() * 0.5));
  }
  for (const [x, y] of DOTS) {
    const [wx, wy] = toWorld(x, y),
      r = DOT_R_PX * S;
    for (let k = 0; k < dotsEach; k++) {
      const th = Math.random() * Math.PI * 2,
        uz = Math.random() * 2 - 1,
        rq = Math.sqrt(1 - uz * uz);
      const ux = rq * Math.cos(th),
        uy = rq * Math.sin(th),
        rr = shellR();
      put(wx + ux * r * rr, wy + uy * r * rr, uz * r * rr, ux, uy, uz, c.copy(COL.orange).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.1));
    }
  }
  return out;
}

function genWegg(n: number) {
  const SX = 2.12,
    RES = 6,
    PAD = 4,
    W_U = 600 / SX,
    H_U = 75,
    HALF = 4,
    RZ = 0.11;
  const w = Math.ceil((W_U + PAD * 2) * RES),
    h = Math.ceil((H_U + PAD * 2) * RES);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.setTransform(RES, 0, 0, RES, PAD * RES, PAD * RES);
  ctx.fillStyle = ctx.strokeStyle = "#fff";
  ctx.lineCap = "butt";
  ctx.save();
  ctx.beginPath();
  ctx.rect(-10, 0.8, 200, 73);
  ctx.clip();
  ctx.lineWidth = 7.4;
  const seg = (x0: number, y0: number, x1: number, y1: number, e0 = 6, e1 = 6) => {
    const dx = x1 - x0,
      dy = y1 - y0,
      l = Math.hypot(dx, dy);
    ctx.beginPath();
    ctx.moveTo(x0 - (dx / l) * e0, y0 - (dy / l) * e0);
    ctx.lineTo(x1 + (dx / l) * e1, y1 + (dy / l) * e1);
    ctx.stroke();
  };
  seg(3.9, 1, 23.1, 73.5);
  seg(23.1, 73.5, 40.2, 16, 6, 0);
  seg(34.4, 1, 54.2, 73.5);
  seg(54.2, 73.5, 73.35, 1);
  ctx.restore();
  ctx.fillRect(101.9, 0.8, 7.6, 73);
  ctx.fillRect(101.9, 0.8, 33.7, 8);
  ctx.fillRect(101.9, 32.8, 33.7, 7);
  ctx.fillRect(101.9, 65.8, 33.7, 8);
  for (const off of [0, 159 / SX]) {
    ctx.lineWidth = 8.4;
    ctx.beginPath();
    ctx.ellipse(186.8 + off, 37.25, 23.4, 32.9, 0, (-41 * Math.PI) / 180, (41.6 * Math.PI) / 180, true);
    ctx.stroke();
    ctx.fillRect(200.0 + off, 36.8, 8.0, 25.5);
    ctx.fillRect(189.6 + off, 36.8, 18.4, 10.0);
  }
  const img = ctx.getImageData(0, 0, w, h).data;
  const NPX = w * h,
    D = new Float32Array(NPX);
  for (let i = 0; i < NPX; i++) D[i] = img[i * 4 + 3] > 127 ? 1e9 : 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!D[i]) continue;
      D[i] = Math.min(D[i], D[i - 1] + 3, D[i - w] + 3, D[i - w - 1] + 4, D[i - w + 1] + 4);
    }
  for (let y = h - 2; y > 0; y--)
    for (let x = w - 2; x > 0; x--) {
      const i = y * w + x;
      if (!D[i]) continue;
      D[i] = Math.min(D[i], D[i + 1] + 3, D[i + w] + 3, D[i + w + 1] + 4, D[i + w - 1] + 4);
    }
  const inside: number[] = [];
  for (let i = 0; i < NPX; i++)
    if (D[i] > 0) {
      D[i] /= 3;
      inside.push(i);
    }

  const S0 = CFG.worldWidth / (W_U * SX);
  const Hpx = HALF * RES,
    Hw = HALF * S0,
    slopeK = RZ / Hw;
  const out = { P: new Float32Array(n * 3), N: new Float32Array(n * 3), C: new Float32Array(n * 3) };
  const c = new THREE.Color(),
    nv = new THREE.Vector3();
  let i = 0;
  while (i < n) {
    const idx = inside[(Math.random() * inside.length) | 0];
    const px = idx % w,
      py = (idx / w) | 0;
    const r = Math.max(0, Math.min(0.995, 1 - D[idx] / Hpx)),
      zr = Math.sqrt(1 - r * r);
    const surface = Math.random() < 0.8;
    if (surface && Math.random() > Math.min(1, Math.sqrt(1 + Math.pow((slopeK * r) / zr, 2)) / 6)) continue;
    let gx = (D[idx + 1] - D[idx - 1]) * 0.5,
      gy = (D[idx + w] - D[idx - w]) * 0.5;
    const gl = Math.hypot(gx, gy) || 1;
    gx /= gl;
    gy /= gl;
    const side = Math.random() < 0.5 ? -1 : 1;
    const z = side * RZ * zr * (surface ? 1 : Math.random());
    const u = (px + Math.random()) / RES - PAD,
      v = (py + Math.random()) / RES - PAD;
    out.P.set([(u - W_U / 2) * SX * S0, -(v - H_U / 2) * S0, z], i * 3);
    nv.set((r * -gx) / (Hw * SX), (r * gy) / Hw, z / (RZ * RZ)).normalize();
    out.N.set([nv.x, nv.y, nv.z], i * 3);
    c.copy(COL.slate).lerp(COL.slateLight, Math.pow(Math.random(), 1.5) * 0.85);
    out.C.set([c.r, c.g, c.b], i * 3);
    i++;
  }
  return out;
}

function buildGeometry(letterParticles: number, hazeParticles: number) {
  const n = letterParticles,
    total = n + hazeParticles;
  const A = genWegg(n),
    B = genNuvion(n);
  const order = (src: { P: Float32Array }) =>
    Array.from({ length: n }, (_, k) => k)
      .map((k) => [src.P[k * 3] + gauss() * 0.12, k])
      .sort((a, b) => a[0] - b[0])
      .map((e) => e[1]);
  const oA = order(A),
    oB = order(B);

  const pos = new Float32Array(total * 3),
    nor = new Float32Array(total * 3),
    col = new Float32Array(total * 3);
  const posB = new Float32Array(total * 3),
    norB = new Float32Array(total * 3),
    colB = new Float32Array(total * 3);
  const scatter = new Float32Array(total * 3),
    rand = new Float32Array(total * 4);
  const size = new Float32Array(total),
    type = new Float32Array(total);

  for (let k = 0; k < n; k++) {
    const a = oA[k] * 3,
      b = oB[k] * 3,
      d = k * 3;
    for (let j = 0; j < 3; j++) {
      pos[d + j] = A.P[a + j];
      nor[d + j] = A.N[a + j];
      col[d + j] = A.C[a + j];
      posB[d + j] = B.P[b + j];
      norB[d + j] = B.N[b + j];
      colB[d + j] = B.C[b + j];
    }
    const r = Math.random();
    type[k] = r < CFG.wispRatio ? 3 : r < CFG.wispRatio + CFG.shedRatio ? 4 : 0;
    size[k] = 1.6 + Math.random() * 1.6;
  }
  const c = new THREE.Color();
  for (let k = n; k < total; k++) {
    const d = k * 3;
    pos[d] = posB[d] = (Math.random() - 0.5) * 14;
    pos[d + 1] = posB[d + 1] = gauss() * 1.05;
    pos[d + 2] = posB[d + 2] = gauss() * 1.6;
    nor[d + 2] = norB[d + 2] = 1;
    c.copy(COL.haze).lerp(COL.slateLight, Math.random() * 0.35);
    col[d] = colB[d] = c.r;
    col[d + 1] = colB[d + 1] = c.g;
    col[d + 2] = colB[d + 2] = c.b;
    type[k] = 2;
    size[k] = 3 + Math.random() * 7;
  }
  for (let k = 0; k < total; k++) {
    const r = 6 + Math.random() * 9,
      th = Math.random() * Math.PI * 2,
      ph = Math.acos(2 * Math.random() - 1);
    scatter[k * 3] = r * Math.sin(ph) * Math.cos(th);
    scatter[k * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.6;
    scatter[k * 3 + 2] = r * Math.cos(ph);
    rand.set([Math.random(), Math.random(), Math.random(), Math.random()], k * 4);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aPosB", new THREE.BufferAttribute(posB, 3));
  g.setAttribute("aNorB", new THREE.BufferAttribute(norB, 3));
  g.setAttribute("aColB", new THREE.BufferAttribute(colB, 3));
  g.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
  g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aType", new THREE.BufferAttribute(type, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  return g;
}

const vertexShader = /* glsl */ `
  uniform float uTime, uProgress, uPixelRatio, uShockTime, uMix;
  uniform vec3 uShockPos, uLightDir;
  attribute vec4 aOffset;
  attribute vec3 aScatter, aPosB, aNorB, aColB;
  attribute vec4 aRand;
  attribute float aSize, aType;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float t = uTime;
    bool isHaze = aType > 1.5 && aType < 2.5;
    bool isWisp = aType > 2.5 && aType < 3.5;

    float m = clamp(uMix * 1.5 - aRand.w * 0.5, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    float mid = sin(3.14159 * m);
    vec3 base = mix(position, aPosB, m);
    vec3 nrm = normalize(mix(normal, aNorB, m) + vec3(0.0, 0.0, 1e-3));
    vec3 col = mix(color, aColB, m);
    float alphaMul = 1.0;

    if (isHaze) {
      base.x = mod(base.x + t * 0.10 * (0.4 + aRand.x) + 7.0, 14.0) - 7.0;
      alphaMul = smoothstep(7.0, 5.0, abs(base.x));
    } else {
      vec3 dir = normalize(aRand.xyz - 0.5 + 1e-3);
      base += (dir * ${CFG.swirl.toFixed(2)} + vec3(0.0, 0.0, (aRand.y - 0.5) * 1.2)) * mid;
    }

    float pr = clamp(uProgress * 1.7 - aRand.w * 0.7, 0.0, 1.0);
    pr = 1.0 - pow(1.0 - pr, 3.0);
    vec3 p = mix(aScatter, base, pr);

    vec3 ph = aRand.xyz * 6.2831;
    vec3 wave = vec3(
      sin(t * 0.35 + base.y * 1.7 + ph.x) + 0.5 * sin(t * 0.81 + base.x * 2.3 + ph.y),
      cos(t * 0.30 + base.x * 1.3 + ph.y) + 0.5 * cos(t * 0.67 + base.z * 2.9 + ph.z),
      sin(t * 0.25 + base.x * 0.9 + base.y * 1.1 + ph.z)
    );
    p += wave * (isHaze ? 0.3 : 0.008 + 0.12 * mid);

    if (isWisp) {
      float life = fract(t * 0.07 * (0.6 + aRand.x) + aRand.w);
      p += nrm * life * 0.35 + vec3(0.25, 0.55, 0.0) * life * life + wave * life * 0.12;
      alphaMul = smoothstep(0.0, 0.08, life) * (1.0 - life);
    }

    p += aOffset.xyz * pr;

    float st = t - uShockTime;
    float ring = 0.0;
    if (st > 0.0 && st < 3.0) {
      vec2 sd = p.xy - uShockPos.xy;
      float sdist = length(sd);
      ring = exp(-pow((sdist - st * 3.2) * 1.8, 2.0)) * (1.0 - st / 3.0);
      p.xy += (sdist > 1e-4 ? sd / sdist : vec2(0.0)) * ring * 0.55;
      p.z  += ring * (aRand.z - 0.5) * 1.4;
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (12.0 / -mv.z);

    vec3 n = normalize(normalMatrix * nrm);
    vec3 L = normalize(uLightDir);
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);
    float rim = pow(1.0 - abs(n.z), 2.5);
    float light = 0.6 + 0.8 * diff + 0.5 * spec + 0.3 * rim + ring;
    float facing = smoothstep(-0.45, 0.2, n.z);

    float baseA;
    bool detached = aOffset.w < 0.995;
    if (isHaze) { light = 0.8; facing = 1.0; baseA = 0.07; }
    else if (isWisp) { baseA = 0.45; facing = 1.0; }
    else baseA = 0.95;
    if (detached) { facing = 1.0; light = max(light, 0.9); }
    facing = mix(facing, 1.0, mid);

    vColor = col * light * 1.15;
    float twinkle = 0.85 + 0.15 * sin(t * 1.7 + aRand.z * 40.0);
    vAlpha = baseA * twinkle * alphaMul * aOffset.w * mix(0.14, 1.0, facing) * mix(0.35, 1.0, pr);
  }
`;
const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = pow(1.0 - d * 2.0, 1.2);
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

export function initWeggMorph(canvas: HTMLCanvasElement, container: HTMLElement, reduced: boolean) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch {
    canvas.style.display = "none";
    return;
  }

  const small = container.clientWidth < 520;
  const letterParticles = small ? 11000 : 32000;
  const hazeParticles = small ? 1300 : 3500;
  const pixelRatio = Math.min(window.devicePixelRatio, small ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 100);
  // No mobile a faixa do logo é bem mais baixa (16:9 fixo), então a câmera fica bem mais perto pra caber a
  // mesma largura do mundo 3D — e cada partícula, por consequência, renderiza bem maior (ponto = tamanho /
  // distância da câmera). uSizeScale compensa isso só no tamanho do ponto, sem mudar a nitidez do render.
  const sizeScale = small ? 0.68 : 1;
  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uPixelRatio: { value: pixelRatio * sizeScale },
    uShockTime: { value: -10 },
    uShockPos: { value: new THREE.Vector3() },
    uLightDir: { value: new THREE.Vector3(-0.45, 0.6, 0.7) },
    uMix: { value: 0 },
  };
  const geometry = buildGeometry(letterParticles, hazeParticles);
  const points = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(points);

  const physics = (() => {
    const total = geometry.attributes.position.count;
    const PA = geometry.attributes.position.array as Float32Array,
      PB = geometry.attributes.aPosB.array as Float32Array;
    const NA = geometry.attributes.normal.array as Float32Array,
      NB = geometry.attributes.aNorB.array as Float32Array;
    const TYP = geometry.attributes.aType.array as Float32Array;
    const offArr = new Float32Array(total * 4);
    for (let i = 0; i < offArr.length; i += 4) offArr[i + 3] = 1;
    const offAttr = new THREE.BufferAttribute(offArr, 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aOffset", offAttr);
    const act: number[] = [];
    for (let i = 0; i < total; i++) if (TYP[i] < 1.5 || TYP[i] > 3.5) act.push(i);
    const vel = new Float32Array(total * 3);
    const k = new Float32Array(total),
      maxD = new Float32Array(total);
    const life = new Float32Array(total),
      lifeRate = new Float32Array(total),
      det = new Uint8Array(total);
    for (const i of act) {
      k[i] = CFG.springMin + Math.random() * (CFG.springMax - CFG.springMin);
      maxD[i] = CFG.wobbleMax * (0.4 + Math.random() * 0.6);
    }

    function step(dt: number, dthx: number, dthy: number, mixv: number) {
      if (dt <= 0) return;
      const wx = dthx / dt,
        wy = dthy / dt;
      const motion = Math.min(1, Math.hypot(wx, wy) / 0.9);
      const pDetach = 0.9 * motion * CFG.shedAmount * dt;
      const springDecay = Math.exp(-CFG.springDamping * dt),
        airDecay = Math.exp(-CFG.airDrag * dt);
      const mb = mixv,
        ma = 1 - mixv;

      for (let m = 0; m < act.length; m++) {
        const i = act[m],
          i3 = i * 3,
          i4 = i * 4;
        const px = PA[i3] * ma + PB[i3] * mb,
          py = PA[i3 + 1] * ma + PB[i3 + 1] * mb,
          pz = PA[i3 + 2] * ma + PB[i3 + 2] * mb;
        let dx = offArr[i4],
          dy = offArr[i4 + 1],
          dz = offArr[i4 + 2];
        let vx = vel[i3],
          vy = vel[i3 + 1],
          vz = vel[i3 + 2];
        const x = px + dx,
          y = py + dy,
          z = pz + dz;
        dx -= dthy * z;
        dy += dthx * z;
        dz -= dthx * y - dthy * x;

        if (det[i]) {
          const tvx = vx - dthy * vz,
            tvy = vy + dthx * vz,
            tvz = vz - (dthx * vy - dthy * vx);
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
        } else {
          vx = (vx - k[i] * dx * dt) * springDecay;
          vy = (vy - k[i] * dy * dt) * springDecay;
          vz = (vz - k[i] * dz * dt) * springDecay;
          dx += vx * dt;
          dy += vy * dt;
          dz += vz * dt;
          const len = Math.hypot(dx, dy, dz),
            lim = maxD[i];
          if (len > lim) {
            const s = lim / len;
            dx *= s;
            dy *= s;
            dz *= s;
            vx *= 0.6;
            vy *= 0.6;
            vz *= 0.6;
          }
          offArr[i4 + 3] = Math.min(1, offArr[i4 + 3] + dt * 1.5);
          if (TYP[i] > 3.5 && offArr[i4 + 3] >= 1 && Math.random() < pDetach) {
            det[i] = 1;
            life[i] = 1;
            lifeRate[i] = 1 / (1.2 + Math.random() * 2.2);
            const carry = 0.25 + Math.random() * 0.55,
              push = 0.12 + Math.random() * 0.3;
            const nx = NA[i3] * ma + NB[i3] * mb,
              ny = NA[i3 + 1] * ma + NB[i3 + 1] * mb,
              nz = NA[i3 + 2] * ma + NB[i3 + 2] * mb;
            vx = wy * z * carry + nx * push;
            vy = -wx * z * carry + ny * push;
            vz = (wx * y - wy * x) * carry + nz * push;
            offArr[i4 + 3] = 0.99;
          }
        }
        offArr[i4] = dx;
        offArr[i4 + 1] = dy;
        offArr[i4 + 2] = dz;
        vel[i3] = vx;
        vel[i3 + 1] = vy;
        vel[i3 + 2] = vz;
      }
      offAttr.needsUpdate = true;
    }
    return { step };
  })();

  function fitCamera() {
    const w = container.clientWidth,
      h = container.clientHeight || 1;
    const aspect = w / h;
    camera.aspect = aspect;
    const dist = (CFG.worldWidth * 0.66) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    camera.position.set(0, 0, Math.max(11, dist));
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  fitCamera();
  const ro = new ResizeObserver(() => fitCamera());
  ro.observe(container);

  const ndc = new THREE.Vector2(0, 0);
  let pointerActive = false,
    lastMove = -10;
  const targetRot = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const localRay = new THREE.Ray(),
    inv = new THREE.Matrix4(),
    hit = new THREE.Vector3();

  let target = 0,
    holdT = 0;
  // A rotação segue o mouse em QUALQUER lugar visível da página (não só sobre o canvas) — por isso o pointermove
  // vai na window, com a posição relativa ao container só por referência de enquadramento, e sempre fixa entre
  // -1..1 (o cursor pode estar bem longe da hero depois que a página rola). O clique/toque pra alternar o logo
  // continua só dentro do próprio canvas, senão qualquer clique na página (num botão, no FAQ) ia disparar o efeito.
  function setPointer(e: PointerEvent) {
    const rect = container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ndc.set(Math.max(-1, Math.min(1, nx)), Math.max(-1, Math.min(1, ny)));
    pointerActive = true;
    lastMove = clock.elapsedTime;
  }
  window.addEventListener("pointermove", setPointer);
  canvas.addEventListener("pointerdown", (e) => {
    setPointer(e);
    if (uniforms.uProgress.value < 1) return;
    target = 1 - target;
    holdT = 0;
    raycaster.setFromCamera(ndc, camera);
    inv.copy(points.matrixWorld).invert();
    localRay.copy(raycaster.ray).applyMatrix4(inv);
    if (localRay.intersectPlane(plane, hit)) {
      uniforms.uShockPos.value.copy(hit);
      uniforms.uShockTime.value = uniforms.uTime.value;
    }
  });
  document.addEventListener("pointerleave", () => {
    pointerActive = false;
  });
  window.addEventListener("blur", () => {
    pointerActive = false;
  });

  const clock = new THREE.Clock();

  let raf = 0;
  let running = false;
  function tick() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uProgress.value = Math.min(1, t / 3.2);

    const mixv = uniforms.uMix.value;
    if (uniforms.uProgress.value >= 1 && mixv === target) {
      holdT += dt;
      if (holdT >= CFG.hold) {
        target = 1 - target;
        holdT = 0;
      }
    }
    const stepM = dt / CFG.morphDuration;
    uniforms.uMix.value = target > mixv ? Math.min(target, mixv + stepM) : Math.max(target, mixv - stepM);

    const idle = reduced || !pointerActive || t - lastMove > 4;
    if (idle) targetRot.set(reduced ? 0 : Math.sin(t * 0.22) * 0.3, reduced ? 0 : Math.sin(t * 0.17) * 0.06);
    else targetRot.set(ndc.x * CFG.maxRotY, -ndc.y * CFG.maxRotX);
    const k = 1 - Math.pow(idle ? 0.3 : 0.04, dt);
    const dy = (targetRot.x - points.rotation.y) * k;
    const dx = (targetRot.y - points.rotation.x) * k;
    points.rotation.y += dy;
    points.rotation.x += dx;
    points.updateMatrixWorld();

    const mm = uniforms.uMix.value;
    physics.step(dt, dx, dy, mm * mm * (3 - 2 * mm));

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true;
    clock.start();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    },
    { threshold: 0.05 },
  );
  io.observe(container);
}
