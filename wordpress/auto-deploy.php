<?php
/**
 * Auto-deploy trigger.
 *
 * The Astro front-end is a static build — nothing saved here shows up
 * live until a rebuild runs. This closes that gap: whenever a Post (or
 * any other content type added below) is saved, it tells GitHub Actions
 * (via a "repository_dispatch" API call) to rebuild and redeploy the site
 * — see frontend/.github/workflows/deploy.yml for the other half of this.
 *
 * Fires immediately on save, non-blocking (doesn't slow down the save
 * itself) — no reliance on WP-Cron's own scheduling, which only actually
 * runs when something visits the site AFTER the scheduled time (so an
 * admin who saves once and moves on could mean the deploy never fires at
 * all without an unrelated page load nudging it).
 *
 * Saving several things back-to-back still doesn't waste multiple full
 * builds: the GitHub Actions workflow has `concurrency: cancel-in-
 * progress: true`, so each new dispatch cancels whatever build was still
 * running and starts fresh — only the last one actually finishes.
 *
 * Requires, in wp-config.php:
 *   define('SITE_GITHUB_DISPATCH_TOKEN', 'github_pat_...');
 * A GitHub Personal Access Token — fine-grained, scoped to ONLY this
 * repo, with "Contents: Read and write" permission (the minimum GitHub
 * requires to fire a repository_dispatch event). Without this constant
 * set, saves simply don't trigger a deploy — nothing breaks, it just
 * stays manual.
 *
 * Also handles the OTHER direction: a client managing content straight
 * from wp-admin has no reason to ever look at GitHub, so without some
 * feedback loop back into WordPress they'd have no way to know a publish
 * actually went out (or failed) short of guessing and refreshing the live
 * site. The very last step of frontend/.github/workflows/deploy.yml POSTs
 * its own outcome to "/deploy-status" (POST, below) — paired with a GET
 * of the same route that a small sidebar indicator (see
 * site_admin_sidebar_deploy_status() in client-access.php) polls to show
 * a live spinner while a deploy is running, then a checkmark or an error
 * the moment it's done.
 *
 * Requires, in wp-config.php:
 *   define('SITE_DEPLOY_STATUS_TOKEN', 'some-random-string');
 * A second, unrelated secret (also set as the GitHub Actions repo secret
 * "DEPLOY_STATUS_TOKEN") — just so the POST side of that route can't be
 * spoofed by an unrelated request claiming a deploy succeeded or failed.
 * Without this constant set, POSTing a result always answers 401 and the
 * sidebar indicator just never leaves its "Publishing…" state — harmless,
 * deploys themselves are entirely unaffected.
 *
 * Usage: drop into wp-content/mu-plugins/.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const SITE_DEPLOY_GITHUB_OWNER = 'agencianuvion';
const SITE_DEPLOY_GITHUB_REPO  = 'site-nuvion';

/**
 * Keeps the last 20 reasons a deploy was triggered. A deploy that fires
 * with nobody remembering causing it (a scheduled post going live,
 * WordPress's own daily Trash cleanup permanently deleting something old,
 * a plugin resaving a post, or — the one that's actually worth catching —
 * someone using a leaked SITE_GITHUB_DISPATCH_TOKEN to hit GitHub's
 * dispatch API directly, bypassing WordPress entirely) then has an actual
 * answer instead of a guess. Read it at Tools -> Deploy Log, or via GET
 * /wp-json/site/v1/deploy-log.
 *
 * A dispatch that reached GitHub but is NOT in this log means it did not
 * come from this WordPress install at all — which almost always means the
 * token has leaked and should be rotated.
 */
function site_log_deploy_trigger( $reason ) {
	$log   = get_option( 'site_deploy_trigger_log', array() );
	$log[] = array(
		'time'   => current_time( 'mysql' ),
		'reason' => $reason,
	);
	// Keep only the most recent 20 — this is a debugging breadcrumb trail,
	// not an audit log; unbounded growth would just be another thing to
	// clean up later for no real benefit.
	if ( count( $log ) > 20 ) {
		$log = array_slice( $log, -20 );
	}
	update_option( 'site_deploy_trigger_log', $log, false );
}

