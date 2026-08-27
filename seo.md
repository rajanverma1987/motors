# IQMotorBase.com — CTR Fix: Add "Rewinding" to Metadata
# Problem: 316 rewinding-specific queries, 6,190 impressions, 15 clicks (0.24% CTR)
# Root cause: H1s, title tags, and meta descriptions say "repair" but not "rewinding"
# Searchers looking for "motor rewinding near me" see "repair" in the title — don't click
#
# PAGES AFFECTED:
#   1. /electric-motor-repair-near-me        (near-me hub — biggest traffic page)
#   2. /motor-repair-shop/[city]-[state]     (all city pages — template fix)
#   3. /cost-of-motor-repair-and-rewinding   (cost page — zero clicks at pos 14)
#   4. /electric-motor-repair-shops-listings (directory index)
#   5. /electric-motor-repair                (general hub)
#   6. /industrial-motor-repair              (industrial hub)
#
# WHAT TO CHANGE: H1, title tag, meta description, og:title, og:description only
# WHAT NOT TO CHANGE: page content, URL slugs, internal links, schema

---

## THE PATTERN — apply this thinking to every fix below

```
BEFORE (repair-only):   "Electric Motor Repair Near Me"
AFTER  (repair + rewind): "Electric Motor Repair & Rewinding Near Me"

BEFORE (generic desc):  "Find certified electric motor repair shops near you."
AFTER  (specific desc): "Find certified electric motor repair and rewinding shops
                          near you — AC, DC, armature, and stator rewinding."
```

The word "rewinding" in the title is what makes someone searching
"motor rewinding near me" click your result instead of skipping it.
Keep titles under 60 characters. Keep descriptions under 160 characters.

---

## FIX 1 — /electric-motor-repair-near-me

### Current state (confirmed live):
```
Title:       Electric Motor Repair Near Me — Find Local Motor Repair Shops | IQMotorBase
H1:          Electric motor repair near me
Meta desc:   Find certified electric motor repair and rewinding shops near you.
             Browse by state, compare capabilities, and submit a repair request in minutes.
OG title:    Electric Motor Repair Near Me | IQMotorBase
OG desc:     Find certified electric motor repair shops near you.
             Browse by state or submit a repair request.
```

The meta description already says "rewinding" — good.
The title and H1 do not. That's the gap.

### File: `app/electric-motor-repair-near-me/page.tsx`

```tsx
export const metadata: Metadata = {
  // BEFORE:
  // title: 'Electric Motor Repair Near Me — Find Local Motor Repair Shops | IQMotorBase',

  // AFTER — "rewinding" added, stays under 60 chars in Google display:
  title: 'Electric Motor Repair & Rewinding Near Me | IQMotorBase',

  // Meta description — already good but improve specificity:
  // BEFORE:
  // description: 'Find certified electric motor repair and rewinding shops near you.
  //   Browse by state, compare capabilities, and submit a repair request in minutes.',

  // AFTER — adds "armature" and "stator" for long-tail rewinding queries:
  description:
    'Find certified electric motor repair and rewinding shops near you. AC motor rewinding, DC armature rewinding, stator rewinds, and emergency service. Browse by state or submit a request.',

  alternates: {
    canonical: 'https://iqmotorbase.com/electric-motor-repair-near-me',
  },

  openGraph: {
    // BEFORE:
    // title: 'Electric Motor Repair Near Me | IQMotorBase',
    // description: 'Find certified electric motor repair shops near you...',

    // AFTER:
    title: 'Electric Motor Repair & Rewinding Near Me | IQMotorBase',
    description:
      'Find certified motor repair and rewinding shops near you. AC, DC, armature, stator, and emergency rewinds. Browse by state or submit a repair request.',
    url: 'https://iqmotorbase.com/electric-motor-repair-near-me',
    siteName: 'IQMotorBase.com',
    type: 'website',
    locale: 'en_US',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Electric Motor Repair & Rewinding Near Me | IQMotorBase',
    description:
      'Find certified motor repair and rewinding shops near you. Browse by state or submit a repair request.',
  },
};
```

