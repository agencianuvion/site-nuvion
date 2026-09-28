<?php
/**
 * Fields for "Depoimentos" — native meta box + a resolved REST node (no fields plugin), same pattern as the starter's
 * fields-example.php.
 *
 *   quote        the testimonial text (plain text, line breaks kept)
 *   role         company / role line under the name — the NAME itself is the post title, above this box
 *   from_google  switch: this review was collected from the Google Business Profile — shows a small "Avaliação do
 *                Google" badge on the card
 *   rating       1-5 stars, or 0 to show no stars at all — defaults to 5 in the editor (most collected reviews are)
 *   video_url    optional link to a video testimonial (YouTube, Vimeo or a direct .mp4); empty = text-only card
 *
 * REST: GET /wp-json/wp/v2/depoimentos?orderby=menu_order&order=asc → each item has `title.rendered` (the name) and
 * `fields: { quote, role, from_google, rating, video_url, photo }`.
 *
 * Usage: drop into wp-content/mu-plugins/, alongside cpt-depoimento.php. Needs 00-site-helpers.php.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'add_meta_boxes',
	function () {
		add_meta_box( 'site_depoimento_fields', 'Depoimento', 'site_depoimento_fields_box', 'depoimento', 'normal', 'high' );
		add_meta_box( 'site_depoimento_google', 'Origem', 'site_depoimento_google_box', 'depoimento', 'side', 'high' );
	}
);

/** Side box: the "from Google" switch + the star rating. Saved by the main save handler below (same form, same nonce). */
function site_depoimento_google_box( $post ) {
	$on     = (int) get_post_meta( $post->ID, 'from_google', true );
	$rating = get_post_meta( $post->ID, 'rating', true );
	$rating = '' === $rating ? 5 : (int) $rating; // most collected reviews are 5 stars — a sane default, not a claim about this specific one until saved.
	?>
	<style>
		#site_depoimento_google .site-switch { display: flex; align-items: center; gap: 12px; cursor: pointer; margin: 0; }
		#site_depoimento_google .site-switch input { position: absolute; opacity: 0; pointer-events: none; }
		#site_depoimento_google .site-switch-track { position: relative; flex: 0 0 auto; width: 44px; height: 24px; border-radius: 999px; background: #c3c4c7; transition: background .2s ease; }
		#site_depoimento_google .site-switch-track::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .2s ease; }
		#site_depoimento_google .site-switch input:checked + .site-switch-track { background: var(--site-accent, #2271b1); }
		#site_depoimento_google .site-switch input:checked + .site-switch-track::after { transform: translateX(20px); }
		#site_depoimento_google .site-switch input:focus-visible + .site-switch-track { outline: 2px solid var(--site-accent, #2271b1); outline-offset: 2px; }
		#site_depoimento_google .site-switch-label { font-weight: 600; }
		#site_depoimento_google .site-help { margin: 10px 0 0; color: #646970; font-size: 12px; }
		#site_depoimento_google .site-rating { margin-top: 18px; padding-top: 16px; border-top: 1px solid #dcdcde; }
		#site_depoimento_google .site-rating label { display: block; font-weight: 600; margin-bottom: 6px; }
	</style>
	<label class="site-switch">
		<input type="checkbox" name="site_from_google" value="1" <?php checked( $on, 1 ); ?>>
		<span class="site-switch-track" aria-hidden="true"></span>
		<span class="site-switch-label">Avaliação do Google</span>
	</label>
	<p class="site-help">Ligue quando o depoimento foi copiado do Perfil da Empresa no Google (Google Meu Negócio). O cartão mostra um selo "Avaliação do Google".</p>
	<div class="site-rating">
		<label for="site_rating">Nota (estrelas)</label>
		<select id="site_rating" name="site_rating">
			<option value="0" <?php selected( 0, $rating ); ?>>Sem nota (não mostra estrelas)</option>
			<?php for ( $n = 1; $n <= 5; $n++ ) : ?>
				<option value="<?php echo $n; ?>" <?php selected( $n, $rating ); ?>><?php echo $n; ?> estrela<?php echo 1 === $n ? '' : 's'; ?></option>
			<?php endfor; ?>
		</select>
	</div>
	<?php
}

