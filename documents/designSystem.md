# Theme System Implementation (Next.js + Tailwind)

Goal
Implement a clean **light and dark theme system** for the SaaS dashboard using **Next.js, TailwindCSS, and next-themes**.
Use **CSS variables + Tailwind tokens** so both themes stay consistent and scalable.

---

# 1. Install Theme Library

Install next-themes.

```bash
npm install next-themes
```

This library will handle:

* theme switching
* localStorage persistence
* system theme detection

---

# 2. Enable Dark Mode in Tailwind

Update **tailwind.config.js**

```js
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        card: "hsl(var(--card))",
        text: "hsl(var(--text))",
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
        border: "hsl(var(--border))",
        accent: "hsl(var(--accent))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))"
      }
    }
  },
  plugins: []
}
```

This allows Tailwind to use CSS variables as design tokens.

---

# 3. Define Theme Tokens

Create theme variables in **app/globals.css**

```css
:root {
  --bg: 0 0% 100%;
  --card: 210 20% 98%;
  --text: 222 47% 11%;
  --primary: 217 54% 21%;
  --secondary: 215 20% 65%;
  --border: 214 32% 91%;
  --accent: 24 95% 53%;
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --danger: 0 72% 51%;
}

.dark {
  --bg: 222 47% 11%;
  --card: 222 40% 16%;
  --text: 210 40% 98%;
  --primary: 213 94% 68%;
  --secondary: 215 20% 65%;
  --border: 217 32% 25%;
  --accent: 24 95% 53%;
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --danger: 0 72% 51%;
}
```

---

# 4. Create Theme Provider

Create **components/theme-provider.tsx**

```tsx
"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
```

---

# 5. Add Provider to Root Layout

Update **app/layout.tsx**

```tsx
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg text-text">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

# 6. Create Theme Toggle Component

Create **components/theme-toggle.tsx**

```tsx
"use client"

import { useTheme } from "next-themes"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="px-3 py-2 rounded-md border border-border bg-card"
    >
      Toggle Theme
    </button>
  )
}
```

---

# 7. Use Theme Tokens in UI

Example dashboard card.

```tsx
<div className="bg-card border border-border rounded-lg p-6">
  <h2 className="text-lg font-semibold text-text">Active Jobs</h2>
  <p className="text-secondary">24 jobs currently in progress</p>
</div>
```

---

# 8. Layout Styling Rules

Dashboard background

```
bg-bg
```

Cards

```
bg-card border border-border
```

Primary buttons

```
bg-primary text-white
```

Accent buttons

```
bg-accent text-white
```

Status indicators

```
success → text-success
warning → text-warning
danger → text-danger
```

---

# 9. UI Guidelines for the SaaS

Use consistent components.

Navigation bar

```
bg-card border-b border-border
```

Sidebar

```
bg-card
```

Main dashboard

```
bg-bg
```

Cards

```
rounded-lg shadow-sm border border-border
```

---

# 10. Benefits of This System

Single color token system
Works for both themes automatically
Easy to maintain large dashboards
Future rebranding becomes simple
Cursor AI can reuse tokens across components

---

# End Result

You will have:

Light theme
Dark theme
Token-based color system
Scalable UI architecture for the SaaS dashboard
