import { CONTACT, COMPANY, FOUNDER } from "./contact";

const withSlash = (u: string) => (u.endsWith("/") ? u : u + "/");
export const orgId = (siteUrl: string) => withSlash(siteUrl) + "#organization";
export const founderId = (siteUrl: string) => withSlash(siteUrl) + "sobre-nos/#juan-fabra";

/** Organization + ProfessionalService with the real company data (linked to the founder by @id). */
export function organizationSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "ProfessionalService"],
    "@id": orgId(siteUrl),
    name: COMPANY.brand,
    alternateName: COMPANY.shortName,
    legalName: COMPANY.legalName,
    taxID: COMPANY.cnpj,
    url: withSlash(siteUrl),
    logo: { "@type": "ImageObject", url: COMPANY.logoUrl, width: 1200, height: 1200 },
    image: COMPANY.logoUrl,
    foundingDate: COMPANY.foundingYear,
    description:
      "Agência de sites de alta performance, SEO técnico e GEO (Generative Engine Optimization, a otimização para buscas com IA generativa), com sede em Palhoça, na Grande Florianópolis (SC).",
    address: { "@type": "PostalAddress", addressLocality: COMPANY.city, addressRegion: COMPANY.region, addressCountry: "BR" },
    areaServed: { "@type": "Country", name: "Brasil" },
    telephone: COMPANY.phoneIntl,
    email: COMPANY.email,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: COMPANY.phoneIntl,
        email: COMPANY.email,
        availableLanguage: ["pt-BR"],
        areaServed: "BR",
      },
    ],
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:00" },
    ],
    sameAs: [CONTACT.instagram, CONTACT.facebook, CONTACT.linkedin, COMPANY.mapsUrl],
    hasMap: COMPANY.mapsUrl,
    publishingPrinciples: withSlash(siteUrl) + "politica-editorial/",
    founder: { "@id": founderId(siteUrl) },
    knowsAbout: [
      "SEO técnico",
      "Generative Engine Optimization (GEO)",
      "Core Web Vitals",
      "Dados estruturados (schema.org)",
      "Desenvolvimento de sites de alta performance",
      "UI/UX design",
    ],
  };
}

/** Person node of the founder / author (full version: used on the About page and on articles). */
export function founderSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": founderId(siteUrl),
    name: FOUNDER.name,
    alternateName: FOUNDER.shortName,
    jobTitle: FOUNDER.role.replace(" da Agência Nuvion", ""),
    description: FOUNDER.bio,
    image: new URL(FOUNDER.photo, withSlash(siteUrl)).href,
    url: withSlash(siteUrl) + "sobre-nos/",
    sameAs: [FOUNDER.linkedin],
    worksFor: { "@id": orgId(siteUrl) },
    knowsAbout: ["SEO", "Generative Engine Optimization (GEO)", "UI/UX design", "Desenvolvimento web full-stack", "Inteligência artificial"],
    knowsLanguage: "pt-BR",
  };
}

/** schema.org Service for a service page (the company is the provider). */
export function serviceSchema(opts: { name: string; description: string; url: string; serviceType: string; siteUrl: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": opts.url + "#service",
    name: opts.name,
    serviceType: opts.serviceType,
    description: opts.description,
    url: opts.url,
    provider: { "@id": orgId(opts.siteUrl) },
    areaServed: { "@type": "Country", name: "Brasil" },
    inLanguage: "pt-BR",
  };
}

/** WebPage node of a page written/reviewed by the founder (E-E-A-T): links page, author, reviewer and publisher by @id. */
export function webPageSchema(opts: { name: string; description: string; url: string; siteUrl: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": opts.url + "#webpage",
    url: opts.url,
    name: opts.name,
    description: opts.description,
    inLanguage: "pt-BR",
    isPartOf: { "@id": withSlash(opts.siteUrl) + "#website" },
    author: { "@id": founderId(opts.siteUrl) },
    reviewedBy: { "@id": founderId(opts.siteUrl) },
    publisher: { "@id": orgId(opts.siteUrl) },
    mainEntity: { "@id": opts.url + "#service" },
  };
}

/** AboutPage node: the page is about the organization, written and reviewed by the founder. */
export function aboutPageSchema(opts: { name: string; description: string; url: string; siteUrl: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": opts.url + "#webpage",
    url: opts.url,
    name: opts.name,
    description: opts.description,
    inLanguage: "pt-BR",
    isPartOf: { "@id": withSlash(opts.siteUrl) + "#website" },
    about: { "@id": orgId(opts.siteUrl) },
    mainEntity: { "@id": orgId(opts.siteUrl) },
    author: { "@id": founderId(opts.siteUrl) },
    reviewedBy: { "@id": founderId(opts.siteUrl) },
  };
}

/** Portfolio page: a CollectionPage whose main entity is the list of projects (each a CreativeWork made by the organization). */
export function portfolioSchema(opts: { name: string; description: string; url: string; siteUrl: string; items: { name: string; url?: string; image: string; about: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": opts.url + "#webpage",
    url: opts.url,
    name: opts.name,
    description: opts.description,
    inLanguage: "pt-BR",
    isPartOf: { "@id": withSlash(opts.siteUrl) + "#website" },
    publisher: { "@id": orgId(opts.siteUrl) },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.items.length,
      itemListElement: opts.items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "CreativeWork",
          name: it.name,
          ...(it.url ? { url: it.url } : {}),
          image: new URL(it.image, withSlash(opts.siteUrl)).href,
          about: it.about,
          creator: { "@id": orgId(opts.siteUrl) },
        },
      })),
    },
  };
}

/** Blog index: a Blog node listing its posts (headline, url, date, author name). */
export function blogSchema(opts: { name: string; description: string; url: string; siteUrl: string; posts: { title: string; url: string; date: string; modified: string; author: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": opts.url + "#webpage",
    url: opts.url,
    name: opts.name,
    description: opts.description,
    inLanguage: "pt-BR",
    isPartOf: { "@id": withSlash(opts.siteUrl) + "#website" },
    publisher: { "@id": orgId(opts.siteUrl) },
    blogPost: opts.posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: p.url,
      datePublished: p.date,
      dateModified: p.modified,
      ...(p.author ? { author: { "@type": "Person", name: p.author } } : {}),
    })),
  };
}