### H1 update — in the page component JSX:

```tsx
// FIND in app/electric-motor-repair-near-me/page.tsx or NearMeClient.tsx:
// BEFORE:
<h1>Electric motor repair near me</h1>

// AFTER:
<h1>Electric motor repair and rewinding near me</h1>
```

### Trust bar chips — update one chip to mention rewinding:

```tsx
// BEFORE:
// - 33+ states covered
// - EASA-accredited shops listed
// - AC · DC · Servo · High-voltage
// - 24/7 emergency repair available

// AFTER — swap third chip:
// - 33+ states covered
// - EASA-accredited shops listed
// - AC · DC · Armature · Stator rewinding    ← changed
// - 24/7 emergency service available
```

---

## FIX 2 — /motor-repair-shop/[city]-[state] (ALL CITY PAGES)

### Current state (confirmed from search snippets):
City pages currently show titles like:
```
Title:   "Motor Repair Shops in St. Louis, Missouri | IQMotorBase"
H1:      "Motor repair shops in [city], [state]"
```

No mention of rewinding anywhere in the title, H1, or meta description.
GSC shows "motor rewinding services st louis" (114 imp, pos 13) — zero clicks.
That query is matching the city page but the title says "repair shops" not "rewinding."

### File: `app/motor-repair-shop/[city]/page.tsx`
(or wherever your city page `generateMetadata` lives)

```tsx
export async function generateMetadata({
  params,
}: {
  params: { city: string; state?: string };
}): Promise<Metadata> {

  // Derive display labels from URL params
  const cityLabel = params.city
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // State label — derive from your existing logic
  // (however you currently format the state name)
  const stateLabel = /* your existing state label logic */ '';

  const canonical = `https://iqmotorbase.com/motor-repair-shop/${params.city}`;

  return {
    // BEFORE:
    // title: `Motor Repair Shops in ${cityLabel}, ${stateLabel} | IQMotorBase`

    // AFTER — adds "Rewinding":
    title: `Electric Motor Repair & Rewinding Shops in ${cityLabel}, ${stateLabel} | IQMotorBase`,

    // BEFORE (generic — no rewinding mention):
    // description: `Browse motor repair and rewinding centers in ${cityLabel}, ${stateLabel}.`

    // AFTER — specific, includes rewinding, includes CTA:
    description:
      `Find certified electric motor repair and rewinding shops in ${cityLabel}, ${stateLabel}. ` +
      `AC motor rewinding, DC armature rewinds, and emergency service. Submit a repair request — ` +
      `matched to shops serving your area.`,

    alternates: { canonical },

    openGraph: {
      // BEFORE:
      // title: `Motor Repair Shops in ${cityLabel}, ${stateLabel} | IQMotorBase`

      // AFTER:
      title: `Motor Repair & Rewinding in ${cityLabel}, ${stateLabel} | IQMotorBase`,
      description:
        `Certified motor repair and rewinding shops in ${cityLabel}, ${stateLabel}. ` +
        `AC, DC, armature, and stator rewinding. Submit a request — shops respond same day.`,
      url: canonical,
      siteName: 'IQMotorBase.com',
      type: 'website',
    },

    twitter: {
      card: 'summary_large_image',
      title: `Motor Repair & Rewinding in ${cityLabel}, ${stateLabel} | IQMotorBase`,
      description:
        `Find certified motor repair and rewinding shops in ${cityLabel}, ${stateLabel}. ` +
        `Submit a request — matched to shops in your area.`,
    },
  };
}
```

### H1 update — in the city page component:

```tsx
// BEFORE:
<h1>Motor repair shops in {cityLabel}, {stateLabel}</h1>

