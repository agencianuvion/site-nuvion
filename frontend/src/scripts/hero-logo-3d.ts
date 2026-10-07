// The home hero's background: the "nuvion" wordmark built out of ~43,000 WebGL particles (GPU point cloud,
// one ShaderMaterial), gently rotating and following the cursor. Ported from a standalone three.js prototype
// (design-reference) into this site's own module/build — same geometry/physics/shader math, just resized to
// the hero's own box instead of the whole window, and with pointer tracking scoped to the hero (not the
// whole page). `lite` (phones, or anything without real hover) cuts the particle count hard and drops the
// pointer-follow + click-to-scatter interaction, keeping only the slow idle sway from the tick loop below —
// still the same shape, just cheap enough for a weak GPU and touch has no cursor to follow anyway.
import * as THREE from "three";

export interface HeroLogo3DOptions {
  canvas: HTMLCanvasElement;
  /** Sized and listened against instead of window — this is a background INSIDE the hero, not a full-page toy. */
  container: HTMLElement;
  /** Phones and anything without a real pointer: far fewer particles, no pointer-follow or click-to-scatter. */
  lite?: boolean;
}

export function initHeroLogo3D({ canvas, container, lite = false }: HeroLogo3DOptions): () => void {
  const CFG = {
    letterParticles: lite ? 7000 : 34000,
    dotParticles: lite ? 320 : 1500,
    hazeParticles: lite ? 800 : 4000,
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
    depthScale: 1.0,
    maxRotY: 0.65,
    maxRotX: 0.45,
    orange: new THREE.Color("#e84a18"),
    white: new THREE.Color("#f4f7ff"),
    blue: new THREE.Color("#a3c6ff"),
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

  const V_A = [137.5, 4, 158, 47.5];
  const V_B = [158, 47.5, 178.5, 4];
  interface PathDef {
    pts: number[][];
    avoid?: number[][];
    closed?: boolean;
    noStartCap?: boolean;
  }
  const PATHS: PathDef[] = [
    { pts: join(line(3.5, 35, 3.5, 20), arc(22.5, 20, 19, 16, Math.PI, 0, -1), line(41.5, 20, 41.5, 47.5)) },
    { pts: join(line(70.5, 4, 70.5, 31), arc(89.5, 31, 19, 16, Math.PI, 0, 1), line(108.5, 31, 108.5, 4)) },
    { pts: line(V_A[0], V_A[1], V_A[2], V_A[3]), avoid: [V_B] },
    { pts: line(V_B[0], V_B[1], V_B[2], V_B[3]), avoid: [V_A], noStartCap: true },
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

  const gauss = () => {
    let u = 0;
    let v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  interface PreppedPath extends PathDef {
    avoid: number[][];
    cum: number[];
    len: number;
    capA: number;
    capB: number;
    ext: number;
  }
  function prepPaths() {
    const out: PreppedPath[] = [];
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

  function samplePath(P: PreppedPath, s: number) {
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

  function buildGeometry() {
    const { paths, total: totalLen } = prepPaths();
    const total = CFG.letterParticles + CFG.dotParticles * DOTS.length + CFG.hazeParticles;

    const pos = new Float32Array(total * 3);
    const nor = new Float32Array(total * 3);
    const scatter = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    const rand = new Float32Array(total * 4);
    const size = new Float32Array(total);
    const type = new Float32Array(total);
    const c = new THREE.Color();
    const n3 = new THREE.Vector3();
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
      i++;
    };

    const letterColor = () => c.copy(CFG.white).lerp(CFG.blue, Math.random() * 0.5);
    const letterType = () => {
      const r = Math.random();
      return r < CFG.wispRatio ? 3 : r < CFG.wispRatio + CFG.shedRatio ? 4 : 0;
    };
    const letterSize = () => 1.6 + Math.random() * 1.6;
    const rejected = (px: number, py: number, z: number, avoid: number[][]) => avoid.some((seg) => insideSeg(px, py, z, seg, R, RZ, 1.02));

    const ellipsoid = (
      px: number,
      py: number,
      r: number,
      rz: number,
      count: number,
      colorFn: () => THREE.Color,
      sizeFn: () => number,
      typeFn: () => number,
      avoid: number[][] = [],
    ) => {
      const [wx, wy] = toWorld(px, py);
      for (let k = 0; k < count; k++) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        const ux = Math.sin(ph) * Math.cos(th);
        const uy = Math.sin(ph) * Math.sin(th);
        const uz = Math.cos(ph);
        const rr = shellR();
        if (avoid.length && rejected(px + (ux * rr * r) / S, py + (uy * rr * r) / S, uz * rz * rr, avoid)) continue;
        push(wx + ux * r * rr, wy - uy * r * rr, uz * rz * rr, ux / r, -uy / r, uz / rz, colorFn(), sizeFn(), typeFn());
      }
    };

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
      ellipsoid(
        x,
        y,
        DOT_R_PX * S,
        DOT_R_PX * S * CFG.depthScale,
        CFG.dotParticles,
        () => c.copy(CFG.orange).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.1),
        () => 1.3 + Math.random() * 1.4,
        () => 1,
      );
    }

    for (let k = 0; k < CFG.hazeParticles; k++) {
      const x = (Math.random() - 0.5) * 14;
      const y = gauss() * 1.1;
      const z = gauss() * 1.6;
      c.copy(CFG.blue).lerp(CFG.white, Math.random() * 0.4);
      push(x, y, z, 0, 0, 1, c, 3 + Math.random() * 7, 2);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aType", new THREE.BufferAttribute(type, 1));
    g.setDrawRange(0, i);
    g.computeBoundingSphere();
    return g;
  }

  const vertexShader = /* glsl */ `
    uniform float uTime, uProgress, uPixelRatio, uShockTime;
    uniform vec3 uShockPos, uLightDir;
    attribute vec4 aOffset;
    attribute vec3 aScatter;
    attribute vec4 aRand;
    attribute float aSize, aType;
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
        sin(t * 0.25 + base.x * 0.9 + base.y * 1.1 + ph.z)
      );
      p += wave * (isHaze ? 0.3 : 0.008);

      if (isWisp) {
        float life = fract(t * 0.07 * (0.6 + aRand.x) + aRand.w);
        p += normal * life * 0.35 + vec3(0.25, 0.55, 0.0) * life * life + wave * life * 0.12;
        alphaMul = smoothstep(0.0, 0.08, life) * (1.0 - life);
      }

      p += aOffset.xyz * pr;
      bool detached = aOffset.w < 0.995;

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

      vec3 n = normalize(normalMatrix * normal);
      vec3 L = normalize(uLightDir);
      float diff = max(dot(n, L), 0.0);
      float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);
      float rim = pow(1.0 - abs(n.z), 2.5);
      float light = 0.6 + 0.8 * diff + 0.5 * spec + 0.3 * rim + ring;
      float facing = smoothstep(-0.45, 0.2, n.z);

      float baseA;
      if (isHaze) { light = 0.8; facing = 1.0; baseA = 0.07; }
      else if (isWisp) { baseA = 0.45; facing = 1.0; }
      else baseA = 0.95;
      if (detached) { facing = 1.0; light = max(light, 0.9); }

      vColor = color * light * 1.15;
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

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch {
    return () => {};
  }
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uShockTime: { value: -10 },
    uShockPos: { value: new THREE.Vector3() },
    uLightDir: { value: new THREE.Vector3(-0.45, 0.6, 0.7) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const geometry = buildGeometry();
  const points = new THREE.Points(geometry, material);
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
    for (let i = 0; i < N; i++) if (TYP[i] < 1.5 || TYP[i] > 3.5) act.push(i);
    const M = act.length;
    const vel = new Float32Array(N * 3);
    const k = new Float32Array(N);
    const maxD = new Float32Array(N);
    const life = new Float32Array(N);
    const lifeRate = new Float32Array(N);
    const det = new Uint8Array(N);
    for (const i of act) {
      k[i] = CFG.springMin + Math.random() * (CFG.springMax - CFG.springMin);
      maxD[i] = CFG.wobbleMax * (0.4 + Math.random() * 0.6) * (TYP[i] > 0.5 && TYP[i] < 1.5 ? 0.6 : 1);
    }

    function step(dt: number, dthx: number, dthy: number) {
      if (dt <= 0) return;
      const wx = dthx / dt;
      const wy = dthy / dt;
      const motion = Math.min(1, Math.hypot(wx, wy) / 0.9);
      const pDetach = 0.9 * motion * CFG.shedAmount * dt;
      const springDecay = Math.exp(-CFG.springDamping * dt);
      const airDecay = Math.exp(-CFG.airDrag * dt);

      for (let m = 0; m < M; m++) {
        const i = act[m];
        const i3 = i * 3;
        const i4 = i * 4;
        const px = P[i3];
        const py = P[i3 + 1];
        const pz = P[i3 + 2];
        let dx = offArr[i4];
        let dy = offArr[i4 + 1];
        let dz = offArr[i4 + 2];
        let vx = vel[i3];
        let vy = vel[i3 + 1];
        let vz = vel[i3 + 2];

        const x = px + dx;
        const y = py + dy;
        const z = pz + dz;
        dx -= dthy * z;
        dy += dthx * z;
        dz -= dthx * y - dthy * x;

        if (det[i]) {
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
        } else {
          vx = (vx - k[i] * dx * dt) * springDecay;
          vy = (vy - k[i] * dy * dt) * springDecay;
          vz = (vz - k[i] * dz * dt) * springDecay;
          dx += vx * dt;
          dy += vy * dt;
          dz += vz * dt;
          const len = Math.hypot(dx, dy, dz);
          const lim = maxD[i];
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
            const carry = 0.25 + Math.random() * 0.55;
            const pushAmt = 0.12 + Math.random() * 0.3;
            vx = wy * z * carry + NOR[i3] * pushAmt;
            vy = -wx * z * carry + NOR[i3 + 1] * pushAmt;
            vz = (wx * y - wy * x) * carry + NOR[i3 + 2] * pushAmt;
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
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    const aspect = w / h;
    camera.aspect = aspect;
    const halfW = CFG.worldWidth * 0.66;
    const dist = halfW / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    // Sub-Full-HD laptop windows: the hero itself is shorter, so the headline + "Explorar" card below leave
    // much less clear room above them — the same size/position logo ends up crowding straight into that text
    // instead of floating above it. Shrinks and nudges the wordmark up as height drops below a comfortable
    // desktop reference, smoothly rather than snapping at one breakpoint.
    const shortness = THREE.MathUtils.clamp((1050 - h) / 250, 0, 1); // ~0 at Full HD's own media height, 1 by a 720p-tall laptop window
    points.position.y = shortness * 1.5;
    // On a tall/narrow box (mobile: the hero media is much taller than wide), fitting the full word width
    // exactly pushes the camera absurdly far back — "nuvion" is a wide, flat shape, so fitting it to a narrow
    // container's full width shrinks it to near-invisible, with empty space above and below. Capped so it
    // reads as a logo band across the middle instead: the sides crop a little outside the lowest 16, but that
    // trade (a touch of the outer "n"s off-frame vs. a legible wordmark) is the right one here.
    camera.position.set(0, 0, THREE.MathUtils.clamp(dist + shortness * 9, 11, 22));
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  fitCamera();
  const resizeObserver = new ResizeObserver(fitCamera);
  resizeObserver.observe(container);

  // Tracked across the WHOLE window (like the original prototype), not just this box — the logo reads the
  // cursor wherever it is on the page, and only pauses once the hero itself has scrolled out of view.
  const ndc = new THREE.Vector2(0, 0);
  let pointerActive = false;
  let lastMove = -10;
  const targetRot = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const localRay = new THREE.Ray();
  const inv = new THREE.Matrix4();
  const hit = new THREE.Vector3();

  const setPointer = (e: PointerEvent) => {
    ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerActive = true;
    lastMove = clock.elapsedTime;
  };
  const onLeave = () => {
    pointerActive = false;
  };
  const onDown = (e: PointerEvent) => {
    setPointer(e);
    raycaster.setFromCamera(ndc, camera);
    inv.copy(points.matrixWorld).invert();
    localRay.copy(raycaster.ray).applyMatrix4(inv);
    if (localRay.intersectPlane(plane, hit)) {
      uniforms.uShockPos.value.copy(hit);
      uniforms.uShockTime.value = uniforms.uTime.value;
    }
  };
  if (!lite) {
    window.addEventListener("pointermove", setPointer, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.addEventListener("pointerdown", onDown);
  }

  // Pausing off-screen isn't just "stop reacting" — it stops the whole render loop (40k particles is real GPU
  // work for zero visible benefit while scrolled past). Re-entering the viewport resumes exactly where the
  // physics/rotation state was; nothing resets.
  let heroOnScreen = true;
  const io = new IntersectionObserver(([entry]) => {
    heroOnScreen = entry.isIntersecting;
    if (heroOnScreen) kick();
  });
  io.observe(container);

  const clock = new THREE.Clock();
  let raf = 0;
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  function tick() {
    raf = 0;
    if (!heroOnScreen) return;
    kick();
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uProgress.value = Math.min(1, t / 3.2);

    const idle = lite || !pointerActive || t - lastMove > 4;
    if (idle) targetRot.set(Math.sin(t * 0.22) * 0.3, Math.sin(t * 0.17) * 0.06);
    else targetRot.set(ndc.x * CFG.maxRotY, -ndc.y * CFG.maxRotX);

    const k = 1 - Math.pow(idle ? 0.3 : 0.04, dt);
    const dy = (targetRot.x - points.rotation.y) * k;
    const dx = (targetRot.y - points.rotation.x) * k;
    points.rotation.y += dy;
    points.rotation.x += dx;
    points.updateMatrixWorld();

    physics.step(dt, dx, dy);

    renderer.render(scene, camera);
  }
  tick();

  return () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    io.disconnect();
    window.removeEventListener("pointermove", setPointer);
    document.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
    window.removeEventListener("pointerdown", onDown);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