/** Fires the GitHub Actions rebuild. Non-blocking — doesn't make the save/publish request wait on GitHub's API. */
function site_run_deploy( $reason = 'unknown' ) {
	if ( ! defined( 'SITE_GITHUB_DISPATCH_TOKEN' ) || ! SITE_GITHUB_DISPATCH_TOKEN ) {
		return;
	}

	site_log_deploy_trigger( $reason );

	// Marks a deploy as under way — site_receive_deploy_status() clears
	// this the moment GitHub Actions reports back, which is what lets the
	// sidebar indicator show a spinner for exactly as long as a real
	// deploy is running, not a fixed guess.
	update_option( 'site_deploy_pending', current_time( 'mysql' ), false );

	wp_remote_post(
		sprintf(
			'https://api.github.com/repos/%s/%s/dispatches',
			SITE_DEPLOY_GITHUB_OWNER,
			SITE_DEPLOY_GITHUB_REPO
		),
		array(
			'headers'  => array(
				'Authorization' => 'Bearer ' . SITE_GITHUB_DISPATCH_TOKEN,
				'Accept'        => 'application/vnd.github+json',
				'User-Agent'    => 'Site-WP',
			),
			'body'     => wp_json_encode( array( 'event_type' => 'wp-content-updated' ) ),
			'timeout'  => 5,
			'blocking' => false,
		)
	);
}

/**
 * Posts — skip autosaves/revisions, and drafts (nothing public changed
 * yet). TODO: add more `add_action('save_post_XXX', ...)` lines below for
 * any custom post type this project adds (e.g. 'save_post_project' for a
 * CPT named 'project') — same callback works for any post type.
 */
function site_maybe_deploy_on_save( $post_id, $post ) {
	if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
		return;
	}
	if ( ! in_array( $post->post_status, array( 'publish', 'future', 'private' ), true ) ) {
		return;
	}
	site_run_deploy( sprintf( 'save_post:%s:#%d:%s', $post->post_type, $post_id, $post->post_status ) );
}
add_action( 'save_post_post', 'site_maybe_deploy_on_save', 10, 2 );

/**
 * Moving to Trash, permanently deleting, or restoring from Trash also
 * needs a rebuild — save_post_* above only ever fires on create/update,
 * never on any of these.
 *
 * Uses 'before_delete_post' (post still exists in the DB) rather than
 * 'deleted_post' (fires after — get_post_type() would already return
 * nothing there, since the row itself is gone by then).
 *
 * TODO: add any custom post type slugs to this array too.
 */
function site_maybe_deploy_on_delete( $post_id ) {
	$post_type = get_post_type( $post_id );
	if ( in_array( $post_type, array( 'post' ), true ) ) {
		// current_action() distinguishes trashed_post / before_delete_post /
		// untrashed_post — before_delete_post firing on its own is the
		// signature of WordPress's own daily Trash-cleanup cron permanently
		// deleting something old, rather than a human clicking "Delete
		// Permanently".
		site_run_deploy( sprintf( '%s:%s:#%d', current_action(), $post_type, $post_id ) );
	}
}
add_action( 'trashed_post', 'site_maybe_deploy_on_delete' );
add_action( 'before_delete_post', 'site_maybe_deploy_on_delete' );
add_action( 'untrashed_post', 'site_maybe_deploy_on_delete' );

/**
 * ---------------------------------------------------------------------
 * Deploy status — GitHub Actions reports back here when a run finishes,
 * so wp-admin can show whether the last publish actually went out.
 * ---------------------------------------------------------------------
 */
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'site/v1',
			'/deploy-status',
			array(
				'methods'             => 'POST',
				'callback'            => 'site_receive_deploy_status',
				'permission_callback' => '__return_true', // Auth is the shared token below, not a WP capability — GitHub Actions has neither a cookie nor a JWT.
			)
		);
	}
);

function site_receive_deploy_status( WP_REST_Request $request ) {
	if ( ! defined( 'SITE_DEPLOY_STATUS_TOKEN' ) || ! SITE_DEPLOY_STATUS_TOKEN ) {
		return new WP_REST_Response( array( 'error' => 'Not configured' ), 501 );
	}

	// hash_equals (not ===) — timing-safe comparison, so a slow string
	// compare can't leak the token one byte at a time via response timing.
	$token = (string) $request->get_header( 'x-deploy-token' );
	if ( ! hash_equals( SITE_DEPLOY_STATUS_TOKEN, $token ) ) {
		return new WP_REST_Response( array( 'error' => 'Unauthorized' ), 401 );
	}

	$status = $request->get_param( 'status' );
	if ( ! in_array( $status, array( 'success', 'failure', 'cancelled' ), true ) ) {
		return new WP_REST_Response( array( 'error' => 'Invalid status' ), 400 );
	}

	delete_option( 'site_deploy_pending' );

	update_option(
		'site_last_deploy',
		array(
			'status' => $status,
			'time'   => current_time( 'mysql' ),
		),
		false // Not autoloaded — only read on demand, by the route below.
	);

	return new WP_REST_Response( array( 'ok' => true ), 200 );
}

