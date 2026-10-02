<?php
/**
 * Fields for "Projetos" — native meta box + a resolved REST node (no fields plugin), same pattern as the starter's
 * fields-example.php (meta box → save_post → register_rest_field), plus its "featured" switch (side box + list column).
 *
 *   subtitle     one line under the company name in the portfolio. EMPTY = nothing is shown
 *   url          address of the live site (the portfolio shows the host, e.g. "exemplo.com.br", under "Ver site")
 *   description  rich text (numbers, lists, links), the full case on the Portfolio page. EMPTY = nothing is shown
 *   summary      plain text, 1-2 sentences for the home card (which has no room for headings/lists). EMPTY = the
 *                home falls back to the start of `description` with its tags stripped, which used to be the only
 *                option and reads badly when the description actually uses headings/bold
 *   results      repeater: the project's own numbers (prefix, number, suffix, label), counters under the text. EMPTY = no strip
 *   video_id     optional featured video (media library attachment): plays instead of the photo, portfolio only
 *   featured     "Destaque" switch: the portfolio highlights the most recent featured project
 *
 * REST: GET /wp-json/wp/v2/projetos?per_page=100 → each item has `date`, `slug`, `title.rendered`, and
 * `fields: { subtitle, summary, video: {url, type} | null, url, description, results: [{count, decimals, prefix, suffix, label}], featured, segment: {slug, name},
 * image: {url, width, height, alt, srcset} }`.
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

// the "Vídeo em destaque" picker uses the media library modal
add_action(
	'admin_enqueue_scripts',
	function () {
		$screen = get_current_screen();
		if ( $screen && 'projeto' === $screen->post_type && 'post' === $screen->base ) {
			wp_enqueue_media();
		}
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
	$url      = get_post_meta( $post->ID, 'site_url', true );
	$subtitle = get_post_meta( $post->ID, 'subtitle', true );
	$summary  = get_post_meta( $post->ID, 'summary', true );
	$results  = site_projeto_results( $post->ID );
	$video_id = (int) get_post_meta( $post->ID, 'video_id', true );
	$video    = $video_id ? wp_get_attachment_url( $video_id ) : '';
	?>
	<style>
		#site_projeto_fields .site-f { margin: 0 0 22px; }
		#site_projeto_fields .site-f:last-child { margin-bottom: 0; }
		#site_projeto_fields .site-f > label { display: block; font-weight: 600; margin-bottom: 6px; }
		#site_projeto_fields .site-f input[type=url],
		#site_projeto_fields .site-f input.site-wide { width: 100%; }
		#site_projeto_fields .description { margin: 6px 0 0; color: #646970; }
		#site_projeto_fields .site-rs-head,
		#site_projeto_fields .site-rs-row { display: grid; grid-template-columns: 70px 110px 70px minmax(0, 1fr) 32px; gap: 8px; align-items: center; }
		#site_projeto_fields .site-rs-head { margin-bottom: 4px; font-size: 12px; color: #646970; }
		#site_projeto_fields .site-rs-row { margin-bottom: 8px; }
		#site_projeto_fields .site-rs-row input { width: 100%; }
		#site_projeto_fields .site-rs-del { padding: 0; width: 32px; min-height: 30px; line-height: 1; }
		#site_projeto_fields .site-video { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
		#site_projeto_fields .site-video video { display: block; width: 320px; max-width: 100%; border-radius: 6px; background: #000; }
		#site_projeto_fields .site-video video:not([src]),
		#site_projeto_fields .site-video video[src=""] { display: none; }
	</style>
	<div class="site-f">
		<label for="site_projeto_subtitle">Subtítulo</label>
		<input type="text" class="site-wide" id="site_projeto_subtitle" name="site_projeto_subtitle" value="<?php echo esc_attr( $subtitle ); ?>" maxlength="140" placeholder="Ex.: Imobiliária de alto padrão em Florianópolis">
		<p class="description">Uma linha curta embaixo do nome da empresa, no Portfólio. Vazio, nada aparece.</p>
	</div>
	<div class="site-f">
		<label for="site_projeto_url">Endereço do site</label>
		<input type="url" id="site_projeto_url" name="site_projeto_url" value="<?php echo esc_attr( $url ); ?>" placeholder="https://www.empresa.com.br">
		<p class="description">Abre no botão "Ver site". O portfólio mostra só o domínio (ex.: empresa.com.br).</p>
	</div>
	<div class="site-f">
		<label>Descrição do projeto</label>
		<?php wp_editor( get_post_meta( $post->ID, 'description', true ), 'site_projeto_description', array( 'textarea_rows' => 12, 'media_buttons' => false ) ); ?>
		<p class="description">Quem é o cliente, o desafio e o que a Nuvion construiu. Aceita títulos, listas, números em negrito e links. Aparece inteira, formatada, na página do Portfólio. Vazia, nenhum texto aparece no site.</p>
	</div>
	<div class="site-f">
		<label for="site_projeto_summary">Resumo (para o card da home)</label>
		<textarea class="site-wide" id="site_projeto_summary" name="site_projeto_summary" rows="3" maxlength="220" placeholder="Um texto corrido de 1-2 frases, sem títulos nem listas."><?php echo esc_textarea( $summary ); ?></textarea>
		<p class="description">Texto corrido (sem formatação) mostrado no cartão deste projeto na home. Vazio, a home usa o começo da descrição acima, sem a formatação (títulos e negrito não aparecem ali por falta de espaço).</p>
	</div>
	<div class="site-f">
		<label>Resultados do projeto</label>
		<div class="site-rs-head" aria-hidden="true"><span>Antes</span><span>Número</span><span>Depois</span><span>Legenda</span><span></span></div>
		<div class="site-rs-list">
			<?php
			foreach ( $results as $r ) {
				site_projeto_result_row( $r );
			}
			?>
		</div>
		<template id="site-rs-tpl"><?php site_projeto_result_row( array() ); ?></template>
		<button type="button" class="button" id="site-rs-add">+ Adicionar número</button>
		<p class="description">Os números aparecem como contadores embaixo do texto, no Portfólio (no máximo 4, numa linha só). Ex.: <code>+</code> <code>120</code> <code>%</code> "em visitas orgânicas"; <code>3</code> <code>x</code> "mais contatos". O número aceita vírgula (4,8). Linhas sem número ou sem legenda são ignoradas; sem nenhum número, a faixa não aparece.</p>
	</div>
	<div class="site-f">
		<label>Vídeo em destaque (opcional)</label>
		<div class="site-video">
			<video src="<?php echo esc_url( $video ); ?>" muted loop playsinline controls preload="metadata"></video>
			<input type="hidden" name="site_projeto_video" id="site_projeto_video" value="<?php echo $video_id ? (int) $video_id : ''; ?>">
			<button type="button" class="button" id="site-video-pick"><?php echo $video ? 'Trocar vídeo' : 'Escolher vídeo'; ?></button>
			<button type="button" class="button-link-delete" id="site-video-del" <?php echo $video ? '' : 'hidden'; ?>>Remover vídeo</button>
		</div>
		<p class="description">Só no Portfólio: no lugar da foto, toca sozinho, sem som e em loop; ao clicar, abre ampliado. A imagem destacada continua obrigatória (é a capa do vídeo e a foto da home e das faixas). Use MP4 (H.264), 10 a 30 segundos, sem áudio, com 1280 px de largura e até uns 8 MB.</p>
	</div>
	<script>
		( function () {
			var input = document.getElementById( 'site_projeto_video' );
			var video = document.querySelector( '#site_projeto_fields .site-video video' );
			var pick = document.getElementById( 'site-video-pick' );
			var del = document.getElementById( 'site-video-del' );
			var frame;
			pick.addEventListener( 'click', function () {
				if ( ! frame ) {
					frame = wp.media( { title: 'Vídeo em destaque', button: { text: 'Usar este vídeo' }, library: { type: 'video' }, multiple: false } );
					frame.on( 'select', function () {
						var a = frame.state().get( 'selection' ).first().toJSON();
						input.value = a.id;
						video.src = a.url;
						pick.textContent = 'Trocar vídeo';
						del.hidden = false;
					} );
				}
				frame.open();
			} );
			del.addEventListener( 'click', function () {
				input.value = '';
				video.removeAttribute( 'src' );
				video.load();
				pick.textContent = 'Escolher vídeo';
				del.hidden = true;
			} );
		} )();
	</script>
	<script>
		( function () {
			var list = document.querySelector( '#site_projeto_fields .site-rs-list' );
			var tpl = document.getElementById( 'site-rs-tpl' );
			var add = document.getElementById( 'site-rs-add' );
			var MAX = <?php echo (int) SITE_PROJETO_RESULTS_MAX; ?>;
			// at most MAX numbers: the button switches off (and says why) once the list is full
			function limit() {
				var full = list.children.length >= MAX;
				add.disabled = full;
				add.textContent = full ? 'Máximo de ' + MAX + ' números' : '+ Adicionar número';
			}
			add.addEventListener( 'click', function () {
				if ( list.children.length >= MAX ) { return; }
				list.appendChild( tpl.content.cloneNode( true ) );
				list.lastElementChild.querySelector( 'input[name$="[count][]"]' ).focus();
				limit();
			} );
			list.addEventListener( 'click', function ( e ) {
				var del = e.target.closest( '.site-rs-del' );
				if ( del ) { del.closest( '.site-rs-row' ).remove(); limit(); }
			} );
			limit();
		} )();
	</script>
	<p class="description">A foto do projeto é a imagem destacada (à direita), horizontal, com 1800 px de largura ou mais. O texto alternativo é o "Texto alternativo" da imagem na biblioteca de mídia; se estiver vazio, o site usa "Site da &lt;empresa&gt;".</p>
	<?php
}

/** At most this many numbers per project (one row of the portfolio strip). */
const SITE_PROJETO_RESULTS_MAX = 4;

