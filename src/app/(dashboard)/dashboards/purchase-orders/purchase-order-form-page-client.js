"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SimplePurchaseOrderFormModal from "@/components/simple/simple-purchase-order-form-modal";
import {
  SIMPLE_TAB_PURCHASE_ORDERS,
  simplePortalTabHref,
  simplePurchaseOrderFormHref,
} from "@/lib/simple-portal-tabs";
import {
  SIMPLE_PO_TYPE_JOB,
  SIMPLE_PO_TYPE_SHOP,
} from "@/lib/simple-purchase-order-form";
import { SIMPLE_PORTAL_ROOT_CLASS } from "@/lib/simple-screen-ui";

/**
 * Full-page Purchase Order editor for phones.
 * @param {{ recordId?: string }} props
 */
export default function PurchaseOrderFormPageClient({ recordId = "" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(recordId || "").trim();
  const isNew = !id || id === "new";
  const typeParam = String(searchParams.get("type") || "").trim().toLowerCase();
  const defaultPoType =
    typeParam === "shop" || typeParam === SIMPLE_PO_TYPE_SHOP
      ? SIMPLE_PO_TYPE_SHOP
      : SIMPLE_PO_TYPE_JOB;

  const listHref = useMemo(
    () => simplePortalTabHref(SIMPLE_TAB_PURCHASE_ORDERS),
    []
  );

  const handleClose = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(listHref);
  }, [listHref, router]);

  const handleSaved = useCallback(
    (saved) => {
      const savedId = String(saved?.id || "").trim();
      if (savedId && isNew) {
        router.replace(simplePurchaseOrderFormHref(savedId), { scroll: false });
      }
    },
    [isNew, router]
  );

  return (
    <div
      className={`${SIMPLE_PORTAL_ROOT_CLASS} flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden`}
    >
      <SimplePurchaseOrderFormModal
        open
        presentation="page"
        onClose={handleClose}
        mode={isNew ? "create" : "edit"}
        initialPoId={isNew ? "" : id}
        defaultPoType={defaultPoType}
        allowPoTypeChange={false}
        onSaved={handleSaved}
      />
    </div>
  );
}
