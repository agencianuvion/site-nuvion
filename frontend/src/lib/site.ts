import { waLink, CONTACT } from "./contact";

/** Main pages, shown in the footer (the header keeps a shorter list). */
export const footerLinks = [
  { href: "/sites-de-alta-performance", label: "Sites" },
  { href: "/seo-tecnico", label: "SEO Técnico" },
  { href: "/geo-generative-engine-optimization", label: "GEO" },
  { href: "/portfolio", label: "Portfólio" },
  { href: "/setores", label: "Setores" },
  { href: "/sobre-nos", label: "Sobre Nós" },
  { href: "/blog", label: "Blog" },
];

export const socials = [
  {
    label: "WhatsApp",
    href: waLink("Olá! Vim pelo site da Nuvion."),
    icon: `<path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"></path><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"></path>`,
  },
  {
    label: "Instagram",
    href: CONTACT.instagram,
    icon: `<path d="M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"></path><path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"></path><path d="M16.5 7.5v.01"></path>`,
  },
  {
    label: "LinkedIn",
    href: CONTACT.linkedin,
    icon: `<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"></path><path d="M8 11v5"></path><path d="M8 8v.01"></path><path d="M12 16v-5"></path><path d="M16 16v-3a2 2 0 1 0-4 0"></path>`,
  },
  {
    label: "Facebook",
    href: CONTACT.facebook,
    icon: `<path d="M7 10v4h3v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3V3h-3a5 5 0 0 0-5 5v2z"></path>`,
  },
];

export const legalLinks = [
  { href: "/politica-de-privacidade", label: "Política de Privacidade" },
  { href: "/termos-de-uso", label: "Termos de Uso" },
  { href: "/politica-editorial", label: "Política Editorial" },
];
