"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import StopClarityOnApp from "@/components/stop-clarity-on-app";

export default function AdminLayoutClient({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return (
      <div className="min-h-screen bg-bg">
        <StopClarityOnApp />
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <StopClarityOnApp />
      <AdminSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-[10px]">
          {children}
        </div>
      </main>
    </div>
  );
}
