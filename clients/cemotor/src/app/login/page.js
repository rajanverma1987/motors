import { redirect } from "next/navigation";

/** Legacy /login bookmarks → branded home login. */
export default async function LoginRedirectPage({ searchParams }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const key of ["next", "intent"]) {
    const v = sp?.[key];
    if (v != null && String(v).trim()) q.set(key, String(v));
  }
  const suffix = q.toString();
  redirect(suffix ? `/?${suffix}` : "/");
}
