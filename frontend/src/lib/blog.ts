import { getPosts } from "./wp";

// Deliberately excluded everywhere: the WP default "Hello world!" and the old post that launches the retired
// "Método D.R.O.P.S." — that name is no longer part of the brand (unpublish both in WordPress).
const HIDDEN_POSTS = ["hello-world", "metodologia-marketing-digital-nuvion"];

export async function getVisiblePosts() {
  return (await getPosts()).filter((p) => !HIDDEN_POSTS.includes(p.slug));
}

// WordPress's generic categories are never shown as the article's category.
const GENERIC_CATEGORIES = ["blog", "uncategorized", "agencia", "novidades"];
type PostLike = { categories: { slug: string; name: string }[]; content: string; author: string };
/** First real category of a post (skips the generic ones). */
export const postCategory = (post: PostLike) => post.categories.find((c) => !GENERIC_CATEGORIES.includes(c.slug)) ?? { slug: "artigo", name: "Artigo" };
/** Reading time in minutes (about 200 words per minute, at least 1), counted from the article's own text. */
export const readingMinutes = (post: PostLike) => Math.max(1, Math.round(post.content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length / 200));
/** The categories in use, with how many articles each has and the newest article of each (input is expected newest first). */
export function categoriesWithCounts<T extends PostLike & { title: string }>(posts: T[]) {
  const map = new Map<string, { slug: string; name: string; count: number; latest: T }>();
  for (const p of posts) {
    const c = postCategory(p);
    const cur = map.get(c.slug);
    if (cur) cur.count++;
    else map.set(c.slug, { slug: c.slug, name: c.name, count: 1, latest: p });
  }
  return [...map.values()];
}

/** True when the WordPress author name is the founder (matches first and last name, so "Juan C. Fabra Gomez" counts). */
export function isFounderAuthor(name: string, founderName: string) {
  const a = name.toLowerCase().split(" ").filter(Boolean);
  const f = founderName.toLowerCase().split(" ").filter(Boolean);
  return a.length > 1 && a[0] === f[0] && a[a.length - 1] === f[f.length - 1];
}

/** Word count of the article text (tags removed). */
export const wordCount = (post: { content: string }) => post.content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

/** Cuts a text to at most "max" characters at a word boundary, with an ellipsis when it was cut. */
export function cutText(text: string, max: number) {
  // Stripping tags leaves a stray space wherever a closing tag sat right next to punctuation ("<strong>x</strong>, y" ->
  // "x , y") — collapsed away here so it never surfaces in an excerpt.
  const s = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max - 1);
  const at = head.lastIndexOf(" ");
  // never end on a dangling little word ("… e Como", "… de")
  const LOOSE = new Set(["e", "o", "a", "os", "as", "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos", "para", "por", "com", "um", "uma", "que", "ou", "ao", "como", "sua", "seu"]);
  const words = (at > max * 0.6 ? head.slice(0, at) : head).split(" ");
  while (words.length > 1 && LOOSE.has(words[words.length - 1].toLowerCase().replace(/[^a-zà-ú]/gi, ""))) words.pop();
  return words.join(" ").replace(/[\s,;:.\-–—]+$/, "") + "…";
}
/** Page title for search results: about 60 characters at most, "… — Nuvion". The h1 keeps the full title. */
export const seoTitle = (post: { title: string; seoTitle?: string }) => cutText(post.seoTitle || post.title, 52) + " — Nuvion";
/** Meta description: the WordPress SEO one when there is one, else the excerpt; 155 characters at most. */
export const seoDescription = (post: { excerpt: string; seoDescription?: string }) => cutText(post.seoDescription || post.excerpt, 155);

/** Other articles for the end of a post: the same category first, then the newest ones. */
export function relatedPosts<T extends PostLike & { slug: string; date: string }>(post: T, all: T[], n = 3) {
  const cat = postCategory(post).slug;
  const others = all.filter((p) => p.slug !== post.slug).sort((a, b) => b.date.localeCompare(a.date));
  return [...others.filter((p) => postCategory(p).slug === cat), ...others.filter((p) => postCategory(p).slug !== cat)].slice(0, n);
}

