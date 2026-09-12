<?php
/**
 * Disable comments entirely (no plugin needed).
 *
 * This site is headless — the Astro front-end never renders a comment
 * form or comment thread — so WordPress's own comment system is pure
 * attack surface (pingback/trackback spam, spam comments piling up in
 * wp-admin, comment fields being a common target for script-injection
 * attempts) with no upside. This closes it off at every angle a typical
 * "Disable Comments" plugin does:
 *
 *  - Removes 'comments'/'trackbacks' support from every post type (new
 *    and existing), so the option to comment never even appears.
 *  - Forces every comment/pingback check closed, and returns no comments,
 *    regardless of a post's stored comment_status (covers content that
 *    already has comments open from before this file existed).
 *  - Removes the "Comments" admin menu, the "Discussion" settings page,
 *    the admin bar's comments bubble, and the Dashboard's "Recent
 *    Comments" widget — and redirects away from edit-comments.php if
 *    something links straight to it.
 *  - Removes the REST API's /wp/v2/comments routes and the XML-RPC
 *    pingback methods.
 *
 * Always included by default (see the novo-site-astrowp skill) — there's
 * no real project where a headless WordPress backend needs its native
 * comment system, and leaving it enabled is a standing, unused attack
 * surface for no benefit.
 *
 * Usage: drop into wp-content/mu-plugins/.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

/** Strips 'comments'/'trackbacks' support from every registered post type, including custom ones added later (this runs late on 'init'). */
function site_remove_comment_support() {
	foreach ( get_post_types() as $post_type ) {
		if ( post_type_supports( $post_type, 'comments' ) ) {
			remove_post_type_support( $post_type, 'comments' );
		}
		if ( post_type_supports( $post_type, 'trackbacks' ) ) {
			remove_post_type_support( $post_type, 'trackbacks' );
		}
	}
}
add_action( 'init', 'site_remove_comment_support', 100 );

// Force closed regardless of each post's own comment_status/ping_status —
// covers anything that already has comments open from before this file
// existed, without having to bulk-edit every post.
add_filter( 'comments_open', '__return_false', 20 );
add_filter( 'pings_open', '__return_false', 20 );
// And hide any comments that already exist in the database.
add_filter( 'comments_array', '__return_empty_array', 20 );

/**
 * ---------------------------------------------------------------------
 * Admin UI — remove every entry point.
 * ---------------------------------------------------------------------
 */
function site_hide_comments_admin_menu() {
	remove_menu_page( 'edit-comments.php' );
	remove_submenu_page( 'options-general.php', 'options-discussion.php' );
}
add_action( 'admin_menu', 'site_hide_comments_admin_menu', 999 );

function site_remove_comments_dashboard_widget() {
	remove_meta_box( 'dashboard_recent_comments', 'dashboard', 'normal' );
}
add_action( 'wp_dashboard_setup', 'site_remove_comments_dashboard_widget' );

function site_remove_comments_admin_bar_bubble( $wp_admin_bar ) {
	$wp_admin_bar->remove_node( 'comments' );
}
add_action( 'admin_bar_menu', 'site_remove_comments_admin_bar_bubble', 999 );

/** Something linking straight to edit-comments.php (an old bookmark, a notification email, etc.) gets sent to the Dashboard instead of a 404/blank screen. */
function site_redirect_away_from_comments_screen() {
	global $pagenow;
	if ( 'edit-comments.php' === $pagenow ) {
		wp_safe_redirect( admin_url() );
		exit;
	}
}
add_action( 'admin_init', 'site_redirect_away_from_comments_screen' );

/**
 * ---------------------------------------------------------------------
 * API surface — REST + XML-RPC.
 * ---------------------------------------------------------------------
 */
function site_remove_rest_comments_routes( $endpoints ) {
	foreach ( $endpoints as $route => $handlers ) {
		if ( 0 === strpos( $route, '/wp/v2/comments' ) ) {
			unset( $endpoints[ $route ] );
		}
	}
	return $endpoints;
}
add_filter( 'rest_endpoints', 'site_remove_rest_comments_routes' );

function site_remove_xmlrpc_pingback_methods( $methods ) {
	unset( $methods['pingback.ping'], $methods['pingback.extensions.getPingbacks'] );
	return $methods;
}
add_filter( 'xmlrpc_methods', 'site_remove_xmlrpc_pingback_methods' );
