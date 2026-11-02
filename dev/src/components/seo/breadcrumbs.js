import Link from "next/link";
import { getPublicSiteUrl } from "@/lib/public-site-url";

/**
 * @param {{ name: string; url: string }} item
 * @param {string} site
 */
function toAbsolute(item, site) {
  const raw = String(item.url || "").trim();
  if (!raw) return site;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/$/, "") || site;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return path === "/" ? site : `${site}${path}`;
}

/**
 * Visible breadcrumbs plus BreadcrumbList JSON-LD.
 * @param {{ items: { name: string; url: string }[] }} props
 */
export default function Breadcrumbs({ items }) {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const list = Array.isArray(items) ? items.filter((i) => i?.name) : [];
  if (!list.length) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: list.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsolute(item, site),
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-secondary">
        <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
          {list.map((item, index) => {
            const isLast = index === list.length - 1;
            return (
              <li key={`${item.url}-${index}`} className="flex items-center gap-1.5">
                {isLast ? (
                  <span aria-current="page">{item.name}</span>
                ) : (
                  <>
                    <Link href={item.url} className="text-secondary hover:text-primary">
                      {item.name}
                    </Link>
                    <span aria-hidden>›</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </>
  );
}
