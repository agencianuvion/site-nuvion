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
 *    Menu". A status card (colored light + title + sub-line) with four
 *    states — up to date (green), unsent changes (amber, with the "Send
 *    changes to the site" button), publishing (blue, progress bar), failed
 *    (red, "Try again"). See wordpress/auto-deploy.php for the routes it
 *    polls and posts to. Uses --site-* variables from admin-branding.php.
 * ---------------------------------------------------------------------
 */
function site_admin_sidebar_deploy_status() {
	$rest_url   = esc_url_raw( rest_url( 'site/v1/deploy-status' ) );
	$deploy_url = esc_url_raw( rest_url( 'site/v1/deploy' ) );
	$nonce      = wp_create_nonce( 'wp_rest' );
	?>
	<style>
		#site-deploy-status {
			--sd-c: 63, 185, 80;
			display: none; flex-direction: column; gap: 10px;
			margin: 4px 10px 14px; padding: 12px 13px;
			border-radius: 10px; font-size: 12px;
			background: linear-gradient(180deg, rgba(var(--sd-c), .07), rgba(var(--sd-c), .025)), var(--site-bg-elevated-2, #26282f);
			border: 1px solid rgba(var(--sd-c), .22);
			color: var(--site-text, #f1f1f2);
			transition: border-color .3s ease, background .3s ease;
		}
		#site-deploy-status.is-success   { --sd-c: 63, 185, 80; }
		#site-deploy-status.is-dirty     { --sd-c: 245, 165, 36; border-color: rgba(var(--sd-c), .4); }
		#site-deploy-status.is-failure   { --sd-c: 229, 72, 77;  border-color: rgba(var(--sd-c), .5); }
		#site-deploy-status.is-deploying { --sd-c: 59, 130, 246; border-color: rgba(var(--sd-c), .4); }

		#site-deploy-status .sd-head { display: flex; align-items: flex-start; gap: 11px; }
		#site-deploy-status .sd-light {
			flex: 0 0 auto; width: 10px; height: 10px; margin-top: 3px; border-radius: 50%;
			background: rgb(var(--sd-c));
			box-shadow: 0 0 0 3px rgba(var(--sd-c), .16), 0 0 12px rgba(var(--sd-c), .6);
		}
		#site-deploy-status.is-dirty .sd-light     { animation: sd-pulse 1.9s ease-in-out infinite; }
		#site-deploy-status.is-deploying .sd-light { animation: sd-pulse 1.2s ease-in-out infinite; }
		#site-deploy-status.is-failure .sd-light   { animation: sd-pulse 1s ease-in-out infinite; }
		@keyframes sd-pulse {
			0%, 100% { box-shadow: 0 0 0 3px rgba(var(--sd-c), .16), 0 0 8px rgba(var(--sd-c), .45); }
			50%      { box-shadow: 0 0 0 6px rgba(var(--sd-c), .06), 0 0 20px rgba(var(--sd-c), .95); }
		}
		#site-deploy-status .sd-text { min-width: 0; }
		#site-deploy-status .sd-title { font-size: 12.5px; font-weight: 600; line-height: 1.35; color: var(--site-text, #f1f1f2); }
		#site-deploy-status .sd-sub { margin-top: 2px; font-size: 11.5px; line-height: 1.4; color: var(--site-text-muted, #9a9ea6); }

		#site-deploy-status .sd-btn {
			display: block; width: 100%; box-sizing: border-box; padding: 8px 10px;
			border: 0; border-radius: 7px; cursor: pointer;
			font: inherit; font-size: 12px; font-weight: 600; letter-spacing: .01em;
			background: rgb(var(--sd-c)); color: #1c1e23;
			box-shadow: inset 0 1px 0 rgba(255, 255, 255, .28), 0 1px 2px rgba(0, 0, 0, .25);
			transition: filter .2s ease, transform .1s ease;
		}
		#site-deploy-status.is-failure .sd-btn { color: #fff; }
		#site-deploy-status .sd-btn:hover { filter: brightness(1.08); }
		#site-deploy-status .sd-btn:active { transform: translateY(1px); }
		#site-deploy-status .sd-btn:focus-visible { outline: 2px solid rgba(var(--sd-c), .9); outline-offset: 2px; }
		#site-deploy-status .sd-btn[disabled] { opacity: .6; cursor: default; filter: none; }

		#site-deploy-status .sd-bar { position: relative; height: 3px; overflow: hidden; border-radius: 3px; background: rgba(var(--sd-c), .18); }
		#site-deploy-status .sd-bar::after {
			content: ""; position: absolute; inset: 0 auto 0 0; width: 38%; border-radius: 3px;
			background: linear-gradient(90deg, transparent, rgb(var(--sd-c)), transparent);
			animation: sd-slide 1.3s ease-in-out infinite;
		}
		@keyframes sd-slide { from { transform: translateX(-100%); } to { transform: translateX(270%); } }

		body.folded #site-deploy-status { margin: 6px 4px 12px; padding: 10px 0; align-items: center; }
		body.folded #site-deploy-status .sd-text,
		body.folded #site-deploy-status .sd-btn,
		body.folded #site-deploy-status .sd-bar { display: none; }
		@media (prefers-reduced-motion: reduce) {
			#site-deploy-status .sd-light, #site-deploy-status .sd-bar::after { animation: none; }
		}
	</style>
	<script>
		(function () {
			var wrap = document.getElementById( 'adminmenuwrap' );
			if ( ! wrap ) {
				return;
			}
			// #collapse-menu lives INSIDE #adminmenu, not directly in the
			// wrap — so anchor to the sidebar footer block (admin-branding.php,
			// which renders earlier) when it's present, else just append.
			var collapse = document.getElementById( 'collapse-menu' );
			var footer   = document.getElementById( 'site-sidebar-footer' );

			var el = document.createElement( 'div' );
			el.id = 'site-deploy-status';
			el.setAttribute( 'role', 'status' );
			el.setAttribute( 'aria-live', 'polite' );
			if ( footer && footer.parentElement === wrap ) {
				wrap.insertBefore( el, footer );
			} else if ( collapse && collapse.parentElement === wrap ) {
				wrap.insertBefore( el, collapse );
			} else {
				wrap.appendChild( el );
			}

			var restUrl = <?php echo wp_json_encode( $rest_url ); ?>;
			var deployUrl = <?php echo wp_json_encode( $deploy_url ); ?>;
			var nonce = <?php echo wp_json_encode( $nonce ); ?>;
			var timer = null;

			function esc( t ) {
				var d = document.createElement( 'div' );
				d.textContent = t;
				return d.innerHTML;
			}

			function plural( n ) {
				return n + ( n === 1 ? ' item changed' : ' items changed' );
			}

			function render( data ) {
				var state = data.state;
				if ( state === 'idle' ) {
					el.style.display = 'none';
					return;
				}
				var title = '', sub = '', extra = '';
				var canDeploy = !! data.can_deploy;

				if ( state === 'success' ) {
					title = 'Site up to date';
					sub = data.time_ago ? 'Published ' + data.time_ago : '';
				} else if ( state === 'dirty' ) {
					title = 'Unsent changes';
					sub = ( data.dirty_count ? plural( data.dirty_count ) + ' · ' : 'Saved ' ) + ( data.dirty_ago || '' );
					if ( canDeploy ) {
						extra = '<button type="button" class="sd-btn">Send changes to the site</button>';
					} else {
						sub += ' · awaiting send';
					}
				} else if ( state === 'failure' ) {
					title = 'Publish failed';
					sub = ( data.time_ago ? data.time_ago + ' · ' : '' ) + 'the site is still on the previous version';
					if ( canDeploy ) {
						extra = '<button type="button" class="sd-btn">Try again</button>';
					}
				} else if ( state === 'deploying' ) {
					title = 'Publishing changes…';
					sub = 'Usually takes about a minute';
					extra = '<div class="sd-bar" aria-hidden="true"></div>';
				} else {
					el.style.display = 'none';
					return;
				}

				el.className = 'is-' + state;
				el.innerHTML =
					'<div class="sd-head"><span class="sd-light" aria-hidden="true"></span><div class="sd-text"><div class="sd-title">' +
					esc( title ) + '</div>' + ( sub ? '<div class="sd-sub">' + esc( sub ) + '</div>' : '' ) + '</div></div>' + extra;
				el.style.display = 'flex';
			}

			function schedule( data ) {
				if ( timer ) {
					clearTimeout( timer );
				}
				timer = setTimeout( poll, data && data.state === 'deploying' ? 4000 : 20000 );
			}

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
						schedule( data );
					} )
					.catch( function () {} );
			}

			el.addEventListener( 'click', function ( ev ) {
				var btn = ev.target.closest ? ev.target.closest( '.sd-btn' ) : null;
				if ( ! btn || btn.disabled ) {
					return;
				}
				btn.disabled = true;
				btn.textContent = 'Sending…';
				fetch( deployUrl, { method: 'POST', headers: { 'X-WP-Nonce': nonce }, credentials: 'same-origin' } )
					.then( function ( res ) {
						if ( ! res.ok ) {
							throw new Error( 'fail' );
						}
						render( { state: 'deploying', can_deploy: true } );
						schedule( { state: 'deploying' } );
					} )
					.catch( function () {
						btn.disabled = false;
						btn.textContent = 'Could not send. Try again';
					} );
			} );

			document.addEventListener( 'visibilitychange', function () {
				if ( ! document.hidden ) {
					poll();
				}
			} );

			poll();
		})();
	</script>
	<?php
}
add_action( 'admin_footer', 'site_admin_sidebar_deploy_status' );
