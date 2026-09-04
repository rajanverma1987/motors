"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "@/components/ui/button";
import { useFormatMoneyAbbreviated } from "@/contexts/user-settings-context";
import { listMonthKeys } from "@/lib/simple-hub-overview-dates";

const PERIOD_PRESETS = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
  { id: "ytd", label: "YTD" },
];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142 45% 38%)",
  "hsl(32 80% 48%)",
  "hsl(210 50% 45%)",
  "hsl(0 55% 48%)",
  "hsl(280 35% 45%)",
  "hsl(180 40% 38%)",
  "hsl(var(--secondary))",
];

const PAYMENT_COLORS = {
  Unpaid: "hsl(0 55% 48%)",
  "Partial Paid": "hsl(32 80% 48%)",
  Paid: "hsl(142 45% 38%)",
  paid: "hsl(142 45% 38%)",
  unpaid: "hsl(0 55% 48%)",
  invoice_fully_paid: "hsl(142 45% 38%)",
  invoice_not_fully_paid: "hsl(32 80% 48%)",
};

function ymdUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeForPreset(presetId) {
  const now = new Date();
  const to = ymdUTC(now);
  if (presetId === "30d") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
    return { from: ymdUTC(from), to };
  }
  if (presetId === "90d") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 89));
    return { from: ymdUTC(from), to };
  }
  if (presetId === "ytd") {
    return { from: `${now.getUTCFullYear()}-01-01`, to };
  }
  const keys = listMonthKeys("", "");
  return { from: `${keys[0]}-01`, to };
}

function formatMonthLabel(month) {
  const s = String(month || "");
  if (!/^\d{4}-\d{2}$/.test(s)) return s;
  const d = new Date(`${s}-01T12:00:00Z`);
  return d.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function KpiCard({ label, value, loading }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</p>
      {loading ? (
        <div
          className="mt-2 h-7 w-24 max-w-full animate-pulse rounded-sm bg-muted"
          aria-hidden
        />
      ) : (
        <p className="mt-1 text-xl font-bold tabular-nums text-title sm:text-2xl">{value}</p>
      )}
    </div>
  );
}

function ChartCard({ title, children, empty, loading }) {
  return (
    <div className="flex min-h-[360px] flex-col rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-title">{title}</h3>
      {loading ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span
            className="inline-block h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
            aria-hidden
          />
          <p className="text-sm text-secondary">Loading…</p>
        </div>
      ) : empty ? (
        <div className="flex flex-1 items-center justify-center text-sm text-secondary">
          No data in this period
        </div>
      ) : (
        <div className="min-h-0 flex-1">{children}</div>
      )}
    </div>
  );
}

