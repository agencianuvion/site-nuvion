<?php
/**
 * Fields for "Depoimentos" — native meta box + a resolved REST node (no fields plugin), same pattern as the starter's
 * fields-example.php.
 *
 *   quote      the testimonial text (plain text, line breaks kept)
 *   role       "Empresa · Cargo" line under the name
 *   video_url  optional link to a video testimonial (YouTube, Vimeo or a direct .mp4); empty = text-only card
 *
 * REST: GET /wp-json/wp/v2/depoimentos?orderby=menu_order&order=asc → each item has `title.rendered` (the name) and
 * `fields: { quote, role, video_url, photo }`.
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
	}
);

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
		<label for="site_role">Empresa · Cargo</label>
		<input type="text" id="site_role" name="site_role" value="<?php echo esc_attr( $role ); ?>" placeholder="Ex.: Clínica Exemplo · Diretora">
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
						'quote'     => (string) get_post_meta( $id, 'quote', true ),
						'role'      => (string) get_post_meta( $id, 'role', true ),
						'video_url' => (string) get_post_meta( $id, 'video_url', true ),
						'photo'     => site_img_url( get_post_thumbnail_id( $id ), 'thumbnail' ),
					);
				},
				'schema'       => null,
			)
		);
	}
);
