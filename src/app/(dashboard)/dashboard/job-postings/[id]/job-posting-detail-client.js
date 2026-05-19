"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";
import { sortRowsClient } from "@/lib/client-table-sort";

export default function JobPostingDetailClient() {
  const params = useParams();
  const id = params?.id;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);

  const loadJob = useCallback(async () => {
    if (!id) return;
    if (!/^[a-f0-9]{24}$/i.test(id)) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/dashboard/job-postings/${id}`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setJob(data);
    } catch (e) {
      toast.error(e.message || "Failed to load");
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  const loadApplications = useCallback(async () => {
    if (!id || !/^[a-f0-9]{24}$/i.test(id)) return;
    try {
      const res = await fetch(`/api/dashboard/job-postings/${id}/applications`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setApplications(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn(e);
      setApplications([]);
    }
  }, [id]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-secondary">Loading…</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-secondary">Job not found.</p>
        <Link href="/dashboard/job-postings" className="mt-4 inline-block text-primary hover:underline">
          ← Back to job postings
        </Link>
      </div>
    );
  }

  return <JobPostingApplicantsSection job={job} applications={applications} />;
}

function JobPostingApplicantsSection({ job, applications }) {
  const getApplicantSortValue = useCallback((row, key) => {
    if (key === "createdAt") {
      const t = row?.createdAt ? new Date(row.createdAt).getTime() : NaN;
      return Number.isFinite(t) ? t : null;
    }
    return row?.[key];
  }, []);

  const [appSort, setAppSort] = useState({ key: null, direction: "asc" });
  const sortedApplications = useMemo(
    () => sortRowsClient(applications, appSort, getApplicantSortValue),
    [applications, appSort, getApplicantSortValue]
  );
  const handleAppSort = useCallback((key, direction) => setAppSort({ key, direction }), []);

  const appColumns = useMemo(
    () => [
    {
      key: "applicantName",
      label: "Applicant",
      sortable: true,
      render: (v, row) => (
        <div>
          <div className="font-medium text-title">{v}</div>
          <a href={`mailto:${row.applicantEmail}`} className="text-sm text-primary hover:underline">
            {row.applicantEmail}
          </a>
        </div>
      ),
    },
    { key: "applicantPhone", label: "Phone", sortable: true, render: (v) => v || "—" },
    {
      key: "experienceText",
      label: "Experience",
      sortable: true,
      render: (v) => (
        <p className="max-w-[33.6rem] whitespace-pre-wrap text-sm text-secondary line-clamp-4" title={v}>
          {v || "—"}
        </p>
      ),
    },
    {
      key: "createdAt",
      label: "Applied",
      sortable: true,
      render: (v) => (v ? new Date(v).toLocaleString() : "—"),
    },
    ],
    []
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/job-postings"
          className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary"
        >
          <FiArrowLeft className="h-4 w-4" />
          Job postings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-title">{job.title}</h1>
        <p className="mt-1 text-sm text-secondary">
          Applicants for this posting—edit from Job postings.
        </p>
        <p className="mt-2 text-sm text-secondary">
          Careers URL:{" "}
          <a
            href={`/careers/${job.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            /careers/{job.slug}
            <FiExternalLink className="h-3.5 w-3.5" />
          </a>
          {job.status === "open" && job.listedOnMarketingSite ? "" : " (hidden until open and listed)"}
        </p>
      </div>

      <div className="w-full min-w-0">
        <h2 className="text-lg font-semibold text-title">Applicants ({applications.length})</h2>
        <p className="mt-1 text-sm text-secondary">
          Candidates who applied online.
        </p>
        <div className="mt-4 rounded-xl border border-border bg-card">
          <Table
            columns={appColumns}
            data={sortedApplications}
            rowKey="id"
            loading={false}
            emptyMessage="No applications yet."
            sortState={appSort}
            onSort={handleAppSort}
          />
        </div>
      </div>
    </div>
  );
}
