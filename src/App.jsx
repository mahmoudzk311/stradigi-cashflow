import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ReferenceLine, Cell } from "recharts";
import LOGO from "./data/logo";
import { MONTHS, MONTHLY as STATIC_MONTHLY, MONTHLY_EXPENSES, EXPENSE_CATEGORIES, PROJECT_CASH_IN, AR_AGING as STATIC_AR, AP_AGING as STATIC_AP } from "./data/cashflowData";
import { fetchZohoCashflow, fetchZohoARaging, fetchZohoAPaging, fetchZohoProjects } from "./data/zohoClient";

const PASSWORD = "SMCFin26";

// Use static data as fallback while Zoho loads
const MONTHLY = STATIC_MONTHLY;
const AR_AGING_STATIC = STATIC_AR;
const AP_AGING_STATIC = STATIC_AP;

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt  = n => { const a=Math.abs(n); const s=a>=1e6?"AED "+(a/1e6).toFixed(2)+"M":a>=1e3?"AED "+Math.round(a/1e3).toLocaleString()+"K":"AED "+Math.round(a).toLocaleString(); return n<0?"-"+s:s; };
const fmtF = n => (n<0?"-AED ":"AED ")+Math.abs(Math.round(n)).toLocaleString();
const fmtC = (n,c) => { const s=Math.abs(Math.round(n)).toLocaleString(); return (n<0?"-":"")+c+" "+s; };
const varC = (v,exp=false) => exp?(v>5?"#DC2626":v<-5?"#059669":"#6B7280"):(v<-5?"#DC2626":v>5?"#059669":"#6B7280");
const ragC = (age) => age>360?"#EF4444":age>180?"#F59E0B":age>90?"#FB923C":"#10B981";
const ragL = (age) => age>360?"360+ days":age>180?"181–360 days":age>90?"91–180 days":"1–90 days";
const ST   = { "In Hand":{bg:"#E1F5EE",tc:"#0F6E56"}, Closing:{bg:"#FEF3C7",tc:"#92400E"}, overdue:{bg:"#FEF2F2",tc:"#DC2626"}, opening:{bg:"#F3F4F6",tc:"#6B7280"}, default:{bg:"#F3F4F6",tc:"#6B7280"} };

// ── atoms ─────────────────────────────────────────────────────────────────────
const Kpi = ({label,value,sub,color,small}) => (
  <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"16px 20px",display:"flex",flexDirection:"column",gap:3}}>
    <span style={{fontSize:11,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:600}}>{label}</span>
    <span style={{fontSize:small?18:22,fontWeight:700,color:color||"#0A2B2B",fontFamily:"'DM Mono',monospace",letterSpacing:"-0.3px"}}>{value}</span>
    {sub&&<span style={{fontSize:11,color:"#9CA3AF"}}>{sub}</span>}
  </div>
);
const Sec = ({children,mb=14}) => <h2 style={{fontSize:11,fontWeight:700,color:"#0A2B2B",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:mb,marginTop:0}}>{children}</h2>;
const Badge = ({status}) => { const c=ST[status]||ST.default; return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:c.bg,color:c.tc,whiteSpace:"nowrap"}}>{status||"—"}</span>; };
const AgeBadge = ({age}) => { if(!age) return <span style={{fontSize:10,color:"#9CA3AF"}}>—</span>; const c=ragC(age); const bg=c==="#EF4444"?"#FEF2F2":c==="#F59E0B"?"#FFFBEB":c==="#FB923C"?"#FFF7ED":"#F0FDF4"; const tc=c==="#EF4444"?"#DC2626":c==="#F59E0B"?"#D97706":c==="#FB923C"?"#C2410C":"#059669"; return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:bg,color:tc}}>{age}d</span>; };

const TT = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:10,padding:"10px 14px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}}>
    <p style={{color:"#0A2B2B",fontWeight:700,marginBottom:6,marginTop:0}}>{label}</p>
    {payload.map(p=><p key={p.name} style={{color:p.color||p.stroke,margin:"2px 0"}}>{p.name}: <strong>{fmtF(p.value)}</strong></p>)}
  </div>;
};

