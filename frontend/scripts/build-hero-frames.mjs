#!/usr/bin/env node
/**
 * Builds the hero "look around" frame sequence (public/images/hero-seq/) from two source clips.
 *
 *   node scripts/build-hero-frames.mjs                       # defaults below
 *   node scripts/build-hero-frames.mjs --per-side 36 --quality 80
 *   node scripts/build-hero-frames.mjs --swap                # clip A on the right instead of the left
 *   node scripts/build-hero-frames.mjs --dry                 # only print which frames would be picked
 *
 * Both clips start on the SAME first frame (the resting/centre picture) and travel away from it — one clip becomes the
 * left side (l01 … lNN, nearest → farthest), the other the right side (r01 … rNN), the shared first frame is r00.
 * The script needs ffmpeg on the PATH and uses the project's sharp for the AVIF/WebP encode. Requires no other install.
 *
 * Choices that matter (see the comments where they are applied):
 *  - Frames are picked by MOTION ENERGY, not evenly in time: the clips barely change in their first second and then
 *    move fast, so an even pick wastes frames where nothing happens and leaves visible ghosting (the script cross-fades
 *    neighbouring frames while the pointer moves) where everything does. Equal visual change between neighbours means
 *    the fewest frames for a given smoothness, and the mouse feels the same everywhere along its travel.
 *  - AVIF 10-bit, 4:4:4: the picture is a dark, smooth gradient (banding-prone) with thin orange filaments (chroma
 *    sub-sampling smears those). At quality 80 the file is only ~110 KB thanks to the clean picture.
 *  - The clips carry NO colour tags; browsers treat untagged HD as BT.709 limited range, and ffmpeg alone would
 *    assume BT.601 (subtly wrong oranges) — so the conversion states BT.709 explicitly (verified against a real
 *    Chrome render of the clip).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");

// ---- options ------------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const flag = (name) => args.includes("--" + name);

const PER_SIDE = Number(opt("per-side", 36));
const QUALITY = Number(opt("quality", 80));
const FLOOR = Number(opt("floor", 0.35)); // minimum weight of a still moment, as a fraction of the typical fast moment
const clipLeft = resolve(root, opt("left", "design-reference/bg01aVA.mp4"));
const clipRight = resolve(root, opt("right", "design-reference/bg01aVB.mp4"));
const [LEFT, RIGHT] = flag("swap") ? [clipRight, clipLeft] : [clipLeft, clipRight];
const OUT = resolve(root, opt("out", "frontend/public/images/hero-seq"));
const TMP = resolve(root, "frontend/.hero-tmp");
const DRY = flag("dry");

// ---- helpers ------------------------------------------------------------------------------------------------
const ffmpeg = (a, opts = {}) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a], { maxBuffer: 1 << 30, ...opts });

/** Mean absolute change between consecutive frames, on a small greyscale copy — a cheap "how much moves" curve. */
function motionCurve(file) {
  const W = 192, H = 108;
  const raw = ffmpeg(["-i", file, "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"]);
  const n = Math.floor(raw.length / (W * H));
  const diff = [0];
  for (let f = 1; f < n; f++) {
    let s = 0;
    for (let p = 0; p < W * H; p++) s += Math.abs(raw[f * W * H + p] - raw[(f - 1) * W * H + p]);
    diff.push(s / (W * H));
  }
  return { n, diff, first: raw.subarray(0, W * H) };
}

