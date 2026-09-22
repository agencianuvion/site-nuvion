// Motion for /teste-3. Pattern set (GSAP + ScrollTrigger + SplitText):
// line-mask title reveals, word-by-word scrubbed text fill, sticky stacking
// cards, staggered blur-in cards, accordions. Everything content-related is
// already in the HTML — JS only adds the "from" states, so no-JS and
// prefers-reduced-motion visitors get the finished page.
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Not just "(hover: hover) and (pointer: fine)": a phone whose digitizer also supports a stylus (S-Pen and similar) can
// report a fine, hover-capable pointer as AVAILABLE on the device even while the visitor is just using a finger — this
// wrongly turns on every "desktop mouse" behavior gated by canHover below, the most disruptive being Lenis (built for a
// wheel's discrete, inertia-less deltas) hijacking what should be plain native touch scrolling. A device with ANY touch
// support is treated as a touch device first, no matter what it also claims to support.
const canHover =
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  navigator.maxTouchPoints === 0;

/* Land smoothly on ANY anchor link, on any page — not just the ones that already have their own handling below (the Blog's
   #tema-<slug> and the Portfolio's #projeto-<slug>, neither of which is a real element id, so the browser never auto-jumps
   for them in the first place). A click on a plain <a href="#id"> while already on that page is smoothed by Lenis's own
   "anchors" option (set up in smoothScroll() below) — this only covers the OTHER case: arriving at a page that already has
   a real #id in the URL (a link from another page, a bookmark, a reload), where the browser jumps there instantly as part
   of loading, before any of this runs. Undo that instant jump immediately, then let the "load" handler further down carry
   the visitor there smoothly instead, once Lenis (if any) exists — same "defer past Lenis's construction" reasoning as the
   Portfolio's own openFromHash(). */
const initialHashTarget = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
if (initialHashTarget) {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  // Stripping the hash from the address bar (not just resetting the scroll position) matters: the browser's own "scroll to
  // the fragment" step doesn't run once, it repeats until the page is fully loaded (so a late-loading image shifting the
  // layout re-triggers it) — resetting scroll alone would just get overridden again a moment later. Restored once this
  // script's own landing below is done, so the address bar still shows the right link to copy/bookmark.
  history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo(0, 0);
}
window.addEventListener("load", () => {
  if (!initialHashTarget) return;
  history.replaceState(null, "", location.pathname + location.search + "#" + initialHashTarget.id);
  if (lenis) lenis.scrollTo(initialHashTarget, { offset: -84 });
  else initialHashTarget.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
});

/* Current month for "Vagas abertas para novos projetos em <mês>" (the build only knows the month it ran in). */
document.querySelectorAll<HTMLElement>("[data-month]").forEach((el) => {
  el.textContent = new Date().toLocaleDateString("pt-BR", { month: "long" });
});

/* ---------- Accordions (services + FAQ) — always on ---------- */
function setOpen(item: HTMLElement, open: boolean) {
  item.classList.toggle("is-open", open);
  item
    .querySelector("[data-acc-trigger]")
    ?.setAttribute("aria-expanded", String(open));
}

/* When an item is opened by a tap, the item that was open (usually ABOVE it) closes and shrinks, which pulls the whole
   page up under the finger. Keep the tapped header exactly where it is while the animation runs, then make sure the
   opened content fits on screen. Only for touch / small screens (on desktop the pointer is already on the item). */
function holdInPlace(item: HTMLElement) {
  const trigger = item.querySelector<HTMLElement>("[data-acc-trigger]");
  const inner = item.querySelector<HTMLElement>(".t3-acc-inner");
  if (!trigger || !inner) return;
  const BAR = 92; // sticky header + a little air
  const y0 = trigger.getBoundingClientRect().top;
  // Where the header of this item should end up: where it is, unless the opened content would fall below the screen,
  // then just high enough to show it all (never under the sticky header).
  const total = trigger.getBoundingClientRect().height + inner.scrollHeight;
  const yT = Math.max(BAR, Math.min(y0, window.innerHeight - 16 - total));
  const D = reduced ? 1 : 620; // ms, a little longer than the panel's own opening
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const t0 = performance.now();
  // ONE continuous motion: every frame the header is placed on a path from y0 to yT, so the page follows the opening
  // panel smoothly (no separate "hold" and "scroll" phases, which read as a jolt).
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / D);
    const want = y0 + (yT - y0) * ease(p);
    const dy = trigger.getBoundingClientRect().top - want;
    if (Math.abs(dy) > 0.3) window.scrollBy({ top: dy, behavior: "instant" });
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

document.querySelectorAll<HTMLElement>("[data-acc]").forEach((group) => {
  const items = [...group.querySelectorAll<HTMLElement>("[data-acc-item]")];
  const openOnly = (target: HTMLElement) =>
    items.forEach((it) => setOpen(it, it === target));
  // Services: the first item starts open on every screen size (hover moves it on desktop; a tap moves it on touch) — it
  // used to start fully closed on phones/touch screens, but with nothing open there was no visual hint this was even an
  // accordion you could tap open, so visitors on a phone often never discovered the other two services at all.

  items.forEach((item) => {
    const trigger = item.querySelector<HTMLElement>("[data-acc-trigger]");
    trigger?.addEventListener("click", () => {
      if (
        item.classList.contains("is-open") &&
        !group.hasAttribute("data-acc-hover")
      )
        setOpen(item, false);
      else {
        const wasOpen = item.classList.contains("is-open");
        openOnly(item);
        if (!wasOpen && (!canHover || window.matchMedia("(max-width: 899px)").matches)) holdInPlace(item);
      }
    });
    if (group.hasAttribute("data-acc-hover") && canHover) {
      item.addEventListener("mouseenter", () => openOnly(item));
    }
  });
});

/* ---------- Project pictures: click to enlarge ----------
   A native <dialog> (focus trap, Esc and inert background come for free). Arrows / buttons move between the pictures. */
(() => {
  const figs = [
    ...document.querySelectorAll<HTMLElement>(".t3-pmedia[data-full]"),
  ];
  if (!figs.length) return;
  let dlg: HTMLDialogElement | null = null;
  let img: HTMLImageElement;
  let cap: HTMLElement;
  let index = 0;
  const arrow = (d: string) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  // only the pictures that are on screen take part (the portfolio filter hides some)
  const visible = () => figs.filter((f) => f.getClientRects().length > 0);
  let list = figs;
  const show = (i: number) => {
    index = (i + list.length) % list.length;
    const f = list[index];
    dlg?.querySelectorAll<HTMLElement>(".t3-lb-nav").forEach((b) => (b.hidden = list.length < 2));
    img.src = f.dataset.full ?? "";
    img.alt = f.querySelector("img")?.alt ?? "";
    cap.textContent = f.dataset.name ?? "";
  };
  const build = () => {
    dlg = document.createElement("dialog");
    dlg.className = "t3-lightbox";
    dlg.setAttribute("aria-label", "Imagem ampliada");
    dlg.innerHTML = `<button type="button" class="t3-lb-close" aria-label="Fechar">${arrow("M6 6l12 12M18 6 6 18")}</button>
      <button type="button" class="t3-lb-nav is-prev" aria-label="Imagem anterior">${arrow("M15 6l-6 6 6 6")}</button>
      <figure><img alt="" decoding="async" /><figcaption></figcaption></figure>
      <button type="button" class="t3-lb-nav is-next" aria-label="Próxima imagem">${arrow("M9 6l6 6-6 6")}</button>`;
    document.body.appendChild(dlg);
    img = dlg.querySelector("img") as HTMLImageElement;
    cap = dlg.querySelector("figcaption") as HTMLElement;
    dlg
      .querySelector(".t3-lb-close")
      ?.addEventListener("click", () => dlg?.close());
    dlg
      .querySelector(".is-prev")
      ?.addEventListener("click", () => show(index - 1));
    dlg
      .querySelector(".is-next")
      ?.addEventListener("click", () => show(index + 1));
    // a click on the dark backdrop (not on the picture or the buttons) closes it
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || (e.target as HTMLElement).tagName === "FIGURE")
        dlg?.close();
    });
    dlg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
    });
    dlg.addEventListener("close", () => {
      document.documentElement.style.overflow = "";
      lenis?.start();
    });
  };
  const open = (f: HTMLElement) => {
    if (!dlg) build();
    list = visible();
    show(Math.max(0, list.indexOf(f)));
    document.documentElement.style.overflow = "hidden";
    lenis?.stop();
    dlg?.showModal();
  };
  figs.forEach((f) => {
    f.setAttribute("role", "button");
    f.tabIndex = 0;
    f.setAttribute("aria-label", `Ampliar imagem: ${f.dataset.name ?? ""}`);
    f.addEventListener("click", () => open(f));
    f.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(f);
      }
    });
  });
})();

/* ---------- Blog list: category filter + numbered pages, on the same page ----------
   The state lives in the URL query (?tema=estrategia&pagina=2), changed with the History API, so the browser back button,
   reload and shared links all work. Every article is in the HTML; the script only decides which ones show. The filter is applied
   first and the pages are counted over the filtered list, so the two always agree. A link to #tema-<slug> opens that filter. */
