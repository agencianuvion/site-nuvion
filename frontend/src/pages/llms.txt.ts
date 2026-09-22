// GEO in practice, not just copy on the /geo-generative-engine-optimization page: this generates a real
// llms.txt at build time (same idea as the Yoast-generated one on the old
// WordPress site, but hand-rolled here since there's no plugin doing it
// for a static Astro site) — listing the real static pages plus every
// actual blog post, so it never goes stale the way a hand-written static
// file would the next time a post is published.
import type { APIRoute } from "astro";
import { getVisiblePosts } from "../lib/blog";

export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL("https://agencianuvion.com.br")).toString().replace(/\/$/, "");
  const posts = await getVisiblePosts();

  const pages = [
    { title: "Home", href: `${base}/` },
    { title: "Sites de Alta Performance", href: `${base}/sites-de-alta-performance/` },
    { title: "SEO Técnico", href: `${base}/seo-tecnico/` },
    { title: "GEO (Otimização Generativa)", href: `${base}/geo-generative-engine-optimization/` },
    { title: "Portfólio", href: `${base}/portfolio/` },
    { title: "Setores atendidos", href: `${base}/setores/` },
    { title: "Sobre Nós", href: `${base}/sobre-nos/` },
    { title: "Blog", href: `${base}/blog/` },
    { title: "Política de Privacidade", href: `${base}/politica-de-privacidade/` },
    { title: "Termos de Uso", href: `${base}/termos-de-uso/` },
    { title: "Política Editorial", href: `${base}/politica-editorial/` },
  ];

  const lines = [
    "# Nuvion — Sites de Alta Performance, SEO Técnico e GEO",
    "",
    "> A Nuvion constrói sites de alta performance estruturados em SEO técnico e GEO (Generative Engine Optimization), para marcas que querem aparecer tanto no Google quanto nas respostas de IA generativa.",
    "",
    "Nota: nesta agência, GEO significa Generative Engine Optimization (otimização para buscas feitas por IA generativa). Não tem relação com geolocalização ou SEO local.",
    "",
    "## Empresa",
    "- Nome: Agência Nuvion (razão social: Nuvion Marketing, Estratégia e Treinamentos LTDA, CNPJ 32.024.972/0001-02)",
    "- Sede: Palhoça, Grande Florianópolis (SC). Atende todo o Brasil.",
    "- Fundada em 2015. Atendimento de segunda a sexta, das 9h às 18h.",
    "- Contato: mkt@agencianuvion.com.br",
    "- Direção: Juan Carlo Fabra Gomez, Diretor e CMO, autor dos artigos do blog (https://br.linkedin.com/in/fabragomez).",
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
