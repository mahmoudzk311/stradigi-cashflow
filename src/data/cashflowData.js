// Stradigi Management Consultancies — Cash Flow 2026
// Source: Monthly_Cash_Flow_Comparison_4.xlsx
// To connect to SharePoint later, replace this file's exports with API calls

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const SUMMARY = {
  openingBalance: 344884.98,
  closingBalance: 827884.10,
  totalRevenue: 10134314,
  totalCashOut: 9651315,
};

export const MONTHLY = [
  { month:'Jan', opening:344884.98, cashIn:304715.01, cashOut:387323.15, net:262276.84 },
  { month:'Feb', opening:262276.84, cashIn:192110.89, cashOut:294750.10, net:159637.63 },
  { month:'Mar', opening:159637.63, cashIn:2267996.00, cashOut:918718.88, net:1508914.75 },
  { month:'Apr', opening:1508914.75, cashIn:440994.00, cashOut:939001.18, net:1010907.57 },
  { month:'May', opening:1010907.57, cashIn:1393996.00, cashOut:939001.18, net:1465902.38 },
  { month:'Jun', opening:1465902.38, cashIn:2170497.00, cashOut:939001.18, net:2697398.20 },
  { month:'Jul', opening:2697398.20, cashIn:346998.00, cashOut:939001.18, net:2105395.02 },
  { month:'Aug', opening:2105395.02, cashIn:970497.00, cashOut:939001.18, net:2136890.83 },
  { month:'Sep', opening:2136890.83, cashIn:1546998.00, cashOut:939001.18, net:2744887.65 },
  { month:'Oct', opening:2744887.65, cashIn:300000.00, cashOut:939001.18, net:2105886.47 },
  { month:'Nov', opening:2105886.47, cashIn:300000.00, cashOut:939001.18, net:1466885.28 },
  { month:'Dec', opening:1466885.28, cashIn:300000.00, cashOut:939001.18, net:827884.10 },
];

export const EXPENSE_CATEGORIES = [
  { name:'Project Costs (DCT Ph.1)', key:'projectCosts', color:'#0F6E56' },
  { name:'Vendor Cost', key:'vendorCost', color:'#1D9E75' },
  { name:'Management Fees', key:'mgmtFees', color:'#5DCAA5' },
  { name:'COGS', key:'cogs', color:'#9FE1CB' },
  { name:'Salaries', key:'salaries', color:'#378ADD' },
  { name:'Travel', key:'travel', color:'#85B7EB' },
  { name:'Tax Paid', key:'taxPaid', color:'#BA7517' },
  { name:'Services', key:'services', color:'#EF9F27' },
  { name:'CSR', key:'csr', color:'#FAC775' },
  { name:'Advertising & Marketing', key:'advertising', color:'#D85A30' },
  { name:'Subscriptions', key:'subscriptions', color:'#F0997B' },
  { name:'Insurance', key:'insurance', color:'#7F77DD' },
  { name:'R&D', key:'rnd', color:'#AFA9EC' },
  { name:'Clients Gifts', key:'clientGifts', color:'#D4537E' },
  { name:'Other', key:'other', color:'#888780' },
];

export const MONTHLY_EXPENSES = [
  // Jan
  { projectCosts:0, vendorCost:0, mgmtFees:0, cogs:82857.50, salaries:55341.00, travel:39661.27,
    taxPaid:82132.92, services:5000.00, csr:54000.00, advertising:28626.79, subscriptions:15154.54,
    insurance:0, rnd:0, clientGifts:10202.40, other:14346.73 },
  // Feb
  { projectCosts:0, vendorCost:0, mgmtFees:0, cogs:83915.60, salaries:93863.77, travel:52706.59,
    taxPaid:0, services:21507.50, csr:4000.00, advertising:7488.00, subscriptions:7621.70,
    insurance:8523.81, rnd:10059.00, clientGifts:711.43, other:4352.70 },
  // Mar
  { projectCosts:375000, vendorCost:133825.71, mgmtFees:99280, cogs:83386.55, salaries:74602.39, travel:46183.93,
    taxPaid:0, services:54619.05, csr:0, advertising:18057.40, subscriptions:11388.12,
    insurance:4261.91, rnd:3688.00, clientGifts:5456.92, other:8769.82 },
  // Apr–Dec (averaged from available data)
  ...Array(9).fill(null).map(() => ({
    projectCosts:375000, vendorCost:133825.71, mgmtFees:99280, cogs:83386.55, salaries:74602.39, travel:46183.93,
    taxPaid:27377.64, services:27042.18, csr:19333.33, advertising:18057.40, subscriptions:11388.12,
    insurance:4261.91, rnd:4582.33, clientGifts:5456.92, other:9823.17
  }))
];

