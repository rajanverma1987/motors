# IQMotorBase.com — AI Search Optimization
# File 2 of 2
#
# GOAL: Get IQMotorBase cited more frequently by ChatGPT, Perplexity,
#       Claude, Gemini, and other AI tools when users ask about:
#       - Motor repair costs
#       - How to find a motor repair shop
#       - Motor rewinding near me
#       - Motor repair software for shops
#
# WHY THIS MATTERS:
#   Clarity data shows chatgpt.com sent 29 sessions in 90 days.
#   Those 29 sessions averaged 724 seconds on the cost page — the
#   highest engagement of ANY traffic source on the site.
#   AI tools are already recommending IQMotorBase organically.
#   These changes will increase how often and how prominently.
#
# HOW AI CITATION WORKS:
#   AI tools cite pages that have:
#   1. Specific, verifiable facts (numbers, dates, standards, ranges)
#   2. Clear structure (H2s, H3s, definition lists, tables)
#   3. Direct answers to the exact question asked
#   4. Authoritative source signals (schema, canonical, citations)
#   5. No fluff — every sentence adds information
#
# PAGES TO UPDATE:
#   1. /cost-of-motor-repair-and-rewinding  (already being cited by ChatGPT)
#   2. /electric-motor-repair-near-me       (high intent buyer queries)
#   3. Homepage meta + schema               (brand citation)
#   4. New: /about                          (who IQMotorBase is — AI needs this)

---

## AI OPTIMIZATION RULE — APPLY TO EVERY PAGE

Before writing any content for AI optimization, follow this rule:

Every paragraph must contain at least ONE of:
- A specific number (dollar amount, HP rating, time period, percentage)
- A proper noun (EASA, NEMA, IEEE, specific motor type)
- A direct answer to a "who/what/where/when/how much" question
- A comparison (repair vs replace, monthly vs annual, standard vs emergency)

Remove or rewrite any paragraph that is purely transitional or decorative.
AI tools skip vague paragraphs and cite specific ones.

---

## FILE 1 — COST PAGE AI ENHANCEMENT

### File: `app/cost-of-motor-repair-and-rewinding/page.tsx`

Add these sections to the existing page. Do not remove existing content.
Insert the "Quick answer" section at the very top — before any existing content.
Insert the "Comparison table" and "What affects cost" sections after the existing cost ranges.

#### Add at the very TOP of the page (before H1):

```tsx
{/* Quick answer block — AI tools cite this directly */}
<div className="ai-quick-answer">
  <p>
    <strong>Quick answer:</strong> Motor rewinding costs between $400 and $9,000
    in the United States, depending on horsepower, motor type, and whether
    emergency turnaround is needed. AC motor rewinds on motors under 50 HP
    typically cost $1,200–$3,500. Full rewinds on 50–200 HP motors cost
    $3,000–$9,000. Emergency rewinds carry a 25–50% surcharge above
    standard rates. These are US shop averages at standard (non-emergency)
    turnaround as of 2025–2026.
  </p>
</div>
```

#### Add the speakable schema to the page (server component):

```tsx
// Speakable schema — tells AI tools exactly which content to cite
const speakableSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Motor Rewinding Cost Guide',
  url: 'https://iqmotorbase.com/cost-of-motor-repair-and-rewinding',
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.ai-quick-answer', '.cost-table', 'h1', 'h2'],
  },
  mainEntity: {
    '@type': 'Article',
    headline: 'Motor Rewinding Cost: What Shops Charge in 2026',
    datePublished: '2025-01-01',
    dateModified: new Date().toISOString().split('T')[0],
    author: {
      '@type': 'Organization',
      name: 'IQMotorBase',
      url: 'https://iqmotorbase.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'IQMotorBase',
      logo: {
        '@type': 'ImageObject',
        url: 'https://iqmotorbase.com/logo.png',
      },
    },
    description:
      'Motor rewinding costs between $400 and $9,000 in the United States ' +
      'depending on horsepower, motor type, and urgency. ' +
      'Full cost guide with ranges by HP, repair type, and emergency surcharges.',
  },
};
```

#### Add a structured cost table (server rendered):