// AFTER:
<h1>Electric motor repair and rewinding shops in {cityLabel}, {stateLabel}</h1>
```

### City page intro paragraph — add rewinding:

```tsx
// FIND the existing intro paragraph and update:

// BEFORE (example):
// "Browse motor repair centers in {cityLabel}..."

// AFTER:
<p>
  Browse certified electric motor repair and rewinding centers in {cityLabel}, {stateLabel}.
  Filter by capability — AC motor rewinding, DC armature rewinding, stator rewinds,
  high-voltage, servo, and emergency service. Open profiles to compare turnaround,
  testing standards, and certifications, then submit your repair or rewind requirement
  to be matched directly with shops serving your area.
</p>
```

---

## FIX 3 — /cost-of-motor-repair-and-rewinding

### Current state:
Title and H1 don't include a cost range — nobody clicks because there's
no value signal in the SERP result. 125 impressions at position 14, zero clicks.

### File: `app/cost-of-motor-repair-and-rewinding/page.tsx`

```tsx
export const metadata: Metadata = {
  // BEFORE (no price range — no reason to click):
  // title: 'Electric Motor Repair and Rewinding Costs | IQMotorBase'

  // AFTER — price range in title = dramatically higher CTR:
  title: 'Motor Rewinding Cost: $400–$9,000 — Full Price Guide | IQMotorBase',

  // BEFORE (vague):
  // description: 'Learn about motor repair and rewinding costs...'

  // AFTER (specific ranges, action-oriented):
  description:
    'Motor rewinding costs by HP: $400–$900 for small motors, $1,200–$3,500 for 10–50 HP, ' +
    '$3,000–$9,000 for 50–200 HP. AC, DC, armature, and stator rewind price ranges. Get a quote.',

  alternates: {
    canonical: 'https://iqmotorbase.com/cost-of-motor-repair-and-rewinding',
  },

  openGraph: {
    title: 'Motor Rewinding Cost Guide: $400–$9,000 by HP | IQMotorBase',
    description:
      'Motor rewinding price ranges by HP — AC, DC, armature, and stator rewinds. ' +
      'Get matched to certified shops for a real quote.',
    url: 'https://iqmotorbase.com/cost-of-motor-repair-and-rewinding',
    siteName: 'IQMotorBase.com',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Motor Rewinding Cost: $400–$9,000 | IQMotorBase',
    description:
      'Motor rewinding price guide by HP. AC, DC, armature, and stator rewinds. Get a quote.',
  },
};
```

### H1 update — in the page component:

```tsx
// BEFORE:
<h1>Electric motor repair and rewinding costs</h1>

// AFTER — mirrors title tag, signals cost info immediately:
<h1>Motor rewinding cost: what shops charge in 2026</h1>
```

---

## FIX 4 — /electric-motor-repair-shops-listings (Directory Index)

### File: `app/electric-motor-repair-shops-listings/page.tsx`

```tsx
export const metadata: Metadata = {
  // BEFORE:
  // title: 'Find Electric Motor Repair Shops | IQMotorBase Directory'

  // AFTER:
  title: 'Find Electric Motor Repair & Rewinding Shops | IQMotorBase Directory',

  // BEFORE (generic):
  // description: 'Browse approved electric motor repair centers by location...'

  // AFTER (includes rewinding, includes key types):
  description:
    'Browse certified electric motor repair and rewinding shops by state. ' +
    'AC motor rewinding, DC armature rewinds, stator rewinding, and emergency service. ' +
    'Submit a repair request — matched to shops in your area.',

  alternates: {
    canonical: 'https://iqmotorbase.com/electric-motor-repair-shops-listings',
  },

  openGraph: {
    title: 'Electric Motor Repair & Rewinding Shop Directory | IQMotorBase',
    description:
      'Find certified motor repair and rewinding shops near you. ' +
      'AC, DC, armature, and stator rewinds. Browse by state or submit a requirement.',
    url: 'https://iqmotorbase.com/electric-motor-repair-shops-listings',
    siteName: 'IQMotorBase.com',
  },
};
```

### H1 update:

```tsx
// BEFORE:
<h1>Find electric motor repair shops</h1>
// or similar

