<?php
/**
 * wp-admin visual reskin — sidebar logo, admin bar logo, brand accent
 * color, and a matching login screen. Turns the stock WordPress dashboard
 * into something that looks like it belongs to this project instead of a
 * generic install.
 *
 * OPTIONAL — this file is deliberately separate from client-access.php
 * (which only carries structural things: the client role pattern and the
 * deploy-status indicator). Visual branding is per-project by nature, so
 * it's kept out of the base kit and only added here when a project
 * actually wants it. Delete this file if not needed.
 *
 * Everything project-specific lives in the constants right below — fill
 * these in and the rest of the file needs no further editing.
 *
 * Usage: drop into wp-content/mu-plugins/.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const SITE_NAME                = 'Nuvion';                                                            // login screen link title / logo alt text
const SITE_ADMIN_CAPTION       = 'Administração do site';                                             // small caption under the sidebar logo
const SITE_ADMIN_ACCENT_COLOR  = '#CC4E14';                                                            // brand accent — buttons, current nav item, focus rings, login button
const SITE_ADMIN_LOGO_SIDEBAR  = 'https://agencianuvion.com.br/images/logo-horizontal-white.png'; // shown above the sidebar menu — needs a LIGHT logo, sidebar background is dark
const SITE_ADMIN_LOGO_TOPBAR   = 'https://agencianuvion.com.br/images/logo-horizontal-white.png'; // shown top-left of the admin bar, replacing the WordPress logo — also needs a light logo

/**
 * ---------------------------------------------------------------------
 * Admin bar: swap the WordPress logo for the project's own, and drop a
 * couple of default nodes that don't add anything once it's branded.
 * ---------------------------------------------------------------------
 */

/**
 * Replaces the "wp-logo" admin-bar node's icon outright with a plain
 * <img>, instead of fighting WordPress's own CSS for that dashicon-font
 * glyph (its specificity — and even the exact id/wording of the "About
 * WordPress" dropdown items — shifts between WordPress versions, so a CSS
 * override alone isn't durable). Setting the node's own 'title' to our own
 * markup replaces WordPress's icon+label HTML entirely; the dropdown only
 * existed because of ITS child nodes, so those are swept away too (by
 * `parent`, not by a guessed id list, for the same reason).
 */
function site_brand_admin_bar_logo( $wp_admin_bar ) {
	foreach ( $wp_admin_bar->get_nodes() as $node ) {
		if ( isset( $node->parent ) && 'wp-logo' === $node->parent ) {
			$wp_admin_bar->remove_node( $node->id );
		}
	}

	$wp_admin_bar->add_node(
		array(
			'id'    => 'wp-logo',
			'title' => '<img src="' . esc_url( SITE_ADMIN_LOGO_TOPBAR ) . '" alt="' . esc_attr( SITE_NAME ) . '" style="height:18px;width:auto;display:block;margin:7px 0;" />',
			'href'  => home_url( '/' ),
			'meta'  => array( 'title' => SITE_NAME ),
		)
	);
}
add_action( 'admin_bar_menu', 'site_brand_admin_bar_logo', 999 );

/** Drops the "🏠 Site Name" link and the Command Palette trigger — the project logo already sits there once branded, and is meant to be the only thing in that corner. */
function site_trim_admin_bar_branding( $wp_admin_bar ) {
	$wp_admin_bar->remove_node( 'site-name' );
	$wp_admin_bar->remove_node( 'command-palette' );
}
add_action( 'admin_bar_menu', 'site_trim_admin_bar_branding', 999 );

/**
 * ---------------------------------------------------------------------
 * Sidebar: logo + caption above the menu.
 * ---------------------------------------------------------------------
 */

/**
 * WordPress has no filter/hook to inject markup directly above
 * <div id="adminmenu">, so this appends a tiny inline script (admin_footer
 * runs late enough that #adminmenuwrap already exists) that inserts the
 * block itself — styling lives in site_admin_reskin_css()'s
 * #site-sidebar-brand rules below.
 */
