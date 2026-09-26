<?php
/**
 * Scope the built-in "Editor" role down to just content.
 *
 * For a project where the client's own team manages content day-to-day —
 * Posts, Media, and whatever custom post types the project adds — but
 * shouldn't touch Pages, moderate Comments, or reach Appearance/Plugins/
 * Users/Settings. This trims the EXISTING 'editor' role rather than
 * inventing a new one, which is simpler than the site_client custom-role
 * pattern in client-access.php whenever "everyone who isn't an admin
 * gets the same restricted view" is enough — reach for that other
 * pattern instead when different non-admin people need DIFFERENT scopes
 * (e.g. only ONE specific custom post type, not Posts too).
 *
 * Two layers, in order of what actually matters:
 *
 *  1. CAPABILITIES (the real boundary — enforced by WordPress itself even
 *     if someone types a URL by hand): removes every Pages capability and
 *     comment moderation from the 'editor' role, and grants it a custom
 *     'manage_site_options' capability (for a native Settings API page,
 *     see the free-tier alternative to ACF Options Pages noted in
 *     client-access.php / SETUP-CHECKLIST.md). Appearance/Plugins/Users/
 *     Settings are already unreachable to Editors by default (they lack
 *     manage_options, activate_plugins, edit_theme_options, list_users),
 *     so there's nothing to strip there.
 *
 *  2. MENU (cosmetic): hides, from anyone who ISN'T an administrator, the
 *     leftover items — including ones an Editor already couldn't open,
 *     just so the sidebar doesn't show dead links.
 *
 * Usage: drop into wp-content/mu-plugins/.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Bump this to re-apply the capability changes below — roles are stored
 * in the database, so editing the lists below has no effect until this
 * number changes too.
 */
const SITE_EDITOR_CAPS_VERSION = 1;

/** Pages + comment-moderation capabilities to remove from the Editor role. */
function site_editor_caps_to_drop() {
	return array(
		'edit_pages',
		'edit_others_pages',
		'edit_published_pages',
		'edit_private_pages',
		'publish_pages',
		'delete_pages',
		'delete_others_pages',
		'delete_published_pages',
		'delete_private_pages',
		'read_private_pages',
		'moderate_comments',
	);
}

/** Syncs the 'editor' role once per SITE_EDITOR_CAPS_VERSION bump. */
function site_sync_editor_caps() {
	if ( (int) get_option( 'site_editor_caps_version' ) === SITE_EDITOR_CAPS_VERSION ) {
		return;
	}

	$editor = get_role( 'editor' );
	if ( $editor ) {
		foreach ( site_editor_caps_to_drop() as $cap ) {
			$editor->remove_cap( $cap );
		}
		$editor->add_cap( 'manage_site_options' );
	}

	update_option( 'site_editor_caps_version', SITE_EDITOR_CAPS_VERSION, false );
}
add_action( 'init', 'site_sync_editor_caps' );

/** Administrator (manage_options) also gets manage_site_options, granted at runtime — the 'administrator' role itself is never modified. */
add_filter(
	'user_has_cap',
	function ( $allcaps ) {
		if ( ! empty( $allcaps['manage_options'] ) ) {
			$allcaps['manage_site_options'] = true;
		}
		return $allcaps;
	}
);

/**
 * Hides menu items outside the content scope from anyone who isn't an
 * administrator. Purely visual — the real block is the capability set
 * above. Slugs an Editor already can't open (themes/plugins/users) are
 * included anyway: remove_menu_page() on a slug that isn't there is a
 * harmless no-op, and it keeps this working if capabilities ever change.
 */
function site_trim_editor_menu() {
	if ( current_user_can( 'manage_options' ) ) {
		return;
	}
	$hide = array(
		'index.php',               // Dashboard (Home + Updates)
		'edit.php?post_type=page', // Pages
		'edit-comments.php',       // Comments
		'themes.php',              // Appearance
		'plugins.php',             // Plugins
		'users.php',               // Users
		'profile.php',             // Profile (this is the Editor's own "account menu" slug)
		'tools.php',               // Tools
		'options-general.php',     // Settings
	);
	foreach ( $hide as $slug ) {
		remove_menu_page( $slug );
	}
}
add_action( 'admin_menu', 'site_trim_editor_menu', 999 );

/**
 * With no "Dashboard" in the menu, a non-admin shouldn't land on the
 * (now pointless) empty Dashboard when logging in or opening an old
 * bookmark — send them to Posts instead. The profile page stays reachable
 * by direct URL, it's just not in the menu.
 */
function site_editor_dashboard_redirect() {
	if ( current_user_can( 'manage_options' ) || wp_doing_ajax() ) {
		return;
	}
	if ( 'index.php' === ( $GLOBALS['pagenow'] ?? '' ) ) {
		wp_safe_redirect( admin_url( 'edit.php' ) );
		exit;
	}
}
add_action( 'admin_init', 'site_editor_dashboard_redirect' );
