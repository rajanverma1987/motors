"use client";

import { FiClipboard, FiDatabase, FiFileText, FiShoppingCart } from "react-icons/fi";
import { SIMPLE_PHONE_BOTTOM_TABS } from "@/lib/simple-phone-nav";
import {
  SIMPLE_TAB_INVOICES,
  SIMPLE_TAB_MASTER_DATA_SEARCH,
  SIMPLE_TAB_PURCHASE_ORDERS,
  SIMPLE_TAB_SERVICE_PROPOSALS,
} from "@/lib/simple-portal-tabs";
import { useAuth } from "@/contexts/auth-context";

const ICONS = {
  [SIMPLE_TAB_SERVICE_PROPOSALS]: FiFileText,
  [SIMPLE_TAB_INVOICES]: FiClipboard,
  [SIMPLE_TAB_PURCHASE_ORDERS]: FiShoppingCart,
  [SIMPLE_TAB_MASTER_DATA_SEARCH]: FiDatabase,
};

/**
 * Fixed bottom bar for Simple hub on phones.
 * @param {{ activeTab: string, onSelectTab: (id: string) => void }} props
 */
export default function SimplePhoneBottomNav({ activeTab, onSelectTab }) {
  const { canViewFinancials } = useAuth();
  const tabs = SIMPLE_PHONE_BOTTOM_TABS.filter(
    (item) => item.id !== SIMPLE_TAB_INVOICES || canViewFinancials
  );
  const colClass =
    tabs.length >= 4 ? "grid-cols-4" : tabs.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 md:hidden"
      aria-label="Primary sections"
    >
      <ul className={`grid ${colClass}`}>
        {tabs.map((item) => {
          const Icon = ICONS[item.id] || FiFileText;
          const active = activeTab === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex w-full flex-col items-center gap-0.5 rounded-none px-0.5 py-2 text-[10px] font-semibold leading-tight sm:text-[11px] ${
                  active ? "text-primary" : "text-secondary"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate px-0.5 text-center">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