function site_admin_sidebar_brand() {
	?>
	<script>
		(function () {
			var wrap = document.getElementById( 'adminmenuwrap' );
			var menu = document.getElementById( 'adminmenu' );
			if ( ! wrap || ! menu ) {
				return;
			}
			var brand = document.createElement( 'div' );
			brand.id = 'site-sidebar-brand';
			brand.innerHTML =
				'<img src="<?php echo esc_url( SITE_ADMIN_LOGO_SIDEBAR ); ?>" alt="<?php echo esc_attr( SITE_NAME ); ?>">' +
				'<span><?php echo esc_js( SITE_ADMIN_CAPTION ); ?></span>';
			wrap.insertBefore( brand, menu );
		})();
	</script>
	<?php
}
add_action( 'admin_footer', 'site_admin_sidebar_brand' );

/**
 * ---------------------------------------------------------------------
 * Colors + full reskin CSS.
 * ---------------------------------------------------------------------
 */

/** CSS custom properties shared by the dashboard reskin and the login screen. */
function site_admin_brand_colors_css() {
	$accent       = SITE_ADMIN_ACCENT_COLOR;
	$accent_hover = '#B54212'; // Nuvion's darker orange hover shade, matching the frontend's CTA hover.
	return "
		:root {
			/* Sidebar + top bar (and the login screen) — stay dark, this is
			   the 'chrome' that carries the brand. */
			--site-bg: #16181c;
			--site-bg-elevated: #1c1e23;
			--site-bg-elevated-2: #26282f;
			--site-bg-elevated-3: #313339;
			--site-border: #313339;
			--site-border-soft: #26282f;
			--site-text: #f1f1f2;
			--site-text-muted: #9a9ea6;
			--site-text-faint: #6d7078;

			/* Everything inside #wpbody-content — light canvas, white cards,
			   dark-on-light text. */
			--site-content-bg: #f2f3f5;
			--site-surface: #ffffff;
			--site-surface-2: #f7f8fa;
			--site-content-border: #e5e7eb;
			--site-content-border-soft: #eef0f2;
			--site-content-text: #20232a;
			--site-content-text-muted: #6b7280;
			--site-content-text-faint: #9aa0a8;
			--site-shadow: 0 1px 2px rgba(16,24,40,.04), 0 2px 6px rgba(16,24,40,.06);

			--site-accent: {$accent};
			--site-accent-soft: {$accent}1f;
			--site-accent-hover: {$accent_hover};
			--site-radius: 12px;
			--site-radius-sm: 7px;
			--site-space-1: 8px;
			--site-space-2: 16px;
			--site-space-3: 24px;
			--site-space-4: 32px;
		}
	";
}

/** A small inline SVG mark for the login screen — no extra asset to host. Swap for a real logo mark if the brand has one; this is a plain generic glyph. */
function site_brand_mark_svg( $stroke_color, $accent_color ) {
	$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
		. '<path d="M25,82 V46 A25,25 0 0 1 75,46 V82" fill="none" stroke="' . $stroke_color . '" stroke-width="15" stroke-linecap="round"/>'
		. '<circle cx="25" cy="82" r="9" fill="' . $accent_color . '"/>'
		. '</svg>';
	return 'data:image/svg+xml;base64,' . base64_encode( $svg );
}

