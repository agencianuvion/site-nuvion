/** The four stages of how Nuvion works. Used by the home and by the About page (StepsStack). */
export const steps = [
  {
    n: "01",
    title: "Diagnóstico",
    text: "Começamos entendendo a situação real do seu site e da sua presença nas buscas: o que já funciona, onde estão os gargalos técnicos e o que a concorrência já descobriu antes de você.",
    chips: ["Auditoria técnica", "Presença nas buscas", "Análise da concorrência"],
    icon: `<circle cx="10.5" cy="10.5" r="6.5"></circle><line x1="15.2" y1="15.2" x2="21" y2="21"></line>`,
  },
  {
    n: "02",
    title: "Arquitetura & Estratégia",
    text: "Desenhamos um plano técnico claro, da estrutura do site ao calendário de SEO técnico e GEO, priorizado pelo que move o resultado mais rápido.",
    chips: ["Estrutura do site", "Calendário de SEO e GEO", "Priorização"],
    icon: `<circle cx="12" cy="12" r="9.5"></circle><polygon points="15.5 8.5 13 13 8.5 15.5 11 11 15.5 8.5"></polygon>`,
  },
  {
    n: "03",
    title: "Execução",
    text: "Colocamos tudo em prática com precisão: código, conteúdo estruturado e otimizações técnicas, sem atalhos que comprometam a performance.",
    chips: ["Código", "Conteúdo estruturado", "Otimizações técnicas"],
    icon: `<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>`,
  },
  {
    n: "04",
    title: "Otimização Contínua",
    text: "Acompanhamos Core Web Vitals, rankings e o comportamento real dos usuários, e ajustamos o curso com dados, não com achismo.",
    chips: ["Core Web Vitals", "Rankings", "Comportamento real"],
    icon: `<polyline points="3 16 9.5 9.5 13.5 13.5 21 6"></polyline><polyline points="14.5 6 21 6 21 12.5"></polyline>`,
  },
];
