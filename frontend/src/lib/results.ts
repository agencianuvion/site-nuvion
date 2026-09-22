// Aggregate results across the clients' projects, shown on the portfolio page. EVERY VALUE HERE IS A TEST PLACEHOLDER until the
// real totals (with period and source) are entered; they must not go live as they are. The same real numbers must be used
// everywhere on the site (e.g. the "1M+ leads" of the About page). Shaped for a WordPress options panel.
export interface Result {
  /** Number the counter counts up to (already in the unit of the suffix: 1.2 + "M" = 1.2 million). */
  count: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  /** Small drawing that plays with the number. */
  viz: "line" | "bars" | "dots" | "rings";
}
export const resultsSource = "Somatório dos projetos, 2015 a 2026 (números de teste). Fonte: painéis dos clientes (Google Analytics, Search Console e CRM).";
export const results: Result[] = [
  { count: 1.2, decimals: 1, prefix: "+", suffix: "M", label: "Leads gerados", viz: "line" },
  { count: 8.4, decimals: 1, suffix: "M", label: "Visualizações de página", viz: "bars" },
  { count: 32, suffix: "M", label: "Impressões no Google", viz: "dots" },
  { count: 4.8, decimals: 1, suffix: "%", label: "CTR médio nas buscas orgânicas", viz: "rings" },
];
