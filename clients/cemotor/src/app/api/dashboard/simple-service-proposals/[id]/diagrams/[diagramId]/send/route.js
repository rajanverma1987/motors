import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { mergeUserSettings } from "@/lib/user-settings";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";
import { resolveOutboundFromPreview, withDashboardOutboundEmailFooter } from "@/lib/customer-facing-email-content";
import { clampString } from "@/lib/validation";
import { parseCcEmailList, isSendToEmail } from "@/lib/send-document-custom-message";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveCustomerMailDelivery } from "@/lib/workspace-smtp";
import { getTransporter } from "@/lib/email-transport";
import { mergeMailAttachments } from "@/lib/simple-send-document-pdf";
import { isValidSimplePortalId } from "@/lib/simple-portal-mongo";
import { normalizeJobDiagrams } from "@/lib/diagram-templates";

const UPLOAD_ROOT = "public/uploads/simple-service-proposals";

function esc(v) {
  return v == null
    ? ""
    : String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function shopCompanyNameFromUser(user) {
  return (user.shopName && String(user.shopName).trim()) || process.env.MOTOR_SHOP_COMPANY_NAME?.trim() || "";
}

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function ownerDirKey(email) {
  return createHash("sha256")
    .update(String(email || "").trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

function sanitizeRecordId(raw) {
  const id = String(raw || "").trim();
  if (isValidSimplePortalId(id)) return id;
  return "";
}

function resolveDiagramFilePath(url, ownerKey, recordId) {
  const raw = String(url || "").trim();
  const prefix = `/uploads/simple-service-proposals/${ownerKey}/${recordId}/diagrams/`;
  if (!raw.startsWith(prefix)) return null;
  const fileName = raw.slice(prefix.length);
  if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return null;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) return null;
  const absDir = path.resolve(process.cwd(), UPLOAD_ROOT, ownerKey, recordId, "diagrams");
  const absFile = path.resolve(absDir, fileName);
  if (!absFile.startsWith(absDir + path.sep) && absFile !== absDir) return null;
  return absFile;
}

function safePngFilename(label) {
  const base = String(label || "diagram")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "diagram"}.png`;
}

/** Preview metadata for emailing a job diagram. */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const toEmail = String(searchParams.get("toEmail") || "").trim();
    const toName = String(searchParams.get("toName") || "").trim();
    const documentLabel = String(searchParams.get("documentLabel") || "").trim() || "Job diagram";

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const uSettings = mergeUserSettings(settingsDoc?.settings);
    const shopCompanyName = shopCompanyNameFromUser(user);

    return NextResponse.json({
      ok: true,
      preview: {
        toEmail,
        toName,
        from: resolveOutboundFromPreview(uSettings, shopCompanyName),
        documentLabel,
        smtp: getWorkspaceSmtpDeliveryNotice(uSettings),
      },
    });
  } catch (err) {
    console.error("Simple diagram send preview error:", err);
    return NextResponse.json({ error: err.message || "Failed to load preview" }, { status: 500 });
  }
}

/** Email a job diagram PNG via shop SMTP. */
export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "simple-sp-diagram-send", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many send requests. Try again later." }, { status: 429 });
  }

  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await getParams(context);
    const recordId = sanitizeRecordId(params?.id);
    const diagramId = String(params?.diagramId || "").trim();
    if (!recordId) {
      return NextResponse.json({ error: "Valid record id required" }, { status: 400 });
    }
    if (!diagramId) {
      return NextResponse.json({ error: "Valid diagram id required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const customMessage = clampString(body?.customMessage, 2000);
    const { ccEmails, error: ccError } = parseCcEmailList(body?.cc);
    if (ccError) {
      return NextResponse.json({ error: ccError }, { status: 400 });
    }

    const toEmail = String(body?.toEmail || "").trim();
    const toName = String(body?.toName || "").trim();
    if (!isSendToEmail(toEmail)) {
      return NextResponse.json({ error: "A valid recipient email is required." }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const ownerKey = ownerDirKey(email);
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const uSettings = mergeUserSettings(settingsDoc?.settings);
    const shopCompanyName = shopCompanyNameFromUser(user);
    const smtpNotice = getWorkspaceSmtpDeliveryNotice(uSettings);

    if (smtpNotice.canSend === false) {
      return NextResponse.json({ error: smtpNotice.message || "Shop SMTP is not configured." }, { status: 400 });
    }

    const mail = resolveCustomerMailDelivery(uSettings, shopCompanyName);
    if (mail.error) {
      return NextResponse.json({ error: mail.error }, { status: 400 });
    }
    const transport = mail.transport || getTransporter();
    const from = mail.from || process.env.EMAIL_FROM || process.env.SMTP_USER;

    const doc = await SimpleServiceProposal.findOne({ _id: recordId, createdByEmail: email }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Service proposal not found" }, { status: 404 });
    }

    const diagrams = normalizeJobDiagrams(doc.jobDiagrams, doc.jobDiagram);
    const diagram = diagrams.find((d) => d.id === diagramId);
    if (!diagram?.url) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    const filePath = resolveDiagramFilePath(diagram.url, ownerKey, recordId);
    if (!filePath || !existsSync(filePath)) {
      return NextResponse.json({ error: "Diagram file is missing on the server." }, { status: 404 });
    }

    let pngBuffer;
    try {
      pngBuffer = readFileSync(filePath);
    } catch {
      return NextResponse.json({ error: "Could not read diagram file." }, { status: 500 });
    }
    if (!pngBuffer?.length) {
      return NextResponse.json({ error: "Diagram file is empty." }, { status: 500 });
    }

    const diagramLabel = String(diagram.name || "Job diagram").trim() || "Job diagram";
    const attachment = {
      filename: safePngFilename(diagramLabel),
      content: pngBuffer,
      contentType: "image/png",
    };

    const noteHtml = customMessage
      ? `<p style="white-space:pre-wrap;margin:12px 0;background-color:#f8fafc;padding:12px;border-left:4px solid #0284c7;border-radius:4px;">${esc(customMessage)}</p>`
      : "";

    const jobNumber = String(doc.jobNumber || doc.documentNumber || "").trim();
    const html = withDashboardOutboundEmailFooter(`
      <p>Hello${toName ? ` ${esc(toName)}` : ""},</p>
      <p>Please find the attached motor diagram${jobNumber ? ` for job <strong>${esc(jobNumber)}</strong>` : ""}: <strong>${esc(diagramLabel)}</strong>.</p>
      ${noteHtml}
      <p>If you have questions, please reply to this email or contact us.</p>
      <p style="margin-top:20px;font-weight:600;">${esc(shopCompanyName || "Our shop")}</p>
    `);

    const subject = jobNumber
      ? `${shopCompanyName || "Shop"}: Diagram ${diagramLabel} (${jobNumber})`
      : `${shopCompanyName || "Shop"}: Diagram ${diagramLabel}`;

    await transport.sendMail({
      from,
      to: toEmail,
      subject,
      html,
      ...(ccEmails.length ? { cc: ccEmails } : {}),
      attachments: mergeMailAttachments(attachment),
    });

    return NextResponse.json({ ok: true, message: "Diagram emailed successfully." });
  } catch (err) {
    console.error("Simple diagram send error:", err);
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
