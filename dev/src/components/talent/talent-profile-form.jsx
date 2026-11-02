"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import {
  TALENT_AVAILABILITY,
  TALENT_AVAILABILITY_HELP,
  TALENT_AVAILABILITY_LABELS,
  TALENT_EMPLOYMENT_TYPES,
  TALENT_EXPERIENCE_LEVELS,
  TALENT_ROLES,
  TALENT_SKILLS,
  US_STATE_CODES,
} from "@/lib/talent-constants";
import { buildTalentShareText } from "@/lib/talent-seo";
import TalentShareButtons from "@/components/talent/talent-share-buttons";

function toggleInList(list, value) {
  const arr = Array.isArray(list) ? [...list] : [];
  const i = arr.indexOf(value);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(value);
  return arr;
}

function availabilityBadgeVariant(value) {
  if (value === "available_now") return "success";
  if (value === "open") return "primary";
  return "default";
}

export default function TalentProfileForm({ initialProfile }) {
  const router = useRouter();
  const [form, setForm] = useState(() => ({
    fullName: initialProfile?.fullName || "",
    phone: initialProfile?.phone || "",
    headline: initialProfile?.headline || "",
    bio: initialProfile?.bio || "",
    city: initialProfile?.city || "",
    state: initialProfile?.state || "",
    preferredAreas: initialProfile?.preferredAreas || [],
    willingToRelocate: Boolean(initialProfile?.willingToRelocate),
    availability: initialProfile?.availability || "open",
    yearsExperience: initialProfile?.yearsExperience ?? 0,
    experienceLevel: initialProfile?.experienceLevel || "entry",
    skills: initialProfile?.skills || [],
    roles: initialProfile?.roles || [],
    employmentTypes: initialProfile?.employmentTypes || [],
    salaryExpectation: initialProfile?.salaryExpectation || "",
    workAuthorization: initialProfile?.workAuthorization || "",
    linkedinUrl: initialProfile?.linkedinUrl || "",
    portfolioUrl: initialProfile?.portfolioUrl || "",
    jobAlertsEnabled: initialProfile?.jobAlertsEnabled !== false,
    status: initialProfile?.status === "paused" ? "paused" : "active",
    resumeUrl: initialProfile?.resumeUrl || "",
    profileScore: initialProfile?.profileScore || 0,
    slug: initialProfile?.slug || "",
    email: initialProfile?.email || "",
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!initialProfile) return;
    setForm((f) => ({
      ...f,
      ...initialProfile,
      preferredAreas: initialProfile.preferredAreas || [],
      skills: initialProfile.skills || [],
      roles: initialProfile.roles || [],
      employmentTypes: initialProfile.employmentTypes || [],
      jobAlertsEnabled: initialProfile.jobAlertsEnabled !== false,
      status: initialProfile.status === "paused" ? "paused" : "active",
    }));
    const canShare =
      Boolean(initialProfile.slug) &&
      initialProfile.status !== "paused" &&
      initialProfile.status !== "banned" &&
      String(initialProfile.fullName || "").trim().length >= 2 &&
      Number(initialProfile.profileScore || 0) >= 40;
    setShowShare(canShare);
  }, [initialProfile]);

  const scoreHint = useMemo(() => {
    const s = Number(form.profileScore || 0);
    if (s >= 80) return "Strong profile. Shops can evaluate you quickly.";
    if (s >= 50) return "Good start. Add skills, preferred areas, and a resume.";
    return "Complete more fields so shops can hire with confidence.";
  }, [form.profileScore]);

  function patch(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setAvailability(next) {
    setForm((f) => ({
      ...f,
      availability: next,
      // Not available for hire: stop job alert emails automatically.
      jobAlertsEnabled: next === "not_looking" ? false : f.jobAlertsEnabled,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSavedMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/talent/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setForm((f) => ({ ...f, ...data.profile }));
      setSavedMsg("Profile saved.");
      const next = data.profile || {};
      const canShare =
        Boolean(next.slug) &&
        next.status !== "paused" &&
        next.status !== "banned" &&
        String(next.fullName || "").trim().length >= 2;
      setShowShare(canShare);
      router.refresh();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const publicProfileUrl = useMemo(() => {
    if (!form.slug || typeof window === "undefined") return "";
    return `${window.location.origin}/talent/${encodeURIComponent(form.slug)}`;
  }, [form.slug]);

  const shareReady =
    showShare &&
    Boolean(form.slug) &&
    form.status !== "paused" &&
    form.status !== "banned" &&
    String(form.fullName || "").trim().length >= 2;

  async function handleResume(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/talent/me/resume", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm((f) => ({ ...f, ...data.profile }));
      setSavedMsg("Resume uploaded.");
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function logout() {
    await fetch("/api/talent/auth/logout", { method: "POST", credentials: "include" });
    router.push("/talent/login");
    router.refresh();
  }

  return (
    <Form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-sm text-secondary">{form.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant={availabilityBadgeVariant(form.availability)}
              className="rounded-full px-2.5 py-0.5 text-xs"
            >
              {TALENT_AVAILABILITY_LABELS[form.availability] || form.availability}
            </Badge>
            <span className="text-sm font-semibold tabular-nums text-title">
              Completeness {form.profileScore || 0}%
            </span>
          </div>
          <p className="mt-1 text-xs text-secondary">{scoreHint}</p>
          {form.slug ? (
            <p className="mt-2 text-sm text-secondary">
              Public page:{" "}
              <a href={`/talent/${form.slug}`} className="font-medium text-primary hover:underline">
                /talent/{form.slug}
              </a>
            </p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-bg p-4">
        <p className="text-sm font-semibold text-title">Hiring availability</p>
        <p className="mt-1 text-xs text-secondary">
          Change this anytime after login. You can mark yourself not available for hire without deleting your profile.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {TALENT_AVAILABILITY.map((value) => {
            const selected = form.availability === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setAvailability(value)}
                aria-pressed={selected}
                className={`rounded-md border px-3 py-3 text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span className="block text-sm font-semibold text-title">
                  {TALENT_AVAILABILITY_LABELS[value]}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-secondary">
                  {TALENT_AVAILABILITY_HELP[value]}
                </span>
              </button>
            );
          })}
        </div>
        {form.availability === "not_looking" ? (
          <p className="mt-3 text-xs text-secondary">
            Job alerts are off while you are not available for hire. Turn alerts back on below when you set Available
            now or Open to opportunities.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name *"
          value={form.fullName}
          onChange={(e) => patch("fullName", e.target.value)}
          required
        />
        <Input label="Phone" value={form.phone} onChange={(e) => patch("phone", e.target.value)} />
        <div className="sm:col-span-2">
          <Input
            label="Headline"
            value={form.headline}
            onChange={(e) => patch("headline", e.target.value)}
            placeholder="e.g. Motor winder with 8 years shop experience"
          />
        </div>
        <div className="sm:col-span-2">
          <Textarea
            label="About you"
            value={form.bio}
            onChange={(e) => patch("bio", e.target.value)}
            rows={5}
            placeholder="Equipment, shops, certifications, shifts you can work…"
          />
        </div>
        <Input label="City" value={form.city} onChange={(e) => patch("city", e.target.value)} />
        <div>
          <label className="mb-1 block text-sm font-medium text-title">State</label>
          <select
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
            value={form.state}
            onChange={(e) => patch("state", e.target.value)}
          >
            <option value="">Select…</option>
            {US_STATE_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-title">Preferred work areas (states)</p>
        <p className="mb-2 text-xs text-secondary">
          Job alerts match these states (plus your home state). Fill this for better matches.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {US_STATE_CODES.map((code) => {
            const on = form.preferredAreas.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => patch("preferredAreas", toggleInList(form.preferredAreas, code))}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-secondary hover:border-primary/40"
                }`}
              >
                {code}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-title">
          <input
            type="checkbox"
            checked={form.willingToRelocate}
            onChange={(e) => patch("willingToRelocate", e.target.checked)}
          />
          Willing to relocate
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Years experience"
          type="number"
          min={0}
          max={60}
          value={form.yearsExperience}
          onChange={(e) => patch("yearsExperience", e.target.value)}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-title">Experience level</label>
          <select
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
            value={form.experienceLevel}
            onChange={(e) => patch("experienceLevel", e.target.value)}
          >
            {TALENT_EXPERIENCE_LEVELS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ChipGroup
        label="Skills"
        options={TALENT_SKILLS}
        values={form.skills}
        onToggle={(v) => patch("skills", toggleInList(form.skills, v))}
      />
      <ChipGroup
        label="Roles"
        options={TALENT_ROLES}
        values={form.roles}
        onToggle={(v) => patch("roles", toggleInList(form.roles, v))}
      />
      <ChipGroup
        label="Employment types sought"
        options={TALENT_EMPLOYMENT_TYPES}
        values={form.employmentTypes}
        onToggle={(v) => patch("employmentTypes", toggleInList(form.employmentTypes, v))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Salary expectation"
          value={form.salaryExpectation}
          onChange={(e) => patch("salaryExpectation", e.target.value)}
          placeholder="e.g. $28 to $35 / hour"
        />
        <Input
          label="Work authorization note"
          value={form.workAuthorization}
          onChange={(e) => patch("workAuthorization", e.target.value)}
        />
        <Input
          label="LinkedIn URL"
          value={form.linkedinUrl}
          onChange={(e) => patch("linkedinUrl", e.target.value)}
        />
        <Input
          label="Portfolio URL"
          value={form.portfolioUrl}
          onChange={(e) => patch("portfolioUrl", e.target.value)}
        />
      </div>

      <div className="space-y-2 rounded-md border border-border bg-card p-4">
        <p className="text-sm font-medium text-title">Resume (PDF)</p>
        {form.resumeUrl ? (
          <p className="text-sm text-secondary">
            Current:{" "}
            <a href={form.resumeUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              View resume
            </a>
          </p>
        ) : (
          <p className="text-sm text-secondary">No resume uploaded yet.</p>
        )}
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => void handleResume(e)} disabled={uploading} />
        {uploading ? <p className="text-xs text-secondary">Uploading…</p> : null}
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
        <p className="text-sm font-medium text-title">Alerts and visibility</p>
        <label className="flex items-start gap-2 text-sm text-title">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={form.jobAlertsEnabled}
            disabled={form.availability === "not_looking"}
            onChange={(e) => patch("jobAlertsEnabled", e.target.checked)}
          />
          <span>
            Email me when matching jobs are posted
            {form.availability === "not_looking" ? (
              <span className="mt-0.5 block text-xs text-secondary">
                Turned off while Not available for hire. Change hiring availability above to re-enable.
              </span>
            ) : null}
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-title">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={form.status === "paused"}
            onChange={(e) => patch("status", e.target.checked ? "paused" : "active")}
          />
          <span>
            Hide my profile from the public directory (pause)
            <span className="mt-0.5 block text-xs text-secondary">
              Prefer Not available for hire if you want the page public but not open to offers.
            </span>
          </span>
        </label>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {savedMsg ? <p className="text-sm text-primary">{savedMsg}</p> : null}

      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </Button>

      {shareReady ? (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-4 sm:p-5">
          <p className="text-base font-semibold text-title">Share your profile</p>
          <p className="mt-1 text-sm text-secondary">
            Your public page is live. Share it on LinkedIn, Facebook, or X so shops can find you. Completeness:{" "}
            {form.profileScore || 0}%.
          </p>
          <div className="mt-4">
            <TalentShareButtons
              profileUrl={publicProfileUrl}
              shareTitle={`${form.fullName} | 3PhaseFlow Talent`}
              shareText={buildTalentShareText(form)}
            />
          </div>
          <p className="mt-3 text-xs text-secondary">
            Tip: keep availability set to Available now or Open, and leave the profile unpaused, so your share link
            stays public.
          </p>
        </div>
      ) : null}
    </Form>
  );
}

function ChipGroup({ label, options, values, onToggle }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-title">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                on
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-secondary hover:border-primary/40"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
