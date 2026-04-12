// Stradigi Management Consultancies — Cash Flow 2026
// Source: Monthly_Cash_Flow_Comparison_6.xlsx — Actual Vs Budget sheet

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const MONTHLY = [
  { month:"Jan", opening:344884.98, cashIn:304715.01, cashOut:387323.15, net:262276.84, budgetIn:380893.76, budgetOut:484153.94 },
  { month:"Feb", opening:262276.84, cashIn:192110.89, cashOut:294750.10, net:159637.63, budgetIn:240138.61, budgetOut:368437.63 },
  { month:"Mar", opening:159637.63, cashIn:237857.35, cashOut:314077.12, net:83417.86,  budgetIn:297321.69, budgetOut:388266.46 },
  { month:"Apr", opening:83417.86,  cashIn:0,         cashOut:0,         net:83417.86,  budgetIn:297321.69, budgetOut:388266.46 },
  { month:"May", opening:83417.86,  cashIn:0,         cashOut:0,         net:83417.86,  budgetIn:297321.69, budgetOut:388266.46 },
  { month:"Jun", opening:83417.86,  cashIn:0,         cashOut:0,         net:83417.86,  budgetIn:297321.69, budgetOut:388266.46 },
  { month:"Jul", opening:83417.86,  cashIn:0,         cashOut:0,         net:83417.86,  budgetIn:297321.69, budgetOut:388266.46 },
  { month:"Aug", opening:83417.86,  cashIn:0,         cashOut:0,         net:83417.86,  budgetIn:297321.69, budgetOut:388266.46 },
  { month:"Sep", opening:83417.86,  cashIn:0,         cashOut:0,         net:83417.86,  budgetIn:297321.69, budgetOut:388266.46 },
  { month:"Oct", opening:83417.86,  cashIn:0,         cashOut:0,         net:83417.86,  budgetIn:297321.69, budgetOut:388266.46 },
  { month:"Nov", opening:83417.86,  cashIn:0,         cashOut:0,         net:83417.86,  budgetIn:297321.69, budgetOut:388266.46 },
  { month:"Dec", opening:83417.86,  cashIn:0,         cashOut:0,         net:83417.86,  budgetIn:297321.69, budgetOut:388266.46 },
];

