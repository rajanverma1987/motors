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
- Set `NEXT_PUBLIC_SITE_URL` for emails and canonical URLs (e.g. `https://motorswinding.com`).
- Configure email (SMTP or Resend) and `EMAIL_FROM`.

## Performance

- **Indexes** – Listing (status, submittedAt, companyName) and Lead (createdAt) have indexes. Ensure MongoDB has built them after first deploy.
- **Caching** – Public listing APIs send `Cache-Control: public, s-maxage=60, stale-while-revalidate=120` for CDN/browser caching.
- **Headers** – Next config sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and disables `X-Powered-By`.

## Optional

- **HTTPS** – Serve the app over HTTPS (handled by your host or reverse proxy).
- **Cookie security** – Cookies use `secure: true` and `sameSite: "lax"` in production.
