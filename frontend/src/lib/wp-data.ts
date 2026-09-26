/**
 * Loader for the editable content that lives in WordPress but is NOT blog posts: the custom post types (Clientes,
 * Depoimentos, Projetos + Segmentos) and the "Dados da Nuvion" options page (GET /wp-json/site/v1/options).
 *
 * Every lib that uses it (clients.ts, testimonials.ts, projects.ts, results.ts, contact.ts, about.ts) keeps its
 * previous hard-coded values as a FALLBACK: if WordPress is unreachable after a few retries, or a list comes back
 * empty, the site builds with those values instead of failing or showing an empty section. (Blog posts, in wp.ts,
 * keep failing the build on purpose — a blog with no posts would be a real regression.)
 *
 * Results are cached per process (build or dev server), so the several libs that need the same endpoint share one
 * request. Same caveat as getPosts(): after editing WordPress while `astro dev` is running, restart the dev server.
 */

const API_URL: string = import.meta.env.PUBLIC_WP_API_URL;
// PUBLIC_WP_API_URL ends in /wp-json/wp/v2; the options route is /wp-json/site/v1/options.
const SITE_API_URL = API_URL?.replace(/\/wp\/v2\/?$/, "/site/v1");

const cache = new Map<string, Promise<unknown>>();

async function getJson<T>(url: string): Promise<T | null> {
  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return (await response.json()) as T;
    } catch (error) {
      if (i === attempts) {
        console.warn(`[wp-data] ${url} unavailable (${(error as Error).message}); using the built-in fallback.`);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, 800 * i));
    }
  }
  return null;
}

function cached<T>(url: string): Promise<T | null> {
  if (!cache.has(url)) cache.set(url, getJson<T>(url));
  return cache.get(url) as Promise<T | null>;
}

/** A REST collection of a custom post type ("clientes", "projetos", ...). null = unreachable. */
export function wpCollection<T>(restBase: string, query = ""): Promise<T[] | null> {
  if (!API_URL) return Promise.resolve(null);
  return cached<T[]>(`${API_URL}/${restBase}?per_page=100${query}`);
}

/** The "Dados da Nuvion" options, already nested by the mu-plugin. null = unreachable. */
export function wpOptions(): Promise<WpOptions | null> {
  if (!SITE_API_URL) return Promise.resolve(null);
  return cached<WpOptions>(`${SITE_API_URL}/options`);
}

/** A string field: the WordPress value unless it is empty, then the fallback. */
export const text = (value: string | null | undefined, fallback: string): string =>
  typeof value === "string" && value.trim() !== "" ? value : fallback;

export interface WpImage {
  url: string;
  width: number;
  height: number;
  alt: string;
  srcset?: string;
}

export interface WpOptions {
  company: Record<"brand" | "shortName" | "legalName" | "cnpj" | "foundingYear" | "city" | "region" | "metro" | "hours" | "mapsUrl", string> & { logoUrl: string | null };
  contact: Record<"whatsapp" | "whatsappDisplay" | "phoneIntl" | "email" | "location" | "instagram" | "facebook" | "linkedin", string>;
  founder: Record<"name" | "shortName" | "role" | "linkedin" | "education" | "bio" | "quote", string> & { photo: string | null };
  results: {
    source: string;
    items: { label: string; count: number; decimals: number; prefix: string; suffix: string; viz: "line" | "bars" | "dots" | "rings" }[];
  };
  about: {
    years: number;
    projects: number;
    leadsK: number;
    place: string;
    placeSub: string;
    mission: { title: string; text: string };
    vision: { title: string; text: string };
    values: { title: string; text: string }[];
  };
}

/** WordPress escapes some characters in rendered titles (&amp;, &#8211;, ...). */
export function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}
