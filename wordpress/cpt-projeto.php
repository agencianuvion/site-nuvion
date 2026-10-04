<?php
/**
 * "Projetos" — the portfolio (Portfólio page, home slider, proof strips). Registration + the "Segmentos" taxonomy;
 * the fields live in fields-projeto.php.
 *
 * Title = company name. Featured image = the photo of the site (notebook + phone mockup, landscape, 1800px wide or
 * more). The publish DATE is meaningful: the Portfólio highlights the most recent project that has the "Destaque"
 * switch on.
 *
 * Usage: drop into wp-content/mu-plugins/. Needs 00-site-helpers.php.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'init',
	function () {
		register_post_type(
			'projeto',
			array(
				'label'              => 'Projetos',
				'labels'             => array(
					'name'                  => 'Projetos',
					'singular_name'         => 'Projeto',
					'add_new'               => 'Adicionar projeto',
					'add_new_item'          => 'Adicionar projeto',
					'edit_item'             => 'Editar projeto',
					'new_item'              => 'Novo projeto',
					'search_items'          => 'Buscar projetos',
					'not_found'             => 'Nenhum projeto cadastrado.',
					'featured_image'        => 'Foto do projeto',
					'set_featured_image'    => 'Escolher a foto do projeto',
					'remove_featured_image' => 'Remover a foto',
					'use_featured_image'    => 'Usar como foto do projeto',
					'enter_title_here'      => 'Nome da empresa',
				),
				'public'             => false,
				'publicly_queryable' => false,
				'show_ui'            => true,
				'show_in_rest'       => true,
				'rest_base'          => 'projetos',
				'menu_icon'          => 'dashicons-portfolio',
				'menu_position'      => 20,
				// title + photo + "Ordem" (the order of the home slider and the strips); the other fields are in fields-projeto.php's meta box.
				'supports'           => array( 'title', 'thumbnail', 'page-attributes' ),
			)
		);

		register_taxonomy(
			'segmento',
			'projeto',
			array(
				'label'             => 'Segmentos',
				'labels'            => array(
					'name'          => 'Segmentos',
					'singular_name' => 'Segmento',
					'add_new_item'  => 'Adicionar segmento',
					'edit_item'     => 'Editar segmento',
					'search_items'  => 'Buscar segmentos',
				),
				'public'            => false,
				'show_ui'           => true,
				'hierarchical'      => true,
				'show_admin_column' => true,
				'show_in_rest'      => true,
				'rest_base'         => 'segmento',
			)
		);
	}
);

site_watch_post_type( 'projeto' );
site_thumb_column( 'projeto', 'Foto' );

// Renaming / adding / removing a segment changes the filter chips of the portfolio.
foreach ( array( 'created_segmento', 'edited_segmento', 'delete_segmento' ) as $site_seg_hook ) {
	add_action(
		$site_seg_hook,
		function () use ( $site_seg_hook ) {
			if ( function_exists( 'site_request_deploy' ) ) {
				site_request_deploy( 0, $site_seg_hook );
			}
		}
	);
}

/** The list shows the projects in the site's order ("Ordem", then newest first) unless the admin picks another sort. */
add_action(
	'pre_get_posts',
	function ( $q ) {
		if ( is_admin() && $q->is_main_query() && 'projeto' === $q->get( 'post_type' ) && ! isset( $_GET['orderby'] ) ) {
			$q->set( 'orderby', array( 'menu_order' => 'ASC', 'date' => 'DESC' ) );
		}
	}
);

/* ---------------------------------------------------------------------- *
 * Admin list — drag the rows to reorder ("Ordem"), instead of typing a number on each project's own edit screen.
 * Only on the default, unfiltered view: that is the one list that shows every project in a row, in one sequence —
 * a search or a filtered view only shows some of them, and dragging those couldn't produce a meaningful order.
 * ---------------------------------------------------------------------- */

add_action(
	'admin_enqueue_scripts',
	function ( $hook ) {
		if ( 'edit.php' !== $hook || 'projeto' !== ( $_GET['post_type'] ?? '' ) ) {
			return;
		}
		if ( ! empty( $_GET['orderby'] ) || ! empty( $_GET['s'] ) || ! empty( $_GET['segmento'] ) || ( isset( $_GET['site_featured'] ) && '' !== $_GET['site_featured'] ) || (int) ( $_GET['paged'] ?? 1 ) > 1 ) {
			return;
		}
		wp_enqueue_script( 'jquery-ui-sortable' );
		wp_add_inline_script(
			'jquery-ui-sortable',
			'(function ($) {
				$(function () {
					var $list = $("#the-list");
					if (!$list.length) { return; }
					$list.sortable({
						items: "tr",
						axis: "y",
						cancel: "a, input, button",
						opacity: 0.6,
						placeholder: "site-drag-placeholder",
						forcePlaceholderSize: true,
						update: function () {
							var ids = $list.children("tr").map(function () {
								return parseInt(String(this.id).replace("post-", ""), 10);
							}).get().filter(function (n) { return ! isNaN(n); });
							$list.addClass("site-reordering");
							$.post(ajaxurl, { action: "site_reorder_projetos", nonce: "' . esc_js( wp_create_nonce( 'site_reorder_projetos' ) ) . '", ids: ids } )
								.always(function () { $list.removeClass("site-reordering"); });
						}
					});
				});
			})(jQuery);'
		);
		wp_add_inline_style(
			'wp-admin',
			'#the-list tr{cursor:move}#the-list.site-reordering{opacity:.5;pointer-events:none}.site-drag-placeholder{background:#f0f6fc;border:1px dashed #2271b1}'
		);
	}
);

add_action(
	'wp_ajax_site_reorder_projetos',
	function () {
		check_ajax_referer( 'site_reorder_projetos', 'nonce' );
		$ids = array_map( 'absint', (array) ( $_POST['ids'] ?? array() ) );
		foreach ( $ids as $i => $id ) {
			if ( $id && 'projeto' === get_post_type( $id ) && current_user_can( 'edit_post', $id ) ) {
				wp_update_post( array( 'ID' => $id, 'menu_order' => $i + 1 ) );
			}
		}
		wp_send_json_success();
	}
);
