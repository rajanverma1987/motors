import PDFDocument from "pdfkit";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import {
  AC_DATASHEET_FIELD_COLUMNS,
  AC_DISASSEMBLY_SURGE_FAILURE_KEYS,
  AC_DISASSEMBLY_VISUAL_STATUS_ROWS,
  DC_ARMATURE_FIELD_COLUMNS,
  DC_FIELD_FRAME_FIELD_COLUMNS,
} from "@/lib/simple-datasheet-form";
import { readShopSettingsLogoFile } from "@/lib/shop-email-logo";
import { logoDocumentSizeRem } from "@/lib/logo-document-scale";

const MARGIN = 36;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_HEIGHT - 36;

const AC_COLUMN_TITLES = ["Nameplate", "Winding", "Core & Accessories"];
const DC_FF_COLUMN_TITLES = ["Nameplate", "Connection & Leads", "Core & Poles"];
const DC_ARM_COLUMN_TITLES = ["Nameplate", "Winding", "Commutator & Iron"];

function txt(v, max = 500) {
  if (v == null) return "";
  const s = String(v).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function cellVal(v) {
  const s = txt(v);
  return s || "-";
}

function boolYesVal(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "on" ? "Yes" : "-";
}

function passFailVal(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "pass") return "PASS";
  if (s === "fail") return "FAIL";
  return cellVal(v);
}

function visualStatusVal(v) {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "good") return "Good";
  if (s === "bad") return "Bad";
  return cellVal(v);
}

function extensionOfFile(value) {
  const s = String(value || "").trim().toLowerCase();
  if (!s) return "";
  const clean = s.split(/[?#]/)[0];
  const base = clean.includes("/") ? clean.slice(clean.lastIndexOf("/") + 1) : clean;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return "";
  return base.slice(dot + 1);
}

function isImageAttachment(url, name = "") {
  const ext = extensionOfFile(url) || extensionOfFile(name);
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif", "tiff"].includes(ext);
}

async function resolveLogoBuffer(ownerEmail, logoUrl) {
  const file = readShopSettingsLogoFile(ownerEmail, logoUrl);
  if (!file?.buffer?.length) return null;
  try {
    return await sharp(file.buffer).png().toBuffer();
  } catch {
    return file.buffer;
  }
}

async function resolveImageBuffer(imgSrc) {
  if (!imgSrc || typeof imgSrc !== "string") return null;
  const src = imgSrc.trim();
  if (!src) return null;

  try {
    if (src.startsWith("data:image/")) {
      const commaIdx = src.indexOf(",");
      if (commaIdx !== -1) {
        const raw = Buffer.from(src.slice(commaIdx + 1), "base64");
        return await sharp(raw).png().toBuffer();
      }
    }

    if (src.startsWith("http://") || src.startsWith("https://")) {
      const res = await fetch(src, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const arr = await res.arrayBuffer();
        return await sharp(Buffer.from(arr)).png().toBuffer();
      }
    }

    const cleanPath = src.split(/[?#]/)[0].replace(/^\//, "");
    const localPath = path.join(process.cwd(), "public", cleanPath);
    if (fs.existsSync(localPath)) {
      const fileBuf = fs.readFileSync(localPath);
      return await sharp(fileBuf).png().toBuffer();
    }
  } catch {
    return null;
  }
  return null;
}

function collectPdf(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function finishPdf(doc, done) {
  doc.end();
  return done;
}

function drawSectionBanner(doc, y, title) {
  doc.save();
  doc.rect(MARGIN, y, CONTENT_WIDTH, 14).fill("#1c1917");
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#ffffff").text(title.toUpperCase(), MARGIN + 4, y + 3, {
    width: CONTENT_WIDTH - 8,
  });
  return y + 17;
}

function drawMasthead(doc, y, { title, subtitle, shopName, docNumber, docLabel, logoBuffer, logoScale }) {
  const { heightRem, maxWidthRem } = logoDocumentSizeRem(logoScale);
  const logoH = Math.max(24, Math.min(60, heightRem * 10));
  const logoW = Math.max(70, Math.min(CONTENT_WIDTH * 0.4, maxWidthRem * 10));

  let logoUsedH = 0;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, MARGIN, y, { fit: [logoW, logoH], align: "left", valign: "top" });
      logoUsedH = logoH;
    } catch {
      logoUsedH = 0;
    }
  }

  const rightX = MARGIN + (logoUsedH ? logoW + 10 : 0);
  const rightW = CONTENT_WIDTH - (logoUsedH ? logoW + 10 : 0);

  doc.font("Helvetica-Bold").fontSize(13).fillColor("#1c1917").text(title, rightX, y, {
    width: rightW,
    align: "right",
  });
  if (subtitle) {
    doc.font("Helvetica").fontSize(8).fillColor("#57534e").text(subtitle.toUpperCase(), rightX, doc.y + 1, {
      width: rightW,
      align: "right",
    });
  }
  const numText = `${docLabel || "Job"}: ${docNumber || "-"}`;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#1c1917").text(numText, rightX, doc.y + 1, {
    width: rightW,
    align: "right",
  });

  const bannerEnd = Math.max(y + logoUsedH, doc.y) + 4;
  doc.save();
  doc.strokeColor("#1c1917").lineWidth(1.2).moveTo(MARGIN, bannerEnd).lineTo(MARGIN + CONTENT_WIDTH, bannerEnd).stroke();
  doc.restore();

  let nextY = bannerEnd + 4;
  if (shopName) {
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#44403c").text(shopName, MARGIN, nextY, {
      width: CONTENT_WIDTH,
    });
    nextY = doc.y + 3;
  }
  return nextY;
}