function initBlogList() {
  const root = document.querySelector<HTMLElement>("[data-bf]");
  const grid = root?.querySelector<HTMLElement>("[data-bf-grid]");
  if (!root || !grid) return;
  const pager = root.querySelector<HTMLElement>("[data-bf-pager]");
  const items = [...grid.querySelectorAll<HTMLElement>(".t3-post")];
  const btns = [...root.querySelectorAll<HTMLButtonElement>("[data-bf-cat]")];
  const status = root.querySelector<HTMLElement>("[data-bf-status]");
  const perPage = Number(pager?.dataset.perPage) || 9;
  const temas = new Set(btns.map((b) => b.getAttribute("data-bf-cat") ?? "").filter((v) => v && v !== "all"));
  type State = { tema: string; pagina: number };
  const read = (): State => {
    const q = new URLSearchParams(location.search);
    const tema = q.get("tema") ?? "all";
    return { tema: temas.has(tema) ? tema : "all", pagina: Math.max(1, parseInt(q.get("pagina") ?? "1", 10) || 1) };
  };
  const urlOf = (s: State) => {
    const q = new URLSearchParams();
    if (s.tema !== "all") q.set("tema", s.tema);
    if (s.pagina > 1) q.set("pagina", String(s.pagina));
    const qs = q.toString();
    return location.pathname + (qs ? "?" + qs : "");
  };
  let state = read();

  // page numbers with dots when there are many: 1 … 4 5 6 … 12
  const buildPager = (pages: number) => {
    if (!pager) return;
    pager.hidden = pages <= 1;
    if (pages <= 1) {
      pager.innerHTML = "";
      return;
    }
    const cur = state.pagina;
    const nums = [...new Set([1, pages, cur - 1, cur, cur + 1])].filter((n) => n >= 1 && n <= pages).sort((x, y) => x - y);
    const link = (n: number, text: string, cls = "", aria = "") =>
      '<a class="bf-pg ' + cls + '" href="' + urlOf({ tema: state.tema, pagina: n }) + '" data-p="' + n + '"' + (n === cur && !cls ? ' aria-current="page"' : "") + ' aria-label="' + (aria || "Página " + n) + '">' + text + "</a>";
    let html = cur > 1 ? link(cur - 1, "←", "bf-pg-arrow", "Página anterior") : '<span class="bf-pg bf-pg-arrow is-off" aria-hidden="true">←</span>';
    nums.forEach((n, i) => {
      if (i > 0 && n - nums[i - 1] > 1) html += '<span class="bf-pg-gap" aria-hidden="true">…</span>';
      html += link(n, String(n));
    });
    html += cur < pages ? link(cur + 1, "→", "bf-pg-arrow", "Próxima página") : '<span class="bf-pg bf-pg-arrow is-off" aria-hidden="true">→</span>';
    pager.innerHTML = html;
  };

  const render = (animate: boolean) => {
    const list = items.filter((el) => state.tema === "all" || el.dataset.cat === state.tema);
    const pages = Math.max(1, Math.ceil(list.length / perPage));
    state.pagina = Math.min(state.pagina, pages);
    const from = (state.pagina - 1) * perPage;
    const show = new Set(list.slice(from, from + perPage));
    items.forEach((el) => {
      el.removeAttribute("data-late");
      const on = show.has(el);
      el.hidden = !on;
      if (!on) return;
      // cards that never got their scroll reveal (they were hidden) must not stay transparent
      el.style.opacity = "";
      el.style.transform = "";
      if (animate) {
        el.classList.remove("is-shuffle");
        void el.offsetWidth;
        el.classList.add("is-shuffle");
      }
    });
    btns.forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-bf-cat") === state.tema)));
    buildPager(pages);
    if (animate) {
      if (status) status.textContent = "Página " + state.pagina + " de " + pages + ", " + list.length + (list.length === 1 ? " artigo" : " artigos");
      ScrollTrigger.refresh();
    }
  };
  // same offset as the anchor links (the floating header is about 84 px tall); the smooth-scroll library when it is running
  const toList = () => {
    if (lenis) lenis.scrollTo(root, { offset: -96 });
    else window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 96, behavior: reduced ? "auto" : "smooth" });
  };
  const go = (next: State, push: boolean, scroll: boolean) => {
    state = next;
    if (push) history.pushState(null, "", urlOf(state));
    render(true);
    if (scroll) toList();
  };

  btns.forEach((b) => b.addEventListener("click", () => go({ tema: b.getAttribute("data-bf-cat") ?? "all", pagina: 1 }, true, false)));
  pager?.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-p]");
    if (!a) return;
    e.preventDefault();
    go({ tema: state.tema, pagina: Number(a.dataset.p) || 1 }, true, true);
  });
  window.addEventListener("popstate", () => {
    state = read();
    render(true);
  });
  const fromHash = () => {
    if (!location.hash.startsWith("#tema-")) return;
    const v = location.hash.slice(6);
    if (!temas.has(v)) return;
    state = { tema: v, pagina: 1 };
    history.replaceState(null, "", urlOf(state));
    render(true);
    toList();
  };
  window.addEventListener("hashchange", fromHash);
  render(false);
  // an invalid ?tema / ?pagina in the address is tidied up without adding a history entry
  if (location.search && urlOf(state) !== location.pathname + location.search) history.replaceState(null, "", urlOf(state) + location.hash);
  fromHash();
}
initBlogList();

