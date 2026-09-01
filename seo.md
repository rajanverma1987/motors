# IQMotorBase.com — Pricing Page + AI Optimization

# File 1 of 2



# PRICING PAGE: /pricing

# - Standard pricing shown clearly ($349/mo, $3,235/yr)

# - Countdown timer on founder spots remaining (10 spots)

# - "Get Founder Pricing" CTA → contact form on same page

# - General query contact form

# - No coupon code — discount given manually after contact



# AI OPTIMIZATION: Key pages structured for ChatGPT/Perplexity citation

# - Cost page enhancement

# - Near-me hub enhancement

# - Homepage meta enhancement

---

## FILE 1 — PRICING PAGE

### File: `app/pricing/page.tsx`

```tsx
import type { Metadata } from 'next';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Pricing — Motor Repair Shop Software | IQMotorBase',
  description:
    'IQMotorBase shop management software starts at $349/month. ' +
    'Work orders, leads, inventory, invoicing, and QuickBooks sync — ' +
    'built exclusively for electric motor repair shops. ' +
    '10 founder spots available at a permanently locked rate.',
  alternates: {
    canonical: 'https://iqmotorbase.com/pricing',
  },
  openGraph: {
    title: 'Pricing — Motor Repair Shop Software | IQMotorBase',
    description:
      'IQMotorBase starts at $349/month. Built exclusively for electric ' +
      'motor repair shops. 10 founder spots available.',
    url: 'https://iqmotorbase.com/pricing',
    siteName: 'IQMotorBase.com',
    type: 'website',
  },
};

// Schema — helps Google and AI tools understand pricing
const pricingSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'IQMotorBase',
  url: 'https://iqmotorbase.com',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description:
    'Shop management software built exclusively for electric motor repair ' +
    'and rewinding businesses. Work orders, lead generation, inventory, ' +
    'invoicing, accounts receivable, vendor POs, QuickBooks Online sync, ' +
    'and technician mobile app.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Monthly Plan',
      price: '349.00',
      priceCurrency: 'USD',
      billingIncrement: 'P1M',
      description:
        'Full platform access billed monthly. Work orders, leads, ' +
        'inventory, invoicing, QuickBooks sync. Cancel anytime.',
    },
    {
      '@type': 'Offer',
      name: 'Annual Plan',
      price: '3235.00',
      priceCurrency: 'USD',
      billingIncrement: 'P1Y',
      description:
        'Full platform access billed annually. Save $983/year vs monthly. ' +
        'Equivalent to $269/month.',
    },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much does IQMotorBase cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'IQMotorBase costs $349/month on the monthly plan or $3,235/year ' +
          'on the annual plan (equivalent to $269/month, saving $983/year). ' +
          'Both plans include unlimited users and full platform access — ' +
          'work orders, lead generation, inventory, invoicing, accounts ' +
          'receivable, vendor POs, and QuickBooks Online sync.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is included in IQMotorBase pricing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'All plans include: digital job write-ups with motor nameplate data, ' +
          'work order tracking, customer and motor history registry, shop ' +
          'inventory management, invoicing and accounts receivable, vendor ' +
          'purchase orders, QuickBooks Online sync, lead generation from the ' +
          'IQMotorBase directory, marketplace listings, careers/job board, ' +
          'and API access. Technician mobile app coming soon.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does IQMotorBase offer a free trial?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'IQMotorBase offers a free demo rather than a self-serve trial. ' +
          'Book a 20-minute demo to see the full platform and get your ' +
          'questions answered before committing.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a discount for annual billing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Yes. The annual plan costs $3,235/year — equivalent to $269/month — ' +
          'saving $983 compared to 12 months of monthly billing. ' +
          'Founder pricing is also available for the first 10 shops — ' +
          'contact us for details.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is IQMotorBase founder pricing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'IQMotorBase is offering a permanently locked discounted rate to ' +
          'the first 10 shops that join the platform. Founder pricing is ' +
          'locked for life — your rate never increases as long as you stay ' +
          'subscribed. Contact us to check if founder spots are still available.',
      },
    },
    {
      '@type': 'Question',
      name: 'How many users are included?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Both plans include unlimited users. Add as many technicians, ' +
          'service writers, managers, and office staff as your shop needs ' +
          'at no extra charge.',
      },
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <ol>
            <li><a href="/">Home</a></li>
            <li aria-hidden>›</li>
            <li aria-current="page">Pricing</li>
          </ol>
        </nav>

        {/* Hero */}
        <h1>Simple, transparent pricing</h1>
        <p className="pricing-subheading">
          One platform. Unlimited users. Everything your motor repair shop needs
          to manage jobs, leads, inventory, and billing — built for this industry,
          not adapted from auto repair software.
        </p>

        {/* Pricing cards + founder CTA — Client Component */}
        <PricingClient />

        {/* What's included — server rendered for AI/SEO */}
        <section aria-labelledby="included-heading">
          <h2 id="included-heading">Everything included in every plan</h2>
          <p>
            No add-ons. No per-user fees. No surprise charges.
            Every plan includes the full IQMotorBase platform:
          </p>

          <dl className="pricing-features">
            <div>
              <dt>Digital job write-ups</dt>
              <dd>
                Create job write-ups with full motor nameplate data — HP, voltage,
                RPM, frame, enclosure, insulation class, winding data.
                Every job starts with a complete motor record, not a blank form.
              </dd>
            </div>
            <div>
              <dt>Work order management</dt>
              <dd>
                Track every job from intake through testing to delivery.
                Status updates, technician assignments, QR code scanning,
                and job history — all in one view.
              </dd>
            </div>
            <div>
              <dt>Customer and motor registry</dt>
              <dd>
                Every customer's motors on file. Full repair history, nameplate data,
                previous job details — instantly available when a motor comes back
                in. No re-entering data that's already in the system.
              </dd>
            </div>
            <div>
              <dt>Shop inventory management</dt>
              <dd>
                Track parts, wire, and consumables. Reserve inventory to jobs.
                Get low-stock alerts before you run out of something critical
                mid-rewind.
              </dd>
            </div>
            <div>
              <dt>Invoicing and accounts receivable</dt>
              <dd>
                Generate invoices directly from completed work orders.
                Track payments, send reminders, and manage AR — without
                switching to a separate accounting tool.
              </dd>
            </div>
            <div>
              <dt>Vendor POs and accounts payable</dt>
              <dd>
                Create and track purchase orders to suppliers.
                Manage what you owe and when it's due — all connected
                to your job costs.
              </dd>
            </div>
            <div>
              <dt>QuickBooks Online sync</dt>
              <dd>
                Invoices and payments sync to QuickBooks Online automatically.
                No double entry. Your accountant gets accurate books without
                you manually exporting anything.
              </dd>
            </div>
            <div>
              <dt>Lead generation directory</dt>
              <dd>
                Your shop is listed in the IQMotorBase public directory —
                indexed on Google, reaching industrial buyers searching for
                motor repair in your area. Leads land in your dashboard.
              </dd>
            </div>
            <div>
              <dt>Marketplace and careers board</dt>
              <dd>
                List surplus parts and equipment on the IQMotorBase marketplace.
                Post open technician and winder positions on the careers board —
                reaching the right candidates in the motor repair trade.
              </dd>
            </div>
            <div>
              <dt>Unlimited users</dt>
              <dd>
                Add every technician, service writer, and manager at no extra cost.
                Role-based access controls what each user can see and do.
              </dd>
            </div>
            <div>
              <dt>Technician mobile app</dt>
              <dd>
                Coming soon. Technicians will be able to scan job QR codes,
                update work order status, and log motor testing data from
                the shop floor — without going back to a desk.
              </dd>
            </div>
          </dl>
        </section>

        {/* FAQ — server rendered */}
        <section aria-labelledby="faq-pricing-heading">
          <h2 id="faq-pricing-heading">Pricing questions</h2>
          {/* FAQ accordion rendered in PricingClient */}
        </section>

        {/* Contact form — server rendered wrapper, form in client */}
        <section aria-labelledby="contact-pricing-heading" id="contact">
          <h2 id="contact-pricing-heading">Have a question before you book?</h2>
          <p>
            Ask us anything — pricing, features, onboarding, or whether
            IQMotorBase is the right fit for your shop size and workflow.
          </p>
        </section>

      </main>
    </>
  );
}

```

