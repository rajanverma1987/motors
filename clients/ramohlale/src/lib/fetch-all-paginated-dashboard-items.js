/** Dashboard list routes return `{ items, totalCount }` when `page` / `pageSize` are sent; max pageSize is 100. */
export async function fetchAllPaginatedDashboardItems(basePath) {
  const pageSize = 100;
  let page = 1;
  const all = [];
  for (;;) {
    const sep = basePath.includes("?") ? "&" : "?";
    const res = await fetch(`${basePath}${sep}page=${page}&pageSize=${pageSize}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    const items = Array.isArray(data?.items) ? data.items : [];
    all.push(...items);
    const total = Number(data?.totalCount);
    if (items.length < pageSize || (Number.isFinite(total) && all.length >= total)) break;
    page += 1;
    if (page > 500) break;
  }
  return all;
}
