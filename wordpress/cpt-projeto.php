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
				// title + photo only: the description and the other fields are in fields-projeto.php's meta box.
				'supports'           => array( 'title', 'thumbnail' ),
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
