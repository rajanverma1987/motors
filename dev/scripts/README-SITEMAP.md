# `public/sitemap.xml` (npm run git / `node scripts/generate-sitemap.js`)

This file is **generated** from the same source as **`src/app/sitemap.js`**:  
`src/lib/sitemap-url-entries.js` → `getSitemapEntries()`.

It includes:

- Static marketing routes
- **USA hub, every state page, and every city page** (e.g. `/usa/texas/houston/motor-repair-business-listing`)
- DB-backed routes: motor-repair-shop slugs, marketplace items, career postings

**Why a static file?** Next.js serves files in `public/` before `app/sitemap.js`. If `public/sitemap.xml` exists, it overrides the dynamic sitemap—so this script must stay aligned with `getSitemapEntries()`.

**Requirements:** `MONGODB_URI`, `NEXT_PUBLIC_SITE_URL` (or `SITE_URL`) in `.env` for a full list.
