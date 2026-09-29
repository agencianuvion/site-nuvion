// Line icons for the Setores hero visual (feather-style: 24x24, stroke="currentColor", fill="none" — same drawing
// convention as lib/authority-icons.ts, so both icon rows read as the same family). One per sectorNames entry in
// pages/setores.astro, in the same order, plus a "wild" one for "+ qualquer outro modelo de negócio".
export const sectorIcons = [
  // Saúde e estética — heart
  `<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"></path>`,
  // Construção e imobiliário — house
  `<path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"></path>`,
  // Indústria e serviços técnicos — wrench
  `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a4 4 0 0 1-5.7 5.7l-6.9 6.9a2 2 0 0 1-2.8-2.8l6.9-6.9a4 4 0 0 1 5.7-5.7z"></path>`,
  // Moda e varejo — shopping bag
  `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path>`,
  // Gastronomia e turismo — cup
  `<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>`,
  // Educação e associações — graduation cap
  `<path d="M12 3 2 8l10 5 10-5-10-5Z"></path><path d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5"></path>`,
];
/** "+ qualquer outro modelo de negócio" */
export const sectorIconWild = `<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`;
