"use client";

export default function CrmPlaceholder({ title, description }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-title">{title}</h1>
      <p className="mt-2 text-secondary">
        {description || "This section is under development. You can start building it next."}
      </p>
      <div className="mt-8 rounded-lg border border-border bg-card p-6 text-sm text-secondary">
        Content will go here. Use the sidebar to switch between CRM sections.
      </div>
    </div>
  );
}
