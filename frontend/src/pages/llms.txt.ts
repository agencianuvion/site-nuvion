// GEO in practice, not just copy on the /geo page: this generates a real
// llms.txt at build time (same idea as the Yoast-generated one on the old
// WordPress site, but hand-rolled here since there's no plugin doing it
// for a static Astro site) — listing the real static pages plus every
// actual blog post, so it never goes stale the way a hand-written static
// file would the next time a post is published.
import type { APIRoute } from "astro";
import { getPosts } from "../lib/wp";

export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL("https://agencianuvion.com.br")).toString().replace(/\/$/, "");
  const posts = await getPosts();

  const pages = [
    { title: "Home", href: `${base}/` },
    { title: "Sites de Alta Performance", href: `${base}/sites-de-alta-performance/` },
    { title: "SEO Técnico", href: `${base}/seo-tecnico/` },
    { title: "GEO (Otimização Generativa)", href: `${base}/geo/` },
    { title: "Sobre Nós", href: `${base}/sobre-nos/` },
    { title: "Blog", href: `${base}/blog/` },
  ];

  const lines = [
    "# Nuvion — Sites de Alta Performance, SEO Técnico e GEO",
    "",
    "> A Nuvion constrói sites de alta performance estruturados em SEO técnico e GEO (Generative Engine Optimization), para marcas que querem aparecer tanto no Google quanto nas respostas de IA generativa.",
    "",
    "## Páginas",
    ...pages.map((page) => `- [${page.title}](${page.href})`),
    "",
    "## Posts",
    ...posts.map((post) => `- [${post.title}](${base}/blog/${post.slug}/)`),
    "",
    "## Optional",
    `- [Sitemap index](${base}/sitemap-index.xml)`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
