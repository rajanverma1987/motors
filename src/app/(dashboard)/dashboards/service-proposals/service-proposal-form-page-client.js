"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ServiceProposalFormModal from "@/components/simple/service-proposal-form-modal";
import {
  SIMPLE_TAB_INVOICES,
  SIMPLE_TAB_SERVICE_PROPOSALS,
  simplePortalTabHref,
  simpleServiceProposalFormHref,
} from "@/lib/simple-portal-tabs";
import {
  formToServiceProposalListRow,
  RECORD_TYPE_RFQ,
} from "@/lib/simple-service-proposal-form";
import { saveSimpleServiceProposal } from "@/lib/simple-portal-api";
import { SIMPLE_PORTAL_ROOT_CLASS } from "@/lib/simple-screen-ui";

/**
 * Full-page Service Proposal / Invoice editor for phones.
 * @param {{ recordId?: string }} props
 */
export default function ServiceProposalFormPageClient({ recordId = "" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(recordId || "").trim();
  const isNew = !id || id === "new";
  const returnTab =
    String(searchParams.get("from") || "").trim() === "invoices"
      ? SIMPLE_TAB_INVOICES
      : SIMPLE_TAB_SERVICE_PROPOSALS;

  const listHref = useMemo(() => simplePortalTabHref(returnTab), [returnTab]);

  const initialForm = useMemo(() => (isNew ? null : { id }), [isNew, id]);

  const handleClose = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(listHref);
  }, [listHref, router]);

  const handleSave = useCallback(
    async (form, options = {}) => {
      const forceNew = options?.forceNew === true || isNew;
      const saveId = forceNew ? undefined : id || form.id || undefined;
      const documentNumber = forceNew ? "" : String(form.documentNumber ?? "").trim();
      const row = formToServiceProposalListRow(
        {
          ...form,
          documentNumber,
          ...(forceNew ? { id: "", recordType: RECORD_TYPE_RFQ } : {}),
        },
        {
          id: saveId || "",
          companyName: String(form.companyName || "").trim(),
          preparedByLabel: "",
        }
      );
      const saved = await saveSimpleServiceProposal(
        { ...row, id: saveId || undefined },
        { forceNew: forceNew || !saveId }
      );
      const savedId = String(saved?.id || "").trim();
      if (savedId && (isNew || forceNew)) {
        const from = returnTab === SIMPLE_TAB_INVOICES ? "?from=invoices" : "";
        router.replace(`${simpleServiceProposalFormHref(savedId)}${from}`, { scroll: false });
      }
      return saved;
    },
    [id, isNew, returnTab, router]
  );

  return (
    <div
      className={`${SIMPLE_PORTAL_ROOT_CLASS} flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden`}
    >
      <ServiceProposalFormModal
        open
        presentation="page"
        onClose={handleClose}
        initialForm={initialForm}
        onSave={handleSave}
      />
    </div>
  );
}
