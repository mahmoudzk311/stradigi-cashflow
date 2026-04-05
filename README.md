# Stradigi Cash Flow Dashboard

A React web application for Stradigi Management Consultancies — visualizing the 2026 monthly cash flow data with interactive month drill-downs, project pipeline tracking, and expense analysis.

---

## Quick Start

```bash
npm install
npm start
```

App opens at http://localhost:3000

---

## Build for Production

```bash
npm run build
```

Outputs to `build/` — deploy to any static host (Vercel, Netlify, Azure Static Web Apps, SharePoint site).

---

## Connecting to SharePoint (Next Step)

All data lives in `src/data/cashflowData.js`. To pull live data from your SharePoint Excel file:

### Option A — Microsoft Graph API (Recommended)

1. Register an app in Azure Active Directory
2. Grant permissions: `Files.Read`, `Sites.Read.All`
3. Install MSAL:
   ```bash
   npm install @azure/msal-react @azure/msal-browser
   ```
4. Replace the static exports in `cashflowData.js` with Graph API calls:
   ```js
   // GET https://graph.microsoft.com/v1.0/sites/{siteId}/drives/{driveId}/items/{itemId}/workbook/worksheets/{sheet}/usedRange
   ```

### Option B — SharePoint REST API

```js
const res = await fetch(
  `https://{tenant}.sharepoint.com/sites/{site}/_api/web/GetFileByServerRelativePath(decodedurl='/sites/{site}/Shared Documents/Monthly_Cash_Flow_Comparison_4.xlsx')`,
  { headers: { Accept: 'application/json;odata=verbose', Authorization: `Bearer ${token}` } }
);
```

---

## Project Structure

```
src/
  App.jsx              # Main dashboard — 3 views: Overview, Projects, Expenses
  data/
    cashflowData.js    # All data — swap this for API calls when ready
  index.js             # React entry point
public/
  index.html
```

---

## Features

- **Overview** — KPI strip, month selector with drill-down panel, cash flow chart, expense bars, net balance trend
- **Projects** — Pipeline view with per-project monthly bar sparklines, status badges, contract values
- **Expenses** — Annual breakdown with %, monthly cash out trend, full month-by-month table
- **Month drill-down** — Click any month button or chart bar to see: opening/closing balance, cash in by project, cash out by category, auto-generated insights (coverage ratio, net margin, largest inflow/expense)

---

Built with React 18 + Recharts · Stradigi brand: dark teal (#061210) + neon green (#1D9E75)
