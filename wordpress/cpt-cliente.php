<?php
/**
 * "Clientes" — the logos of the companies the agency worked for (home marquee, Sobre Nós, Depoimentos).
 *
 * Deliberately tiny: title = company name, featured image = the logo, "Ordem" (page attributes) = position in the
 * marquee. So registration and the REST field live in this one file (the split into cpt-/fields- files pays off only
 * when a type has a meta box).
 *
 * The logos are WHITE on a transparent background (they sit on dark cards on the site).
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
			'cliente',
			array(
				'label'              => 'Clientes',
				'labels'             => array(
					'name'                  => 'Clientes',
					'singular_name'         => 'Cliente',
					'add_new'               => 'Adicionar cliente',
					'add_new_item'          => 'Adicionar cliente',
					'edit_item'             => 'Editar cliente',
					'new_item'              => 'Novo cliente',
					'search_items'          => 'Buscar clientes',
					'not_found'             => 'Nenhum cliente cadastrado.',
					'featured_image'        => 'Logo do cliente',
					'set_featured_image'    => 'Escolher o logo (branco, fundo transparente)',
					'remove_featured_image' => 'Remover o logo',
					'use_featured_image'    => 'Usar como logo',
				),
				'public'             => false,
				'publicly_queryable' => false,
				'show_ui'            => true,
				'show_in_rest'       => true,
				'rest_base'          => 'clientes',
				'menu_icon'          => 'dashicons-groups',
				'menu_position'      => 21,
				// title + logo + "Ordem" — nothing else to fill in.
				'supports'           => array( 'title', 'thumbnail', 'page-attributes' ),
			)
		);
	}
);

site_watch_post_type( 'cliente' );
site_thumb_column( 'cliente', 'Logo' );

/** The list shows the clients in marquee order unless the admin picks another sort. */
add_action(
	'pre_get_posts',
	function ( $q ) {
		if ( is_admin() && $q->is_main_query() && 'cliente' === $q->get( 'post_type' ) && ! isset( $_GET['orderby'] ) ) {
			$q->set( 'orderby', array( 'menu_order' => 'ASC', 'title' => 'ASC' ) );
		}
	}
);

add_action(
	'edit_form_after_title',
	function ( $post ) {
		if ( 'cliente' === $post->post_type ) {
			echo '<p class="description" style="margin:8px 0 0">Título = nome da empresa. Logo = imagem destacada (à direita), em <strong>branco com fundo transparente</strong> (PNG ou WebP). A posição no carrossel é o campo <strong>Ordem</strong>, na caixa "Atributos" (menor número aparece primeiro; empate, ordem alfabética).</p>';
		}
	}
);

add_action(
	'rest_api_init',
	function () {
		register_rest_field(
			'cliente',
			'fields',
			array(
				'get_callback' => function ( $post_arr ) {
					return array(
						'logo' => site_img_data( get_post_thumbnail_id( (int) $post_arr['id'] ) ),
					);
				},
				'schema'       => null,
			)
		);
	}
);