```tsx
<section aria-labelledby="cost-table-heading">
  <h2 id="cost-table-heading">
    Motor rewinding cost by horsepower — US shop averages (2025–2026)
  </h2>
  <p>
    The following ranges reflect US motor repair shop pricing at standard
    (non-emergency) turnaround. Prices vary by region, motor complexity,
    and shop. Emergency surcharges of 25–50% apply for rush work.
    Source: IQMotorBase shop network pricing data.
  </p>
  <table className="cost-table">
    <thead>
      <tr>
        <th>Motor HP</th>
        <th>Bearing replacement</th>
        <th>Full rewind (AC stator)</th>
        <th>DC armature rewind</th>
        <th>Emergency surcharge</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Fractional – 10 HP</td><td>$150–$600</td><td>$400–$900</td><td>$350–$800</td><td>+25–40%</td></tr>
      <tr><td>10–25 HP</td><td>$300–$800</td><td>$800–$1,800</td><td>$700–$1,500</td><td>+25–40%</td></tr>
      <tr><td>25–50 HP</td><td>$400–$1,000</td><td>$1,200–$3,500</td><td>$1,000–$2,500</td><td>+25–50%</td></tr>
      <tr><td>50–100 HP</td><td>$600–$1,200</td><td>$2,500–$5,000</td><td>$2,000–$4,000</td><td>+25–50%</td></tr>
      <tr><td>100–200 HP</td><td>$800–$1,500</td><td>$4,000–$8,000</td><td>$3,500–$6,000</td><td>+25–50%</td></tr>
      <tr><td>200–500 HP</td><td>$1,200–$3,000</td><td>$7,000–$20,000</td><td>$6,000–$15,000</td><td>+25–50%</td></tr>
      <tr><td>500+ HP</td><td>$2,000+</td><td>Quote individually</td><td>Quote individually</td><td>Negotiated</td></tr>
    </tbody>
  </table>
  <p style={{ fontSize: '13px', color: '#64748B' }}>
    Note: High-voltage motors above 4kV require form-wound coil construction
    and are priced individually regardless of HP. Generator rewinding is priced
    separately — see the{' '}
    <a href="/generator-rewinding-cost">generator rewinding cost guide</a>.
  </p>
</section>

<section aria-labelledby="cost-factors-heading">
  <h2 id="cost-factors-heading">What affects motor repair and rewinding cost</h2>

  <dl className="ai-fact-list">
    <div>
      <dt>Motor horsepower</dt>
      <dd>
        HP is the primary cost driver. A 5 HP single-phase motor rewind
        costs $400–$700. The same job on a 100 HP three-phase motor costs
        $2,500–$5,000. Larger motors require more copper wire, more labor
        hours, and longer cure cycles in the impregnation oven.
      </dd>
    </div>
    <div>
      <dt>Voltage class</dt>
      <dd>
        Motors above 600V (medium voltage) require form-wound coil
        construction rather than random-wound winding. Form-wound rewinds
        cost 2–4x more than random-wound equivalents at the same HP because
        coils must be individually formed, insulated, and installed rather
        than machine-wound.
      </dd>
    </div>
    <div>
      <dt>Failure type and scope</dt>
      <dd>
        Bearing replacement is the least expensive repair ($150–$1,500
        depending on frame size). A full rewind — where all copper winding
        must be stripped and replaced — costs significantly more.
        Partial winding repairs (single-phase winding on a two-speed motor,
        for example) are typically priced between these extremes.
      </dd>
    </div>
    <div>
      <dt>Emergency vs standard turnaround</dt>
      <dd>
        Standard turnaround is 5–10 business days for most motors under
        200 HP. Emergency turnaround (24–72 hours) carries a premium of
        25–50% above standard rates due to overtime labor, expedited parts
        sourcing, and priority queue scheduling.
      </dd>
    </div>
    <div>
      <dt>EASA AR100 compliance</dt>
      <dd>
        Shops that follow EASA AR100 rewind standards perform core loss
        testing before and after stator burnout. This adds time and cost
        but preserves motor efficiency — the EASA/AEMT Rewind Study found
        no measurable efficiency loss on motors rewound to these standards.
        Rewinds from non-EASA-compliant shops may cost less upfront but
        risk efficiency degradation and early re-failure.
      </dd>
    </div>
    <div>
      <dt>Freight and logistics</dt>
      <dd>
        Motors that cannot be transported locally must be shipped to a
        repair facility. Freight costs for motors under 500 lbs typically
        run $150–$400 for ground shipping. Motors above 500 lbs require
        flatbed or LTL freight — $300–$800 or more depending on distance.
        Many shops in the IQMotorBase directory offer pickup and delivery
        within their service region.
      </dd>
    </div>
  </dl>
</section>
```

---

## FILE 2 — NEAR-ME HUB AI ENHANCEMENT

### File: `app/electric-motor-repair-near-me/page.tsx`

Add a "Quick answer" block at the top and an Article schema:

