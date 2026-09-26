<?php
/**
 * Fields for "Projetos" — native meta box + a resolved REST node (no fields plugin), same pattern as the starter's
 * fields-example.php (meta box → save_post → register_rest_field), plus its "featured" switch (side box + list column).
 *
 *   url          address of the live site (the portfolio shows the host, e.g. "exemplo.com.br", under "Ver site")
 *   description  rich text (numbers, lists, links). EMPTY = nothing is shown for the description
 *   featured     "Destaque" switch: the portfolio highlights the most recent featured project
 *
 * REST: GET /wp-json/wp/v2/projetos?per_page=100 → each item has `date`, `slug`, `title.rendered`, and
 * `fields: { url, description, featured, segment: {slug, name}, image: {url, width, height, alt, srcset} }`.
 *
 * Usage: drop into wp-content/mu-plugins/, alongside cpt-projeto.php. Needs 00-site-helpers.php + auto-deploy.php.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'add_meta_boxes',
	function () {
		add_meta_box( 'site_projeto_fields', 'Dados do projeto', 'site_projeto_fields_box', 'projeto', 'normal', 'high' );
		add_meta_box( 'site_projeto_featured', 'Destaque', 'site_projeto_featured_box', 'projeto', 'side', 'high' );
	}
);

/** Side box: the "featured" switch. Saved by the main save handler below (same form, same nonce). */
function site_projeto_featured_box( $post ) {
	$on = (int) get_post_meta( $post->ID, 'featured', true );
	?>
	<style>
		#site_projeto_featured .site-switch { display: flex; align-items: center; gap: 12px; cursor: pointer; margin: 0; }
		#site_projeto_featured .site-switch input { position: absolute; opacity: 0; pointer-events: none; }
		#site_projeto_featured .site-switch-track { position: relative; flex: 0 0 auto; width: 44px; height: 24px; border-radius: 999px; background: #c3c4c7; transition: background .2s ease; }
		#site_projeto_featured .site-switch-track::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .2s ease; }
		#site_projeto_featured .site-switch input:checked + .site-switch-track { background: var(--site-accent, #2271b1); }
		#site_projeto_featured .site-switch input:checked + .site-switch-track::after { transform: translateX(20px); }
		#site_projeto_featured .site-switch input:focus-visible + .site-switch-track { outline: 2px solid var(--site-accent, #2271b1); outline-offset: 2px; }
		#site_projeto_featured .site-switch-label { font-weight: 600; }
		#site_projeto_featured .site-help { margin: 10px 0 0; color: #646970; font-size: 12px; }
	</style>
	<label class="site-switch">
		<input type="checkbox" name="site_featured" value="1" <?php checked( $on, 1 ); ?>>
		<span class="site-switch-track" aria-hidden="true"></span>
		<span class="site-switch-label">Projeto em destaque</span>
	</label>
	<p class="site-help">O Portfólio destaca o projeto em destaque mais recente (pela data de publicação).</p>
	<?php
}

function site_projeto_fields_box( $post ) {
	wp_nonce_field( 'site_save_projeto_fields', 'site_projeto_fields_nonce' );
	$url = get_post_meta( $post->ID, 'site_url', true );
	?>
	<style>
		#site_projeto_fields .site-f { margin: 0 0 22px; }
		#site_projeto_fields .site-f:last-child { margin-bottom: 0; }
		#site_projeto_fields .site-f > label { display: block; font-weight: 600; margin-bottom: 6px; }
		#site_projeto_fields .site-f input[type=url] { width: 100%; }
		#site_projeto_fields .description { margin: 6px 0 0; color: #646970; }
	</style>
	<div class="site-f">
		<label for="site_projeto_url">Endereço do site</label>
		<input type="url" id="site_projeto_url" name="site_projeto_url" value="<?php echo esc_attr( $url ); ?>" placeholder="https://www.empresa.com.br">
		<p class="description">Abre no botão "Ver site". O portfólio mostra só o domínio (ex.: empresa.com.br).</p>
	</div>
	<div class="site-f">
		<label>Descrição do projeto</label>
		<?php wp_editor( get_post_meta( $post->ID, 'description', true ), 'site_projeto_description', array( 'textarea_rows' => 12, 'media_buttons' => false ) ); ?>
		<p class="description">Quem é o cliente, o desafio e o que a Nuvion construiu. Aceita títulos, listas, números em negrito e links. Vazia, nenhum texto aparece no site.</p>
	</div>
	<p class="description">A foto do projeto é a imagem destacada (à direita), horizontal, com 1800 px de largura ou mais. O texto alternativo é o "Texto alternativo" da imagem na biblioteca de mídia; se estiver vazio, o site usa "Site da &lt;empresa&gt;".</p>
	<?php
}