/** The project's numbers as saved: a list of {prefix, count, suffix, label}; `count` is the number as typed ("4,8"). */
function site_projeto_results( $post_id ) {
	$v = get_post_meta( $post_id, 'results', true );
	return is_array( $v ) ? array_slice( $v, 0, SITE_PROJETO_RESULTS_MAX ) : array();
}

/** One row of the "Resultados do projeto" repeater (empty array = the blank row of the template). */
function site_projeto_result_row( $r ) {
	$v = function ( $k ) use ( $r ) {
		return esc_attr( $r[ $k ] ?? '' );
	};
	?>
	<div class="site-rs-row">
		<input type="text" name="site_rs[prefix][]" value="<?php echo $v( 'prefix' ); ?>" maxlength="13" placeholder="+" aria-label="Antes do número">
		<input type="text" name="site_rs[count][]" value="<?php echo $v( 'count' ); ?>" inputmode="decimal" placeholder="120" aria-label="Número">
		<input type="text" name="site_rs[suffix][]" value="<?php echo $v( 'suffix' ); ?>" maxlength="14" placeholder="%" aria-label="Depois do número">
		<input type="text" name="site_rs[label][]" value="<?php echo $v( 'label' ); ?>" maxlength="80" placeholder="em visitas orgânicas" aria-label="Legenda">
		<button type="button" class="button site-rs-del" aria-label="Remover este número">&times;</button>
	</div>
	<?php
}

