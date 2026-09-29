import { wpCollection } from "./wp-data";

// The legal pages (Política de Privacidade, Termos de Uso, Política Editorial) are edited as regular WordPress
// PAGES — the native "page" post type, not a custom one — since their content is long-form rich text (headings,
// lists) that a plain textarea/options field would handle badly; the block editor Juan already uses for the blog is
// the right tool for this. The HTML written directly in each .astro file is the FALLBACK, used until that page
// exists in WordPress (by this exact slug) or if WordPress is unreachable, so nothing breaks in the meantime.
interface WpPage {
  content: { rendered: string };
  modified: string; // site-local time, e.g. "2026-09-29T14:32:10"
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** null when the WordPress Page doesn't exist yet (by that slug) or WordPress is unreachable — caller keeps its own fallback HTML/date. */
export async function getLegalPage(slug: string): Promise<{ html: string; updated: string } | null> {
  const items = await wpCollection<WpPage>("pages", `&slug=${slug}`);
  const page = items?.[0];
  if (!page?.content?.rendered?.trim()) return null;
  return { html: page.content.rendered, updated: formatDate(page.modified) };
}