function site_admin_reskin_css() {
	?>
	<style>
		<?php echo site_admin_brand_colors_css(); ?>

		<?php if ( function_exists( 'site_is_client_role' ) && site_is_client_role() ) : ?>
		/* "Edit Profile" isn't its own removable admin-bar node — it's a
		   second <span class="display-name edit-profile"> living INSIDE
		   the same link as the avatar/display-name, under
		   #wp-admin-bar-user-info. Hiding it here is the only way to
		   remove just that line for the restricted client role. */
		#wp-admin-bar-user-info .display-name.edit-profile { display: none !important; }
		<?php endif; ?>

		* { scrollbar-color: var(--site-bg-elevated-3) var(--site-bg); }
		body { background: var(--site-content-bg) !important; color: var(--site-content-text); }

		/* Links inside the light content area — accent is reserved for
		   buttons, the current nav item, and hover/focus, not every link. */
		#wpbody-content a { color: var(--site-content-text-muted); }
		#wpbody-content a:hover, #wpbody-content a:focus { color: var(--site-accent); }

		/* Top admin bar — part of the dark "chrome", like the sidebar. */
		#wpadminbar { background: var(--site-bg-elevated) !important; border-bottom: 1px solid var(--site-border-soft); }
		#wpadminbar .ab-item, #wpadminbar a.ab-item, #wpadminbar > #wp-toolbar span.ab-label, #wpadminbar > #wp-toolbar span.noticon { color: var(--site-text) !important; }
		#wpadminbar .ab-top-menu > li:hover > .ab-item, #wpadminbar .ab-top-menu > li.hover > .ab-item { color: var(--site-accent) !important; background: transparent !important; }
		#wpadminbar .quicklinks .menupop ul.ab-sub-secondary, #wpadminbar .quicklinks .menupop .ab-sub-wrapper { background: var(--site-bg-elevated-2); border-radius: var(--site-radius-sm); overflow: hidden; }
		#wpadminbar .ab-submenu .ab-item { color: var(--site-text-muted) !important; }
		#wpadminbar .ab-submenu li:hover .ab-item, #wpadminbar .ab-submenu .ab-item:hover { color: var(--site-text) !important; background: var(--site-bg-elevated-3) !important; }
		/* The logo itself is a real <img> set on the node's title in PHP,
		   see site_brand_admin_bar_logo(). Just clear the dashicon-font
		   glyph that would otherwise still occupy space next to it. */
		#wp-admin-bar-wp-logo > .ab-item::before,
		#wp-admin-bar-wp-logo .ab-icon::before { content: '' !important; }
		#wp-admin-bar-wp-logo > .ab-item { padding: 0 12px !important; }

		/* Logo + caption above the sidebar menu — see site_admin_sidebar_brand(). */
		#site-sidebar-brand {
			display: flex; flex-direction: column; align-items: center;
			padding: 50px 16px 30px; text-align: center;
		}
		#site-sidebar-brand img { width: 140px; max-width: 100%; height: auto; }
		#site-sidebar-brand span {
			margin-top: 14px; color: var(--site-text-muted);
			font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .12em;
		}
		/* Icon-only "folded" sidebar has no room for the full wordmark + caption. */
		body.folded #site-sidebar-brand { display: none; }

		/* Sidebar menu — dark chrome, current item as a rounded "pill" rather
		   than a full-bleed block, closer to a modern SaaS dashboard nav. */
		#adminmenuback, #adminmenuwrap, #adminmenu { background: var(--site-bg-elevated) !important; border-right: 1px solid var(--site-border-soft); }
		#adminmenu a, #adminmenu a:hover, #adminmenu a:focus, #adminmenu a:active {
			color: var(--site-text-muted) !important; box-shadow: none !important; outline: none !important;
		}
		#adminmenu div.wp-menu-image:before { color: var(--site-text-faint) !important; }
		/* No "overflow: hidden" here on purpose — that clips ANY descendant
		   that needs to render outside this row's own height, which is
		   exactly what the pinned submenu list and the hover flyout both
		   do. Rounding goes on the link itself instead. */
		#adminmenu li.menu-top { margin: 2px 10px; box-shadow: none !important; }
		#adminmenu li.menu-top > a.menu-top { border-radius: var(--site-radius-sm); }
		/* Excludes the CURRENT/pinned section — hovering ANYWHERE inside it
		   also counts as hovering this outer li, so without the exclusion
		   the whole section's background changes together with whichever
		   single link you're actually pointing at, instead of just that
		   link. */
		#adminmenu li.menu-top:not(.wp-has-current-submenu):not(.current):hover,
		#adminmenu li.opensub:not(.wp-has-current-submenu):not(.current) > a.menu-top,
		#adminmenu li:not(.wp-has-current-submenu):not(.current) > a.menu-top:focus {
			background: var(--site-bg-elevated-2) !important; box-shadow: none !important;
		}
		#adminmenu li.menu-top:not(.wp-has-current-submenu):not(.current):hover a,
		#adminmenu li.menu-top:not(.wp-has-current-submenu):not(.current) > a.menu-top:focus,
		#adminmenu li.opensub:not(.wp-has-current-submenu):not(.current) > a.menu-top { color: var(--site-text) !important; }
		#adminmenu li.wp-has-current-submenu, #adminmenu li.current { background: var(--site-bg-elevated-3) !important; border-radius: var(--site-radius-sm); }
		#adminmenu li.wp-has-current-submenu a.wp-has-current-submenu,
		#adminmenu li.current a.menu-top {
			background: transparent !important;
			color: var(--site-text) !important;
			font-weight: 600;
			border-radius: var(--site-radius-sm) var(--site-radius-sm) 0 0;
		}
		#adminmenu li.wp-has-current-submenu div.wp-menu-image:before,
		#adminmenu li.current div.wp-menu-image:before { color: var(--site-accent) !important; }

		/* .wp-submenu — one plain solid background covers both the pinned
		   list under the CURRENT section and the floating flyout popup for
		   any other section (WordPress also fires the flyout-preview
		   behavior when hovering inside an already-pinned list, so
		   anything giving the flyout state special positioning ends up
		   duplicating on top of the pinned list itself). */
		#adminmenu .wp-submenu { background: var(--site-bg-elevated-2) !important; }
		#adminmenu .wp-submenu a { color: var(--site-text-muted) !important; }
		#adminmenu .wp-submenu a:hover, #adminmenu .wp-submenu a:focus { color: var(--site-text) !important; background: var(--site-bg-elevated-3) !important; }
		#adminmenu li.current .wp-submenu a.current { color: var(--site-accent) !important; font-weight: 600; }
		#adminmenu .wp-menu-image img { opacity: .8; }
		#adminmenu .awaiting-mod, #adminmenu .update-plugins { background: var(--site-accent) !important; }
		/* "Collapse Menu" row */
		#collapse-menu, #collapse-menu a.collapse-button-icon, #collapse-button {
			background: transparent !important; color: var(--site-text-faint) !important;
			box-shadow: none !important; outline: none !important;
		}
		#collapse-menu:hover, #collapse-menu a.collapse-button-icon:hover, #collapse-button:hover,
		#collapse-menu a.collapse-button-icon:focus, #collapse-button:focus {
			background: var(--site-bg-elevated-2) !important; color: var(--site-text) !important;
			box-shadow: none !important; outline: none !important;
		}
		#adminmenuback { box-shadow: none; }

		/* Belt-and-suspenders: WordPress's own admin color scheme (default
		   "Fresh", but a user can pick others) drives some hover/focus
		   states with higher specificity than a plain #adminmenu selector
		   can beat — this repeats the important ones scoped under
		   body.wp-admin so they always win. */
		body.wp-admin #adminmenu li.menu-top:not(.wp-has-current-submenu):not(.current):hover,
		body.wp-admin #adminmenu li.opensub:not(.wp-has-current-submenu):not(.current) > a.menu-top,
		body.wp-admin #adminmenu li:not(.wp-has-current-submenu):not(.current) > a.menu-top:focus,
		body.wp-admin #adminmenu a:hover,
		body.wp-admin #adminmenu a:focus,
		body.wp-admin #collapse-menu:hover,
		body.wp-admin #collapse-button:hover,
		body.wp-admin #collapse-button:focus {
			background: var(--site-bg-elevated-2) !important;
			color: var(--site-text) !important;
			box-shadow: none !important;
			outline: none !important;
		}

		/* Sidebar width — wider than WordPress's default 160px. WordPress's
		   own CSS positions the floating (non-pinned) flyout submenu at a
		   hardcoded "left: 160px" to match ITS default width — widening the
		   sidebar without correcting this leaves the flyout starting under
		   the (now wider) sidebar, with only a sliver poking out. */
		@media (min-width: 961px) {
			body:not(.folded) #adminmenuback, body:not(.folded) #adminmenuwrap { width: 240px; }
			body:not(.folded) #wpcontent, body:not(.folded) #wpfooter { margin-left: 240px; }
			body:not(.folded) #adminmenu, body:not(.folded) #adminmenu .wp-submenu { width: auto; }
			body:not(.folded) #adminmenu li.menu-top:not(.wp-has-current-submenu):not(.current):hover .wp-submenu,
			body:not(.folded) #adminmenu li.opensub:not(.wp-has-current-submenu):not(.current) .wp-submenu {
				left: 240px !important;
			}
		}

		/* Page chrome — the light content canvas. */
		#wpbody-content { color: var(--site-content-text); padding-bottom: var(--site-space-4); }
		.wrap { margin-top: var(--site-space-3); }
		.wrap h1.wp-heading-inline, .wrap h1, h1, h2, h3 { color: var(--site-content-text); font-weight: 600; }
		.wrap h1.wp-heading-inline { margin-bottom: var(--site-space-2); }
		#wpcontent, #wpbody { background: var(--site-content-bg); }
		.notice, div.updated, div.error {
			background: var(--site-surface) !important; color: var(--site-content-text); border-left-color: var(--site-accent);
			border-radius: 0 var(--site-radius-sm) var(--site-radius-sm) 0; box-shadow: var(--site-shadow);
		}

		/* Cards / postboxes — white surface, soft shadow instead of a hard border. */
		.postbox, .stuffbox {
			background: var(--site-surface) !important; border: 1px solid var(--site-content-border) !important;
			border-radius: var(--site-radius); box-shadow: var(--site-shadow) !important; overflow: hidden;
		}
		.postbox .hndle, .postbox .postbox-header { background: transparent !important; color: var(--site-content-text) !important; border-color: var(--site-content-border-soft) !important; }
		.postbox .inside { padding: 0 var(--site-space-2) var(--site-space-2); }

		/* Tables */
		.wp-list-table {
			background: var(--site-surface) !important; color: var(--site-content-text);
			border: 1px solid var(--site-content-border) !important; border-radius: var(--site-radius); overflow: hidden;
			box-shadow: var(--site-shadow);
		}
		.wp-list-table th, .wp-list-table td { border-color: var(--site-content-border-soft) !important; color: var(--site-content-text); padding-top: 12px; padding-bottom: 12px; }
		.wp-list-table thead, .wp-list-table tfoot { background: var(--site-surface-2) !important; }
		.wp-list-table thead th, .wp-list-table thead td { color: var(--site-content-text-muted); font-weight: 600; }
		.wp-list-table tbody tr:hover { background: var(--site-surface-2) !important; }
		.wp-list-table a { color: var(--site-content-text-muted); }
		.wp-list-table a:hover { color: var(--site-accent); }
		.wp-list-table .row-title, .wp-list-table a.row-title { color: var(--site-content-text) !important; font-weight: 600; }
		.wp-list-table .row-actions { color: var(--site-content-text-faint); }
		.striped > tbody > :nth-child(odd), ul.striped > :nth-child(odd) { background: var(--site-surface-2) !important; }
		.subsubsub a { color: var(--site-content-text-muted); }
		.subsubsub a.current { color: var(--site-accent); font-weight: 600; }
		.tablenav .tablenav-pages a {
			border-color: var(--site-content-border) !important; color: var(--site-content-text-muted) !important;
			background: var(--site-surface) !important; border-radius: var(--site-radius-sm);
		}
		.tablenav .tablenav-pages .current { border-color: var(--site-accent) !important; background: var(--site-accent) !important; color: #fff !important; }

		/* Forms — WordPress's default .form-table styling assumes a light
		   background, which nearly hides labels on a dark one; this fixes
		   that regardless of theme. */
		.form-table th, .form-table label, label { color: var(--site-content-text) !important; font-weight: 500; }
		.form-table th { padding: var(--site-space-2) var(--site-space-2) var(--site-space-2) 0; }
		.form-table td { padding: var(--site-space-2) 10px; }
		.form-table tr { border-bottom: 1px solid var(--site-content-border-soft); }
		.form-table .description, .description, p.description, span.description { color: var(--site-content-text-faint) !important; }

		input[type=text], input[type=search], input[type=password], input[type=email], input[type=url], input[type=number], input[type=tel], select, textarea {
			background: var(--site-surface) !important; color: var(--site-content-text) !important; border: 1px solid var(--site-content-border) !important;
			border-radius: var(--site-radius-sm) !important; box-shadow: none !important;
		}
		input::placeholder, textarea::placeholder { color: var(--site-content-text-faint) !important; opacity: 1; }
		input:focus, select:focus, textarea:focus { border-color: var(--site-accent) !important; box-shadow: 0 0 0 1px var(--site-accent) !important; }
		input[readonly] { color: var(--site-content-text-muted) !important; background: var(--site-surface-2) !important; }

		/* Buttons — WordPress renders the primary button as class="button
		   button-primary" (both classes together), so the plain ".button"
		   rules below must explicitly exclude ".button-primary" or they'd
		   win on hover (same specificity, later in the stylesheet). */
		.button-primary, .button-primary:hover, .button-primary:focus, .button-primary:active {
			appearance: none !important; -webkit-appearance: none !important;
			background: var(--site-accent) !important; border-color: var(--site-accent) !important; color: #fff !important;
			text-shadow: none !important; box-shadow: none !important; border-radius: var(--site-radius-sm) !important;
			padding: 0 16px; height: 34px; line-height: 32px;
		}
		.button-primary:hover, .button-primary:focus { background: var(--site-accent-hover) !important; border-color: var(--site-accent-hover) !important; }
		.button:not(.button-primary), .button-secondary {
			appearance: none !important; -webkit-appearance: none !important;
			background: var(--site-surface) !important; color: var(--site-content-text) !important; border: 1px solid var(--site-content-border) !important;
			text-shadow: none !important; box-shadow: none !important; border-radius: var(--site-radius-sm) !important;
		}
		.button:not(.button-primary):hover { border-color: var(--site-accent) !important; color: var(--site-accent) !important; }

		/* "Screen Options" / "Help" panel — unstyled by default, renders
		   right above .wrap; would otherwise show up plain white-on-white. */
		#screen-meta-links .screen-options-tab, #screen-meta-links .contextual-help-link {
			background: var(--site-surface) !important; color: var(--site-content-text-muted) !important;
			border: 1px solid var(--site-content-border) !important; border-bottom: none !important;
			border-radius: var(--site-radius-sm) var(--site-radius-sm) 0 0 !important;
		}
		#screen-meta-links .screen-options-tab:hover, #screen-meta-links .contextual-help-link:hover { color: var(--site-accent) !important; }
		#screen-meta {
			background: var(--site-surface) !important; color: var(--site-content-text) !important;
			border: 1px solid var(--site-content-border) !important; border-radius: var(--site-radius-sm) 0 var(--site-radius-sm) var(--site-radius-sm);
			box-shadow: var(--site-shadow);
		}
		#screen-options-wrap h5, #contextual-help-wrap h5,
		#screen-options-wrap legend, #contextual-help-wrap legend { color: var(--site-content-text) !important; font-weight: 600; }
		#screen-options-wrap label, #contextual-help-wrap label, #screen-options-wrap .screen-options { color: var(--site-content-text) !important; }
		#contextual-help-wrap a { color: var(--site-content-text-muted); }
		#contextual-help-tabs { background: var(--site-surface-2) !important; border-color: var(--site-content-border) !important; }
		#contextual-help-tabs a { color: var(--site-content-text-muted) !important; }
		#contextual-help-tabs .active { background: var(--site-surface) !important; }
		#contextual-help-tabs .active a { color: var(--site-content-text) !important; }

		/* ACF field UI — select2 dropdowns (used when a select field has
		   "Stylised UI" on) don't inherit the plain <select> styling above
		   since they render their own markup. Harmless no-op if this
		   project doesn't use ACF/select2 at all. */
		.select2-container--default .select2-selection--single {
			background: var(--site-surface) !important; border: 1px solid var(--site-content-border) !important;
			border-radius: var(--site-radius-sm) !important; height: 32px !important;
		}
		.select2-container--default .select2-selection--single .select2-selection__rendered { color: var(--site-content-text) !important; line-height: 30px !important; }
		.select2-container--default .select2-selection--single .select2-selection__arrow { height: 30px !important; }
		.select2-dropdown { background: var(--site-surface) !important; border-color: var(--site-content-border) !important; }
		.select2-search--dropdown .select2-search__field { background: var(--site-surface) !important; color: var(--site-content-text) !important; border-color: var(--site-content-border) !important; }
		.select2-results__option { color: var(--site-content-text) !important; }
		.select2-container--default .select2-results__option--highlighted[aria-selected] { background: var(--site-accent) !important; color: #fff !important; }
		.acf-field { border-color: var(--site-content-border-soft) !important; }
		.acf-field .acf-label label { color: var(--site-content-text) !important; }
		.acf-field .acf-label p.description { color: var(--site-content-text-faint) !important; }

		/* Footer */
		#wpfooter { color: var(--site-content-text-faint); border-top: 1px solid var(--site-content-border-soft); }
	</style>
	<?php
}
add_action( 'admin_head', 'site_admin_reskin_css' );