---

### File: `app/pricing/PricingClient.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import RepairRequestForm from '@/components/RepairRequestForm';

// Founder spots remaining — update this number manually as spots fill
// Or connect to an API endpoint that returns the current count
const FOUNDER_SPOTS_TOTAL = 10;
const FOUNDER_SPOTS_TAKEN = 1; // Update as spots fill
const FOUNDER_SPOTS_LEFT = FOUNDER_SPOTS_TOTAL - FOUNDER_SPOTS_TAKEN;

const faqs = [
  {
    q: 'How much does IQMotorBase cost?',
    a: 'IQMotorBase costs $349/month on the monthly plan or $3,235/year on the annual plan (equivalent to $269/month, saving $983/year). Both plans include unlimited users and full platform access.',
  },
  {
    q: 'What is included in the price?',
    a: 'All plans include: job write-ups, work orders, customer and motor registry, inventory, invoicing, AR, vendor POs, QuickBooks Online sync, lead generation directory, marketplace, careers board, and API access. Technician mobile app coming soon.',
  },
  {
    q: 'Is there a free trial?',
    a: 'We offer a free 20-minute demo rather than a self-serve trial. Book a demo to see the full platform before committing. Most shop owners have everything they need to decide after the demo.',
  },
  {
    q: 'What is founder pricing?',
    a: 'Founder pricing is a permanently locked discounted rate for the first 10 shops that join IQMotorBase. Your rate never increases as long as you stay subscribed — no matter what the standard price becomes. Contact us to check if spots are still available.',
  },
  {
    q: 'How many users are included?',
    a: 'Unlimited users on all plans. Add every technician, service writer, and manager at no extra cost.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Monthly plans can be cancelled at the end of any billing period. Annual plans are billed upfront for the year — contact us if your circumstances change.',
  },
];

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  message: string;
  requestType: 'founder' | 'general';
}

