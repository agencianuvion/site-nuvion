/**
 * Shared content contracts. Keep the WP REST response shape out of
 * components — they should only ever see these clean interfaces, mapped
 * once in src/lib/wp.ts.
 */

/** A single taxonomy term (category or tag). */
export interface Taxonomy {
  slug: string;
  name: string;
}

/** Maps to the native WP posts endpoint (/wp-json/wp/v2/posts). */
export interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  /** Trusted HTML (WP's content.rendered) — meant for set:html. */
  content: string;
  featuredImage: string;
  /** WordPress's own local time (site timezone, no offset) — for display and sorting only. */
  date: string;
  /** Same publish/modified instants as UTC, ISO 8601 with a "Z" suffix — for schema.org datePublished/dateModified (Google
   * recommends the timezone be explicit, and WP's plain "date"/"modified" fields do not carry one). */
  dateGmt: string;
  modifiedGmt: string;
  author: string;
  /** The author's own photo, when the WordPress install has one set (see wordpress/local-avatar.php) — Gravatar's default
   * "mystery man" icon is never used here; falls back to the founder's photo or the author's initial instead. */
  authorAvatar?: string;
  categories: Taxonomy[];
  tags: Taxonomy[];
  /** Own SEO title / meta description written in WordPress (SEO plugin). When empty, they are made from the title and excerpt. */
  seoTitle?: string;
  seoDescription?: string;
}

// TODO: when this project has a custom post type, add its own interface
// here (mirroring Post's shape) plus a matching WpXxx/mapXxx pair in
// wp.ts. See the comment above getPosts() in wp.ts for the exact pattern
// to copy.