function drawCompactHeader(doc, y, { title, subtitle, docNumber, docLabel, customerName }) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#1c1917").text(title, MARGIN, y);
  if (subtitle) {
    doc.font("Helvetica").fontSize(7.5).fillColor("#57534e").text(subtitle.toUpperCase(), MARGIN, doc.y + 1);
  }
  const rightText = `${docLabel || "Job"}: ${docNumber || "-"} | Customer: ${customerName || "-"}`;
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#1c1917").text(rightText, MARGIN, y, {
    width: CONTENT_WIDTH,
    align: "right",
  });

  const nextY = Math.max(doc.y, y + 18) + 2;
  doc.save();
  doc.strokeColor("#1c1917").lineWidth(1).moveTo(MARGIN, nextY).lineTo(MARGIN + CONTENT_WIDTH, nextY).stroke();
  doc.restore();
  return nextY + 5;
}

function drawInfoGrid(doc, y, rows) {
  const rowH = 14;
  for (const row of rows) {
    const colCount = row.length;
    const colW = CONTENT_WIDTH / colCount;
    for (let i = 0; i < colCount; i += 1) {
      const cell = row[i];
      if (!cell) continue;
      const x = MARGIN + i * colW;
      doc.save();
      doc.strokeColor("#d6d3d1").lineWidth(0.5).rect(x, y, colW, rowH).stroke();
      doc.restore();

      doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#57534e").text(cell.label.toUpperCase(), x + 3, y + 2, {
        width: colW * 0.45,
      });
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#1c1917").text(cellVal(cell.value), x + colW * 0.45, y + 2, {
        width: colW * 0.53,
      });
    }
    y += rowH;
  }
  return y + 4;
}

function drawFieldGrid(doc, y, columns, values, columnTitles) {
  const numCols = columns.length;
  const colW = CONTENT_WIDTH / numCols;
  const headerH = 13;
  const rowH = 12.5;

  for (let c = 0; c < numCols; c += 1) {
    const x = MARGIN + c * colW;
    const title = columnTitles[c] || `Column ${c + 1}`;
    doc.save();
    doc.rect(x, y, colW, headerH).fill("#f5f5f4");
    doc.strokeColor("#1c1917").lineWidth(0.5).rect(x, y, colW, headerH).stroke();
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#1c1917").text(title.toUpperCase(), x + 4, y + 3, {
      width: colW - 8,
      align: "center",
    });
  }
  y += headerH;

  const maxRows = Math.max(...columns.map((c) => c.length));
  for (let r = 0; r < maxRows; r += 1) {
    for (let c = 0; c < numCols; c += 1) {
      const x = MARGIN + c * colW;
      const field = columns[c]?.[r];
      doc.save();
      doc.strokeColor("#e7e5e4").lineWidth(0.5).rect(x, y, colW, rowH).stroke();
      doc.restore();

      if (field) {
        doc.font("Helvetica").fontSize(6.5).fillColor("#57534e").text(field.label, x + 3, y + 2.5, {
          width: colW * 0.48,
        });
        const v = cellVal(values?.[field.key]);
        doc.font("Helvetica-Bold").fontSize(7).fillColor("#1c1917").text(v, x + colW * 0.48, y + 2.5, {
          width: colW * 0.5,
          align: "right",
        });
      }
    }
    y += rowH;
  }
  return y + 5;
}

