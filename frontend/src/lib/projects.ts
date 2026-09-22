import { cutText } from "./blog";

// Portfolio data. It is shaped like the WordPress custom post type ("Projetos") that will replace it, so keep it plain:
//   - name: company name; url: the live site (the address shown is derived from it); segment: a term of the "Segmentos" taxonomy
//     (the list below stands in for it; new terms are added in WordPress);
//   - featured: the switch in the CPT. The page highlights the MOST RECENT featured project (by date);
//   - descriptionHtml: the rich-text field. When it is empty NOTHING is shown for the description (no placeholder text);
//   - photos: public/images/projects/<slug>-640|1000|1800.webp; alt: text for the photo.
// The order of the array is the order used by the home slider and the strips; the portfolio page sorts by date.
// url values are TEST addresses until the real ones are entered. Spoudaios' segment is an assumption, to be confirmed.
export interface Segment {
  slug: string;
  label: string;
}
export const segments: Segment[] = [
  { slug: "imobiliario", label: "Imobiliário" },
  { slug: "construcao", label: "Construção" },
  { slug: "saude", label: "Saúde" },
  { slug: "industria", label: "Indústria e comunicação visual" },
  { slug: "servicos", label: "Serviços profissionais" },
];
export interface Project {
  slug: string;
  name: string;
  url?: string;
  segment: string;
  featured?: boolean;
  /** Publish date (ISO), used to pick the most recent featured project. */
  date: string;
  /** Rich text from the WordPress editor (trusted HTML). Empty or missing = nothing is rendered. */
  descriptionHtml?: string;
  alt: string;
}
// TEST descriptions, so the layout can be judged with text in place. They are NOT real: replace them in WordPress before publishing.
const TEST_SHORT = "<p><strong>(Texto de teste.)</strong> Aqui entra a descrição do projeto: quem é o cliente, o desafio que ele tinha e o que a Nuvion construiu para resolver. O texto é escrito no editor do WordPress e aceita <strong>números</strong>, listas e links.</p><p>Resultados de exemplo: <strong>+120%</strong> em visitas orgânicas e <strong>3x</strong> mais contatos em 6 meses (números de teste).</p>";
const TEST_LONG = TEST_SHORT + "<p>Este é um exemplo de descrição mais longa, para testar a rolagem dentro do painel. O projeto começou por um diagnóstico técnico do site anterior, seguido de uma nova arquitetura de páginas, de textos escritos para responder às perguntas reais dos clientes e de uma estrutura de dados pensada para o Google e para as respostas das IAs.</p><p>Depois do lançamento, o acompanhamento mensal mostrou o que funcionava e o que precisava de ajuste, e cada decisão ficou registrada e explicada ao cliente.</p><ul><li>Site novo, rápido e responsivo</li><li>SEO técnico e dados estruturados</li><li>Conteúdo preparado para GEO</li></ul>";
export const projects: Project[] = [
  { slug: "patio-alameda", name: "Pátio Alameda", url: "https://www.exemplo.com.br", segment: "imobiliario", date: "2026-03-12", descriptionHtml: TEST_SHORT, alt: "Site do Pátio Alameda exibido em notebook e celular" },
  { slug: "wegg", name: "Wegg", url: "https://www.exemplo.com.br", segment: "construcao", featured: true, date: "2026-08-10", descriptionHtml: TEST_LONG, alt: "Site da construtora Wegg exibido em monitor e celular" },
  { slug: "spoudaios", name: "Spoudaios", url: "https://www.exemplo.com.br", segment: "servicos", date: "2026-04-20", descriptionHtml: TEST_SHORT, alt: "Site do Spoudaios exibido em notebook e celular" },
  { slug: "androclinic", name: "AndroClinic", url: "https://www.exemplo.com.br", segment: "saude", featured: true, date: "2026-06-02", descriptionHtml: TEST_SHORT, alt: "Site da AndroClinic exibido em monitor e celular" },
  { slug: "placas-em-12-horas", name: "Placas em 12 Horas", url: "https://www.exemplo.com.br", segment: "industria", date: "2026-02-05", descriptionHtml: TEST_SHORT, alt: "Site da Placas em 12 Horas exibido em monitor e celular" },
  { slug: "onliving", name: "OnLiving", url: "https://www.exemplo.com.br", segment: "imobiliario", date: "2026-07-01", descriptionHtml: TEST_SHORT, alt: "Site da OnLiving exibido em monitor e celular" },
];

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
