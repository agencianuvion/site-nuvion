/**
 * Every CTA on the live agencianuvion.com.br site resolves to WhatsApp —
 * kept the same here rather than inventing a contact form that doesn't
 * match how this client actually closes leads.
 */
const WHATSAPP_NUMBER = "5548996964116";

export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const CONTACT = {
  whatsappDisplay: "(48) 9 9696-4116",
  location: "Grande Florianópolis",
  instagram: "https://instagram.com/nuvion.agencia",
  facebook: "https://facebook.com/nuvion.agencia",
  linkedin: "https://linkedin.com/company/nuvionagencia/",
};

/** Company facts used in schema.org, the legal pages and llms.txt (public business data supplied by the owner). */
export const COMPANY = {
  brand: "Agência Nuvion",
  shortName: "Nuvion",
  legalName: "Nuvion Marketing, Estratégia e Treinamentos LTDA",
  cnpj: "32.024.972/0001-02",
  foundingYear: "2015",
  city: "Palhoça",
  region: "SC",
  metro: "Grande Florianópolis",
  phoneIntl: "+55 48 99696-4116",
  email: "mkt@agencianuvion.com.br",
  hours: "Segunda a sexta, das 9h às 18h",
  logoUrl: "https://system.agencianuvion.com.br/wp-content/uploads/2026/09/logoB-02-perfil.png",
  /** Google Business Profile (Google Maps listing "Agência Nuvion") */
  mapsUrl: "https://maps.app.goo.gl/HgqUt2RxZ1KC1kch8",
};

export const FOUNDER = {
  name: "Juan Carlo Fabra Gomez",
  shortName: "Juan C. Fabra Gomez",
  role: "Diretor e CMO da Agência Nuvion",
  linkedin: "https://br.linkedin.com/in/fabragomez",
  photo: "/images/juan-fabra.webp",
  education: "Formação superior em Administração e Marketing Digital",
  bio: "Juan Carlo Fabra Gomez é diretor da Agência Nuvion, desenvolvedor web full-stack e especialista em SEO e GEO. Com forte atuação em UI/UX design e integração de inteligência artificial, ele foca em impulsionar o posicionamento digital de marcas através de arquitetura de conteúdo e engenharia de performance.",
};