function MoneyTooltip({ active, payload, label, formatMoney }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-title">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="tabular-nums text-secondary">
          {p.name}: {formatMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

const CHART_LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 700,
  fill: "hsl(var(--title))",
};

function formatChartLabel(value, formatMoney) {
  const n = Number(value) || 0;
  if (n <= 0) return "";
  return formatMoney(n);
}

/** Value label for vertical bars / area / line (above the point). */
function MoneyValueLabel({
  x,
  y,
  value,
  width,
  formatMoney,
  dx = 0,
  dy = -8,
  bg = false,
  bgFill = "hsl(var(--primary))",
}) {
  const text = formatChartLabel(value, formatMoney);
  if (!text) return null;
  const cx = width != null ? x + width / 2 : x;
  const tx = cx + dx;
  const ty = y + dy;
  if (!bg) {
    return (
      <text
        x={tx}
        y={ty}
        textAnchor="middle"
        dominantBaseline="auto"
        style={CHART_LABEL_STYLE}
      >
        {text}
      </text>
    );
  }
  const fontSize = 11;
  const padX = 5;
  const padY = 3;
  const boxW = Math.max(text.length * 6.8 + padX * 2, 28);
  const boxH = fontSize + padY * 2;
  return (
    <g>
      <rect
        x={tx - boxW / 2}
        y={ty - boxH + 1}
        width={boxW}
        height={boxH}
        fill={bgFill}
        rx={0}
        ry={0}
      />
      <text
        x={tx}
        y={ty - padY + 1}
        textAnchor="middle"
        dominantBaseline="auto"
        fontSize={fontSize}
        fontWeight={700}
        fill="#fff"
      >
        {text}
      </text>
    </g>
  );
}

/** Value label for horizontal (layout="vertical") bars — to the right of the bar. */
function MoneyBarEndLabel({ x, y, value, width, height, formatMoney }) {
  const text = formatChartLabel(value, formatMoney);
  if (!text) return null;
  return (
    <text
      x={x + (width || 0) + 6}
      y={y + (height || 0) / 2}
      textAnchor="start"
      dominantBaseline="central"
      style={CHART_LABEL_STYLE}
    >
      {text}
    </text>
  );
}

const PIE_RADIAN = Math.PI / 180;
const PIE_LABEL_MIN_PCT = 0.04;

function pieLabelGeometry({ cx, cy, midAngle, outerRadius }) {
  const sin = Math.sin(-PIE_RADIAN * midAngle);
  const cos = Math.cos(-PIE_RADIAN * midAngle);
  const sx = cx + (outerRadius + 2) * cos;
  const sy = cy + (outerRadius + 2) * sin;
  const mx = cx + (outerRadius + 12) * cos;
  const my = cy + (outerRadius + 12) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 10;
  const ey = my;
  return { sx, sy, mx, my, ex, ey, cos };
}

function DonutLabelLine(props) {
  if ((props.percent || 0) < PIE_LABEL_MIN_PCT) return null;
  const { sx, sy, mx, my, ex, ey } = pieLabelGeometry(props);
  return (
    <path
      d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
      stroke="hsl(var(--secondary))"
      strokeWidth={1}
      fill="none"
    />
  );
}

function DonutLabel(props) {
  const name = props.name ?? props.payload?.name ?? props.payload?.status ?? props.payload?.label;
  if ((props.percent || 0) < PIE_LABEL_MIN_PCT || !name) return null;
  const { ex, ey, cos } = pieLabelGeometry(props);
  const x = ex + (cos >= 0 ? 4 : -4);
  const anchor = cos >= 0 ? "start" : "end";
  const raw =
    props.value ??
    props.payload?.[props.dataKey] ??
    props.payload?.amount ??
    props.payload?.count;
  const formatValue = props.formatLabelValue;
  const amountText =
    typeof formatValue === "function"
      ? formatValue(raw)
      : raw != null && Number.isFinite(Number(raw))
        ? String(raw)
        : "";

  return (
    <text x={x} y={ey} textAnchor={anchor} fill="hsl(var(--title))">
      <tspan x={x} dy="-0.45em" fontSize={12}>
        {name}
      </tspan>
      {amountText ? (
        <tspan
          x={x}
          dy="1.35em"
          fill="hsl(var(--title))"
          fontSize={13}
          fontWeight={700}
        >
          {amountText}
        </tspan>
      ) : null}
    </text>
  );
}

function LabeledDonut({
  data,
  dataKey,
  nameKey,
  cellFill,
  tooltipFormatter,
  formatLabelValue,
}) {
  const renderLabel = (labelProps) => (
    <DonutLabel {...labelProps} dataKey={dataKey} formatLabelValue={formatLabelValue} />
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart margin={{ top: 24, right: 80, bottom: 24, left: 80 }}>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={100}
          paddingAngle={2}
          label={renderLabel}
          labelLine={DonutLabelLine}
          isAnimationActive={false}
        >
          {data.map((entry, i) => (
            <Cell key={String(entry[nameKey] ?? i)} fill={cellFill(entry, i)} />
          ))}
        </Pie>
        <Tooltip formatter={tooltipFormatter} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function collapseStatuses(rows, max = 7) {
  if (!Array.isArray(rows) || rows.length <= max) return rows || [];
  const sorted = [...rows].sort((a, b) => (b.count || 0) - (a.count || 0));
  const head = sorted.slice(0, max - 1);
  const rest = sorted.slice(max - 1);
  const other = rest.reduce(
    (acc, r) => {
      acc.count += Number(r.count) || 0;
      acc.amount += Number(r.amount) || 0;
      return acc;
    },
    { status: "Other", count: 0, amount: 0 }
  );
  return [...head, other];
}

/**
 * Hub Dashboard — KPIs and charts for revenue, jobs, invoices, POs, commissions.
 */
export default function DashboardOverviewPanel() {
  const formatMoney = useFormatMoneyAbbreviated();
  const [period, setPeriod] = useState("12m");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const range = useMemo(() => rangeForPreset(period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to });
      const res = await fetch(`/api/dashboard/simple-hub-overview?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load overview");
      setData(json);
    } catch (e) {
      setData(null);
      setError(e.message || "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = data?.kpis || {};
  const revenueSeries = useMemo(
    () =>
      (data?.revenueByMonth || []).map((r) => ({
        ...r,
        label: formatMonthLabel(r.month),
      })),
    [data?.revenueByMonth]
  );
  const cashSeries = useMemo(
    () =>
      (data?.cashByMonth || []).map((r) => ({
        ...r,
        label: formatMonthLabel(r.month),
      })),
    [data?.cashByMonth]
  );
  const jobsStatus = useMemo(() => collapseStatuses(data?.jobsByStatus || []), [data?.jobsByStatus]);
  const invoicePay = data?.invoicesByPayment || [];
  const poPay = data?.posByPayment || [];
  const commissionStatus = data?.commissionsByStatus || [];
  const unpaidCommByInvoice = data?.unpaidCommissionsByInvoiceStatus || [];
  const arAging = data?.arAging || [];
  const apAging = data?.apAging || [];

  const hasRevenue = revenueSeries.some((r) => r.amount > 0);
  const hasCash = cashSeries.some((r) => r.amount > 0);
  const hasJobs = jobsStatus.some((r) => r.count > 0);
  const hasInv = invoicePay.some((r) => r.count > 0);
  const hasPo = poPay.some((r) => r.count > 0);
  const hasComm = commissionStatus.some((r) => r.count > 0 || r.amount > 0);
  const hasUnpaidCommByInvoice = unpaidCommByInvoice.some((r) => r.count > 0 || r.amount > 0);
  const hasAr = arAging.some((r) => r.amount > 0);
  const hasAp = apAging.some((r) => r.amount > 0);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-title sm:text-2xl">Dashboard</h1>
          <p className="mt-1 text-sm text-secondary">
            Revenue, jobs, invoices, purchase orders, and commissions at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={period === p.id ? "primary" : "outline"}
              disabled={loading}
              onClick={() => {
                if (p.id === period) {
                  void load();
                  return;
                }
                setLoading(true);
                setPeriod(p.id);
              }}
            >
              {p.label}
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Revenue" value={formatMoney(kpis.revenue || 0)} loading={loading} />
        <KpiCard label="Cash received" value={formatMoney(kpis.cashReceived || 0)} loading={loading} />
        <KpiCard label="Amount receivable" value={formatMoney(kpis.amountReceivable || 0)} loading={loading} />
        <KpiCard label="Open jobs" value={String(kpis.openJobsCount || 0)} loading={loading} />
        <KpiCard label="Unpaid POs" value={formatMoney(kpis.unpaidPoAmount || 0)} loading={loading} />
        <KpiCard
          label="Unpaid commissions"
          value={formatMoney(kpis.unpaidCommissionAmount || 0)}
          loading={loading}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue trend" loading={loading} empty={!loading && !hasRevenue}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueSeries} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={64} tickFormatter={(v) => formatMoney(v)} />
              <Tooltip content={<MoneyTooltip formatMoney={formatMoney} />} />
              <Area
                type="linear"
                dataKey="amount"
                name="Revenue"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.2)"
                strokeWidth={2}
              >
                <LabelList
                  dataKey="amount"
                  content={(props) => (
                    <MoneyValueLabel
                      {...props}
                      formatMoney={formatMoney}
                      bg
                      bgFill="hsl(var(--primary))"
                    />
                  )}
                />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cash received" loading={loading} empty={!loading && !hasCash}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cashSeries} margin={{ top: 24, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={64} tickFormatter={(v) => formatMoney(v)} />
              <Tooltip content={<MoneyTooltip formatMoney={formatMoney} />} />
              <Bar dataKey="amount" name="Cash" fill="hsl(142 45% 38%)">
                <LabelList
                  dataKey="amount"
                  content={(props) => <MoneyValueLabel {...props} formatMoney={formatMoney} />}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="AR aging (unpaid)" loading={loading} empty={!loading && !hasAr}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={arAging} layout="vertical" margin={{ left: 16, right: 56, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatMoney(v)} />
              <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Bar dataKey="amount" name="Unpaid" fill="hsl(var(--primary))">
                <LabelList
                  dataKey="amount"
                  content={(props) => <MoneyBarEndLabel {...props} formatMoney={formatMoney} />}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="AP aging (unpaid)" loading={loading} empty={!loading && !hasAp}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={apAging} layout="vertical" margin={{ left: 16, right: 56, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatMoney(v)} />
              <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Bar dataKey="amount" name="Unpaid" fill="hsl(32 80% 48%)">
                <LabelList
                  dataKey="amount"
                  content={(props) => <MoneyBarEndLabel {...props} formatMoney={formatMoney} />}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Jobs by status" loading={loading} empty={!loading && !hasJobs}>
          <LabeledDonut
            data={jobsStatus}
            dataKey="count"
            nameKey="status"
            cellFill={(_, i) => CHART_COLORS[i % CHART_COLORS.length]}
            formatLabelValue={(v) => String(Number(v) || 0)}
          />
        </ChartCard>

        <ChartCard title="Invoices by payment" loading={loading} empty={!loading && !hasInv}>
          <LabeledDonut
            data={invoicePay}
            dataKey="amount"
            nameKey="status"
            cellFill={(entry) => PAYMENT_COLORS[entry.status] || CHART_COLORS[0]}
            tooltipFormatter={(v) => formatMoney(v)}
            formatLabelValue={(v) => formatMoney(v)}
          />
        </ChartCard>

        <ChartCard title="POs by payment" loading={loading} empty={!loading && !hasPo}>
          <LabeledDonut
            data={poPay}
            dataKey="amount"
            nameKey="status"
            cellFill={(entry) => PAYMENT_COLORS[entry.status] || CHART_COLORS[0]}
            tooltipFormatter={(v) => formatMoney(v)}
            formatLabelValue={(v) => formatMoney(v)}
          />
        </ChartCard>
      </div>

      <div className="mb-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Total Commission Paid Vs Unpaid" loading={loading} empty={!loading && !hasComm}>
          <LabeledDonut
            data={commissionStatus}
            dataKey="amount"
            nameKey="label"
            cellFill={(entry) => PAYMENT_COLORS[entry.status] || CHART_COLORS[0]}
            tooltipFormatter={(v) => formatMoney(v)}
            formatLabelValue={(v) => formatMoney(v)}
          />
        </ChartCard>

        <ChartCard
          title="Commission still to pay"
          loading={loading}
          empty={!loading && !hasUnpaidCommByInvoice}
        >
          <LabeledDonut
            data={unpaidCommByInvoice}
            dataKey="amount"
            nameKey="label"
            cellFill={(entry) => PAYMENT_COLORS[entry.status] || CHART_COLORS[0]}
            tooltipFormatter={(v) => formatMoney(v)}
            formatLabelValue={(v) => formatMoney(v)}
          />
        </ChartCard>
      </div>
    </div>
  );
}