```tsx
// Add to server component — Article schema for AI citation
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Electric Motor Repair and Rewinding Near Me — How to Find a Shop',
  url: 'https://iqmotorbase.com/electric-motor-repair-near-me',
  datePublished: '2025-01-01',
  dateModified: new Date().toISOString().split('T')[0],
  author: {
    '@type': 'Organization',
    name: 'IQMotorBase',
    url: 'https://iqmotorbase.com',
  },
  publisher: {
    '@type': 'Organization',
    name: 'IQMotorBase',
    logo: { '@type': 'ImageObject', url: 'https://iqmotorbase.com/logo.png' },
  },
  description:
    'How to find a certified electric motor repair and rewinding shop near you. ' +
    'Covers what to prepare, how to evaluate shops, EASA accreditation, ' +
    'turnaround times, and cost ranges.',
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.ai-quick-answer', 'h1', 'h2'],
  },
};
```

Add at the top of page content:

```tsx
<div className="ai-quick-answer">
  <p>
    <strong>Quick answer:</strong> To find an electric motor repair or
    rewinding shop near you, use the IQMotorBase directory to browse
    certified shops by state and city. Most US cities have at least one
    EASA-accredited repair center within a 50-mile radius. Standard motor
    repair turnaround is 5–10 business days. Emergency repair is available
    at many shops within 24–72 hours at a 25–50% premium. AC motor
    rewinding, DC armature rewinding, servo motor repair, high-voltage
    rewinding, pump repair, and generator rewinding are all available
    through the IQMotorBase network.
  </p>
</div>
```

---

## FILE 3 — HOMEPAGE AI + SCHEMA ENHANCEMENT

### File: `app/page.tsx` — update Organization schema

```tsx
// Replace existing Organization schema with enhanced version
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': ['Organization', 'SoftwareApplication'],
  name: 'IQMotorBase',
  alternateName: 'IQ Motor Base',
  url: 'https://iqmotorbase.com',
  logo: 'https://iqmotorbase.com/logo.png',
  foundingDate: '2025',
  description:
    'IQMotorBase is a shop management platform and lead generation directory ' +
    'built exclusively for electric motor repair and rewinding businesses. ' +
    'The platform includes digital job write-ups with motor nameplate data, ' +
    'work order management, customer and motor history registry, shop inventory, ' +
    'invoicing, accounts receivable, vendor purchase orders, QuickBooks Online sync, ' +
    'and a public directory of certified motor repair shops across the United States. ' +
    'Pricing starts at $349 per month for unlimited users.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '349.00',
    priceCurrency: 'USD',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: '349.00',
      priceCurrency: 'USD',
      unitCode: 'MON',
    },
  },
  knowsAbout: [
    'Electric motor repair',
    'Motor rewinding',
    'AC motor rewinding',
    'DC motor armature rewinding',
    'High-voltage motor repair',
    'Servo motor repair',
    'Motor repair shop management software',
    'EASA AR100 rewind standards',
    'NEMA motor standards',
    'Motor repair cost estimation',
  ],
  areaServed: {
    '@type': 'Country',
    name: 'United States',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Sales',
    url: 'https://iqmotorbase.com/contact',
    availableLanguage: 'English',
  },
  sameAs: [
    // Add your LinkedIn, Twitter/X, Facebook page URLs here
  ],
};
```

---

## FILE 4 — CREATE /about PAGE (AI needs this to know who you are)

AI tools like ChatGPT frequently check About pages to verify the authority
of a source before citing it. IQMotorBase currently has no real About page.
This is the single most impactful trust signal for AI citation.

### File: `app/about/page.tsx`

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About IQMotorBase — Motor Repair Shop Software & Directory',
  description:
    'IQMotorBase is a shop management platform and lead generation directory ' +
    'built exclusively for electric motor repair and rewinding businesses. ' +
    'Founded in 2025. Based in the United States.',
  alternates: { canonical: 'https://iqmotorbase.com/about' },
  openGraph: {
    title: 'About IQMotorBase',
    description:
      'Shop management software and lead generation directory built exclusively ' +
      'for electric motor repair and rewinding businesses.',
    url: 'https://iqmotorbase.com/about',
    siteName: 'IQMotorBase.com',
  },
};