const EditCell = ({value,onChange}) => {
  const [ed,setEd]=useState(false), [d,setD]=useState("");
  const start=()=>{setD(String(Math.round(value)));setEd(true);};
  const commit=()=>{const n=parseFloat(d.replace(/[^0-9.]/g,""));if(!isNaN(n))onChange(n);setEd(false);};
  if(ed) return <input autoFocus value={d} onChange={e=>setD(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape")setEd(false);}} style={{width:90,fontSize:12,fontFamily:"'DM Mono',monospace",border:"1.5px solid #0A2B2B",borderRadius:6,padding:"2px 6px",outline:"none",textAlign:"right"}}/>;
  return <span onClick={start} title="Click to edit" style={{cursor:"pointer",borderBottom:"1px dashed #D1D5DB",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#374151"}}>{fmt(value)}</span>;
};

// ── Login ─────────────────────────────────────────────────────────────────────
const Login = ({onUnlock}) => {
  const [val,setVal]=useState(""), [err,setErr]=useState(false), [show,setShow]=useState(false);
  const go=()=>{ if(val===PASSWORD){onUnlock();}else{setErr(true);setVal("");setTimeout(()=>setErr(false),2000);}};
  return (
    <div style={{minHeight:"100vh",background:"#F8FAFB",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:20,padding:"48px 44px",width:380,textAlign:"center",boxShadow:"0 4px 24px rgba(0,0,0,0.07)"}}>
        <img src={LOGO} alt="Stradigi" style={{height:44,margin:"0 auto 24px",display:"block",objectFit:"contain"}}/>
        <p style={{fontSize:13,color:"#9CA3AF",margin:"0 0 32px"}}>Cash Flow Dashboard · 2026</p>
        <div style={{position:"relative",marginBottom:12}}>
          <input type={show?"text":"password"} placeholder="Enter access password" value={val}
            onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}
            style={{width:"100%",padding:"12px 44px 12px 16px",border:`1.5px solid ${err?"#EF4444":"#E5E7EB"}`,borderRadius:10,fontSize:14,outline:"none",fontFamily:"inherit",background:err?"#FEF2F2":"#fff",color:"#111827",boxSizing:"border-box"}}/>
          <button onClick={()=>setShow(!show)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",fontSize:13,padding:0,fontFamily:"inherit"}}>{show?"Hide":"Show"}</button>
        </div>
        {err&&<p style={{color:"#EF4444",fontSize:12,margin:"0 0 12px"}}>Incorrect password. Please try again.</p>}
        <button onClick={go} style={{width:"100%",padding:"12px",background:"#0A2B2B",color:"#00FF85",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Access Dashboard</button>
        <p style={{fontSize:11,color:"#D1D5DB",marginTop:24}}>Stradigi Management Consultancies · Internal use only</p>
      </div>
    </div>
  );
};

// ── Month Detail ──────────────────────────────────────────────────────────────
const MonthDetail = ({idx,onClose,planIn,planOut}) => {
  const m=MONTHLY[idx], exp=MONTHLY_EXPENSES[idx]||{};
  const net=m.cashIn-m.cashOut, varIn=m.cashIn-(planIn[idx]||m.budgetIn);
  const coverage=m.cashOut>0?(m.cashIn/m.cashOut).toFixed(2):"—";
  const margin=m.cashIn>0?((net/m.cashIn)*100).toFixed(1):"0";

  const projIn=PROJECT_CASH_IN.map(p=>({name:p.project,val:p.monthly[idx]||0})).filter(p=>p.val>0).sort((a,b)=>b.val-a.val);
  const expEntries=Object.entries(exp).map(([key,obj])=>{const cat=EXPENSE_CATEGORIES.find(c=>c.key===key);return{name:cat?.name||key,actual:obj.a||0,budget:obj.b||0,color:cat?.color||"#888"};}).filter(e=>e.actual>0||e.budget>0).sort((a,b)=>b.actual-a.actual);
  const maxIn=Math.max(...projIn.map(p=>p.val),1);
  const maxExp=Math.max(...expEntries.map(e=>Math.max(e.actual,e.budget)),1);

  return (
    <div style={{background:"#fff",border:"2px solid #0A2B2B",borderRadius:16,padding:"24px 28px",marginBottom:24,animation:"slideIn 0.2s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:700,color:"#0A2B2B",margin:0,fontFamily:"'DM Mono',monospace"}}>{MONTHS[idx]} 2026</h2>
          <p style={{fontSize:12,color:"#9CA3AF",margin:"4px 0 0"}}>Month {idx+1} · Actual vs Budget</p>
        </div>
        <button onClick={onClose} style={{background:"none",border:"1px solid #E5E7EB",color:"#6B7280",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>✕ Close</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
        {[
          {label:"Opening",     value:fmtF(m.opening)},
          {label:"Budget In",   value:fmt(m.budgetIn),  color:"#6B7280"},
          {label:"Actual In",   value:fmtF(m.cashIn),   color:m.cashIn>0?"#059669":"#9CA3AF"},
          {label:"In Variance", value:(varIn>=0?"+":"")+fmt(varIn), color:varIn>=0?"#059669":"#DC2626"},
          {label:"Actual Out",  value:fmtF(m.cashOut),  color:m.cashOut>m.budgetOut?"#DC2626":"#059669"},
        ].map(k=>(
          <div key={k.label} style={{background:"#F9FAFB",borderRadius:10,padding:"12px 14px",border:"1px solid #F3F4F6"}}>
            <div style={{fontSize:10,color:"#9CA3AF",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>{k.label}</div>
            <div style={{fontSize:13,fontWeight:700,color:k.color||"#0A2B2B",fontFamily:"'DM Mono',monospace"}}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[
          {label:"Coverage",      value:`${coverage}×`,                                           note:"cash in / cash out"},
          {label:"Net margin",    value:`${margin}%`,                                              note:"of revenue retained"},
          {label:"Revenue vs budget", value:m.budgetIn?(varIn>=0?"+":"")+((varIn/m.budgetIn)*100).toFixed(1)+"%":"—", note:fmtF(varIn)+" variance"},
          {label:"Top inflow",    value:projIn[0]?.name||"—",                                     note:fmtF(projIn[0]?.val||0)},
        ].map(ins=>(
          <div key={ins.label} style={{background:"#F0FDF4",border:"1px solid #D1FAE5",borderRadius:10,padding:"10px 16px",flex:"1 1 150px"}}>
            <div style={{fontSize:10,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>{ins.label}</div>
            <div style={{fontSize:13,fontWeight:700,color:"#0A2B2B"}}>{ins.value}</div>
            <div style={{fontSize:11,color:"#9CA3AF"}}>{ins.note}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div>
          <Sec>Cash in by project</Sec>
          {projIn.length===0&&<p style={{fontSize:12,color:"#9CA3AF"}}>No project inflows this month.</p>}
          {projIn.map(p=>(
            <div key={p.name} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:"#374151"}}>{p.name}</span>
                <span style={{color:"#0A2B2B",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{fmtF(p.val)}</span>
              </div>
              <div style={{height:5,background:"#F3F4F6",borderRadius:3}}><div style={{height:5,borderRadius:3,background:"#1D9E75",width:`${(p.val/maxIn)*100}%`}}/></div>
            </div>
          ))}
        </div>
        <div>
          <Sec>Actual vs budget by category</Sec>
          {expEntries.map(e=>(
            <div key={e.name} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                <span style={{color:"#374151"}}>{e.name}</span>
                <div style={{display:"flex",gap:8}}>
                  <span style={{color:"#9CA3AF",fontSize:11}}>Bdgt: {fmt(e.budget)}</span>
                  <span style={{color:"#0A2B2B",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{fmt(e.actual)}</span>
                </div>
              </div>
              <div style={{position:"relative",height:5,background:"#F3F4F6",borderRadius:3}}>
                <div style={{position:"absolute",height:5,borderRadius:3,background:"#D1FAE5",width:`${(e.budget/maxExp)*100}%`}}/>
                <div style={{position:"absolute",height:5,borderRadius:3,background:e.color,width:`${(e.actual/maxExp)*100}%`}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── AR AGING MODULE ───────────────────────────────────────────────────────────
const ARAgingView = ({arData}) => {
  const AR_AGING = arData || AR_AGING_STATIC;
  const [sort,setSort]=useState("age");
  const sorted=[...AR_AGING].sort((a,b)=>sort==="age"?b.age-a.age:b.balance-a.balance);

  const totalBalance=AR_AGING.reduce((s,r)=>s+r.balance,0);
  const buckets={
    "1–90":   AR_AGING.filter(r=>r.age<=90),
    "91–180": AR_AGING.filter(r=>r.age>90&&r.age<=180),
    "181–360":AR_AGING.filter(r=>r.age>180&&r.age<=360),
    "360+":   AR_AGING.filter(r=>r.age>360),
  };
  const bucketTotals=Object.entries(buckets).map(([k,v])=>({bucket:k,total:v.reduce((s,r)=>s+r.balance,0),count:v.length}));

  // Customer summary
  const byCustomer={};
  AR_AGING.forEach(r=>{ if(!byCustomer[r.customer]) byCustomer[r.customer]={balance:0,count:0,maxAge:0}; byCustomer[r.customer].balance+=r.balance; byCustomer[r.customer].count++; byCustomer[r.customer].maxAge=Math.max(byCustomer[r.customer].maxAge,r.age); });
  const customers=Object.entries(byCustomer).map(([k,v])=>({customer:k,...v})).sort((a,b)=>b.balance-a.balance);

  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:"#0A2B2B",margin:"0 0 4px"}}>AR Aging</h1>
          <p style={{fontSize:13,color:"#9CA3AF",margin:0}}>Accounts Receivable · As of 31 Dec 2026 · {AR_AGING.length} invoices</p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#DC2626",fontFamily:"'DM Mono',monospace"}}>{fmtF(totalBalance)}</div>
          <div style={{fontSize:11,color:"#9CA3AF"}}>Total outstanding balance</div>
        </div>
      </div>

      {/* Bucket KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {bucketTotals.map(b=>(
          <div key={b.bucket} style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"16px 20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:11,color:"#6B7280",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>{b.bucket} days</span>
              <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                background:b.bucket==="360+"?"#FEF2F2":b.bucket==="181–360"?"#FFFBEB":b.bucket==="91–180"?"#FFF7ED":"#F0FDF4",
                color:b.bucket==="360+"?"#DC2626":b.bucket==="181–360"?"#D97706":b.bucket==="91–180"?"#C2410C":"#059669"
              }}>{b.count} inv</span>
            </div>
            <div style={{fontSize:19,fontWeight:700,color:"#0A2B2B",fontFamily:"'DM Mono',monospace"}}>{fmt(b.total)}</div>
            <div style={{fontSize:11,color:"#9CA3AF"}}>{totalBalance>0?((b.total/totalBalance)*100).toFixed(1):0}% of total</div>
          </div>
        ))}
      </div>

      {/* Aging bar chart */}
      <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px",marginBottom:20}}>
        <Sec>Outstanding balance by age bucket</Sec>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={bucketTotals} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false}/>
            <XAxis type="number" tick={{fill:"#9CA3AF",fontSize:11}} tickFormatter={fmt} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="bucket" tick={{fill:"#374151",fontSize:12}} axisLine={false} tickLine={false} width={70}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="total" name="Balance" radius={[0,4,4,0]}>
              {bucketTotals.map(b=>(
                <Cell key={b.bucket} fill={b.bucket==="360+"?"#EF4444":b.bucket==="181–360"?"#F59E0B":b.bucket==="91–180"?"#FB923C":"#10B981"}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:16,marginBottom:20}}>
        {/* Customer summary */}
        <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px"}}>
          <Sec>By customer</Sec>
          {customers.map(c=>(
            <div key={c.customer} style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #F3F4F6"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                <span style={{fontSize:12,color:"#374151",fontWeight:500,flex:1,paddingRight:8,lineHeight:1.4}}>{c.customer}</span>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#0A2B2B",fontFamily:"'DM Mono',monospace"}}>{fmtF(c.balance)}</div>
                  <div style={{fontSize:10,color:"#9CA3AF"}}>{c.count} inv · max {c.maxAge}d</div>
                </div>
              </div>
              <div style={{height:4,background:"#F3F4F6",borderRadius:2}}>
                <div style={{height:4,borderRadius:2,background:ragC(c.maxAge),width:`${(c.balance/customers[0].balance)*100}%`}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Invoice detail table */}
        <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px",overflowX:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <Sec mb={0}>Invoice detail</Sec>
            <div style={{display:"flex",gap:4}}>
              {["age","balance"].map(s=>(
                <button key={s} onClick={()=>setSort(s)} style={{background:sort===s?"#0A2B2B":"none",border:"1px solid "+(sort===s?"#0A2B2B":"#E5E7EB"),color:sort===s?"#00FF85":"#6B7280",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>
                  Sort: {s}
                </button>
              ))}
            </div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#F9FAFB"}}>
                {["Invoice","Customer","Date","Due Date","Age","Orig. Amount","Balance","Ccy"].map((h,i)=>(
                  <th key={i} style={{textAlign:i>=4?"right":"left",padding:"8px 8px",color:"#6B7280",fontWeight:600,borderBottom:"1px solid #E5E7EB",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r,i)=>(
                <tr key={r.inv+i} style={{borderBottom:"1px solid #F9FAFB",background:i%2===0?"#fff":"#FAFAFA"}}>
                  <td style={{padding:"8px 8px",color:"#0A2B2B",fontWeight:600,fontFamily:"'DM Mono',monospace",fontSize:11}}>{r.inv}</td>
                  <td style={{padding:"8px 8px",color:"#374151",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.customer}</td>
                  <td style={{padding:"8px 8px",color:"#6B7280",whiteSpace:"nowrap"}}>{r.date}</td>
                  <td style={{padding:"8px 8px",color:"#6B7280",whiteSpace:"nowrap"}}>{r.dueDate}</td>
                  <td style={{padding:"8px 8px",textAlign:"right"}}><AgeBadge age={r.age}/></td>
                  <td style={{padding:"8px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#6B7280"}}>{fmtC(r.amount,r.currency)}</td>
                  <td style={{padding:"8px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#DC2626",fontWeight:600}}>{fmtC(r.balance,r.currency)}</td>
                  <td style={{padding:"8px 8px",textAlign:"right"}}><span style={{fontSize:10,fontWeight:600,color:"#6B7280"}}>{r.currency}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:"#FEF2F2",borderTop:"2px solid #FCA5A5"}}>
                <td colSpan={5} style={{padding:"10px 8px",fontWeight:700,color:"#0A2B2B"}}>Total Outstanding</td>
                <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#6B7280"}}>{fmtF(AR_AGING.reduce((s,r)=>s+r.amount,0))}</td>
                <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#DC2626",fontWeight:700}}>{fmtF(totalBalance)}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
};

// ── AP AGING MODULE ───────────────────────────────────────────────────────────
const APAgingView = ({apData}) => {
  const AP_AGING = apData || AP_AGING_STATIC;
  const [sort,setSort]=useState("age");
  const sorted=[...AP_AGING].sort((a,b)=>{
    if(sort==="age") return (b.age||0)-(a.age||0);
    return b.balance-a.balance;
  });
  const totalBalance=AP_AGING.reduce((s,r)=>s+r.balance,0);
  const overdue=AP_AGING.filter(r=>r.status==="overdue");
  const overdueBalance=overdue.reduce((s,r)=>s+r.balance,0);

  const byVendor={};
  AP_AGING.forEach(r=>{ if(!byVendor[r.vendor]) byVendor[r.vendor]={balance:0,count:0,maxAge:0,currency:r.currency}; byVendor[r.vendor].balance+=r.balance; byVendor[r.vendor].count++; byVendor[r.vendor].maxAge=Math.max(byVendor[r.vendor].maxAge,r.age||0); });
  const vendors=Object.entries(byVendor).map(([k,v])=>({vendor:k,...v})).sort((a,b)=>b.balance-a.balance);

  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:"#0A2B2B",margin:"0 0 4px"}}>AP Aging</h1>
          <p style={{fontSize:13,color:"#9CA3AF",margin:0}}>Accounts Payable · As of 31 Dec 2025 · {AP_AGING.length} bills</p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#DC2626",fontFamily:"'DM Mono',monospace"}}>{fmtF(totalBalance)}</div>
          <div style={{fontSize:11,color:"#9CA3AF"}}>Total outstanding balance</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        <Kpi label="Total Bills" value={AP_AGING.length} sub="across all vendors"/>
        <Kpi label="Overdue Bills" value={overdue.length} color="#DC2626" sub={`${fmtF(overdueBalance)} outstanding`}/>
        <Kpi label="Largest Vendor" value={vendors[0]?.vendor||"—"} small sub={fmtF(vendors[0]?.balance||0)}/>
        <Kpi label="Oldest Bill" value={`${Math.max(...AP_AGING.filter(r=>r.age).map(r=>r.age))} days`} color="#F59E0B" sub="since invoice date"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:16}}>
        {/* Vendor summary */}
        <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px"}}>
          <Sec>By vendor</Sec>
          {vendors.map(v=>(
            <div key={v.vendor} style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #F3F4F6"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                <span style={{fontSize:12,color:"#374151",fontWeight:500,flex:1,paddingRight:8,lineHeight:1.4}}>{v.vendor}</span>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#0A2B2B",fontFamily:"'DM Mono',monospace"}}>{fmtC(v.balance,v.currency)}</div>
                  <div style={{fontSize:10,color:"#9CA3AF"}}>{v.count} bill{v.count>1?"s":""} · {v.maxAge>0?`max ${v.maxAge}d`:"OB"}</div>
                </div>
              </div>
              <div style={{height:4,background:"#F3F4F6",borderRadius:2}}>
                <div style={{height:4,borderRadius:2,background:v.maxAge>0?ragC(v.maxAge):"#D1D5DB",width:`${(v.balance/vendors[0].balance)*100}%`}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Bill detail table */}
        <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px",overflowX:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <Sec mb={0}>Bill detail</Sec>
            <div style={{display:"flex",gap:4}}>
              {["age","balance"].map(s=>(
                <button key={s} onClick={()=>setSort(s)} style={{background:sort===s?"#0A2B2B":"none",border:"1px solid "+(sort===s?"#0A2B2B":"#E5E7EB"),color:sort===s?"#00FF85":"#6B7280",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>
                  Sort: {s}
                </button>
              ))}
            </div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#F9FAFB"}}>
                {["Ref","Vendor","Date","Due","Age","Orig. Amount","Balance","Status"].map((h,i)=>(
                  <th key={i} style={{textAlign:i>=4?"right":"left",padding:"8px 8px",color:"#6B7280",fontWeight:600,borderBottom:"1px solid #E5E7EB",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r,i)=>(
                <tr key={r.inv+i} style={{borderBottom:"1px solid #F9FAFB",background:i%2===0?"#fff":"#FAFAFA"}}>
                  <td style={{padding:"8px 8px",color:"#0A2B2B",fontWeight:600,fontFamily:"'DM Mono',monospace",fontSize:11}}>{r.inv}</td>
                  <td style={{padding:"8px 8px",color:"#374151",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.vendor}</td>
                  <td style={{padding:"8px 8px",color:"#6B7280",whiteSpace:"nowrap"}}>{r.date}</td>
                  <td style={{padding:"8px 8px",color:"#6B7280",whiteSpace:"nowrap"}}>{r.dueDate}</td>
                  <td style={{padding:"8px 8px",textAlign:"right"}}>{r.age?<AgeBadge age={r.age}/>:<span style={{fontSize:10,color:"#9CA3AF"}}>OB</span>}</td>
                  <td style={{padding:"8px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#6B7280"}}>{fmtC(r.amount,r.currency)}</td>
                  <td style={{padding:"8px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#DC2626",fontWeight:600}}>{fmtC(r.balance,r.currency)}</td>
                  <td style={{padding:"8px 8px",textAlign:"right"}}><Badge status={r.status}/></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:"#FEF2F2",borderTop:"2px solid #FCA5A5"}}>
                <td colSpan={5} style={{padding:"10px 8px",fontWeight:700,color:"#0A2B2B"}}>Total Outstanding</td>
                <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#6B7280"}}>{fmtF(AP_AGING.reduce((s,r)=>s+r.amount,0))}</td>
                <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#DC2626",fontWeight:700}}>{fmtF(totalBalance)}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked,setUnlocked] = useState(false);
  const [view,setView]         = useState("overview");
  const [activeMonth,setActiveMonth] = useState(null);
  const [planIn,setPlanIn]     = useState(MONTHLY.map(m=>m.budgetIn));
  const [planOut,setPlanOut]   = useState(MONTHLY.map(m=>m.budgetOut));

  // Zoho live data state
  const [zohoMonthly,setZohoMonthly]   = useState(null);
  const [zohoAR,setZohoAR]             = useState(null);
  const [zohoAP,setZohoAP]             = useState(null);
  const [zohoProjects,setZohoProjects] = useState(null);
  const [zohoLoading,setZohoLoading]   = useState(false);
  const [zohoError,setZohoError]       = useState(null);
  const [lastSync,setLastSync]         = useState(null);
  const [dataSource,setDataSource]     = useState("excel"); // "excel" | "zoho"

  const loadZoho = useCallback(async () => {
    setZohoLoading(true);
    setZohoError(null);
    try {
      const [cf, ar, ap, proj] = await Promise.all([
        fetchZohoCashflow("2026"),
        fetchZohoARaging(),
        fetchZohoAPaging(),
        fetchZohoProjects(),
      ]);
      setZohoMonthly(cf.monthly);
      if (cf.monthly) setPlanIn(cf.monthly.map(m=>m.budgetIn||m.cashIn*1.25));
      setZohoAR(ar);
      setZohoAP(ap);
      setZohoProjects(proj);
      setLastSync(new Date());
      setDataSource("zoho");
    } catch(e) {
      setZohoError(e.message);
    } finally {
      setZohoLoading(false);
    }
  }, []);

  const uPI=(i,v)=>setPlanIn(p=>{const n=[...p];n[i]=v;return n;});
  const uPO=(i,v)=>setPlanOut(p=>{const n=[...p];n[i]=v;return n;});

  if(!unlocked) return <Login onUnlock={()=>setUnlocked(true)}/>;

  // Use Zoho data if loaded, otherwise fall back to Excel static data
  const ACTIVE_MONTHLY  = zohoMonthly  || MONTHLY;
  const ACTIVE_AR       = zohoAR       || AR_AGING_STATIC;
  const ACTIVE_AP       = zohoAP       || AP_AGING_STATIC;

  const chartData=ACTIVE_MONTHLY.map((m,i)=>({
    month:MONTHS[i],
    "Actual In":Math.round(m.cashIn), "Budget In":Math.round(planIn[i]),
    "Actual Out":Math.round(m.cashOut),"Budget Out":Math.round(planOut[i]),
    "Net Actual":Math.round(m.net),   "Net Budget":Math.round(planIn[i]-planOut[i]),
  }));

  const expData=(()=>{
    const tot={a:{},b:{}};
    MONTHLY_EXPENSES.forEach(m=>EXPENSE_CATEGORIES.forEach(c=>{tot.a[c.key]=(tot.a[c.key]||0)+(m[c.key]?.a||0);tot.b[c.key]=(tot.b[c.key]||0)+(m[c.key]?.b||0);}));
    return EXPENSE_CATEGORIES.map(c=>({...c,actual:Math.round(tot.a[c.key]||0),budget:Math.round(tot.b[c.key]||0)})).filter(c=>c.actual>0||c.budget>0).sort((a,b)=>b.actual-a.actual);
  })();
  const maxExp=Math.max(...expData.map(e=>Math.max(e.actual,e.budget)),1);

  const projTotals=PROJECT_CASH_IN.map(p=>({...p,total2026:p.monthly.reduce((s,v)=>s+(v||0),0)})).sort((a,b)=>b.total2026-a.total2026);

  const tpi=planIn.reduce((s,v)=>s+v,0), tpo=planOut.reduce((s,v)=>s+v,0);
  const tai=ACTIVE_MONTHLY.reduce((s,m)=>s+m.cashIn,0), tao=MONTHLY.reduce((s,m)=>s+m.cashOut,0);
  const rvp=tpi?(tai-tpi)/tpi*100:0, cvp=tpo?(tao-tpo)/tpo*100:0;

  const VIEWS = ["overview","plan vs actual","projects","expenses","AR aging","AP aging"];

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFB",color:"#0A2B2B",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      <header style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,position:"sticky",top:0,zIndex:100}}>
        <img src={LOGO} alt="Stradigi" style={{height:28,objectFit:"contain"}}/>
        <div style={{display:"flex",gap:3}}>
          {VIEWS.map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{background:view===v?"#0A2B2B":"none",border:"1px solid "+(view===v?"#0A2B2B":"#E5E7EB"),color:view===v?"#00FF85":"#6B7280",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:600,transition:"all 0.15s",fontFamily:"inherit",whiteSpace:"nowrap"}}>{v}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {zohoError&&<span style={{fontSize:11,color:"#F59E0B",fontWeight:600}} title={zohoError}>⚠ Zoho error</span>}
          {lastSync&&<span style={{fontSize:11,color:"#9CA3AF"}}>Synced {lastSync.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}
          <button onClick={loadZoho} disabled={zohoLoading} style={{background:dataSource==="zoho"?"#E1F5EE":"#F0FDF4",border:"1px solid "+(dataSource==="zoho"?"#1D9E75":"#D1FAE5"),color:dataSource==="zoho"?"#0F6E56":"#059669",borderRadius:7,padding:"5px 12px",cursor:zohoLoading?"default":"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>
            {zohoLoading?"Syncing...":dataSource==="zoho"?"⟳ Zoho Live":"⟳ Sync Zoho"}
          </button>
          <button onClick={()=>setDataSource("excel")} style={{background:dataSource==="excel"?"#E6F1FB":"none",border:"1px solid "+(dataSource==="excel"?"#378ADD":"#E5E7EB"),color:dataSource==="excel"?"#185FA5":"#9CA3AF",borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>Excel</button>
          <button onClick={()=>setUnlocked(false)} style={{background:"none",border:"1px solid #E5E7EB",color:"#9CA3AF",borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Sign out</button>
        </div>
      </header>

      <main style={{padding:"24px 28px",maxWidth:1400,margin:"0 auto"}}>

        {view==="overview"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
              <Kpi label="Opening Balance (Jan)" value={fmtF(ACTIVE_MONTHLY[0].opening)}/>
              <Kpi label="YTD Closing Balance"   value={fmtF(ACTIVE_MONTHLY[2].net)} color="#059669" sub="Through Mar 2026"/>
              <Kpi label="YTD Revenue"           value={fmt(tai)} color="#1D9E75" sub={`${rvp>=0?"+":""}${rvp.toFixed(1)}% vs budget`}/>
              <Kpi label="YTD Cash Out"          value={fmt(tao)} color="#DC2626" sub={`${cvp>=0?"+":""}${cvp.toFixed(1)}% vs budget`}/>
            </div>

            <div style={{marginBottom:20}}>
              <Sec>Select a month to drill down</Sec>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {MONTHS.map((m,i)=>{
                  const d=ACTIVE_MONTHLY[i], hasData=d.cashIn>0||d.cashOut>0;
                  const isPos=d.cashIn>=d.cashOut;
                  return (
                    <button key={m} onClick={()=>setActiveMonth(activeMonth===i?null:i)} style={{background:activeMonth===i?"#0A2B2B":"#fff",border:"1px solid "+(activeMonth===i?"#0A2B2B":"#E5E7EB"),color:activeMonth===i?"#00FF85":hasData?"#374151":"#D1D5DB",borderRadius:24,padding:"6px 16px",cursor:"pointer",fontSize:12,fontWeight:600,transition:"all 0.15s",position:"relative",fontFamily:"inherit"}}>
                      {m}
                      {hasData&&<span style={{width:5,height:5,borderRadius:"50%",background:isPos?"#10B981":"#EF4444",position:"absolute",top:4,right:5,display:"block"}}/>}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeMonth!==null&&<MonthDetail idx={activeMonth} onClose={()=>setActiveMonth(null)} planIn={planIn} planOut={planOut}/>}

            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px",marginBottom:20}}>
              <Sec>Monthly cash flow — actual vs budget</Sec>
              <div style={{display:"flex",gap:14,marginBottom:14,fontSize:12,flexWrap:"wrap"}}>
                {[["Actual In","#1D9E75"],["Budget In","#9FE1CB"],["Actual Out","#EF4444"],["Budget Out","#FCA5A5"],["Net Actual","#3B82F6"],["Net Budget","#93C5FD"]].map(([l,c])=>(
                  <span key={l} style={{display:"flex",alignItems:"center",gap:5,color:"#6B7280"}}><span style={{width:10,height:10,borderRadius:2,background:c}}/>{l}</span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} onClick={e=>e?.activeTooltipIndex!=null&&setActiveMonth(e.activeTooltipIndex)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                  <XAxis dataKey="month" tick={{fill:"#9CA3AF",fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:"#9CA3AF",fontSize:11}} tickFormatter={fmt} axisLine={false} tickLine={false}/>
                  <Tooltip content={<TT/>} cursor={{fill:"rgba(10,43,43,0.04)"}}/>
                  <Bar dataKey="Actual In"  fill="#1D9E75" radius={[3,3,0,0]}/>
                  <Bar dataKey="Budget In"  fill="#9FE1CB" radius={[3,3,0,0]}/>
                  <Bar dataKey="Actual Out" fill="#EF4444" radius={[3,3,0,0]}/>
                  <Bar dataKey="Budget Out" fill="#FCA5A5" radius={[3,3,0,0]}/>
                  <Line type="monotone" dataKey="Net Actual" stroke="#3B82F6" strokeWidth={2.5} dot={{fill:"#3B82F6",r:3}}/>
                  <Line type="monotone" dataKey="Net Budget" stroke="#93C5FD" strokeWidth={2} strokeDasharray="5 4" dot={false}/>
                </ComposedChart>
              </ResponsiveContainer>
              <p style={{fontSize:11,color:"#D1D5DB",textAlign:"center",marginTop:8}}>Click any bar to drill into that month</p>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px"}}>
                <Sec>YTD expenses — actual vs budget</Sec>
                {expData.map(e=>(
                  <div key={e.key} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:2,background:e.color,flexShrink:0}}/><span style={{color:"#374151"}}>{e.name}</span></div>
                      <div style={{display:"flex",gap:10}}>
                        <span style={{fontSize:11,color:"#9CA3AF"}}>Bdgt: {fmt(e.budget)}</span>
                        <span style={{color:"#0A2B2B",fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:11}}>{fmt(e.actual)}</span>
                      </div>
                    </div>
                    <div style={{position:"relative",height:5,background:"#F3F4F6",borderRadius:3}}>
                      <div style={{position:"absolute",height:5,borderRadius:3,background:"#D1FAE5",width:`${(e.budget/maxExp)*100}%`}}/>
                      <div style={{position:"absolute",height:5,borderRadius:3,background:e.color,width:`${(e.actual/maxExp)*100}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px"}}>
                <Sec>Net balance trajectory</Sec>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} onClick={e=>e?.activeTooltipIndex!=null&&setActiveMonth(e.activeTooltipIndex)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                    <XAxis dataKey="month" tick={{fill:"#9CA3AF",fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:"#9CA3AF",fontSize:11}} tickFormatter={fmt} axisLine={false} tickLine={false}/>
                    <Tooltip content={<TT/>}/>
                    <Line type="monotone" dataKey="Net Actual" stroke="#1D9E75" strokeWidth={2.5} dot={{fill:"#1D9E75",r:3}} activeDot={{r:5}}/>
                    <Line type="monotone" dataKey="Net Budget" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 4" dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {view==="plan vs actual"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
              <div>
                <h1 style={{fontSize:20,fontWeight:700,color:"#0A2B2B",margin:"0 0 4px"}}>Budget vs Actual</h1>
                <p style={{fontSize:13,color:"#9CA3AF",margin:0}}>Budget figures from Excel · Click any budget cell to edit</p>
              </div>
              <button onClick={()=>{setPlanIn(MONTHLY.map(m=>m.budgetIn));setPlanOut(MONTHLY.map(m=>m.budgetOut));}} style={{background:"none",border:"1px solid #E5E7EB",color:"#6B7280",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>Reset to Excel budget</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
              <Kpi label="Budget Revenue (YTD)" value={fmt(tpi)} color="#6B7280"/>
              <Kpi label="Actual Revenue (YTD)" value={fmt(tai)} color="#059669" sub={`${rvp>=0?"+":""}${rvp.toFixed(1)}% vs budget`}/>
              <Kpi label="Budget Costs (YTD)"   value={fmt(tpo)} color="#6B7280"/>
              <Kpi label="Actual Costs (YTD)"   value={fmt(tao)} color={cvp>5?"#DC2626":"#059669"} sub={`${cvp>=0?"+":""}${cvp.toFixed(1)}% vs budget`}/>
            </div>

            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px",marginBottom:20}}>
              <Sec>Revenue variance — actual vs budget</Sec>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={ACTIVE_MONTHLY.map((m,i)=>({month:MONTHS[i],Variance:Math.round(m.cashIn-(planIn[i]||0))}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                  <XAxis dataKey="month" tick={{fill:"#9CA3AF",fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:"#9CA3AF",fontSize:11}} tickFormatter={v=>(v>=0?"+":"")+fmt(v)} axisLine={false} tickLine={false}/>
                  <Tooltip content={<TT/>}/>
                  <ReferenceLine y={0} stroke="#E5E7EB" strokeWidth={1.5}/>
                  <Bar dataKey="Variance" radius={[3,3,0,0]} shape={({x,y,width,height,value})=>{const h=Math.abs(height),yp=value>=0?y:y+height;return <rect x={x} y={yp} width={width} height={h} fill={value>=0?"#1D9E75":"#EF4444"} rx={3}/>;}}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px",overflowX:"auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <Sec mb={0}>Full variance table</Sec>
                <span style={{fontSize:11,color:"#9CA3AF"}}>
                  <span style={{color:"#10B981",fontWeight:600}}>● On Track</span>&nbsp;
                  <span style={{color:"#F59E0B",fontWeight:600}}>● At Risk</span>&nbsp;
                  <span style={{color:"#EF4444",fontWeight:600}}>● Off Track</span>
                </span>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
                <thead>
                  <tr style={{background:"#F9FAFB"}}>
                    {["Month","Budget In","Actual In","Var AED","Var %","Budget Out","Actual Out","Var AED","Var %","Net Budget","Net Actual","Status"].map((h,i)=>(
                      <th key={i} style={{textAlign:i===0?"left":"right",padding:"10px 8px",color:"#6B7280",fontWeight:600,borderBottom:"1px solid #E5E7EB",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ACTIVE_MONTHLY.map((m,i)=>{
                    const pi=planIn[i]||0,ai=m.cashIn,po=planOut[i]||0,ao=m.cashOut;
                    const vi=ai-pi,vip=pi?(vi/pi*100):0,vo=ao-po,vop=po?(vo/po*100):0;
                    const np=pi-po,na=ai-ao,nvp=np?((na-np)/Math.abs(np)*100):0;
                    const ragBg=nvp<-10?"#FEF2F2":nvp<-3?"#FFFBEB":"#F0FDF4", ragTc=nvp<-10?"#DC2626":nvp<-3?"#D97706":"#059669";
                    const ragLabel=nvp<-10?"Off Track":nvp<-3?"At Risk":"On Track";
                    return (
                      <tr key={i} style={{background:i%2===0?"#fff":"#FAFAFA",borderBottom:"1px solid #F3F4F6"}}>
                        <td style={{padding:"9px 12px",fontWeight:600,color:"#0A2B2B"}}>{MONTHS[i]}</td>
                        <td style={{padding:"9px 8px",textAlign:"right"}}><EditCell value={pi} onChange={v=>uPI(i,v)}/></td>
                        <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:ai>0?"#0A2B2B":"#D1D5DB"}}>{ai>0?fmt(ai):"—"}</td>
                        <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varC(vip,false),fontWeight:600}}>{ai>0?(vi>=0?"+":"")+fmt(vi):"—"}</td>
                        <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varC(vip,false)}}>{ai>0?(vip>=0?"+":"")+vip.toFixed(1)+"%":"—"}</td>
                        <td style={{padding:"9px 8px",textAlign:"right"}}><EditCell value={po} onChange={v=>uPO(i,v)}/></td>
                        <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:ao>0?"#0A2B2B":"#D1D5DB"}}>{ao>0?fmt(ao):"—"}</td>
                        <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varC(vop,true),fontWeight:600}}>{ao>0?(vo>=0?"+":"")+fmt(vo):"—"}</td>
                        <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varC(vop,true)}}>{ao>0?(vop>=0?"+":"")+vop.toFixed(1)+"%":"—"}</td>
                        <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#6B7280"}}>{fmt(np)}</td>
                        <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:na>=0?"#059669":"#DC2626",fontWeight:600}}>{ai>0?(na>=0?"+":"")+fmt(na):"—"}</td>
                        <td style={{padding:"9px 8px",textAlign:"right"}}><span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:ragBg,color:ragTc}}>{ragLabel}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view==="projects"&&(
          <>
            <div style={{marginBottom:24}}>
              <h1 style={{fontSize:20,fontWeight:700,color:"#0A2B2B",margin:"0 0 4px"}}>Project pipeline</h1>
              <p style={{fontSize:13,color:"#9CA3AF"}}>{projTotals.length} projects · 2026 cash in scheduled</p>
            </div>
            <div style={{display:"grid",gap:10}}>
              {projTotals.map(p=>{
                const mx=Math.max(...p.monthly,1);
                return (
                  <div key={p.project} style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"16px 20px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <span style={{fontSize:15,fontWeight:700,color:"#0A2B2B"}}>{p.project}</span>
                          <Badge status={p.status}/>
                        </div>
                        <span style={{fontSize:11,color:"#9CA3AF"}}>{p.contractStatus} · Contract value: {fmtF(p.total)}</span>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:18,fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{fmtF(p.total2026)}</div>
                        <div style={{fontSize:11,color:"#9CA3AF"}}>2026 inflow</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:3}}>
                      {p.monthly.map((v,i)=>(
                        <div key={i} title={`${MONTHS[i]}: ${fmtF(v)}`} style={{flex:1,textAlign:"center"}}>
                          <div style={{height:28,background:"#F9FAFB",borderRadius:3,display:"flex",alignItems:"flex-end"}}>
                            <div style={{width:"100%",background:v>0?"#1D9E75":"transparent",height:v>0?`${(v/mx)*100}%`:"0",borderRadius:3,minHeight:v>0?3:0}}/>
                          </div>
                          <div style={{fontSize:9,color:"#D1D5DB",marginTop:2}}>{MONTHS[i].slice(0,1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view==="expenses"&&(
          <>
            <div style={{marginBottom:24}}>
              <h1 style={{fontSize:20,fontWeight:700,color:"#0A2B2B",margin:"0 0 4px"}}>Expense analysis</h1>
              <p style={{fontSize:13,color:"#9CA3AF"}}>YTD 2026 · Actual vs Budget</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
              <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px"}}>
                <Sec>Annual expense — actual vs budget</Sec>
                {expData.map(e=>(
                  <div key={e.key} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{width:8,height:8,borderRadius:2,background:e.color,flexShrink:0}}/><span style={{color:"#374151"}}>{e.name}</span></div>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <span style={{fontSize:11,color:"#9CA3AF"}}>Bdgt: {fmt(e.budget)}</span>
                        <span style={{color:"#0A2B2B",fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:12}}>{fmt(e.actual)}</span>
                      </div>
                    </div>
                    <div style={{position:"relative",height:5,background:"#F3F4F6",borderRadius:3}}>
                      <div style={{position:"absolute",height:5,borderRadius:3,background:"#D1FAE5",width:`${(e.budget/maxExp)*100}%`}}/>
                      <div style={{position:"absolute",height:5,borderRadius:3,background:e.color,width:`${(e.actual/maxExp)*100}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px"}}>
                <Sec>Monthly cash out vs budget</Sec>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ACTIVE_MONTHLY.map((m,i)=>({month:MONTHS[i],"Actual Out":Math.round(m.cashOut),"Budget Out":Math.round(planOut[i])}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                    <XAxis dataKey="month" tick={{fill:"#9CA3AF",fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:"#9CA3AF",fontSize:11}} tickFormatter={fmt} axisLine={false} tickLine={false}/>
                    <Tooltip content={<TT/>} cursor={{fill:"rgba(239,68,68,0.05)"}}/>
                    <Bar dataKey="Actual Out" fill="#EF4444" radius={[4,4,0,0]}/>
                    <Bar dataKey="Budget Out" fill="#FCA5A5" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px",overflowX:"auto"}}>
              <Sec>Monthly expense detail</Sec>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1000}}>
                <thead>
                  <tr>
                    <th style={{textAlign:"left",padding:"8px 10px",color:"#9CA3AF",fontWeight:600,borderBottom:"1px solid #F3F4F6"}}>Category</th>
                    {MONTHS.map(m=><th key={m} style={{textAlign:"right",padding:"8px 6px",color:"#9CA3AF",fontWeight:600,borderBottom:"1px solid #F3F4F6",fontSize:11}}>{m}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {expData.map(e=>(
                    <tr key={e.key} style={{borderBottom:"1px solid #F9FAFB"}}>
                      <td style={{padding:"7px 10px",color:"#374151",display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:1,background:e.color,flexShrink:0}}/>{e.name}</td>
                      {MONTHLY_EXPENSES.map((m,i)=>{const v=m[e.key]?.a||0;return(
                        <td key={i} style={{padding:"7px 6px",textAlign:"right",color:v>0?"#0A2B2B":"#E5E7EB",fontFamily:"'DM Mono',monospace",fontSize:11}}>
                          {v>0?fmt(v):"—"}
                        </td>
                      );})}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view==="AR aging"&&<ARAgingView arData={ACTIVE_AR}/>}
        {view==="AP aging"&&<APAgingView apData={ACTIVE_AP}/>}

      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;} body{margin:0;background:#F8FAFB;} button{font-family:inherit;}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:#F9FAFB} ::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:3px}
      `}</style>
    </div>
  );
}
