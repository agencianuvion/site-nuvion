<?php
/**
 * Closes three small, standing information-disclosure gaps that a default WordPress install leaves open. None of
 * these change how the site or wp-admin work — they only remove things nothing here actually uses.
 *
 *  - /wp-json/wp/v2/users (the LIST/collection route) returns every registered username to anyone, unauthenticated
 *    — a classic WordPress login-enumeration vector, and more relevant here because root-redirect.php already
 *    funnels every visitor hitting the bare domain straight to the login screen. Only the collection route is
 *    removed, and only for anonymous requests: the single-user route (/wp/v2/users/<id>) is left untouched, because
 *    that is what WordPress's own REST embedding (`?_embed`) uses to resolve a post's author — exactly what
 *    frontend/src/lib/wp.ts's getAuthorAvatar() relies on for the blog. Logged-in requests (wp-admin, the block
 *    editor's author picker) are untouched either way.
 *  - XML-RPC: this project doesn't use it for anything (no Jetpack, no legacy "WordPress app" publishing — pingback
 *    methods were already removed in disable-comments.php), so the endpoint itself — a standing brute-force/
 *    auth-amplification target — is turned off outright via WordPress's own official switch.
 *  - WordPress version disclosure: the generator meta tag (wp_head and RSS/Atom feeds alike) hands an attacker the
 *    exact core version to match against known CVEs, for zero benefit to a site that isn't publicly promoting
 *    "powered by WordPress" anywhere. (readme.html has the same version in it, but it's a real, existing static
 *    file — WordPress's own .htaccess only rewrites a request to PHP when no matching file exists on disk, so a
 *    PHP hook here never even runs for it. The only real fix is deleting wp-content/../readme.html directly on the
 *    server — not something this repo can reach.)
 *
 * Usage: drop into wp-content/mu-plugins/.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

/**
 * ---------------------------------------------------------------------
 * REST — stop anonymous enumeration of every username via /wp/v2/users,
 * without touching the single-user route the frontend's post embedding
 * depends on, or anything a logged-in editor/admin does in wp-admin.
 * ---------------------------------------------------------------------
 */
function site_block_anon_users_listing( $endpoints ) {
	if ( ! is_user_logged_in() && isset( $endpoints['/wp/v2/users'] ) ) {
		unset( $endpoints['/wp/v2/users'] );
	}
	return $endpoints;
}
add_filter( 'rest_endpoints', 'site_block_anon_users_listing' );

/**
 * ---------------------------------------------------------------------
 * XML-RPC — off completely (WordPress's own supported switch).
 * ---------------------------------------------------------------------
 */
add_filter( 'xmlrpc_enabled', '__return_false' );

/**
 * ---------------------------------------------------------------------
 * Version disclosure — generator tag, including RSS/Atom feeds (the_generator covers those; wp_head only covers
 * the HTML head).
 * ---------------------------------------------------------------------
 */
remove_action( 'wp_head', 'wp_generator' );
add_filter( 'the_generator', '__return_empty_string' );
