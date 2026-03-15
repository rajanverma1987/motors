# Typography System (Next.js + Tailwind) – Cursor Implementation Guide

Goal
Create a **consistent typography system** for the SaaS dashboard that works with **Tailwind CSS** and **Next.js**.
Use **Inter font**, define **text tokens**, and build reusable **Typography components**.

This ensures consistent typography across:

forms
tables
dashboard cards
navigation
reports

---

# 1. Install and Configure Inter Font

Use **Next.js font optimization**.

Edit **app/layout.js**

```javascript
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
})

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}
```

---

# 2. Configure Tailwind Font Family

Edit **tailwind.config.js**

```javascript
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"]
      }
    }
  }
}
```

Now all text automatically uses **Inter**.

---

# 3. Typography Scale

Use a simple scale optimized for dashboards.

| Element       | Tailwind Class | Size |
| ------------- | -------------- | ---- |
| Page Title    | text-2xl       | 24px |
| Section Title | text-xl        | 20px |
| Card Title    | text-lg        | 18px |
| Body Text     | text-sm        | 14px |
| Table Text    | text-sm        | 14px |
| Form Label    | text-xs        | 12px |
| Helper Text   | text-xs        | 12px |

---

# 4. Typography Utility Classes

Use theme tokens.

Examples:

```javascript
text-text
text-secondary
text-primary
```

Recommended patterns:

Page title

```javascript
text-2xl font-semibold text-text
```

Card title

```javascript
text-lg font-medium text-text
```

Form label

```javascript
text-xs text-secondary
```

Helper text

```javascript
text-xs text-secondary
```

---

# 5. Enable Tabular Numbers (Important for Tables)

Tables in SaaS dashboards contain numbers.

Add to **globals.css**

```css
.tabular {
  font-variant-numeric: tabular-nums;
}
```

Usage:

```javascript
<td className="tabular text-sm">
  $1240
</td>
```

This aligns numbers perfectly in columns.

---

# 6. Create Typography Components

Create folder:

```
components/ui/
  typography.js
```

---

# 7. Typography Component

Create **components/ui/typography.js**

```javascript
export function PageTitle({ children }) {
  return (
    <h1 className="text-2xl font-semibold text-text">
      {children}
    </h1>
  )
}

export function SectionTitle({ children }) {
  return (
    <h2 className="text-xl font-semibold text-text">
      {children}
    </h2>
  )
}

export function CardTitle({ children }) {
  return (
    <h3 className="text-lg font-medium text-text">
      {children}
    </h3>
  )
}

export function Label({ children }) {
  return (
    <label className="text-xs text-secondary">
      {children}
    </label>
  )
}

export function Text({ children }) {
  return (
    <p className="text-sm text-text">
      {children}
    </p>
  )
}

export function Muted({ children }) {
  return (
    <p className="text-xs text-secondary">
      {children}
    </p>
  )
}
```

---

# 8. Example Usage

Example dashboard card.

```javascript
import { CardTitle, Text } from "@/components/ui/typography"

<div className="bg-card border border-border p-6 rounded-lg">

  <CardTitle>
    Active Jobs
  </CardTitle>

  <Text>
    24 motors currently in repair
  </Text>

</div>
```

---

# 9. Table Typography Rules

Tables must use:

```
text-sm
tabular
```

Example:

```javascript
<td className="text-sm tabular">
  50 HP
</td>
```

---

# 10. Form Typography Rules

Form label

```
text-xs text-secondary
```

Input text

```
text-sm text-text
```

Helper text

```
text-xs text-secondary
```

---

# 11. Navigation Typography

Sidebar menu items:

```
text-sm font-medium
```

Active item:

```
text-primary
```

Inactive item:

```
text-secondary
```

---

# Final Result

Cursor should implement:

Inter font globally
Consistent typography scale
Reusable typography components
Tabular numbers for tables
Theme-compatible text colors
Clean professional dashboard typography