// AFTER:
<h1>Find electric motor repair and rewinding shops</h1>
```

---

## FIX 5 — /electric-motor-repair (General Hub)

### File: `app/electric-motor-repair/page.tsx`

```tsx
export const metadata: Metadata = {
  // BEFORE:
  // title: 'Electric Motor Repair | IQMotorBase'

  // AFTER:
  title: 'Electric Motor Repair & Rewinding — Find Certified Shops | IQMotorBase',

  description:
    'Find certified electric motor repair and rewinding shops near you. ' +
    'AC motor rewinding, DC armature and stator rewinds, servo, high-voltage, ' +
    'and emergency repair. Browse shops by state.',

  alternates: {
    canonical: 'https://iqmotorbase.com/electric-motor-repair',
  },

  openGraph: {
    title: 'Electric Motor Repair & Rewinding | IQMotorBase',
    description:
      'Find certified motor repair and rewinding shops. AC, DC, armature, ' +
      'stator, and emergency rewinds. Browse by state.',
    url: 'https://iqmotorbase.com/electric-motor-repair',
    siteName: 'IQMotorBase.com',
  },
};
```

---

## FIX 6 — /industrial-motor-repair

### File: `app/industrial-motor-repair/page.tsx`

```tsx
export const metadata: Metadata = {
  // BEFORE:
  // title: 'Who Offers Industrial Motor Rewinding & Repair? | IQMotorBase Directory'
  // (already has rewinding — good, just strengthen the description)

  // Keep title — it already has rewinding. Just fix the description:

  // BEFORE (generic):
  // description: 'Find industrial motor repair and rewinding shops in your area...'

  // AFTER (specific — adds query types):
  description:
    'Find industrial motor repair and rewinding shops near you. ' +
    'Large-frame AC rewinding, DC armature rewinds, high-voltage stator rewinding, ' +
    'and emergency service. Submit a requirement — matched to qualified shops.',

  alternates: {
    canonical: 'https://iqmotorbase.com/industrial-motor-repair',
  },

  openGraph: {
    title: 'Industrial Motor Rewinding & Repair Shops | IQMotorBase',
    description:
      'Find industrial motor repair and rewinding shops. Large-frame, HV, ' +
      'AC/DC armature rewinding. Submit a requirement — matched to shops near you.',
    url: 'https://iqmotorbase.com/industrial-motor-repair',
    siteName: 'IQMotorBase.com',
  },
};
```

---

## BONUS — Add "Motor Rewinders Near Me" as a page alias

GSC shows "motor rewinders near me" (64 imp, pos 20.9) and
"electric motor rewinders near me" (54 imp, 7.41% CTR) — both driving traffic.

The near-me page already catches some of this but the word "rewinders"
(plural, implies specialist) converts at 7.41% vs 0.95% for "repair."

Add this to the near-me page's keyword meta as an additional signal:

```tsx
// In /electric-motor-repair-near-me metadata — update keywords array:
keywords: [
  'electric motor repair near me',
  'electric motor rewinding near me',      // ← high volume, was missing
  'motor rewinding near me',               // ← 422 impressions, pos 22
  'motor rewinders near me',               // ← 64 impressions
  'electric motor rewinders near me',      // ← 7.41% CTR
  'motor rewind shop near me',             // ← 105 impressions
  'motor rewinding shop near me',          // ← 105 impressions
  'armature rewinding near me',            // ← 7.69% CTR
  'stator rewinding near me',              // ← good long tail
  'ac motor rewinding near me',            // ← 77 impressions
  'dc motor rewinding near me',
  'electric motor repair near me',
  'industrial motor repair near me',
  'electric motor repair shop near me',
  'emergency motor repair',
  'motor rewinding cost',
  'electric motor rewinding cost',
],
```

---

## VERIFICATION CHECKLIST

### Confirm each title tag live after deploy:

```bash
# Near-me page — should contain "Rewinding"
curl -s https://iqmotorbase.com/electric-motor-repair-near-me \
  | grep -i "<title" | head -1