/**
 * Read-only status for the sidebar indicator (see
 * site_admin_sidebar_deploy_status() in client-access.php) — polled from
 * wp-admin every few seconds so it can show a live spinner for exactly as
 * long as a deploy is actually running, then flip to a checkmark or an
 * error the moment GitHub Actions reports back.
 *
 * Resolves "pending" into a plain state string rather than handing back
 * the raw options, so the only place that has to reason about
 * staleness/edge cases is here, not duplicated in JS:
 *  - "deploying": a dispatch went out and no result has arrived yet.
 *  - "success" / "failure": the last dispatch's real outcome.
 *  - "idle": nothing has ever been dispatched (fresh install, or the
 *    GitHub token isn't configured at all).
 * A "pending" flag older than 8 minutes — well past what 3 retries of a
 * normal build should ever take — is treated as failed rather than left
 * spinning forever; this covers the one gap fire-and-forget dispatching
 * can't self-report on: GitHub's API itself being unreachable, so no
 * workflow ever ran to report back in the first place.
 */
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'site/v1',
			'/deploy-status',
			array(
				'methods'             => 'GET',
				'callback'            => 'site_get_deploy_status',
				'permission_callback' => 'is_user_logged_in',
			)
		);
	}
);

function site_get_deploy_status() {
	$pending_since = get_option( 'site_deploy_pending' );
	if ( $pending_since ) {
		$pending_age = time() - strtotime( $pending_since );
		if ( $pending_age >= 0 && $pending_age < 8 * MINUTE_IN_SECONDS ) {
			return new WP_REST_Response( array( 'state' => 'deploying' ), 200 );
		}
		// Stale — GitHub likely never got the dispatch at all. Clear it so
		// it doesn't keep getting treated as "deploying" on every request.
		delete_option( 'site_deploy_pending' );
	}

	$last = get_option( 'site_last_deploy' );
	if ( ! $last || empty( $last['time'] ) ) {
		return new WP_REST_Response( array( 'state' => 'idle' ), 200 );
	}

	return new WP_REST_Response(
		array(
			'state'    => 'success' === $last['status'] ? 'success' : 'failure',
			// Formatted here (not left to the browser) so the sidebar script
			// never has to parse a MySQL timestamp string itself — that
			// would need to account for the site's configured timezone vs.
			// the visitor's, which human_time_diff() already handles.
			'time_ago' => human_time_diff( strtotime( $last['time'] ) ) . ' ago',
		),
		200
	);
}

/**
 * ---------------------------------------------------------------------
 * Deploy trigger log — see site_log_deploy_trigger() above for the "why".
 * Exposed two ways:
 *  - A plain wp-admin page (Tools -> Deploy Log) — the normal way to just
 *    glance at it.
 *  - GET /wp-json/site/v1/deploy-log — for scripted/remote checks. Needs
 *    a REST nonce (X-WP-Nonce), which a browser does NOT send just from
 *    visiting the URL — WordPress's cookie auth requires it so a
 *    malicious page can't silently reuse a logged-in admin's session, so
 *    pasting the URL straight into the address bar correctly gets a 401.
 *    The wp-admin page reads the option server-side and has no such
 *    friction.
 * ---------------------------------------------------------------------
 */
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'site/v1',
			'/deploy-log',
			array(
				'methods'             => 'GET',
				'callback'            => function () {
					// Most recent first — that's almost always the one being investigated.
					return new WP_REST_Response( array_reverse( get_option( 'site_deploy_trigger_log', array() ) ), 200 );
				},
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}
);

add_action(
	'admin_menu',
	function () {
		add_management_page(
			'Deploy Log',
			'Deploy Log',
			'manage_options',
			'site-deploy-log',
			function () {
				$log = array_reverse( get_option( 'site_deploy_trigger_log', array() ) );
				echo '<div class="wrap"><h1>Deploy Log</h1>';
				echo '<p>The most recent deploy triggers, newest first. A dispatch that reached GitHub but is missing here did not come from this site — rotate SITE_GITHUB_DISPATCH_TOKEN.</p>';
				if ( empty( $log ) ) {
					echo '<p><em>Nothing logged yet.</em></p></div>';
					return;
				}
				echo '<table class="widefat striped"><thead><tr><th style="width:220px">When</th><th>Reason</th></tr></thead><tbody>';
				foreach ( $log as $entry ) {
					printf(
						'<tr><td>%s</td><td><code>%s</code></td></tr>',
						esc_html( $entry['time'] ?? '' ),
						esc_html( $entry['reason'] ?? '' )
					);
				}
				echo '</tbody></table></div>';
			}
		);
	}
);
