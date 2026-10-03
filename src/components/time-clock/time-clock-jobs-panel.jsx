"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import SimpleDatasheetModal from "@/components/simple/simple-datasheet-modal";
import { RECORD_TYPE_JOB } from "@/lib/simple-service-proposal-form";

async function readJson(res) {
  return res.json().catch(() => ({}));
}

function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Technician Jobs tab: assigned open jobs, status, hours, datasheet.
 */
export default function TimeClockJobsPanel({
  token,
  employeeId,
  employeeName,
  onError,
  onMessage,
}) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [job, setJob] = useState(null);
  const [jobHours, setJobHours] = useState([]);
  const [busy, setBusy] = useState(false);
  const [datasheetOpen, setDatasheetOpen] = useState(false);
  const [hoursForm, setHoursForm] = useState({
    workDate: todayIsoLocal(),
    hours: "",
    note: "",
  });

  const technicianOptions = useMemo(
    () => [
      {
        value: String(employeeId || ""),
        label: String(employeeName || "Me").trim() || "Me",
      },
    ],
    [employeeId, employeeName]
  );

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/time-clock/my-jobs?token=${encodeURIComponent(token)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to load jobs");
    setJobs(Array.isArray(data.items) ? data.items : []);
  }, [token]);

  const loadDetail = useCallback(
    async (id) => {
      const jobId = String(id || "").trim();
      if (!jobId) {
        setJob(null);
        setJobHours([]);
        return;
      }
      const [detailRes, hoursRes] = await Promise.all([
        fetch(
          `/api/time-clock/my-jobs/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`,
          { credentials: "include", cache: "no-store" }
        ),
        fetch(
          `/api/time-clock/my-jobs/${encodeURIComponent(jobId)}/hours?token=${encodeURIComponent(token)}`,
          { credentials: "include", cache: "no-store" }
        ),
      ]);
      const detailData = await readJson(detailRes);
      const hoursData = await readJson(hoursRes);
      if (!detailRes.ok) throw new Error(detailData.error || "Failed to load job");
      setJob(detailData.job || null);
      setJobHours(Array.isArray(hoursData.items) ? hoursData.items : []);
    },
    [token]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadList();
      } catch (err) {
        if (!cancelled) onError?.(err.message || "Failed to load jobs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList, onError]);

  useEffect(() => {
    if (!selectedId) {
      setJob(null);
      setJobHours([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        await loadDetail(selectedId);
      } catch (err) {
        if (!cancelled) onError?.(err.message || "Failed to load job");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadDetail, onError]);

  const handleStatusChange = async (nextStatus) => {
    if (!job?.id) return;
    setBusy(true);
    onError?.("");
    onMessage?.("");
    try {
      const res = await fetch(
        `/api/time-clock/my-jobs/${encodeURIComponent(job.id)}/status?token=${encodeURIComponent(token)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobStatus: nextStatus }),
        }
      );
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setJob(data.job || null);
      onMessage?.("Work order status updated.");
      if (data.job?.jobStatusClosed) {
        setSelectedId("");
        await loadList();
        onMessage?.("Job closed. It was removed from your open jobs list.");
      } else {
        await loadList();
      }
    } catch (err) {
      onError?.(err.message || "Failed to update status");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveHours = async (e) => {
    e.preventDefault();
    if (!job?.id) return;
    setBusy(true);
    onError?.("");
    onMessage?.("");
    try {
      const res = await fetch(
        `/api/time-clock/my-jobs/${encodeURIComponent(job.id)}/hours?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hoursForm),
        }
      );
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Failed to save hours");
      setHoursForm({ workDate: todayIsoLocal(), hours: "", note: "" });
      onMessage?.(`Saved ${data.entry?.hours ?? ""} h on ${data.entry?.workDate || "job"}.`);
      await loadDetail(job.id);
    } catch (err) {
      onError?.(err.message || "Failed to save hours");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDatasheet = async (sheet) => {
    if (!job?.id) throw new Error("No job selected");
    const res = await fetch(
      `/api/time-clock/my-jobs/${encodeURIComponent(job.id)}/datasheet?token=${encodeURIComponent(token)}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasheet: sheet }),
      }
    );
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to save datasheet");
    setJob(data.job || null);
    onMessage?.("Datasheet saved.");
    return true;
  };

  if (loading) {
    return <p className="text-sm text-neutral-600">Loading your jobs…</p>;
  }

  if (!selectedId) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-600">
          Open jobs where you are the datasheet technician.
        </p>
        {jobs.length === 0 ? (
          <div className="border border-neutral-300 bg-white px-3 py-4 text-sm text-neutral-600">
            No open jobs assigned to you.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 border border-neutral-300 bg-white">
            {jobs.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-3 text-left hover:bg-neutral-50"
                  onClick={() => setSelectedId(row.id)}
                >
                  <span className="font-bold text-[#945c2e]">
                    {row.documentNumber || "JOB"}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900">
                    {row.companyName || "Customer"}
                  </span>
                  <span className="text-xs text-neutral-600">
                    {row.machineType}
                    {row.motorLabel ? ` · ${row.motorLabel}` : ""}
                  </span>
                  {row.jobStatus ? (
                    <span className="mt-1 w-fit rounded-full bg-[#945c2e]/15 px-2 py-0.5 text-[11px] font-semibold text-[#945c2e]">
                      {row.jobStatus}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="self-start text-sm font-semibold text-[#945c2e]"
        onClick={() => setSelectedId("")}
      >
        Back to jobs
      </button>

      {busy && !job ? (
        <p className="text-sm text-neutral-600">Loading job…</p>
      ) : !job ? (
        <p className="text-sm text-neutral-600">Job not found.</p>
      ) : (
        <>
          <div className="border border-neutral-300 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#945c2e]">
              {job.documentNumber || "JOB"}
            </p>
            <h2 className="mt-1 text-lg font-bold">{job.companyName || "Customer"}</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {job.machineType}
              {job.motorLabel ? ` · ${job.motorLabel}` : ""}
            </p>
            {job.jobStatus ? (
              <span className="mt-2 inline-flex rounded-full bg-[#945c2e]/15 px-2.5 py-0.5 text-xs font-semibold text-[#945c2e]">
                {job.jobStatus}
              </span>
            ) : null}
          </div>

          <div className="border border-neutral-300 bg-white p-4">
            <label className="block text-xs font-bold text-neutral-800">
              Work order status
              <select
                className="mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm"
                value={job.jobStatus || ""}
                disabled={busy}
                onChange={(e) => void handleStatusChange(e.target.value)}
              >
                <option value="">Select…</option>
                {(job.statusOptions || []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <form
            onSubmit={handleSaveHours}
            className="flex flex-col gap-3 border border-neutral-300 bg-white p-4"
          >
            <p className="text-sm font-bold text-neutral-900">Record hours</p>
            <Input
              label="Date"
              type="date"
              required
              value={hoursForm.workDate}
              onChange={(e) => setHoursForm((f) => ({ ...f, workDate: e.target.value }))}
              disabled={busy}
            />
            <Input
              label="Hours"
              type="number"
              required
              min="0.01"
              max="24"
              step="0.01"
              value={hoursForm.hours}
              onChange={(e) => setHoursForm((f) => ({ ...f, hours: e.target.value }))}
              disabled={busy}
              placeholder="e.g. 2.5"
            />
            <label className="block text-xs font-bold text-neutral-800">
              Note (optional)
              <textarea
                rows={2}
                maxLength={500}
                className="mt-1 w-full border border-neutral-300 px-2 py-1.5 text-sm"
                value={hoursForm.note}
                onChange={(e) => setHoursForm((f) => ({ ...f, note: e.target.value }))}
                disabled={busy}
              />
            </label>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : "Save hours"}
            </Button>
            {jobHours.length > 0 ? (
              <ul className="mt-1 divide-y divide-neutral-200 border-t border-neutral-200 pt-2 text-sm">
                {jobHours.map((row) => (
                  <li key={row.id} className="flex justify-between py-1.5">
                    <span>
                      {row.workDate}
                      {row.note ? (
                        <span className="block text-xs text-neutral-500">{row.note}</span>
                      ) : null}
                    </span>
                    <span className="font-semibold">{row.hours} h</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>

          <div className="border border-neutral-300 bg-white p-4">
            <p className="text-sm font-bold text-neutral-900">Datasheet</p>
            <p className="mt-1 text-xs text-neutral-600">
              Job number {job.documentNumber || "-"} · {job.machineType}
            </p>
            <Button
              type="button"
              variant="primary"
              className="mt-3 w-full"
              disabled={busy}
              onClick={() => setDatasheetOpen(true)}
            >
              Open datasheet
            </Button>
          </div>

          <SimpleDatasheetModal
            open={datasheetOpen}
            onClose={() => setDatasheetOpen(false)}
            onSave={handleSaveDatasheet}
            motorType={job.machineType}
            initialDatasheet={job.datasheet}
            technicianOptions={technicianOptions}
            defaultTechnicianValue={employeeId}
            recordId={null}
            attachments={[]}
            jobDiagrams={[]}
            jobStatusOptions={job.statusOptions || []}
            jobStatus={job.jobStatus || ""}
            onJobStatusChange={(next) => void handleStatusChange(next)}
            recordType={RECORD_TYPE_JOB}
            printContext={{
              documentLabel: "JOB#",
              documentNumber: job.documentNumber || "",
              companyName: job.companyName || "",
            }}
          />
        </>
      )}
    </div>
  );
}
