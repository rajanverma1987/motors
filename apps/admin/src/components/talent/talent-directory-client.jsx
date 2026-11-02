"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import {
  US_STATE_CODES,
  TALENT_AVAILABILITY,
  TALENT_AVAILABILITY_LABELS,
} from "@/lib/talent-constants";
import { talentRoleLabel, talentSkillLabel } from "@/lib/talent-seo";

function availabilityVariant(value) {
  if (value === "available_now") return "success";
  if (value === "open") return "primary";
  return "default";
}

export default function TalentDirectoryClient({ initialRows = [], skillOptions = [] }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [skill, setSkill] = useState("");
  const [availability, setAvailability] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (initialRows || []).filter((p) => {
      if (state) {
        const areas = Array.isArray(p.preferredAreas) ? p.preferredAreas : [];
        if (p.state !== state && !areas.includes(state)) return false;
      }
      if (skill && !(p.skills || []).includes(skill)) return false;
      if (availability && p.availability !== availability) return false;
      if (!query) return true;
      const hay = [p.fullName, p.headline, p.city, p.state, ...(p.skills || []), ...(p.roles || [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [initialRows, q, state, skill, availability]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <Input
            label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, skill, city…"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-title">State</label>
          <select
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="">All</option>
            {US_STATE_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-title">Skill</label>
          <select
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          >
            <option value="">All</option>
            {skillOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-title">Availability</label>
          <select
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option value="">All</option>
            {TALENT_AVAILABILITY.map((v) => (
              <option key={v} value={v}>
                {TALENT_AVAILABILITY_LABELS[v]}
              </option>
            ))}
          </select>
        </div>
        <Link href="/talent/login">
          <Button type="button" variant="outline" size="sm">
            Create profile
          </Button>
        </Link>
      </div>
      <p className="text-xs text-secondary">
        Showing {filtered.length} of {initialRows.length} profiles
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-lg font-medium text-title">No profiles match these filters</p>
          <p className="mt-2 text-secondary">Clear filters or create your free profile.</p>
          <Link
            href="/talent/login"
            className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Create free profile
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={`/talent/${p.slug}`}
                className="flex flex-col gap-3 px-5 py-5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-title">{p.fullName}</h2>
                    <Badge
                      variant={availabilityVariant(p.availability)}
                      className="rounded-full px-2.5 py-0.5 text-xs"
                    >
                      {TALENT_AVAILABILITY_LABELS[p.availability] || p.availability}
                    </Badge>
                  </div>
                  {p.headline ? <p className="mt-1 text-sm text-secondary">{p.headline}</p> : null}
                  <p className="mt-1 text-xs text-secondary">
                    {[p.city, p.state].filter(Boolean).join(", ") || "Location not set"}
                    {p.preferredAreas?.length
                      ? ` · Prefers: ${p.preferredAreas.slice(0, 4).join(", ")}`
                      : ""}
                    {p.willingToRelocate ? " · Relocate OK" : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(p.roles || []).slice(0, 3).map((r) => (
                      <span
                        key={r}
                        className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] text-secondary"
                      >
                        {talentRoleLabel(r)}
                      </span>
                    ))}
                    {(p.skills || []).slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] text-secondary"
                      >
                        {talentSkillLabel(s)}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-medium text-primary">View profile</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
