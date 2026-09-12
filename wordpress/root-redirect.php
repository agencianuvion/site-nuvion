<?php
/**
 * Root URL redirects straight to login/wp-admin.
 *
 * For a headless install (everything real lives in the Astro front-end;
 * this WordPress is purely an admin + API backend) with a blank theme,
 * visiting the bare domain directly has nothing useful to show. Instead
 * of a dead page, it sends visitors straight to the login screen (or
 * wp-admin itself, if already logged in) — effectively making the bare
 * domain double as the admin entry point, without actually moving
 * wp-admin/wp-login.php anywhere (they keep working exactly as before;
 * this only adds a convenience redirect at the root).
 *
 * Scoped to the literal home URL only — every other path (wp-admin,
 * wp-login.php, wp-json/*, wp-content/uploads/*, etc.) is left alone.
 *
 * Usage: drop into wp-content/mu-plugins/ (must-use plugins load
 * automatically, no activation needed).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

function site_redirect_root_to_login() {
	if ( is_admin() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}

	$path = trim( (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH ), '/' );
	if ( '' !== $path ) {
		return; // Anything other than the bare root — leave it alone.
	}

	wp_safe_redirect( is_user_logged_in() ? admin_url() : wp_login_url() );
	exit;
}
add_action( 'template_redirect', 'site_redirect_root_to_login' );