export const MONTHLY_EXPENSES = [
  // Jan — Actual / Budget
  { cogs:{a:82857.50,b:103571.88}, salaries:{a:55341.00,b:69176.25}, travel:{a:39661.27,b:49576.59},
    subscriptions:{a:15154.54,b:18943.18}, advertising:{a:28626.79,b:35783.49}, bankFees:{a:6466.19,b:8082.74},
    clientGifts:{a:10202.40,b:12753.00}, consultantExp:{a:1000.00,b:1250.00}, csr:{a:54000.00,b:67500.00},
    incentives:{a:3900.00,b:4875.00}, insurance:{a:0,b:0}, mktExec:{a:1934.00,b:2417.50},
    services:{a:5000.00,b:6250.00}, taxPaid:{a:82132.92,b:102666.15}, telephoneBill:{a:1046.54,b:1308.18},
    rnd:{a:0,b:0}, rent:{a:0,b:0}, hiringExp:{a:0,b:0} },
  // Feb
  { cogs:{a:83915.60,b:104894.50}, salaries:{a:93863.77,b:117329.71}, travel:{a:52706.59,b:65883.24},
    subscriptions:{a:7621.70,b:9527.13}, advertising:{a:7488.00,b:9360.00}, bankFees:{a:3386.14,b:4232.68},
    clientGifts:{a:711.43,b:889.29}, consultantExp:{a:0,b:0}, csr:{a:4000.00,b:5000.00},
    incentives:{a:0,b:0}, insurance:{a:8523.81,b:10654.76}, mktExec:{a:0,b:0},
    services:{a:21507.50,b:26884.38}, taxPaid:{a:0,b:0}, telephoneBill:{a:0,b:0},
    rnd:{a:10059.00,b:12573.75}, rent:{a:0,b:0}, hiringExp:{a:0,b:0} },
  // Mar
  { cogs:{a:83386.55,b:104233.19}, salaries:{a:74602.39,b:93252.99}, travel:{a:46183.93,b:57729.91},
    subscriptions:{a:11388.12,b:14235.15}, advertising:{a:18057.40,b:22571.75}, bankFees:{a:0,b:0},
    clientGifts:{a:5456.92,b:6821.15}, consultantExp:{a:500.00,b:625.00}, csr:{a:0,b:0},
    incentives:{a:1300.00,b:1625.00}, insurance:{a:4261.91,b:5327.39}, mktExec:{a:0,b:0},
    services:{a:54619.05,b:68273.81}, taxPaid:{a:0,b:0}, telephoneBill:{a:1341.90,b:1677.38},
    rnd:{a:3688.00,b:4610.00}, rent:{a:3463.95,b:0}, hiringExp:{a:5827.00,b:7283.75} },
  // Apr-Dec — budget only, actuals TBD
  ...Array(9).fill(null).map(() => ({
    cogs:{a:0,b:104233.19}, salaries:{a:0,b:93252.99}, travel:{a:0,b:57729.91},
    subscriptions:{a:0,b:14235.15}, advertising:{a:0,b:22571.75}, bankFees:{a:0,b:0},
    clientGifts:{a:0,b:6821.15}, consultantExp:{a:0,b:625.00}, csr:{a:0,b:0},
    incentives:{a:0,b:1625.00}, insurance:{a:0,b:5327.39}, mktExec:{a:0,b:0},
    services:{a:0,b:68273.81}, taxPaid:{a:0,b:0}, telephoneBill:{a:0,b:1677.38},
    rnd:{a:0,b:4610.00}, rent:{a:0,b:0}, hiringExp:{a:0,b:7283.75}
  }))
];

export const EXPENSE_CATEGORIES = [
  { name:"COGS",                    key:"cogs",          color:"#9FE1CB" },
  { name:"Salaries",                key:"salaries",      color:"#378ADD" },
  { name:"Travel",                  key:"travel",        color:"#85B7EB" },
  { name:"Subscriptions",           key:"subscriptions", color:"#F0997B" },
  { name:"Advertising & Marketing", key:"advertising",   color:"#D85A30" },
  { name:"Bank Fees",               key:"bankFees",      color:"#888780" },
  { name:"Client Gifts",            key:"clientGifts",   color:"#D4537E" },
  { name:"Consultant Expense",      key:"consultantExp", color:"#7F77DD" },
  { name:"CSR",                     key:"csr",           color:"#FAC775" },
  { name:"Incentives",              key:"incentives",    color:"#EF9F27" },
  { name:"Insurance",               key:"insurance",     color:"#AFA9EC" },
  { name:"Marketing Execution",     key:"mktExec",       color:"#F4C0D1" },
  { name:"Services",                key:"services",      color:"#5DCAA5" },
  { name:"Tax Paid",                key:"taxPaid",       color:"#BA7517" },
  { name:"Telephone",               key:"telephoneBill", color:"#B5D4F4" },
  { name:"R&D",                     key:"rnd",           color:"#534AB7" },
  { name:"Rent",                    key:"rent",          color:"#D3D1C7" },
  { name:"Hiring Expenses",         key:"hiringExp",     color:"#ED93B1" },
];

