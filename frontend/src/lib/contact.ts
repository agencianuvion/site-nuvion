import { wpOptions, text } from "./wp-data";

// Company, contact and founder facts. They are edited in WordPress ("Dados da Nuvion"); the literals below are the FALLBACK for
// whatever WordPress does not return (unreachable, or a field left empty), so the site always has a value.
const options = await wpOptions();
const wpCompany = options?.company;
const wpContact = options?.contact;
const wpFounder = options?.founder;

/**
 * Every CTA on the live agencianuvion.com.br site resolves to WhatsApp —
 * kept the same here rather than inventing a contact form that doesn't
 * match how this client actually closes leads.
 */
const WHATSAPP_NUMBER = text(wpContact?.whatsapp, "5548996964116");

export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const CONTACT = {
  whatsappDisplay: text(wpContact?.whatsappDisplay, "(48) 9 9696-4116"),
  location: text(wpContact?.location, "Grande Florianópolis"),
  instagram: text(wpContact?.instagram, "https://instagram.com/nuvion.agencia"),
  facebook: text(wpContact?.facebook, "https://facebook.com/nuvion.agencia"),
  linkedin: text(wpContact?.linkedin, "https://linkedin.com/company/nuvionagencia/"),
};

/** Company facts used in schema.org, the legal pages and llms.txt (public business data supplied by the owner). */
export const COMPANY = {
  brand: text(wpCompany?.brand, "Agência Nuvion"),
  shortName: text(wpCompany?.shortName, "Nuvion"),
  legalName: text(wpCompany?.legalName, "Nuvion Marketing, Estratégia e Treinamentos LTDA"),
  cnpj: text(wpCompany?.cnpj, "32.024.972/0001-02"),
  foundingYear: text(wpCompany?.foundingYear, "2015"),
  city: text(wpCompany?.city, "Palhoça"),
  region: text(wpCompany?.region, "SC"),
  metro: text(wpCompany?.metro, "Grande Florianópolis"),
  phoneIntl: text(wpContact?.phoneIntl, "+55 48 99696-4116"),
  email: text(wpContact?.email, "mkt@agencianuvion.com.br"),
  hours: text(wpCompany?.hours, "Segunda a sexta, das 9h às 18h"),
  logoUrl: text(wpCompany?.logoUrl, "https://system.agencianuvion.com.br/wp-content/uploads/2026/09/logoB-02-perfil.png"),
  /** Google Business Profile (Google Maps listing "Agência Nuvion") */
  mapsUrl: text(wpCompany?.mapsUrl, "https://maps.app.goo.gl/HgqUt2RxZ1KC1kch8"),
};

export const FOUNDER = {
  name: text(wpFounder?.name, "Juan Carlo Fabra Gomez"),
  shortName: text(wpFounder?.shortName, "Juan C. Fabra Gomez"),
  role: text(wpFounder?.role, "Diretor e CMO da Agência Nuvion"),
  linkedin: text(wpFounder?.linkedin, "https://br.linkedin.com/in/fabragomez"),
  photo: text(wpFounder?.photo, "/images/juan-fabra.webp"),
  education: text(wpFounder?.education, "Formação superior em Administração e Marketing Digital"),
  bio: text(
    wpFounder?.bio,
    "Juan Carlo Fabra Gomez é diretor da Agência Nuvion, desenvolvedor web full-stack e especialista em SEO e GEO. Com forte atuação em UI/UX design e integração de inteligência artificial, ele foca em impulsionar o posicionamento digital de marcas através de arquitetura de conteúdo e engenharia de performance."
  ),
};
