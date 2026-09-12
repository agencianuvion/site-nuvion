/**
 * WordPress REST API client. Fetches raw WP JSON and maps it onto the
 * clean contracts in src/types/content.ts — components never deal with
 * WP's response format directly.
 */
import type { Post, Taxonomy } from "../types/content";

const API_URL = import.meta.env.PUBLIC_WP_API_URL;

if (!API_URL) {
  throw new Error("Missing PUBLIC_WP_API_URL environment variable (see .env.example)");
}

const FALLBACK_IMAGE = "/images/fallback.jpg"; // TODO: add a real fallback image for posts without a featured image.

interface WpRenderedField {
  rendered: string;
}

interface WpFeaturedMedia {
  source_url: string;
  media_details?: {
    sizes?: Record<string, { source_url: string }>;
  };
}

// wp:term comes back as an array of arrays in _embed (one sub-array per
// taxonomy), so each term carries its own taxonomy name to filter by
// without depending on sub-array order.
interface WpEmbeddedTerm {
  slug: string;
  name: string;
  taxonomy: string;
}

interface WpEmbeddedAuthor {
  name: string;
}

interface WpEmbedded {
  "wp:featuredmedia"?: WpFeaturedMedia[];
  "wp:term"?: WpEmbeddedTerm[][];
  author?: WpEmbeddedAuthor[];
}

interface WpPost {
  id: number;
  slug: string;
  date: string;
  title: WpRenderedField;
  excerpt: WpRenderedField;
  content: WpRenderedField;
  _embedded?: WpEmbedded;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ");
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function stripHtml(input: string): string {
  return normalizeWhitespace(decodeHtmlEntities(input.replace(/<[^>]*>/g, "")));
}

// Prefer a size WP already resized over the full original — an original
// upload can be several MB for no visual gain over a ~768px version in a
// card/hero. Falls back down to "large" then the raw source_url.
function getFeaturedImage(embedded?: WpEmbedded): string {
  const media = embedded?.["wp:featuredmedia"]?.[0];
  if (!media) return FALLBACK_IMAGE;

  const sizes = media.media_details?.sizes;
  return sizes?.medium_large?.source_url ?? sizes?.large?.source_url ?? media.source_url;
}

function getTerms(embedded: WpEmbedded | undefined, taxonomy: string): Taxonomy[] {
  const terms = embedded?.["wp:term"]?.flat() ?? [];
  return terms
    .filter((term) => term.taxonomy === taxonomy)
    .map((term) => ({ slug: term.slug, name: decodeHtmlEntities(term.name) }));
}

function getAuthorName(embedded: WpEmbedded | undefined): string {
  return embedded?.author?.[0]?.name ? decodeHtmlEntities(embedded.author[0].name) : "";
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`WP API request failed (${response.status} ${response.statusText}): ${path}`);
  }
  return response.json();
}

// Cached per module-process (build or dev server) so getStaticPaths() and
// the listing page calling getPosts() independently don't double the
// request — see getPosts() below.
let postsCache: Promise<Post[]> | null = null;

export async function getPosts(): Promise<Post[]> {
  if (postsCache) return postsCache;
  postsCache = fetchPosts();
  return postsCache;
}

async function fetchPosts(): Promise<Post[]> {
  const posts = await fetchJson<WpPost[]>("/posts?_embed&per_page=20");

  return posts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: normalizeWhitespace(decodeHtmlEntities(post.title.rendered)),
    excerpt: stripHtml(post.excerpt.rendered),
    // content.rendered is trusted HTML (edited by the site's own admins),
    // so it goes straight through via set:html, no stripHtml.
    content: post.content?.rendered ?? "",
    featuredImage: getFeaturedImage(post._embedded),
    date: post.date,
    author: getAuthorName(post._embedded),
    categories: getTerms(post._embedded, "category"),
    tags: getTerms(post._embedded, "post_tag"),
  }));
}

/**
 * TODO — pattern for adding a custom post type:
 *
 * 1. Register the CPT in a new wordpress/cpt-xxx.php mu-plugin (public,
 *    show_in_rest: true, a distinct rest_base) — see that file's own
 *    template for the exact shape.
 * 2. Add its extra fields in a matching wordpress/fields-xxx.php: a
 *    native meta box (no fields plugin required) plus a
 *    register_rest_field() that exposes everything already resolved
 *    under ONE key, e.g. `fields` (image IDs turned into real URLs,
 *    WYSIWYG content run through wpautop(), etc.) — see that file's own
 *    template for the full worked pattern (text/textarea/WYSIWYG/single
 *    image/gallery/repeater fields, and the save handler for each).
 * 3. Add a WpXxx interface here (mirror WpPost, plus a `fields?: {...}`
 *    matching whatever register_rest_field() above returns) and an Xxx
 *    interface in types/content.ts.
 * 4. Add a mapXxx() function plus a cached getXxx()/fetchXxx() pair,
 *    copying the shape of getPosts()/fetchPosts() above exactly —
 *    including the module-level cache variable, `?_embed` in the fetch
 *    path, and reusing getFeaturedImage/getTerms/getAuthorName.
 *
 * No ACF/JetEngine/other fields plugin needed for any of this — see
 * fields-xxx.php's own docblock for when reaching for one anyway is
 * still the right call (a couple dozen+ fields, deep repeaters, a
 * non-technical person building new field groups without a developer).
 */