// Cash In by project per month (2026 columns only, index 0=Jan)
export const PROJECT_CASH_IN = [
  { project:'ADNOC',             status:'In Hand', contractStatus:'Waiting LoA', total:2610000,
    monthly:[100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000] },
  { project:'AECOM AlHafar',     status:'In Hand', contractStatus:'LoA',          total:2600000,
    monthly:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { project:'AECOM Green Woods', status:'In Hand', contractStatus:'Contract Executed', total:1120000,
    monthly:[70496,140994,93996,140994,93996,70497,46998,70497,46998,0,0,0] },
  { project:'AECOM AlHafar OS',  status:'In Hand', contractStatus:'Contract Executed', total:2600000,
    monthly:[0,0,1000000,0,0,1000000,0,0,600000,0,0,0] },
  { project:'AECOM AlAmrah OS',  status:'In Hand', contractStatus:'Contract Executed', total:2400000,
    monthly:[0,0,800000,0,0,800000,0,0,600000,0,0,0] },
  { project:'DCT Phase 1',       status:'In Hand', contractStatus:'Completed',    total:975000,
    monthly:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { project:'DCT Phase 1 - CIE', status:'In Hand', contractStatus:'Contract Executed', total:740640,
    monthly:[60720,60720,60720,60720,60720,60720,60720,60720,60720,60720,60720,0] },
  { project:'DCT Phase Two',     status:'In Hand', contractStatus:'Waiting LoA',  total:530000,
    monthly:[175000,80000,0,0,0,0,0,0,0,0,0,0] },
  { project:'ENEC Royal Advance',status:'In Hand', contractStatus:'Contract Executed', total:230000,
    monthly:[0,100000,74000,0,0,0,0,0,0,0,0,0] },
  { project:'Grand Hotel',       status:'In Hand', contractStatus:'LoA',          total:2331000,
    monthly:[100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000] },
  { project:'Green Oasis DEWA',  status:'In Hand', contractStatus:'—',            total:2465000,
    monthly:[100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000] },
  { project:'MiSK ILMI',        status:'Closing', contractStatus:'Procurement',  total:270000,
    monthly:[0,0,0,0,0,0,0,0,0,0,0,0] },
];

// Cash Out by project per month (2026 columns only)
export const PROJECT_CASH_OUT = [
  { project:'ADNOC',             monthly:[40000,40000,40000,40000,40000,40000,40000,40000,40000,40000,40000,40000] },
  { project:'AECOM AlHafar',     monthly:[0,0,0,200000,0,0,0,100000,0,0,0,0] },
  { project:'AECOM Green Woods', monthly:[40000,68000,52000,68000,52000,42000,30000,42000,30000,0,0,0] },
  { project:'AECOM AlHafar OS',  monthly:[0,0,400000,0,0,400000,0,0,300000,0,0,0] },
  { project:'AECOM AlAmrah OS',  monthly:[0,0,350000,0,0,350000,0,0,200000,0,0,0] },
  { project:'DCT Phase 1-CIE',   monthly:[24780,24780,24780,24780,24780,24780,24780,24780,24780,24780,24780,0] },
  { project:'Grand Hotel',       monthly:[50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,50000] },
  { project:'Green Oasis DEWA',  monthly:[20000,20000,20000,20000,20000,20000,20000,20000,20000,20000,20000,20000] },
];
