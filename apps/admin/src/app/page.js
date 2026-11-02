import AdminLoginPage from "@/components/admin/admin-login-page";

export const metadata = {
  title: "Admin sign in | 3PhaseFlow",
  description: "Sign in to the 3PhaseFlow admin portal.",
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return <AdminLoginPage />;
}