export default function PricingClient() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: '', email: '', phone: '', message: '',
    requestType: 'general',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const setField = (field: keyof ContactForm, value: string) =>
    setContactForm((prev) => ({ ...prev, [field]: value }));

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.email) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/pricing-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message ?? 'Failed');
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* ── Billing toggle ── */}
      <div className="pricing-toggle">
        <button
          className={`pricing-toggle-btn ${billing === 'monthly' ? 'active' : ''}`}
          onClick={() => setBilling('monthly')}
        >
          Monthly
        </button>
        <button
          className={`pricing-toggle-btn ${billing === 'annual' ? 'active' : ''}`}
          onClick={() => setBilling('annual')}
        >
          Annual
          <span className="pricing-toggle-save">Save $983</span>
        </button>
      </div>

      {/* ── Pricing cards ── */}
      <div className="pricing-cards">

        {/* Standard plan */}
        <div className="pricing-card">
          <div className="pricing-card-header">
            <h2>Standard</h2>
            <div className="pricing-card-price">
              <span className="pricing-amount">
                {billing === 'monthly' ? '$349' : '$269'}
              </span>
              <span className="pricing-period">/month</span>
            </div>
            {billing === 'annual' && (
              <p className="pricing-billed-as">Billed as $3,235/year</p>
            )}
            <p className="pricing-card-desc">
              Full platform for your motor repair shop.
              Everything you need from day one.
            </p>
          </div>

          <ul className="pricing-features-list">
            {[
              'Digital job write-ups with motor nameplate data',
              'Work order tracking — intake to delivery',
              'Customer and motor history registry',
              'Shop inventory management',
              'Invoicing and accounts receivable',
              'Vendor POs and accounts payable',
              'QuickBooks Online sync',
              'Lead generation directory listing',
              'Marketplace and careers board',
              'Unlimited users',
              'API access',
              'Technician mobile app — coming soon',
            ].map((f) => (
              <li key={f}>
                <span className="pricing-check">✓</span> {f}
              </li>
            ))}
          </ul>

          <a href="/contact" className="pricing-cta-primary">
            Book a free demo →
          </a>
          <p className="pricing-cta-note">
            20 minutes. No pressure. See if it fits your shop.
          </p>
        </div>

        {/* Founder pricing card */}
        <div className="pricing-card pricing-card-founder">
          <div className="pricing-card-badge">
            🔥 Limited — {FOUNDER_SPOTS_LEFT} of {FOUNDER_SPOTS_TOTAL} spots left
          </div>

          <div className="pricing-card-header">
            <h2>Founder Pricing</h2>
            <div className="pricing-card-price">
              <span className="pricing-amount pricing-amount-blur">
                ••••
              </span>
              <span className="pricing-period">/month</span>
            </div>
            <p className="pricing-billed-as">
              Permanently locked — your rate never increases
            </p>
            <p className="pricing-card-desc">
              A significantly discounted rate locked in for life for the
              first {FOUNDER_SPOTS_TOTAL} shops that join IQMotorBase.
              Contact us to check availability and get your exclusive rate.
            </p>
          </div>

          <ul className="pricing-features-list">
            {[
              'Everything in Standard — nothing removed',
              'Permanently locked rate — guaranteed for life',
              'Priority onboarding and setup support',
              'Direct access to the founding team',
              'Input on product roadmap and new features',
              'Founder badge on your directory listing',
            ].map((f) => (
              <li key={f}>
                <span className="pricing-check pricing-check-founder">✓</span> {f}
              </li>
            ))}
          </ul>

          <button
            className="pricing-cta-founder"
            onClick={() => {
              setField('requestType', 'founder');
              document.getElementById('pricing-contact-form')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }}
          >
            Request founder pricing →
          </button>
          <p className="pricing-cta-note" style={{ color: '#854F0B' }}>
            {FOUNDER_SPOTS_LEFT} spots remaining. No obligation to ask.
          </p>
        </div>
      </div>

      {/* ── Countdown / urgency bar ── */}
      <div className="pricing-urgency-bar">
        <div className="pricing-urgency-dots">
          {Array.from({ length: FOUNDER_SPOTS_TOTAL }).map((_, i) => (
            <div
              key={i}
              className={`pricing-urgency-dot ${i < FOUNDER_SPOTS_TAKEN ? 'taken' : 'available'}`}
            />
          ))}
        </div>
        <p className="pricing-urgency-text">
          <strong>{FOUNDER_SPOTS_LEFT} founder spots remaining</strong> —
          once filled, pricing returns to standard rate permanently.
        </p>
      </div>

      {/* ── Contact form ── */}
      <div className="pricing-contact-wrap" id="pricing-contact-form">
        <div className="pricing-contact-header">
          <h2>
            {contactForm.requestType === 'founder'
              ? 'Request founder pricing'
              : 'Have a question before you book?'}
          </h2>
          <p>
            {contactForm.requestType === 'founder'
              ? `You're requesting access to our founder pricing — a permanently locked rate for the first ${FOUNDER_SPOTS_TOTAL} shops. We'll confirm your rate and availability within a few hours.`
              : 'Ask us anything — pricing, features, onboarding, or whether IQMotorBase fits your shop. We respond within a few hours.'}
          </p>

          {/* Toggle between founder and general */}
          <div className="pricing-contact-type-toggle">
            <button
              className={contactForm.requestType === 'founder' ? 'active' : ''}
              onClick={() => setField('requestType', 'founder')}
            >
              Request founder pricing
            </button>
            <button
              className={contactForm.requestType === 'general' ? 'active' : ''}
              onClick={() => setField('requestType', 'general')}
            >
              General question
            </button>
          </div>
        </div>

        {!submitted ? (
          <div className="pricing-contact-form">
            <div className="pricing-form-row">
              <div className="pricing-form-field">
                <label>Your name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={contactForm.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </div>
              <div className="pricing-form-field">
                <label>Work email *</label>
                <input
                  type="email"
                  placeholder="you@yourshop.com"
                  value={contactForm.email}
                  onChange={(e) => setField('email', e.target.value)}
                />
              </div>
            </div>

            <div className="pricing-form-field">
              <label>Phone number</label>
              <input
                type="tel"
                placeholder="Best number to reach you"
                value={contactForm.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </div>

            {contactForm.requestType === 'general' && (
              <div className="pricing-form-field">
                <label>Your question</label>
                <textarea
                  placeholder="What would you like to know about IQMotorBase?"
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setField('message', e.target.value)}
                />
              </div>
            )}

            {contactForm.requestType === 'founder' && (
              <div className="pricing-form-field">
                <label>Tell us about your shop (optional)</label>
                <textarea
                  placeholder="Shop name, location, how many jobs per month — anything that helps us understand your situation."
                  rows={3}
                  value={contactForm.message}
                  onChange={(e) => setField('message', e.target.value)}
                />
              </div>
            )}

            {submitError && (
              <div className="pricing-form-error">{submitError}</div>
            )}

            <button
              className={
                contactForm.requestType === 'founder'
                  ? 'pricing-submit-founder'
                  : 'pricing-submit-general'
              }
              disabled={!contactForm.name || !contactForm.email || submitting}
              onClick={handleContactSubmit}
            >
              {submitting
                ? 'Sending…'
                : contactForm.requestType === 'founder'
                ? 'Request founder pricing →'
                : 'Send my question →'}
            </button>

            <p className="pricing-form-privacy">
              We respond within a few hours during business hours.
              Your details are never shared or sold.
            </p>
          </div>
        ) : (
          <div className="pricing-form-success">
            <div className="pricing-success-icon">✓</div>
            <h3>
              {contactForm.requestType === 'founder'
                ? 'Request received — we\'ll be in touch shortly'
                : 'Got your question — we\'ll reply soon'}
            </h3>
            <p>
              {contactForm.requestType === 'founder'
                ? `We'll confirm your founder rate and availability within a few hours. In the meantime, book a demo to see the platform:`
                : 'While you wait, book a free demo to see IQMotorBase in action:'}
            </p>
            <a href="/contact" className="pricing-cta-primary" style={{ display: 'inline-block', marginTop: '12px' }}>
              Book a free 20-minute demo →
            </a>
          </div>
        )}
      </div>

      {/* ── FAQ Accordion ── */}
      <section aria-labelledby="faq-pricing-heading" style={{ marginTop: '48px' }}>
        <h2 id="faq-pricing-heading">Pricing questions</h2>
        <dl>
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item">
              <dt>
                <button
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-pricing-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  <span aria-hidden>{openFaq === i ? '−' : '+'}</span>
                </button>
              </dt>
              <dd id={`faq-pricing-${i}`} hidden={openFaq !== i}>
                <p>{faq.a}</p>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

```

---

### File: `app/api/pricing-contact/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, message, requestType } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Send to your CRM
    const crmRes = await fetch(
      `${process.env.CRM_BASE_URL}/api/leads/inbound`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRM_API_KEY}`,
        },
        body: JSON.stringify({
          source: 'pricing_page',
          type: requestType, // 'founder' or 'general'
          contact: { name, email, phone },
          message,
          submittedAt: new Date().toISOString(),
          // Tag founder requests as high priority
          priority: requestType === 'founder' ? 'high' : 'normal',
        }),
      }
    );

    if (!crmRes.ok) {
      console.error('CRM pricing contact failed:', await crmRes.text());
      return NextResponse.json(
        { success: false, message: 'Unable to process. Please try again.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Pricing contact error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}

```