function drawNotesBox(doc, y, label, notes, minHeight = 24) {
  const text = txt(notes);
  doc.save();
  doc.rect(MARGIN, y, CONTENT_WIDTH, 12).fill("#292524");
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#ffffff").text(label.toUpperCase(), MARGIN + 4, y + 2.5);
  y += 12;

  const boxH = Math.max(minHeight, 22);
  doc.save();
  doc.strokeColor("#1c1917").lineWidth(0.5).rect(MARGIN, y, CONTENT_WIDTH, boxH).stroke();
  doc.restore();

  if (text) {
    doc.font("Helvetica").fontSize(7).fillColor("#1c1917").text(text, MARGIN + 4, y + 3, {
      width: CONTENT_WIDTH - 8,
      height: boxH - 6,
    });
  } else {
    doc.font("Helvetica").fontSize(7).fillColor("#a8a29e").text("None recorded", MARGIN + 4, y + 3);
  }
  return y + boxH + 4;
}

function drawKvTable(doc, y, pairs) {
  const rowH = 13;
  for (let i = 0; i < pairs.length; i += 2) {
    const pairA = pairs[i];
    const pairB = pairs[i + 1] || null;
    const colW = CONTENT_WIDTH / 2;

    [pairA, pairB].forEach((item, idx) => {
      const x = MARGIN + idx * colW;
      doc.save();
      doc.strokeColor("#d6d3d1").lineWidth(0.5).rect(x, y, colW, rowH).stroke();
      doc.restore();

      if (item && item[0]) {
        doc.save();
        doc.rect(x, y, colW * 0.48, rowH).fill("#fafaf9");
        doc.restore();
        doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#44403c").text(item[0], x + 3, y + 2.5, {
          width: colW * 0.46,
        });
        doc.font("Helvetica-Bold").fontSize(7).fillColor("#1c1917").text(cellVal(item[1]), x + colW * 0.5, y + 2.5, {
          width: colW * 0.48,
        });
      }
    });
    y += rowH;
  }
  return y + 4;
}

function drawTestBlock(doc, y, title, result, rows) {
  const blockW = CONTENT_WIDTH;
  const resultText = passFailVal(result);
  const isPass = String(result || "").toLowerCase() === "pass";
  const isFail = String(result || "").toLowerCase() === "fail";

  doc.save();
  doc.rect(MARGIN, y, blockW * 0.75, 13).fill("#1c1917");
  const resultFill = isFail ? "#dc2626" : isPass ? "#16a34a" : "#e7e5e4";
  const resultTextColor = isFail || isPass ? "#ffffff" : "#1c1917";
  doc.rect(MARGIN + blockW * 0.75, y, blockW * 0.25, 13).fill(resultFill);
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(7).fillColor("#ffffff").text(title.toUpperCase(), MARGIN + 4, y + 2.5);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(resultTextColor).text(resultText, MARGIN + blockW * 0.75, y + 2.5, {
    width: blockW * 0.25,
    align: "center",
  });
  y += 13;

  const rowH = 11;
  const colCount = Math.min(3, rows.length || 1);
  const colW = blockW / colCount;

  for (let i = 0; i < rows.length; i += colCount) {
    for (let c = 0; c < colCount; c += 1) {
      const item = rows[i + c];
      const x = MARGIN + c * colW;
      doc.save();
      doc.strokeColor("#e7e5e4").lineWidth(0.5).rect(x, y, colW, rowH).stroke();
      doc.restore();

      if (item) {
        doc.font("Helvetica").fontSize(6.5).fillColor("#57534e").text(item[0], x + 3, y + 2, {
          width: colW * 0.6,
        });
        doc.font("Helvetica-Bold").fontSize(7).fillColor("#1c1917").text(cellVal(item[1]), x + colW * 0.6, y + 2, {
          width: colW * 0.38,
          align: "right",
        });
      }
    }
    y += rowH;
  }
  return y + 4;
}

