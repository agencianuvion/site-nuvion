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
