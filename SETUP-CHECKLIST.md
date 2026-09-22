# Setup checklist — Astro + headless WordPress starter

Everything in this repo (code) can be scaffolded/adapted automatically.
Everything on this checklist is infrastructure — it needs your
credentials/decisions and can't be automated from inside the code.

## 1. WordPress install

- [ ] Create the WordPress install (subdomain recommended, e.g.
      `system.yourdomain.com`, kept separate from the Astro site's own
      domain root).
- [ ] **No fields plugin required by default.** Custom post types use
      `cpt-xxx.php` + `fields-xxx.php` (native meta boxes + a resolved
      REST field — see those files' templates), and paid/free membership
      each have their own file below — none of it needs ACF, JetEngine,
      or anything else installed. Only install a fields plugin (ACF,
      JetEngine, ...) if this specific project genuinely wants one
      instead (a large number of fields, non-technical field-group
      building) — if so, **JWT Authentication for WP REST API** is also
      needed, but only when using `membership-stripe.php`.
- [ ] wp-config.php constants — add as needed:
  ```php
  define('SITE_GITHUB_DISPATCH_TOKEN', 'github_pat_...');
  define('SITE_DEPLOY_STATUS_TOKEN', '...'); // any random string
  // Only if using site-auth.php (free visitor accounts):
  define('SITE_AUTH_SECRET', '...'); // long random string
  // Only if using membership-stripe.php (paid membership):
  define('SITE_FRONTEND_URL', 'https://yourdomain.com');
  define('JWT_AUTH_SECRET_KEY', '...');
  define('JWT_AUTH_CORS_ENABLE', true);
  define('SITE_STRIPE_WEBHOOK_SECRET', '...');
  define('SITE_STRIPE_SECRET_KEY', '...');
  ```
- [ ] Upload every file in `wordpress/` that this project actually needs
      (see the interview answers / README's file list — `cpt-xxx.php` and
      `fields-xxx.php` per custom post type, `site-auth.php` and/or
      `membership-stripe.php` only if that kind of membership applies,
      `editor-role.php` only if a restricted content-editor role applies)
      to `wp-content/mu-plugins/` on the server.
- [ ] If using `site-auth.php`: fill in `SITE_AUTH_COOKIE_DOMAIN` and
      `site_auth_allowed_origins()` in that file with the real production
      domain(s) before uploading — it refuses cross-origin requests from
      anything not on that list, by design.
- [ ] Set "Discourage search engines from indexing this site" (Settings →
      Reading) on the WordPress domain — it's a backend, not meant to
      rank.
- [ ] `SITE_GITHUB_DISPATCH_TOKEN` is a live credential: anyone who has it
      can trigger deploys of this site directly against GitHub's API,
      bypassing WordPress. Never paste it into chat/tickets/screenshots.
      If it's ever exposed, rotate it (GitHub → Developer settings →
      Fine-grained tokens → Regenerate) and update the constant — nothing
      else needs changing. To tell whether a mystery deploy came from this
      site or from a leaked token, check **Tools → Deploy Log** in
      wp-admin: every deploy this install triggers is logged there with a
      reason; a deploy that ran but isn't listed didn't come from here.

## 2. GitHub repo

- [ ] Push this repo to GitHub.
- [ ] Repo secrets (Settings → Secrets and variables → Actions):
  - `PUBLIC_WP_API_URL`
  - `DEPLOY_PATH`, `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PRIVATE_KEY`
  - `DEPLOY_STATUS_TOKEN` (same value as `SITE_DEPLOY_STATUS_TOKEN` above)
  - Any other `PUBLIC_*` env vars the project needs

## 3. Hosting + DNS

- [ ] Point the Astro site's domain at the hosting account.
- [ ] If WordPress lives in a **subfolder of the same domain root** as
      the Astro deploy (not a fully separate domain/account) —
      **`.github/workflows/deploy.yml`'s rsync step MUST exclude that
      folder** (`--exclude=foldername`). Without this, `--delete` treats
      it as leftover cruft from the Astro build and wipes the entire
      WordPress install on the very next deploy. This happened once on
      the reference project; recovery took hours. If WordPress is on a
      separate domain/hosting account entirely, this doesn't apply.
- [ ] If using Cloudflare in front of either domain: create a Custom Rule
      (Security → WAF → Custom rules) matching `URI Path contains
      /wp-json/` → **Skip** all managed protections. Without this,
      Cloudflare's bot-fighting can block the GitHub Actions runner's
      datacenter IP specifically (works fine from a normal residential
      IP, fails intermittently in CI) — confirmed as the root cause of
      several build failures on the reference project. The retry logic
      already in `deploy.yml` covers most of these anyway, but the rule
      avoids them outright.
- [ ] Verify SSH access (host/port/user + key or password) before
      configuring the `SSH_*` secrets.
- [ ] While `DEPLOY_PATH` still points at a staging/preview subfolder (not
      real production yet), `deploy.yml` sets `PUBLIC_NOINDEX=true` so that
      copy can't get indexed (see the comment right above that line) — the
      day `DEPLOY_PATH` moves to the real production path, remove that one
      line too, in the same commit.

## 4. Local development

- [ ] `cp frontend/.env.example frontend/.env` and fill in real values.
- [ ] `npm install` inside `frontend/`.
- [ ] `npm run dev`.
- [ ] Note: `src/lib/wp.ts` caches fetch results in a module-level
      variable for the life of the dev server process. If WordPress
      content changes (or the API was briefly down) while the dev server
      is running, the stale/empty result can stick — restart the dev
      server (`npx astro dev stop` then `npx astro dev`) rather than
      assuming the code is broken.

## 5. Before going live

- [ ] Replace every `TODO` left in the scaffolded files (search the repo
      for `TODO`) — domain names, org name, GitHub owner/repo, etc.
- [ ] Confirm `astro.config.mjs`'s `site` is the real production domain —
      canonical URLs, Open Graph tags, and share links all depend on it.
- [ ] If using OneDrive (or any other cloud-synced folder) to move media
      files during setup: copy them to a plain local, non-cloud-synced
      path first. Cloud placeholder files can look correct in a file
      listing but fail when actually read (upload, compression, etc.) if
      they haven't been fully downloaded/materialized locally yet.
