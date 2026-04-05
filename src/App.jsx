import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ComposedChart, Area
} from "recharts";
import {
  MONTHS, SUMMARY, MONTHLY, EXPENSE_CATEGORIES,
  MONTHLY_EXPENSES, PROJECT_CASH_IN, PROJECT_CASH_OUT
} from "./data/cashflowData";

// ── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  n >= 1e6
    ? "$" + (n / 1e6).toFixed(2) + "M"
    : n >= 1e3
    ? "$" + Math.round(n / 1e3).toLocaleString() + "K"
    : "$" + Math.round(n).toLocaleString();

const fmtFull = (n) => "$" + Math.round(n).toLocaleString();

const STATUS_COLORS = {
  "In Hand": { bg: "#E1F5EE", text: "#0F6E56" },
  Closing:   { bg: "#FAEEDA", text: "#854F0B" },
  default:   { bg: "#F1EFE8", text: "#5F5E5A" },
};

// ── sub-components ───────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color }) => (
  <div style={{
    background: "#0d2b26",
    border: "1px solid #1a3d35",
    borderRadius: 12,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  }}>
    <span style={{ fontSize: 11, color: "#5DCAA5", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
      {label}
    </span>
    <span style={{ fontSize: 26, fontWeight: 700, color: color || "#e8f5f0", fontFamily: "'DM Mono', monospace", letterSpacing: "-0.5px" }}>
      {value}
    </span>
    {sub && <span style={{ fontSize: 12, color: "#4a7a6b" }}>{sub}</span>}
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 style={{ fontSize: 11, fontWeight: 700, color: "#5DCAA5", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, marginTop: 0 }}>
    {children}
  </h2>
);

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.default;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.text }}>
      {status}
    </span>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0a1f1b", border: "1px solid #1D9E75", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
      <p style={{ color: "#5DCAA5", fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{fmtFull(p.value)}</strong>
        </p>
      ))}
    </div>
  );
};

