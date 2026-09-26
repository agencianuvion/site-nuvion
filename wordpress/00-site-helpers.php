<?php
/**
 * Shared helpers for the custom post types (cpt-*.php / fields-*.php) and the options page.
 *
 * The starter's fields-example.php defines these inline because it is written for ONE post type. This project has
 * several, and a function can only be declared once, so they live here and every other file just calls them.
 *
 * Usage: drop into wp-content/mu-plugins/. Named "00-" so it loads BEFORE the cpt-*.php files (mu-plugins load in
 * filename order), which call site_watch_post_type() / site_thumb_column() while loading.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** URL of an attachment at the requested size, falling back to "large" then the original. */
function site_img_url( $attachment_id, $size = 'large' ) {
	$attachment_id = (int) $attachment_id;
	if ( ! $attachment_id ) {
		return '';
	}
	$url = wp_get_attachment_image_url( $attachment_id, $size );
	if ( ! $url ) {
		$url = wp_get_attachment_image_url( $attachment_id, 'full' );
	}
	return $url ?: '';
}

/**
 * An attachment resolved for the front-end: original URL + dimensions + alt, and (for photos) a ready srcset.
 * Returns null when the attachment does not exist, so callers can just check for null.
 */
function site_img_data( $attachment_id, $with_srcset = false ) {
	$attachment_id = (int) $attachment_id;
	if ( ! $attachment_id ) {
		return null;
	}
	$full = wp_get_attachment_image_url( $attachment_id, 'full' );
	if ( ! $full ) {
		return null;
	}
	$meta = wp_get_attachment_metadata( $attachment_id );
	$out  = array(
		'url'    => $full,
		'width'  => (int) ( $meta['width'] ?? 0 ),
		'height' => (int) ( $meta['height'] ?? 0 ),
		'alt'    => (string) get_post_meta( $attachment_id, '_wp_attachment_image_alt', true ),
	);
	if ( $with_srcset ) {
		$out['srcset'] = (string) wp_get_attachment_image_srcset( $attachment_id, 'full' );
	}
	return $out;
}

/** "One item per line" textarea -> array of strings, blank lines dropped. */
function site_lines( $value ) {
	if ( ! is_string( $value ) || '' === trim( $value ) ) {
		return array();
	}
	$out = preg_split( '/\r\n|\r|\n/', $value );
	$out = array_map( 'trim', $out );
	return array_values( array_filter( $out, 'strlen' ) );
}

/**
 * Marks the site "has unsent changes" whenever one of these post types is saved / trashed / restored / deleted.
 * auto-deploy.php only knows about 'post' by default; each cpt-*.php file calls this once for its own type.
 */
function site_watch_post_type( $post_type ) {
	add_action(
		'save_post_' . $post_type,
		function ( $post_id, $post ) {
			if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) || ! function_exists( 'site_request_deploy' ) ) {
				return;
			}
			if ( in_array( $post->post_status, array( 'publish', 'future', 'private' ), true ) ) {
				site_request_deploy( $post_id, sprintf( 'save_post:%s:#%d:%s', $post->post_type, $post_id, $post->post_status ) );
			}
		},
		10,
		2
	);
	foreach ( array( 'trashed_post', 'untrashed_post', 'before_delete_post' ) as $hook ) {
		add_action(
			$hook,
			function ( $post_id ) use ( $post_type, $hook ) {
				if ( get_post_type( $post_id ) === $post_type && function_exists( 'site_request_deploy' ) ) {
					site_request_deploy( $post_id, sprintf( '%s:%s:#%d', $hook, $post_type, $post_id ) );
				}
			}
		);
	}
}

/**
 * Admin list column showing the post's featured image on a dark tile (the client logos are WHITE on transparent, which
 * would be invisible on the default white list table).
 */
function site_thumb_column( $post_type, $label = 'Imagem' ) {
	add_filter(
		"manage_{$post_type}_posts_columns",
		function ( $cols ) use ( $label ) {
			$out = array();
			foreach ( $cols as $k => $v ) {
				if ( 'title' === $k ) {
					$out['site_thumb'] = $label;
				}
				$out[ $k ] = $v;
			}
			return $out;
		}
	);
	add_action(
		"manage_{$post_type}_posts_custom_column",
		function ( $col, $post_id ) {
			if ( 'site_thumb' !== $col ) {
				return;
			}
			$url = site_img_url( get_post_thumbnail_id( $post_id ), 'medium' );
			echo $url
				? '<span style="display:inline-flex;align-items:center;justify-content:center;width:120px;height:56px;padding:8px;box-sizing:border-box;border-radius:6px;background:#16181c"><img src="' . esc_url( $url ) . '" alt="" style="max-width:100%;max-height:100%;object-fit:contain"></span>'
				: '<span style="color:#8c8f94">—</span>';
		},
		10,
		2
	);
	add_action(
		'admin_head-edit.php',
		function () use ( $post_type ) {
			if ( get_post_type() === $post_type ) {
				echo '<style>.column-site_thumb{width:140px}</style>';
			}
		}
	);
}
