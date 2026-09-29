import { wpOptions, text } from "./wp-data";

// Texts and numbers of the Sobre Nós page. Edited in WordPress ("Dados da Nuvion" → Sobre Nós); the literals are the FALLBACK.
// The founder quote is a FIRST DRAFT to be replaced by Juan himself before publishing (E-E-A-T content has to be genuinely his
// voice); the three numbers were given by the client.
const options = await wpOptions();
const wp = options?.about;
const wpValues = wp?.values ?? [];

const localValues = [
  { title: "Foco no resultado", text: "O seu retorno é a métrica que importa. Não trabalhamos por vaidade, trabalhamos por ROI." },
  { title: "Transparência estratégica", text: "Dados claros, sem enrolação, para você tomar decisão com segurança." },
  { title: "Expertise humana e tecnologia", text: "Tecnologia sozinha não resolve. É a combinação com julgamento humano que faz a diferença." },
];

const num = (value: number | undefined, fallback: number) => (typeof value === "number" && value > 0 ? value : fallback);

const leadsK = num(wp?.leadsK, 1000);

export const about = {
  years: num(wp?.years, 11),
  projects: num(wp?.projects, 150),
  /** Leads in thousands (1000 = "1M+"), as the counter in the hero counts it. */
  leadsK,
  /** The final text of the leads counter: 1000 -> "1M+", 1500 -> "1,5M+", 800 -> "800k+". */
  leadsText: leadsK >= 1000 ? `${(leadsK / 1000).toFixed(leadsK % 1000 ? 1 : 0).replace(".", ",")}M+` : `${Math.round(leadsK)}k+`,
  place: text(wp?.place, "Atendemos todo o Brasil"),
  placeSub: text(wp?.placeSub, "Empresas de qualquer estado"),
  mission: {
    title: text(wp?.mission?.title, "Simplificar o crescimento digital"),
    text: text(
      wp?.mission?.text,
      "Simplificar o crescimento digital das empresas que atendemos, construindo sites que funcionam como ativos de aquisição, não só cartões de visita."
    ),
  },
  vision: {
    title: text(wp?.vision?.title, "A referência em SEO técnico e GEO"),
    text: text(
      wp?.vision?.text,
      "Ser a principal referência em arquitetura digital para SEO técnico e GEO, reconhecida por transformar a presença online dos nossos clientes em um ativo previsível."
    ),
  },
  values: localValues.map((v, i) => ({ title: text(wpValues[i]?.title, v.title), text: text(wpValues[i]?.text, v.text) })),
  founderQuote: text(
    options?.founder?.quote,
    "Todo santo dia eu via o mesmo problema se repetindo. O dono do negócio orgulhoso do site novo, bonito, exatamente do jeito que sonhou, só que na prática quase ninguém achava aquele site no Google. Por fora tinha cara de profissional, mas por dentro faltava a base técnica pra realmente aparecer numa busca. Depois a internet mudou de novo. Hoje não basta aparecer no Google, é preciso aparecer também quando a inteligência artificial responde alguém que pergunta por um produto ou serviço como o seu, e quem não acompanhou essa mudança ficou ainda mais pra trás. Foi por isso que resolvi focar a Nuvion em juntar arquitetura de site, SEO técnico e GEO numa coisa só. E o site continua bonito, viu? A gente simplesmente não abre mão disso."
  ),
};
