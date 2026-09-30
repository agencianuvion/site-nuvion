import { cutText } from "./blog";
import { wpCollection, decodeEntities, type WpImage } from "./wp-data";

// Portfolio data. It comes from the WordPress custom post type "Projetos" (see loadProjects below); the local list is only the FALLBACK
// used when WordPress is unreachable or has none yet. The fields, plain:
//   - name: company name; url: the live site (the address shown is derived from it); segment: a term of the "Segmentos" taxonomy
//     (the list below stands in for it; new terms are added in WordPress);
//   - featured: the switch in the CPT. The page highlights the MOST RECENT featured project (by date);
//   - descriptionHtml: the rich-text field. When it is empty NOTHING is shown for the description (no placeholder text);
//   - photos: public/images/projects/<slug>-640|1000|1800.webp; alt: text for the photo.
// The order is the "Ordem" field in WordPress (menu_order): it is the order of the home slider and the strips; the portfolio page sorts by date.
// url values are TEST addresses until the real ones are entered. Spoudaios' segment is an assumption, to be confirmed.
export interface Segment {
  slug: string;
  label: string;
}
const localSegments: Segment[] = [
  { slug: "imobiliario", label: "Imobiliário" },
  { slug: "construcao", label: "Construção" },
  { slug: "saude", label: "Saúde" },
  { slug: "industria", label: "Indústria e comunicação visual" },
  { slug: "servicos", label: "Serviços profissionais" },
];
/** One of the project's own numbers (the counters under its text on the portfolio). Same shape as lib/results.ts. */
export interface ProjectResult {
  count: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
}
export interface Project {
  slug: string;
  name: string;
  /** One line under the name on the portfolio. Empty or missing = nothing is rendered. */
  subtitle?: string;
  /** The "Resultados do projeto" repeater. Empty = no counters strip. */
  results?: ProjectResult[];
  /** Optional featured video (media library MP4): plays muted in a loop instead of the photo, on the portfolio only. */
  video?: { url: string; type: string };
  url?: string;
  segment: string;
  featured?: boolean;
  /** Publish date (ISO), used to pick the most recent featured project. */
  date: string;
  /** Rich text from the WordPress editor (trusted HTML). Empty or missing = nothing is rendered. */
  descriptionHtml?: string;
  alt: string;
  /** The photo as uploaded to WordPress (url = original, srcset = every size WordPress made). Missing in the local fallback, whose files are public/images/projects/<slug>-640|1000|1800.webp. */
  image?: { url: string; srcset: string; width: number; height: number };
}
// TEST descriptions, so the layout can be judged with text in place. They are NOT real: replace them in WordPress before publishing.
const TEST_SHORT = "<p><strong>(Texto de teste.)</strong> Aqui entra a descrição do projeto: quem é o cliente, o desafio que ele tinha e o que a Nuvion construiu para resolver. O texto é escrito no editor do WordPress e aceita <strong>números</strong>, listas e links.</p><p>Resultados de exemplo: <strong>+120%</strong> em visitas orgânicas e <strong>3x</strong> mais contatos em 6 meses (números de teste).</p>";
const TEST_LONG = TEST_SHORT + "<p>Este é um exemplo de descrição mais longa, para testar a rolagem dentro do painel. O projeto começou por um diagnóstico técnico do site anterior, seguido de uma nova arquitetura de páginas, de textos escritos para responder às perguntas reais dos clientes e de uma estrutura de dados pensada para o Google e para as respostas das IAs.</p><p>Depois do lançamento, o acompanhamento mensal mostrou o que funcionava e o que precisava de ajuste, e cada decisão ficou registrada e explicada ao cliente.</p><ul><li>Site novo, rápido e responsivo</li><li>SEO técnico e dados estruturados</li><li>Conteúdo preparado para GEO</li></ul>";
// TEST numbers (and subtitle), so the counters strip can be judged in place: 1, 3 and 4 items. NOT real.
const TEST_RESULTS: ProjectResult[] = [
  { count: 120, prefix: "+", suffix: "%", label: "em visitas orgânicas (teste)" },
  { count: 3, suffix: "x", label: "mais contatos pelo site (teste)" },
  { count: 4.8, decimals: 1, suffix: "%", label: "de CTR nas buscas (teste)" },
  { count: 38, prefix: "+", label: "palavras-chave na 1ª página (teste)" },
];
const localProjects: Project[] = [
  { slug: "patio-alameda", name: "Pátio Alameda", url: "https://www.exemplo.com.br", segment: "imobiliario", date: "2026-03-12", descriptionHtml: TEST_SHORT, results: TEST_RESULTS.slice(0, 1), alt: "Site do Pátio Alameda exibido em notebook e celular" },
  { slug: "wegg", name: "Wegg", subtitle: "Construtora e incorporadora (subtítulo de teste)", url: "https://www.exemplo.com.br", segment: "construcao", featured: true, date: "2026-08-10", descriptionHtml: TEST_LONG, results: TEST_RESULTS, alt: "Site da construtora Wegg exibido em monitor e celular" },
  { slug: "spoudaios", name: "Spoudaios", url: "https://www.exemplo.com.br", segment: "servicos", date: "2026-04-20", descriptionHtml: TEST_SHORT, alt: "Site do Spoudaios exibido em notebook e celular" },
  { slug: "androclinic", name: "AndroClinic", subtitle: "Clínica de saúde masculina (subtítulo de teste)", url: "https://www.exemplo.com.br", segment: "saude", featured: true, date: "2026-06-02", descriptionHtml: TEST_SHORT, results: TEST_RESULTS.slice(0, 3), alt: "Site da AndroClinic exibido em monitor e celular" },
  { slug: "placas-em-12-horas", name: "Placas em 12 Horas", url: "https://www.exemplo.com.br", segment: "industria", date: "2026-02-05", descriptionHtml: TEST_SHORT, alt: "Site da Placas em 12 Horas exibido em monitor e celular" },
  { slug: "onliving", name: "OnLiving", url: "https://www.exemplo.com.br", segment: "imobiliario", date: "2026-07-01", descriptionHtml: TEST_SHORT, alt: "Site da OnLiving exibido em monitor e celular" },
];


