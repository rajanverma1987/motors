import Link from "next/link";
import Button from "@/components/ui/button";
import { HomePageJsonLd } from "@/components/seo/JsonLd";
import HeroBackground from "@/components/marketing/HeroBackground";

const workflowFeatures = [
  {
    title: "Work orders from quote to delivery",
    detail: "Create work orders directly from approved quotes so job details, scope, and pricing flow through without re-entry. Motor specs, customer info, and line items carry over automatically—reducing errors and saving time so your team can focus on the repair, not data entry.",
  },
  {
    title: "Center floor job board",
    detail: "A visual board with status columns (e.g. Received, Inspection, Rewinding, Testing, Ready) shows exactly where every motor is. Drag or tap to move jobs as work progresses, so the board always reflects reality. Managers get at-a-glance visibility; technicians know what’s next without asking.",
  },
  {
    title: "Motor job tags with QR codes",
    detail: "Print a durable tag for each motor; technicians scan the QR code on a phone or tablet to update status from the center floor. No walking back to a desk or hunting for the right record—scan, tap the new status, and the job board updates for everyone in real time.",
  },
  {
    title: "Customer's motors registry",
    detail: "Keep a digital record of every motor: serial number, specs, service history, and test results linked to the same motor over time. When a repeat customer sends in a motor, you see past repairs and test data instantly, so you can quote and plan work with full context.",
  },
  {
    title: "Quotes system and approval tracking",
    detail: "A full quotes system: build quotes with labor and parts, attach to customers and motors, and send for approval. Track when the customer approves and convert to a work order with one click. Approval status is visible to the whole team, so you know which jobs are confirmed and which are still pending—no more duplicate data or lost follow-ups.",
  },
  {
    title: "Quote parts from shop inventory",
    detail: "Add line items from your master parts catalog directly on the quote: see available quantity (on hand minus what’s reserved for other active jobs), order shortfalls with vendor POs when needed, and let reservations hold stock for the job until delivery. When the work order ships, consumed quantities come off inventory automatically so your books match the floor.",
  },
];

const managementFeatures = [
  {
    title: "Technician mobile app (shop-floor first)",
    href: "/technician-mobile-app-shop-floor-first",
    detail: "Give technicians a dedicated mobile app to run jobs from the floor: scan motor QR tags, open assigned work orders, post live status updates, and record motor testing notes/values as work happens. This is a core workflow advantage—office and floor stay in sync in real time without extra calls, paper notes, or desk-only updates.",
  },
  {
    title: "Customer database and contacts",
    detail: "Store company names, primary and secondary contacts, addresses, and billing details in one place. View full job history and motor records per customer so you can answer questions quickly, spot repeat work, and tailor service—without digging through spreadsheets or old paperwork.",
  },
  {
    title: "Billing and invoice creation",
    detail: "Generate invoices from completed work orders and approved quote line items so amounts match what was agreed. Add extra charges or adjustments if needed, then link each invoice to accounts receivable. Everything stays traceable from job to payment.",
  },
  {
    title: "Accounts receivable and payment tracking",
    detail: "Track outstanding balances by customer, record payments (including via payment link so customers can pay online), and keep full financial history in one place. Aging reports and payment history help you follow up on past-due accounts and keep cash flow visible.",
  },
  {
    title: "Vendor management and purchase orders",
    detail: "Manage suppliers with contact and terms in one list. Create purchase orders for parts and materials, attach vendor invoices when they arrive, and track PO status (open, invoiced, paid). You always know what’s on order and what’s been paid—reducing duplicate orders and missed bills.",
  },
  {
    title: "Shop parts inventory and stock control",
    detail: "Run a parts catalog with SKU, unit of measure, on-hand and reserved counts, low-stock alerts, and optional locations (bins or aisles from settings). Manual adds and adjustments keep day-to-day accurate; receiving against vendor POs in logistics bumps stock without double entry. Dashboard reports highlight low inventory so you reorder before jobs wait on parts.",
  },
  {
    title: "Receiving and shipping logistics",
    detail: "Log motors and parts in and out: customer motors arriving for repair, vendor deliveries for POs, and shipments back to customers. Each movement can be tied to the relevant work order or PO, so you have a clear chain of custody and can answer “where is it?” in seconds.",
  },
  {
    title: "Reports and productivity insights",
    detail: "See revenue, completed jobs, technician workload, and top customers in one system. Use these views to run the business—spot bottlenecks, plan capacity, and understand which customers and job types drive the most value—without exporting to spreadsheets.",
  },
  {
    title: "API and CRM integrations",
    detail: "An API is available to integrate MotorsWinding.com with any other CRM or business system. Sync customers, work orders, and quotes with your existing tools, build custom workflows, or connect to accounting and ERP—so you can keep one source of truth while using the apps your team already relies on.",
  },
  {
    title: "Upload your existing data",
    detail: "Bring your existing customers, motors, and job history into the platform. Upload your data so you can switch without starting from scratch—we support common formats and can help you migrate from spreadsheets or other systems so your records and history stay in one place.",
  },
  {
    title: "Public marketplace listings",
    detail:
      "Publish spare parts, surplus motors, and tools to the MotorsWinding.com marketplace from your dashboard. Each listing gets its own SEO-friendly page; buyers submit a request (no checkout on our site) and you manage follow-up and fulfillment from your CRM alongside work orders and invoices.",
  },
  {
    title: "Employee job postings (public careers)",
    detail:
      "Post open roles for technicians, winders, and shop staff from your CRM. Listings appear on the public Careers page with your shop name and location, and each job gets its own SEO-friendly URL. Candidates apply online; you review applications in the dashboard—so hiring stays in the same system as work orders and customers.",
  },
];

