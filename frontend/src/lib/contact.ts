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
