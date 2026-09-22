// Same idea as llms.txt.ts: generated at build time instead of a static file, because this ONE file needs to say two very
// different things depending on which deploy it ships with — see BaseLayout's own noindex default for the other half of
// this (the per-page <meta name="robots">, which a robots.txt Disallow alone doesn't fully replace: a page already linked
// from elsewhere can still get indexed from that link with no snippet, even while Disallow'd — the meta tag is what
// actually stops that).
import type { APIRoute } from "astro";

const isPreview = import.meta.env.PUBLIC_NOINDEX === "true";

export const GET: APIRoute = ({ site }) => {
  if (isPreview) {
    // A staging/preview deploy (see .github/workflows/deploy.yml) — closed to every crawler, no exceptions, no sitemap
    // line (nothing here is meant to ever show up in a search result or an AI answer).
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const base = (site ?? new URL("https://agencianuvion.com.br")).toString().replace(/\/$/, "");
  const lines = [
    "# Allows every crawler, including AI search engines (GEO: being found and",
    "# cited by ChatGPT, Perplexity, Google AI Overviews, etc.) — listed",
    "# explicitly because some crawlers default to being blocked elsewhere,",
    "# and the intent here is the opposite.",
    "User-agent: *",
    "Allow: /",
    "",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: Claude-User",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    `Sitemap: ${base}/sitemap-index.xml`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
