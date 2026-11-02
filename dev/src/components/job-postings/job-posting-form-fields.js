"use client";

import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Checkbox from "@/components/ui/checkbox";
import { EMPLOYMENT_LABELS, EXPERIENCE_LABELS, STATUS_LABELS } from "@/lib/job-posting-labels";

const EMPLOYMENT_OPTIONS = Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => ({ value, label }));
const EXPERIENCE_OPTIONS = Object.entries(EXPERIENCE_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

/**
 * Shared fields for create / edit job posting (dashboard).
 * @param {{ form: object, setForm: (fn: (f: object) => object) => void }} props
 */
export default function JobPostingFormFields({ form, setForm }) {
  return (
    <>
      <Input
        label="Job title *"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="e.g. Senior motor winder"
        required
      />
      <Textarea
        label="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        rows={4}
        placeholder="Overview of the role and your shop."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Location"
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          placeholder="City, ST or Remote"
        />
        <Input
          label="Department"
          value={form.department}
          onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
          placeholder="e.g. Shop floor"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Employment type"
          options={EMPLOYMENT_OPTIONS}
          value={form.employmentType}
          onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
        />
        <Select
          label="Experience level"
          options={EXPERIENCE_OPTIONS}
          value={form.experienceLevel}
          onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value }))}
        />
      </div>
      <Input
        label="Salary / pay (display only)"
        value={form.salaryDisplay}
        onChange={(e) => setForm((f) => ({ ...f, salaryDisplay: e.target.value }))}
        placeholder="e.g. $28–38/hr DOE"
      />
      <Textarea
        label="Responsibilities"
        value={form.responsibilities}
        onChange={(e) => setForm((f) => ({ ...f, responsibilities: e.target.value }))}
        rows={3}
      />
      <Textarea
        label="Qualifications"
        value={form.qualifications}
        onChange={(e) => setForm((f) => ({ ...f, qualifications: e.target.value }))}
        rows={3}
      />
      <Textarea
        label="Benefits"
        value={form.benefits}
        onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
        rows={2}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
        />
        <div className="flex items-end pb-2">
          <Checkbox
            checked={form.listedOnMarketingSite}
            onChange={(e) => setForm((f) => ({ ...f, listedOnMarketingSite: e.target.checked }))}
            label="List on public Careers page when status is Open"
          />
        </div>
      </div>
    </>
  );
}
