import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { sanitizeCalculatorContext } from "@/lib/motor-rewind-cost/sanitize-calculator-context";
import { buildCustomerEstimateDisplay, formatUsd } from "@/lib/motor-rewind-cost/customer-estimate-display";
import { buildCalculatorEstimatePdfBuffer } from "@/lib/calculator-estimate-pdf";
import { fetchMotorCalculatorMarketSnapshot } from "@/lib/motor-calculator-market-fetch";
import { calculatorFormRows, visitorTypeLabel } from "@/lib/motor-rewind-cost/form-display";
import { sendCalculatorPriceEnquiryToAdmin, sendCalculatorEstimatePdfToCustomer } from "@/lib/email";

const VISITOR_TYPES = new Set(["end_user", "motor_repair_shop"]);

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "calculator-estimate-pdf", 15);
  if (!allowed) {
    return NextResponse.json({ error: "Too many download requests. Try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const name = clampString(body?.name, LIMITS.name.max);
    const emailRaw = String(body?.email || "").trim().toLowerCase();
    const phone = clampString(body?.phone, 30);
    const visitorType = String(body?.visitorType || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!emailRaw || !isValidEmail(emailRaw)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (!VISITOR_TYPES.has(visitorType)) {
      return NextResponse.json({ error: "Please select End user or Motor repair shop." }, { status: 400 });
    }

    const sanitizedCalc = sanitizeCalculatorContext({
      form: body?.form,
      sourcePage: body?.sourcePage,
    });
    if (!sanitizedCalc) {
      return NextResponse.json({ error: "Invalid calculator configuration." }, { status: 400 });
    }

    const market = await fetchMotorCalculatorMarketSnapshot();
    const estimate = buildCustomerEstimateDisplay(sanitizedCalc.form, market);
    const estimateRange = formatUsdRange(estimate.roughLow, estimate.roughHigh);
    const breakdown = estimate.breakdown || {};

    const safeName = name.replace(/[^\w.-]+/g, "_").slice(0, 40) || "estimate";
    const filename = `IQMotorBase-Motor-Rewind-Estimate-${safeName}.pdf`;

    const pdfBuffer = await buildCalculatorEstimatePdfBuffer({
      visitor: { name, email: emailRaw, phone, visitorType },
      form: sanitizedCalc.form,
      estimate,
      sourcePage: sanitizedCalc.sourcePage,
    });

    const esc = (v) =>
      v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const htmlRows = [
      ...calculatorFormRows(sanitizedCalc.form).map((row) => [row.label, row.value]),
      ["Ballpark range", estimateRange],
      ["Copper / wire (est.)", formatUsd(breakdown.copperCost)],
      ["Insulation / varnish (est.)", formatUsd(breakdown.materialCost)],
      ["Labor band (est.)", formatUsd(breakdown.laborUsd)],
      ["Point estimate (mid model)", formatUsd(breakdown.ballparkTotal)],
    ]
      .map(
        ([a, b]) =>
          `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600;">${esc(a)}</td><td style="padding:6px 10px;border:1px solid #ddd;">${esc(b)}</td></tr>`
      )
      .join("");

    const [adminResult, customerResult] = await Promise.all([
      sendCalculatorPriceEnquiryToAdmin({
        leadName: name,
        leadEmail: emailRaw,
        leadPhone: phone,
        visitorTypeLabel: visitorTypeLabel(visitorType),
        sourcePage: sanitizedCalc.sourcePage,
        estimateRange,
        htmlRows,
        pdfBuffer,
        pdfFilename: filename,
      }),
      sendCalculatorEstimatePdfToCustomer({
        toEmail: emailRaw,
        customerName: name,
        estimateRange,
        pdfBuffer,
        pdfFilename: filename,
      }),
    ]);

    if (!adminResult?.ok || !customerResult?.ok) {
      console.error("Calculator estimate email failed:", {
        admin: adminResult?.error,
        customer: customerResult?.error,
      });
      return NextResponse.json(
        { error: "Could not send your estimate. Please try again or contact us directly." },
        { status: 503 }
      );
    }

    try {
      await connectDB();
      await Lead.create({
        name,
        email: emailRaw.slice(0, LIMITS.email.max),
        phone,
        company: visitorType === "motor_repair_shop" ? "Motor repair shop" : "",
        motorType: visitorTypeLabel(visitorType),
        motorHp: clampString(sanitizedCalc.form.hp, LIMITS.shortText.max),
        voltage: clampString(sanitizedCalc.form.voltage, LIMITS.shortText.max),
        problemDescription: clampString(
          `Downloaded motor rewind calculator estimate PDF (${formatUsdRange(estimate.roughLow, estimate.roughHigh)}).`,
          LIMITS.message.max
        ),
        message: clampString(
          JSON.stringify({
            source: "calculator-estimate-pdf",
            visitorType,
            sourcePage: sanitizedCalc.sourcePage || "",
            roughLow: estimate.roughLow,
            roughHigh: estimate.roughHigh,
          }),
          LIMITS.message.max
        ),
        leadSource: "website",
      });
    } catch (leadErr) {
      console.warn("Calculator estimate PDF lead save failed:", leadErr);
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("calculator-estimate-pdf:", err);
    return NextResponse.json({ error: err.message || "Failed to generate PDF" }, { status: 500 });
  }
}

function formatUsdRange(low, high) {
  const lo = Number(low);
  const hi = Number(high);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return "—";
  const fmt = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  return `${fmt(lo)} – ${fmt(hi)}`;
}
