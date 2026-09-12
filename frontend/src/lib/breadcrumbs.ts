/**
 * BreadcrumbList (schema.org) — pair with src/components/shared/Breadcrumbs.astro
 * on any single/detail page. Helps both Google (breadcrumb rich results)
 * and AI search engines understand where a page sits in the site.
 */
export interface BreadcrumbItem {
  label: string;
  /** Omit on the last item (the current page) — that one uses currentUrl instead. */
  href?: string;
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[], currentUrl: string, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? new URL(item.href, siteUrl).href : currentUrl,
    })),
  };
}
