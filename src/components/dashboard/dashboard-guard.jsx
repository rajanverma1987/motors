"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardGuard({ children }) {
  const { user, mounted } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      router.replace("/login");
    }
  }, [mounted, user, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-secondary">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}
