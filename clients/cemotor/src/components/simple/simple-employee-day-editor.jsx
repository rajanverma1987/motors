"use client";

import { useMemo, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useAlert, useConfirm } from "@/components/confirm-provider";

const FORM_ID = "employee-calendar-day-form";
const FIELD =
  "h-8 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-2 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-secondary";
const SECTION_TITLE = "text-lg font-bold text-title";

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function localKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function zonedParts(iso, timeZone) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    ...(timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  const hour = pick("hour") === "24" ? "00" : pick("hour");
  return {
    year: Number(pick("year")),
    month: Number(pick("month")),
    day: Number(pick("day")),
    hour: Number(hour),
    minute: Number(pick("minute")),
  };
}

function isoToInput(iso, timeZone) {
  if (!iso) return "";
  const parts = zonedParts(iso, timeZone);
  if (!parts?.year || !parts.month || !parts.day) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function inputToIso(value, timeZone) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (!timeZone) return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  for (let i = 0; i < 4; i += 1) {
    const shown = zonedParts(new Date(utc).toISOString(), timeZone);
    if (!shown) break;
    const shownUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, 0, 0);
    const target = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const delta = target - shownUtc;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc).toISOString();
}

function inputToMs(value, timeZone) {
  const iso = inputToIso(value, timeZone);
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function sessionHours(session, timeZone) {
  if (!session || session.deleted || !session.inAt || !session.outAt) return null;
  const start = inputToMs(session.inAt, timeZone);
  const end = inputToMs(session.outAt, timeZone);
  if (start == null || end == null || end <= start) return null;
  let breakMs = 0;
  for (const item of session.breaks || []) {
    if (item.deleted || !item.start || !item.end) continue;
    const breakStart = inputToMs(item.start, timeZone);
    const breakEnd = inputToMs(item.end, timeZone);
    if (breakStart == null || breakEnd == null || breakEnd <= breakStart) continue;
    breakMs += breakEnd - breakStart;
  }
  return round2(Math.max(0, end - start - breakMs) / 3600000);
}

function dayHeading(iso) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return "Edit day";
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function emptySession() {
  return {
    key: localKey("punch"),
    inPunchId: "",
    outPunchId: "",
    punchIds: [],
    inAt: "",
    outAt: "",
    breaks: [],
    deleted: false,
  };
}

function emptyManual() {
  return { key: localKey("manual"), id: "", hours: "", note: "", deleted: false };
}

function rowsFromSessions(sessions, timeZone) {
  return (Array.isArray(sessions) ? sessions : []).map((session) => ({
    key: session.inPunchId || localKey("punch"),
    inPunchId: session.inPunchId || "",
    outPunchId: session.outPunchId || "",
    punchIds: Array.isArray(session.punchIds) ? session.punchIds : [],
    inAt: isoToInput(session.inAt, timeZone),
    outAt: isoToInput(session.outAt, timeZone),
    breaks: (Array.isArray(session.breaks) ? session.breaks : []).map((item) => ({
      key: item.startPunchId || localKey("break"),
      startPunchId: item.startPunchId || "",
      endPunchId: item.endPunchId || "",
      start: isoToInput(item.start, timeZone),
      end: isoToInput(item.end, timeZone),
      deleted: false,
    })),
    deleted: false,
  }));
}

function manualsFromEntries(manualEntries) {
  return (Array.isArray(manualEntries) ? manualEntries : []).map((entry) => ({
    key: entry.id || localKey("manual"),
    id: entry.id || "",
    hours: Number(entry.hours) > 0 ? Number(entry.hours).toFixed(2) : "",
    note: entry.note || "",
    deleted: false,
  }));
}

function TrashButton({ label, onClick }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-danger hover:bg-danger/10"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
    </button>
  );
}

/**
 * Edit punch times, manual hours, and paid hours for one calendar day.
 */
