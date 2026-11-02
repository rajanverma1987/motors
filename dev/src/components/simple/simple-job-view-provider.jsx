"use client";

import { useCallback, useMemo, useState } from "react";
import ServiceProposalFormModal from "@/components/simple/service-proposal-form-modal";
import { SimpleJobViewContext } from "@/components/simple/simple-job-view-context";
import { formToServiceProposalListRow } from "@/lib/simple-service-proposal-form";
import { saveSimpleServiceProposal } from "@/lib/simple-portal-api";

/**
 * Opens the Job / Service Proposal modal on top of whatever is already on screen.
 * Lives outside the PO form so Job ↔ PO modules are not circular.
 *
 * openJob(id) — open one job
 * openJob(id, { listIds: string[] }) — open job with Previous / Next across listIds
 */
export default function SimpleJobViewProvider({ children }) {
  const [viewJobId, setViewJobId] = useState("");
  const [navJobIds, setNavJobIds] = useState([]);

  const openJob = useCallback((id, options = {}) => {
    const next = String(id || "").trim();
    if (!next) return;
    if (Array.isArray(options?.listIds)) {
      const ids = options.listIds.map((x) => String(x || "").trim()).filter(Boolean);
      setNavJobIds(ids);
    } else {
      setNavJobIds([]);
    }
    setViewJobId(next);
  }, []);

  const closeJob = useCallback(() => {
    setViewJobId("");
    setNavJobIds([]);
  }, []);

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

  const searchResultNavigation = useMemo(() => {
    if (!viewJobId || navJobIds.length < 2) return null;
    const currentIndex = navJobIds.findIndex((id) => String(id) === String(viewJobId));
    if (currentIndex < 0) return null;
    return {
      currentIndex,
      total: navJobIds.length,
      canPrevious: currentIndex > 0,
      canNext: currentIndex < navJobIds.length - 1,
      onPrevious: () => {
        const prev = navJobIds[currentIndex - 1];
        if (prev) setViewJobId(prev);
      },
      onNext: () => {
        const next = navJobIds[currentIndex + 1];
        if (next) setViewJobId(next);
      },
    };
  }, [viewJobId, navJobIds]);

  const value = useMemo(() => ({ openJob, closeJob, viewJobId }), [openJob, closeJob, viewJobId]);

  return (
    <SimpleJobViewContext.Provider value={value}>
      {children}
      <ServiceProposalFormModal
        open={Boolean(viewJobId)}
        onClose={closeJob}
        initialForm={viewJobId ? { id: viewJobId } : null}
        onSave={handleSave}
        searchResultNavigation={searchResultNavigation}
      />
    </SimpleJobViewContext.Provider>
  );
}
