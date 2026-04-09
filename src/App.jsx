import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ComposedChart, ReferenceLine,
} from "recharts";
import { fetchCSVData } from "./data/fetchSheets";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const DEFAULT_PLAN_IN  = [500000,500000,1500000,800000,1200000,1500000,600000,900000,1200000,500000,500000,500000];
const DEFAULT_PLAN_OUT = [400000,400000,800000,900000,900000,900000,900000,900000,900000,900000,900000,900000];
const PASSWORD = "SMCFin26";

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = n => n>=1e6?"$"+(n/1e6).toFixed(2)+"M":n>=1e3?"$"+Math.round(n/1e3).toLocaleString()+"K":"$"+Math.round(n).toLocaleString();
const fmtFull = n => (n<0?"-$":"$")+Math.abs(Math.round(n)).toLocaleString();
const varCol = (v,exp=false) => exp?(v>5?"#DC2626":v<-5?"#059669":"#6B7280"):(v<-5?"#DC2626":v>5?"#059669":"#6B7280");
const ragCol = (v,exp=false) => { const bad=exp?v>10:v<-10,warn=exp?v>3:v<-3; return bad?"#EF4444":warn?"#F59E0B":"#10B981"; };

const ST = { "In Hand":{bg:"#E1F5EE",tc:"#0F6E56"}, Closing:{bg:"#FEF3C7",tc:"#92400E"}, default:{bg:"#F3F4F6",tc:"#6B7280"} };

// ── atoms ─────────────────────────────────────────────────────────────────────
const Kpi = ({label,value,sub,color}) => (
  <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"18px 20px",display:"flex",flexDirection:"column",gap:4}}>
    <span style={{fontSize:11,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>{label}</span>
    <span style={{fontSize:24,fontWeight:700,color:color||"#0A2B2B",fontFamily:"'DM Mono',monospace",letterSpacing:"-0.5px"}}>{value}</span>
    {sub&&<span style={{fontSize:12,color:"#9CA3AF"}}>{sub}</span>}
  </div>
);

const Sec = ({children}) => <h2 style={{fontSize:11,fontWeight:700,color:"#0A2B2B",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14,marginTop:0}}>{children}</h2>;

const Badge = ({status}) => { const c=ST[status]||ST.default; return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:c.bg,color:c.tc}}>{status||"—"}</span>; };

const RAG = ({pct,exp=false}) => {
  const col=ragCol(pct,exp), label=col==="#EF4444"?"Off Track":col==="#F59E0B"?"At Risk":"On Track";
  const bg=col==="#EF4444"?"#FEF2F2":col==="#F59E0B"?"#FFFBEB":"#F0FDF4", tc=col==="#EF4444"?"#DC2626":col==="#F59E0B"?"#D97706":"#059669";
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:bg,color:tc}}>{label}</span>;
};

const TT = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:10,padding:"10px 14px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}}>
      <p style={{color:"#0A2B2B",fontWeight:700,marginBottom:6,marginTop:0}}>{label}</p>
      {payload.map(p=><p key={p.name} style={{color:p.color||p.stroke,margin:"2px 0"}}>{p.name}: <strong>{fmtFull(p.value)}</strong></p>)}
    </div>
  );
};