const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About IQMotorBase',
  url: 'https://iqmotorbase.com/about',
  mainEntity: {
    '@type': 'Organization',
    name: 'IQMotorBase',
    url: 'https://iqmotorbase.com',
    foundingDate: '2025',
    description:
      'IQMotorBase is a shop management platform and public directory built ' +
      'exclusively for electric motor repair and rewinding businesses in the ' +
      'United States. The platform manages work orders, customer and motor ' +
      'history, inventory, invoicing, and leads. The public directory lists ' +
      'certified repair centers by state, connecting industrial buyers with ' +
      'local motor repair shops.',
    areaServed: 'United States',
    knowsAbout: [
      'Electric motor repair',
      'Motor rewinding',
      'Shop management software',
      'Motor repair cost estimation',
      'EASA AR100 standards',
      'Lead generation for motor repair shops',
    ],
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <main>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <ol>
            <li><a href="/">Home</a></li>
            <li aria-hidden>›</li>
            <li aria-current="page">About</li>
          </ol>
        </nav>

        <h1>About IQMotorBase</h1>

        {/* AI-optimized paragraphs — every sentence has a fact */}
        <section aria-labelledby="story-heading">
          <h2 id="story-heading">How IQMotorBase started</h2>
          <p>
            IQMotorBase started with one motor repair shop running entirely
            on paper — job cards everywhere, winding data written on travelers
            that got lost, work orders tracked on a whiteboard, and invoices
            going out late because nobody could find the completed job sheet.
          </p>
          <p>
            The founding team built a database in Microsoft Excel and Access
            to manage that shop's jobs, work orders, billing, and motor history.
            After several months of refinement and real-world use, the system
            worked. The question became: how many other motor repair shops
            are running the same way?
          </p>
          <p>
            The answer was almost all of them. IQMotorBase launched in 2025
            to bring purpose-built shop management software to the electric
            motor repair industry — an industry that had never had software
            designed specifically for its workflow.
          </p>
        </section>

        <section aria-labelledby="what-heading">
          <h2 id="what-heading">What IQMotorBase is</h2>
          <p>
            IQMotorBase is two things operating as one platform:
          </p>
          <dl className="about-two-sides">
            <div>
              <dt>Shop management software</dt>
              <dd>
                A purpose-built CRM and operations platform for electric motor
                repair shops. Features include digital job write-ups with full
                motor nameplate data (HP, voltage, RPM, frame, enclosure,
                insulation class, winding specifications), work order tracking
                from intake through testing to delivery, customer and motor
                history registry, shop parts inventory with job reservations,
                invoicing, accounts receivable, vendor purchase orders, accounts
                payable, QuickBooks Online sync, and API access. Technician
                mobile app is in development.
                Pricing starts at $349 per month for unlimited users.
              </dd>
            </div>
            <div>
              <dt>Lead generation directory</dt>
              <dd>
                A public directory of certified electric motor repair centers
                across the United States, indexed on Google and optimized for
                local motor repair searches. Industrial buyers searching for
                AC motor rewinding, DC armature repair, high-voltage motor
                service, servo motor repair, pump repair, and generator
                rewinding can find and contact listed shops directly.
                Shop listings include capabilities, certifications, service
                area, HP range, turnaround time, and emergency availability.
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="who-heading">
          <h2 id="who-heading">Who IQMotorBase serves</h2>
          <p>
            IQMotorBase serves two audiences:
          </p>
          <ul className="about-audiences">
            <li>
              <strong>Motor repair shop owners and operators</strong> who need
              a system to manage jobs, customers, inventory, and billing — and
              who want to generate leads from industrial buyers searching online
              for repair services in their area.
            </li>
            <li>
              <strong>Industrial buyers</strong> — maintenance managers, plant
              engineers, procurement managers, and operations directors —
              who need to find a certified motor repair or rewinding shop
              near their facility for AC motors, DC motors, high-voltage motors,
              servo motors, pumps, and generators.
            </li>
          </ul>
        </section>

        <section aria-labelledby="standards-heading">
          <h2 id="standards-heading">Industry standards IQMotorBase references</h2>
          <p>
            Content and shop matching on IQMotorBase references the following
            industry standards:
          </p>
          <ul className="about-standards">
            <li>
              <strong>EASA AR100</strong> — Recommended Practice for the Repair
              of Rotating Electrical Apparatus, published by the Electrical
              Apparatus Service Association. The primary standard for motor
              rewinding quality and efficiency preservation.
            </li>
            <li>
              <strong>NEMA MG-1</strong> — Motors and Generators standard
              published by the National Electrical Manufacturers Association.
              Governs motor design, performance, and testing in North America.
            </li>
            <li>
              <strong>IEEE 43</strong> — Recommended Practice for Testing
              Insulation Resistance of Rotating Machinery.
            </li>
            <li>
              <strong>IEEE 95</strong> — Recommended Practice for Insulation
              Testing of AC Electric Machinery using High Voltage at Very Low
              Frequency.
            </li>
            <li>
              <strong>EISA 2007</strong> — Energy Independence and Security Act,
              which mandated NEMA Premium Efficiency standards for general-purpose
              motors 1–500 HP sold in the United States.
            </li>
          </ul>
        </section>

        <section aria-labelledby="contact-about-heading">
          <h2 id="contact-about-heading">Contact IQMotorBase</h2>
          <p>
            For shop owners interested in listing or the platform:{' '}
            <a href="/contact">Book a demo or contact us</a>.
          </p>
          <p>
            For industrial buyers looking for motor repair:{' '}
            <a href="/electric-motor-repair-near-me">
              Find motor repair shops near you
            </a>.
          </p>
        </section>

        {/* Related pages for internal linking */}
        <section aria-labelledby="related-about-heading">
          <h2 id="related-about-heading">Learn more</h2>
          <ul className="related-links">
            <li><a href="/motor-repair-shop-management-software">Motor repair shop management software</a></li>
            <li><a href="/electric-motor-repair-near-me">Find electric motor repair shops near me</a></li>
            <li><a href="/cost-of-motor-repair-and-rewinding">Motor repair and rewinding cost guide</a></li>
            <li><a href="/pricing">IQMotorBase pricing</a></li>
            <li><a href="/electric-motor-repair-shops-listings">Browse all repair centers</a></li>
          </ul>
        </section>
      </main>
    </>
  );
}
```

---

## FILE 5 — AI-OPTIMIZED CSS

```css
/* AI quick answer block */
.ai-quick-answer {
  background: #F0F7FF;
  border-left: 4px solid #1D4ED8;
  border-radius: 0 10px 10px 0;
  padding: 16px 20px;
  margin: 0 0 32px;
  font-size: 15px;
  color: #1E3A5F;
  line-height: 1.7;
  max-width: 760px;
}