function site_depoimento_fields_box( $post ) {
	wp_nonce_field( 'site_save_depoimento_fields', 'site_depoimento_fields_nonce' );
	$quote = get_post_meta( $post->ID, 'quote', true );
	$role  = get_post_meta( $post->ID, 'role', true );
	$video = get_post_meta( $post->ID, 'video_url', true );
	?>
	<style>
		#site_depoimento_fields .site-f { margin: 0 0 20px; }
		#site_depoimento_fields .site-f:last-child { margin-bottom: 0; }
		#site_depoimento_fields .site-f > label { display: block; font-weight: 600; margin-bottom: 6px; }
		#site_depoimento_fields .site-f input[type=text], #site_depoimento_fields .site-f input[type=url], #site_depoimento_fields .site-f textarea { width: 100%; }
		#site_depoimento_fields .description { margin: 6px 0 0; color: #646970; }
	</style>
	<div class="site-f">
		<label for="site_quote">Texto do depoimento</label>
		<textarea id="site_quote" name="site_quote" rows="7"><?php echo esc_textarea( $quote ); ?></textarea>
		<p class="description">Pode ser curto ou longo; o cartão se ajusta. Quebras de linha são mantidas.</p>
	</div>
	<div class="site-f">
		<label for="site_role">Empresa</label>
		<input type="text" id="site_role" name="site_role" value="<?php echo esc_attr( $role ); ?>" placeholder="Ex.: Clínica Exemplo">
		<p class="description">Aparece pequeno, abaixo do nome. O NOME em si é o título do post, no topo desta tela (não aqui).</p>
	</div>
	<div class="site-f">
		<label for="site_video_url">Link do vídeo <span style="font-weight:400;color:#646970">(opcional)</span></label>
		<input type="url" id="site_video_url" name="site_video_url" value="<?php echo esc_attr( $video ); ?>" placeholder="https://www.youtube.com/watch?v=…">
		<p class="description">YouTube, Vimeo ou arquivo .mp4. Preenchido, o cartão vira "depoimento em vídeo"; vazio, fica só o texto.</p>
	</div>
	<?php
}

add_action(
	'save_post_depoimento',
	function ( $post_id ) {
		if ( ! isset( $_POST['site_depoimento_fields_nonce'] ) || ! wp_verify_nonce( $_POST['site_depoimento_fields_nonce'], 'site_save_depoimento_fields' ) ) {
			return;
		}
		if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) || ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}
		update_post_meta( $post_id, 'quote', sanitize_textarea_field( wp_unslash( $_POST['site_quote'] ?? '' ) ) );
		update_post_meta( $post_id, 'role', sanitize_text_field( wp_unslash( $_POST['site_role'] ?? '' ) ) );
		update_post_meta( $post_id, 'video_url', esc_url_raw( wp_unslash( $_POST['site_video_url'] ?? '' ) ) );
		// The "from Google" switch and the rating live in the side box but post with the same form.
		update_post_meta( $post_id, 'from_google', empty( $_POST['site_from_google'] ) ? 0 : 1 );
		$rating = (int) ( $_POST['site_rating'] ?? 0 );
		update_post_meta( $post_id, 'rating', max( 0, min( 5, $rating ) ) );
	}
);

add_action(
	'rest_api_init',
	function () {
		register_rest_field(
			'depoimento',
			'fields',
			array(
				'get_callback' => function ( $post_arr ) {
					$id = (int) $post_arr['id'];
					return array(
						'quote'       => (string) get_post_meta( $id, 'quote', true ),
						'role'        => (string) get_post_meta( $id, 'role', true ),
						'from_google' => (bool) get_post_meta( $id, 'from_google', true ),
						'rating'      => (int) get_post_meta( $id, 'rating', true ),
						'video_url'   => (string) get_post_meta( $id, 'video_url', true ),
						'photo'       => site_img_url( get_post_thumbnail_id( $id ), 'thumbnail' ),
					);
				},
				'schema'       => null,
			)
		);
	}
);
