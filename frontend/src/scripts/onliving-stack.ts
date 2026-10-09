// Stacked-card panel, adapted from the home's "Como trabalhamos" mechanic (site.ts, the ".t3-stack" block):
// the panel is pinned at its final size while cards 2..n rise from below and cover the previous one (which
// scales down and fades slightly), using GSAP ScrollTrigger's own pin:true instead of the hand-rolled
// stickyPanel() helper from site.ts (that one also drives a progress rail and About's pinned layout — more
// than this page needs). Used only by src/pages/parceiros/onliving.astro.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function initOnLivingStack(panel: HTMLElement) {
  const stepsWrap = panel.querySelector<HTMLElement>(".ol-steps");
  const steps = [...panel.querySelectorAll<HTMLElement>(".ol-step")];
  if (!stepsWrap || steps.length < 2) return;

  // Under reduced motion, skip the pin/scrub/cover choreography entirely: the CSS fallback (plain stacked
  // cards, a small overlap, no sticky tricks) already reads fine as a normal scrolling list.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const phone = window.matchMedia("(max-width: 860px)").matches;
  const STACK = 18; // px each card peeks below the previous one (matches CSS)

  panel.classList.add("ol-pinned");
  const cardH = () => steps[0].offsetHeight;
  // Lock centred in the window (like the home's stickyPanel): on a tall monitor the panel sits in the
  // middle instead of jammed against the top, leaving a big empty strip below it. PIN_TOP is just a floor
  // for short windows, where the panel is almost as tall as the screen.
  const PIN_TOP = 20;
  const pinTop = () => Math.max(PIN_TOP, Math.round((window.innerHeight - panel.offsetHeight) / 2));

  const covers: Array<() => void> = [];
  const runCovers = () => covers.forEach((f) => f());

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    onUpdate: runCovers,
    scrollTrigger: {
      trigger: panel,
      start: () => "top " + pinTop() + "px",
      end: () => "+=" + Math.round(window.innerHeight * (phone ? 1.3 : 2)),
      scrub: 0.8,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
  const settle = () => requestAnimationFrame(() => requestAnimationFrame(runCovers));
  ScrollTrigger.addEventListener("refresh", settle);
  settle();

  // Cards already covered are left slightly askew (a small tilt plus a sideways shift, fixed per card), so
  // the pile reads as a real stack instead of a ruler-straight one — same MESS_ROT/MESS_X trick as site.ts.
  const MESS_ROT = [-1.7, 1.3, -1.0, 1.6];
  const MESS_X = [-12, 9, -7, 11];
  steps.forEach((card, i) => {
    if (i === 0) return;
    const prev = steps[i - 1];
    const prevBody = prev.querySelector(".ol-step-in");
    tl.fromTo(card, { y: () => window.innerHeight - i * STACK + 40 }, { y: 0, duration: 1, ease: "power1.inOut" }, i - 1);
    covers.push(() => {
      const y = Number(gsap.getProperty(card, "y"));
      const q = Math.min(1, Math.max(0, 1 - y / (cardH() - STACK)));
      gsap.set(prev, {
        scale: 1 - 0.06 * q,
        rotation: MESS_ROT[(i - 1) % MESS_ROT.length] * q,
        x: MESS_X[(i - 1) % MESS_X.length] * q,
        transformOrigin: "50% 0%",
      });
      gsap.set(prevBody, { opacity: 1 - (phone ? 0.62 : 0.7) * q });
    });
  });
  tl.to({}, { duration: 0.2 });
}