const leadFeatures = [
  {
    title: "Lead capture from directory and local SEO",
    detail: "Repair inquiries come from the MotorsWinding.com directory and from local search pages (e.g. “electric motor repair Houston” or “emergency motor repair near me”). All leads land in one inbox so you don’t chase inquiries across multiple sites or email threads—you see and respond from a single place.",
  },
  {
    title: "Shared and exclusive lead distribution",
    detail: "Choose shared leads (sent to multiple centers so you can compete on service and speed) or exclusive leads (sent only to you). Emergency and high-value jobs can be routed as exclusive, giving you first shot and better conversion without competing against other centers on the same inquiry.",
  },
  {
    title: "Lead credit balance and delivery",
    detail: "Top up a lead credit balance; the system deducts credits when a lead is delivered to you. You control spend and budget predictably. When credits are available, you never miss a lead—so you can stay in the flow of new repair opportunities without overcommitting.",
  },
  {
    title: "Convert leads to customers and work orders",
    detail: "When you win the job, convert the lead into a customer and a work order in one step. The inquiry, follow-up, and job all live in the same system—no re-entering motor details or customer info into a separate tool. Full history stays in one place for reporting and repeat business.",
  },
];

export default function HomePage() {
  return (
    <>
      <HomePageJsonLd />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background: soft gradient + grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-card to-card" aria-hidden />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_40%,transparent_100%)] opacity-50" aria-hidden />
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
            {/* Left: copy + CTAs */}
            <div>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                Built for motor repair centers
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-title sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
                A system that manages{" "}
                <span className="text-primary underline decoration-primary/40 decoration-2 underline-offset-4">
                  everything
                </span>{" "}
                for your electric motor repair company.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-secondary sm:text-xl">
                From first lead through cash collection, vendor buying, payables, and sales commissions—one connected
                workflow instead of scattered spreadsheets and apps. Job board, inventory, invoicing, repair leads,{" "}
                <Link href="/careers" className="font-medium text-primary hover:underline">
                  hiring
                </Link>
                , and the{" "}
                <Link href="/marketplace" className="font-medium text-primary hover:underline">
                  marketplace
                </Link>{" "}
                are built in too.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/contact">
                  <Button variant="primary" size="lg">
                    Get a demo
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" size="lg">
                    See what’s included
                  </Button>
                </a>
              </div>
              <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-2 text-sm text-secondary sm:gap-x-10">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  Quotes system & quote-to-delivery
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  Floor & office in sync
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  Repair leads built in
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  <Link href="/careers" className="hover:text-primary hover:underline">
                    Careers &amp; job postings for shops
                  </Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  <Link href="/marketplace" className="hover:text-primary hover:underline">
                    Marketplace for parts & surplus
                  </Link>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  Shop inventory, reservations &amp; low-stock alerts
                </li>
              </ul>
            </div>
            {/* Right: business pipeline (see documents/hero.md) */}
            <div className="relative">
              <div className="rounded-2xl border border-border bg-card p-7 shadow-lg shadow-primary/10 sm:p-10">
                <p className="text-center text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
                  Platform features
                </p>
                <p className="mt-1.5 text-center text-xs text-secondary">
                  Compact, connected workflow
                </p>
                <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {[
                    "Leads",
                    "Customers",
                    "Quotes",
                    "Work Order and Motor Testing Data",
                    "Accounts receivable",
                    "Vendor PO",
                    "Accounts payable",
                    "Sales commissions",
                    "... and many more",
                  ].map((label, i) => (
                    <div
                      key={label}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-bg/80 px-3.5 py-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold tabular-nums text-primary">
                        {i + 1}
                      </span>
                      <p className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-title">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-border bg-bg/70 p-4">
                  <Link
                    href="/technician-mobile-app-shop-floor-first"
                    className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
                  >
                    Mobile App For Technician on the floor
                  </Link>
                  <p className="mt-2 text-sm text-secondary">
                    Give technicians mobile access to assigned jobs on the shop floor. They can scan motor QR tags,
                    update work status in real time, and add testing notes without going back to a desk. This keeps the
                    office and floor synced throughout the repair process.
                  </p>
                </div>
                <p className="mt-6 text-center text-sm text-secondary">
                  Everything linked in one system
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why one platform */}
      <section className="border-t border-border bg-bg pt-16 pb-10 sm:pt-24 sm:pb-12">
        <div className="mx-auto max-w-[82.8rem] px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">
              No more paperwork, more time for your business
            </h2>
            <p className="mt-4 text-lg text-secondary">
              Spreadsheets, sticky notes, and separate tools don&apos;t scale. Here&apos;s why repair centers run on a single system.
            </p>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M2.25 13.5V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.5" />
                </svg>
              </span>
              <h3 className="mt-4 font-semibold text-title">One place for every job</h3>
              <p className="mt-2 text-sm text-secondary">
                From quote to delivery you keep a single job record—no re-entering motor details, re-typing specs, or chasing paper between center and office. Everyone sees the same status and history, so handoffs are smooth and nothing falls through the cracks.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </span>
              <h3 className="mt-4 font-semibold text-title"> Floor and office in sync</h3>
              <p className="mt-2 text-sm text-secondary">
                Technicians update status from the floor using mobile app; managers see it instantly on the same board. No more walking back to a desk to log progress or guessing where a motor is—the system stays current so scheduling and customer updates are accurate.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.008 1.5 1.908v2.388c0 1.024-.921 1.832-1.95 1.918a25.09 25.09 0 01-3.813.475.585.585 0 01-.426-.17L10.5 11.5l-4.461 4.462a.585.585 0 01-.426.17 25.09 25.09 0 01-3.813-.475C1.92 12.756 1 11.948 1 10.924V8.536c0-.9.616-1.624 1.5-1.908V6.75A2.25 2.25 0 014.5 4.5h15A2.25 2.25 0 0121 6.75v1.761z" />
                </svg>
              </span>
              <h3 className="mt-4 font-semibold text-title">Leads that fit your workflow</h3>
              <p className="mt-2 text-sm text-secondary">
                New repair inquiries land in the same system you use for jobs and customers. You can convert a lead to a customer and work order without re-entering data in another tool—so new business flows into one place and stays trackable from first contact to delivery.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </span>
              <h3 className="mt-4 font-semibold text-title">Less admin, more repair work</h3>
              <p className="mt-2 text-sm text-secondary">
                Invoicing, AR, vendors, shop parts inventory, and receiving live in one place instead of scattered across spreadsheets and other apps. You spend less time switching tools and re-keying data, and more time on the repair work and customer service that actually drive revenue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* All features */}
      <section id="features" className="pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              Platform
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">
              Features
            </h2>
            <p className="mt-4 text-lg text-secondary">
              Everything you need to run and grow your motor repair center—workflow, operations,{" "}
              <strong className="font-medium text-title">shop parts inventory</strong> (on-hand, reserved, locations,
              low-stock), leads,{" "}
              <Link href="/careers" className="font-medium text-primary hover:underline">
                employee job postings
              </Link>{" "}
              on the public Careers page, and a separate{" "}
              <Link href="/marketplace" className="font-medium text-primary hover:underline">
                public marketplace
              </Link>{" "}
              for surplus and equipment you want to advertise to buyers.
            </p>
          </div>

          {/* Motor repair workflow */}
          <div className="mt-20 rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10 lg:p-12">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </span>
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">Workflow</span>
            </div>
            <h3 className="mt-6 text-2xl font-bold text-title sm:text-3xl">
              Motor repair workflow
            </h3>
            <p className="mt-3 max-w-2xl text-secondary">
              Track every job from the moment it arrives to delivery. Use the quotes system to build and send quotes, then create work orders from approved quotes and move jobs across the center floor board. Technicians update status via motor tags and mobile—so the board always reflects reality. Each capability below is designed to reduce re-entry, keep center and office aligned, and give you one source of truth for every repair.
            </p>
            <ul className="mt-8 space-y-6">
              {workflowFeatures.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden>
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </span>
                  <div>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="font-medium text-primary underline decoration-primary/50 underline-offset-2 hover:decoration-primary"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-title">{item.title}</span>
                    )}
                    <p className="mt-0.5 text-sm text-secondary">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Job management tools */}
          <div className="mt-12 rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10 lg:p-12">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </span>
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">Operations</span>
            </div>
            <h3 className="mt-6 text-2xl font-bold text-title sm:text-3xl">
              Job management tools
            </h3>
            <p className="mt-3 max-w-2xl text-secondary">
              One system for customers, the quotes system, invoicing, vendors, shop inventory, and logistics. Create invoices from completed work orders, track payments, manage parts on hand and reservations, and handle receiving and shipping—so you never switch tools for day-to-day operations. The items below cover how you keep financials, suppliers, stock, and physical flow in sync without leaving the platform.
            </p>
            <ul className="mt-8 space-y-6">
              {managementFeatures.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden>
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </span>
                  <div>
                    <span className="font-medium text-title">{item.title}</span>
                    <p className="mt-0.5 text-sm text-secondary">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Lead generation network */}
          <div className="mt-12 rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10 lg:p-12">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </span>
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">Growth</span>
            </div>
            <h3 className="mt-6 text-2xl font-bold text-title sm:text-3xl">
              Lead generation network
            </h3>
            <p className="mt-3 max-w-2xl text-secondary">
              Get repair inquiries from the MotorsWinding.com directory and local SEO pages. Choose shared or exclusive leads, manage your lead credit balance, and convert won leads into customers and work orders—so new jobs flow into the same system you already use. Below is how capture, distribution, credits, and conversion work together to grow your pipeline without extra tools.
            </p>
            <ul className="mt-8 space-y-6">
              {leadFeatures.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden>
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </span>
                  <div>
                    <span className="font-medium text-title">{item.title}</span>
                    <p className="mt-0.5 text-sm text-secondary">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/list-your-electric-motor-services">
                <Button variant="primary" size="lg">
                  List your repair center on the public directory
                </Button>
              </Link>
            </div>
          </div>

          {/* Public marketplace highlight */}
          <div className="mt-12 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-card p-8 shadow-sm sm:p-10 lg:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-wide text-primary">Marketplace</span>
                </div>
                <h3 className="mt-4 text-2xl font-bold text-title sm:text-3xl">List excess inventory on the public site</h3>
                <p className="mt-3 max-w-2xl text-secondary">
                  Publish parts, motors, tools, and surplus from your CRM. Each listing gets its own SEO-friendly URL.
                  Buyers search and filter on{" "}
                  <Link href="/marketplace" className="font-medium text-primary hover:underline">
                    the marketplace
                  </Link>
                  , then send a request—no payment on our portal. You handle follow-up and fulfillment; orders stay in
                  your dashboard.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/marketplace">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto lg:w-full">
                    Browse marketplace
                  </Button>
                </Link>
                <Link href="/motor-repair-marketplace">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto lg:w-full">
                    Why shops use it
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Careers / hiring highlight */}
          <div className="mt-12 rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10 lg:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.051.282-4.126.424-6.378.424s-4.327-.142-6.378-.424c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006a2.18 2.18 0 00-.75-1.661V6.25l-6-1.036-6 1.036v4.348a2.18 2.18 0 00.75 1.662m4.5 0a2.18 2.18 0 01-.75-1.662V6.25l6 1.036v4.348zM3.75 14.25v4.125c0 1.036.84 1.875 1.875 1.875h4.5c1.036 0 1.875-.84 1.875-1.875V14.25m-9.75 0h9.75"
                      />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-wide text-primary">Hiring</span>
                </div>
                <h3 className="mt-4 text-2xl font-bold text-title sm:text-3xl">Post jobs, candidates apply on the site</h3>
                <p className="mt-3 max-w-2xl text-secondary">
                  Shops using the CRM can publish employee job postings that appear on the public{" "}
                  <Link href="/careers" className="font-medium text-primary hover:underline">
                    Careers
                  </Link>{" "}
                  page—technicians, winders, and other roles with your business name, location, and an apply flow. You
                  manage listings and applications from the dashboard alongside work orders.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/careers">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto lg:w-full">
                    Browse open roles
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto lg:w-full">
                    Get CRM access to post jobs
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Custom pricing */}
          <div className="mt-12 rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10 lg:p-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <span className="text-sm font-semibold uppercase tracking-wide text-primary">Custom pricing</span>
                <h3 className="mt-3 text-2xl font-bold text-title sm:text-3xl">
                  Pricing tailored to your workflow
                </h3>
                <p className="mt-3 max-w-2xl text-secondary">
                  Every business is different. We analyze your process and offer the best pricing model - monthly,
                  yearly, or one-time.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/pricing">
                  <Button variant="primary" size="sm" className="w-full sm:w-auto lg:w-full">
                    Get pricing
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto lg:w-full">
                    Book a demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* List your center */}
      <section className="border-t border-border bg-bg py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10 lg:p-12">
            <div className="flex flex-col items-center gap-6 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
                  List your repair company in the directory - Free to list
                </h2>
                <p className="mt-3 max-w-xl text-secondary">
                  Add your company to the MotorsWinding.com network. Get found by customers searching for motor repair and rewinding in your area. Free to list—submit your details and we’ll review and publish your listing. With CRM access you can also{" "}
                  <Link href="/careers" className="font-medium text-primary hover:underline">
                    post employee job openings
                  </Link>{" "}
                  on our public Careers page.
                </p>
              </div>
              <Link href="/list-your-electric-motor-services" className="shrink-0">
                <Button variant="primary" size="lg">
                  List your center
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">
            Ready to streamline your center?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-secondary">
            Contact us for a demo and see how MotorsWinding.com can help you manage jobs, stock, grow with leads, and hire
            through public job postings.
          </p>
          <div className="mt-10">
            <Link href="/contact">
              <Button variant="primary" size="lg">
                Contact for demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