/**
 * ---------------------------------------------------------------------
 * Login screen — same dark chrome + accent, so it doesn't look like a
 * different, unbranded product from the dashboard it leads into.
 * ---------------------------------------------------------------------
 */
function site_login_reskin_css() {
	$mark = site_brand_mark_svg( '#f1f1f2', SITE_ADMIN_ACCENT_COLOR );
	?>
	<style>
		<?php echo site_admin_brand_colors_css(); ?>

		body.login { background: var(--site-bg) !important; }
		body.login #login h1 a {
			background-image: url('<?php echo esc_attr( $mark ); ?>') !important;
			background-size: 80px auto;
			width: 80px; height: 80px;
			margin: 0 auto 20px;
		}
		.login form { background: var(--site-bg-elevated) !important; border: 1px solid var(--site-border); box-shadow: none !important; border-radius: 8px; }
		.login label { color: var(--site-text) !important; }
		.login form .input, .login input[type=text], .login input[type=password] { background: var(--site-bg) !important; color: var(--site-text) !important; border-color: var(--site-border) !important; }
		.login .button-primary { background: var(--site-accent) !important; border-color: var(--site-accent) !important; text-shadow: none !important; box-shadow: none !important; }
		.login .button-primary:hover { background: var(--site-accent-hover) !important; border-color: var(--site-accent-hover) !important; }
		.login #nav a, .login #backtoblog a { color: var(--site-text-muted) !important; }
		.login #nav a:hover, .login #backtoblog a:hover { color: var(--site-accent) !important; }
		.login .message, .login #login_error { background: var(--site-bg-elevated) !important; color: var(--site-text) !important; border-left-color: var(--site-accent) !important; }
	</style>
	<?php
}
add_action( 'login_enqueue_scripts', 'site_login_reskin_css' );

add_filter( 'login_headerurl', function () { return home_url( '/' ); } );
add_filter( 'login_headertext', function () { return SITE_NAME; } );

// Drop the "Thank you for creating with WordPress." / version footer — this admin doesn't need to read as a stock WordPress install.
add_filter( 'admin_footer_text', '__return_empty_string' );
add_filter( 'update_footer', '__return_empty_string', 11 );