export default function SimpleEmployeeDayEditor({
  open,
  onClose,
  onSaved,
  employeeId,
  workDate,
  timeZone,
  sessions = [],
  manualEntries = [],
  paymentPaidHours = 0,
  markedPaidHours = 0,
  payEnabled = true,
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  const [rows, setRows] = useState(() => rowsFromSessions(sessions, timeZone));
  const [manuals, setManuals] = useState(() => manualsFromEntries(manualEntries));
  const [marked, setMarked] = useState(() => round2(Math.max(0, Number(markedPaidHours) || 0)));
  const [saving, setSaving] = useState(false);

  const punchTotal = useMemo(() => {
    let total = 0;
    let any = false;
    for (const row of rows) {
      const hours = sessionHours(row, timeZone);
      if (hours == null) continue;
      any = true;
      total += hours;
    }
    return any ? round2(total) : null;
  }, [rows, timeZone]);

  const manualTotal = useMemo(() => {
    let total = 0;
    for (const row of manuals) {
      if (row.deleted) continue;
      const hours = Number(row.hours);
      if (Number.isFinite(hours) && hours > 0) total += hours;
    }
    return round2(total);
  }, [manuals]);

  const workedHours = round2((punchTotal || 0) + manualTotal);
  const unpaidHours = round2(Math.max(0, workedHours - (Number(paymentPaidHours) || 0) - marked));

  const updateRow = (key, patch) => {
    setRows((list) => list.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const updateBreak = (rowKey, breakKey, patch) => {
    setRows((list) =>
      list.map((row) =>
        row.key === rowKey
          ? {
              ...row,
              breaks: row.breaks.map((item) => (item.key === breakKey ? { ...item, ...patch } : item)),
            }
          : row
      )
    );
  };

  const clearDay = async () => {
    const ok = await confirm({
      title: "Clear this day",
      message: "Remove every punch, manual hour, and paid hour on this day?",
      confirmLabel: "Clear day",
      variant: "danger",
    });
    if (!ok) return;
    const ok2 = await confirm({
      title: "Confirm clear",
      message: "Save after this to store the change. Continue?",
      confirmLabel: "Clear day",
      variant: "danger",
    });
    if (!ok2) return;
    setRows((list) => list.filter((row) => row.inPunchId || row.outPunchId).map((row) => ({ ...row, deleted: true })));
    setManuals((list) => list.filter((row) => row.id).map((row) => ({ ...row, deleted: true })));
    setMarked(0);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!employeeId || !workDate) return;
    for (const row of rows) {
      if (row.deleted) continue;
      if (!row.inAt) {
        await alert({ title: "Clock-in required", message: "Each punch needs a clock-in time.", variant: "danger" });
        return;
      }
      if (row.outAt && inputToMs(row.outAt, timeZone) <= inputToMs(row.inAt, timeZone)) {
        await alert({ title: "Clock-out", message: "Clock-out must be after clock-in.", variant: "danger" });
        return;
      }
    }
    for (const row of manuals) {
      if (row.deleted) continue;
      const hours = Number(row.hours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        await alert({
          title: "Manual hours",
          message: "Manual hours must be greater than 0 and at most 24.",
          variant: "danger",
        });
        return;
      }
    }
    const payload = {
      employeeId,
      workDate,
      sessions: rows.map((row) => ({
        deleted: Boolean(row.deleted),
        inPunchId: row.inPunchId,
        outPunchId: row.outPunchId,
        punchIds: row.punchIds,
        inAt: row.deleted ? "" : inputToIso(row.inAt, timeZone),
        outAt: row.deleted || !row.outAt ? "" : inputToIso(row.outAt, timeZone),
        breaks: (row.breaks || []).map((item) => ({
          deleted: Boolean(item.deleted),
          startPunchId: item.startPunchId,
          endPunchId: item.endPunchId,
          start: item.deleted ? "" : inputToIso(item.start, timeZone),
          end: item.deleted || !item.end ? "" : inputToIso(item.end, timeZone),
        })),
      })),
      manualEntries: manuals.map((row) => ({
        id: row.id,
        deleted: Boolean(row.deleted),
        hours: row.hours,
        note: row.note,
      })),
      ...(payEnabled ? { markedPaidHours: marked } : {}),
    };

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/time-clock/day", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save this day");
      onSaved?.();
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Failed to save this day",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const visibleRows = rows.filter((row) => !row.deleted);
  const visibleManuals = manuals.filter((row) => !row.deleted);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose?.();
      }}
      title={dayHeading(workDate)}
      size="xl"
      width="min(760px, 96vw)"
      showClose={!saving}
      closeOnOutsideClick={false}
      actions={
        <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      <Form id={FORM_ID} onSubmit={(event) => void handleSave(event)} className="!space-y-3 !border-0 !bg-transparent !p-0 !shadow-none">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-sm border border-border bg-card px-2.5 py-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">Punch hours</p>
            <p className="text-lg font-bold tabular-nums leading-tight text-title">
              {punchTotal == null ? "0.00" : punchTotal.toFixed(2)}
            </p>
          </div>
          <div className="rounded-sm border border-border bg-card px-2.5 py-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">Manual hours</p>
            <p className="text-lg font-bold tabular-nums leading-tight text-title">{manualTotal.toFixed(2)}</p>
          </div>
        </div>

        <section className="rounded-sm border border-border p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={SECTION_TITLE}>Punch in and out</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setRows((list) => [...list, emptySession()])}>
              Add punch
            </Button>
          </div>
          {visibleRows.length === 0 ? (
            <p className="text-sm text-secondary">No punches on this day.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleRows.map((row) => {
                const hours = sessionHours(row, timeZone);
                return (
                  <div key={row.key} className="rounded-sm border border-border bg-card p-2">
                    <div className="flex items-end gap-2">
                      <label className="min-w-0 flex-1">
                        <span className={LABEL}>In</span>
                        <input
                          type="datetime-local"
                          className={FIELD}
                          value={row.inAt}
                          onChange={(event) => updateRow(row.key, { inAt: event.target.value })}
                        />
                      </label>
                      <label className="min-w-0 flex-1">
                        <span className={LABEL}>Out</span>
                        <input
                          type="datetime-local"
                          className={FIELD}
                          value={row.outAt}
                          onChange={(event) => updateRow(row.key, { outAt: event.target.value })}
                        />
                      </label>
                      <div className="w-16 shrink-0 pb-1 text-right">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">Hours</p>
                        <p className="text-sm font-semibold tabular-nums text-title">
                          {hours == null ? "-" : hours.toFixed(2)}
                        </p>
                      </div>
                      <TrashButton
                        label="Delete punch"
                        onClick={() => {
                          if (!row.inPunchId && !row.outPunchId) {
                            setRows((list) => list.filter((item) => item.key !== row.key));
                            return;
                          }
                          updateRow(row.key, { deleted: true });
                        }}
                      />
                    </div>
                    {(row.breaks || []).filter((item) => !item.deleted).map((item) => (
                      <div key={item.key} className="mt-2 flex items-end gap-2 pl-3">
                        <label className="min-w-0 flex-1">
                          <span className={LABEL}>Break start</span>
                          <input
                            type="datetime-local"
                            className={FIELD}
                            value={item.start}
                            onChange={(event) => updateBreak(row.key, item.key, { start: event.target.value })}
                          />
                        </label>
                        <label className="min-w-0 flex-1">
                          <span className={LABEL}>Break end</span>
                          <input
                            type="datetime-local"
                            className={FIELD}
                            value={item.end}
                            onChange={(event) => updateBreak(row.key, item.key, { end: event.target.value })}
                          />
                        </label>
                        <TrashButton
                          label="Delete break"
                          onClick={() => {
                            if (!item.startPunchId && !item.endPunchId) {
                              setRows((list) =>
                                list.map((session) =>
                                  session.key === row.key
                                    ? { ...session, breaks: session.breaks.filter((entry) => entry.key !== item.key) }
                                    : session
                                )
                              );
                              return;
                            }
                            updateBreak(row.key, item.key, { deleted: true });
                          }}
                        />
                      </div>
                    ))}
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateRow(row.key, {
                            breaks: [
                              ...(row.breaks || []),
                              {
                                key: localKey("break"),
                                startPunchId: "",
                                endPunchId: "",
                                start: "",
                                end: "",
                                deleted: false,
                              },
                            ],
                          })
                        }
                      >
                        Add break
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-sm border border-border p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={SECTION_TITLE}>Manual hours</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setManuals((list) => [...list, emptyManual()])}>
              Add manual hours
            </Button>
          </div>
          {visibleManuals.length === 0 ? (
            <p className="text-sm text-secondary">No manual hours on this day.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {visibleManuals.map((row) => (
                <div key={row.key} className="flex items-end gap-2">
                  <label className="w-28 shrink-0">
                    <span className={LABEL}>Hours</span>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.01"
                      className={FIELD}
                      value={row.hours}
                      onChange={(event) =>
                        setManuals((list) =>
                          list.map((item) => (item.key === row.key ? { ...item, hours: event.target.value } : item))
                        )
                      }
                    />
                  </label>
                  <label className="min-w-0 flex-1">
                    <span className={LABEL}>Note</span>
                    <input
                      type="text"
                      className={FIELD}
                      value={row.note}
                      onChange={(event) =>
                        setManuals((list) =>
                          list.map((item) => (item.key === row.key ? { ...item, note: event.target.value } : item))
                        )
                      }
                    />
                  </label>
                  <TrashButton
                    label="Delete manual hours"
                    onClick={() => {
                      if (!row.id) {
                        setManuals((list) => list.filter((item) => item.key !== row.key));
                        return;
                      }
                      setManuals((list) =>
                        list.map((item) => (item.key === row.key ? { ...item, deleted: true } : item))
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {payEnabled ? (
          <section className="rounded-sm border border-border p-2">
            <div className="flex items-center justify-between gap-2">
              <p className={SECTION_TITLE}>Unpaid hours</p>
              {unpaidHours > 0.001 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    setMarked((current) => {
                      const unpaid = round2(
                        Math.max(0, workedHours - (Number(paymentPaidHours) || 0) - current)
                      );
                      if (unpaid <= 0.001) return current;
                      return round2(current + unpaid);
                    })
                  }
                >
                  Mark {unpaidHours.toFixed(2)} paid
                </Button>
              ) : null}
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums leading-tight text-title">{unpaidHours.toFixed(2)}</p>
            {marked > 0.001 ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-sm text-secondary">
                  {marked.toFixed(2)} hrs marked paid. These hours stay out of unpaid. This does not record a payment.
                </p>
                <TrashButton label="Remove marked paid hours" onClick={() => setMarked(0)} />
              </div>
            ) : (
              <p className="mt-1 text-xs text-secondary">
                Mark unpaid hours paid to correct a mistake. Save stores the change. This does not record a payment.
              </p>
            )}
          </section>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => void clearDay()} disabled={saving}>
            Clear this day
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
