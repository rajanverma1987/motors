# Cursor Instruction: Dynamic Form and Table Components (JavaScript)

Goal
Build reusable **Form and Table UI components** in **Next.js + Tailwind** using **JavaScript (not TypeScript)**.
All components must follow the global theme tokens and be configurable through props.

Theme tokens available:

bg-bg
bg-card
text-text
border-border
primary
secondary
accent
success
warning
danger

All components must support **props so they can be reused across the SaaS**.

---

# 1. Folder Structure

Create the following structure.

```
components/
  ui/
    button.js
    input.js
    select.js
    textarea.js
    table.js
    badge.js
```

---

# 2. Button Component

Create **components/ui/button.js**

Requirements

* support variants
* support sizes
* support custom className

```javascript
export default function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  className = ""
}) {

  const variants = {
    primary: "bg-primary text-white hover:opacity-90",
    secondary: "bg-secondary text-white",
    outline: "border border-border bg-transparent text-text",
    danger: "bg-danger text-white"
  }

  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-md transition ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}
```

---

# 3. Input Component

Create **components/ui/input.js**

```javascript
export default function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  name
}) {
  return (
    <div className="flex flex-col gap-1">

      {label && (
        <label className="text-sm text-secondary">
          {label}
        </label>
      )}

      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="bg-card border border-border rounded-md px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
      />

    </div>
  )
}
```

---

# 4. Select Component

Create **components/ui/select.js**

```javascript
export default function Select({
  label,
  options = [],
  value,
  onChange
}) {

  return (
    <div className="flex flex-col gap-1">

      {label && (
        <label className="text-sm text-secondary">
          {label}
        </label>
      )}

      <select
        value={value}
        onChange={onChange}
        className="bg-card border border-border rounded-md px-3 py-2 text-text"
      >

        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}

      </select>

    </div>
  )
}
```

---

# 5. Textarea Component

Create **components/ui/textarea.js**

```javascript
export default function Textarea({
  label,
  placeholder,
  value,
  onChange
}) {

  return (
    <div className="flex flex-col gap-1">

      {label && (
        <label className="text-sm text-secondary">
          {label}
        </label>
      )}

      <textarea
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="bg-card border border-border rounded-md px-3 py-2 text-text min-h-[120px]"
      />

    </div>
  )
}
```

---

# 6. Dynamic Table Component

Create **components/ui/table.js**

Requirements

* columns must be dynamic
* rows must be dynamic
* reusable for all modules

```javascript
export default function Table({ columns = [], data = [] }) {

  return (
    <div className="border border-border rounded-lg overflow-hidden">

      <table className="w-full">

        <thead className="bg-card border-b border-border">
          <tr>

            {columns.map((col, i) => (
              <th
                key={i}
                className="text-left px-4 py-3 text-sm text-secondary"
              >
                {col.label}
              </th>
            ))}

          </tr>
        </thead>

        <tbody>

          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border hover:bg-bg"
            >

              {columns.map((col, j) => (
                <td
                  key={j}
                  className="px-4 py-3 text-text"
                >
                  {row[col.key]}
                </td>
              ))}

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  )
}
```

---

# 7. Example Table Usage

```javascript
import Table from "@/components/ui/table"

const columns = [
  { key: "customer", label: "Customer" },
  { key: "motor", label: "Motor HP" },
  { key: "status", label: "Status" }
]

const data = [
  { customer: "ABC Pumps", motor: "25 HP", status: "Rewinding" },
  { customer: "XYZ Steel", motor: "50 HP", status: "Testing" }
]

<Table columns={columns} data={data} />
```

---

# 8. SaaS Form Layout Pattern

Use grid layout for all forms.

```
grid grid-cols-2 gap-6
```

Example

```
Customer Name
Motor HP
Motor Type
Voltage
RPM
Problem Description
```

---

# 9. Card Wrapper for Forms

All forms should be inside a card.

```
bg-card border border-border rounded-lg p-6
```

Example

```
<div className="bg-card border border-border rounded-lg p-6">
  form here
</div>
```

---

# 10. UI Rules

All inputs must use:

```
bg-card
border-border
text-text
```

All tables must use:

```
border-border
bg-card
```

Buttons must use:

```
primary
secondary
danger
```

---

# Result

Cursor should generate:

Reusable UI components
Dynamic forms via props
Dynamic tables via props
Theme-compatible components
Clean scalable UI system
