import { Alert, Platform } from "react-native";
import * as Print from "expo-print";
import * as MailComposer from "expo-mail-composer";
import * as Sharing from "expo-sharing";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(n, digits = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function slotSize(row, i) {
  const q = row[`wires${i}`];
  if (!q || q <= 0) return "0";
  const s = row[`wireSize${i}`];
  return s != null && s !== "" ? String(s) : "0";
}

function slotQty(row, i) {
  const q = Number(row[`wires${i}`]) || 0;
  return q > 0 ? q : 0;
}

export function wireCombinationLabel(row) {
  const parts = [];
  for (let i = 1; i <= 3; i++) {
    const qty = Number(row[`wires${i}`]) || 0;
    if (qty <= 0) continue;
    const size = slotSize(row, i);
    if (!size || size === "0") continue;
    parts.push(`${qty}#${size}`);
  }
  return parts.join("  |  ");
}

function rowTint(pct) {
  const a = Math.abs(Number(pct) || 0);
  if (a <= 2) return "#d1fae5";
  if (a <= 10) return "#fde68a";
  return "#f7f3ef";
}

export function buildCmResultsHtml({ title, results, resultContext }) {
  const ctx = resultContext || {};
  const generated = new Date().toLocaleString();
  const rows = Array.isArray(results) ? results : [];
  const tableRows = rows
    .map((row) => {
      const bg = rowTint(row.percentDifference);
      const pct = Number(row.percentDifference) || 0;
      const pctLabel = `${pct > 0 ? "+" : ""}${pct}%`;
      return `<tr style="background:${bg}">
        <td>${escapeHtml(slotSize(row, 1))}</td>
        <td>${escapeHtml(slotQty(row, 1))}</td>
        <td>${escapeHtml(slotSize(row, 2))}</td>
        <td>${escapeHtml(slotQty(row, 2))}</td>
        <td>${escapeHtml(slotSize(row, 3))}</td>
        <td>${escapeHtml(slotQty(row, 3))}</td>
        <td>${escapeHtml(fmt(row.totalCM, 0))}</td>
        <td>${escapeHtml(fmt(row.targetedCM, 0))}</td>
        <td>${escapeHtml(row.wiresInHand)}</td>
        <td>${escapeHtml(pctLabel)}</td>
        <td>${escapeHtml(fmt(row.cmDifference, 0))}</td>
        <td>${escapeHtml(row.noOfWires)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title || "CM Best Match")}</title>
  <style>
    @page { size: landscape; margin: 10mm; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1c120c; margin: 0; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { font-size: 11px; color: #6b5c50; margin-bottom: 12px; }
    .vars { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    .vars td { padding: 6px 8px; border: 1px solid #e8e0d8; vertical-align: top; width: 33%; }
    .label { display: block; font-size: 10px; color: #6b5c50; font-weight: 600; }
    .value { font-size: 13px; font-weight: 700; }
    table.results { width: 100%; border-collapse: collapse; font-size: 11px; }
    table.results th { background: #8a5a2e; color: #fff; text-align: left; padding: 7px 6px; }
    table.results td { padding: 6px; border-bottom: 1px solid #e8e0d8; }
    .catalog { font-size: 11px; color: #3d3229; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title || "CM Best Match")}</h1>
  <p class="meta">IQWireCalculator · Generated ${escapeHtml(generated)}</p>
  <table class="vars">
    <tr>
      <td><span class="label">Original wires in hand</span><span class="value">${escapeHtml(ctx.originalWiredInHand || "—")}</span></td>
      <td><span class="label">Original wire size</span><span class="value">${escapeHtml(ctx.originalWireSize || "—")}</span></td>
      <td><span class="label">Original CM</span><span class="value">${escapeHtml(ctx.originalCMDisplay || "—")}</span></td>
    </tr>
    <tr>
      <td><span class="label">Targeted CM</span><span class="value">${escapeHtml(ctx.targetedCM || "—")}</span></td>
      <td><span class="label">Min wires</span><span class="value">${escapeHtml(ctx.minWires || "—")}</span></td>
      <td><span class="label">Max wires</span><span class="value">${escapeHtml(ctx.maxWires || "—")}</span></td>
    </tr>
  </table>
  ${
    ctx.selectedCatalogSummary
      ? `<p class="catalog"><span class="label">Catalog sizes used in search</span>${escapeHtml(ctx.selectedCatalogSummary)}</p>`
      : ""
  }
  <table class="results">
    <thead>
      <tr>
        <th>Wire Size</th><th># Wires</th>
        <th>Wire Size 2</th><th># Wires 2</th>
        <th>Wire Size 3</th><th># Wires 3</th>
        <th>Total CM</th><th>Targeted CM</th>
        <th>Wires In Hand</th><th>% Difference</th>
        <th>CM Difference</th><th>No of Wires</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;
}

function sharePayload({ title, results, resultContext }) {
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("No results to share.");
  }
  return {
    html: buildCmResultsHtml({ title, results, resultContext }),
    subject: `IQWireCalculator — ${title || "CM Best Match"}`,
  };
}

export async function printCmResults({ title, results, resultContext }) {
  const { html } = sharePayload({ title, results, resultContext });
  await Print.printAsync({
    html,
    orientation: Print.Orientation.landscape,
  });
}

export async function emailCmResults({ title, results, resultContext }) {
  const { html, subject } = sharePayload({ title, results, resultContext });
  const { uri } = await Print.printToFileAsync({ html });
  const canMail = await MailComposer.isAvailableAsync();
  if (canMail) {
    await MailComposer.composeAsync({
      subject,
      body: `${title || "CM Best Match"} results from IQWireCalculator are attached as a PDF.`,
      attachments: [uri],
    });
    return;
  }
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: subject,
    });
    return;
  }
  Alert.alert(
    "Email unavailable",
    Platform.OS === "ios"
      ? "Set up Mail on this device, or use Print and share from there."
      : "No email or share app is available on this device."
  );
}