function drawSignatures(doc, y) {
  y = Math.min(y, BOTTOM_LIMIT - 34);
  const colW = CONTENT_WIDTH / 2;

  [
    ["Technician signature", "Date"],
    ["Reviewed / Approved", "Date"],
  ].forEach(([sigLabel, dateLabel], i) => {
    const x = MARGIN + i * colW;
    doc.save();
    doc.strokeColor("#1c1917").lineWidth(0.5).rect(x, y, colW, 30).stroke();
    doc.restore();

    doc.save();
    doc.strokeColor("#a8a29e").lineWidth(0.5).moveTo(x + 6, y + 17).lineTo(x + colW * 0.65, y + 17).stroke();
    doc.moveTo(x + colW * 0.7, y + 17).lineTo(x + colW - 6, y + 17).stroke();
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(6).fillColor("#78716c").text(sigLabel.toUpperCase(), x + 6, y + 20);
    doc.font("Helvetica-Bold").fontSize(6).fillColor("#78716c").text(dateLabel.toUpperCase(), x + colW * 0.7, y + 20);
  });
  return y + 32;
}

/**
 * Builds professional multi-page PDF buffer for AC or DC Motor Datasheet & Inspection Report.
 * Includes complete test readings, measurements, disassembly, assembly, notes, diagrams, and images.
 */