add_action(
	'save_post_projeto',
	function ( $post_id ) {
		if ( ! isset( $_POST['site_projeto_fields_nonce'] ) || ! wp_verify_nonce( $_POST['site_projeto_fields_nonce'], 'site_save_projeto_fields' ) ) {
			return;
		}
		if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		update_post_meta( $post_id, 'site_url', esc_url_raw( wp_unslash( $_POST['site_projeto_url'] ?? '' ) ) );
		// wp_kses_post: it came out of wp_editor(), so it is HTML — restricted to what post content itself allows.
		update_post_meta( $post_id, 'description', wp_kses_post( wp_unslash( $_POST['site_projeto_description'] ?? '' ) ) );
		update_post_meta( $post_id, 'featured', empty( $_POST['site_featured'] ) ? 0 : 1 );
	}
);

/* ---------------------------------------------------------------------- *
 * Post list — "Destaque" column with an inline switch (AJAX), and a filter.
 * The switch never goes through the editor, so it calls site_request_deploy() itself.
 * ---------------------------------------------------------------------- */

add_filter(
	'manage_projeto_posts_columns',
	function ( $cols ) {
		$out = array();
		foreach ( $cols as $k => $v ) {
			$out[ $k ] = $v;
			if ( 'title' === $k ) {
				$out['site_featured'] = 'Destaque';
			}
		}
		return $out;
	}
);

add_action(
	'manage_projeto_posts_custom_column',
	function ( $col, $post_id ) {
		if ( 'site_featured' === $col ) {
			printf(
				'<label class="site-switch-list" title="Projeto em destaque"><input type="checkbox" class="site-featured-toggle" data-id="%d" %s><span class="site-switch-track" aria-hidden="true"></span><span class="screen-reader-text">Destaque</span></label>',
				(int) $post_id,
				checked( (int) get_post_meta( $post_id, 'featured', true ), 1, false )
			);
		}
	},
	10,
	2
);

add_action(
	'restrict_manage_posts',
	function ( $post_type ) {
		if ( 'projeto' !== $post_type ) {
			return;
		}
		$cur = isset( $_GET['site_featured'] ) ? sanitize_key( wp_unslash( $_GET['site_featured'] ) ) : '';
		?>
		<select name="site_featured">
			<option value="">Destaque: todos</option>
			<option value="1" <?php selected( $cur, '1' ); ?>>Em destaque</option>
			<option value="0" <?php selected( $cur, '0' ); ?>>Sem destaque</option>
		</select>
		<?php
	}
);

add_action(
	'pre_get_posts',
	function ( $q ) {
		if ( ! is_admin() || ! $q->is_main_query() || 'projeto' !== $q->get( 'post_type' ) ) {
			return;
		}
		$v = isset( $_GET['site_featured'] ) ? sanitize_key( wp_unslash( $_GET['site_featured'] ) ) : '';
		if ( '1' === $v ) {
			$q->set( 'meta_query', array( array( 'key' => 'featured', 'value' => '1' ) ) );
		} elseif ( '0' === $v ) {
			// "Sem destaque" must also match projects where the meta was never saved.
			$q->set(
				'meta_query',
				array(
					'relation' => 'OR',
					array( 'key' => 'featured', 'compare' => 'NOT EXISTS' ),
					array( 'key' => 'featured', 'value' => '1', 'compare' => '!=' ),
				)
			);
		}
	}
);

