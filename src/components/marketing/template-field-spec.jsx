import CopyTemplateButton from "./copy-template-button";

/**
 * Renders a document template as two things a shop can actually use: a field-by-field
 * table explaining what belongs in each box, and a plain-text version to copy.
 *
 * @param {{
 *   groups: { name: string, intro?: string, fields: { field: string, holds: string, required?: boolean }[] }[],
 *   plainText: string,
 *   copyLabel?: string,
 * }} props
 */
export default function TemplateFieldSpec({ groups, plainText, copyLabel = "Copy template" }) {
  return (
    <div className="not-prose">
      {groups.map((group) => (
        <section key={group.name} className="mt-8 first:mt-0">
          <h3 className="text-lg font-semibold text-title">{group.name}</h3>
          {group.intro ? <p className="mt-1.5 text-sm leading-relaxed text-secondary">{group.intro}</p> : null}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-2 pr-4 font-semibold text-title">Field</th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-title">What goes in it</th>
                  <th scope="col" className="py-2 font-semibold text-title">Required</th>
                </tr>
              </thead>
              <tbody>
                {group.fields.map((f) => (
                  <tr key={f.field} className="border-b border-border/60 align-top">
                    <td className="py-2.5 pr-4 font-medium text-title">{f.field}</td>
                    <td className="py-2.5 pr-4 leading-relaxed text-secondary">{f.holds}</td>
                    <td className="py-2.5 text-secondary">{f.required ? "Yes" : "Optional"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-title">Plain-text version</h3>
          <CopyTemplateButton text={plainText} label={copyLabel} />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-secondary">
          Paste this into Word, Google Docs, or a spreadsheet and print it. Nothing to download, no sign-up.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-secondary">
          {plainText}
        </pre>
      </section>
    </div>
  );
}
