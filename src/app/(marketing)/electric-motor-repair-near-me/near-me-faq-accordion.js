"use client";

import { useState } from "react";

/**
 * @param {{ items: { question: string; answer: string }[] }} props
 */
export default function NearMeFaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <dl className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((faq, index) => {
        const isOpen = openIndex === index;
        const panelId = `near-me-faq-panel-${index}`;
        return (
          <div key={faq.question} className="px-5 sm:px-6">
            <dt>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold text-title"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
              >
                <span>{faq.question}</span>
                <span className="shrink-0 text-secondary" aria-hidden>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </dt>
            <dd
              id={panelId}
              hidden={!isOpen}
              className="pb-5 text-sm leading-relaxed text-secondary"
            >
              {isOpen ? faq.answer : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
