# Production checklist

Before going live, ensure the following.

## Security

- **JWT_SECRET** – Set in production env and use at least 32 random characters. Required for admin and portal login; app will error on first auth if missing.
- **Admin auth** – Prefer `ADMIN_PASSWORD_HASH` (bcrypt) over `ADMIN_PASSWORD` (plaintext).
- **Seed route** – `/api/seed` is disabled in production (returns 404).
- **Rate limiting** – In-memory limits are applied to: admin login, portal login, register, leads, area-notify, notify-no-listings, listing submit, uploads, verify-email/send. For multiple instances, consider Redis-based rate limiting.
- **Input validation** – All public POST endpoints enforce length limits and email format; uploads are restricted to image types and size limits.

## Environment

- Set `NODE_ENV=production`.
- Set `MONGODB_URI` to your production MongoDB.
- Set `NEXT_PUBLIC_SITE_URL` for emails and canonical URLs (e.g. `https://3phaseflow.com`).
- Configure email (SMTP or Resend) and `EMAIL_FROM`.

## Performance

- **Indexes** – Listing (status, submittedAt, companyName) and Lead (createdAt) have indexes. Ensure MongoDB has built them after first deploy.
- **Caching** – Public listing APIs send `Cache-Control: public, s-maxage=60, stale-while-revalidate=120` for CDN/browser caching.
- **Headers** – Next config sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and disables `X-Powered-By`.

## Domain cutover (3phaseflow.com)

- Point DNS + TLS for `3phaseflow.com` (and `www`) at this app.
- Keep `iqmotorbase.com` and `motorswinding.com` pointed at the app so permanent redirects in `next.config.mjs` / `web.config` work.
- Set production env: `SITE_URL`, `NEXT_PUBLIC_SITE_URL` = `https://3phaseflow.com`; SMTP / Resend from `@3phaseflow.com` (and `mail.3phaseflow.com` if used); update `INTUIT_REDIRECT_URI`, PayPal return/webhook URLs, `ALLOWED_API_ORIGINS`, IndexNow key for the new host.
- Forward mail from old `@iqmotorbase.com` addresses if needed.
- Search Console: verify new property, submit sitemap, optional Change of Address from the old domain.
- Smoke: homepage OG/favicon, login, test email send, Track + Wire PWA install text, 301 from an old host.

## Optional

- **HTTPS** – Serve the app over HTTPS (handled by your host or reverse proxy).
- **Cookie security** – Cookies use `secure: true` and `sameSite: "lax"` in production.
