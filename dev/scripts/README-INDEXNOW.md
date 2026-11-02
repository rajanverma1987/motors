# IndexNow (post-build)

See full notes in the repo’s `documents/INDEXNOW.md` if present, or use this summary.

## Env

- **`INDEXNOW_KEY`** — Enable submission + key file `public/{KEY}.txt`.
- **`NEXT_PUBLIC_SITE_URL` or `SITE_URL`** — Production origin (https).
- **`MONGODB_URI`** — Needed to enumerate DB-backed URLs (listings, marketplace, careers).

## npm

- `prebuild` → writes key file (if `INDEXNOW_KEY` set).
- `postbuild` → POSTs URLs to `https://api.indexnow.org/indexnow` (batches of 10k).

If `INDEXNOW_KEY` is unset, both steps no-op (exit 0).

## “New or modified only”

The script submits **all** sitemap URLs each build (deduped). IndexNow allows repeat submissions; true incremental diff would need a stored manifest between builds.