# Expected: "Electric Motor Repair & Rewinding Near Me | IQMotorBase"

# Cost page — should contain "$400"
curl -s https://iqmotorbase.com/cost-of-motor-repair-and-rewinding \
  | grep -i "<title" | head -1
# Expected: "Motor Rewinding Cost: $400–$9,000..."

# Directory index — should contain "Rewinding"
curl -s https://iqmotorbase.com/electric-motor-repair-shops-listings \
  | grep -i "<title" | head -1
# Expected: "...Repair & Rewinding..."

# A city page — should contain "Rewinding"
curl -s "https://iqmotorbase.com/motor-repair-shop/st-louis-missouri" \
  | grep -i "<title" | head -1
# Expected: "Electric Motor Repair & Rewinding Shops in St. Louis, Missouri..."
```

### Confirm H1s:

```bash
# Near-me H1
curl -s https://iqmotorbase.com/electric-motor-repair-near-me \
  | grep -i "<h1"
# Expected: contains "repair and rewinding near me"

# Cost page H1
curl -s https://iqmotorbase.com/cost-of-motor-repair-and-rewinding \
  | grep -i "<h1"
# Expected: contains "what shops charge"
```

### Google Search Console — after deploy:

1. Use URL Inspection on all 6 pages → "Request indexing"
   This speeds up Google re-reading the new title tags.

2. Wait 5–7 days, then check Performance → Queries
   Filter to queries containing "rewinding" and check if CTR improved.
   Position may stay the same initially — CTR improvement comes first,
   position improvement follows 2–4 weeks later as click signals build.

3. Key queries to watch:
   - "motor rewinding near me" (422 imp, pos 22) → CTR should rise from 0.95%
   - "motor rewinds cost" (125 imp, pos 14) → should start getting clicks
   - "motor rewinding cost" (108 imp, pos 18) → same
   - "electric motor rewinding near me" (160 imp, pos 32) → position should improve
   - "motor rewinding services st louis" (114 imp, pos 13) → clicks should start

### Title length check — all under 60 chars for full display in Google:

| Page | New title | Chars |
|---|---|---|
| Near-me | Electric Motor Repair & Rewinding Near Me \| IQMotorBase | 57 ✅ |
| City (example) | Electric Motor Repair & Rewinding in St. Louis, MO \| IQMotorBase | 67 ⚠️ |
| Cost | Motor Rewinding Cost: $400–$9,000 — Full Price Guide \| IQMotorBase | 67 ⚠️ |
| Directory | Find Electric Motor Repair & Rewinding Shops \| IQMotorBase Directory | 69 ⚠️ |

> Note: City and cost page titles are slightly over 60 chars.
> Google will display them truncated but still shows enough to communicate value.
> The cost range "$400–$9,000" is the most important part — keep it.
> If you want strictly under 60 chars, use these shorter versions:

```tsx
// Strict 60-char alternatives if needed:

// City pages (52 chars):
title: `Motor Repair & Rewinding in ${cityLabel}, ${stateAbbr} | IQMotorBase`
// e.g. "Motor Repair & Rewinding in St. Louis, MO | IQMotorBase" = 56 chars ✅

// Cost page (51 chars):
title: 'Motor Rewinding Cost: $400–$9,000 | IQMotorBase'
// = 48 chars ✅

// Directory (52 chars):
title: 'Motor Repair & Rewinding Shop Directory | IQMotorBase'
// = 53 chars ✅
```

Use the state abbreviation (MO, TX, FL) instead of the full state name
in city page titles — saves 5–10 chars and keeps the most important
keywords visible in the Google result.