/* ---------- Article: reading-progress bar and the table of contents that follows the reader ---------- */
(() => {
  const art = document.querySelector<HTMLElement>("[data-rd-article]");
  if (!art) return;
  const bar = document.querySelector<HTMLElement>("[data-rd-bar]");
  const body = art.querySelector<HTMLElement>(".prose-nv");
  const links = [...art.querySelectorAll<HTMLAnchorElement>(".toc a[href^='#']")];
  const ids = [...new Set(links.map((a) => a.hash.slice(1)))];
  const heads = ids.map((id) => document.getElementById(id)).filter((h): h is HTMLElement => !!h);
  let queued = false;
  const paint = () => {
    queued = false;
    if (bar && body) {
      const r = body.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.5;
      const p = total > 0 ? Math.min(1, Math.max(0, (window.innerHeight * 0.25 - r.top) / total)) : 0;
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    }
    let cur = "";
    heads.forEach((h) => {
      if (h.getBoundingClientRect().top <= 150) cur = h.id;
    });
    links.forEach((a) => {
      const on = a.hash.slice(1) === cur;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(paint);
    }
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  // picking a section from the collapsible list closes it
  art.querySelectorAll<HTMLAnchorElement>(".toc-m a").forEach((a) => a.addEventListener("click", () => a.closest("details")?.removeAttribute("open")));
  paint();
})();

/* ---------- Portfolio showcase ----------
   Tabs on the left, the selected project on the right (crossfade). Pointer hover picks a project (with a short delay), click and
   the arrow keys too. It advances by itself (7 s, a bar fills in the active tab) until the visitor picks one; it pauses while the
   pointer or focus is inside and while the section is off screen, and never runs with reduced motion. The segment chips hide
   the projects of other segments. The big picture follows the pointer a little (depth). */
(() => {
  const root = document.querySelector<HTMLElement>("[data-vt]");
  if (!root) return;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>(".vt-tab")];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls") ?? "") as HTMLElement);
  const chips = [...root.querySelectorAll<HTMLButtonElement>("[data-vt-seg]")];
  const status = root.querySelector<HTMLElement>("[data-vt-status]");
  const stage = root.querySelector<HTMLElement>(".vt-stage");
  if (!tabs.length || panels.some((p) => !p)) return;
  let auto = !reduced;
  let cur = 0;
  const visible = () => tabs.map((_, i) => i).filter((i) => !tabs[i].hidden);
  // the list scrolls when there are many projects: keep the active tab in view, and tell (fades) that there is more
  const listEl = tabs[0].parentElement as HTMLElement;
  const isRow = () => window.matchMedia("(max-width: 1000px)").matches;
  const fades = () => {
    const row = isRow();
    const pos = row ? listEl.scrollLeft : listEl.scrollTop;
    const max = row ? listEl.scrollWidth - listEl.clientWidth : listEl.scrollHeight - listEl.clientHeight;
    listEl.classList.toggle("can-up", pos > 4);
    listEl.classList.toggle("can-down", pos < max - 4);
  };
  const reveal = (tab: HTMLElement) => {
    const r = tab.getBoundingClientRect();
    const l = listEl.getBoundingClientRect();
    const behavior = reduced ? "auto" : "smooth";
    if (isRow()) listEl.scrollTo({ left: listEl.scrollLeft + (r.left - l.left) - (l.width - r.width) / 2, behavior });
    else listEl.scrollTo({ top: listEl.scrollTop + (r.top - l.top) - (l.height - r.height) / 2, behavior });
  };
  listEl.addEventListener("scroll", fades, { passive: true });
  guardWheel(listEl);
  window.addEventListener("resize", fades);
  new ResizeObserver(fades).observe(listEl);
  const select = (i: number, user = false, focus = false, scroll = true) => {
    cur = i;
    tabs.forEach((t, k) => {
      const on = k === i;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panels[k].classList.toggle("is-active", on);
    });
    if (user && auto) {
      auto = false;
      root.classList.add("no-auto");
    }
    if (focus) tabs[i].focus({ preventScroll: true });
    if (scroll) reveal(tabs[i]);
    // restart the progress bar
    const bar = tabs[i].querySelector<HTMLElement>(".vt-bar i");
    if (bar) {
      bar.style.animation = "none";
      void bar.offsetWidth;
      bar.style.animation = "";
    }
  };
  const step = (d: number, user = false, focus = false) => {
    const v = visible();
    if (!v.length) return;
    const at = Math.max(0, v.indexOf(cur));
    select(v[(at + d + v.length) % v.length], user, focus);
  };
  const renumber = () => visible().forEach((i, k) => (tabs[i].querySelector(".vt-no")!.textContent = String(k + 1).padStart(2, "0")));
  if (!auto) root.classList.add("no-auto");
  fades();

  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(i, true, false, false));
    let hoverTimer = 0;
    // hover picks the project only when the mouse REALLY moves over the tab: when the list scrolls under a still pointer the
    // browser also reports "pointer entered", and that must not select anything (it made the projects jump by themselves)
    t.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || (e.movementX === 0 && e.movementY === 0) || cur === i) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => select(i, true, false, false), 140);
    });
    t.addEventListener("pointerleave", () => window.clearTimeout(hoverTimer));
    t.addEventListener("keydown", (e) => {
      const next = e.key === "ArrowDown" || e.key === "ArrowRight";
      const prev = e.key === "ArrowUp" || e.key === "ArrowLeft";
      if (next || prev) {
        e.preventDefault();
        step(next ? 1 : -1, true, true);
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        const v = visible();
        select(e.key === "Home" ? v[0] : v[v.length - 1], true, true);
      }
    });
  });
  // the bar finishing moves on to the next project
  root.addEventListener("animationend", (e) => {
    if ((e as AnimationEvent).animationName === "vt-bar" && auto) step(1);
  });
  // pause while the pointer / focus is inside or the section is off screen
  const setPaused = (p: boolean) => root.classList.toggle("is-paused", p);
  let inside = false;
  let onScreen = false;
  const sync = () => setPaused(inside || !onScreen || document.hidden);
  root.addEventListener("pointerenter", () => ((inside = true), sync()));
  root.addEventListener("pointerleave", () => ((inside = false), sync()));
  root.addEventListener("focusin", () => ((inside = true), sync()));
  root.addEventListener("focusout", () => ((inside = false), sync()));
  document.addEventListener("visibilitychange", sync);
  new IntersectionObserver(([en]) => ((onScreen = en.isIntersecting), sync()), { threshold: 0.25 }).observe(root);
  sync();

  // depth: the picture drifts a little against the pointer
  if (stage && canHover && !reduced) {
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      stage.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      stage.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    stage.addEventListener("pointerleave", () => {
      stage.style.setProperty("--mx", "0");
      stage.style.setProperty("--my", "0");
    });
  }

  // segment filter
  const applyFilter = (seg: string) => {
    tabs.forEach((t, k) => {
      const on = seg === "all" || t.dataset.seg === seg;
      t.hidden = !on;
      panels[k].hidden = !on;
    });
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.vtSeg === seg)));
    renumber();
    const v = visible();
    if (v.length && !v.includes(cur)) select(v[0]);
    if (status) status.textContent = v.length === 1 ? "1 projeto" : v.length + " projetos";
    ScrollTrigger.refresh();
  };
  chips.forEach((c) => c.addEventListener("click", () => applyFilter(c.dataset.vtSeg ?? "all")));

  // a link to #projeto-<slug> (the home slider's "Saiba mais") opens that project here, whatever segment filter is active.
  // The scroll goes through Lenis when it exists (matching the blog's own toList()); on the very first page load this code
  // runs before smoothScroll() has constructed it (Lenis is set up later, near the bottom of this file), so a plain
  // scrollIntoView here would be overridden the moment Lenis takes over a moment later — the initial check is deferred to the
  // window "load" event instead, by which point Lenis (if any) already exists.
  const openFromHash = () => {
    if (!location.hash.startsWith("#projeto-")) return;
    const tab = document.getElementById("vt-tab-" + location.hash.slice(9));
    const i = tab ? tabs.indexOf(tab as HTMLButtonElement) : -1;
    if (i < 0) return;
    applyFilter("all");
    select(i, true);
    if (lenis) lenis.scrollTo(root, { offset: -96 });
    else root.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };
  window.addEventListener("hashchange", openFromHash);
  window.addEventListener("load", openFromHash);
})();

/* ---------- Results: the numbers count up and the drawings play when the panel comes into view ---------- */
document.querySelectorAll<HTMLElement>("[data-rs]").forEach((sec) => {
  new IntersectionObserver(
    (entries, obs) => {
      if (!entries[0].isIntersecting) return;
      sec.classList.add("is-in");
      countUp(sec);
      obs.disconnect();
    },
    { threshold: 0.3 },
  ).observe(sec);
});

/* ---------- Scrollable boxes keep the wheel to themselves ----------
   While the box can still scroll in the wheel's direction, the wheel scrolls the box (the smooth-scroll library must not take
   it). When the wheel reaches the top or the bottom, the page does NOT start moving in the middle of the same gesture (that felt
   odd): for 350 ms after the LAST moment the box actually moved, further wheel ticks stay blocked instead of falling through to
   the page. After that, a new scroll goes on to the page, so the visitor is never trapped.
   BUG FIXED HERE: that 350 ms timer used to be re-armed by every blocked tick too, not just by an actual move — so a fast,
   continuous real wheel gesture (many mice fire a tick every 30-100 ms) that outlasted the box's own range never went 350 ms
   without a tick, and the block never expired: the page stayed stuck for as long as the visitor kept scrolling, only letting go
   once they paused. Now only a tick that actually moves the box resets the timer, so the block always expires exactly 350 ms
   after the box last moved, no matter how fast or how long the gesture that follows is. */
function guardWheel(el: HTMLElement) {
  let last = 0;
  el.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 2) return; // nothing to scroll here: the page takes it
      const canMove = (e.deltaY > 0 && el.scrollTop < max - 1) || (e.deltaY < 0 && el.scrollTop > 1);
      if (canMove) {
        last = performance.now();
        e.stopPropagation();
      } else if (performance.now() - last < 350) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { passive: false },
  );
}

/* ---------- Testimonials: long quotes scroll inside the card (fixed card size) ---------- */
document.querySelectorAll<HTMLElement>(".t3-tqwrap").forEach((w) => {
  const update = () => {
    w.classList.toggle("is-scroll", w.scrollHeight > w.clientHeight + 2);
    w.classList.toggle(
      "at-end",
      w.scrollTop + w.clientHeight >= w.scrollHeight - 2,
    );
  };
  w.addEventListener("scroll", update, { passive: true });
  guardWheel(w);
  new ResizeObserver(update).observe(w);
  update();
});

/* ---------- Expanding panels (blog): hover/focus expands one; the last one stays open ---------- */
document.querySelectorAll<HTMLElement>("[data-strip]").forEach((strip) => {
  const panels = [...strip.querySelectorAll<HTMLElement>(".t3-bp")];
  const open = (target: HTMLElement) =>
    panels.forEach((el) => el.classList.toggle("is-active", el === target));
  panels.forEach((el) => {
    if (canHover) el.addEventListener("mouseenter", () => open(el));
    el.addEventListener("focus", () => open(el));
  });
});

/* ---------- Projects slider ----------
   The sliding itself is native (CSS scroll-snap: swipe, trackpad, keyboard). This only adds the arrows, the
   counter/progress, dimming of the cards that are not in focus, and click-and-drag with a mouse. */
document.querySelectorAll<HTMLElement>("[data-pslider]").forEach((root) => {
  const track = root.querySelector<HTMLElement>(".t3-ptrack");
  const slides = [...root.querySelectorAll<HTMLElement>(".t3-pslide")];
  const prev = root.querySelector<HTMLButtonElement>('[data-pdir="-1"]');
  const next = root.querySelector<HTMLButtonElement>('[data-pdir="1"]');
  const cur = root.querySelector<HTMLElement>("[data-pcur]");
  const bar = root.querySelector<HTMLElement>("[data-pbar]");
  if (!track || slides.length < 2) return;
  // the track spans the whole panel: hand it the panel's side padding (it changes with the screen width)
  const panelEl = root.closest<HTMLElement>(".t3-panel");
  const syncPad = () => {
    if (!panelEl) return;
    const cs = getComputedStyle(panelEl);
    root.style.setProperty("--pad-l", cs.paddingLeft);
    root.style.setProperty("--pad-r", cs.paddingRight);
  };
  syncPad();
  if (panelEl) new ResizeObserver(syncPad).observe(panelEl);
  const n = slides.length;
  const clamp = (i: number) => Math.max(0, Math.min(n - 1, i));

  // the track has left padding (room for the card shadow), so slide positions are measured from it
  const pad = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
  const nearest = () => {
    let best = 0;
    let bestD = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft - pad() - track.scrollLeft);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };
  let shown = -1;
  const update = () => {
    const i = nearest();
    if (i === shown) return;
    shown = i;
    slides.forEach((s, k) => s.classList.toggle("is-active", k === i));
    if (cur) cur.textContent = String(i + 1).padStart(2, "0");
    if (bar) bar.style.width = `${((i + 1) / n) * 100}%`;
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === n - 1;
  };
  const go = (i: number) =>
    track.scrollTo({
      left: slides[clamp(i)].offsetLeft - pad(),
      behavior: reduced ? "auto" : "smooth",
    });

  let ticking = false;
  track.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    },
    { passive: true },
  );
  prev?.addEventListener("click", () => go(nearest() - 1));
  next?.addEventListener("click", () => go(nearest() + 1));
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(nearest() + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(nearest() - 1);
    }
  });
  window.addEventListener("resize", () => {
    shown = -1;
    update();
  });

  // click-and-drag with a mouse (touch and trackpads already scroll natively)
  let startX = 0;
  let startLeft = 0;
  let startIdx = 0;
  let dragging = false;
  let down = false;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    down = true;
    dragging = false;
    startX = e.clientX;
    startLeft = track.scrollLeft;
    startIdx = nearest();
  });
  track.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!dragging && Math.abs(dx) > 5) {
      dragging = true;
      track.classList.add("is-drag");
      track.setPointerCapture(e.pointerId);
    }
    if (dragging) track.scrollLeft = startLeft - dx;
  });
  const endDrag = (e: PointerEvent) => {
    if (!down) return;
    down = false;
    if (!dragging) return;
    const dx = e.clientX - startX;
    track.classList.remove("is-drag");
    go(dx < -40 ? startIdx + 1 : dx > 40 ? startIdx - 1 : startIdx);
  };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("dragstart", (e) => e.preventDefault());

  root.classList.add("is-ready");
  update();
});

