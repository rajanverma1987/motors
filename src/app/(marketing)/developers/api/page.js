export const metadata = {
  title: "Public API Documentation",
  description: "Integrate external systems with Motors CRM using account API keys and webhook events.",
};

const collections = [
  "customers",
  "motors",
  "quotes",
  "workOrders",
  "invoices",
  "inventoryItems",
  "vendors",
  "purchaseOrders",
  "employees",
  "logisticsEntries",
  "leads",
  "supportTickets",
  "marketplaceItems",
  "marketplaceOrders",
  "policies",
  "directoryListings",
];

export default function PublicApiDocsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-sm">
      <h1 className="text-3xl font-bold text-title">Motors CRM Public API</h1>
      <p className="mt-3 text-secondary">
        This API is for client account integrations only. It excludes all admin functionality.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-title">1) Create API key in dashboard</h2>
        <ol className="list-decimal pl-5 text-secondary space-y-1">
          <li>Login to CRM dashboard.</li>
          <li>Go to <strong>Tools & reports → API integrations</strong>.</li>
          <li>Click <strong>Create key</strong>.</li>
          <li>Copy the key immediately (shown once).</li>
        </ol>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-title">2) Authentication</h2>
        <p className="text-secondary">Use either header:</p>
        <pre className="rounded border border-border bg-card p-3 overflow-x-auto">X-API-Key: motors_sk_xxx</pre>
        <p className="text-secondary">or:</p>
        <pre className="rounded border border-border bg-card p-3 overflow-x-auto">Authorization: Bearer motors_sk_xxx</pre>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-title">3) Base URL and methods</h2>
        <pre className="rounded border border-border bg-card p-3 overflow-x-auto">{`GET  /api/public/v1/:collection
POST /api/public/v1/:collection
GET  /api/public/v1/:collection/:id
PUT  /api/public/v1/:collection/:id`}</pre>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-title">4) Supported collections</h2>
        <div className="rounded border border-border bg-card p-3">
          <code>{collections.join(", ")}</code>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-title">5) Query params (list endpoint)</h2>
        <pre className="rounded border border-border bg-card p-3 overflow-x-auto">{`limit=50 (max 200)
skip=0
updatedAfter=2026-01-01T00:00:00.000Z`}</pre>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold text-title">6) Webhooks</h2>
        <p className="text-secondary">
          Configure webhooks in dashboard <strong>API integrations</strong>. Event names:
        </p>
        <div className="rounded border border-border bg-card p-3 space-y-1">
          {collections.map((c) => (
            <div key={c}>
              <code>{`crm.${c}.created`}</code> / <code>{`crm.${c}.updated`}</code>
            </div>
          ))}
        </div>
        <p className="text-secondary">
          Webhook signature headers:
        </p>
        <pre className="rounded border border-border bg-card p-3 overflow-x-auto">{`X-Motors-Event: crm.customers.created
X-Motors-Timestamp: 1710000000000
X-Motors-Signature: sha256=<hex hmac>
X-Motors-Request-Id: <uuid>`}</pre>
        <p className="text-secondary">
          Signature input format: <code>{`<timestamp>.<raw_json_payload>`}</code> using HMAC-SHA256 and your webhook secret.
        </p>
      </section>
    </main>
  );
}