// Project Cash In — from Cash In sheet (2026 columns only)
export const PROJECT_CASH_IN = [
  { project:"ADNOC",              status:"In Hand", contractStatus:"Waiting LoA",       total:2610000, monthly:[100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000] },
  { project:"AECOM AlHafar",      status:"In Hand", contractStatus:"LoA",               total:2600000, monthly:[0,0,0,0,1000000,0,0,600000,0,0,0,0] },
  { project:"AECOM Green Woods",  status:"In Hand", contractStatus:"Contract Executed", total:1120000, monthly:[70496,140994,93996,140994,93996,70497,46998,70497,46998,0,0,0] },
  { project:"AECOM AlHafar OS",   status:"In Hand", contractStatus:"Contract Executed", total:2600000, monthly:[0,0,1000000,0,0,1000000,0,0,600000,0,0,0] },
  { project:"AECOM AlAmrah OS",   status:"In Hand", contractStatus:"Contract Executed", total:2400000, monthly:[0,0,800000,0,0,800000,0,0,600000,0,0,0] },
  { project:"DCT Phase 1 - CIE",  status:"In Hand", contractStatus:"Contract Executed", total:740640,  monthly:[60720,60720,60720,60720,60720,60720,60720,60720,60720,60720,60720,0] },
  { project:"DCT Phase Two",      status:"In Hand", contractStatus:"Waiting LoA",       total:530000,  monthly:[175000,80000,0,0,0,0,0,0,0,0,0,0] },
  { project:"ENEC Royal Advance", status:"In Hand", contractStatus:"Contract Executed", total:230000,  monthly:[0,100000,74000,0,0,0,0,0,0,0,0,0] },
  { project:"Grand Hotel",        status:"In Hand", contractStatus:"LoA",               total:2331000, monthly:[100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000] },
  { project:"Green Oasis DEWA",   status:"In Hand", contractStatus:"—",                 total:2465000, monthly:[100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000,100000] },
];

// ── AR Aging ──────────────────────────────────────────────────────────────────
export const AR_AGING = [
  { inv:"INV-SD-000037", customer:"Takween AlRajhi",                     date:"2024-11-19", dueDate:"2024-12-04", age:757, balance:40000.00,   amount:40000.00,   currency:"AED" },
  { inv:"INV-SD-000051", customer:"Takween AlRajhi",                     date:"2025-03-13", dueDate:"2025-03-28", age:643, balance:917.92,     amount:31875.00,   currency:"AED" },
  { inv:"INV-SD-000062", customer:"Urbacon Saudi Company SPC",           date:"2025-07-07", dueDate:"2025-07-22", age:527, balance:12150.00,   amount:40250.00,   currency:"AED" },
  { inv:"INV-SD-000081", customer:"AECOM Middle East Limited",           date:"2025-10-02", dueDate:"2025-11-01", age:425, balance:140994.00,  amount:140994.00,  currency:"AED" },
  { inv:"INV-SD-000082", customer:"AECOM Middle East Limited",           date:"2025-10-02", dueDate:"2025-11-01", age:425, balance:35249.00,   amount:35249.00,   currency:"AED" },
  { inv:"INV-SD-000088", customer:"Grand Hotel - AlQiddiya",             date:"2025-10-16", dueDate:"2025-10-16", age:441, balance:8773.38,    amount:78636.88,   currency:"SAR" },
  { inv:"INV-SD-000092", customer:"Green Oasis General Contracting",     date:"2025-10-28", dueDate:"2025-10-28", age:429, balance:1175.00,    amount:246750.00,  currency:"AED" },
  { inv:"INV-SD-000095", customer:"Grand Hotel - AlQiddiya",             date:"2025-11-10", dueDate:"2025-11-10", age:416, balance:6757.35,    amount:60566.60,   currency:"SAR" },
  { inv:"INV-SD-000096", customer:"Trojan Construction Group",           date:"2025-11-10", dueDate:"2025-11-10", age:416, balance:90272.00,   amount:90272.00,   currency:"AED" },
  { inv:"INV-SD-000102", customer:"Green Oasis General Contracting",     date:"2025-12-01", dueDate:"2026-01-01", age:364, balance:410.00,     amount:77900.00,   currency:"AED" },
  { inv:"INV-SD-000111", customer:"Green Oasis General Contracting",     date:"2026-01-08", dueDate:"2026-01-08", age:357, balance:601.87,     amount:114356.25,  currency:"AED" },
  { inv:"INV-SD-000112", customer:"STJV – Six Construct / Trojan JV",    date:"2026-01-22", dueDate:"2026-02-21", age:313, balance:25924.00,   amount:25924.00,   currency:"AED" },
  { inv:"INV-SD-000114", customer:"Green Oasis General Contracting",     date:"2026-02-02", dueDate:"2026-02-02", age:332, balance:104500.00,  amount:104500.00,  currency:"AED" },
  { inv:"INV-SD-000115", customer:"STJV – Six Construct / Trojan JV",    date:"2026-02-02", dueDate:"2026-03-04", age:302, balance:25924.00,   amount:25924.00,   currency:"AED" },
  { inv:"INV-SD-000119", customer:"Grand Hotel - AlQiddiya",             date:"2026-03-01", dueDate:"2026-03-01", age:305, balance:384.94,     amount:40072.36,   currency:"SAR" },
  { inv:"INV-SD-000121", customer:"STJV – Six Construct / Trojan JV",    date:"2026-03-02", dueDate:"2026-04-01", age:274, balance:25924.00,   amount:25924.00,   currency:"AED" },
  { inv:"INV-SD-000122", customer:"Trojan Cylingas JV Abu Dhabi",        date:"2026-03-08", dueDate:"2026-04-07", age:268, balance:17325.00,   amount:17325.00,   currency:"AED" },
  { inv:"INV-SD-000130", customer:"KEO International Consultants",       date:"2026-03-26", dueDate:"2026-03-26", age:280, balance:11568.38,   amount:11568.38,   currency:"USD" },
  { inv:"INV-SD-000131", customer:"Grand Hotel - AlQiddiya",             date:"2026-03-29", dueDate:"2026-03-29", age:277, balance:40057.51,   amount:40057.51,   currency:"SAR" },
  { inv:"INV-SD-000132", customer:"Trojan Cylingas JV Abu Dhabi",        date:"2026-03-30", dueDate:"2026-04-29", age:246, balance:75523.69,   amount:75523.69,   currency:"AED" },
  { inv:"INV-SD-000133", customer:"STJV – Six Construct / Trojan JV",    date:"2026-03-30", dueDate:"2026-04-29", age:246, balance:25924.00,   amount:25924.00,   currency:"AED" },
];

