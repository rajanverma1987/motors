"use client";

import Link from "next/link";
import { SectionTitle } from "@/components/ui/typography";

const WORKFLOW_FEATURES = [
  "Work orders from quote to delivery",
  "Center floor job board",
  "Motor job tags with QR codes",
  "Customer and motor asset registry",
  "Quotes system and approval tracking",
];

const MANAGEMENT_FEATURES = [
  "Customer database and contacts",
  "Billing and invoice creation",
  "Accounts receivable and payment tracking",
  "Vendor management and purchase orders",
  "Receiving and shipping logistics",
  "Reports and productivity insights",
  "API and CRM integrations",
  "Upload your existing data",
];

const LEAD_FEATURES = [
  "Lead capture from directory and local SEO",
  "Shared and exclusive lead distribution",
  "Lead credit balance and delivery",
  "Convert leads to customers and work orders",
];

function FeatureList({ title, items }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-title">{title}</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-secondary">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-bg">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-title">
          <p className="font-medium">Thank you for registering.</p>
          <p className="mt-1 text-sm text-secondary">Our team will contact you soon.</p>
        </div>

        <div className="mb-8 rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-secondary">Get more visibility—list your repair center in our directory and show up when customers search.</p>
          <Link
            href="/list-your-electric-motor-services"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            List your motor shop
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>

        <SectionTitle className="mb-2">Portal under development</SectionTitle>
        <p className="mb-8 text-secondary">
          The full CRM and job management portal is being built. When it’s ready, you’ll get access to the features below. In the meantime, your listing is live and you can receive repair leads from the directory.
        </p>

        <div className="rounded-xl border border-border bg-card p-6">
          <FeatureList title="Workflow & job management" items={WORKFLOW_FEATURES} />
          <FeatureList title="Management & operations" items={MANAGEMENT_FEATURES} />
          <FeatureList title="Leads from the directory" items={LEAD_FEATURES} />
        </div>
      </main>
    </div>
  );
}