add_action(
	'wp_ajax_site_toggle_featured',
	function () {
		check_ajax_referer( 'site_featured_toggle', 'nonce' );
		$id = (int) ( $_POST['id'] ?? 0 );
		if ( ! $id || 'projeto' !== get_post_type( $id ) || ! current_user_can( 'edit_post', $id ) ) {
			wp_send_json_error( null, 403 );
		}
		$on = empty( $_POST['on'] ) ? 0 : 1;
		update_post_meta( $id, 'featured', $on );
		if ( 'publish' === get_post_status( $id ) && function_exists( 'site_request_deploy' ) ) {
			site_request_deploy( $id, 'featured_toggle:#' . $id );
		}
		wp_send_json_success( array( 'on' => $on ) );
	}
);

add_action(
	'admin_footer-edit.php',
	function () {
		if ( 'projeto' !== get_post_type() ) {
			return;
		}
		?>
		<style>
			.column-site_featured { width: 110px; }
			.site-switch-list { display: inline-flex; align-items: center; cursor: pointer; margin: 4px 0 0; }
			.site-switch-list input { position: absolute; opacity: 0; pointer-events: none; }
			.site-switch-list .site-switch-track { position: relative; width: 40px; height: 22px; border-radius: 999px; background: #c3c4c7; transition: background .2s ease; }
			.site-switch-list .site-switch-track::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .2s ease; }
			.site-switch-list input:checked + .site-switch-track { background: var(--site-accent, #2271b1); }
			.site-switch-list input:checked + .site-switch-track::after { transform: translateX(18px); }
			.site-switch-list input:focus-visible + .site-switch-track { outline: 2px solid var(--site-accent, #2271b1); outline-offset: 2px; }
			.site-switch-list.is-busy { opacity: .5; pointer-events: none; }
		</style>
		<script>
			document.addEventListener( 'change', function ( ev ) {
				var box = ev.target;
				if ( ! box.classList || ! box.classList.contains( 'site-featured-toggle' ) ) { return; }
				var label = box.closest( '.site-switch-list' );
				var want = box.checked;
				label.classList.add( 'is-busy' );
				var body = new URLSearchParams( {
					action: 'site_toggle_featured',
					nonce: '<?php echo esc_js( wp_create_nonce( 'site_featured_toggle' ) ); ?>',
					id: box.dataset.id,
					on: want ? '1' : '0'
				} );
				fetch( ajaxurl, { method: 'POST', credentials: 'same-origin', body: body } )
					.then( function ( r ) { return r.json(); } )
					.then( function ( j ) { if ( ! j.success ) { throw new Error( 'fail' ); } } )
					.catch( function () { box.checked = ! want; alert( 'Não foi possível salvar. Tente de novo.' ); } )
					.finally( function () { label.classList.remove( 'is-busy' ); } );
			} );
		</script>
		<?php
	}
);

/* ---------------------------------------------------------------------- *
 * REST — one resolved "fields" node.
 * ---------------------------------------------------------------------- */

add_action(
	'rest_api_init',
	function () {
		register_rest_field(
			'projeto',
			'fields',
			array(
				'get_callback' => function ( $post_arr ) {
					$id    = (int) $post_arr['id'];
					$terms = get_the_terms( $id, 'segmento' );
					$term  = ( is_array( $terms ) && $terms ) ? $terms[0] : null;
					$image = site_img_data( get_post_thumbnail_id( $id ), true );
					if ( $image && '' === $image['alt'] ) {
						$image['alt'] = 'Site da ' . get_the_title( $id );
					}
					return array(
						'url'         => (string) get_post_meta( $id, 'site_url', true ),
						// wpautop() turns the editor's plain line breaks into real <p> tags.
						'description' => wpautop( (string) get_post_meta( $id, 'description', true ) ),
						'featured'    => (bool) get_post_meta( $id, 'featured', true ),
						'segment'     => $term ? array( 'slug' => $term->slug, 'name' => $term->name ) : null,
						'image'       => $image,
					);
				},
				'schema'       => null,
			)
		);
	}
);
