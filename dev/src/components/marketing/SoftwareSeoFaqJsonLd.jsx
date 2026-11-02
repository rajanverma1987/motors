/**
 * FAQPage JSON-LD for software SEO cluster pages.
 * @param {{ items: { q: string, a: string }[] }} props
 */
export default function SoftwareSeoFaqJsonLd({ items }) {
  if (!Array.isArray(items) || !items.length) return null;
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
  );
}
