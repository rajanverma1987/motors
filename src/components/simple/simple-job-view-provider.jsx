"use client";

import { useCallback, useMemo, useState } from "react";
import ServiceProposalFormModal from "@/components/simple/service-proposal-form-modal";
import { SimpleJobViewContext } from "@/components/simple/simple-job-view-context";
import { formToServiceProposalListRow } from "@/lib/simple-service-proposal-form";
import { saveSimpleServiceProposal } from "@/lib/simple-portal-api";

/**
 * Opens the Job / Service Proposal modal on top of whatever is already on screen.
 * Lives outside the PO form so Job ↔ PO modules are not circular.
 */
export default function SimpleJobViewProvider({ children }) {
  const [viewJobId, setViewJobId] = useState("");

  const openJob = useCallback((id) => {
    const next = String(id || "").trim();
    if (!next) return;
    setViewJobId(next);
  }, []);

  const closeJob = useCallback(() => setViewJobId(""), []);

  const handleSave = useCallback(
    async (nextForm, options = {}) => {
      const forceNew = options?.forceNew === true;
      const id = forceNew ? undefined : viewJobId || nextForm.id || undefined;
      const documentNumber = String(nextForm.documentNumber ?? nextForm.quote ?? "").trim();
      const row = formToServiceProposalListRow(
        { ...nextForm, documentNumber, ...(forceNew ? { id: "", recordType: "RFQ" } : {}) },
        {
          id: id || "",
          companyName: String(nextForm.companyName || "").trim(),
        }
      );
      const saved = await saveSimpleServiceProposal(
        { ...row, id: id || undefined },
        { forceNew: forceNew || !id }
      );
      const sid = String(saved?.id || id || "").trim();
      if (sid) setViewJobId(sid);
      return saved;
    },
    [viewJobId]
  );

  const value = useMemo(() => ({ openJob, closeJob, viewJobId }), [openJob, closeJob, viewJobId]);

  return (
    <SimpleJobViewContext.Provider value={value}>
      {children}
      <ServiceProposalFormModal
        open={Boolean(viewJobId)}
        onClose={closeJob}
        initialForm={viewJobId ? { id: viewJobId } : null}
        onSave={handleSave}
      />
    </SimpleJobViewContext.Provider>
  );
}