const EditCell = ({value,onChange}) => {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState("");
  const start=()=>{setDraft(String(Math.round(value)));setEditing(true);};
  const commit=()=>{const n=parseFloat(draft.replace(/[^0-9.]/g,""));if(!isNaN(n))onChange(n);setEditing(false);};
  if(editing) return <input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape")setEditing(false);}} style={{width:80,fontSize:12,fontFamily:"'DM Mono',monospace",border:"1.5px solid #0A2B2B",borderRadius:6,padding:"2px 6px",outline:"none",textAlign:"right"}}/>;
  return <span onClick={start} title="Click to edit" style={{cursor:"pointer",borderBottom:"1px dashed #D1D5DB",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#374151"}}>{fmt(value)}</span>;
};

// ── Loading / Error ───────────────────────────────────────────────────────────
const Loading = ({msg}) => (
  <div style={{minHeight:"100vh",background:"#F8FAFB",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",gap:16}}>
    <div style={{width:52,height:52,background:"#0A2B2B",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:800,color:"#00FF85"}}>S</div>
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:15,fontWeight:600,color:"#0A2B2B",marginBottom:6}}>{msg||"Loading dashboard..."}</div>
      <div style={{fontSize:12,color:"#9CA3AF"}}>Fetching live data from Google Drive</div>
    </div>
    <div style={{display:"flex",gap:6}}>
      {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#1D9E75",animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}
    </div>
    <style>{`@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
  </div>
);

const Err = ({error,onRetry}) => (
  <div style={{minHeight:"100vh",background:"#F8FAFB",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",gap:16,padding:"0 24px"}}>
    <div style={{width:52,height:52,background:"#FEF2F2",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#DC2626",fontWeight:800}}>!</div>
    <div style={{textAlign:"center",maxWidth:460}}>
      <div style={{fontSize:16,fontWeight:700,color:"#DC2626",marginBottom:8}}>Could not load data</div>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:8,lineHeight:1.7,background:"#F9FAFB",padding:"12px 16px",borderRadius:10,textAlign:"left",fontFamily:"'DM Mono',monospace",fontSize:12}}>{error}</div>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:20,lineHeight:1.6}}>
        Make sure the Google Drive file is shared as <strong>"Anyone with the link can view"</strong>.
      </div>
      <button onClick={onRetry} style={{background:"#0A2B2B",color:"#00FF85",border:"none",borderRadius:10,padding:"10px 24px",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Try Again</button>
    </div>
  </div>
);

// ── Login ─────────────────────────────────────────────────────────────────────
const Login = ({onUnlock}) => {
  const [val,setVal]=useState(""),  [err,setErr]=useState(false), [show,setShow]=useState(false);
  const go=()=>{ if(val===PASSWORD){onUnlock();}else{setErr(true);setVal("");setTimeout(()=>setErr(false),2000);}};
  return (
    <div style={{minHeight:"100vh",background:"#F8FAFB",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:20,padding:"48px 44px",width:380,textAlign:"center",boxShadow:"0 4px 24px rgba(0,0,0,0.07)"}}>
        <div style={{width:52,height:52,background:"#0A2B2B",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:22,fontWeight:800,color:"#00FF85"}}>S</div>
        <h1 style={{fontSize:20,fontWeight:700,color:"#0A2B2B",margin:"0 0 4px"}}>Stradigi Finance</h1>
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

// ── Month Detail Panel ────────────────────────────────────────────────────────
const MonthDetail = ({idx,onClose,monthly,monthlyExpenses,expenseCategories,projectCashIn,planIn,planOut}) => {
  const m=monthly[idx], exp=monthlyExpenses[idx]||{};
  const net=m.cashIn-m.cashOut, coverage=m.cashOut>0?(m.cashIn/m.cashOut).toFixed(2):"—";
  const margin=m.cashIn>0?((net/m.cashIn)*100).toFixed(1):"0";
  const varIn=m.cashIn-(planIn[idx]||0);

  const projIn=(projectCashIn||[]).map(p=>({name:p.project,val:p.monthly[idx]||0})).filter(p=>p.val>0).sort((a,b)=>b.val-a.val);
  const expEntries=Object.entries(exp).map(([key,val])=>{const cat=(expenseCategories||[]).find(c=>c.key===key);return{name:cat?.name||key,val:val||0,color:cat?.color||"#888"};}).filter(e=>e.val>0).sort((a,b)=>b.val-a.val);
  const maxIn=Math.max(...projIn.map(p=>p.val),1), maxExp=Math.max(...expEntries.map(e=>e.val),1);

  return (
    <div style={{background:"#fff",border:"2px solid #0A2B2B",borderRadius:16,padding:"24px 28px",marginBottom:24,animation:"slideIn 0.2s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:700,color:"#0A2B2B",margin:0,fontFamily:"'DM Mono',monospace"}}>{MONTHS[idx]} 2026</h2>
          <p style={{fontSize:12,color:"#9CA3AF",margin:"4px 0 0"}}>Month {idx+1} of 12 · Actual vs Plan</p>
        </div>
        <button onClick={onClose} style={{background:"none",border:"1px solid #E5E7EB",color:"#6B7280",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit"}}>✕ Close</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
        {[
          {label:"Opening",  value:fmtFull(m.opening)},
          {label:"Planned In",value:fmt(planIn[idx]||0),color:"#6B7280"},
          {label:"Actual In", value:fmtFull(m.cashIn),  color:"#059669"},
          {label:"In Variance",value:(varIn>=0?"+":"")+fmt(varIn),color:varIn>=0?"#059669":"#DC2626"},
          {label:"Actual Out",value:fmtFull(m.cashOut), color:m.cashOut>(planOut[idx]||0)?"#DC2626":"#059669"},
        ].map(k=>(
          <div key={k.label} style={{background:"#F9FAFB",borderRadius:10,padding:"12px 14px",border:"1px solid #F3F4F6"}}>
            <div style={{fontSize:10,color:"#9CA3AF",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>{k.label}</div>
            <div style={{fontSize:14,fontWeight:700,color:k.color||"#0A2B2B",fontFamily:"'DM Mono',monospace"}}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[
          {label:"Coverage ratio", value:`${coverage}×`,      note:"cash in / cash out"},
          {label:"Net margin",     value:`${margin}%`,         note:"of revenue retained"},
          {label:"Revenue vs plan",value:(varIn>=0?"+":"")+((varIn/((planIn[idx]||1)))*100).toFixed(1)+"%",note:fmtFull(varIn)+" variance"},
          {label:"Top inflow",     value:projIn[0]?.name||"—", note:fmtFull(projIn[0]?.val||0)},
        ].map(ins=>(
          <div key={ins.label} style={{background:"#F0FDF4",border:"1px solid #D1FAE5",borderRadius:10,padding:"10px 16px",flex:"1 1 160px"}}>
            <div style={{fontSize:10,color:"#6B7280",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>{ins.label}</div>
            <div style={{fontSize:14,fontWeight:700,color:"#0A2B2B"}}>{ins.value}</div>
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
                <span style={{color:"#0A2B2B",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{fmtFull(p.val)}</span>
              </div>
              <div style={{height:5,background:"#F3F4F6",borderRadius:3}}><div style={{height:5,borderRadius:3,background:"#1D9E75",width:`${(p.val/maxIn)*100}%`}}/></div>
            </div>
          ))}
        </div>
        <div>
          <Sec>Cash out breakdown</Sec>
          {expEntries.length===0&&<p style={{fontSize:12,color:"#9CA3AF"}}>No expense detail available.</p>}
          {expEntries.map(e=>(
            <div key={e.name} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:"#374151"}}>{e.name}</span>
                <span style={{color:"#0A2B2B",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{fmtFull(e.val)}</span>
              </div>
              <div style={{height:5,background:"#F3F4F6",borderRadius:3}}><div style={{height:5,borderRadius:3,background:e.color,width:`${(e.val/maxExp)*100}%`}}/></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Variance Table ────────────────────────────────────────────────────────────
const VarTable = ({monthly,planIn,planOut,onPI,onPO}) => (
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
      <thead>
        <tr style={{background:"#F9FAFB"}}>
          {["Month","Planned In","Actual In","Var $","Var %","Planned Out","Actual Out","Var $","Var %","Net Plan","Net Actual","Status"].map((h,i)=>(
            <th key={i} style={{textAlign:i===0?"left":"right",padding:"10px 8px",color:"#6B7280",fontWeight:600,borderBottom:"1px solid #E5E7EB",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthly.map((m,i)=>{
          const pi=planIn[i]||0,ai=m.cashIn,po=planOut[i]||0,ao=m.cashOut;
          const vi=ai-pi,vip=pi?(vi/pi*100):0,vo=ao-po,vop=po?(vo/po*100):0;
          const np=pi-po,na=ai-ao,nvp=np?((na-np)/Math.abs(np)*100):0;
          return (
            <tr key={i} style={{background:i%2===0?"#fff":"#FAFAFA",borderBottom:"1px solid #F3F4F6"}}>
              <td style={{padding:"9px 12px",fontWeight:600,color:"#0A2B2B"}}>{MONTHS[i]}</td>
              <td style={{padding:"9px 8px",textAlign:"right"}}><EditCell value={pi} onChange={v=>onPI(i,v)}/></td>
              <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#0A2B2B"}}>{fmt(ai)}</td>
              <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varCol(vip,false),fontWeight:600}}>{vi>=0?"+":""}{fmt(vi)}</td>
              <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varCol(vip,false)}}>{vip>=0?"+":""}{vip.toFixed(1)}%</td>
              <td style={{padding:"9px 8px",textAlign:"right"}}><EditCell value={po} onChange={v=>onPO(i,v)}/></td>
              <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#0A2B2B"}}>{fmt(ao)}</td>
              <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varCol(vop,true),fontWeight:600}}>{vo>=0?"+":""}{fmt(vo)}</td>
              <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varCol(vop,true)}}>{vop>=0?"+":""}{vop.toFixed(1)}%</td>
              <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#6B7280"}}>{fmt(np)}</td>
              <td style={{padding:"9px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:na>=0?"#059669":"#DC2626",fontWeight:600}}>{na>=0?"+":""}{fmt(na)}</td>
              <td style={{padding:"9px 8px",textAlign:"right"}}><RAG pct={nvp}/></td>
            </tr>
          );
        })}
        {(()=>{
          const tpi=planIn.reduce((s,v)=>s+v,0),tai=monthly.reduce((s,m)=>s+m.cashIn,0);
          const tpo=planOut.reduce((s,v)=>s+v,0),tao=monthly.reduce((s,m)=>s+m.cashOut,0);
          const tvi=tai-tpi,tvip=tpi?tvi/tpi*100:0,tvo=tao-tpo,tvop=tpo?tvo/tpo*100:0;
          const tnp=tpi-tpo,tna=tai-tao;
          return (
            <tr style={{background:"#F0FDF4",borderTop:"2px solid #D1FAE5",fontWeight:700}}>
              <td style={{padding:"10px 12px",color:"#0A2B2B"}}>Total</td>
              <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmt(tpi)}</td>
              <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmt(tai)}</td>
              <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varCol(tvip,false)}}>{tvi>=0?"+":""}{fmt(tvi)}</td>
              <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varCol(tvip,false)}}>{tvip>=0?"+":""}{tvip.toFixed(1)}%</td>
              <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmt(tpo)}</td>
              <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmt(tao)}</td>
              <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varCol(tvop,true)}}>{tvo>=0?"+":""}{fmt(tvo)}</td>
              <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:varCol(tvop,true)}}>{tvop>=0?"+":""}{tvop.toFixed(1)}%</td>
              <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:"#6B7280"}}>{fmt(tnp)}</td>
              <td style={{padding:"10px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",color:tna>=0?"#059669":"#DC2626"}}>{tna>=0?"+":""}{fmt(tna)}</td>
              <td style={{padding:"10px 8px",textAlign:"right"}}><RAG pct={tnp?((tna-tnp)/Math.abs(tnp)*100):0}/></td>
            </tr>
          );
        })()}
      </tbody>
    </table>
  </div>
);

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [unlocked,setUnlocked]=useState(false);
  const [loading,setLoading]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState(null);
  const [data,setData]=useState(null);
  const [fetchedAt,setFetchedAt]=useState(null);
  const [activeMonth,setActiveMonth]=useState(null);
  const [view,setView]=useState("overview");
  const [planIn,setPlanIn]=useState([...DEFAULT_PLAN_IN]);
  const [planOut,setPlanOut]=useState([...DEFAULT_PLAN_OUT]);

  const load = useCallback(async (isRefresh=false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const result = await fetchCSVData();
      setData(result);
      setFetchedAt(new Date());
      // If CSV has budget figures, use them
      if (result.planIn)  setPlanIn(result.planIn);
      if (result.planOut) setPlanOut(result.planOut);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  },[]);

  useEffect(()=>{ if(unlocked) load(); },[unlocked,load]);

  const uPI=(i,v)=>setPlanIn(p=>{const n=[...p];n[i]=v;return n;});
  const uPO=(i,v)=>setPlanOut(p=>{const n=[...p];n[i]=v;return n;});

  if(!unlocked) return <Login onUnlock={()=>setUnlocked(true)}/>;
  if(loading)   return <Loading msg="Loading dashboard..."/>;
  if(error)     return <Err error={error} onRetry={()=>load()}/>;
  if(!data)     return <Loading msg="Initializing..."/>;

  const {monthly,summary,monthlyExpenses,expenseCategories,projectCashIn} = data;

  const chartData = monthly.map((m,i)=>({
    month:MONTHS[i],
    "Actual In":Math.round(m.cashIn), "Plan In":planIn[i],
    "Actual Out":Math.round(m.cashOut),"Plan Out":planOut[i],
    "Net Actual":Math.round(m.net),   "Net Plan":planIn[i]-planOut[i],
  }));

  const expData=(()=>{
    const tot={};
    monthlyExpenses.forEach(m=>Object.entries(m).forEach(([k,v])=>{tot[k]=(tot[k]||0)+(v||0);}));
    return (expenseCategories||[]).map(c=>({...c,total:Math.round(tot[c.key]||0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
  })();
  const maxExp=expData[0]?.total||1;

  const projTotals=(projectCashIn||[]).map(p=>({...p,total2026:p.monthly.reduce((s,v)=>s+(v||0),0)})).sort((a,b)=>b.total2026-a.total2026);

  const tpi=planIn.reduce((s,v)=>s+v,0), tpo=planOut.reduce((s,v)=>s+v,0);
  const tai=monthly.reduce((s,m)=>s+m.cashIn,0), tao=monthly.reduce((s,m)=>s+m.cashOut,0);
  const rvp=tpi?(tai-tpi)/tpi*100:0, cvp=tpo?(tao-tpo)/tpo*100:0;

  const timeStr=fetchedAt?fetchedAt.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"";

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFB",color:"#0A2B2B",fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif"}}>

      {/* Header */}
      <header style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 32px",display:"flex",alignItems:"center",justifyContent:"space-between",height:60,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,background:"#0A2B2B",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#00FF85"}}>S</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#0A2B2B"}}>Stradigi</div>
            <div style={{fontSize:10,color:"#9CA3AF",letterSpacing:"0.05em",textTransform:"uppercase"}}>Cash Flow · 2026</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {["overview","plan vs actual","projects","expenses"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{background:view===v?"#0A2B2B":"none",border:"1px solid "+(view===v?"#0A2B2B":"#E5E7EB"),color:view===v?"#00FF85":"#6B7280",borderRadius:7,padding:"5px 14px",cursor:"pointer",fontSize:12,fontWeight:600,textTransform:"capitalize",transition:"all 0.15s",fontFamily:"inherit"}}>{v}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:11,color:"#9CA3AF"}}>
            {timeStr&&`Updated ${timeStr} · `}<span style={{color:"#059669",fontWeight:600}}>● Live</span>
          </span>
          <button onClick={()=>load(true)} disabled={refreshing} style={{background:refreshing?"#F3F4F6":"#F0FDF4",border:"1px solid "+(refreshing?"#E5E7EB":"#D1FAE5"),color:refreshing?"#9CA3AF":"#059669",borderRadius:7,padding:"5px 14px",cursor:refreshing?"default":"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",transition:"all 0.15s"}}>
            {refreshing?"Refreshing...":"⟳ Refresh"}
          </button>
          <button onClick={()=>setUnlocked(false)} style={{background:"none",border:"1px solid #E5E7EB",color:"#9CA3AF",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Sign out</button>
        </div>
      </header>

      <main style={{padding:"28px 32px",maxWidth:1400,margin:"0 auto"}}>

        {/* ── OVERVIEW ── */}
        {view==="overview"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
              <Kpi label="Opening Balance (Jan)" value={fmtFull(summary.openingBalance)}/>
              <Kpi label="Closing Balance (Dec)" value={fmtFull(summary.closingBalance)} color="#059669"/>
              <Kpi label="Total Revenue 2026" value={fmt(tai)} color="#1D9E75" sub={`${rvp>=0?"+":""}${rvp.toFixed(1)}% vs plan`}/>
              <Kpi label="Total Cash Out 2026" value={fmt(tao)} color="#DC2626" sub={`${cvp>=0?"+":""}${cvp.toFixed(1)}% vs budget`}/>
            </div>

            <div style={{marginBottom:20}}>
              <Sec>Select a month to drill down</Sec>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {MONTHS.map((m,i)=>{
                  const d=monthly[i],isPos=d.cashIn>=d.cashOut;
                  return (
                    <button key={m} onClick={()=>setActiveMonth(activeMonth===i?null:i)} style={{background:activeMonth===i?"#0A2B2B":"#fff",border:"1px solid "+(activeMonth===i?"#0A2B2B":"#E5E7EB"),color:activeMonth===i?"#00FF85":"#374151",borderRadius:24,padding:"6px 18px",cursor:"pointer",fontSize:12,fontWeight:600,transition:"all 0.15s",position:"relative",fontFamily:"inherit"}}>
                      {m}
                      <span style={{width:5,height:5,borderRadius:"50%",background:isPos?"#10B981":"#EF4444",position:"absolute",top:4,right:5,display:"block"}}/>
                    </button>
                  );
                })}
              </div>
            </div>

            {activeMonth!==null&&<MonthDetail idx={activeMonth} onClose={()=>setActiveMonth(null)} monthly={monthly} monthlyExpenses={monthlyExpenses} expenseCategories={expenseCategories} projectCashIn={projectCashIn} planIn={planIn} planOut={planOut}/>}

            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px",marginBottom:20}}>
              <Sec>Monthly cash flow — actual vs plan</Sec>
              <div style={{display:"flex",gap:16,marginBottom:14,fontSize:12,flexWrap:"wrap"}}>
                {[["Actual In","#1D9E75"],["Plan In","#9FE1CB"],["Actual Out","#EF4444"],["Plan Out","#FCA5A5"],["Net Actual","#3B82F6"],["Net Plan","#93C5FD"]].map(([l,c])=>(
                  <span key={l} style={{display:"flex",alignItems:"center",gap:5,color:"#6B7280"}}>
                    <span style={{width:10,height:10,borderRadius:2,background:c}}/>{l}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData} onClick={e=>e?.activeTooltipIndex!=null&&setActiveMonth(e.activeTooltipIndex)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                  <XAxis dataKey="month" tick={{fill:"#9CA3AF",fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:"#9CA3AF",fontSize:11}} tickFormatter={fmt} axisLine={false} tickLine={false}/>
                  <Tooltip content={<TT/>} cursor={{fill:"rgba(10,43,43,0.04)"}}/>
                  <Bar dataKey="Actual In" fill="#1D9E75" radius={[3,3,0,0]}/>
                  <Bar dataKey="Plan In" fill="#9FE1CB" radius={[3,3,0,0]}/>
                  <Bar dataKey="Actual Out" fill="#EF4444" radius={[3,3,0,0]}/>
                  <Bar dataKey="Plan Out" fill="#FCA5A5" radius={[3,3,0,0]}/>
                  <Line type="monotone" dataKey="Net Actual" stroke="#3B82F6" strokeWidth={2.5} dot={{fill:"#3B82F6",r:3}}/>
                  <Line type="monotone" dataKey="Net Plan" stroke="#93C5FD" strokeWidth={2} strokeDasharray="5 4" dot={false}/>
                </ComposedChart>
              </ResponsiveContainer>
              <p style={{fontSize:11,color:"#D1D5DB",textAlign:"center",marginTop:8}}>Click any bar to drill into that month</p>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px"}}>
                <Sec>Top expenses (full year)</Sec>
                {expData.slice(0,9).map(e=>(
                  <div key={e.key} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                      <span style={{color:"#374151"}}>{e.name}</span>
                      <span style={{color:"#0A2B2B",fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmt(e.total)}</span>
                    </div>
                    <div style={{height:5,background:"#F3F4F6",borderRadius:3}}><div style={{height:5,borderRadius:3,background:e.color,width:`${(e.total/maxExp)*100}%`}}/></div>
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
                    <Line type="monotone" dataKey="Net Plan" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 4" dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* ── PLAN VS ACTUAL ── */}
        {view==="plan vs actual"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
              <div>
                <h1 style={{fontSize:20,fontWeight:700,color:"#0A2B2B",margin:"0 0 4px"}}>Planned vs Actual</h1>
                <p style={{fontSize:13,color:"#9CA3AF",margin:0}}>
                  {data.planIn?"Budget figures loaded from your CSV · ":"Click any planned figure to edit · "}
                  Changes apply instantly
                </p>
              </div>
              <button onClick={()=>{setPlanIn([...DEFAULT_PLAN_IN]);setPlanOut([...DEFAULT_PLAN_OUT]);}} style={{background:"none",border:"1px solid #E5E7EB",color:"#6B7280",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>Reset to defaults</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
              <Kpi label="Plan Revenue" value={fmt(tpi)} color="#6B7280"/>
              <Kpi label="Actual Revenue" value={fmt(tai)} color="#059669" sub={`${rvp>=0?"+":""}${rvp.toFixed(1)}% vs plan`}/>
              <Kpi label="Plan Budget" value={fmt(tpo)} color="#6B7280"/>
              <Kpi label="Actual Cost" value={fmt(tao)} color={cvp>5?"#DC2626":"#059669"} sub={`${cvp>=0?"+":""}${cvp.toFixed(1)}% vs budget`}/>
            </div>

            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px",marginBottom:20}}>
              <Sec>Revenue variance — actual vs plan</Sec>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthly.map((m,i)=>({month:MONTHS[i],Variance:Math.round(m.cashIn-(planIn[i]||0))}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                  <XAxis dataKey="month" tick={{fill:"#9CA3AF",fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:"#9CA3AF",fontSize:11}} tickFormatter={v=>(v>=0?"+":"")+fmt(v)} axisLine={false} tickLine={false}/>
                  <Tooltip content={<TT/>}/>
                  <ReferenceLine y={0} stroke="#E5E7EB" strokeWidth={1.5}/>
                  <Bar dataKey="Variance" radius={[3,3,0,0]}
                    shape={({x,y,width,height,value})=>{
                      const h=Math.abs(height),yp=value>=0?y:y+height;
                      return <rect x={x} y={yp} width={width} height={h} fill={value>=0?"#1D9E75":"#EF4444"} rx={3}/>;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <Sec>Full variance table</Sec>
                <span style={{fontSize:11,color:"#9CA3AF"}}>
                  <span style={{color:"#10B981",fontWeight:600}}>● On Track</span>&nbsp;
                  <span style={{color:"#F59E0B",fontWeight:600}}>● At Risk</span>&nbsp;
                  <span style={{color:"#EF4444",fontWeight:600}}>● Off Track</span>
                </span>
              </div>
              <VarTable monthly={monthly} planIn={planIn} planOut={planOut} onPI={uPI} onPO={uPO}/>
            </div>
          </>
        )}

        {/* ── PROJECTS ── */}
        {view==="projects"&&(
          <>
            <div style={{marginBottom:24}}>
              <h1 style={{fontSize:20,fontWeight:700,color:"#0A2B2B",margin:"0 0 4px"}}>Project pipeline</h1>
              <p style={{fontSize:13,color:"#9CA3AF"}}>{projTotals.length} projects · 2026 cash in tracked</p>
            </div>
            <div style={{display:"grid",gap:10}}>
              {projTotals.length===0&&<div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:12,padding:"32px",textAlign:"center",color:"#9CA3AF",fontSize:13}}>No project-level data found in CSV.<br/>Add project rows to the CSV to see them here.</div>}
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
                        <span style={{fontSize:11,color:"#9CA3AF"}}>{p.contractStatus}</span>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:18,fontWeight:700,color:"#059669",fontFamily:"'DM Mono',monospace"}}>{fmtFull(p.total2026)}</div>
                        <div style={{fontSize:11,color:"#9CA3AF"}}>2026 inflow</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:3}}>
                      {p.monthly.map((v,i)=>(
                        <div key={i} title={`${MONTHS[i]}: ${fmtFull(v)}`} style={{flex:1,textAlign:"center"}}>
                          <div style={{height:32,background:"#F9FAFB",borderRadius:3,display:"flex",alignItems:"flex-end"}}>
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

        {/* ── EXPENSES ── */}
        {view==="expenses"&&(
          <>
            <div style={{marginBottom:24}}>
              <h1 style={{fontSize:20,fontWeight:700,color:"#0A2B2B",margin:"0 0 4px"}}>Expense analysis</h1>
              <p style={{fontSize:13,color:"#9CA3AF"}}>Full year 2026 · All categories</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
              <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px"}}>
                <Sec>Annual expense breakdown</Sec>
                {expData.map(e=>(
                  <div key={e.key} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <span style={{width:8,height:8,borderRadius:2,background:e.color,flexShrink:0}}/>
                        <span style={{color:"#374151"}}>{e.name}</span>
                      </div>
                      <div style={{display:"flex",gap:14,alignItems:"center"}}>
                        <span style={{fontSize:11,color:"#9CA3AF"}}>{tao?((e.total/tao)*100).toFixed(1):"0"}%</span>
                        <span style={{color:"#0A2B2B",fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmt(e.total)}</span>
                      </div>
                    </div>
                    <div style={{height:5,background:"#F3F4F6",borderRadius:3}}><div style={{height:5,borderRadius:3,background:e.color,width:`${(e.total/maxExp)*100}%`}}/></div>
                  </div>
                ))}
              </div>
              <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px"}}>
                <Sec>Monthly cash out vs budget</Sec>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthly.map((m,i)=>({month:MONTHS[i],"Cash Out":Math.round(m.cashOut),"Budget":planOut[i]}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                    <XAxis dataKey="month" tick={{fill:"#9CA3AF",fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:"#9CA3AF",fontSize:11}} tickFormatter={fmt} axisLine={false} tickLine={false}/>
                    <Tooltip content={<TT/>} cursor={{fill:"rgba(239,68,68,0.05)"}}/>
                    <Bar dataKey="Cash Out" fill="#EF4444" radius={[4,4,0,0]}/>
                    <Bar dataKey="Budget" fill="#FCA5A5" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:14,padding:"20px 24px",overflowX:"auto"}}>
              <Sec>Monthly expense detail</Sec>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:900}}>
                <thead>
                  <tr>
                    <th style={{textAlign:"left",padding:"8px 10px",color:"#9CA3AF",fontWeight:600,borderBottom:"1px solid #F3F4F6"}}>Category</th>
                    {MONTHS.map(m=><th key={m} style={{textAlign:"right",padding:"8px 8px",color:"#9CA3AF",fontWeight:600,borderBottom:"1px solid #F3F4F6"}}>{m}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {expData.map(e=>(
                    <tr key={e.key} style={{borderBottom:"1px solid #F9FAFB"}}>
                      <td style={{padding:"7px 10px",color:"#374151",display:"flex",alignItems:"center",gap:6}}>
                        <span style={{width:6,height:6,borderRadius:1,background:e.color,flexShrink:0}}/>{e.name}
                      </td>
                      {monthlyExpenses.map((m,i)=>(
                        <td key={i} style={{padding:"7px 8px",textAlign:"right",color:(m[e.key]||0)>0?"#0A2B2B":"#E5E7EB",fontFamily:"'DM Mono',monospace"}}>
                          {(m[e.key]||0)>0?fmt(m[e.key]):"—"}
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
        *{box-sizing:border-box;} body{margin:0;background:#F8FAFB;} button{font-family:inherit;}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:#F9FAFB} ::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:3px}
      `}</style>
    </div>
  );
}
