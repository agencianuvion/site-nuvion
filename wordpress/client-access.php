<?php
/**
 * Client access role + deploy status indicator.
 *
 * Two independent things live in this file:
 *
 *  1. A pattern for a restricted "site_client" role that can ONLY manage
 *     specific content (Posts, plus whatever custom post types this
 *     project adds) — nothing admin/site-config related (Users, Plugins,
 *     Themes, Tools, core Settings). Disabled by default below (the
 *     example role isn't registered) because it depends on knowing what
 *     custom post types this specific project actually has; see the TODO
 *     in site_register_client_role() to enable and adapt it.
 *
 *     If a custom post type is added with its OWN capability_type (not
 *     the default 'post') — see the register_post_type() call in the
 *     reference project's cpt example — a role can be scoped to exactly
 *     that content, and menu items for anything else can be hidden. The
 *     rest — hiding menu items the client shouldn't see — is a UX nicety
 *     on top of that, not the real security boundary: the real boundary
 *     is the capability set itself, which WordPress enforces even if the
 *     role browsed straight to a hidden URL.
 *
 *  2. A "Publishing changes…" / "Site up to date" / "Publish failed"
 *     indicator at the bottom of the wp-admin sidebar — see
 *     wordpress/auto-deploy.php for the status route this polls. Lets a
 *     non-technical client tell a save actually went live without ever
 *     needing to check GitHub or guess from the front-end.
 *
 * This starter deliberately does NOT include a full wp-admin visual
 * reskin (custom colors, logo swap, dark/light chrome, etc.) — that's
 * real design work specific to each project's own brand, not something
 * worth carrying forward as leftover styling from a different client.
 * Add one fresh per project if wanted.
 *
 * Usage: drop into wp-content/mu-plugins/.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * ---------------------------------------------------------------------
 * 1. Client role (disabled by default — see the TODO below)
 * ---------------------------------------------------------------------
 */

/** The 10 primitive capability names WordPress expects for any post-like capability_type, e.g. 'posts' -> edit_posts, edit_others_posts, ... */
function site_cpt_primitive_caps( $plural ) {
	return array(
		"edit_{$plural}",
		"edit_others_{$plural}",
		"edit_private_{$plural}",
		"edit_published_{$plural}",
		"publish_{$plural}",
		"read_private_{$plural}",
		"delete_{$plural}",
		"delete_private_{$plural}",
		"delete_published_{$plural}",
		"delete_others_{$plural}",
	);
}

/** Adds every cap in $caps to $role_name, skipping ones it already has (avoids pointless writes on every request). */
function site_grant_caps( $role_name, $caps ) {
	$role = get_role( $role_name );
	if ( ! $role ) {
		return;
	}
	foreach ( $caps as $cap ) {
		if ( ! $role->has_cap( $cap ) ) {
			$role->add_cap( $cap );
		}
	}
}

/**
 * TODO: this is a worked example, not active code — uncomment and adapt
 * once this project has a custom post type to scope the role to.
 *
 * A custom post type registered with a CUSTOM capability_type (not the
 * default 'post' — see the reference project's cpt-*.php for exactly how)
 * gets NO capabilities for anyone by default, not even Administrator, so
 * this backfills Administrator too. Without that backfill, switching a
 * CPT off the shared 'post' capabilities would lock the site owner out of
 * it.
 */