.ai-quick-answer strong {
  color: #1D4ED8;
}

/* AI fact list */
.ai-fact-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 740px;
  margin: 16px 0 32px;
}

.ai-fact-list > div {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  padding: 16px 18px;
}

.ai-fact-list dt {
  font-size: 14px;
  font-weight: 700;
  color: #1A202C;
  margin-bottom: 6px;
}

.ai-fact-list dd {
  font-size: 14px;
  color: #475569;
  line-height: 1.7;
  margin: 0;
}

/* About page */
.about-two-sides {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 740px;
  margin: 16px 0 32px;
}

.about-two-sides > div {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  padding: 18px 20px;
}

.about-two-sides dt {
  font-size: 15px;
  font-weight: 700;
  color: #1A202C;
  margin-bottom: 8px;
}

.about-two-sides dd {
  font-size: 14px;
  color: #475569;
  line-height: 1.7;
  margin: 0;
}

.about-audiences,
.about-standards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 20px;
  max-width: 700px;
  margin: 12px 0 32px;
}

.about-audiences li,
.about-standards li {
  font-size: 14px;
  color: #334155;
  line-height: 1.7;
}
```

---

## VERIFICATION CHECKLIST

### Pricing page
- [ ] Standard price ($349/mo, $3,235/yr) visible on page
- [ ] Founder spots countdown dots visible (1 taken, 9 available)
- [ ] "Request founder pricing" button scrolls to contact form
- [ ] Contact form toggles between "founder" and "general" mode
- [ ] POST `/api/pricing-contact` returns `{ success: true }` on valid submission
- [ ] CRM receives lead with `source: 'pricing_page'` and `type: 'founder'` or `'general'`
- [ ] Pricing schema renders in page source (`curl ... | grep "application/ld+json"`)
- [ ] FAQPage schema renders in page source
- [ ] Validate at https://validator.schema.org/
- [ ] Submit URL in GSC for indexing

### AI optimization
- [ ] Cost page has "Quick answer" blue box at top
- [ ] Cost page has HP cost table (server rendered — visible in View Source)
- [ ] Cost page speakable schema in page source
- [ ] Near-me hub has "Quick answer" block at top
- [ ] Homepage Organization schema updated with pricing and knowsAbout fields
- [ ] `/about` page live and loads correctly
- [ ] About page AboutPage + Organization schema in source

### After deploy — monitor AI citations
- [ ] Search "motor rewinding cost" in ChatGPT — does IQMotorBase appear?
- [ ] Search "find motor repair shop near me" in Perplexity — cited?
- [ ] Search "IQMotorBase" in ChatGPT — does it know what the platform is?
- [ ] Check Clarity in 30 days — chatgpt.com referrals should increase
- [ ] Check GSC in 30 days — /about page should start getting impressions