// ── AP Aging ──────────────────────────────────────────────────────────────────
export const AP_AGING = [
  { inv:"Vendor OB",  vendor:"Ziad Ahmed",                          date:"2021-11-25", dueDate:"2021-11-25", age:null,  balance:3672.60,   amount:3672.60,   currency:"AED", status:"opening" },
  { inv:"Vendor OB",  vendor:"Right Intellectual Property L.L.C-FZ",date:"2021-11-25", dueDate:"2021-11-25", age:null,  balance:8850.00,   amount:8850.00,   currency:"AED", status:"opening" },
  { inv:"003",        vendor:"WiiGroup",                            date:"2024-12-20", dueDate:"2025-01-19", age:346,   balance:18846.43,  amount:69471.43,  currency:"EUR", status:"overdue" },
  { inv:"004",        vendor:"WiiGroup",                            date:"2025-03-26", dueDate:"2025-04-25", age:250,   balance:10183.68,  amount:99850.68,  currency:"EUR", status:"overdue" },
  { inv:"202609",     vendor:"Mantle Consult FZC",                  date:"2025-07-13", dueDate:"2025-08-12", age:141,   balance:26786.92,  amount:26786.92,  currency:"AED", status:"overdue" },
  { inv:"002",        vendor:"Hesham Gaafar",                       date:"2025-11-05", dueDate:"2025-11-20", age:41,    balance:5100.00,   amount:5100.00,   currency:"AED", status:"overdue" },
  { inv:"202508",     vendor:"Mantle Consult FZC",                  date:"2025-11-09", dueDate:"2025-12-09", age:22,    balance:5000.00,   amount:5000.00,   currency:"AED", status:"overdue" },
];
