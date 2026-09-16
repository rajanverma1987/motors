"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiCpu, FiFileText, FiGrid, FiUser } from "react-icons/fi";
import { TrackAccountLinkHandler, TrackVerifyBanner } from "./account-flows";
import { TrackAuthProvider, useTrackAuth } from "./auth-context";
import TrackAuthScreens from "./auth-screens";
import TrackBrandFooter from "./brand-footer";
import TrackDashboardScreen from "./dashboard-screen";
import TrackInstallBanner from "./install-banner";
import TrackMotorDetailScreen from "./motor-detail-screen";
import TrackMotorsScreen from "./motors-screen";
import TrackProfileScreen from "./profile-screen";
import TrackRfqComparison from "./rfq-comparison";
import TrackRfqsScreen from "./rfqs-screen";

const TABS = [
  { id: "home", label: "Home", icon: FiGrid, title: "Your plant" },
  { id: "motors", label: "Motors", icon: FiCpu, title: "Motor register" },
  { id: "rfqs", label: "RFQs", icon: FiFileText, title: "Repair requests" },
  { id: "profile", label: "Profile", icon: FiUser, title: "Profile" },
];

/** Deep links from the printed QR label: /Track?motor=<id>. */
function TrackDeepLinks({ onOpenMotor, onOpenRfq }) {
  const searchParams = useSearchParams();
  const { refreshSession, isLoggedIn } = useTrackAuth();

  useEffect(() => {
    if (!isLoggedIn) return;
    if (String(searchParams.get("paypal") || "") === "success") refreshSession().catch(() => {});
  }, [searchParams, isLoggedIn, refreshSession]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const motor = String(searchParams.get("motor") || "").trim();
    const rfq = String(searchParams.get("rfq") || "").trim();
    if (motor) onOpenMotor(motor);
    else if (rfq) onOpenRfq(rfq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoggedIn]);

  return null;
}

function AppShell() {
  const { loading, isLoggedIn } = useTrackAuth();
  const [tab, setTab] = useState("home");
  const [overlay, setOverlay] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = useCallback(() => setRefreshKey((prev) => prev + 1), []);
  const openMotor = useCallback((motorId) => setOverlay({ type: "motor", id: motorId }), []);
  const openRfq = useCallback((rfqId) => setOverlay({ type: "rfq", id: rfqId }), []);
  const closeOverlay = useCallback(() => {
    setOverlay(null);
    bumpRefresh();
  }, [bumpRefresh]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg">
        <p className="text-sm text-secondary">Loading IQMotorTrack…</p>
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md">
          <TrackBrandFooter className="pb-[max(0.35rem,env(safe-area-inset-bottom))]" />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-bg shadow-sm sm:border-x sm:border-border">
        <TrackInstallBanner />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TrackAuthScreens />
        </div>
        <TrackAccountLinkHandler />
        <TrackBrandFooter className="pb-[max(0.35rem,env(safe-area-inset-bottom))]" />
      </div>
    );
  }

  const activeTab = TABS.find((item) => item.id === tab) || TABS[0];

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-bg shadow-sm sm:border-x sm:border-border">
      <Suspense fallback={null}>
        <TrackDeepLinks onOpenMotor={openMotor} onOpenRfq={openRfq} />
      </Suspense>
      <TrackAccountLinkHandler />
      <TrackInstallBanner />

      {overlay ? (
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {overlay.type === "motor" ? (
            <TrackMotorDetailScreen
              motorId={overlay.id}
              onBack={closeOverlay}
              onOpenRfq={openRfq}
              onChanged={bumpRefresh}
            />
          ) : (
            <TrackRfqComparison rfqId={overlay.id} onBack={closeOverlay} onChanged={bumpRefresh} />
          )}
        </main>
      ) : (
        <>
          <header className="border-b border-border bg-card px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">IQMotorTrack</p>
            <h1 className="mt-0.5 text-lg font-extrabold text-title">{activeTab.title}</h1>
          </header>
          <TrackVerifyBanner />
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className={tab === "home" ? "min-h-0 flex-1 overflow-y-auto" : "hidden"}>
              <TrackDashboardScreen
                refreshKey={refreshKey}
                onOpenMotor={openMotor}
                onOpenRfq={openRfq}
                onAddMotor={() => setTab("motors")}
              />
            </div>
            <div className={tab === "motors" ? "min-h-0 flex-1 overflow-y-auto" : "hidden"}>
              <TrackMotorsScreen
                refreshKey={refreshKey}
                onOpenMotor={openMotor}
                onChanged={bumpRefresh}
              />
            </div>
            <div className={tab === "rfqs" ? "min-h-0 flex-1 overflow-y-auto" : "hidden"}>
              <TrackRfqsScreen refreshKey={refreshKey} onOpenRfq={openRfq} />
            </div>
            <div className={tab === "profile" ? "min-h-0 flex-1 overflow-y-auto" : "hidden"}>
              <TrackProfileScreen />
            </div>
          </main>
        </>
      )}

      <nav className="border-t border-border bg-card pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1">
        <ul className="grid grid-cols-4">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = !overlay && tab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOverlay(null);
                    setTab(item.id);
                    bumpRefresh();
                  }}
                  className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                    active ? "text-primary" : "text-secondary"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export default function TrackApp() {
  return (
    <TrackAuthProvider>
      <AppShell />
    </TrackAuthProvider>
  );
}
