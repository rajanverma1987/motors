# Cursor Instruction: Access-Style Editable Table with onChange Data Return

Goal
Create a **spreadsheet-style editable table (like MS Access datasheet)** that:

* allows inline editing
* automatically adds new row
* supports calculated fields
* supports dynamic columns
* returns **full updated dataset on every change**
* works with Tailwind theme tokens
* implemented in **JavaScript only**

Component:

```
components/ui/data-table.js
```

---

# 1. Component API

The component must accept these props.

```
columns
data
onChange
```

Example:

```
<DataTable
  columns={columns}
  data={rows}
  onChange={(updatedRows) => setRows(updatedRows)}
/>
```

`onChange` must return **the entire updated dataset**.

---

# 2. Column Structure

Example column configuration.

```
const columns = [
  { key: "item", label: "Item", type: "text" },

  { key: "qty", label: "Qty", type: "number" },

  { key: "price", label: "Price", type: "number" },

  {
    key: "total",
    label: "Total",
    calculated: true,
    formula: (row) =>
      Number(row.qty || 0) * Number(row.price || 0)
  }
]
```

Rules

* `calculated` fields cannot be edited
* `formula` receives the row

---

# 3. Data Table Component

Create **components/ui/data-table.js**

```javascript
"use client"

import { useState, useEffect } from "react"

export default function DataTable({
  columns = [],
  data = [],
  onChange
}) {

  const [rows, setRows] = useState(data)

  useEffect(() => {
    setRows(data)
  }, [data])

  function updateRow(rowIndex, key, value) {

    const updated = [...rows]

    if (!updated[rowIndex]) {
      updated[rowIndex] = {}
    }

    updated[rowIndex][key] = value

    // calculate formula fields
    columns.forEach(col => {

      if (col.calculated && col.formula) {
        updated[rowIndex][col.key] =
          col.formula(updated[rowIndex])
      }

    })

    // auto add new row if editing last row
    if (rowIndex === rows.length - 1) {
      updated.push({})
    }

    setRows(updated)

    if (onChange) {
      onChange(updated)
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">

      <table className="w-full">

        <thead className="bg-card border-b border-border">

          <tr>

            {columns.map((col, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 text-xs text-secondary"
              >
                {col.label}
              </th>
            ))}

          </tr>

        </thead>

        <tbody>

          {rows.map((row, rowIndex) => (

            <tr
              key={rowIndex}
              className="border-b border-border hover:bg-bg"
            >

              {columns.map((col, colIndex) => {

                if (col.calculated) {
                  return (
                    <td
                      key={colIndex}
                      className="px-3 py-2 text-sm"
                    >
                      {row[col.key] || ""}
                    </td>
                  )
                }

                return (

                  <td key={colIndex}>

                    <input
                      type="text"
                      value={row[col.key] || ""}
                      onChange={(e) =>
                        updateRow(
                          rowIndex,
                          col.key,
                          e.target.value
                        )
                      }
                      className="w-full px-2 py-1 bg-transparent outline-none text-sm"
                    />

                  </td>

                )

              })}

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  )
}
```

---

# 4. Example Usage

```javascript
"use client"

import { useState } from "react"
import DataTable from "@/components/ui/data-table"

export default function InvoiceExample() {

  const [items, setItems] = useState([{}])

  const columns = [
    { key: "item", label: "Item" },
    { key: "qty", label: "Qty" },
    { key: "price", label: "Price" },

    {
      key: "total",
      label: "Total",
      calculated: true,
      formula: (row) =>
        Number(row.qty || 0) *
        Number(row.price || 0)
    }
  ]

  return (

    <DataTable
      columns={columns}
      data={items}
      onChange={(updated) => {

        setItems(updated)

        console.log("Updated Table Data", updated)

      }}
    />

  )

}
```

---

# 5. Server Save Example

The parent component receives the full dataset.

Example:

```
fetch("/api/saveItems", {
  method: "POST",
  body: JSON.stringify(items)
})
```

This ensures all table data is available.

---

# 6. UX Rules

Cells must allow:

Typing directly
Tab navigation
Fast entry

New row appears automatically when typing in the last row.

Calculated columns update instantly.

---

# Final Result

Cursor should implement:

Access-style editable table
Calculated columns
Auto row creation
Full dataset returned via onChange
Reusable component for forms and invoices
