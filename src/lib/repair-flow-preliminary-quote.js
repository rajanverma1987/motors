/**
 * Rule-based line items from preliminary inspections (newFlow.md).
 * Quotes are derived from inspection findings, not manual entry at this step.
 */

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v) {
  return v == null ? "" : String(v).trim();
}

/**
 * @param {Array<{ component: string, findings: Record<string, unknown> }>} inspections
 * @returns {{ lineItems: Array<{ description: string, quantity: number, unitPrice: number, notes: string, subjectToTeardown: boolean }>, quoteNotes: string }}
 */
export function buildPreliminaryQuoteFromInspections(inspections) {
  const lineItems = [];
  const notes = [];

  for (const row of inspections || []) {
    const comp = str(row.component);
    const f = row.findings && typeof row.findings === "object" ? row.findings : {};
    const insulation = str(
      f.insulationResistance ||
        f.insulation ||
        f.fieldInsulationReadings ||
        f.barToBarInsulation ||
        f.irToGroundMegger ||
        f.irPhaseToPhase ||
        f.irToGround ||
        f.armatureIrToGround ||
        f.fieldCoilResistance ||
        f.armatureResistance ||
        f.barToBarTest ||
        f.polarizationIndex ||
        f.fieldPolarizationIndex
    );
    const rotation = str(
      f.rotationCondition ||
        f.rotation ||
        f.balanceRunout ||
        f.shaftRunout ||
        f.armatureShaftRunout ||
        f.dynamicBalanceStatus ||
        f.balanceStatus ||
        f.rotationFreeSpin
    );
    const noise = str(f.noiseSmell || f.noise);
    const damageParts = [
      f.visibleDamage,
      f.damage,
      f.windingVisual,
      f.coreIronVisual,
      f.leadsConnections,
      f.journalBearingVisual,
      f.shortsVisualSigns,
      f.couplingFan,
      f.poleShoeVisual,
      f.poleConnections,
      f.frameGroundPath,
      f.commutatorVisual,
      f.brushTrack,
      f.bandingTies,
      f.windingCondition,
      f.coreCondition,
      f.slotCondition,
      f.terminalCondition,
      f.barCondition,
      f.endRingCondition,
      f.commutatorCondition,
      f.commutatorUndercutStatus,
      f.segmentTightness,
      f.fieldCoilCondition,
      f.poleCondition,
      f.yokeCondition,
      f.interpoleCondition,
      f.rotorCoreCondition,
      f.bearingFitCondition,
      f.bearingSeatCondition,
      f.shaftJournalCondition,
      f.rtdTempSensorStatus,
      f.surgeTestResult,
      f.growlerTestResult,
    ]
      .map((x) => str(x))
      .filter(Boolean);
    const damage = damageParts.join("; ");
    const extra = str(f.additionalFindings || f.notes);

    const ir = num(f.insulationResistanceOhms ?? f.insulationOhms);
    if (ir != null && ir < 1) {
      lineItems.push({
        description: `Low insulation reading (${comp}) — winding assessment required`,
        quantity: 1,
        unitPrice: 0,
        notes: "Subject to disassembly and detailed inspection.",
        subjectToTeardown: true,
      });
    } else if (insulation && /low|bad|fail|marginal/i.test(insulation)) {
      lineItems.push({
        description: `Insulation concern (${comp}): ${insulation}`,
        quantity: 1,
        unitPrice: 0,
        notes: "Subject to disassembly.",
        subjectToTeardown: true,
      });
    }

    if (rotation && /rough|seized|binding|abnormal/i.test(rotation)) {
      lineItems.push({
        description: `Rotation issue (${comp}): ${rotation}`,
        quantity: 1,
        unitPrice: 0,
        notes: "Bearing or mechanical review likely; subject to disassembly.",
        subjectToTeardown: true,
      });
    }

    if (noise && /burn|smoke|arc|noise/i.test(noise)) {
      lineItems.push({
        description: `Operational signal (${comp}): ${noise}`,
        quantity: 1,
        unitPrice: 0,
        notes: "Preliminary scope; confirm after disassembly.",
        subjectToTeardown: true,
      });
    }

    if (damage) {
      lineItems.push({
        description: `Visible damage noted (${comp}): ${damage}`,
        quantity: 1,
        unitPrice: 0,
        notes: "Repair scope TBD after detailed inspection.",
        subjectToTeardown: true,
      });
    }

    if (extra) {
      notes.push(`${comp}: ${extra}`);
    }
  }

  if (lineItems.length === 0) {
    lineItems.push({
      description: "Preliminary evaluation — disassembly and detailed inspection recommended",
      quantity: 1,
      unitPrice: 0,
      notes: "No specific automated rules matched; line items to be refined after inspection.",
      subjectToTeardown: true,
    });
  }

  const subtotal = lineItems.reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0);

  const quoteNotes = [
    "Preliminary quote — pricing is indicative and subject to disassembly and customer approval.",
    notes.length ? `Technician notes: ${notes.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { lineItems, subtotal, quoteNotes };
}

/**
 * @param {Array<{ component: string, findings: Record<string, unknown> }>} detailedInspections
 */
export function buildFinalQuoteFromDetailedInspections(detailedInspections) {
  const lineItems = [];
  for (const row of detailedInspections || []) {
    const comp = str(row.component);
    const f = row.findings && typeof row.findings === "object" ? row.findings : {};
    const winding = str(f.windingCondition || f.winding);
    const core = str(f.coreDamage || f.core);
    const bearing = str(f.bearingFailure || f.bearing);
    const shaft = str(f.shaftIssues || f.shaft);

    if (winding && /rewind|replace|burn|short/i.test(winding)) {
      lineItems.push({
        description: `${comp} winding: ${winding}`,
        quantity: 1,
        unitPrice: 0,
        notes: "Finalize labor and material after shop review.",
        subjectToTeardown: false,
      });
    }
    if (core) {
      lineItems.push({
        description: `${comp} core / laminations: ${core}`,
        quantity: 1,
        unitPrice: 0,
        notes: "",
        subjectToTeardown: false,
      });
    }
    if (bearing) {
      lineItems.push({
        description: `Bearing service (${comp}): ${bearing}`,
        quantity: 1,
        unitPrice: 0,
        notes: "",
        subjectToTeardown: false,
      });
    }
    if (shaft) {
      lineItems.push({
        description: `Shaft / mechanical (${comp}): ${shaft}`,
        quantity: 1,
        unitPrice: 0,
        notes: "",
        subjectToTeardown: false,
      });
    }
  }

  if (lineItems.length === 0) {
    lineItems.push({
      description: "Repair per detailed inspection — finalize line items in CRM",
      quantity: 1,
      unitPrice: 0,
      notes: "Add precise labor and parts before sending for approval.",
      subjectToTeardown: false,
    });
  }

  const subtotal = lineItems.reduce((s, li) => s + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0);
  const quoteNotes =
    "Final quote based on disassembly and detailed inspection. Lock after customer approval.";

  return { lineItems, subtotal, quoteNotes };
}
