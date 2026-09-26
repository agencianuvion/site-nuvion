// Client/partner logos (white, transparent — for dark backgrounds). They are edited in WordPress (Clientes: title = name, featured image = logo, "Ordem" = position); the list below is the FALLBACK used when WordPress is unreachable or has none yet (files in public/images/clients/, same slugs).
import { wpCollection, decodeEntities, type WpImage } from "./wp-data";
export interface ClientLogo {
  slug: string;
  name: string;
  w: number;
  h: number;
  /** Where the logo image is (a WordPress upload, or /images/clients/<slug>.webp in the fallback). */
  src: string;
}

const localLogos: Omit<ClientLogo, "src">[] = [
  {
    "slug": "amc-clinica-odontologica",
    "name": "AMC Clínica Odontológica",
    "w": 150,
    "h": 49
  },
  {
    "slug": "bite-sleepwear",
    "name": "Bite Sleepwear",
    "w": 150,
    "h": 39
  },
  {
    "slug": "bom-chefe",
    "name": "Bom Chefe",
    "w": 150,
    "h": 105
  },
  {
    "slug": "canal-da-licitacao",
    "name": "Canal da Licitação",
    "w": 150,
    "h": 203
  },
  {
    "slug": "cei-convivencia",
    "name": "CEI Convivência",
    "w": 150,
    "h": 93
  },
  {
    "slug": "cultiva-gestao-criativa",
    "name": "Cultiva Gestão Criativa",
    "w": 150,
    "h": 156
  },
  {
    "slug": "deltacold",
    "name": "Delta Cold",
    "w": 150,
    "h": 38
  },
  {
    "slug": "fonecenter",
    "name": "FoneCenter",
    "w": 150,
    "h": 107
  },
  {
    "slug": "4quarentena",
    "name": "4Quarentena",
    "w": 150,
    "h": 36
  },
  {
    "slug": "androclinic",
    "name": "AndroClinic",
    "w": 200,
    "h": 40
  },
  {
    "slug": "camisetas-12-horas",
    "name": "Camisetas 12 Horas",
    "w": 245,
    "h": 76
  },
  {
    "slug": "cibea",
    "name": "Cibea Construtora e Incorporadora",
    "w": 150,
    "h": 78
  },
  {
    "slug": "wegg",
    "name": "Wegg Construtora",
    "w": 206,
    "h": 26
  },
  {
    "slug": "dental-tv",
    "name": "Dental TV",
    "w": 260,
    "h": 164
  },
  {
    "slug": "f1-cia-imobiliaria",
    "name": "F1 Cia Imobiliária",
    "w": 150,
    "h": 161
  },
  {
    "slug": "glow-dale",
    "name": "Glow Dale",
    "w": 150,
    "h": 77
  },
  {
    "slug": "lisleia-golfetto",
    "name": "Lisléia Golfetto Estética",
    "w": 150,
    "h": 33
  },
  {
    "slug": "omni-formulas",
    "name": "Omni Fórmulas Farmácia de Manipulação",
    "w": 150,
    "h": 79
  },
  {
    "slug": "outside-camping",
    "name": "Outside Camping",
    "w": 150,
    "h": 95
  },
  {
    "slug": "placas-em-12-horas",
    "name": "Placas em 12 Horas",
    "w": 150,
    "h": 41
  },
  {
    "slug": "raidel-cirurgia-plastica",
    "name": "Raidel Cirurgia Plástica",
    "w": 150,
    "h": 63
  },
  {
    "slug": "thermo-guard",
    "name": "Thermo Guard",
    "w": 150,
    "h": 68
  },
  {
    "slug": "work-cell",
    "name": "Work Cell",
    "w": 150,
    "h": 52
  },
  {
    "slug": "medical-man",
    "name": "Medical Man",
    "w": 150,
    "h": 35
  },
  {
    "slug": "mercado-publico-florianopolis",
    "name": "Mercado Público Florianópolis",
    "w": 150,
    "h": 96
  },
  {
    "slug": "ornato-arquitetura",
    "name": "Ornato Arquitetura",
    "w": 150,
    "h": 41
  },
  {
    "slug": "osindicato",
    "name": "O Sindicato",
    "w": 150,
    "h": 56
  },
  {
    "slug": "samba-design",
    "name": "Samba Design",
    "w": 150,
    "h": 85
  }
];


interface WpCliente {
  slug: string;
  title: { rendered: string };
  fields?: { logo: WpImage | null };
}

async function loadClientLogos(): Promise<ClientLogo[]> {
  const items = await wpCollection<WpCliente>("clientes", "&orderby=menu_order&order=asc");
  const fromWp = (items ?? [])
    .filter((c) => c.fields?.logo?.url)
    .map((c) => ({
      slug: c.slug,
      name: decodeEntities(c.title.rendered),
      w: c.fields!.logo!.width || 150,
      h: c.fields!.logo!.height || 60,
      src: c.fields!.logo!.url,
    }));
  return fromWp.length ? fromWp : localLogos.map((l) => ({ ...l, src: `/images/clients/${l.slug}.webp` }));
}

export const clientLogos: ClientLogo[] = await loadClientLogos();
