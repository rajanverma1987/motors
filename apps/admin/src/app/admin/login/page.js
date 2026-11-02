import { redirect } from "next/navigation";

/** Legacy /admin/login → branded home login. */
export default function AdminLoginRedirectPage() {
  redirect("/");
}
