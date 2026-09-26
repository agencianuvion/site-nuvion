import { wpCollection, decodeEntities } from "./wp-data";

// Testimonials are edited in WordPress (Depoimentos: title = the person's name, "Ordem" = position in the slider; text, role,
// optional video link and optional photo in the meta box). The PLACEHOLDER list below (no real client said any of it) is the
// FALLBACK used only when WordPress is unreachable or has none yet.
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  /** True when the card is a video testimonial (a video link was set). */
  video: boolean;
  videoUrl?: string;
  photo?: string;
}

const localTestimonials: Testimonial[] = [
  {
    quote: "Aqui entra o depoimento real de um cliente da Nuvion. Este texto serve só para avaliar o tamanho da fonte, a quebra de linhas e o ritmo da animação.",
    name: "Nome do cliente",
    role: "Empresa · Cargo",
    video: false,
  },
  {
    quote:
      "Depoimento longo de teste, para ver como o cartão se comporta quando o cliente escreve bastante. Quando chegamos à Nuvion, o nosso site era bonito, mas quase ninguém o encontrava e ele não trazia contatos. O trabalho começou por um diagnóstico honesto, sem promessas fáceis, e seguiu para a reestruturação do site, dos textos e da parte técnica. Em poucos meses passamos a ser encontrados nas buscas por serviços que antes nem apareciam, e as conversas que chegam pelo WhatsApp são de gente que já entende o que fazemos. O mais importante para nós foi a transparência: todo mês sabíamos exatamente o que tinha sido feito, por que, e o que vinha a seguir. Recomendo para quem quer tratar o site como um ativo do negócio, e não como um cartão de visitas. Este texto é só um exemplo e será trocado pelo depoimento real.",
    name: "Nome do cliente",
    role: "Empresa · Cargo",
    video: false,
  },
  {
    quote: "Este cartão simula um depoimento em vídeo: à esquerda entra o vídeo do cliente e à direita, a frase de destaque.",
    name: "Nome do cliente",
    role: "Empresa · Cargo",
    video: true,
  },
  {
    quote: "Último depoimento de teste. Quando os reais chegarem, basta trocar o texto, o nome e o cargo, ou colocar o vídeo.",
    name: "Nome do cliente",
    role: "Empresa · Cargo",
    video: false,
  },
];

interface WpDepoimento {
  title: { rendered: string };
  fields?: { quote: string; role: string; video_url: string; photo: string };
}

async function loadTestimonials(): Promise<Testimonial[]> {
  const items = await wpCollection<WpDepoimento>("depoimentos", "&orderby=menu_order&order=asc");
  const fromWp = (items ?? [])
    .filter((d) => d.fields?.quote?.trim())
    .map((d) => ({
      quote: d.fields!.quote,
      name: decodeEntities(d.title.rendered),
      role: d.fields!.role,
      video: !!d.fields!.video_url,
      videoUrl: d.fields!.video_url || undefined,
      photo: d.fields!.photo || undefined,
    }));
  return fromWp.length ? fromWp : localTestimonials;
}

export const testimonials: Testimonial[] = await loadTestimonials();
