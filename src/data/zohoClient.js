// Zoho Books live data client
// Calls /api/zoho (Vercel serverless proxy) — secrets never touch the browser

const API = "/api/zoho";
const KEY = "SMCFin26"; // dashboard password doubles as API key

async function call(type, extra = "") {
  const res = await fetch(`${API}?type=${type}${extra}`, {
    headers: { "x-dashboard-key": KEY },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Unknown API error");
  return json.data;
}

export async function fetchZohoCashflow(year = "2026") {
  return call("cashflow", `&year=${year}`);
}

export async function fetchZohoARaging() {
  return call("ar_aging");
}

export async function fetchZohoAPaging() {
  return call("ap_aging");
}

export async function fetchZohoProjects() {
  return call("projects");
}

export async function fetchZohoBankAccounts() {
  return call("bank");
}