// ── MONTH DETAIL PANEL ───────────────────────────────────────────────────────
const MonthDetail = ({ idx, onClose }) => {
  const m = MONTHLY[idx];
  const exp = MONTHLY_EXPENSES[idx];
  const net = m.cashIn - m.cashOut;
  const coverage = (m.cashIn / m.cashOut).toFixed(2);
  const margin = ((net / m.cashIn) * 100).toFixed(1);

  const projectsIn = PROJECT_CASH_IN
    .map(p => ({ name: p.project, val: p.monthly[idx], status: p.status }))
    .filter(p => p.val > 0)
    .sort((a, b) => b.val - a.val);

  const projectsOut = PROJECT_CASH_OUT
    .map(p => ({ name: p.project, val: p.monthly[idx] }))
    .filter(p => p.val > 0)
    .sort((a, b) => b.val - a.val);

  const expEntries = Object.entries(exp)
    .map(([key, val]) => {
      const cat = EXPENSE_CATEGORIES.find(c => c.key === key);
      return { name: cat?.name || key, val, color: cat?.color || "#888" };
    })
    .filter(e => e.val > 0)
    .sort((a, b) => b.val - a.val);

  const maxIn = Math.max(...projectsIn.map(p => p.val), 1);
  const maxExp = Math.max(...expEntries.map(e => e.val), 1);

  return (
    <div style={{
      background: "#0a1f1b",
      border: "1px solid #1D9E75",
      borderRadius: 16,
      padding: "24px 28px",
      marginBottom: 24,
      animation: "slideIn 0.2s ease"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#e8f5f0", margin: 0, fontFamily: "'DM Mono', monospace" }}>
            {MONTHS[idx]} 2026
          </h2>
          <p style={{ fontSize: 12, color: "#4a7a6b", margin: "4px 0 0" }}>Month {idx + 1} of 12 · Detailed breakdown</p>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "1px solid #1a3d35", color: "#5DCAA5",
          borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600
        }}>
          ✕ Close
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Opening", value: fmtFull(m.opening) },
          { label: "Cash In", value: fmtFull(m.cashIn), color: "#1D9E75" },
          { label: "Cash Out", value: fmtFull(m.cashOut), color: "#D85A30" },
          { label: "Net Flow", value: (net >= 0 ? "+" : "") + fmtFull(net), color: net >= 0 ? "#1D9E75" : "#D85A30" },
          { label: "Closing", value: fmtFull(m.net) },
        ].map(k => (
          <div key={k.label} style={{ background: "#0d2b26", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#5DCAA5", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: k.color || "#e8f5f0", fontFamily: "'DM Mono', monospace" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Coverage ratio", value: `${coverage}×`, note: "cash in vs out" },
          { label: "Net margin", value: `${margin}%`, note: "of revenue retained" },
          { label: "Largest inflow", value: projectsIn[0]?.name || "—", note: fmtFull(projectsIn[0]?.val || 0) },
          { label: "Largest expense", value: expEntries[0]?.name || "—", note: fmtFull(expEntries[0]?.val || 0) },
        ].map(ins => (
          <div key={ins.label} style={{ background: "#071712", border: "1px solid #1a3d35", borderRadius: 10, padding: "10px 16px", flex: "1 1 160px" }}>
            <div style={{ fontSize: 10, color: "#4a7a6b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{ins.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#5DCAA5" }}>{ins.value}</div>
            <div style={{ fontSize: 11, color: "#4a7a6b" }}>{ins.note}</div>
          </div>
        ))}
      </div>

      {/* Breakdown columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Cash In */}
        <div>
          <SectionTitle>Cash in by project</SectionTitle>
          {projectsIn.length === 0 && <p style={{ fontSize: 12, color: "#4a7a6b" }}>No project inflows this month.</p>}
          {projectsIn.map(p => (
            <div key={p.name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#9FE1CB" }}>{p.name}</span>
                <span style={{ color: "#e8f5f0", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{fmtFull(p.val)}</span>
              </div>
              <div style={{ height: 5, background: "#0d2b26", borderRadius: 3 }}>
                <div style={{ height: 5, borderRadius: 3, background: "#1D9E75", width: `${(p.val / maxIn) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Cash Out */}
        <div>
          <SectionTitle>Cash out breakdown</SectionTitle>
          {expEntries.map(e => (
            <div key={e.name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "#9FE1CB" }}>{e.name}</span>
                <span style={{ color: "#e8f5f0", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{fmtFull(e.val)}</span>
              </div>
              <div style={{ height: 5, background: "#0d2b26", borderRadius: 3 }}>
                <div style={{ height: 5, borderRadius: 3, background: e.color, width: `${(e.val / maxExp) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeMonth, setActiveMonth] = useState(null);
  const [view, setView] = useState("overview"); // overview | projects | expenses

  const chartData = useMemo(() =>
    MONTHLY.map((m, i) => ({
      month: MONTHS[i],
      "Cash In": Math.round(m.cashIn),
      "Cash Out": Math.round(m.cashOut),
      "Net Balance": Math.round(m.net),
    })), []);

  const projectTotals = useMemo(() =>
    PROJECT_CASH_IN
      .map(p => ({ ...p, total2026: p.monthly.reduce((s, v) => s + v, 0) }))
      .sort((a, b) => b.total2026 - a.total2026),
    []);

  const expenseData = useMemo(() => {
    const totals = {};
    MONTHLY_EXPENSES.forEach(m => {
      Object.entries(m).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + v; });
    });
    return EXPENSE_CATEGORIES
      .map(c => ({ ...c, total: Math.round(totals[c.key] || 0) }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, []);

  const maxExp = expenseData[0]?.total || 1;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#061210",
      color: "#e8f5f0",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: "#071712",
        borderBottom: "1px solid #1a3d35",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 60,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 32, height: 32, background: "#1D9E75", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#061210"
          }}>S</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e8f5f0", letterSpacing: "-0.2px" }}>Stradigi</div>
            <div style={{ fontSize: 10, color: "#4a7a6b", letterSpacing: "0.05em", textTransform: "uppercase" }}>Cash Flow Dashboard · 2026</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["overview", "projects", "expenses"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? "#1D9E75" : "none",
              border: "1px solid " + (view === v ? "#1D9E75" : "#1a3d35"),
              color: view === v ? "#061210" : "#5DCAA5",
              borderRadius: 7, padding: "5px 14px", cursor: "pointer",
              fontSize: 12, fontWeight: 700, textTransform: "capitalize", transition: "all 0.15s"
            }}>{v}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#4a7a6b" }}>
          Last updated: Apr 2026 · <span style={{ color: "#1D9E75" }}>Live</span>
        </div>
      </header>

      <main style={{ padding: "28px 32px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ── OVERVIEW ── */}
        {view === "overview" && (
          <>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
              <KpiCard label="Opening Balance (Jan)" value={fmtFull(SUMMARY.openingBalance)} />
              <KpiCard label="Closing Balance (Dec)" value={fmtFull(SUMMARY.closingBalance)} color="#1D9E75" />
              <KpiCard label="Total Revenue 2026" value={fmt(SUMMARY.totalRevenue)} color="#5DCAA5"
                sub={`+${(((SUMMARY.closingBalance - SUMMARY.openingBalance) / SUMMARY.openingBalance) * 100).toFixed(0)}% net growth`} />
              <KpiCard label="Total Cash Out 2026" value={fmt(SUMMARY.totalCashOut)} color="#D85A30" />
            </div>

            {/* Month selector */}
            <div style={{ marginBottom: 20 }}>
              <SectionTitle>Select a month to drill down</SectionTitle>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {MONTHS.map((m, i) => {
                  const d = MONTHLY[i];
                  const isPos = d.cashIn >= d.cashOut;
                  return (
                    <button key={m} onClick={() => setActiveMonth(activeMonth === i ? null : i)}
                      style={{
                        background: activeMonth === i ? "#1D9E75" : "#0d2b26",
                        border: "1px solid " + (activeMonth === i ? "#1D9E75" : "#1a3d35"),
                        color: activeMonth === i ? "#061210" : "#9FE1CB",
                        borderRadius: 24, padding: "6px 16px", cursor: "pointer",
                        fontSize: 12, fontWeight: 700, transition: "all 0.15s",
                        position: "relative"
                      }}>
                      {m}
                      <span style={{
                        display: "block", width: 5, height: 5, borderRadius: "50%",
                        background: isPos ? "#1D9E75" : "#D85A30",
                        position: "absolute", top: 4, right: 5
                      }} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail panel */}
            {activeMonth !== null && (
              <MonthDetail idx={activeMonth} onClose={() => setActiveMonth(null)} />
            )}

            {/* Main chart */}
            <div style={{ background: "#0d2b26", border: "1px solid #1a3d35", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
              <SectionTitle>Monthly cash flow — 2026</SectionTitle>
              <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12 }}>
                {[["Cash In","#5DCAA5"], ["Cash Out","#D85A30"], ["Net Balance","#378ADD"]].map(([l,c]) => (
                  <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, color: "#4a7a6b" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} onClick={(e) => e?.activeTooltipIndex != null && setActiveMonth(e.activeTooltipIndex)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#0a1f1b" />
                  <XAxis dataKey="month" tick={{ fill: "#4a7a6b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4a7a6b", fontSize: 11 }} tickFormatter={fmt} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(29,158,117,0.07)" }} />
                  <Bar dataKey="Cash In" fill="#1D9E75" radius={[4,4,0,0]} />
                  <Bar dataKey="Cash Out" fill="#D85A30" radius={[4,4,0,0]} />
                  <Line type="monotone" dataKey="Net Balance" stroke="#378ADD" strokeWidth={2.5} dot={{ fill: "#378ADD", r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 11, color: "#2e5a4e", textAlign: "center", marginTop: 8 }}>Click any bar to drill into that month</p>
            </div>

            {/* Bottom row: expense pie + net trend */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#0d2b26", border: "1px solid #1a3d35", borderRadius: 14, padding: "20px 24px" }}>
                <SectionTitle>Top expenses (full year)</SectionTitle>
                {expenseData.slice(0, 8).map(e => (
                  <div key={e.key} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "#9FE1CB" }}>{e.name}</span>
                      <span style={{ color: "#e8f5f0", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fmt(e.total)}</span>
                    </div>
                    <div style={{ height: 5, background: "#071712", borderRadius: 3 }}>
                      <div style={{ height: 5, borderRadius: 3, background: e.color, width: `${(e.total / maxExp) * 100}%`, transition: "width 0.4s" }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#0d2b26", border: "1px solid #1a3d35", borderRadius: 14, padding: "20px 24px" }}>
                <SectionTitle>Net balance trajectory</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} onClick={(e) => e?.activeTooltipIndex != null && setActiveMonth(e.activeTooltipIndex)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0a1f1b" />
                    <XAxis dataKey="month" tick={{ fill: "#4a7a6b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#4a7a6b", fontSize: 11 }} tickFormatter={fmt} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Net Balance" stroke="#1D9E75" strokeWidth={2.5}
                      dot={{ fill: "#1D9E75", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* ── PROJECTS ── */}
        {view === "projects" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#e8f5f0", margin: "0 0 4px" }}>Project pipeline</h1>
              <p style={{ fontSize: 13, color: "#4a7a6b" }}>{projectTotals.length} active projects · 2026 cash in tracked</p>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {projectTotals.map(p => {
                const maxMonthly = Math.max(...p.monthly);
                return (
                  <div key={p.project} style={{
                    background: "#0d2b26", border: "1px solid #1a3d35", borderRadius: 12,
                    padding: "16px 20px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: "#e8f5f0" }}>{p.project}</span>
                          <StatusBadge status={p.status} />
                        </div>
                        <span style={{ fontSize: 11, color: "#4a7a6b" }}>{p.contractStatus} · Contract: {fmtFull(p.total)}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#1D9E75", fontFamily: "'DM Mono', monospace" }}>
                          {fmtFull(p.total2026)}
                        </div>
                        <div style={{ fontSize: 11, color: "#4a7a6b" }}>2026 inflow</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {p.monthly.map((v, i) => (
                        <div key={i} title={`${MONTHS[i]}: ${fmtFull(v)}`} style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: 32, background: "#071712", borderRadius: 3, display: "flex", alignItems: "flex-end" }}>
                            <div style={{
                              width: "100%", background: v > 0 ? "#1D9E75" : "#0a1f1b",
                              height: v > 0 ? `${(v / maxMonthly) * 100}%` : "100%",
                              borderRadius: 3, minHeight: v > 0 ? 3 : 0, transition: "height 0.3s"
                            }} />
                          </div>
                          <div style={{ fontSize: 9, color: "#2e5a4e", marginTop: 2 }}>{MONTHS[i].slice(0,1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── EXPENSES ── */}
        {view === "expenses" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#e8f5f0", margin: "0 0 4px" }}>Expense analysis</h1>
              <p style={{ fontSize: 13, color: "#4a7a6b" }}>Full year 2026 · All categories</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              {/* Annual totals */}
              <div style={{ background: "#0d2b26", border: "1px solid #1a3d35", borderRadius: 14, padding: "20px 24px" }}>
                <SectionTitle>Annual expense breakdown</SectionTitle>
                {expenseData.map(e => (
                  <div key={e.key} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                        <span style={{ color: "#9FE1CB" }}>{e.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#4a7a6b" }}>
                          {((e.total / SUMMARY.totalCashOut) * 100).toFixed(1)}%
                        </span>
                        <span style={{ color: "#e8f5f0", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                          {fmt(e.total)}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: "#071712", borderRadius: 3 }}>
                      <div style={{ height: 5, borderRadius: 3, background: e.color, width: `${(e.total / maxExp) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Monthly expense chart */}
              <div style={{ background: "#0d2b26", border: "1px solid #1a3d35", borderRadius: 14, padding: "20px 24px" }}>
                <SectionTitle>Monthly cash out trend</SectionTitle>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MONTHLY.map((m, i) => ({ month: MONTHS[i], "Cash Out": Math.round(m.cashOut) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0a1f1b" />
                    <XAxis dataKey="month" tick={{ fill: "#4a7a6b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#4a7a6b", fontSize: 11 }} tickFormatter={fmt} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(216,90,48,0.07)" }} />
                    <Bar dataKey="Cash Out" fill="#D85A30" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Month-by-month expense table */}
            <div style={{ background: "#0d2b26", border: "1px solid #1a3d35", borderRadius: 14, padding: "20px 24px", overflowX: "auto" }}>
              <SectionTitle>Monthly expense detail</SectionTitle>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 10px", color: "#4a7a6b", fontWeight: 600, borderBottom: "1px solid #1a3d35" }}>Category</th>
                    {MONTHS.map(m => (
                      <th key={m} style={{ textAlign: "right", padding: "8px 8px", color: "#4a7a6b", fontWeight: 600, borderBottom: "1px solid #1a3d35" }}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenseData.map(e => (
                    <tr key={e.key} style={{ borderBottom: "1px solid #0a1f1b" }}>
                      <td style={{ padding: "7px 10px", color: "#9FE1CB", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: 1, background: e.color, flexShrink: 0 }} />
                        {e.name}
                      </td>
                      {MONTHLY_EXPENSES.map((m, i) => (
                        <td key={i} style={{ padding: "7px 8px", textAlign: "right", color: m[e.key] > 0 ? "#e8f5f0" : "#1a3d35", fontFamily: "'DM Mono', monospace" }}>
                          {m[e.key] > 0 ? fmt(m[e.key]) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        button { font-family: inherit; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #061210; }
        ::-webkit-scrollbar-thumb { background: #1a3d35; border-radius: 3px; }
      `}</style>
    </div>
  );
}
