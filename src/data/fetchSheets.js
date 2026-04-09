// Live data fetcher — Google Drive CSV
// File: Monthly CashFlow - Budget vs Actual Detailed.csv
// To update data: just save the new version to the same Google Drive file

const FILE_ID = "1qnyBrCzpLiOkgwh4WJfpXeWWgrXoOGjg";

// Google Drive direct download URL
export const CSV_URL = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const cells = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cells.push(cur.trim());
    return cells;
  }).filter(r => r.some(c => c !== ""));
}

function toNum(v) {
  if (!v || v === "-" || v === "" || v === "N/A") return 0;
  const n = parseFloat(String(v).replace(/[$,\s%]/g, ""));
  return isNaN(n) ? 0 : n;
}

function cleanLabel(s) {
  return String(s || "").trim().toLowerCase();
}

// ── Main parser ───────────────────────────────────────────────────────────────
// Handles flexible CSV layouts:
// Looks for rows with: Account/Category | Jan | Feb | ... | Dec (actual + budget)
export function parseCSVData(text) {
  const rows = parseCSV(text);
  if (!rows.length) throw new Error("CSV is empty");

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // ── Find header row ──────────────────────────────────────────────────────
  // Look for the row that has month names
  let headerIdx = -1;
  let headerRow = [];
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const joined = rows[i].join(" ").toLowerCase();
    const monthHits = MONTHS.filter(m => joined.includes(m.toLowerCase())).length;
    if (monthHits >= 6) { headerIdx = i; headerRow = rows[i]; break; }
  }
  if (headerIdx === -1) {
    // fallback: first row
    headerIdx = 0;
    headerRow = rows[0];
  }

  // ── Map month columns ────────────────────────────────────────────────────
  // Expect columns like: Jan Actual, Jan Budget, Feb Actual, Feb Budget ...
  // OR: Jan, Feb, Mar ... (single value per month, then we treat as actual)
  // OR: Actual Jan, Budget Jan ...
  const actualCols = {};
  const budgetCols = {};

  headerRow.forEach((cell, ci) => {
    const c = cleanLabel(cell);
    MONTHS.forEach(m => {
      const ml = m.toLowerCase();
      // "Jan Actual" / "Actual Jan" / "Jan-26 Actual"
      if (c.includes(ml)) {
        if (c.includes("budget") || c.includes("plan") || c.includes("target")) {
          if (!budgetCols[m]) budgetCols[m] = ci;
        } else if (c.includes("actual")) {
          if (!actualCols[m]) actualCols[m] = ci;
        } else {
          // Plain month — treat as actual, look for next col as budget
          if (!actualCols[m]) actualCols[m] = ci;
        }
      }
    });
  });

  // If no "actual" tagged cols found, just use the first occurrence of each month
  MONTHS.forEach(m => {
    if (!actualCols[m]) {
      const ci = headerRow.findIndex(c => cleanLabel(c).includes(m.toLowerCase()));
      if (ci >= 0) actualCols[m] = ci;
    }
  });

  // ── Helper: get actual/budget value for a row ────────────────────────────
  const getActual = (row, m) => actualCols[m] !== undefined ? toNum(row[actualCols[m]]) : 0;
  const getBudget = (row, m) => budgetCols[m] !== undefined ? toNum(row[budgetCols[m]]) : 0;

  // ── Find key rows ────────────────────────────────────────────────────────
  const dataRows = rows.slice(headerIdx + 1);

  const findRow = (keywords) => dataRows.find(r => {
    const label = cleanLabel(r[0] + " " + (r[1] || ""));
    return keywords.every(kw => label.includes(kw));
  });

  const findRows = (keyword) => dataRows.filter(r =>
    cleanLabel(r[0] + " " + (r[1] || "")).includes(keyword) &&
    MONTHS.some(m => actualCols[m] !== undefined && toNum(r[actualCols[m]]) !== 0)
  );

  // Opening Balance
  const openingRow  = findRow(["opening"]) || findRow(["balance","open"]);
  // Cash In / Revenue
  const cashInRow   = findRow(["cash in"])  || findRow(["revenue"]) || findRow(["total","in"]);
  // Cash Out / Total Expenses
  const cashOutRow  = findRow(["cash out"]) || findRow(["total","out"]) || findRow(["total","expense"]);
  // Net / Closing
  const netRow      = findRow(["net"])      || findRow(["closing"]);

  // ── Build monthly arrays ─────────────────────────────────────────────────
  const openingActual = MONTHS.map(m => openingRow ? getActual(openingRow, m) : 0);
  const cashInActual  = MONTHS.map(m => cashInRow  ? getActual(cashInRow, m)  : 0);
  const cashOutActual = MONTHS.map(m => cashOutRow ? getActual(cashOutRow, m) : 0);
  const netActual     = MONTHS.map(m => netRow     ? getActual(netRow, m)     : 0);

  const cashInBudget  = MONTHS.map(m => cashInRow  ? getBudget(cashInRow, m)  : 0);
  const cashOutBudget = MONTHS.map(m => cashOutRow ? getBudget(cashOutRow, m) : 0);

  // Derive net if not found
  const net = netActual.some(v => v !== 0) ? netActual
    : MONTHS.map((_, i) => {
        // running balance
        let bal = openingActual[0] || 0;
        for (let j = 0; j <= i; j++) bal = openingActual[j] || bal + cashInActual[j] - cashOutActual[j];
        return bal;
      });

  // Opening: use row if found, else derive
  const opening = openingActual.some(v => v !== 0) ? openingActual
    : MONTHS.map((_, i) => i === 0 ? (net[0] - cashInActual[0] + cashOutActual[0]) : net[i - 1]);

  const monthly = MONTHS.map((m, i) => ({
    month: m,
    opening:  opening[i]  || 0,
    cashIn:   cashInActual[i]  || 0,
    cashOut:  cashOutActual[i] || 0,
    net:      net[i] || 0,
  }));

  const summary = {
    openingBalance: monthly[0].opening,
    closingBalance: monthly[11].net,
    totalRevenue:   cashInActual.reduce((s, v) => s + v, 0),
    totalCashOut:   cashOutActual.reduce((s, v) => s + v, 0),
  };

  // ── Expense rows ─────────────────────────────────────────────────────────
  const EXPENSE_KEYS = [
    { labels: ["cogs","cost of goods"],           key: "cogs",          name: "COGS",                    color: "#9FE1CB" },
    { labels: ["salaries","salary"],               key: "salaries",      name: "Salaries",                color: "#378ADD" },
    { labels: ["travel"],                          key: "travel",        name: "Travel",                  color: "#85B7EB" },
    { labels: ["subscription"],                    key: "subscriptions", name: "Subscriptions",           color: "#F0997B" },
    { labels: ["advertising","marketing"],         key: "advertising",   name: "Advertising & Marketing", color: "#D85A30" },
    { labels: ["bank fee"],                        key: "bankFees",      name: "Bank Fees",               color: "#888780" },
    { labels: ["client","gift"],                   key: "clientGifts",   name: "Client Gifts",            color: "#D4537E" },
    { labels: ["csr"],                             key: "csr",           name: "CSR",                     color: "#FAC775" },
    { labels: ["hiring"],                          key: "hiringExp",     name: "Hiring Expenses",         color: "#AFA9EC" },
    { labels: ["incentive"],                       key: "incentives",    name: "Incentives",              color: "#EF9F27" },
    { labels: ["insurance"],                       key: "insurance",     name: "Insurance",               color: "#7F77DD" },
    { labels: ["services"],                        key: "services",      name: "Services",                color: "#EF9F27" },
    { labels: ["tax"],                             key: "taxPaid",       name: "Tax Paid",                color: "#BA7517" },
    { labels: ["telephone","phone"],               key: "telephone",     name: "Telephone",               color: "#9FE1CB" },
    { labels: ["research","r&d","rnd"],            key: "rnd",           name: "R&D",                     color: "#AFA9EC" },
    { labels: ["project cost","dct"],              key: "projectCosts",  name: "Project Costs (DCT)",     color: "#0F6E56" },
    { labels: ["vendor"],                          key: "vendorCost",    name: "Vendor Cost",             color: "#1D9E75" },
    { labels: ["management fee","mgmt"],           key: "mgmtFees",      name: "Management Fees",         color: "#5DCAA5" },
    { labels: ["consultant"],                      key: "consultantExp", name: "Consultant Expense",      color: "#888780" },
  ];

  const monthlyExpenses = MONTHS.map((m, mi) => {
    const obj = {};
    EXPENSE_KEYS.forEach(({ labels, key }) => {
      const row = dataRows.find(r => {
        const label = cleanLabel(r[0] + " " + (r[1] || ""));
        return labels.some(l => label.includes(l));
      });
      obj[key] = row ? getActual(row, m) : 0;
    });
    return obj;
  });

  // ── Project Cash In (rows under a "Cash In" section) ────────────────────
  // Find project rows: non-zero actual values in month cols, not summary rows
  const SUMMARY_LABELS = ["cash in","cash out","total","net","opening","closing","revenue","expense","balance"];
  const projectCashIn = dataRows
    .filter(r => {
      const label = cleanLabel(r[0]);
      if (!label || label.length < 2) return false;
      if (SUMMARY_LABELS.some(s => label.startsWith(s))) return false;
      const vals = MONTHS.map(m => getActual(r, m));
      return vals.some(v => v > 0);
    })
    .map(r => ({
      project: String(r[0]).trim(),
      status: String(r[1] || "In Hand").trim(),
      contractStatus: String(r[2] || "").trim(),
      total: toNum(r[3]),
      monthly: MONTHS.map(m => getActual(r, m)),
    }))
    .slice(0, 20); // cap at 20 projects

  // ── Budget/Plan arrays ───────────────────────────────────────────────────
  const planIn  = cashInBudget.some(v => v > 0)  ? cashInBudget  : null;
  const planOut = cashOutBudget.some(v => v > 0) ? cashOutBudget : null;

  return {
    monthly,
    summary,
    monthlyExpenses,
    expenseCategories: EXPENSE_KEYS,
    projectCashIn,
    planIn,   // null if not in CSV — app uses editable defaults
    planOut,
    fetchedAt: new Date(),
  };
}

// ── Fetch + parse ─────────────────────────────────────────────────────────────
export async function fetchCSVData() {
  // Try direct download first, then CORS proxy fallback
  const urls = [
    CSV_URL,
    `https://corsproxy.io/?${encodeURIComponent(CSV_URL)}`,
  ];

  let lastError;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text || text.length < 100) throw new Error("Empty response");
      // Check it's not an HTML login page
      if (text.trim().startsWith("<!")) throw new Error("Got HTML instead of CSV — check file permissions");
      return parseCSVData(text);
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`Could not fetch CSV: ${lastError?.message}`);
}
