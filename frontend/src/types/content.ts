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
  date: string;
  author: string;
  categories: Taxonomy[];
  tags: Taxonomy[];
}

// TODO: when this project has a custom post type, add its own interface
// here (mirroring Post's shape) plus a matching WpXxx/mapXxx pair in
// wp.ts. See the comment above getPosts() in wp.ts for the exact pattern
// to copy.