export async function buildDatasheetPdfBuffer({
  motorType = "AC",
  datasheet = {},
  printContext = {},
  technicianLabel = "",
  jobDiagrams = [],
  attachments = [],
  shopName = "",
  ownerEmail = "",
  settings = {},
}) {
  const isDc = String(motorType || "AC").toUpperCase() === "DC";
  const docNumber = txt(printContext.documentNumber || datasheet?.jobNumber);
  const docLabel = txt(printContext.documentLabel || "Job#");
  const customerName = txt(printContext.customerName || printContext.companyName || datasheet?.company);
  const contactName = txt(printContext.contactName);
  const customerPhone = txt(printContext.customerPhone);
  const customerEmail = txt(printContext.customerEmail);
  const customerPo = txt(printContext.customerPo);
  const technician = txt(technicianLabel || datasheet?.technician);
  const dateVal = txt(datasheet?.date || printContext.date);
  const section = txt(datasheet?.section || "Complete Motor") || "Complete Motor";
  const isComplete = section === "Complete Motor";

  const logoBuffer = await resolveLogoBuffer(ownerEmail, settings?.logoUrl);

  const doc = new PDFDocument({ size: "LETTER", margin: MARGIN });
  const done = collectPdf(doc);

  // Common Header Info Rows
  const infoRows = [
    [
      { label: "Customer", value: customerName },
      { label: "Contact", value: contactName },
      { label: "Phone", value: customerPhone },
      { label: "Email", value: customerEmail },
    ],
    [
      { label: docLabel || "Job#", value: docNumber },
      { label: "Customer PO", value: customerPo },
      { label: "Date", value: dateVal },
      { label: "Technician", value: technician },
    ],
  ];

  if (!isDc) {
    // --- AC MOTOR REPORT ---
    const dataSheetBlock =
      datasheet?.dataSheet && typeof datasheet.dataSheet === "object" ? datasheet.dataSheet : datasheet;
    const disassembly =
      datasheet?.disassembly && typeof datasheet.disassembly === "object" ? datasheet.disassembly : {};
    const assembly =
      datasheet?.assembly && typeof datasheet.assembly === "object" ? datasheet.assembly : {};

    // PAGE 1: AC Motor Datasheet (Nameplate, Winding, Core)
    let y = MARGIN;
    y = drawMasthead(doc, y, {
      title: "AC Motor Datasheet and Inspection Report",
      subtitle: section,
      shopName,
      docNumber,
      docLabel,
      logoBuffer,
      logoScale: settings?.logoDocumentScale,
    });
    y = drawInfoGrid(doc, y, infoRows);
    y = drawFieldGrid(doc, y, AC_DATASHEET_FIELD_COLUMNS, dataSheetBlock, AC_COLUMN_TITLES);
    y = drawNotesBox(doc, y, "Datasheet notes", dataSheetBlock?.notes);
    drawSignatures(doc, y);

    // PAGE 2: AC Disassembly & Inspection (if Complete Motor)
    if (isComplete) {
      doc.addPage();
      y = MARGIN;
      y = drawCompactHeader(doc, y, {
        title: "AC Disassembly and Incoming Inspection",
        subtitle: section,
        docNumber,
        docLabel,
        customerName,
      });

      // Visual inspection
      y = drawSectionBanner(doc, y, "Visual inspection");
      const visualPairs = AC_DISASSEMBLY_VISUAL_STATUS_ROWS.map(({ key, label }) => [
        label,
        visualStatusVal(disassembly[key]),
      ]);
      y = drawKvTable(doc, y, visualPairs);
      if (txt(disassembly.visualStatusNotes)) {
        y = drawNotesBox(doc, y, "Visual status notes", disassembly.visualStatusNotes, 18);
      }

      // Mechanical measurements
      y = drawSectionBanner(doc, y, "Mechanical condition and measurements");
      const markedSides = [
        boolYesVal(disassembly.markedMotorSidesF1) === "Yes" ? "F1" : "",
        boolYesVal(disassembly.markedMotorSidesF2) === "Yes" ? "F2" : "",
        txt(disassembly.markedMotorSidesNotes),
      ]
        .filter(Boolean)
        .join(" | ") || txt(disassembly.markedMotorSides);

      const mechanicalPairs = [
        ["Marked motor sides", markedSides],
        ["Junction box location", disassembly.junctionBoxLocation],
        ["Incoming / broken parts notes", disassembly.brokenPartsNotes],
        ["End bell fit DE", disassembly.endBellFitDE],
        ["End bell fit ODE", disassembly.endBellFitODE],
        ["Shaft measurement DE", disassembly.rotorFitDE],
        ["Shaft measurement ODE", disassembly.rotorFitODE],
        ["Shaft runout", disassembly.shaftRunout],
        ["Bearings count DE / ODE", `${cellVal(disassembly.numberOfBearingsDE)} / ${cellVal(disassembly.numberOfBearingsODE)}`],
        ["Bearing size DE / ODE", `${cellVal(disassembly.bearingSizeDE)} / ${cellVal(disassembly.bearingSizeODE)}`],
        ["Seal size DE / ODE", `${cellVal(disassembly.sealSizeDE)} / ${cellVal(disassembly.sealSizeODE)}`],
        ["Disassembly job status", printContext.jobStatusLabel || disassembly.status],
      ];
      y = drawKvTable(doc, y, mechanicalPairs);

      // Electrical tests
      y = drawSectionBanner(doc, y, "Disassembly electrical tests");
      y = drawTestBlock(doc, y, "Megger test", disassembly.maggerTest, [
        ["Voltage", disassembly.maggerVoltage],
        ["Readings", disassembly.maggerMicroAmps],
      ]);
      y = drawTestBlock(doc, y, "High-pot test", disassembly.highPotTest, [
        ["Voltage", disassembly.highPotVoltage],
        ["Micro amps", disassembly.highPotMicroAmps],
      ]);
      y = drawTestBlock(
        doc,
        y,
        "Surge test",
        disassembly.surgeTest,
        [
          ["Voltage", disassembly.surgeVoltage],
          ...AC_DISASSEMBLY_SURGE_FAILURE_KEYS.map(({ key, label }) => [label, boolYesVal(disassembly[key])]),
        ]
      );

      y = drawNotesBox(doc, y, "Disassembly final notes", disassembly.finalNotes, 20);
      drawSignatures(doc, y);

      // PAGE 3: AC Assembly & Final Testing
      doc.addPage();
      y = MARGIN;
      y = drawCompactHeader(doc, y, {
        title: "AC Assembly and Final Testing",
        subtitle: section,
        docNumber,
        docLabel,
        customerName,
      });

      // Assembly electrical tests
      y = drawSectionBanner(doc, y, "Final electrical tests");
      y = drawTestBlock(doc, y, "Megger test", assembly.maggerTest, [
        ["Voltage", assembly.maggerVoltage],
        ["Readings", assembly.maggerMicroAmps],
      ]);
      y = drawTestBlock(doc, y, "High-pot test", assembly.highPotTest, [
        ["Voltage", assembly.highPotVoltage],
        ["Micro amps", assembly.highPotMicroAmps],
      ]);
      y = drawTestBlock(
        doc,
        y,
        "Surge test",
        assembly.surgeTest,
        [
          ["Voltage", assembly.surgeVoltage],
          ...AC_DISASSEMBLY_SURGE_FAILURE_KEYS.map(({ key, label }) => [label, boolYesVal(assembly[key])]),
        ]
      );

      // Test run
      y = drawSectionBanner(doc, y, "Final test run readings");
      const testRunPairs = [
        ["Run voltage test", assembly.voltageTest],
        ["RPM", assembly.rpm],
        ["Lead 1 amp", assembly.lead1Amp],
        ["Lead 2 amp", assembly.lead2Amp],
        ["Lead 3 amp", assembly.lead3Amp],
        ["Paint & prepared to ship", boolYesVal(assembly.paintAndPreparedToShip)],
        ["Motor incoming paint", assembly.motorIncomingPaint],
        ["Motor outgoing paint", assembly.motorOutgoingPaint],
      ];
      y = drawKvTable(doc, y, testRunPairs);

      y = drawNotesBox(doc, y, "Assembly and final inspection notes", assembly.notes, 28);
      drawSignatures(doc, y);
    }
  } else {
    // --- DC MOTOR REPORT ---
    const fieldFrame =
      datasheet?.fieldFrame && typeof datasheet.fieldFrame === "object" ? datasheet.fieldFrame : datasheet;
    const armature =
      datasheet?.armature && typeof datasheet.armature === "object" ? datasheet.armature : {};

    // PAGE 1: DC Field Frame
    let y = MARGIN;
    y = drawMasthead(doc, y, {
      title: "DC Motor Datasheet and Inspection Report",
      subtitle: isComplete ? "Field Frame" : section,
      shopName,
      docNumber,
      docLabel,
      logoBuffer,
      logoScale: settings?.logoDocumentScale,
    });
    y = drawInfoGrid(doc, y, infoRows);
    y = drawFieldGrid(doc, y, DC_FIELD_FRAME_FIELD_COLUMNS, fieldFrame, DC_FF_COLUMN_TITLES);
    y = drawNotesBox(doc, y, "Field frame notes", fieldFrame?.notes);
    drawSignatures(doc, y);

    // PAGE 2: DC Armature (if Complete Motor or Armature section)
    if (isComplete || section === "Armature") {
      doc.addPage();
      y = MARGIN;
      y = drawCompactHeader(doc, y, {
        title: "DC Motor Datasheet: Armature",
        subtitle: "Armature",
        docNumber,
        docLabel,
        customerName,
      });
      y = drawInfoGrid(doc, y, infoRows);
      y = drawFieldGrid(doc, y, DC_ARMATURE_FIELD_COLUMNS, armature, DC_ARM_COLUMN_TITLES);
      y = drawNotesBox(doc, y, "Armature notes", armature?.notes);
      drawSignatures(doc, y);
    }
  }

  // --- DIAGRAMS AND ATTACHED IMAGES ---
  const validDiagrams = Array.isArray(jobDiagrams) ? jobDiagrams.filter((d) => d?.url || d?.dataUrl) : [];
  for (let i = 0; i < validDiagrams.length; i += 1) {
    const diag = validDiagrams[i];
    const imgBuf = await resolveImageBuffer(diag.dataUrl || diag.url);
    if (!imgBuf) continue;

    doc.addPage();
    let y = MARGIN;
    const diagTitle = txt(diag.name) || `Job Diagram ${i + 1}`;
    y = drawCompactHeader(doc, y, {
      title: diagTitle,
      subtitle: txt(diag.templateName) || `Diagram ${i + 1} of ${validDiagrams.length}`,
      docNumber,
      docLabel,
      customerName,
    });

    try {
      const maxImgW = CONTENT_WIDTH;
      const maxImgH = PAGE_HEIGHT - y - MARGIN - 20;
      doc.image(imgBuf, MARGIN, y + 4, {
        fit: [maxImgW, maxImgH],
        align: "center",
        valign: "center",
      });
    } catch {
      // Continue if specific image fails
    }
  }

  // Attached image files
  const imageAttachments = (Array.isArray(attachments) ? attachments : []).filter((a) => {
    return isImageAttachment(a?.url, a?.name);
  });
  for (let i = 0; i < imageAttachments.length; i += 1) {
    const att = imageAttachments[i];
    const imgBuf = await resolveImageBuffer(att.url);
    if (!imgBuf) continue;

    doc.addPage();
    let y = MARGIN;
    const attTitle = txt(att.name) || `Job Photo ${i + 1}`;
    y = drawCompactHeader(doc, y, {
      title: attTitle,
      subtitle: `Attached Job Photo ${i + 1} of ${imageAttachments.length}`,
      docNumber,
      docLabel,
      customerName,
    });

    try {
      const maxImgW = CONTENT_WIDTH;
      const maxImgH = PAGE_HEIGHT - y - MARGIN - 20;
      doc.image(imgBuf, MARGIN, y + 4, {
        fit: [maxImgW, maxImgH],
        align: "center",
        valign: "center",
      });
    } catch {
      // Continue if specific image fails
    }
  }

  // Non-image document attachments (PDFs, certs, documentation)
  const docAttachments = (Array.isArray(attachments) ? attachments : []).filter((a) => {
    return a?.url && !isImageAttachment(a?.url, a?.name);
  });
  if (docAttachments.length > 0) {
    doc.addPage();
    let y = MARGIN;
    y = drawCompactHeader(doc, y, {
      title: "Attached Job Documents",
      subtitle: `Job Documentation (${docAttachments.length} ${docAttachments.length === 1 ? "file" : "files"})`,
      docNumber,
      docLabel,
      customerName,
    });

    y = drawSectionBanner(doc, y, "Job documentation and attached records");

    const rowH = 14;
    const colW = CONTENT_WIDTH;
    for (let i = 0; i < docAttachments.length; i += 1) {
      const d = docAttachments[i];
      const ext = (extensionOfFile(d.url) || extensionOfFile(d.name) || "document").toUpperCase();
      doc.save();
      doc.strokeColor("#d6d3d1").lineWidth(0.5).rect(MARGIN, y, colW, rowH).stroke();
      doc.rect(MARGIN, y, 20, rowH).fill("#fafaf9");
      doc.rect(MARGIN + 20, y, colW - 90, rowH).fill("#ffffff");
      doc.rect(MARGIN + colW - 70, y, 70, rowH).fill("#f5f5f4");
      doc.restore();

      doc.font("Helvetica-Bold").fontSize(7).fillColor("#57534e").text(String(i + 1), MARGIN + 2, y + 3, {
        width: 16,
        align: "center",
      });
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#1c1917").text(txt(d.name) || `Document ${i + 1}`, MARGIN + 24, y + 3, {
        width: colW - 98,
      });
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#44403c").text(ext, MARGIN + colW - 66, y + 3, {
        width: 62,
        align: "center",
      });

      y += rowH;
      if (y > BOTTOM_LIMIT - 20) {
        doc.addPage();
        y = MARGIN;
        y = drawCompactHeader(doc, y, {
          title: "Attached Job Documents (Continued)",
          subtitle: "Job Documentation",
          docNumber,
          docLabel,
          customerName,
        });
        y = drawSectionBanner(doc, y, "Job documentation and attached records");
      }
    }
  }

  return finishPdf(doc, done);
}
