# 3PhaseFlow

Repo layout:

- `apps/` platform hosts (marketing, admin)
- `clients/` isolated shop apps (e.g. cemotor)
- `dev/` evaluator monolith, scripts, and npm tooling
- `shop_uploads/` per-shop file storage

## Develop (evaluator / shared platform)

```bash
cd dev
npm install
npm run dev
```

## Client / host apps

```bash
cd apps/marketing   # or apps/admin, clients/cemotor
npm install
npm run dev
```

Secrets live in the **repo root** `.env` (not committed). Copy from `.env.example`.

Ops docs: `dev/documents/ManualCutover.md`