/** Picks PER_SIDE frame indices (1…n-1) at equal steps of cumulative motion, with a floor so still stretches keep a few. */
function pickFrames(curve) {
  const { n, diff } = curve;
  const sorted = [...diff].sort((a, b) => a - b);
  const fastMean = sorted.slice(Math.floor(sorted.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(sorted.length / 2);
  const floor = FLOOR * fastMean;
  const cum = [0];
  for (let f = 1; f < n; f++) cum.push(cum[f - 1] + Math.max(diff[f], floor));
  const total = cum[n - 1];
  const picks = [];
  let prev = 0;
  for (let k = 1; k <= PER_SIDE; k++) {
    const target = (k / PER_SIDE) * total;
    let f = prev + 1;
    while (f < n - 1 && cum[f] < target) f++;
    if (k === PER_SIDE) f = n - 1; // the last frame is the far end of the clip
    // keep strictly increasing, and leave room for the frames still to come
    f = Math.max(prev + 1, Math.min(f, n - 1 - (PER_SIDE - k)));
    picks.push(f);
    prev = f;
  }
  return picks;
}

const name2 = (i) => String(i).padStart(2, "0");

// ---- run ----------------------------------------------------------------------------------------------------
console.log(`left  clip : ${LEFT}\nright clip : ${RIGHT}\nframes/side: ${PER_SIDE}   quality: ${QUALITY}\n`);
const cl = motionCurve(LEFT);
const cr = motionCurve(RIGHT);
const pickL = pickFrames(cl);
const pickR = pickFrames(cr);
let sameStart = 0;
for (let p = 0; p < cl.first.length; p++) sameStart += Math.abs(cl.first[p] - cr.first[p]);
sameStart /= cl.first.length;
console.log(`left  picks (${cl.n} frames): 0, ${pickL.join(", ")}`);
console.log(`right picks (${cr.n} frames): 0, ${pickR.join(", ")}`);
console.log(`first frames of both clips differ by ${sameStart.toFixed(2)} (0 = identical)${sameStart > 2 ? "  <-- WARNING: they should start on the same picture" : ""}\n`);
if (DRY) process.exit(0);

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

// Conversion: BT.709 limited → full-range RGB, stated explicitly (see the header note).
const toRgb = "scale=in_color_matrix=bt709:in_range=tv:out_range=pc:out_color_matrix=bt709";
function extract(clip, indices, tag) {
  const sel = indices.map((i) => `eq(n\\,${i})`).join("+");
  ffmpeg(["-i", clip, "-vf", `select='${sel}',${toRgb}`, "-fps_mode", "passthrough", join(TMP, `${tag}_%03d.png`)]);
}
extract(RIGHT, [0, ...pickR], "r"); // r_001 = centre (index 0), r_002 = r01 …
extract(LEFT, pickL, "l"); // l_001 = l01 …

// clear the previous sequence (only the files this script owns)
for (const f of readdirSync(OUT)) if (/^(l\d\d|r\d\d|r00-m)\.avif$|^r00\.webp$/.test(f)) rmSync(join(OUT, f));

const avif = (q) => ({ quality: q, effort: 6, chromaSubsampling: "4:4:4", bitdepth: 10 });
const jobs = [];
jobs.push(["r_001", "r00.avif"]);
pickR.forEach((_, k) => jobs.push([`r_${String(k + 2).padStart(3, "0")}`, `r${name2(k + 1)}.avif`]));
pickL.forEach((_, k) => jobs.push([`l_${String(k + 1).padStart(3, "0")}`, `l${name2(k + 1)}.avif`]));

let done = 0, bytes = 0;
const worker = async (queue) => {
  while (queue.length) {
    const [src, dst] = queue.shift();
    await sharp(join(TMP, src + ".png")).avif(avif(QUALITY)).toFile(join(OUT, dst));
    bytes += statSync(join(OUT, dst)).size;
    process.stdout.write(`\r${++done}/${jobs.length} frames encoded`);
  }
};
const queue = [...jobs];
await Promise.all([worker(queue), worker(queue), worker(queue)]);
console.log();

// The still that is the LCP element: AVIF (desktop crop = the full frame), a tall crop for phones, WebP fallback.
const centre = join(TMP, "r_001.png");
await sharp(centre).extract({ left: 650, top: 0, width: 620, height: 1080 }).avif({ ...avif(Math.min(QUALITY, 74)), bitdepth: 10 }).toFile(join(OUT, "r00-m.avif"));
await sharp(centre).webp({ quality: 84, effort: 5 }).toFile(join(OUT, "r00.webp"));
bytes += statSync(join(OUT, "r00-m.avif")).size + statSync(join(OUT, "r00.webp")).size;

rmSync(TMP, { recursive: true, force: true });
console.log(`\nDone: ${OUT}\n  ${jobs.length} frames + still (mobile crop, webp) = ${(bytes / 1048576).toFixed(2)} MB`);
console.log(`  Set on the canvas in src/pages/index.astro: data-left="${PER_SIDE}" data-right="${PER_SIDE}"`);
