// Vercel Serverless Function — Zoho Books API Proxy
// Org: Stradigi Management Consultancies (stradigibd@stradigico.com)
// Org ID: 765677175

const ORG_ID = process.env.ZOHO_ORG_ID || "765677175";
const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH = process.env.ZOHO_REFRESH_TOKEN;
const BASE = "https://www.zohoapis.com/books/v3";

// In-memory token cache
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: REFRESH,
      client_id: CLIENT_ID,
      client_secret: SECRET,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token refresh failed: " + JSON.stringify(data));
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function zoho(endpoint, params = {}) {
  const token = await getAccessToken();
  const qs = new URLSearchParams({ organization_id: ORG_ID, ...params });
  const res = await fetch(`${BASE}/${endpoint}?${qs}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Zoho ${endpoint} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthIndex(dateStr) {
  if (!dateStr) return -1;
  const d = new Date(dateStr);
  return isNaN(d) ? -1 : d.getMonth();
}

function toFloat(v) {
  return parseFloat(v) || 0;
}

// Fetch all pages of a Zoho endpoint
async function fetchAll(endpoint, key, params = {}) {
  let page = 1, results = [], hasMore = true;
  while (hasMore) {
    const data = await zoho(endpoint, { ...params, per_page: 200, page });
    const items = data[key] || [];
    results = results.concat(items);
    hasMore = data.page_context?.has_more_page === true && items.length === 200;
    page++;
    if (page > 10) break; // safety cap
  }
  return results;
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleCashflow(year) {
  const y = year || "2026";
  const dateStart = `${y}-01-01`;
  const dateEnd   = `${y}-12-31`;

  const [invoices, bills, expenses] = await Promise.all([
    fetchAll("invoices", "invoices", { date_start: dateStart, date_end: dateEnd, per_page: 200 }),
    fetchAll("bills",    "bills",    { date_start: dateStart, date_end: dateEnd, per_page: 200 }),
    fetchAll("expenses", "expenses", { from_date: dateStart, to_date: dateEnd, per_page: 200 }),
  ]);

  const cashIn  = Array(12).fill(0);
  const cashOut = Array(12).fill(0);

  // Revenue: paid + partially_paid invoices
  invoices.forEach(inv => {
    if (!["paid","partially_paid","sent","overdue","viewed"].includes(inv.status)) return;
    const m = monthIndex(inv.date);
    if (m >= 0) cashIn[m] += toFloat(inv.total);
  });

  // Costs: approved bills + paid bills
  bills.forEach(bill => {
    if (!["paid","open","overdue","partially_paid"].includes(bill.status)) return;
    const m = monthIndex(bill.date);
    if (m >= 0) cashOut[m] += toFloat(bill.total);
  });

  // Also add expenses
  expenses.forEach(exp => {
    if (exp.status === "rejected") return;
    const m = monthIndex(exp.date);
    if (m >= 0) cashOut[m] += toFloat(exp.total);
  });

  // Build expense breakdown by category
  const expByCategory = {};
  expenses.forEach(exp => {
    const cat = exp.account_name || exp.category_name || "Other";
    if (!expByCategory[cat]) expByCategory[cat] = Array(12).fill(0);
    const m = monthIndex(exp.date);
    if (m >= 0) expByCategory[cat][m] += toFloat(exp.total);
  });

  bills.forEach(bill => {
    (bill.line_items || []).forEach(li => {
      const cat = li.account_name || "Other";
      if (!expByCategory[cat]) expByCategory[cat] = Array(12).fill(0);
      const m = monthIndex(bill.date);
      if (m >= 0) expByCategory[cat][m] += toFloat(li.item_total);
    });
  });

  // Running balance
  let balance = 0;
  const monthly = MONTHS.map((month, i) => {
    const opening = balance;
    const net = opening + cashIn[i] - cashOut[i];
    balance = net;
    return { month, opening: Math.round(opening), cashIn: Math.round(cashIn[i]), cashOut: Math.round(cashOut[i]), net: Math.round(net) };
  });

  return {
    monthly,
    summary: {
      openingBalance: monthly[0].opening,
      closingBalance: monthly[11].net,
      totalRevenue:   Math.round(cashIn.reduce((s, v) => s + v, 0)),
      totalCashOut:   Math.round(cashOut.reduce((s, v) => s + v, 0)),
    },
    expByCategory,
  };
}

async function handleARaging() {
  const invoices = await fetchAll("invoices", "invoices", { status: "overdue" });
  // Also get sent/viewed that are past due
  const sent = await fetchAll("invoices", "invoices", { status: "sent" });
  const all = [...invoices, ...sent].filter(inv => {
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date();
  });

  return all.map(inv => ({
    inv:      inv.invoice_number,
    customer: inv.customer_name,
    date:     inv.date,
    dueDate:  inv.due_date,
    age:      inv.days_elapsed || Math.max(0, Math.floor((Date.now() - new Date(inv.due_date)) / 86400000)),
    balance:  toFloat(inv.balance),
    amount:   toFloat(inv.total),
    currency: inv.currency_code || "AED",
    status:   inv.status,
  })).sort((a, b) => (b.age || 0) - (a.age || 0));
}

async function handleAPaging() {
  const bills = await fetchAll("bills", "bills", { status: "overdue" });
  const open  = await fetchAll("bills", "bills", { status: "open" });
  const all   = [...bills, ...open];

  return all.map(bill => ({
    inv:      bill.bill_number,
    vendor:   bill.vendor_name,
    date:     bill.date,
    dueDate:  bill.due_date,
    age:      bill.days_elapsed || (bill.due_date ? Math.max(0, Math.floor((Date.now() - new Date(bill.due_date)) / 86400000)) : null),
    balance:  toFloat(bill.balance),
    amount:   toFloat(bill.total),
    currency: bill.currency_code || "AED",
    status:   bill.status,
  })).sort((a, b) => (b.age || 0) - (a.age || 0));
}

async function handleProjects() {
  const projects = await fetchAll("projects", "projects", {});
  return projects.map(p => ({
    project:        p.project_name,
    customer:       p.customer_name,
    status:         p.status,
    billedAmount:   toFloat(p.billed_amount),
    unbilledAmount: toFloat(p.unbilled_amount),
    budgetAmount:   toFloat(p.budget_amount),
    budgetType:     p.budget_type,
  }));
}

async function handleBudget(year) {
  // Fetch budgets if available
  try {
    const data = await zoho("budgets", { fiscal_year: year || "2026" });
    return data.budgets || [];
  } catch {
    return [];
  }
}

async function handleBankAccounts() {
  const data = await zoho("bankaccounts", { filter_by: "BankAccount.All" });
  return (data.bankaccounts || []).map(acc => ({
    name:    acc.account_name,
    type:    acc.account_type,
    balance: toFloat(acc.balance),
    currency: acc.currency_code || "AED",
  }));
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Basic auth check — require same dashboard password
  const auth = req.headers["x-dashboard-key"];
  if (auth !== process.env.DASHBOARD_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type, year } = req.query;

  try {
    let result;
    switch (type) {
      case "cashflow":     result = await handleCashflow(year);     break;
      case "ar_aging":     result = await handleARaging();          break;
      case "ap_aging":     result = await handleAPaging();          break;
      case "projects":     result = await handleProjects();         break;
      case "bank":         result = await handleBankAccounts();     break;
      case "budget":       result = await handleBudget(year);       break;
      default:
        return res.status(400).json({ error: `Unknown type: ${type}. Use: cashflow, ar_aging, ap_aging, projects, bank, budget` });
    }
    res.status(200).json({ ok: true, data: result });
  } catch (err) {
    console.error("Zoho proxy error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