interface WpProjeto {
  slug: string;
  date: string;
  title: { rendered: string };
  fields?: {
    subtitle?: string;
    video?: { url: string; type: string } | null;
    url: string;
    description: string;
    results?: { count: number; decimals: number; prefix: string; suffix: string; label: string }[];
    featured: boolean;
    segment: { slug: string; name: string } | null;
    image: (WpImage & { srcset: string }) | null;
  };
}
interface WpSegmento {
  slug: string;
  name: string;
}

async function loadProjects(): Promise<{ projects: Project[]; segments: Segment[] }> {
  const items = await wpCollection<WpProjeto>("projetos", "&orderby=menu_order&order=asc");
  const fromWp: Project[] = (items ?? [])
    .filter((p) => p.fields?.image?.url)
    .map((p) => {
      const f = p.fields!;
      const name = decodeEntities(p.title.rendered);
      return {
        slug: p.slug,
        name,
        subtitle: f.subtitle?.trim() ? decodeEntities(f.subtitle.trim()) : undefined,
        results: (f.results ?? [])
          .filter((r) => r.label?.trim())
          .map((r) => ({ count: r.count, decimals: r.decimals || undefined, prefix: r.prefix || undefined, suffix: r.suffix || undefined, label: decodeEntities(r.label) })),
        video: f.video?.url ? { url: f.video.url, type: f.video.type || "video/mp4" } : undefined,
        url: f.url || undefined,
        segment: f.segment?.slug ?? "",
        featured: f.featured,
        date: p.date,
        descriptionHtml: f.description,
        alt: f.image!.alt || `Site da ${name}`,
        image: { url: f.image!.url, srcset: f.image!.srcset, width: f.image!.width, height: f.image!.height },
      };
    });
  if (!fromWp.length) return { projects: localProjects, segments: localSegments };

  // Segments in the order they were created in WordPress (the chips of the portfolio follow it).
  const terms = await wpCollection<WpSegmento>("segmento", "&orderby=id&order=asc");
  const fromTerms = (terms ?? []).map((t) => ({ slug: t.slug, label: decodeEntities(t.name) }));
  return { projects: fromWp, segments: fromTerms.length ? fromTerms : localSegments };
}

const loaded = await loadProjects();
export const projects: Project[] = loaded.projects;
export const segments: Segment[] = loaded.segments;

/** Picture URL of a project at (about) the given width. WordPress projects use the size WordPress made that fits; the local fallback has fixed files. */
export function projectImg(p: Project, width: 640 | 1000 | 1800): string {
  if (!p.image) return `/images/projects/${p.slug}-${width}.webp`;
  if (width === 1800) return p.image.url;
  const sizes = p.image.srcset
    .split(",")
    .map((s) => s.trim().split(/\s+/))
    .map(([url, w]) => ({ url, w: parseInt(w, 10) }))
    .filter((s) => s.url && s.w)
    .sort((a, b) => a.w - b.w);
  return (sizes.find((s) => s.w >= width) ?? sizes[sizes.length - 1])?.url ?? p.image.url;
}
/** The srcset attribute for a project's picture (640/1000/1800 in the fallback; every size WordPress made otherwise). */
export function projectSrcset(p: Project, widths: (640 | 1000 | 1800)[] = [640, 1000, 1800]): string {
  if (p.image?.srcset) return p.image.srcset;
  return widths.map((w) => `${projectImg(p, w)} ${w}w`).join(", ");
}

export const segmentLabel = (slug: string) => segments.find((s) => s.slug === slug)?.label ?? slug;
/** "https://www.exemplo.com.br/x" -> "exemplo.com.br" */
export const siteHost = (url?: string) => (url ? new URL(url).hostname.replace(/^www\./, "") : "");
/** The most recent project that has the "featured" switch on (undefined when none has). */
export const featuredProject = () => [...projects].filter((p) => p.featured).sort((a, b) => b.date.localeCompare(a.date))[0];
export const hasText = (html?: string) => !!html && html.replace(/<[^>]*>/g, "").trim().length > 0;

const decodeEntitiesProj = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
/** Short plain-text teaser for the home slider, made from the FULL rich-text description (not just its first paragraph) —
 * the whole thing, with its numbers and lists, is only shown on the portfolio page. Cut at a budget tuned to land at about 5
 * lines in ".t3-pdesc" (whose CSS line-clamp is still the safety net for whatever this estimate gets slightly wrong). */
export function introFromHtml(html?: string): string {
  if (!html) return "";
  return cutText(decodeEntitiesProj(html), 300);
}
