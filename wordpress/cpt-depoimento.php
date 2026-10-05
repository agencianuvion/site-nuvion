<?php
/**
 * "Depoimentos" — client testimonials (home, Sobre Nós). Registration only; the fields live in fields-depoimento.php.
 *
 * Title = the person's name. Featured image = optional photo (the round avatar on the card). "Ordem" (page
 * attributes) = position in the slider.
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
			'depoimento',
			array(
				'label'              => 'Depoimentos',
				'labels'             => array(
					'name'                  => 'Depoimentos',
					'singular_name'         => 'Depoimento',
					'add_new'               => 'Adicionar depoimento',
					'add_new_item'          => 'Adicionar depoimento',
					'edit_item'             => 'Editar depoimento',
					'new_item'              => 'Novo depoimento',
					'search_items'          => 'Buscar depoimentos',
					'not_found'             => 'Nenhum depoimento cadastrado.',
					'featured_image'        => 'Foto da pessoa',
					'set_featured_image'    => 'Escolher a foto (opcional)',
					'remove_featured_image' => 'Remover a foto',
					'use_featured_image'    => 'Usar como foto',
					'enter_title_here'      => 'Nome da pessoa',
				),
				'public'             => false,
				'publicly_queryable' => false,
				'show_ui'            => true,
				'show_in_rest'       => true,
				'rest_base'          => 'depoimentos',
				'menu_icon'          => 'dashicons-format-quote',
				'menu_position'      => 22,
				'supports'           => array( 'title', 'thumbnail', 'page-attributes' ),
			)
		);
	}
);

site_watch_post_type( 'depoimento' );

/** The list shows the testimonials in slider order unless the admin picks another sort. */
add_action(
	'pre_get_posts',
	function ( $q ) {
		if ( is_admin() && $q->is_main_query() && 'depoimento' === $q->get( 'post_type' ) && ! isset( $_GET['orderby'] ) ) {
			$q->set( 'orderby', array( 'menu_order' => 'ASC', 'date' => 'DESC' ) );
		}
	}
);

/* ---------------------------------------------------------------------- *
 * Admin list — drag the rows to reorder ("Ordem"), instead of typing a number on each testimonial's own edit
 * screen. Same mechanism as Projetos (cpt-projeto.php) — see that file's comment for the full reasoning. Only on
 * the default, unfiltered view: that is the one list that shows every testimonial in a row, in one sequence.
 * ---------------------------------------------------------------------- */

add_action(
	'admin_enqueue_scripts',
	function ( $hook ) {
		if ( 'edit.php' !== $hook || 'depoimento' !== ( $_GET['post_type'] ?? '' ) ) {
			return;
		}
		if ( ! empty( $_GET['orderby'] ) || ! empty( $_GET['s'] ) || (int) ( $_GET['paged'] ?? 1 ) > 1 ) {
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
							$.post(ajaxurl, { action: "site_reorder_depoimentos", nonce: "' . esc_js( wp_create_nonce( 'site_reorder_depoimentos' ) ) . '", ids: ids } )
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
	'wp_ajax_site_reorder_depoimentos',
	function () {
		check_ajax_referer( 'site_reorder_depoimentos', 'nonce' );
		$ids = array_map( 'absint', (array) ( $_POST['ids'] ?? array() ) );
		foreach ( $ids as $i => $id ) {
			if ( $id && 'depoimento' === get_post_type( $id ) && current_user_can( 'edit_post', $id ) ) {
				wp_update_post( array( 'ID' => $id, 'menu_order' => $i + 1 ) );
			}
		}
		wp_send_json_success();
	}
);