/* ---------- Hero "look around": the hero image follows the mouse ----------
   A short sequence of frames (the camera arcing slightly around the sphere network) is painted on a
   canvas over the still image. The mouse's horizontal position (across the whole window) picks the frame,
   with easing. Progressive enhancement: the still <img> stays in the HTML as the LCP; frames only download
   after the page has loaded, and only on wide screens with a real mouse (never on touch, small screens,
   reduced motion, data-saver or low-memory devices).

   Smoothness/sharpness choices:
   - Frames are turned into ImageBitmaps at the canvas's own pixel size, already cropped like object-fit:
     cover. Drawing is then a 1:1 blit (no per-frame scaling, no re-decoding of big AVIFs — decoded <img>
     data can be evicted by the browser mid-movement, which showed up as stutter).
   - Neighbouring frames are only cross-faded in a narrow band around the halfway point, so most of the
     time exactly ONE crisp frame is on screen (a constant 50/50 mix is a double image = blur). */
(() => {
  const canvas = document.querySelector<HTMLCanvasElement>(".t3-hero-canvas");
  const hero = document.querySelector<HTMLElement>(".t3-hero");
  if (
    !canvas ||
    !hero ||
    reduced ||
    !canHover ||
    window.matchMedia("(max-width: 899px)").matches
  )
    return;
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (conn?.saveData || /\b2g\b/.test(conn?.effectiveType ?? "")) return;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (mem !== undefined && mem < 4) return;
  if (typeof createImageBitmap !== "function") return;

  const right = Number(canvas.dataset.right) || 0;
  const left = Number(canvas.dataset.left) || 0;
  const path = canvas.dataset.path ?? "";
  const SRC_W = Number(canvas.dataset.w) || 1920;
  const SRC_H = Number(canvas.dataset.h) || 1080;
  const total = left + right + 1; // combined strip: left frames (far → near), centre, right frames
  const nameOf = (idx: number) =>
    idx >= left
      ? path + "r" + String(idx - left).padStart(2, "0") + ".avif"
      : path + "l" + String(left - idx).padStart(2, "0") + ".avif";
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const blobs: (Blob | null)[] = new Array(total).fill(null); // tiny compressed originals, kept for rebuilds
  const bitmaps: (ImageBitmap | null)[] = new Array(total).fill(null);
  let gen = 0; // bumps on every resize so stale async work is dropped
  let target = 0; // -1 … +1 (mouse across the window)
  let current = 0;
  let raf = 0;
  let shown = false;

  const sizeCanvas = () => {
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (!cssW || !cssH) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // never bigger than the source crop (there is nothing more to show), which also caps memory
    const cropW = Math.min(SRC_W, SRC_H * (cssW / cssH));
    const w = Math.min(Math.round(cssW * dpr), Math.round(cropW));
    const h = Math.round((w * cssH) / cssW);
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w;
    canvas.height = h;
    return true;
  };

  // Cover-crop of the source that matches the canvas aspect (centred, like object-position: 50% 50%).
  const cropFor = () => {
    const ca = canvas.width / canvas.height;
    const sa = SRC_W / SRC_H;
    if (ca < sa) {
      const sw = SRC_H * ca;
      return { sx: (SRC_W - sw) / 2, sy: 0, sw, sh: SRC_H };
    }
    const sh = SRC_W / ca;
    return { sx: 0, sy: (SRC_H - sh) / 2, sw: SRC_W, sh };
  };

  const makeBitmap = (blob: Blob) => {
    const c = cropFor();
    return createImageBitmap(
      blob,
      Math.round(c.sx),
      Math.round(c.sy),
      Math.round(c.sw),
      Math.round(c.sh),
      {
        resizeWidth: canvas.width,
        resizeHeight: canvas.height,
        resizeQuality: "high",
      },
    );
  };

  const nearest = (i: number) => {
    for (let d = 0; d < total; d++) {
      const a = bitmaps[i - d];
      if (a) return a;
      const b = bitmaps[i + d];
      if (b) return b;
    }
    return null;
  };

  // How "sharp vs. smooth" the picture is, 0 → 1. While the pointer is moving the two neighbouring frames
  // are cross-faded linearly over the WHOLE gap (continuous, no visible steps). As the motion dies down
  // the picture is pulled to the nearest single frame, so it never rests on a 50/50 double image (blur).
  let calm = 0; // 0 = fully snapped to the nearest frame, 1 = fully interpolated
  let lastF = left;

  // Bloom: a tiny copy of the picture with the contrast pushed up (only the bright orange lights survive),
  // softened by CSS blur and screened back over the hero. Redrawn from the same frame on every render, so
  // the glow follows the camera. 192px wide → costs next to nothing.
  const bloom = document.querySelector<HTMLCanvasElement>(".t3-hero-bloom");
  const bctx = bloom?.getContext("2d") ?? null;
  const BLOOM_W = 192;
  const drawBloom = (
    src: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
  ) => {
    if (!bloom || !bctx) return;
    const bh = Math.round((BLOOM_W * sh) / sw);
    if (bloom.width !== BLOOM_W || bloom.height !== bh) {
      bloom.width = BLOOM_W;
      bloom.height = bh;
    }
    bctx.filter = "brightness(0.8) contrast(2.4) saturate(1.5)";
    bctx.drawImage(src, sx, sy, sw, sh, 0, 0, BLOOM_W, bh);
    bloom.classList.add("is-on");
  };
  // first paint of the glow comes from the still image, so it is already there before the frames load
  const still = document.querySelector<HTMLImageElement>(".t3-hero-img");
  const bloomFromStill = () => {
    if (!still || !canvas.clientWidth) return;
    const ca = canvas.clientWidth / canvas.clientHeight;
    const nw = still.naturalWidth;
    const nh = still.naturalHeight;
    if (!nw) return;
    const sw = Math.min(nw, nh * ca);
    const sh = sw / ca;
    drawBloom(still, (nw - sw) / 2, (nh - sh) / 2, sw, sh);
  };
  if (still?.complete) bloomFromStill();
  else still?.addEventListener("load", bloomFromStill, { once: true });

  const render = () => {
    // with no left frames the whole left half would rest on the centre frame
    const t = left === 0 ? Math.max(0, current) : current;
    const f = left + (t >= 0 ? t * right : t * left);
    const fr = Math.round(f);
    const fe = fr + (f - fr) * calm; // effective position
    const i0 = Math.max(0, Math.min(total - 1, Math.floor(fe)));
    const i1 = Math.min(total - 1, i0 + 1);
    const mix = fe - i0;
    const a = nearest(i0);
    const b = nearest(i1);
    if (!a) return;
    ctx.globalAlpha = 1;
    ctx.drawImage(a, 0, 0);
    if (b && b !== a && mix > 0.002) {
      ctx.globalAlpha = mix;
      ctx.drawImage(b, 0, 0);
      ctx.globalAlpha = 1;
    }
    drawBloom(canvas, 0, 0, canvas.width, canvas.height);
    if (import.meta.env.DEV) {
      canvas.dataset.pos = current.toFixed(4);
      canvas.dataset.calm = calm.toFixed(3);
    }
    return f;
  };

  // Follow the pointer with a firm ease PLUS a minimum speed. A pure exponential ease has speed → 0 near
  // the target, which made the last frames crawl (and every step visible); the floor keeps them moving.
  // All rates are per 1/60 s and scaled by the real time between frames, so a 60, 120 or 144 Hz screen
  // behaves identically.
  const FOLLOW = 0.22; // fraction of the remaining distance covered per 1/60 s
  const MIN_SPEED = 0.0075; // minimum travel per 1/60 s (range units; the whole travel is 1.0 per side)
  const STILL = 0.006; // frames per 1/60 s below which the pointer counts as "stopped"
  let lastT = 0;
  let blur = 0; // px of motion blur, follows speed and returns to 0 at rest
  const MAX_BLUR = 1.6;
  const tick = (now: number) => {
    raf = 0;
    const dt = Math.min(3, lastT ? (now - lastT) / (1000 / 60) : 1); // in 60 Hz frames, capped after pauses
    lastT = now;
    const d = target - current;
    if (Math.abs(d) > 1e-4) {
      const ease = 1 - Math.pow(1 - FOLLOW, dt);
      let step = d * ease + Math.sign(d) * MIN_SPEED * dt;
      if (Math.abs(step) > Math.abs(d)) step = d; // never overshoot
      current += step;
    }
    const f = render();
    if (f !== undefined) {
      const speed = Math.abs(f - lastF) / dt; // frames moved per 1/60 s
      lastF = f;
      // interpolate while anything is moving (even very slowly); snap to one crisp frame only once stopped
      const wantCalm = Math.min(1, speed / STILL);
      const rate = 1 - Math.pow(1 - (wantCalm > calm ? 0.35 : 0.12), dt);
      calm += (wantCalm - calm) * rate;
      // a touch of blur while moving fast hides the step between frames; sharp again at rest
      const wantBlur = Math.min(MAX_BLUR, speed * 1.1);
      blur += (wantBlur - blur) * (1 - Math.pow(1 - 0.3, dt));
      canvas.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : "";
    }
    if (Math.abs(target - current) > 1e-4 || calm > 0.01)
      raf = requestAnimationFrame(tick);
    else {
      lastT = 0;
      blur = 0;
      canvas.style.filter = "";
      render();
    }
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const rebuild = async () => {
    const my = ++gen;
    if (!sizeCanvas() && bitmaps.some(Boolean)) return;
    const old = bitmaps.splice(0, total, ...new Array(total).fill(null));
    old.forEach((bm) => bm?.close());
    for (let i = 0; i < total; i++) {
      const blob = blobs[i];
      if (!blob) continue;
      const bm = await makeBitmap(blob).catch(() => null);
      if (my !== gen) {
        bm?.close();
        return;
      }
      bitmaps[i] = bm;
      if (i === left && shown) render();
    }
  };

  // The hero panel is narrower than the window, so the pointer is tracked across the WHOLE window
  // (the effect keeps going over the side margins) and only paused while the hero is off screen.
  // GAIN > 1 reaches the outermost frame a little before the window edge.
  const GAIN = 1.3;
  let heroVisible = true;
  new IntersectionObserver(
    (entries) => {
      heroVisible = entries[0].isIntersecting;
      if (!heroVisible) {
        target = 0;
        kick();
      }
    },
    { threshold: 0 },
  ).observe(hero);

  window.addEventListener(
    "mousemove",
    (e) => {
      if (!heroVisible) return;
      target = Math.max(
        -1,
        Math.min(1, ((e.clientX / window.innerWidth) * 2 - 1) * GAIN),
      );
      if (!shown && bitmaps[left]) {
        shown = true;
        render();
        canvas.classList.add("is-on");
      }
      kick();
    },
    { passive: true },
  );
  // pointer left the browser window → ease back to the resting frame
  document.documentElement.addEventListener("mouseleave", () => {
    target = 0;
    kick();
  });

  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (blobs.some(Boolean)) rebuild().then(() => shown && render());
    }, 250);
  }).observe(canvas);

  // Load order: centre first, then outward — so the effect works early with what has arrived.
  const order: number[] = [];
  for (let d = 0; d < total; d++) {
    if (left + d < total) order.push(left + d);
    if (d > 0 && left - d >= 0) order.push(left - d);
  }
  const loadNext = async (): Promise<void> => {
    const idx = order.shift();
    if (idx === undefined) return;
    try {
      const blob = await (await fetch(nameOf(idx))).blob();
      blobs[idx] = blob;
      const my = gen;
      const bm = await makeBitmap(blob);
      if (my === gen) {
        bitmaps[idx] = bm;
        if (shown) kick();
      } else bm.close();
    } catch {
      /* a missing frame just leaves a gap; nearest() covers it */
    }
    return loadNext();
  };
  const start = () => {
    sizeCanvas();
    for (let k = 0; k < 3; k++) void loadNext();
  };
  window.addEventListener(
    "load",
    () =>
      "requestIdleCallback" in window
        ? (window as any).requestIdleCallback(start, { timeout: 2500 })
        : setTimeout(start, 1200),
    { once: true },
  );
})();