const decodeEntities = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Prepares the WordPress HTML of an article: gives every h2 an id (for the table of contents) and wraps tables so they can scroll sideways on small screens. */
export function prepareArticle(html: string) {
  const used = new Set<string>();
  const toc: { id: string; text: string }[] = [];
  let out = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (m, attrs: string, inner: string) => {
    const text = decodeEntities(inner.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
    if (!text) return m;
    const existing = /\sid="([^"]+)"/.exec(attrs);
    let id = existing ? existing[1] : slugify(text) || "secao";
    const base = id;
    for (let i = 2; used.has(id); i++) id = base + "-" + i;
    used.add(id);
    toc.push({ id, text });
    return existing ? m : "<h2" + attrs + ' id="' + id + '">' + inner + "</h2>";
  });
  out = out.replace(/<table/g, '<div class="t3-tablewrap"><table').replace(/<\/table>/g, "</table></div>");
  return { html: out, toc };
}

/** One question detected in a WordPress "faq" block: the <h3> text and everything until the next <h3>/<h2> as the answer. */
export interface ArticleFaq {
  question: string;
  /** Plain text (schema.org wants text, not HTML). */
  answerText: string;
  /** Original HTML of the answer (kept for the visible accordion: links, bold, lists...). */
  answerHtml: string;
}

const decodeEntitiesFaq = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const plainText = (h: string) => decodeEntitiesFaq(h.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
// a question typed as "1. ..." or "1) ..." keeps its own count from the accordion, which numbers them itself
const stripLeadingNumber = (s: string) => s.replace(/^\s*\d+[.)]\s*/, "");

/**
 * Finds the FAQ block the author marked in the WordPress editor: an <h2> (or <h3>) with the CSS class "faq" (added in the
 * block's Advanced panel), followed by one <h3> per question, each with everything up to the next <h3>/<h2> as its answer.
 * Returns the questions, the (unmodified) heading tag it was found in and the HTML span to cut out of the article (heading
 * included), so the page can put its own accordion there instead. Any <script type="application/ld+json"> the author pasted
 * inside that span is removed with it, so it can never contradict what the accordion actually shows. Returns null when the
 * post has no such block, so a page with no FAQ renders exactly as before.
 */
export function extractFaqBlock(html: string): { faqs: ArticleFaq[]; heading: string; before: string; after: string } | null {
  const headingRe = /<(h[23])\b[^>]*\bclass="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/g;
  let hm: RegExpExecArray | null;
  while ((hm = headingRe.exec(html))) {
    if (!/(^|\s)faq(\s|$)/.test(hm[2])) continue;
    const startTag = hm.index;
    const afterHeading = headingRe.lastIndex;
    const nextH2 = html.slice(afterHeading).search(/<h2\b/);
    const blockEnd = nextH2 === -1 ? html.length : afterHeading + nextH2;
    const block = html.slice(afterHeading, blockEnd);
    const items: ArticleFaq[] = [];
    const qRe = /<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b|$)/g;
    let qm: RegExpExecArray | null;
    while ((qm = qRe.exec(block))) {
      const question = stripLeadingNumber(plainText(qm[1]));
      // the pasted FAQPage script (if any) is dropped, so it can never disagree with what the accordion shows
      const answerHtml = qm[2].replace(/<script[\s\S]*?<\/script>/gi, "").trim();
      const answerText = plainText(answerHtml);
      if (question && answerText) items.push({ question, answerHtml, answerText });
    }
    if (!items.length) continue; // "faq" class with no questions under it: leave the heading alone, look further down
    return { faqs: items, heading: html.slice(startTag, afterHeading), before: html.slice(0, startTag), after: html.slice(blockEnd) };
  }
  return null;
}
