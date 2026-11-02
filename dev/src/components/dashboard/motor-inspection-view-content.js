"use client";

import Badge from "@/components/ui/badge";
import {
  getMotorInspectionViewEntries,
  labelForPassFail,
  labelForVisualStatus,
} from "@/lib/motor-inspection-fields";

const VIEW_SECTIONS = [
  {
    id: "visual",
    title: "Visual status",
    keys: ["visualStatus"],
  },
  {
    id: "intake",
    title: "Intake & condition",
    keys: ["incomingLeads", "markedMotorSides", "junctionBoxLocation", "brokenPartsNotes"],
  },
  {
    id: "fit",
    title: "Fit & bearings",
    keys: [
      "endBellFitDE",
      "endBellFitODE",
      "rotorFitDE",
      "rotorFitODE",
      "shaftMeasurement",
      "shaftRunout",
      "numberOfBearings",
      "bearingSizeDE",
      "bearingSizeODE",
      "sealSizeDE",
      "sealSizeODE",
    ],
  },
  {
    id: "other",
    title: "Other notes",
    keys: ["otherNotes"],
  },
  {
    id: "magger",
    title: "Magger test",
    keys: ["maggerVoltage", "maggerMicroAmps", "maggerTest"],
  },
  {
    id: "surge",
    title: "Surge test",
    keys: [
      "surgeVoltage",
      "surgeTest",
      "surgeFailCoilToCoil",
      "surgeFailTurnToTurn",
      "surgeFailPhaseToPhase",
      "surgeFailPhaseToGround",
      "surgeFailSinglePhased",
    ],
  },
  {
    id: "final",
    title: "Final notes",
    keys: ["finalNotes"],
  },
];

function displayValue(key, text) {
  if (key === "visualStatus") {
    const label = labelForVisualStatus(text);
    if (label === "—") return { text: "—", badge: null };
    const variant = String(text).toLowerCase() === "burned" ? "danger" : "success";
    return { text: label, badge: variant };
  }
  if (key === "maggerTest" || key === "surgeTest") {
    const label = labelForPassFail(text);
    if (label === "—") return { text: "—", badge: null };
    const variant = String(text).toLowerCase() === "fail" ? "danger" : "success";
    return { text: label, badge: variant };
  }
  if (key.startsWith("surgeFail")) {
    const on = text === "Yes";
    return { text: on ? "Yes" : "—", badge: on ? "warning" : null };
  }
  return { text: text || "—", badge: null };
}

/**
 * Read-only inspection findings grouped like the entry form.
 */
export default function MotorInspectionViewContent({ findings }) {
  const entries = getMotorInspectionViewEntries(findings);
  const byKey = Object.fromEntries(entries.map((e) => [e.key, e]));

  return (
    <div className="space-y-4">
      {VIEW_SECTIONS.map((section) => {
        const rows = section.keys
          .map((key) => byKey[key])
          .filter((row) => row && row.text !== "—");
        if (!rows.length) return null;

        return (
          <section
            key={section.id}
            className="overflow-hidden rounded-xl border border-border bg-bg/30"
          >
            <div className="border-b border-border/80 bg-card/50 px-4 py-2.5">
              <h4 className="text-sm font-semibold text-title">{section.title}</h4>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
              {rows.map(({ key, label, text }) => {
                const wide =
                  key === "finalNotes" ||
                  key === "brokenPartsNotes" ||
                  key === "otherNotes" ||
                  key.startsWith("surgeFail");
                const { text: display, badge } = displayValue(key, text);
                return (
                  <div key={key} className={wide ? "sm:col-span-2" : "min-w-0"}>
                    <dt className="text-xs font-medium text-secondary">{label}</dt>
                    <dd className="mt-1 text-sm text-title">
                      {badge ? (
                        <Badge variant={badge} className="rounded-full px-2.5 py-0.5 text-xs">
                          {display}
                        </Badge>
                      ) : (
                        <span className="whitespace-pre-wrap">{display}</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