/* Authority icons: gently move away from the cursor and spring back (mouse only). */
const iconRow = document.querySelector<HTMLElement>(".t3-icon-row");
if (iconRow && canHover && !reduced) {
  const pushes = [...iconRow.querySelectorAll<HTMLElement>(".t3-ico-push")];
  const RADIUS = 90;
  const MAX = 20;
  iconRow.addEventListener("mousemove", (e) => {
    for (const el of pushes) {
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - e.clientX;
      const dy = r.top + r.height / 2 - e.clientY;
      const d = Math.hypot(dx, dy);
      if (d < RADIUS && d > 0.01) {
        const push = ((RADIUS - d) / RADIUS) * MAX;
        el.style.transform = `translate(${(dx / d) * push}px, ${(dy / d) * push}px)`;
      } else {
        el.style.transform = "";
      }
    }
  });
  iconRow.addEventListener("mouseleave", () =>
    pushes.forEach((el) => (el.style.transform = "")),
  );
}

/* ---------- Smooth scrolling ----------
   Mouse wheel / trackpad on desktop: a light inertia (Lenis) driven by the same GSAP ticker as the scroll animations,
   so ScrollTrigger stays in step. Touch screens keep the native scroll (it already has inertia and feels best), and
   nothing runs for reduced-motion visitors. Anchor links (#...) glide on every device. To turn the inertia off, set
   SMOOTH_WHEEL to false. */
const SMOOTH_WHEEL = true;
let lenis: Lenis | null = null;
function smoothScroll() {
  if (SMOOTH_WHEEL && canHover) {
    lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, anchors: { offset: -84 } });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    return;
  }
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = a.hash.length > 1 ? document.getElementById(a.hash.slice(1)) : null;
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });
}

// Resolves once every already-loading image (eager/default — NOT loading="lazy", those haven't started fetching yet
// and may never need to for this visit) has settled. Used below so init()'s very FIRST ScrollTrigger measurement
// already reflects the page's true final height, instead of a shorter one that a still-loading hero image quietly
// corrects a moment later. That correction is exactly the bug reported only on a page's first load — a sticky
// section's start/end points were measured too early, then jumped once the real height was known, right as someone
// scrolled into it — and it happened much more on a real deployed network than locally, where images load near-
// instantly from disk and are usually already done before this code even runs.
function imagesReady(): Promise<void> {
  const pending = [...document.querySelectorAll<HTMLImageElement>('img:not([loading="lazy"])')].filter((img) => !img.complete);
  if (!pending.length) return Promise.resolve();
  return new Promise((resolve) => {
    let left = pending.length;
    const done = () => { if (--left <= 0) resolve(); };
    pending.forEach((img) => {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  });
}

if (!reduced) {
  smoothScroll();
  // Splitting measures text, so wait for the webfont or lines would break wrong.
  Promise.all([document.fonts.ready, imagesReady()]).then(init);
} else {
  document
    .querySelectorAll<HTMLElement>(".t3-fade")
    .forEach((el) => (el.style.opacity = "1"));
}

/* Native sticky instead of GSAP's pin. ScrollTrigger's pin flips the panel to
   position:fixed from JavaScript on the main thread (and anticipatePin fires that
   flip early on fast scrolls) — that hand-off is what read as a hard "snap" when a
   panel locked at the top. position:sticky is resolved by the browser's compositor
   together with the scroll itself, so the panel just stops moving, with no
   JS-timed switch. A wrapper reserves the scroll distance the timeline plays
   over; the wrapper's bottom margin keeps the usual gap to the next section. */
const PIN_TOP = 76; // never closer to the top than this (clears the fixed header)
/* Scroll-rail orientation: "h" = along the bottom of the panel, "v" = down the right edge. */
const RAIL: "h" | "v" = "h";
function stickyPanel(panel: HTMLElement, screens: number) {
  const parent = panel.parentElement as HTMLElement;
  const ownsWrapper = parent.classList.contains("t3-about-track");
  const wrapper = ownsWrapper ? parent : document.createElement("div");
  if (!ownsWrapper) {
    wrapper.style.marginBottom = getComputedStyle(panel).marginBottom;
    parent.insertBefore(wrapper, panel);
    wrapper.appendChild(panel);
    panel.style.marginBottom = "0";
  }
  panel.style.position = "sticky";
  // The panel locks vertically CENTRED in the window (so on a tall monitor there is no big empty
  // strip under it); it can never sit closer to the top than PIN_TOP, so on short windows,
  // where the panel is almost as tall as the screen, it locks at the top exactly as before.
  const pinTop = () =>
    Math.max(
      PIN_TOP,
      Math.round((window.innerHeight - panel.offsetHeight) / 2),
    );
  const dist = () => Math.round(window.innerHeight * screens);
  const size = () => {
    panel.style.top = pinTop() + "px";
    wrapper.style.height = panel.offsetHeight + dist() + "px";
  };
  size();
  ScrollTrigger.addEventListener("refreshInit", size);

  // Progress rail: follows the raw scroll position (no smoothing lag) through the locked stretch.
  const rail = document.createElement("div");
  rail.className = "t3-rail is-" + RAIL;
  rail.setAttribute("aria-hidden", "true");
  rail.innerHTML = "<i></i>";
  panel.appendChild(rail);
  const railTrigger = ScrollTrigger.create({
    trigger: wrapper,
    start: () => "top " + pinTop() + "px",
    end: () => "+=" + dist(),
    invalidateOnRefresh: true,
    onUpdate: (self) => rail.style.setProperty("--p", String(self.progress)),
  });

  return {
    trigger: wrapper,
    pinTop,
    dist,
    start: () => "top " + pinTop() + "px",
    end: () => "+=" + dist(),
    cleanup: () => {
      railTrigger.kill();
      rail.remove();
      ScrollTrigger.removeEventListener("refreshInit", size);
      panel.style.position = "";
      panel.style.top = "";
      wrapper.style.height = "";
      if (!ownsWrapper) {
        panel.style.marginBottom = "";
        wrapper.parentElement?.insertBefore(panel, wrapper);
        wrapper.remove();
      }
    },
  };
}

/* Numbers that count up from zero when their block appears: <b data-count="150" data-prefix="+" data-suffix="">. The finished
   value is already in the HTML (no-JS and reduced-motion visitors just see it). */
function countUp(scope: ParentNode) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  scope.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const to = Number(el.dataset.count);
    const pre = el.dataset.prefix ?? "";
    const suf = el.dataset.suffix ?? "";
    const state = { v: 0 };
    // "k-to-m": counts in thousands and lands on "1M+" (a plain 0 -> 1 would just jump)
    const dec = Number(el.dataset.decimals ?? 0);
    const fmt = (v: number) =>
      el.dataset.format === "k-to-m" ? (Math.round(v) >= 1000 ? "1M+" : Math.round(v) + "k") : pre + v.toFixed(dec).replace(".", ",") + suf;
    el.textContent = fmt(0);
    gsap.to(state, {
      v: to,
      duration: 1.9,
      delay: 0.35,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = fmt(state.v);
      },
    });
  });
}