---

### CSS — Add to global stylesheet

```css
/* ── Pricing Page ─────────────────────────────────────── */

.pricing-subheading {
  font-size: 16px;
  color: #475569;
  max-width: 620px;
  line-height: 1.6;
  margin: 8px 0 32px;
}

/* Billing toggle */
.pricing-toggle {
  display: flex;
  gap: 0;
  background: #F1F5F9;
  border-radius: 10px;
  padding: 4px;
  width: fit-content;
  margin: 0 auto 32px;
}

.pricing-toggle-btn {
  background: none;
  border: none;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #64748B;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pricing-toggle-btn.active {
  background: white;
  color: #1A202C;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  font-weight: 600;
}

.pricing-toggle-save {
  font-size: 11px;
  background: #DCFCE7;
  color: #15803D;
  padding: 2px 7px;
  border-radius: 20px;
  font-weight: 600;
}

/* Cards */
.pricing-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
  align-items: start;
}

@media (max-width: 700px) {
  .pricing-cards { grid-template-columns: 1fr; }
}

.pricing-card {
  background: white;
  border: 1.5px solid #E2E8F0;
  border-radius: 16px;
  padding: 28px;
  position: relative;
}

.pricing-card-founder {
  border-color: #EF9F27;
  background: #FFFBEB;
}

.pricing-card-badge {
  background: #EF9F27;
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 16px;
}

.pricing-card-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1A202C;
  margin: 0 0 12px;
}

.pricing-card-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}

.pricing-amount {
  font-size: 42px;
  font-weight: 700;
  color: #1A202C;
  line-height: 1;
}

.pricing-amount-blur {
  filter: blur(8px);
  color: #854F0B;
  user-select: none;
}

.pricing-period {
  font-size: 16px;
  color: #64748B;
}

.pricing-billed-as {
  font-size: 13px;
  color: #64748B;
  margin: 0 0 12px;
}

.pricing-card-desc {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 20px;
}

/* Features list */
.pricing-features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pricing-features-list li {
  font-size: 14px;
  color: #334155;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}

.pricing-check {
  color: #16A34A;
  font-weight: 700;
  flex-shrink: 0;
}

.pricing-check-founder {
  color: #92400E;
}

/* CTAs */
.pricing-cta-primary {
  display: block;
  background: #1D4ED8;
  color: white;
  border-radius: 10px;
  padding: 13px 20px;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  transition: background 0.15s;
  border: none;
  cursor: pointer;
  width: 100%;
}

.pricing-cta-primary:hover { background: #1E40AF; }

.pricing-cta-founder {
  display: block;
  background: #D97706;
  color: white;
  border-radius: 10px;
  padding: 13px 20px;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  transition: background 0.15s;
  border: none;
  cursor: pointer;
  width: 100%;
}

.pricing-cta-founder:hover { background: #B45309; }

.pricing-cta-note {
  font-size: 12px;
  color: #94A3B8;
  text-align: center;
  margin: 8px 0 0;
}

/* Urgency bar */
.pricing-urgency-bar {
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 48px;
}

.pricing-urgency-dots {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.pricing-urgency-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.pricing-urgency-dot.taken { background: #EF9F27; }
.pricing-urgency-dot.available { background: #E2E8F0; border: 1px solid #CBD5E1; }

.pricing-urgency-text {
  font-size: 14px;
  color: #92400E;
  margin: 0;
}

/* Features DL */
.pricing-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 700px;
  margin: 16px 0 48px;
}

.pricing-features > div {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  padding: 16px 18px;
}

.pricing-features dt {
  font-size: 14px;
  font-weight: 700;
  color: #1A202C;
  margin-bottom: 6px;
}

.pricing-features dd {
  font-size: 14px;
  color: #475569;
  line-height: 1.7;
  margin: 0;
}

/* Contact form */
.pricing-contact-wrap {
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 16px;
  padding: 32px;
  margin: 48px 0;
  scroll-margin-top: 80px;
}

.pricing-contact-header h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px;
}

.pricing-contact-header p {
  font-size: 14px;
  color: #475569;
  margin: 0 0 20px;
  line-height: 1.6;
}

.pricing-contact-type-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.pricing-contact-type-toggle button {
  background: white;
  border: 1.5px solid #D1D5DB;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #64748B;
  cursor: pointer;
  transition: all 0.15s;
}

.pricing-contact-type-toggle button.active {
  border-color: #D97706;
  background: #FFFBEB;
  color: #92400E;
  font-weight: 600;
}

.pricing-contact-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pricing-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 560px) {
  .pricing-form-row { grid-template-columns: 1fr; }
}

.pricing-form-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pricing-form-field label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.pricing-form-field input,
.pricing-form-field textarea {
  border: 1.5px solid #D1D5DB;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #1A202C;
  background: white;
  width: 100%;
  box-sizing: border-box;
}

.pricing-form-field input:focus,
.pricing-form-field textarea:focus {
  outline: none;
  border-color: #1D4ED8;
}

.pricing-form-field textarea { resize: vertical; }

.pricing-form-error {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #DC2626;
}

.pricing-submit-founder {
  background: #D97706;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 13px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.pricing-submit-founder:hover:not(:disabled) { background: #B45309; }
.pricing-submit-founder:disabled { background: #94A3B8; cursor: not-allowed; }

.pricing-submit-general {
  background: #1D4ED8;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 13px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.pricing-submit-general:hover:not(:disabled) { background: #1E40AF; }
.pricing-submit-general:disabled { background: #94A3B8; cursor: not-allowed; }

.pricing-form-privacy {
  font-size: 12px;
  color: #9CA3AF;
  text-align: center;
}

.pricing-form-success {
  text-align: center;
  padding: 24px 0;
}

.pricing-success-icon {
  width: 48px;
  height: 48px;
  background: #16A34A;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  margin: 0 auto 16px;
}

.pricing-form-success h3 {
  font-size: 18px;
  font-weight: 700;
  color: #15803D;
  margin: 0 0 8px;
}

.pricing-form-success p {
  font-size: 14px;
  color: #475569;
  margin: 0;
}

```

