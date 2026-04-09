// Live data — published Google Sheets CSV
// To update: File → Share → Publish to web → CSV → copy new link here

export const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR4OsioclVFsUwc8McWKVXK0ky2RQwXA9zJwPuKqVBT1cNpofBcc4RjB0wzbD7U8TJv7l8Sz7NDhw3c/pub?gid=513305687&single=true&output=csv";

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  return text.split(/\r?\n/).map(line => {
    const cells = []; let cur = "", inQ = false;
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
  if (!v || v === "-" || v === "" || v === "N/A" || v === "#") return 0;
  const n = parseFloat(String(v).replace(/[$,\s%()]/g, ""));
  return isNaN(n) ? 0 : n;
}

const cleanLabel = s => String(s || "").trim().toLowerCase();

// ── Parser ────────────────────────────────────────────────────────────────────
export function parseCSVData(text) {
  const rows = parseCSV(text);
  if (!rows.length) throw new Error("CSV is empty");

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Find header row (has 6+ month names)
  let headerIdx = rows.findIndex(r => {
    const j = r.join(" ").toLowerCase();
    return MONTHS.filter(m => j.includes(m.toLowerCase())).length >= 6;
  });
  if (headerIdx === -1) headerIdx = 0;
  const header = rows[headerIdx];

  // Map month → actual/budget column indices
  const actualCols = {}, budgetCols = {};
  header.forEach((cell, ci) => {
    const c = cleanLabel(cell);
    MONTHS.forEach(m => {
      const ml = m.toLowerCase();
      if (!c.includes(ml)) return;
      if (c.includes("budget") || c.includes("plan") || c.includes("target")) {
        if (budgetCols[m] === undefined) budgetCols[m] = ci;
      } else if (c.includes("actual")) {
        if (actualCols[m] === undefined) actualCols[m] = ci;
      } else {
        if (actualCols[m] === undefined) actualCols[m] = ci;
      }
    });
  });

  // Fallback: assign in order of appearance if still missing
  MONTHS.forEach(m => {
    if (actualCols[m] === undefined) {
      const ci = header.findIndex(c => cleanLabel(c).includes(m.toLowerCase()));
      if (ci >= 0) actualCols[m] = ci;
    }
  });

  const getA = (row, m) => actualCols[m] !== undefined ? toNum(row[actualCols[m]]) : 0;
  const getB = (row, m) => budgetCols[m] !== undefined ? toNum(row[budgetCols[m]]) : 0;

  const dataRows = rows.slice(headerIdx + 1);

  const findRow = (...kwGroups) => dataRows.find(r => {
    const label = cleanLabel((r[0] || "") + " " + (r[1] || ""));
    return kwGroups.some(kws => kws.every(kw => label.includes(kw)));
  });

  // Key summary rows
  const openingRow = findRow(["opening balance"], ["opening bal"], ["opening"]);
  const cashInRow  = findRow(["cash in"], ["total revenue"], ["total in"]);
  const cashOutRow = findRow(["cash out"], ["total expense"], ["total out"]);
  const netRow     = findRow(["net balance"], ["closing balance"], ["net"]);

  const openingA = MONTHS.map(m => openingRow ? getA(openingRow, m) : 0);
  const cashInA  = MONTHS.map(m => cashInRow  ? getA(cashInRow, m)  : 0);
  const cashOutA = MONTHS.map(m => cashOutRow ? getA(cashOutRow, m) : 0);
  const netA     = MONTHS.map(m => netRow     ? getA(netRow, m)     : 0);
  const cashInB  = MONTHS.map(m => cashInRow  ? getB(cashInRow, m)  : 0);
  const cashOutB = MONTHS.map(m => cashOutRow ? getB(cashOutRow, m) : 0);

  // Derive net if not in CSV
  const net = netA.some(v => v !== 0) ? netA
    : MONTHS.map((_, i) => (openingA[i] || 0) + (cashInA[i] || 0) - (cashOutA[i] || 0));

  // Derive opening if not in CSV
  const opening = openingA.some(v => v !== 0) ? openingA
    : MONTHS.map((_, i) => i === 0 ? net[0] - cashInA[0] + cashOutA[0] : net[i - 1]);

  const monthly = MONTHS.map((m, i) => ({
    month: m,
    opening:  opening[i]  || 0,
    cashIn:   cashInA[i]  || 0,
    cashOut:  cashOutA[i] || 0,
    net:      net[i]      || 0,
  }));

  const summary = {
    openingBalance: monthly[0].opening,
    closingBalance: monthly[11].net,
    totalRevenue:   cashInA.reduce((s, v) => s + v, 0),
    totalCashOut:   cashOutA.reduce((s, v) => s + v, 0),
  };

  // Expense categories
  const EXPENSE_KEYS = [
    { labels:["cogs","cost of goods"],         key:"cogs",          name:"COGS",                    color:"#9FE1CB" },
    { labels:["salari"],                        key:"salaries",      name:"Salaries",                color:"#378ADD" },
    { labels:["travel"],                        key:"travel",        name:"Travel",                  color:"#85B7EB" },
    { labels:["subscription"],                  key:"subscriptions", name:"Subscriptions",           color:"#F0997B" },
    { labels:["advertising","adv & market"],    key:"advertising",   name:"Advertising & Marketing", color:"#D85A30" },
    { labels:["bank fee","bank charges"],        key:"bankFees",      name:"Bank Fees",               color:"#888780" },
    { labels:["client","gift"],                 key:"clientGifts",   name:"Client Gifts",            color:"#D4537E" },
    { labels:["csr"],                           key:"csr",           name:"CSR",                     color:"#FAC775" },
    { labels:["hiring"],                        key:"hiringExp",     name:"Hiring Expenses",         color:"#AFA9EC" },
    { labels:["incentive"],                     key:"incentives",    name:"Incentives",              color:"#EF9F27" },
    { labels:["insurance"],                     key:"insurance",     name:"Insurance",               color:"#7F77DD" },
    { labels:["services"],                      key:"services",      name:"Services",                color:"#EF9F27" },
    { labels:["tax paid","tax expense"],        key:"taxPaid",       name:"Tax Paid",                color:"#BA7517" },
    { labels:["telephone","phone"],             key:"telephone",     name:"Telephone",               color:"#9FE1CB" },
    { labels:["research","r&d","rnd"],          key:"rnd",           name:"R&D",                     color:"#AFA9EC" },
    { labels:["project cost","dct"],            key:"projectCosts",  name:"Project Costs (DCT)",     color:"#0F6E56" },
    { labels:["vendor cost"],                   key:"vendorCost",    name:"Vendor Cost",             color:"#1D9E75" },
    { labels:["management fee","mgmt fee"],     key:"mgmtFees",      name:"Management Fees",         color:"#5DCAA5" },
    { labels:["consultant expense"],            key:"consultantExp", name:"Consultant Expense",      color:"#888780" },
    { labels:["business launch"],               key:"bizLaunch",     name:"Business Launch",         color:"#FAC775" },
    { labels:["marketing execution"],           key:"mktExec",       name:"Marketing Execution",     color:"#F0997B" },
    { labels:["office supply","office supplies"],key:"officeSup",    name:"Office Supplies",         color:"#D3D1C7" },
    { labels:["training","education"],          key:"training",      name:"Training & Education",    color:"#85B7EB" },
  ];

  const SUMMARY_SKIP = ["cash in","cash out","total","net","opening","closing","revenue","expense","balance","misc"];

  const monthlyExpenses = MONTHS.map((m) => {
    const obj = {};
    EXPENSE_KEYS.forEach(({ labels, key }) => {
      const row = dataRows.find(r => {
        const label = cleanLabel((r[0] || "") + " " + (r[1] || ""));
        return labels.some(l => label.includes(l)) && !SUMMARY_SKIP.some(s => label.startsWith(s));
      });
      obj[key] = row ? getA(row, m) : 0;
    });
    return obj;
  });

  // Project rows: non-summary rows with non-zero values
  const projectCashIn = dataRows
    .filter(r => {
      const label = cleanLabel(r[0] || "");
      if (!label || label.length < 2) return false;
      if (SUMMARY_SKIP.some(s => label.startsWith(s))) return false;
      if (EXPENSE_KEYS.some(e => e.labels.some(l => label.includes(l)))) return false;
      return MONTHS.some(m => getA(r, m) > 0);
    })
    .map(r => ({
      project: String(r[0]).trim(),
      status: String(r[1] || "In Hand").trim(),
      contractStatus: String(r[2] || "").trim(),
      total: toNum(r[3]),
      monthly: MONTHS.map(m => getA(r, m)),
    }))
    .slice(0, 20);

  const planIn  = cashInB.some(v => v > 0)  ? cashInB  : null;
  const planOut = cashOutB.some(v => v > 0) ? cashOutB : null;

  return { monthly, summary, monthlyExpenses, expenseCategories: EXPENSE_KEYS, projectCashIn, planIn, planOut, fetchedAt: new Date() };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
export async function fetchCSVData() {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} — check the Google Sheet is published correctly`);
  const text = await res.text();
  if (!text || text.length < 50) throw new Error("Empty response from Google Sheets");
  if (text.trim().startsWith("<!")) throw new Error("Got HTML instead of CSV — re-publish the sheet as CSV");
  return parseCSVData(text);
}
