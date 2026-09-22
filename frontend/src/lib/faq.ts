// FAQ of the home (and its FAQPage schema). These are questions people really ask a search engine, an AI
// assistant or a specialist, not questions about the agency. Each answer opens with the direct answer (that
// is the part an AI or a snippet quotes), then adds the nuance. Keep them factual: no promised results, no
// invented numbers (the Core Web Vitals figures are Google's published thresholds).
export const faqs = [
  {
    question: "O que é SEO técnico?",
    answer:
      "SEO técnico é o conjunto de ajustes que permite ao Google e às IAs acessarem, entenderem e indexarem o seu site: rastreamento e indexação, velocidade, estrutura de URLs, dados estruturados, versão para celular e segurança (HTTPS). Ele cuida da base do site; já o SEO de conteúdo cuida do que cada página diz. Um depende do outro para render resultado.",
  },
  {
    question: "Meu site não aparece no Google. O que pode estar errado?",
    answer:
      "As causas mais comuns são: a página está bloqueada da indexação (tag noindex ou robots.txt), o site é novo e ainda não foi rastreado, o sitemap nunca foi enviado ao Google Search Console, o conteúdo é fraco ou duplicado, o site é lento ou tem erros técnicos, ou a concorrência tem mais autoridade para aquela busca. O primeiro passo é conferir no Search Console se a página está indexada.",
  },
  {
    question: "O que são noindex e robots.txt? Eles podem esconder o meu site do Google?",
    answer:
      "Podem, sim. São dois controles que dizem ao Google o que fazer com uma página: o robots.txt é um arquivo na raiz do site que orienta os robôs sobre o que podem rastrear, e a tag noindex, colocada dentro da página, pede que ela não apareça nos resultados. Servem para proteger o que não deve ser público, mas são fáceis de esquecer ligados. Em sites feitos em WordPress, por exemplo, é comum o bloqueio do período de desenvolvimento continuar ativo depois da publicação, e o site simplesmente some do Google sem ninguém perceber. Por isso conferir esses dois pontos é um dos primeiros passos de uma auditoria de SEO técnico.",
  },
  {
    question: "O que é GEO e como aparecer nas respostas do ChatGPT e de outras IAs?",
    answer:
      "GEO (Generative Engine Optimization) é preparar o site e a marca para serem entendidos e citados por IAs generativas, como ChatGPT, Perplexity e as respostas em IA do Google. A sigla não tem relação com geografia ou geolocalização. Na prática: conteúdo com respostas diretas e bem tituladas, dados estruturados, clareza sobre quem é a empresa e o que ela faz, e acesso liberado aos crawlers de IA. Não existe garantia de citação, porque cada modelo decide por conta própria.",
  },
  {
    question: "Quanto tempo leva para o SEO dar resultado?",
    answer:
      "Depende da concorrência, do estado atual do site e da consistência do trabalho. Correções técnicas costumam refletir em semanas; ganho de autoridade e posições competitivas normalmente levam meses. Desconfie de quem promete primeira página em poucos dias: SEO é um ativo que se acumula, não um resultado imediato.",
  },
  {
    question: "O que são Core Web Vitals?",
    answer:
      "São três métricas que o Google usa para medir a experiência real de quem visita o site. O LCP mede a velocidade de carregamento (ideal até 2,5 segundos). O INP mede a rapidez com que a página responde a cliques e toques (ideal até 200 milissegundos). O CLS mede se o layout fica estável ou \"pula\" enquanto carrega (ideal até 0,1). Você pode ver as do seu site no PageSpeed Insights e no Google Search Console.",
  },
  {
    question: "Site lento perde posição no Google?",
    answer:
      "Pode, mas o efeito é menor do que muita gente imagina: a velocidade e a experiência de página são sinais de ranking, porém a relevância do conteúdo pesa mais. O prejuízo maior de um site lento é outro: o visitante desiste antes de a página abrir, e você perde clientes mesmo aparecendo bem no Google. Por isso vale corrigir a velocidade independentemente do ranking.",
  },
  {
    question: "Dados estruturados (schema) ajudam mesmo no SEO e nas IAs?",
    answer:
      "Ajudam a reduzir ambiguidade. Schema.org é um vocabulário que descreve o conteúdo da página para máquinas (organização, artigo, produto, perguntas frequentes, trilha de navegação), e isso facilita a interpretação por buscadores e IAs. Em alguns casos também habilita resultados enriquecidos. Não é um atalho para subir no ranking, mas é parte de uma base técnica bem feita.",
  },
  {
    question: "Quanto custa um site profissional?",
    answer:
      "Não existe um preço único: o valor depende do escopo, como número de páginas, complexidade do design, integrações, produção de conteúdo, SEO técnico e manutenção. Um orçamento sério começa entendendo o objetivo do negócio e o público. Desconfie de valores muito baixos sem escopo definido e de sites prontos que não consideram SEO desde a estrutura.",
  },
  {
    question: "Vale a pena refazer o site ou dá para otimizar o atual?",
    answer:
      "Depende do diagnóstico. Otimizar vale quando a base técnica é boa e o problema é pontual, como velocidade, SEO ou conteúdo. Refazer compensa quando a estrutura está ultrapassada, o site não funciona bem no celular, a plataforma limita o SEO ou o custo de remendar passa o de reconstruir. Uma auditoria técnica mostra em qual caso você está.",
  },
];

// Questions about working with Nuvion itself. Not used on the home any more (they are not what people search
// for); kept here as copy for a page about the agency, where they make sense.
export const agencyFaqs = [
  {
    question: "Qual a diferença entre a Nuvion e outras agências que prometem resultados?",
    answer:
      "Está no processo. Seguimos um caminho validado e transparente que vai do diagnóstico até a otimização contínua. Não tratamos o site ou uma campanha como algo isolado: cada etapa do trabalho potencializa a próxima, sempre de olho no retorno real, não em métrica de vaidade.",
  },
  {
    question: "Vocês oferecem apenas criação de sites ou outros serviços?",
    answer:
      "Oferecemos uma solução completa: sites de alta performance, SEO técnico para posicionar sua marca no Google e GEO para garantir que ela também apareça como resposta nas buscas feitas por inteligência artificial generativa. Tudo dentro do mesmo processo, não como serviços separados.",
  },
  {
    question: "Quais os valores dos serviços da Nuvion?",
    answer:
      "A gente encara nosso serviço como investimento, não como custo. Temos planos diferentes para você escolher o que faz mais sentido para o momento do seu negócio, sempre pensando em um retorno que valha muito mais do que o valor investido.",
  },
];

/** FAQPage schema.org for a list of Q&As (pass it in the page's jsonLd). */
export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