/** "1.200,5" / "4,8" / "4.8" / "120" → [float, decimals]; null when it is not a number. A dot is a decimal point only when
 * there is no comma and 1-2 digits follow it ("4.8"); otherwise it separates thousands ("1.200"). */
function site_projeto_parse_count( $s ) {
	$s = str_replace( ' ', '', trim( (string) $s ) );
	if ( ! ( false === strpos( $s, ',' ) && preg_match( '/^\d+\.\d{1,2}$/', $s ) ) ) {
		$s = str_replace( array( '.', ',' ), array( '', '.' ), $s );
	}
	if ( '' === $s || ! is_numeric( $s ) ) {
		return null;
	}
	$dot = strpos( $s, '.' );
	return array( (float) $s, false === $dot ? 0 : min( 2, strlen( $s ) - $dot - 1 ) );
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
		update_post_meta( $post_id, 'subtitle', sanitize_text_field( wp_unslash( $_POST['site_projeto_subtitle'] ?? '' ) ) );
		update_post_meta( $post_id, 'summary', sanitize_textarea_field( wp_unslash( $_POST['site_projeto_summary'] ?? '' ) ) );
		// the featured video: an attachment id from the media library, kept only if it really is a video
		$video_id = absint( $_POST['site_projeto_video'] ?? 0 );
		if ( $video_id && 0 === strpos( (string) get_post_mime_type( $video_id ), 'video/' ) ) {
			update_post_meta( $post_id, 'video_id', $video_id );
		} else {
			delete_post_meta( $post_id, 'video_id' );
		}
		update_post_meta( $post_id, 'site_url', esc_url_raw( wp_unslash( $_POST['site_projeto_url'] ?? '' ) ) );
		// the repeater arrives as parallel lists (site_rs[count][i] goes with site_rs[label][i]); keep only complete rows
		$rs   = wp_unslash( $_POST['site_rs'] ?? array() );
		$rows = array();
		foreach ( (array) ( $rs['count'] ?? array() ) as $i => $count ) {
			$row = array(
				'prefix' => mb_substr( site_sanitize_badge( $rs['prefix'][ $i ] ?? '' ), 0, 13 ),
				'count'  => sanitize_text_field( $count ),
				'suffix' => mb_substr( site_sanitize_badge( $rs['suffix'][ $i ] ?? '' ), 0, 14 ),
				'label'  => sanitize_text_field( $rs['label'][ $i ] ?? '' ),
			);
			if ( null !== site_projeto_parse_count( $row['count'] ) && '' !== $row['label'] ) {
				$rows[] = $row;
			}
			if ( count( $rows ) >= SITE_PROJETO_RESULTS_MAX ) {
				break;
			}
		}
		update_post_meta( $post_id, 'results', $rows );
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
					$results = array();
					foreach ( site_projeto_results( $id ) as $r ) {
						$n = site_projeto_parse_count( $r['count'] ?? '' );
						if ( $n ) {
							$results[] = array(
								'count'    => $n[0],
								'decimals' => $n[1],
								'prefix'   => (string) ( $r['prefix'] ?? '' ),
								'suffix'   => (string) ( $r['suffix'] ?? '' ),
								'label'    => (string) ( $r['label'] ?? '' ),
							);
						}
					}
					$video_id = (int) get_post_meta( $id, 'video_id', true );
					$video    = $video_id ? wp_get_attachment_url( $video_id ) : '';
					return array(
						'subtitle'    => (string) get_post_meta( $id, 'subtitle', true ),
						'summary'     => (string) get_post_meta( $id, 'summary', true ),
						'video'       => $video ? array( 'url' => $video, 'type' => (string) get_post_mime_type( $video_id ) ) : null,
						'url'         => (string) get_post_meta( $id, 'site_url', true ),
						// wpautop() turns the editor's plain line breaks into real <p> tags.
						'description' => wpautop( (string) get_post_meta( $id, 'description', true ) ),
						'results'     => $results,
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