// function site_grant_admin_cpt_caps() {
// 	site_grant_caps( 'administrator', site_cpt_primitive_caps( 'YOUR_CPT_PLURAL_HERE' ) );
// }
// add_action( 'init', 'site_grant_admin_cpt_caps', 20 );
//
// function site_register_client_role() {
// 	$role = get_role( 'site_client' );
// 	if ( ! $role ) {
// 		add_role( 'site_client', 'Client', array( 'read' => true ) );
// 		$role = get_role( 'site_client' );
// 	}
//
// 	$caps = array_merge(
// 		array( 'upload_files' ),
// 		site_cpt_primitive_caps( 'posts' ),
// 		site_cpt_primitive_caps( 'YOUR_CPT_PLURAL_HERE' )
// 	);
// 	site_grant_caps( 'site_client', $caps );
// }
// add_action( 'init', 'site_register_client_role', 21 );
//
// function site_is_client_role() {
// 	$user = wp_get_current_user();
// 	return $user && in_array( 'site_client', (array) $user->roles, true );
// }
//
// function site_trim_client_menu() {
// 	if ( ! site_is_client_role() ) {
// 		return;
// 	}
// 	foreach ( array( 'themes.php', 'plugins.php', 'users.php', 'tools.php', 'options-general.php' ) as $slug ) {
// 		remove_menu_page( $slug );
// 	}
// }
// add_action( 'admin_menu', 'site_trim_client_menu', 999 );

/**
 * ---------------------------------------------------------------------
 * 2. Deploy status indicator — bottom of the sidebar, above "Collapse
 *    Menu". See wordpress/auto-deploy.php for the GET route this polls.
 * ---------------------------------------------------------------------
 */
function site_admin_sidebar_deploy_status() {
	$rest_url = esc_url_raw( rest_url( 'site/v1/deploy-status' ) );
	$nonce    = wp_create_nonce( 'wp_rest' );
	?>
	<style>
		#site-deploy-status {
			display: none; align-items: center; gap: 10px;
			margin: 4px 10px 14px; padding: 10px 12px;
			border-radius: 6px; font-size: 12px; font-weight: 500;
			background: rgba(0, 0, 0, 0.04); color: #555;
		}
		.site-deploy-icon { width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }
		#site-deploy-status.is-deploying .site-deploy-icon {
			background: transparent; border: 2px solid #2563eb; border-top-color: transparent;
			animation: site-deploy-spin 0.8s linear infinite;
		}
		#site-deploy-status.is-success .site-deploy-icon { background: #3fb950; border: none; }
		#site-deploy-status.is-failure .site-deploy-icon { background: #d1242f; border: none; }
		@keyframes site-deploy-spin { to { transform: rotate(360deg); } }
		body.folded #site-deploy-status { display: none !important; }
	</style>
	<script>
		(function () {
			var wrap = document.getElementById( 'adminmenuwrap' );
			if ( ! wrap ) {
				return;
			}
			var collapse = document.getElementById( 'collapse-menu' );

			var el = document.createElement( 'div' );
			el.id = 'site-deploy-status';
			el.style.display = 'none';
			if ( collapse && collapse.parentElement === wrap ) {
				wrap.insertBefore( el, collapse );
			} else {
				wrap.appendChild( el );
			}

			var restUrl = <?php echo wp_json_encode( $rest_url ); ?>;
			var nonce = <?php echo wp_json_encode( $nonce ); ?>;
			var labels = {
				deploying: 'Publishing changes…',
				success: 'Site up to date',
				failure: 'Publish failed',
			};

			function render( data ) {
				var state = data.state;
				if ( state === 'idle' || ! labels[ state ] ) {
					el.style.display = 'none';
					return;
				}
				var label = labels[ state ] + ( data.time_ago ? ' · ' + data.time_ago : '' );
				el.className = 'is-' + state;
				el.innerHTML = '<span class="site-deploy-icon" aria-hidden="true"></span><span>' + label + '</span>';
				el.style.display = 'flex';
			}

			var timer = null;
			function poll() {
				fetch( restUrl, { headers: { 'X-WP-Nonce': nonce }, cache: 'no-store', credentials: 'same-origin' } )
					.then( function ( res ) {
						return res.ok ? res.json() : null;
					} )
					.then( function ( data ) {
						if ( ! data ) {
							return;
						}
						render( data );
						if ( timer ) {
							clearTimeout( timer );
						}
						timer = setTimeout( poll, data.state === 'deploying' ? 4000 : 20000 );
					} )
					.catch( function () {} );
			}

			poll();
		})();
	</script>
	<?php
}
add_action( 'admin_footer', 'site_admin_sidebar_deploy_status' );