function init() {
  /* Hero: headline words rise out of a mask, side elements fade in after. */
  const h1 = document.querySelector<HTMLElement>(".t3-h1");
  if (h1) {
    SplitText.create(h1, {
      type: "lines,words",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) => {
        // the title is hidden by CSS until now (no flash of the finished title before it animates)
        h1.classList.add("is-ready");
        return gsap.from(self.words, {
          yPercent: 145,
          duration: 1.1,
          stagger: 0.07,
          ease: "power4.out",
          delay: 0.15,
        });
      },
    });
  }
  gsap.fromTo(
    ".t3-fade",
    { y: 24, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.9,
      stagger: 0.12,
      ease: "power3.out",
      delay: 0.5,
    },
  );
  /* Interior hero visual: fades in with the text, and only THEN its own looping animation starts (it is paused by CSS until
     .is-in), so it is never seen playing before it appears. */
  const vis = document.querySelector<HTMLElement>(".ph-vis");
  if (vis) {
    gsap.fromTo(
      vis,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.95, ease: "power3.out", delay: 0.6, onStart: () => {
          vis.classList.add("is-in");
          countUp(vis);
        },
      },
    );
  }

  /* Hero image: gentle parallax — it drifts a little slower than the page while you scroll away from the hero. */
  const heroImg = document.querySelector<HTMLElement>(".t3-hero-media");
  const heroSec = document.querySelector<HTMLElement>(".t3-hero");
  if (heroImg && heroSec) {
    gsap.fromTo(
      heroImg,
      { yPercent: -7 },
      {
        yPercent: 7,
        ease: "none",
        scrollTrigger: {
          trigger: heroSec,
          start: 0,
          end: "bottom top",
          scrub: true,
        },
      },
    );

    /* Entrance only: the image settles from a slightly closer framing, once. (The endless idle sway was
       removed — together with the mouse look-around and the parallax it read as too much motion.) */
    // Phones: one slow zoom-out (about 5 s) instead; the small picture area gets a clear, calm movement.
    const phoneHero = window.matchMedia("(max-width: 860px)").matches;
    gsap.fromTo(
      heroImg,
      { scale: phoneHero ? 1.22 : 1.06 },
      {
        scale: 1,
        duration: phoneHero ? 5 : 2.2,
        ease: phoneHero ? "power2.out" : "power3.out",
      },
    );
  }

  /* Section titles: line-mask reveal on enter. */
  document.querySelectorAll<HTMLElement>("[data-t3-title]").forEach((el) => {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 140,
          duration: 0.95,
          stagger: 0.09,
          ease: "power4.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }),
    });
  });

  /* About (desktop): the panel is pinned while ONE scrubbed timeline plays —
     the text fills word by word, then the cards slide in from the right
     (each starts full-width and shrinks to a third while its colours settle
     from black). The panel only releases once the timeline is complete, and
     the next section then arrives after the normal panel gap. */
  const aboutText = document.querySelector<HTMLElement>(".t3-about-text");
  const panel = document.querySelector<HTMLElement>(".t3-about-panel");
  const statsRow = document.querySelector<HTMLElement>(".t3-stats");
  if (aboutText && panel && statsRow) {
    const words = SplitText.create(aboutText, {
      type: "words",
      aria: "none",
    }).words;
    gsap.set(words, { opacity: 0.18 });
    const cards = gsap.utils.toArray<HTMLElement>(".t3-stat");
    const mm = gsap.matchMedia();

    mm.add("(min-width: 900px)", () => {
      const gap = 14;
      const third = () => (statsRow.clientWidth - gap * 2) / 3;
      const full = () => statsRow.clientWidth * 0.94;

      gsap.set(cards, { flex: "none", width: full });
      cards.forEach((c) => c.style.setProperty("--p", "0"));
      // Lock the card text to its FINAL width so it arrives already wrapped the way it will end up (no reflow while the card shrinks).
      const lockText = () =>
        cards.forEach((c) =>
          c.style.setProperty("--inner-w", third() - 44 + "px"),
        );
      lockText();
      ScrollTrigger.addEventListener("refreshInit", lockText);

      const sticky = stickyPanel(panel, 2.4);
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sticky.trigger,
          start: sticky.start,
          end: sticky.end,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      // Everything plays together: the text fill (0 → ~2.1) always finishes
      // before the last card settles (~3.0). Each card arrives black and
      // whitens as it shrinks into its slot.
      tl.to(words, { opacity: 1, stagger: { amount: 1.9 }, duration: 0.25 }, 0);
      cards.forEach((card, i) => {
        const at = i * 0.3;
        tl.to(card, { width: third, duration: 2.4, ease: "power2.inOut" }, at);
        // Tween a plain number and write the CSS variable ourselves (GSAP misreads the default of a bare custom property).
        const state = { p: 0 };
        tl.to(
          state,
          {
            p: 1,
            duration: 2.4,
            ease: "power2.inOut",
            onUpdate: () => card.style.setProperty("--p", String(state.p)),
          },
          at,
        );
      });
      tl.to({}, { duration: 0.15 }); // tiny hold: the next section starts rising just as the cards finish
      return () => {
        sticky.cleanup();
        ScrollTrigger.removeEventListener("refreshInit", lockText);
        cards.forEach((c) => {
          c.style.removeProperty("--p");
          c.style.removeProperty("--inner-w");
        });
      };
    });

    mm.add("(max-width: 899px)", () => {
      // On a phone the text darkens word by word with the scroll, like on desktop, but the range is short: it starts
      // as the paragraph enters and is complete when its middle reaches the middle of the screen, so it is always
      // fully readable by the time you are reading it.
      gsap.to(words, {
        opacity: 1,
        stagger: 0.12,
        ease: "none",
        scrollTrigger: {
          trigger: aboutText,
          start: "top 92%",
          end: "center 50%",
          scrub: 0.4,
        },
      });
      // Swipe hint: the cards slide in from the right, hit the left edge, and settle back a little, so it is clear that
      // the row can be dragged. Runs once, when the row comes into view. The row is locked (overflow hidden) while it
      // plays, so the translate cannot create a scrollbar or be interrupted halfway.
      gsap.set(cards, { x: () => statsRow.clientWidth, opacity: 0 });
      // (snap off too: with the cards pushed out to the right the row becomes wider and snapping would scroll it to the end)
      statsRow.style.overflowX = "hidden";
      statsRow.style.scrollSnapType = "none";
      statsRow.scrollLeft = 0;
      const done = () => {
        statsRow.style.overflowX = "";
        statsRow.style.scrollSnapType = "";
        statsRow.scrollLeft = 0;
        gsap.set(cards, { clearProps: "transform,opacity" });
      };
      // Each card has its OWN sequence (in, touch the edge, back) so the return starts right away; only a small delay
      // between cards. Fast in, a little slower out.
      const hint = gsap.timeline({
        scrollTrigger: { trigger: statsRow, start: "top 88%", once: true },
        onComplete: done,
      });
      cards.forEach((card, i) => {
        const at = i * 0.07;
        hint.to(card, { opacity: 1, duration: 0.2, ease: "none" }, at);
        hint.to(card, { x: -26, duration: 0.4, ease: "power2.out" }, at);
        hint.to(card, { x: 0, duration: 0.5, ease: "power2.inOut" }, at + 0.34);
      });
      return () => {
        statsRow.style.overflowX = "";
        statsRow.style.scrollSnapType = "";
        gsap.set(cards, { clearProps: "transform,opacity" });
      };
    });
  }

  /* Stacked-card panels (Process + Projects). Desktop: same technique as About —
     the panel keeps its final size, is pinned, and ONE scrubbed timeline brings
     cards 2..n up from below the SCREEN (the panel does not clip them); the card
     underneath frosts (blur + fade + recede) only while the next one is actually
     sliding over it. The page is released once the last card has settled.
     Mobile/no-JS: plain sticky stacking (CSS). */
  // Cards that are already covered are left slightly askew (a small tilt plus a sideways shift, fixed per
  // card), so the pile reads as a real stack instead of a ruler-straight one. Opt in with data-mess (or data-tilt).
  const MESS_ROT = [-1.7, 1.3, -1.0, 1.6, -1.2, 0.9];
  const MESS_X = [-12, 9, -7, 11, -9, 6];
  document.querySelectorAll<HTMLElement>(".t3-stack").forEach((panel) => {
    const wrap = panel.querySelector<HTMLElement>(".t3-steps");
    const steps = [...panel.querySelectorAll<HTMLElement>(".t3-step")];
    if (!wrap || steps.length < 2) return;
    const STACK = 18; // px each card peeks below the previous one (matches CSS)
    const TILT = Number(panel.dataset.tilt) || 0; // degrees of 3D lean while a card rises (0 = flat)
    const MESS = TILT > 0 || panel.hasAttribute("data-mess");
    const mm = gsap.matchMedia();

    // One pinned layout for every screen size: the panel is held in place at its final size while the cards rise
    // into it, then everything scrolls away together. Phones only differ in scroll length and in having no blur.
    const pin = (phone: boolean) => {
      panel.classList.add("t3-pinned");
      const cardH = () => steps[0].offsetHeight;
      // Start each card just below the bottom edge of the screen, as if the panel were already pinned at its 76px top.
      const startY = (i: number) => {
        const relTop =
          wrap.getBoundingClientRect().top - panel.getBoundingClientRect().top;
        return window.innerHeight - (sticky.pinTop() + relTop + i * STACK) + 40;
      };

      // On a phone, 2.1 screens of scroll for 4 cards is more than one (sometimes even two) swipe-with-momentum
      // covers — needing several separate swipes to get through it, with the natural pause between each one (lifting
      // and repositioning a thumb) reading as the section "freezing" for a couple of seconds. Shorter on phones so it
      // comfortably finishes in one or two swipes; unchanged on desktop, where the wheel drives it continuously.
      const sticky = stickyPanel(
        panel,
        Number(panel.dataset.screens) || (phone ? 1.5 : 2.6),
      );
      // The look of a covered card is recomputed for EVERY card on every render of the timeline (not in the tweens'
      // own onUpdate): when the page opens already scrolled into the stack (reload, back button) GSAP jumps the
      // finished tweens straight to their end without calling their onUpdate, and the pile came out straight.
      const covers: (() => void)[] = [];
      const runCovers = () => covers.forEach((f) => f());
      // scrub adds 0.8s of deliberate lag (so the cards glide instead of snapping to the raw scroll position), but the
      // panel's own release from position:sticky has NO lag — it lets go the instant the wrapper's real, un-lagged
      // scroll distance (dist()) is behind it. Scroll fast enough and the panel can let go before the (lagged)
      // animation has actually finished sliding the last card into place, leaving a sliver of it visible over the
      // next section for a moment. Ending the animation itself a bit earlier than the panel's real release gives the
      // lag time to fully resolve — the cards are already still by the time the panel actually lets go.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: runCovers,
        scrollTrigger: {
          trigger: sticky.trigger,
          start: sticky.start,
          end: () => "+=" + sticky.dist() * 0.82,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onScrubComplete: runCovers,
        },
      });
      // GSAP renders some tweens on the next tick, after the timeline own onUpdate: apply again once things settle
      const settle = () => requestAnimationFrame(() => requestAnimationFrame(runCovers));
      ScrollTrigger.addEventListener("refresh", settle);
      settle();

      steps.forEach((card, i) => {
        if (i === 0) return;
        const prev = steps[i - 1];
        const prevBody = prev.querySelector(".t3-step-in");
        tl.fromTo(
          card,
          {
            y: () => startY(i),
            ...(TILT
              ? {
                  rotationX: TILT,
                  transformPerspective: 1100,
                  transformOrigin: "50% 0%",
                }
              : {}),
          },
          {
            y: 0,
            ...(TILT ? { rotationX: 0 } : {}),
            duration: 1,
            ease: "power1.inOut",
          },
          i - 1,
        );
        covers.push(() => {
          {
            {
              // overlap depth: 0 until this card touches the previous one's bottom edge, 1 once it has fully covered it
              const y = Number(gsap.getProperty(card, "y"));
              const q = Math.min(1, Math.max(0, 1 - y / (cardH() - STACK)));
              gsap.set(prev, {
                scale: 1 - 0.06 * q,
                rotation: (MESS ? MESS_ROT[(i - 1) % MESS_ROT.length] : 0) * q,
                x: (MESS ? MESS_X[(i - 1) % MESS_X.length] : 0) * q,
                transformOrigin: "50% 0%",
              });
              // no blur on phones: it is costly on mobile GPUs and made the text look broken, fading is enough
              gsap.set(prevBody, {
                filter: !phone && q > 0.004 ? "blur(" + 14 * q + "px)" : "none",
                opacity: 1 - (phone ? 0.62 : 0.7) * q,
              });
            }
          }
        });
      });
      tl.to({}, { duration: 0.2 }); // tiny hold once the last card is settled

      return () => {
        ScrollTrigger.removeEventListener("refresh", settle);
        sticky.cleanup();
        panel.classList.remove("t3-pinned");
        steps.forEach((card) => {
          gsap.set(card, { clearProps: "transform,scale,y" });
          gsap.set(card.querySelector(".t3-step-in"), {
            clearProps: "filter,opacity",
          });
        });
      };
    };

    mm.add("(min-width: 900px)", () => pin(false));
    mm.add("(max-width: 899px)", () => pin(true));
  });

  /* Authority icons follow the scroll horizontally. The ROW itself is the
     trigger (not the whole panel — the icons sit at its top and would have left
     the screen before a panel-based exit ever played): they glide in from the
     left as the row rises into view, rest in the middle, then leave to the
     right as it goes out at the top. Slow, scrubbed, reversible. */
  const iconRowEl = document.querySelector<HTMLElement>(".t3-icon-row");
  const icons = gsap.utils.toArray<HTMLElement>(".t3-ico");
  if (iconRowEl && icons.length) {
    // Wide screens: the icons glide in from the left, rest in the middle and leave to the right. On a phone the row
    // is small and near the edges, so the slide is short (40px) and the rest phase long: it is centred most of the time.
    const phone = window.matchMedia("(max-width: 700px)").matches;
    const off = phone ? 40 : window.innerWidth * 0.42;
    const inDur = phone ? 0.16 : 0.3;
    const outAt = phone ? 0.82 : 0.66;
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: iconRowEl,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.2,
      },
    });
    tl.set(icons, { x: -off, opacity: 0 }, 0);
    tl.to(
      icons,
      {
        x: 0,
        opacity: 1,
        ease: "power2.out",
        duration: inDur,
        stagger: { each: phone ? 0.015 : 0.03, from: "end" },
      },
      0,
    );
    tl.to(
      icons,
      {
        x: off,
        opacity: 0,
        ease: "power2.in",
        duration: inDur,
        stagger: { each: phone ? 0.015 : 0.03, from: "end" },
      },
      outAt,
    );
  }

  /* Testimonials. Desktop: sticky panel + one scrubbed timeline; each card slides in
     from beyond the LEFT edge of the screen and lands over the previous one, which
     frosts (blur + fade + recede) only while it is actually being covered.
     Mobile: cards just rise in. */
  const testiPanel = document.querySelector<HTMLElement>(".t3-testi");
  const tArea = testiPanel?.querySelector<HTMLElement>(".t3-tcards");
  const tCards = testiPanel
    ? [...testiPanel.querySelectorAll<HTMLElement>(".t3-tcard")]
    : [];
  if (testiPanel && tArea && tCards.length > 1) {
    const T_STACK = 18;
    const mmT = gsap.matchMedia();

    mmT.add("(min-width: 900px)", () => {
      testiPanel.classList.add("t3-pinned");
      const sticky = stickyPanel(testiPanel, 2.2);
      const covers: (() => void)[] = [];
      const runCovers = () => covers.forEach((f) => f()); // see the note in the process block: onUpdate of the whole timeline, not of each tween
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        onUpdate: runCovers,
        scrollTrigger: {
          trigger: sticky.trigger,
          start: sticky.start,
          // ends a bit before the panel's own (un-lagged) release — see the matching comment in the Process
          // block above for why scrub's deliberate lag needs that head start.
          end: () => "+=" + sticky.dist() * 0.82,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onScrubComplete: runCovers,
        },
      });
      // GSAP renders some tweens on the next tick, after the timeline own onUpdate: apply again once things settle
      const settle = () => requestAnimationFrame(() => requestAnimationFrame(runCovers));
      ScrollTrigger.addEventListener("refresh", settle);
      settle();

      tCards.forEach((card, i) => {
        if (i === 0) return;
        const prev = tCards[i - 1];
        const prevBody = prev.querySelector(".t3-tcard-in");
        tl.fromTo(
          card,
          { x: () => -tArea.getBoundingClientRect().right - 60 },
          {
            x: 0,
            duration: 1,
            ease: "power2.inOut",
          },
          i - 1,
        );
        covers.push(() => {
          {
            {
              // 0 until this card's right edge reaches the previous card's left edge, 1 once it fully covers it
              const x = Number(gsap.getProperty(card, "x"));
              const w = tArea.offsetWidth;
              const q = Math.min(1, Math.max(0, (w + x) / w));
              gsap.set(prev, {
                scale: 1 - 0.06 * q,
                rotation: MESS_ROT[(i - 1) % MESS_ROT.length] * q,
                // xPercent, not x: x is what slides each card in from the left, and writing it here reset the
                // start position of cards that had not entered yet
                xPercent: ((MESS_X[(i - 1) % MESS_X.length] * q) / w) * 100,
                transformOrigin: "50% 0%",
              });
              // the covered card lightens a little (CSS reads --lift), so the pile of black cards can be told apart
              prev.style.setProperty("--lift", q.toFixed(3));
              gsap.set(prevBody, {
                filter: q > 0.004 ? "blur(" + 14 * q + "px)" : "none",
                opacity: 1 - 0.7 * q,
              });
            }
          }
        });
      });
      tl.to({}, { duration: 0.2 });

      return () => {
        ScrollTrigger.removeEventListener("refresh", settle);
        sticky.cleanup();
        testiPanel.classList.remove("t3-pinned");
        tCards.forEach((card) => {
          card.style.removeProperty("--lift");
          gsap.set(card, { clearProps: "transform,scale,x" });
          gsap.set(card.querySelector(".t3-tcard-in"), {
            clearProps: "filter,opacity",
          });
        });
      };
    });

    mmT.add("(max-width: 899px)", () => {
      gsap.from(tCards, {
        y: 50,
        opacity: 0,
        duration: 0.9,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: { trigger: tArea, start: "top 85%", once: true },
      });
    });
  }

  /* Sectors watermark: slow parallax — the mark drifts down a little relative to the panel
     as the page scrolls up, so it reads as sitting further back than the text. */
  document
    .querySelectorAll<HTMLElement>(".t3-watermark, .t3-band-mark, .t3-proof-mark")
    .forEach((wm) => {
      const wmPanel = wm.closest<HTMLElement>(".t3-panel");
      if (!wmPanel) return;
      gsap.fromTo(
        wm,
        { y: -55 },
        {
          y: 55,
          ease: "none",
          scrollTrigger: {
            trigger: wmPanel,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    });

  /* Generic reveal for cards on interior pages: rise + fade in small batches as they enter. */
  gsap.set("[data-reveal]", { y: 36, opacity: 0 });
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 90%",
    once: true,
    onEnter: (els) =>
      gsap.to(els, {
        y: 0,
        opacity: 1,
        duration: 0.85,
        stagger: 0.09,
        ease: "power3.out",
        clearProps: "transform,opacity",
      }),
  });

  /* Blog cards: staggered blur-in. */
  gsap.from(".t3-bp", {
    y: 80,
    opacity: 0,
    filter: "blur(10px)",
    duration: 1,
    stagger: 0.13,
    ease: "power3.out",
    clearProps: "transform,filter,opacity", // hand control back to the CSS hover states
    scrollTrigger: { trigger: ".t3-blog-strip", start: "top 82%", once: true },
  });

  /* FAQ rows slide in. */
  gsap.from(".t3-faq-row", {
    y: 26,
    opacity: 0,
    duration: 0.7,
    stagger: 0.08,
    ease: "power2.out",
    scrollTrigger: { trigger: ".t3-faq-list", start: "top 85%", once: true },
  });

  /* CTA heading: scrubbed word fill. The trigger is the WHOLE closing panel and its end is
     "panel bottom = window bottom" — the last position the page can reach — so the fill is
     guaranteed to complete however tall or short the screen is. A short hold at the end of
     the timeline makes every word reach full white at ~80% of that scroll, leaving the last
     stretch with the finished headline. */
  const ctaTitle = document.querySelector<HTMLElement>(".t3-cta-title");
  const ctaPanel = document.querySelector<HTMLElement>(".t3-cta");
  if (ctaTitle && ctaPanel) {
    const words = SplitText.create(ctaTitle, { type: "words" }).words;
    gsap.set(words, { opacity: 0.2 });
    const ctaTl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ctaPanel,
        start: "top 82%",
        end: "bottom bottom",
        scrub: 0.8,
      },
    });
    ctaTl.to(words, { opacity: 1, stagger: { amount: 0.8 }, duration: 0.2 }, 0);
    ctaTl.to({}, { duration: 0.25 });
  }

  /* Footer wordmark: travels DOWN behind the content as the last panel comes up, fading in, and
     comes to rest on the base of the panel exactly when the page reaches its end
     (end: "bottom bottom" = the last scroll position that exists). Scrubbed, so it also
     rewinds when scrolling back up. */
  const ctaMark = document.querySelector<HTMLElement>(".t3-cta-mark");
  const ctaSection = document.querySelector<HTMLElement>(".t3-cta");
  if (ctaMark && ctaSection) {
    const markTl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ctaSection,
        start: "top bottom",
        end: "bottom bottom",
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
    // starts high in the panel, behind the headline (distance measured from the real sizes, so it adapts to any screen)
    markTl.fromTo(
      ctaMark,
      { y: () => -Math.round(ctaSection.offsetHeight * 0.62) },
      { y: 0, ease: "power1.out", duration: 1 },
      0,
    );
    const markOpacity =
      parseFloat(getComputedStyle(ctaMark).getPropertyValue("--t3-mark-o")) ||
      0.08;
    markTl.fromTo(
      ctaMark,
      { opacity: 0 },
      { opacity: markOpacity, duration: 0.45 },
      0,
    );
  }

  /* Crisp small icons: the footer circles sit at fractional pixel positions (fluid panel widths), which
     anti-aliases the thin strokes and reads as low resolution on 1x screens. Nudge each circle onto the
     pixel grid with the independent `translate` property (hover keeps using transform). */
  const snapEls = [...document.querySelectorAll<HTMLElement>(".t3-socials a")];
  const snapCrisp = () => {
    snapEls.forEach((el) => {
      el.style.translate = "";
      const r = el.getBoundingClientRect();
      const x = r.left + window.scrollX;
      const y = r.top + window.scrollY;
      el.style.translate = `${Math.round(x) - x}px ${Math.round(y) - y}px`;
    });
  };
  snapCrisp();
  window.addEventListener("resize", snapCrisp);
  ScrollTrigger.addEventListener("refresh", snapCrisp);
  // The document keeps changing height while images/panels settle, which shifts the fraction again.
  new ResizeObserver(snapCrisp).observe(document.body);

  requestAnimationFrame(() => ScrollTrigger.refresh());

  // Refreshing WHILE the visitor is actively scrolled into a pinned section (position:sticky, its wrapper's height
  // driving how far it stays locked) can itself cause a visible snap the moment the wrapper's height changes under
  // it — on top of whatever originally needed correcting. So a correction is never forced through mid-pin: it waits,
  // checking every frame, until nothing is currently active, THEN refreshes — always landing in a moment the visitor
  // can't see, instead of in the middle of watching a section it's currently locked into.
  // Two guards keep this from ever becoming its own problem: `pending` means only ONE such wait is ever running (each
  // resize below would otherwise be free to start another overlapping one), and it gives up and refreshes anyway after
  // 90 frames (~1.5s) rather than polling forever on a page with an unusually long-lived pin.
  let pending = false;
  function refreshWhenIdle() {
    if (pending) return;
    pending = true;
    const tick = (framesLeft: number) => {
      if (framesLeft > 0 && ScrollTrigger.getAll().some((st) => st.isActive)) {
        requestAnimationFrame(() => tick(framesLeft - 1));
        return;
      }
      pending = false;
      ScrollTrigger.refresh();
    };
    tick(90);
  }

  window.addEventListener("load", refreshWhenIdle, { once: true });

  // Every pinned/scrubbed section above (the stacking cards, the testimonials, the author-card reveal, the h2 line
  // masks) has its scroll start/end baked in pixels at the moment it was measured. If the PAGE'S total height changes
  // afterwards for any reason — a hero frame/video settling, a webfont swap reflowing a paragraph, a slow image
  // anywhere finishing after the "load" refresh above already ran — every trigger below that point silently goes out
  // of sync with the real layout: a title's reveal fires early/late, or (worse) a pinned section's math assumes a
  // page height that no longer matches, which reads as cards jumping or overlapping the next section. A single
  // "load" refresh does NOT cover this — "load" only means the initial resources finished, not that nothing on the
  // page will ever resize again. This keeps everything self-correcting for as long as the page lives, and is WHY this
  // class of bug is worse on a real deployed network (things really do keep finishing late, at unpredictable times)
  // than on a local dev server serving everything instantly from disk: locally there is barely a "late" to catch.
  let bodyResizeTimer: ReturnType<typeof setTimeout> | null = null;
  new ResizeObserver(() => {
    if (bodyResizeTimer) clearTimeout(bodyResizeTimer);
    bodyResizeTimer = setTimeout(refreshWhenIdle, 200);
  }).observe(document.body);
}
