<?php
/**
 * Local avatar — lets a user upload their own profile photo straight from
 * their WordPress profile page, instead of depending on Gravatar (which
 * needs a separate gravatar.com account tied to that exact e-mail address,
 * and the client doesn't have/want one).
 *
 * Adds a "Foto do perfil" field (native media library picker, nothing
 * external) to Your Profile / Edit User; stores the chosen attachment id as
 * user meta; and filters WordPress's own avatar functions so EVERY place
 * that already asks WordPress for "this user's avatar" picks it up on its
 * own — the admin bar, comments, and (what the Astro front-end actually
 * reads) the REST API's embedded `author[0].avatar_urls`
 * (frontend/src/lib/wp.ts's getAuthorAvatar()). No REST changes needed on
 * either side for that last part — `avatar_urls` is core WordPress, built
 * from get_avatar_url(), which this file filters.
 *
 * A user with no photo uploaded here still falls back to Gravatar (its
 * default grey silhouette for an unrecognized e-mail) exactly as before —
 * this file only ever adds an override, never removes the fallback.
 *
 * Usage: drop into wp-content/mu-plugins/.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const SITE_AVATAR_META_KEY = 'site_local_avatar_id';

/**
 * ---------------------------------------------------------------------
 * Profile screen: upload field (Your Profile, and Edit User for admins).
 * ---------------------------------------------------------------------
 */
function site_avatar_profile_field( $user ) {
	if ( ! current_user_can( 'upload_files' ) ) {
		return;
	}
	wp_enqueue_media();

	$attachment_id = (int) get_user_meta( $user->ID, SITE_AVATAR_META_KEY, true );
	$preview_url   = $attachment_id ? wp_get_attachment_image_url( $attachment_id, array( 96, 96 ) ) : '';
	?>
	<h2>Foto do perfil</h2>
	<table class="form-table" role="presentation">
		<tr>
			<th><label for="site-avatar-upload">Foto</label></th>
			<td>
				<div id="site-avatar-preview" style="margin-bottom:10px;<?php echo $preview_url ? '' : 'display:none;'; ?>">
					<img src="<?php echo esc_url( $preview_url ); ?>" width="96" height="96"
						style="width:96px;height:96px;border-radius:50%;object-fit:cover;display:block;" />
				</div>
				<input type="hidden" name="site_local_avatar_id" id="site_local_avatar_id" value="<?php echo esc_attr( $attachment_id ); ?>" />
				<button type="button" class="button" id="site-avatar-upload">Escolher imagem</button>
				<button type="button" class="button" id="site-avatar-remove" <?php echo $attachment_id ? '' : 'style="display:none;"'; ?>>Remover foto</button>
				<p class="description">Usada como foto do autor no site, em vez do ícone padrão do Gravatar. Recomendado: imagem quadrada, pelo menos 200×200px.</p>
			</td>
		</tr>
	</table>
	<script>
	( function () {
		var frame;
		var uploadBtn = document.getElementById( 'site-avatar-upload' );
		var removeBtn = document.getElementById( 'site-avatar-remove' );
		var input     = document.getElementById( 'site_local_avatar_id' );
		var preview   = document.getElementById( 'site-avatar-preview' );
		var img       = preview.querySelector( 'img' );

		uploadBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			if ( frame ) {
				frame.open();
				return;
			}
			frame = wp.media( {
				title: 'Selecionar foto do perfil',
				button: { text: 'Usar esta imagem' },
				library: { type: 'image' },
				multiple: false,
			} );
			frame.on( 'select', function () {
				var att = frame.state().get( 'selection' ).first().toJSON();
				input.value = att.id;
				img.src = ( att.sizes && att.sizes.thumbnail ) ? att.sizes.thumbnail.url : att.url;
				preview.style.display = '';
				removeBtn.style.display = '';
			} );
			frame.open();
		} );

		removeBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			input.value = '';
			preview.style.display = 'none';
			removeBtn.style.display = 'none';
		} );
	} )();
	</script>
	<?php
}
add_action( 'show_user_profile', 'site_avatar_profile_field' );
add_action( 'edit_user_profile', 'site_avatar_profile_field' );

function site_avatar_save_field( $user_id ) {
	if ( ! current_user_can( 'edit_user', $user_id ) || ! current_user_can( 'upload_files' ) ) {
		return;
	}
	// Nonce already covers this form — 'update' / '_wpnonce' is verified by
	// WordPress core itself before personal_options_update/edit_user_profile_update
	// fire, so there is nothing left for this handler to check on its own.
	if ( ! isset( $_POST['site_local_avatar_id'] ) ) {
		return;
	}
	$attachment_id = (int) $_POST['site_local_avatar_id'];
	if ( $attachment_id > 0 ) {
		update_user_meta( $user_id, SITE_AVATAR_META_KEY, $attachment_id );
	} else {
		delete_user_meta( $user_id, SITE_AVATAR_META_KEY );
	}
}
add_action( 'personal_options_update', 'site_avatar_save_field' );
add_action( 'edit_user_profile_update', 'site_avatar_save_field' );

/**
 * ---------------------------------------------------------------------
 * Make the uploaded photo the real avatar everywhere WordPress asks for
 * one. Same technique used by the "Simple Local Avatars" plugin, just
 * trimmed down to only what this project needs (one photo per user, no
 * ratings/ ".org" ecosystem stuff).
 * ---------------------------------------------------------------------
 */
function site_local_avatar_data( $args, $id_or_email ) {
	$user = false;
	if ( is_numeric( $id_or_email ) ) {
		$user = get_user_by( 'id', $id_or_email );
	} elseif ( $id_or_email instanceof WP_User ) {
		$user = $id_or_email;
	} elseif ( $id_or_email instanceof WP_Post ) {
		$user = get_user_by( 'id', (int) $id_or_email->post_author );
	} elseif ( $id_or_email instanceof WP_Comment ) {
		$user = ! empty( $id_or_email->user_id ) ? get_user_by( 'id', (int) $id_or_email->user_id ) : false;
	} elseif ( is_string( $id_or_email ) ) {
		$user = get_user_by( 'email', $id_or_email );
	}

	if ( ! $user ) {
		return $args;
	}

	$attachment_id = (int) get_user_meta( $user->ID, SITE_AVATAR_META_KEY, true );
	if ( ! $attachment_id ) {
		return $args; // No photo uploaded — Gravatar's own fallback still applies, unchanged.
	}

	$size = isset( $args['size'] ) ? (int) $args['size'] : 96;
	$url  = wp_get_attachment_image_url( $attachment_id, array( $size, $size ) );
	if ( ! $url ) {
		$url = wp_get_attachment_url( $attachment_id );
	}
	if ( ! $url ) {
		return $args;
	}

	$args['url']          = $url;
	$args['found_avatar']  = true;
	return $args;
}
add_filter( 'pre_get_avatar_data', 'site_local_avatar_data', 10, 2 );
