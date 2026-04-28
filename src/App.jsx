import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const INITIAL_BILLS = [];

const DEFAULT_ACCOUNTS = [
  { id:"sueldo",    name:"Sueldo",    emoji:"💼", color:"#5AE89A" },
  { id:"freelance", name:"Freelance", emoji:"🎨", color:"#A07CFE" },
  { id:"efectivo",  name:"Efectivo",  emoji:"💵", color:"#C8A97E" },
  { id:"tarjeta",   name:"Tarjeta",   emoji:"💳", color:"#E87ACE" },
];

const DEFAULT_CATS_GASTO = [
  { name:"Comida",     emoji:"🍔", color:"#E8845A" },
  { name:"Transporte", emoji:"🚌", color:"#5A9BE8" },
  { name:"Salidas",    emoji:"🎉", color:"#C85AE8" },
  { name:"Ropa",       emoji:"👗", color:"#E85A8A" },
  { name:"Auto",       emoji:"🚗", color:"#5AE8B4" },
  { name:"Casa",       emoji:"🏠", color:"#E8D45A" },
  { name:"Salud",      emoji:"💊", color:"#5AE8E8" },
  { name:"Servicios",  emoji:"📱", color:"#A07CFE" },
  { name:"Regalos",    emoji:"🎁", color:"#E87ACE" },
  { name:"Otros",      emoji:"📦", color:"#888"    },
];
const DEFAULT_CATS_INGRESO = [
  { name:"Sueldo",     emoji:"💰", color:"#4CAF50" },
  { name:"Freelance",  emoji:"🎨", color:"#8BC34A" },
  { name:"Regalo",     emoji:"🎁", color:"#CDDC39" },
  { name:"Reposición", emoji:"↩️", color:"#5AE8E8" },
  { name:"Otros",      emoji:"✨", color:"#AED581" },
];

const MONTHS_ES   = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTHS_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const KEYS = {
  txns:"fv6-txns", bills:"fv6-bills", paid:"fv6-paid",
  accounts:"fv6-accounts", savings:"fv6-savings",
  usdRate:"fv6-usdrate", budget:"fv6-budget",
  cardSettings:"fv6-card", cardResumen:"fv6-resumen",
  catsGasto:"fv6-cats-gasto", catsIngreso:"fv6-cats-ingreso",
};
const EMOJIS_BILL = ["📋","🏠","💡","📱","🚗","💊","🎓","🛒","💈","🏋️","📺","🌐","🎵","🍕","🔥","🛡️","🖼️","🎬","🏰","🤖","🎨","✂️","🐾","✈️","🎮"];
const EMOJIS_ACC  = ["💼","🎨","💵","🏦","💳","🏠","📱","🚗","💡","🎓","🛒","✨","💎","🌟"];
const EMOJIS_CAT  = ["🍔","🚌","🎉","👗","🚗","🏠","💊","📱","🎁","📦","🎓","✈️","🐾","🎮","☕","🛒","💄","⚽","🎵","🔧","💅","🍕","🌿","🏋️","📚","🛁","🧹","🎨"];
const ACC_COLORS  = ["#5AE89A","#A07CFE","#C8A97E","#5A9BE8","#E8845A","#E85A8A","#5AE8E8","#E8D45A","#E87ACE","#4CAF50","#FF9800","#2196F3"];
const CAT_COLORS  = ["#E8845A","#5A9BE8","#C85AE8","#E85A8A","#5AE8B4","#E8D45A","#5AE8E8","#A07CFE","#E87ACE","#4CAF50","#FF9800","#2196F3","#8BC34A","#FF5722","#9C27B0","#607D8B"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt     = n => new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n);
const fmtUSD  = n => `US$ ${new Intl.NumberFormat("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)}`;
const fmtDate = d => { const dt=new Date(d+"T12:00:00"); return `${dt.getDate()} ${MONTHS_ES[dt.getMonth()]}`; };
const todayStr= () => new Date().toISOString().split("T")[0];
const daysUntil=(day,m,y)=>{ const due=new Date(y,m,day); return Math.ceil((due-new Date())/86400000); };
const getNow  =()=>{ const n=new Date(); return {m:n.getMonth(),y:n.getFullYear()}; };
const getNext =()=>{ const n=new Date(); n.setMonth(n.getMonth()+1); return {m:n.getMonth(),y:n.getFullYear()}; };
const getPrev =()=>{ const n=new Date(); n.setMonth(n.getMonth()-1); return {m:n.getMonth(),y:n.getFullYear()}; };
const paidKey =(id,m,y)=>{ const {m:cm,y:cy}=getNow(); return `${id}-${m!==undefined?m:cm}-${y!==undefined?y:cy}`; };
const resumenKey=(m,y)=>`resumen-${m}-${y}`;
// Months offset between two month/year pairs
const monthOffset=(m1,y1,m2,y2)=>(y2-y1)*12+(m2-m1);

async function dbLoad(key)     { try { const v=localStorage.getItem(key); return v?JSON.parse(v):null; } catch { return null; } }
async function dbSave(key,val) { try { localStorage.setItem(key,JSON.stringify(val)); } catch {} }

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,          setTab]         = useState("home");
  const [txns,         setTxns]        = useState([]);
  const [bills,        setBills]       = useState([]);
  const [paid,         setPaid]        = useState([]);
  const [cardResumen,  setCardResumen] = useState([]);
  const [accounts,     setAccounts]    = useState(DEFAULT_ACCOUNTS);
  const [savings,      setSavings]     = useState([]);
  const [catsGasto,    setCatsGasto]   = useState(DEFAULT_CATS_GASTO);
  const [catsIngreso,  setCatsIngreso] = useState(DEFAULT_CATS_INGRESO);
  const [usdRate,      setUsdRate]     = useState(1200);
  const [budget,       setBudget]      = useState(0);
  const [cardSettings, setCardSettings]= useState({closingDay:25,dueDay:1});
  const [loading,      setLoading]     = useState(true);
  const [isMobile,     setIsMobile]    = useState(window.innerWidth < 768);

  useEffect(()=>{
    const handleResize=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",handleResize);
    return ()=>window.removeEventListener("resize",handleResize);
  },[]);
  // Navigation
  const [modal,        setModal]       = useState(null);
  const [accountDetail,setAccountDetail]=useState(null); // accountId being viewed
  const [billsView,    setBillsView]   = useState("current");
  const [addType,      setAddType]     = useState("gasto");
  const [flash,        setFlash]       = useState(false);
  // Pay
  const [payWith,      setPayWith]     = useState({billId:null,accountId:""});
  const [resumenPayAcc,setResumenPayAcc]=useState("");
  // Edit targets
  const [editingTxn,   setEditingTxn] = useState(null);
  const [editingBill,  setEditingBill]= useState(null);
  const [editingAcc,   setEditingAcc] = useState(null);
  const [editingCat,   setEditingCat] = useState(null); // {type,idx}

  // Forms
  const emptyTxn = {amount:"",category:"",description:"",date:todayStr(),accountId:"",currency:"ARS",frequency:"once",installments:"",installmentAmountType:"perInstallment"};
  const emptyBill= {name:"",emoji:"📋",amount:"",dueDay:"",isCard:false,accountId:"",installments:"",installmentCurrent:"1"};
  const emptyAcc = {name:"",emoji:"💼",color:"#5AE89A"};
  const emptySav = {name:"",goal:"",saved:""};
  const emptyCat = {name:"",emoji:"🍔",color:"#E8845A"};
  const [txnForm,  setTxnForm]  = useState(emptyTxn);
  const [billForm, setBillForm] = useState(emptyBill);
  const [accForm,  setAccForm]  = useState(emptyAcc);
  const [savForm,  setSavForm]  = useState(emptySav);
  const [catForm,  setCatForm]  = useState(emptyCat);
  const [addSavId, setAddSavId] = useState(null);
  const [addSavAmt,setAddSavAmt]= useState("");
  const [tempRate, setTempRate] = useState("");
  const [tempBudget,setTempBudget]=useState("");
  const [tempCard, setTempCard] = useState({closingDay:"",dueDay:""});

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(()=>{
    (async()=>{
      const [t,b,p,a,s,r,bg,cs,cr,cg,ci]=await Promise.all([
        dbLoad(KEYS.txns),dbLoad(KEYS.bills),dbLoad(KEYS.paid),
        dbLoad(KEYS.accounts),dbLoad(KEYS.savings),dbLoad(KEYS.usdRate),
        dbLoad(KEYS.budget),dbLoad(KEYS.cardSettings),dbLoad(KEYS.cardResumen),
        dbLoad(KEYS.catsGasto),dbLoad(KEYS.catsIngreso),
      ]);
      if(t) setTxns(t); if(p) setPaid(p); if(s) setSavings(s);
      if(r) setUsdRate(r); if(bg) setBudget(bg); if(cs) setCardSettings(cs);
      if(cr) setCardResumen(cr); if(cg) setCatsGasto(cg); if(ci) setCatsIngreso(ci);
      const baseAccs=a||DEFAULT_ACCOUNTS;
      const hasTarjeta=baseAccs.some(ac=>ac.id==="tarjeta");
      const finalAccs=hasTarjeta?baseAccs:[...baseAccs,{id:"tarjeta",name:"Tarjeta",emoji:"💳",color:"#E87ACE"}];
      setAccounts(finalAccs);
      if(!a||!hasTarjeta) await dbSave(KEYS.accounts,finalAccs);
      const rawBills=b||INITIAL_BILLS;
      const migrated=rawBills.map(bill=>bill.isCard&&(!bill.accountId||bill.accountId==="")?{...bill,accountId:"tarjeta"}:bill);
      setBills(migrated);
      if(!b||JSON.stringify(rawBills)!==JSON.stringify(migrated)) await dbSave(KEYS.bills,migrated);
      setLoading(false);
    })();
  },[]);

  // ── Core helpers ──────────────────────────────────────────────────────────
  const doFlash   = ()=>{ setFlash(true); setTimeout(()=>setFlash(false),1200); };
  const isPaid    = (id,m,y)=>paid.includes(paidKey(id,m,y));
  const toARS     = t=>t.currency==="USD"?t.amount*usdRate:t.amount;
  const closeModal= ()=>{
    setModal(null); setEditingTxn(null); setEditingBill(null); setEditingAcc(null); setEditingCat(null);
    setTxnForm(emptyTxn); setBillForm(emptyBill); setAccForm(emptyAcc); setSavForm(emptySav); setCatForm(emptyCat);
    setPayWith({billId:null,accountId:""}); setResumenPayAcc("");
    setTempRate(""); setTempBudget(""); setTempCard({closingDay:"",dueDay:""});
    setAddSavId(null); setAddSavAmt("");
  };

  // ── Month refs ─────────────────────────────────────────────────────────────
  const {m:CM,y:CY}=getNow();
  const {m:NM,y:NY}=getNext();
  const {m:PM,y:PY}=getPrev();

  // ── Card bills active this month ───────────────────────────────────────────
  // A card bill with installments only appears if its installmentStartMonth+offset <= CM
  const isCardBillActiveInMonth=(bill,m,y)=>{
    if(!bill.isCard) return false;
    if(bill.installments===null) return true; // fixed monthly
    // installment: starts the month AFTER the charge month
    const sm=bill.installmentStartMonth!==null?bill.installmentStartMonth:m;
    const sy=bill.installmentStartYear!==null?bill.installmentStartYear:y;
    const offset=monthOffset(sm,sy,m,y);
    if(offset<1) return false; // not yet started (first installment is next month after charge)
    const installmentNumber=offset; // installment #1 is 1 month after start
    return installmentNumber<=bill.installments;
  };
  const getInstallmentNumber=(bill,m,y)=>{
    if(!bill.installments) return null;
    const sm=bill.installmentStartMonth!==null?bill.installmentStartMonth:m;
    const sy=bill.installmentStartYear!==null?bill.installmentStartYear:y;
    return monthOffset(sm,sy,m,y);
  };

  const activeCardBillsThisMonth = bills.filter(b=>isCardBillActiveInMonth(b,CM,CY));
  const cardBillsTotal = activeCardBillsThisMonth.reduce((s,b)=>s+b.amount,0);

  // Prev month card charges (what's due this month)
  const activeCardBillsPrevMonth = bills.filter(b=>isCardBillActiveInMonth(b,PM,PY));
  const prevResumenAmount = activeCardBillsPrevMonth.reduce((s,b)=>s+b.amount,0)
    + txns.filter(t=>{if(t.type!=="gasto"||t.accountId!=="tarjeta")return false;const dt=new Date(t.date+"T12:00:00");return dt.getMonth()===PM&&dt.getFullYear()===PY;}).reduce((s,t)=>s+toARS(t),0);

  // Next month card charges (accumulating now)
  const currAccumulating = cardBillsTotal
    + txns.filter(t=>{if(t.type!=="gasto"||t.accountId!=="tarjeta")return false;const dt=new Date(t.date+"T12:00:00");return dt.getMonth()===CM&&dt.getFullYear()===CY;}).reduce((s,t)=>s+toARS(t),0);

  const prevResumenKey_ = resumenKey(PM,PY);
  const prevResumenPaid = cardResumen.includes(prevResumenKey_);
  const resumenDueDay   = cardSettings.dueDay;
  const resumenDaysLeft = daysUntil(resumenDueDay,CM,CY);

  // ── Regular bills ─────────────────────────────────────────────────────────
  const regularBills = bills.filter(b=>!b.isCard);
  const regularBillsSorted = [...regularBills]
    .filter(b=>b.installments===null||b.installmentCurrent<=b.installments)
    .sort((a,b2)=>a.dueDay-b2.dueDay);
  const pendingRegularBills = regularBillsSorted.filter(b=>!isPaid(b.id,CM,CY));
  const pendingTotal = pendingRegularBills.reduce((s,b)=>s+b.amount,0)+(prevResumenPaid?0:prevResumenAmount);
  const monthlyFixedTotal = bills.filter(b=>{
    if(b.isCard) return isCardBillActiveInMonth(b,CM,CY);
    return b.installments===null||b.installmentCurrent<=b.installments;
  }).reduce((s,b)=>s+b.amount,0);

  // Urgent
  const urgentRegular = pendingRegularBills.filter(b=>daysUntil(b.dueDay,CM,CY)<=5).sort((a,b2)=>daysUntil(a.dueDay,CM,CY)-daysUntil(b2.dueDay,CM,CY));
  const resumenIsUrgent = !prevResumenPaid && resumenDaysLeft<=5 && prevResumenAmount>0;

  // ── Balances ───────────────────────────────────────────────────────────────
  const totalIn  = txns.filter(t=>t.type==="ingreso").reduce((s,t)=>s+toARS(t),0);
  const totalOut = txns.filter(t=>t.type==="gasto").reduce((s,t)=>s+toARS(t),0);
  const txnBalance = totalIn-totalOut;
  const realBalance= txnBalance-pendingTotal;

  const accountBalance=(accId)=>{
    const inc=txns.filter(t=>t.type==="ingreso"&&t.accountId===accId).reduce((s,t)=>s+toARS(t),0);
    const out=txns.filter(t=>t.type==="gasto"&&t.accountId===accId).reduce((s,t)=>s+toARS(t),0);
    if(accId==="tarjeta"){return inc-out-(prevResumenPaid?0:prevResumenAmount);}
    const debt=regularBills.filter(b=>b.accountId===accId&&!isPaid(b.id,CM,CY)&&(b.installments===null||b.installmentCurrent<=b.installments)).reduce((s,b)=>s+b.amount,0);
    return inc-out-debt;
  };

  const thisMonthSpend = txns.filter(t=>{
    if(t.type!=="gasto") return false;
    const dt=new Date(t.date+"T12:00:00");
    return dt.getMonth()===CM&&dt.getFullYear()===CY;
  }).reduce((s,t)=>s+toARS(t),0)+regularBills.filter(b=>isPaid(b.id,CM,CY)).reduce((s,b)=>s+b.amount,0);
  const budgetPct=budget>0?Math.min(120,Math.round((thisMonthSpend/budget)*100)):0;

  // ── 12-month chart ─────────────────────────────────────────────────────────
  const last12=Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(11-i));return{m:d.getMonth(),y:d.getFullYear(),label:MONTHS_ES[d.getMonth()]};});
  const monthlyChartData=last12.map(({m,y,label})=>{
    const txnSpend=txns.filter(t=>{if(t.type!=="gasto"||t.accountId==="tarjeta")return false;const dt=new Date(t.date+"T12:00:00");return dt.getMonth()===m&&dt.getFullYear()===y;}).reduce((s,t)=>s+toARS(t),0);
    const billSpend=regularBills.filter(b=>paid.includes(paidKey(b.id,m,y))).reduce((s,b)=>s+b.amount,0);
    const cardTxn=txns.filter(t=>{if(t.type!=="gasto"||t.accountId!=="tarjeta")return false;const dt=new Date(t.date+"T12:00:00");return dt.getMonth()===m&&dt.getFullYear()===y;}).reduce((s,t)=>s+toARS(t),0);
    const cardFixed=bills.filter(b=>isCardBillActiveInMonth(b,m,y)).reduce((s,b)=>s+b.amount,0);
    return{label,txns:Math.round(txnSpend/1000)*1000,bills:Math.round(billSpend/1000)*1000,card:Math.round((cardFixed+cardTxn)/1000)*1000};
  });

  // Category spending chart
  const gatosCatData=catsGasto.map(c=>({
    ...c,total:txns.filter(t=>t.type==="gasto"&&t.category===c.name).reduce((s,t)=>s+toARS(t),0)
  })).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);

  // ── CRUD: Transactions ────────────────────────────────────────────────────
  const addTxn=async()=>{
    if(!txnForm.amount||!txnForm.accountId) return;
    if(txnForm.frequency==="monthly"){
      if(!txnForm.description) return;
      const day=parseInt(txnForm.date)||15;
      const isCard=txnForm.accountId==="tarjeta";
      const b={id:Date.now(),name:txnForm.description,emoji:"📋",amount:parseFloat(txnForm.amount),dueDay:day,isCard,accountId:txnForm.accountId,installments:null,installmentCurrent:null,installmentStartMonth:null,installmentStartYear:null};
      const u=[...bills,b]; setBills(u); await dbSave(KEYS.bills,u); doFlash(); closeModal(); return;
    }
    if(txnForm.frequency==="installments"&&txnForm.installments){
      // Amount type: total or per installment
      const totalInstallments=parseInt(txnForm.installments);
      let perInstallment=parseFloat(txnForm.amount);
      if(txnForm.installmentAmountType==="total") perInstallment=Math.round(perInstallment/totalInstallments);
      const isCard=txnForm.accountId==="tarjeta";
      // Start month: if card, first installment = next month after charge date
      const chargeDate=new Date(txnForm.date+"T12:00:00");
      const startM=isCard?chargeDate.getMonth():chargeDate.getMonth();
      const startY=isCard?chargeDate.getFullYear():chargeDate.getFullYear();
      const day=chargeDate.getDate()||1;
      const b={id:Date.now(),name:txnForm.description||txnForm.category,emoji:"💳",amount:perInstallment,dueDay:day,isCard,accountId:txnForm.accountId,installments:totalInstallments,installmentCurrent:1,installmentStartMonth:startM,installmentStartYear:startY};
      const u=[...bills,b]; setBills(u); await dbSave(KEYS.bills,u); doFlash(); closeModal(); return;
    }
    if(!txnForm.category) return;
    const t={id:Date.now(),type:addType,amount:parseFloat(txnForm.amount),category:txnForm.category,description:txnForm.description,date:txnForm.date,accountId:txnForm.accountId,currency:txnForm.currency||"ARS"};
    const u=[t,...txns]; setTxns(u); await dbSave(KEYS.txns,u); doFlash(); closeModal();
  };
  const delTxn=async id=>{
    const txn=txns.find(t=>t.id===id);
    const u=txns.filter(t=>t.id!==id); setTxns(u); await dbSave(KEYS.txns,u);
    if(!txn) return;

    // Determine the month/year of this transaction
    const txnDate = new Date(txn.date+"T12:00:00");
    const txnM = txnDate.getMonth();
    const txnY = txnDate.getFullYear();

    let newPaid = [...paid];
    let newResumen = [...cardResumen];

    // Strategy 1: use stored _billId metadata (new transactions)
    if(txn._billId!==undefined){
      const key=`${txn._billId}-${txn._paidM}-${txn._paidY}`;
      newPaid = newPaid.filter(k=>k!==key);
    }

    // Strategy 2: match by description "Pago: {bill.name}" (old + new transactions)
    if(txn.description&&txn.description.startsWith("Pago: ")){
      const billName = txn.description.replace("Pago: ","");
      // Find bills whose name matches
      const matchingBills = bills.filter(b=>b.name===billName);
      matchingBills.forEach(b=>{
        // Remove paidKey for the month of the transaction
        const key=`${b.id}-${txnM}-${txnY}`;
        newPaid = newPaid.filter(k=>k!==key);
      });
    }

    // Strategy 3: card resumen — stored key (new transactions)
    if(txn._cardResumenKey){
      newResumen = newResumen.filter(k=>k!==txn._cardResumenKey);
    }

    // Strategy 4: card resumen — match by description (old transactions)
    if(txn.description&&txn.description.startsWith("Resumen Tarjeta")){
      // The resumen paid in month txnM/txnY corresponds to the previous month's charges
      const prevM = txnM===0?11:txnM-1;
      const prevY = txnM===0?txnY-1:txnY;
      const rKey = `resumen-${prevM}-${prevY}`;
      newResumen = newResumen.filter(k=>k!==rKey);
    }

    if(newPaid.length!==paid.length){ setPaid(newPaid); await dbSave(KEYS.paid,newPaid); }
    if(newResumen.length!==cardResumen.length){ setCardResumen(newResumen); await dbSave(KEYS.cardResumen,newResumen); }
  };
  const startEditTxn=(txn)=>{ setEditingTxn(txn.id); setTxnForm({amount:String(txn.amount),category:txn.category||"",description:txn.description||"",date:txn.date,accountId:txn.accountId||"",currency:txn.currency||"ARS",frequency:"once",installments:"",installmentAmountType:"perInstallment"}); setAddType(txn.type); setModal("editTxn"); };
  const saveTxnEdit=async()=>{
    if(!txnForm.amount||!txnForm.accountId||!txnForm.category) return;
    const u=txns.map(t=>t.id===editingTxn?{...t,amount:parseFloat(txnForm.amount),category:txnForm.category,description:txnForm.description,date:txnForm.date,accountId:txnForm.accountId,currency:txnForm.currency}:t);
    setTxns(u); await dbSave(KEYS.txns,u); doFlash(); closeModal();
  };

  // ── CRUD: Bills ────────────────────────────────────────────────────────────
  const addBill=async()=>{
    if(!billForm.name||!billForm.amount||!billForm.dueDay) return;
    const hasInst=billForm.installments&&parseInt(billForm.installments)>0;
    const b={id:Date.now(),name:billForm.name,emoji:billForm.emoji,amount:parseFloat(billForm.amount),dueDay:parseInt(billForm.dueDay),isCard:billForm.isCard,accountId:billForm.isCard?"tarjeta":(billForm.accountId||""),installments:hasInst?parseInt(billForm.installments):null,installmentCurrent:hasInst?parseInt(billForm.installmentCurrent):null,installmentStartMonth:null,installmentStartYear:null};
    const u=[...bills,b]; setBills(u); await dbSave(KEYS.bills,u); doFlash(); closeModal();
  };
  const delBill=async id=>{ const u=bills.filter(b=>b.id!==id); setBills(u); await dbSave(KEYS.bills,u); };
  const startEditBill=(bill)=>{ setEditingBill(bill.id); setBillForm({name:bill.name,emoji:bill.emoji,amount:String(bill.amount),dueDay:String(bill.dueDay),isCard:bill.isCard,accountId:bill.accountId||"",installments:bill.installments?String(bill.installments):"",installmentCurrent:bill.installmentCurrent?String(bill.installmentCurrent):"1"}); setModal("editBill"); };
  const saveBillEdit=async()=>{
    if(!billForm.name||!billForm.amount||!billForm.dueDay) return;
    const hasInst=billForm.installments&&parseInt(billForm.installments)>0;
    const u=bills.map(b=>b.id===editingBill?{...b,name:billForm.name,emoji:billForm.emoji,amount:parseFloat(billForm.amount),dueDay:parseInt(billForm.dueDay),isCard:billForm.isCard,accountId:billForm.isCard?"tarjeta":(billForm.accountId||""),installments:hasInst?parseInt(billForm.installments):null,installmentCurrent:hasInst?parseInt(billForm.installmentCurrent):null}:b);
    setBills(u); await dbSave(KEYS.bills,u); doFlash(); closeModal();
  };

  // ── Toggle paid ────────────────────────────────────────────────────────────
  const togglePaid=async(billId,fromAccountId,m,y)=>{
    const key=paidKey(billId,m,y);
    if(paid.includes(key)){ const u=paid.filter(k=>k!==key); setPaid(u); await dbSave(KEYS.paid,u); }
    else{
      const u=[...paid,key]; setPaid(u); await dbSave(KEYS.paid,u);
      const bill=bills.find(b=>b.id===billId);
      if(bill&&fromAccountId&&fromAccountId!=="none"){
        const txn={id:Date.now(),type:"gasto",amount:bill.amount,category:"Servicios",description:`Pago: ${bill.name}`,date:todayStr(),accountId:fromAccountId,currency:"ARS",_billId:billId,_paidM:m!==undefined?m:CM,_paidY:y!==undefined?y:CY};
        const tu=[txn,...txns]; setTxns(tu); await dbSave(KEYS.txns,tu);
      }
    }
    setPayWith({billId:null,accountId:""});
  };

  // ── Pay card resumen ───────────────────────────────────────────────────────
  const payCardResumen=async(fromAccountId,rKey,rAmount)=>{
    const u=[...cardResumen,rKey]; setCardResumen(u); await dbSave(KEYS.cardResumen,u);
    if(fromAccountId&&fromAccountId!=="none"){
      const txn={id:Date.now(),type:"gasto",amount:rAmount,category:"Servicios",description:`Resumen Tarjeta ${MONTHS_FULL[PM]}`,date:todayStr(),accountId:fromAccountId,currency:"ARS",_cardResumenKey:rKey};
      const tu=[txn,...txns]; setTxns(tu); await dbSave(KEYS.txns,tu);
    }
    doFlash(); setResumenPayAcc(""); setModal(null);
  };

  // ── CRUD: Accounts ─────────────────────────────────────────────────────────
  const addAccount=async()=>{ if(!accForm.name) return; const a={id:Date.now().toString(),name:accForm.name,emoji:accForm.emoji,color:accForm.color}; const u=[...accounts,a]; setAccounts(u); await dbSave(KEYS.accounts,u); doFlash(); closeModal(); };
  const delAccount=async id=>{ const u=accounts.filter(a=>a.id!==id); setAccounts(u); await dbSave(KEYS.accounts,u); };
  const startEditAcc=(acc)=>{ setEditingAcc(acc.id); setAccForm({name:acc.name,emoji:acc.emoji,color:acc.color}); setModal("editAcc"); };
  const saveAccEdit=async()=>{
    const u=accounts.map(a=>a.id===editingAcc?{...a,name:accForm.name,emoji:accForm.emoji,color:accForm.color}:a);
    setAccounts(u); await dbSave(KEYS.accounts,u); doFlash(); closeModal();
  };

  // ── CRUD: Savings ──────────────────────────────────────────────────────────
  const addSaving=async()=>{ if(!savForm.name||!savForm.goal) return; const s={id:Date.now().toString(),name:savForm.name,goal:parseFloat(savForm.goal),saved:parseFloat(savForm.saved||0)}; const u=[...savings,s]; setSavings(u); await dbSave(KEYS.savings,u); doFlash(); closeModal(); };
  const addToSaving=async()=>{ if(!addSavId||!addSavAmt) return; const u=savings.map(s=>s.id===addSavId?{...s,saved:s.saved+parseFloat(addSavAmt)}:s); setSavings(u); await dbSave(KEYS.savings,u); setAddSavId(null); setAddSavAmt(""); };
  const delSaving=async id=>{ const u=savings.filter(s=>s.id!==id); setSavings(u); await dbSave(KEYS.savings,u); };

  // ── CRUD: Categories ───────────────────────────────────────────────────────
  const addCat=async(type)=>{
    if(!catForm.name) return;
    const cat={name:catForm.name,emoji:catForm.emoji,color:catForm.color};
    if(type==="gasto"){ const u=[...catsGasto,cat]; setCatsGasto(u); await dbSave(KEYS.catsGasto,u); }
    else { const u=[...catsIngreso,cat]; setCatsIngreso(u); await dbSave(KEYS.catsIngreso,u); }
    doFlash(); closeModal();
  };
  const delCat=async(type,idx)=>{
    if(type==="gasto"){ const u=catsGasto.filter((_,i)=>i!==idx); setCatsGasto(u); await dbSave(KEYS.catsGasto,u); }
    else { const u=catsIngreso.filter((_,i)=>i!==idx); setCatsIngreso(u); await dbSave(KEYS.catsIngreso,u); }
  };
  const startEditCat=(type,idx)=>{
    const cat=type==="gasto"?catsGasto[idx]:catsIngreso[idx];
    setEditingCat({type,idx}); setCatForm({name:cat.name,emoji:cat.emoji,color:cat.color}); setModal("editCat");
  };
  const saveCatEdit=async()=>{
    const {type,idx}=editingCat;
    if(type==="gasto"){ const u=catsGasto.map((c,i)=>i===idx?{...c,...catForm}:c); setCatsGasto(u); await dbSave(KEYS.catsGasto,u); }
    else { const u=catsIngreso.map((c,i)=>i===idx?{...c,...catForm}:c); setCatsIngreso(u); await dbSave(KEYS.catsIngreso,u); }
    doFlash(); closeModal();
  };

  // ── Misc saves ─────────────────────────────────────────────────────────────
  const saveRate=async()=>{ const n=parseFloat(tempRate); if(!n||n<=0) return; setUsdRate(n); await dbSave(KEYS.usdRate,n); doFlash(); closeModal(); };
  const saveBudget=async()=>{ const n=parseFloat(tempBudget); if(!n||n<=0) return; setBudget(n); await dbSave(KEYS.budget,n); doFlash(); closeModal(); };
  const saveCardSettings_=async()=>{ const s={closingDay:parseInt(tempCard.closingDay)||25,dueDay:parseInt(tempCard.dueDay)||1}; setCardSettings(s); await dbSave(KEYS.cardSettings,s); doFlash(); closeModal(); };

  // ─── STYLES ────────────────────────────────────────────────────────────────
  const C={gold:"#C8A97E",red:"#E85A5A",green:"#5AE89A",blue:"#5A9BE8",pink:"#E87ACE",purple:"#A07CFE",bg:"#0D0D12",text:"#EDE9E3"};
  const S={
    app:   (mob)=>mob?{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"Georgia,serif",maxWidth:430,margin:"0 auto",paddingBottom:80}:{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"Georgia,serif",display:"flex"},
    content:{flex:1,overflowY:"auto",paddingBottom:20},
    hdr:   {padding:"24px 20px 12px",borderBottom:"1px solid rgba(200,169,126,0.1)"},
    ey:    {fontSize:11,letterSpacing:4,color:C.gold,textTransform:"uppercase",marginBottom:2},
    h1:    {fontSize:22,margin:0,fontWeight:"normal"},
    gCard: (ex={})=>({background:"linear-gradient(135deg,#1A1208,#221808)",border:"1px solid rgba(200,169,126,0.25)",borderRadius:20,padding:"20px 22px",margin:"14px 14px 0",...ex}),
    card:  (ex={})=>({background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:16,margin:"10px 14px 0",...ex}),
    alertC:{background:"rgba(232,90,90,0.07)",border:"1px solid rgba(232,90,90,0.22)",borderRadius:16,padding:"14px 16px",margin:"10px 14px 0"},
    pinkC: {background:"rgba(232,122,206,0.07)",border:"1px solid rgba(232,122,206,0.22)",borderRadius:16,padding:"14px 16px",margin:"10px 14px 0"},
    sec:   {fontSize:10,letterSpacing:4,color:C.gold,textTransform:"uppercase",padding:"18px 20px 10px"},
    lbl:   {fontSize:10,letterSpacing:3,color:C.gold,textTransform:"uppercase",display:"block",marginBottom:7},
    inp:   {width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(200,169,126,0.18)",borderRadius:11,padding:"13px 14px",color:C.text,fontSize:15,fontFamily:"Georgia,serif",boxSizing:"border-box",outline:"none"},
    row:   {display:"flex",alignItems:"center",gap:10},
    tRow:  {display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16},
    tRow3: {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16},
    tBtn:  (a,col)=>({padding:10,borderRadius:11,border:`1px solid ${a?col:"rgba(255,255,255,0.09)"}`,background:a?`${col}22`:"transparent",color:a?col:"#555",fontSize:12,cursor:"pointer",fontFamily:"Georgia,serif",textAlign:"center"}),
    cGrid: {display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:16},
    cBtn:  (a,col)=>({padding:"9px 3px",borderRadius:11,border:`1px solid ${a?col:"rgba(255,255,255,0.07)"}`,background:a?`${col}1A`:"rgba(255,255,255,0.02)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}),
    sub:   (col=C.gold)=>({width:"100%",padding:15,borderRadius:13,background:col,border:"none",color:C.bg,fontSize:15,fontFamily:"Georgia,serif",cursor:"pointer"}),
    txRow: {display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"},
    eBox:  bg=>({width:40,height:40,borderRadius:11,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}),
    chk:   done=>({width:28,height:28,borderRadius:8,border:`2px solid ${done?C.green:"#333"}`,background:done?"rgba(90,232,154,0.12)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:15,color:C.green}),
    tog:   on=>({width:46,height:24,borderRadius:12,background:on?C.gold:"#222",border:"none",cursor:"pointer",position:"relative",flexShrink:0}),
    togDot:on=>({position:"absolute",top:3,left:on?25:3,width:18,height:18,borderRadius:"50%",background:on?C.bg:"#555",transition:"left 0.2s"}),
    nav:   (mob)=>mob?{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:C.bg,borderTop:"1px solid rgba(200,169,126,0.1)",display:"flex",justifyContent:"space-around",padding:"10px 0 14px",zIndex:50}:{display:"none"},
    sidebar:{width:200,background:"#111118",borderRight:"1px solid rgba(200,169,126,0.15)",display:"flex",flexDirection:"column",padding:"24px 0",flexShrink:0,minHeight:"100vh"},
    nBtn:  a=>({background:"none",border:"none",color:a?C.gold:"#333",fontSize:10,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"0 8px"}),
    sBtn:  a=>({padding:"10px 20px",background:a?"rgba(200,169,126,0.1)":"transparent",borderLeft:a?"2px solid #C8A97E":"2px solid transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:10,border:"none",width:"100%",textAlign:"left",color:a?C.gold:"#666",fontSize:13,fontFamily:"Georgia,serif"}),
    modal: {position:"fixed",inset:0,background:C.bg,zIndex:200,overflowY:"auto",maxWidth:430,margin:"0 auto"},
    fab:   {position:"fixed",bottom:22,right:20,width:52,height:52,borderRadius:"50%",background:C.gold,border:"none",fontSize:26,color:C.bg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(200,169,126,0.35)",zIndex:99},
    xBtn:  {background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:16,padding:"0 2px",flexShrink:0},
    penBtn:{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0},
    back:  {background:"none",border:"none",color:C.gold,fontSize:22,cursor:"pointer"},
  };
  const NAV=[["home","🏠","Inicio"],["bills","📋","Pagos"],["accounts","💳","Cuentas"],["insights","📊","Análisis"]];

  // ── Day badge ──────────────────────────────────────────────────────────────
  const dayBadge=(dueDay,done,m,y)=>{
    if(done) return <span style={{fontSize:10,color:C.green}}>✓ Pagado</span>;
    const d=daysUntil(dueDay,m,y);
    let color,bg,label;
    if(d<0)     {color=C.red;bg="rgba(232,90,90,0.15)";label=`⚠️ Venció hace ${Math.abs(d)}d (día ${dueDay})`;}
    else if(d===0){color=C.red;bg="rgba(232,90,90,0.15)";label=`🔴 Vence HOY — día ${dueDay}`;}
    else if(d===1){color:"#E8844A";bg="rgba(232,132,74,0.14)";label=`🟠 Mañana — día ${dueDay}`;}
    else if(d<=3){color:"#E8A45A";bg="rgba(232,164,90,0.12)";label=`🟡 ${d} días — día ${dueDay}`;}
    else if(d<=5){color:"#D4C040";bg="rgba(212,192,64,0.1)";label=`⏰ ${d} días — día ${dueDay}`;}
    else        {color:"#555";bg="rgba(80,80,80,0.1)";label=`Día ${dueDay}`;}
    return <span style={{background:bg,border:`1px solid ${color}55`,borderRadius:6,padding:"2px 8px",color,fontSize:10}}>{label}</span>;
  };

  const AccPills=({selected,onSelect,showNone=false,exclude=[]})=>(
    <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
      {accounts.filter(a=>!exclude.includes(a.id)).map(a=><button key={a.id} onClick={()=>onSelect(a.id)} style={{padding:"7px 11px",borderRadius:10,border:`1px solid ${selected===a.id?a.color:"rgba(255,255,255,0.08)"}`,background:selected===a.id?`${a.color}22`:"rgba(255,255,255,0.02)",color:selected===a.id?a.color:"#666",fontSize:12,cursor:"pointer",fontFamily:"Georgia"}}>{a.emoji} {a.name}</button>)}
      {showNone&&<button onClick={()=>onSelect("none")} style={{padding:"7px 11px",borderRadius:10,border:`1px solid ${selected==="none"?"#888":"rgba(255,255,255,0.08)"}`,background:selected==="none"?"rgba(128,128,128,0.12)":"rgba(255,255,255,0.02)",color:selected==="none"?"#AAA":"#555",fontSize:12,cursor:"pointer",fontFamily:"Georgia"}}>Sin registrar</button>}
    </div>
  );

  // ── Shared bill form body ──────────────────────────────────────────────────
  const BillFormBody=({onSave,saveLabel})=>(
    <>
      <label style={S.lbl}>Nombre</label>
      <input style={{...S.inp,marginBottom:12}} type="text" placeholder="ej: Netflix…" value={billForm.name} onChange={e=>setBillForm(f=>({...f,name:e.target.value}))}/>
      <label style={S.lbl}>Ícono</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>{EMOJIS_BILL.map(e=><button key={e} onClick={()=>setBillForm(f=>({...f,emoji:e}))} style={{width:38,height:38,borderRadius:9,border:`1px solid ${billForm.emoji===e?C.gold:"rgba(255,255,255,0.08)"}`,background:billForm.emoji===e?"rgba(200,169,126,0.15)":"rgba(255,255,255,0.03)",fontSize:20,cursor:"pointer"}}>{e}</button>)}</div>
      <label style={S.lbl}>Monto mensual</label>
      <input style={{...S.inp,fontSize:24,textAlign:"center",marginBottom:12}} type="number" placeholder="$ 0" value={billForm.amount} onChange={e=>setBillForm(f=>({...f,amount:e.target.value}))}/>
      <div style={{...S.row,marginBottom:12,background:"rgba(232,122,206,0.08)",border:"1px solid rgba(232,122,206,0.2)",borderRadius:12,padding:"12px 14px"}}>
        <span style={{fontSize:13,color:C.pink,flex:1}}>💳 Es cargo de tarjeta</span>
        <button style={S.tog(billForm.isCard)} onClick={()=>setBillForm(f=>({...f,isCard:!f.isCard}))}><div style={S.togDot(billForm.isCard)}/></button>
      </div>
      <label style={S.lbl}>Día de vencimiento</label>
      <input style={{...S.inp,marginBottom:12}} type="number" min="1" max="31" placeholder="ej: 15" value={billForm.dueDay} onChange={e=>setBillForm(f=>({...f,dueDay:e.target.value}))}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div><label style={{...S.lbl,marginBottom:4}}>Cuota actual</label><input style={S.inp} type="number" min="1" placeholder="–" value={billForm.installmentCurrent} onChange={e=>setBillForm(f=>({...f,installmentCurrent:e.target.value}))}/></div>
        <div><label style={{...S.lbl,marginBottom:4}}>Total cuotas</label><input style={S.inp} type="number" min="1" placeholder="–" value={billForm.installments} onChange={e=>setBillForm(f=>({...f,installments:e.target.value}))}/></div>
      </div>
      {!billForm.isCard&&<><label style={S.lbl}>Cuenta</label><AccPills selected={billForm.accountId} onSelect={id=>setBillForm(f=>({...f,accountId:id}))}/></>}
      <button style={{...S.sub(),marginTop:8}} onClick={onSave}>{flash?"✅ Guardado":saveLabel}</button>
    </>
  );

  // ── Account form body ──────────────────────────────────────────────────────
  const AccFormBody=({onSave,saveLabel})=>(
    <>
      <label style={S.lbl}>Nombre</label>
      <input style={{...S.inp,marginBottom:14}} type="text" placeholder="ej: Banco…" value={accForm.name} onChange={e=>setAccForm(f=>({...f,name:e.target.value}))}/>
      <label style={S.lbl}>Ícono</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{EMOJIS_ACC.map(e=><button key={e} onClick={()=>setAccForm(f=>({...f,emoji:e}))} style={{width:40,height:40,borderRadius:10,border:`1px solid ${accForm.emoji===e?C.gold:"rgba(255,255,255,0.08)"}`,background:accForm.emoji===e?"rgba(200,169,126,0.15)":"rgba(255,255,255,0.03)",fontSize:22,cursor:"pointer"}}>{e}</button>)}</div>
      <label style={S.lbl}>Color</label>
      <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap"}}>{ACC_COLORS.map(c=><button key={c} onClick={()=>setAccForm(f=>({...f,color:c}))} style={{width:32,height:32,borderRadius:"50%",background:c,border:accForm.color===c?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>)}</div>
      <button style={S.sub()} onClick={onSave}>{flash?"✅ Guardado":saveLabel}</button>
    </>
  );

  // Sidebar component for desktop
  const Sidebar = () => (
    <div style={S.sidebar}>
      <div style={{padding:"0 20px 20px",borderBottom:"1px solid rgba(200,169,126,0.1)"}}>
        <div style={{fontSize:9,letterSpacing:3,color:C.gold,textTransform:"uppercase",marginBottom:4}}>Mis finanzas</div>
        <div style={{fontSize:14,color:C.text}}>{MONTHS_FULL[CM]}</div>
      </div>
      <nav style={{padding:"16px 0",flex:1}}>
        {NAV.map(([t,e,l])=>(
          <button key={t} style={S.sBtn(tab===t)} onClick={()=>setTab(t)}>
            <span style={{fontSize:16}}>{e}</span>
            <span>{l}</span>
          </button>
        ))}
      </nav>
      <div style={{padding:"16px 20px"}}>
        <button onClick={()=>setModal("txn")} style={{width:"100%",padding:"12px",borderRadius:10,background:"rgba(200,169,126,0.15)",border:"1px solid rgba(200,169,126,0.3)",color:C.gold,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>+ Nuevo movimiento</button>
      </div>
    </div>
  );

  if(loading) return <div style={{...S.app(isMobile),display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><span style={{color:C.gold}}>Cargando…</span></div>;

  // ══════════════════════════════════════════════════════════════════════════
  // MODALES
  // ══════════════════════════════════════════════════════════════════════════

  // ── Add/Edit Transaction ──────────────────────────────────────────────────
  const TxnModalBody=({onSave,saveLabel,isEdit=false})=>(
    <div style={{padding:"28px 20px"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>{isEdit?"Editar movimiento":"Nuevo movimiento"}</div></div>
      <div style={S.tRow}>
        <button style={S.tBtn(addType==="gasto","#E87A5A")} onClick={()=>setAddType("gasto")}>💸 Gasto</button>
        <button style={S.tBtn(addType==="ingreso",C.green)} onClick={()=>setAddType("ingreso")}>💰 Ingreso</button>
      </div>
      {!isEdit&&addType==="gasto"&&<>
        <label style={S.lbl}>Frecuencia</label>
        <div style={S.tRow3}>
          <button style={S.tBtn(txnForm.frequency==="once",C.gold)} onClick={()=>setTxnForm(f=>({...f,frequency:"once",installments:""}))}>1× Única vez</button>
          <button style={S.tBtn(txnForm.frequency==="monthly",C.green)} onClick={()=>setTxnForm(f=>({...f,frequency:"monthly",installments:""}))}>🔁 Mensual</button>
          <button style={S.tBtn(txnForm.frequency==="installments",C.purple)} onClick={()=>setTxnForm(f=>({...f,frequency:"installments"}))}>💳 Cuotas</button>
        </div>
        {txnForm.frequency==="installments"&&<>
          <div style={S.tRow}>
            <button style={S.tBtn(txnForm.installmentAmountType==="perInstallment",C.purple)} onClick={()=>setTxnForm(f=>({...f,installmentAmountType:"perInstallment"}))}>$ Por cuota</button>
            <button style={S.tBtn(txnForm.installmentAmountType==="total",C.blue)} onClick={()=>setTxnForm(f=>({...f,installmentAmountType:"total"}))}>$ Total</button>
          </div>
          <label style={S.lbl}>Cantidad de cuotas</label>
          <input style={{...S.inp,marginBottom:14}} type="number" min="2" placeholder="ej: 12" value={txnForm.installments} onChange={e=>setTxnForm(f=>({...f,installments:e.target.value}))}/>
          {txnForm.amount&&txnForm.installments&&<div style={{fontSize:12,color:C.purple,textAlign:"center",marginBottom:12}}>
            {txnForm.installmentAmountType==="total"?`${fmt(Math.round(parseFloat(txnForm.amount)/parseInt(txnForm.installments)))} por cuota`:`${fmt(parseFloat(txnForm.amount)*parseInt(txnForm.installments))} total`}
          </div>}
          {txnForm.accountId==="tarjeta"&&<div style={{background:"rgba(232,122,206,0.08)",border:"1px solid rgba(232,122,206,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.pink}}>💳 Primera cuota aparece en el resumen del <strong>mes siguiente</strong> a la compra.</div>}
        </>}
        {txnForm.frequency==="monthly"&&<div style={{background:"rgba(90,232,154,0.08)",border:"1px solid rgba(90,232,154,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.green}}>🔁 Se repetirá automáticamente en Pagos cada mes.</div>}
      </>}
      <label style={S.lbl}>Moneda</label>
      <div style={{...S.tRow,marginBottom:14}}>
        <button style={S.tBtn(txnForm.currency==="ARS",C.gold)} onClick={()=>setTxnForm(f=>({...f,currency:"ARS"}))}>🇦🇷 Pesos</button>
        <button style={S.tBtn(txnForm.currency==="USD",C.blue)} onClick={()=>setTxnForm(f=>({...f,currency:"USD"}))}>🇺🇸 Dólares</button>
      </div>
      <label style={S.lbl}>Monto {txnForm.currency==="USD"?"(US$)":"($)"}{txnForm.frequency==="installments"&&txnForm.installmentAmountType==="total"?" — total":txnForm.frequency==="installments"?" — por cuota":""}</label>
      <input style={{...S.inp,fontSize:26,textAlign:"center",marginBottom:6}} type="number" placeholder="$ 0" value={txnForm.amount} onChange={e=>setTxnForm(f=>({...f,amount:e.target.value}))}/>
      {txnForm.currency==="USD"&&txnForm.amount&&<div style={{fontSize:12,color:C.blue,textAlign:"center",marginBottom:12}}>≈ {fmt(parseFloat(txnForm.amount||0)*usdRate)}</div>}
      {txnForm.currency==="ARS"&&<div style={{height:8}}/>}
      <label style={S.lbl}>Cuenta</label>
      <AccPills selected={txnForm.accountId} onSelect={id=>setTxnForm(f=>({...f,accountId:id}))}/>
      {(addType==="gasto"&&(txnForm.frequency==="once"||isEdit))&&<><label style={S.lbl}>Categoría</label><div style={S.cGrid}>{catsGasto.map(c=><button key={c.name} style={S.cBtn(txnForm.category===c.name,c.color)} onClick={()=>setTxnForm(f=>({...f,category:c.name}))}><span style={{fontSize:20}}>{c.emoji}</span><span style={{fontSize:9,color:txnForm.category===c.name?c.color:"#555"}}>{c.name}</span></button>)}</div></>}
      {addType==="ingreso"&&<><label style={S.lbl}>Categoría</label><div style={S.cGrid}>{catsIngreso.map(c=><button key={c.name} style={S.cBtn(txnForm.category===c.name,c.color)} onClick={()=>setTxnForm(f=>({...f,category:c.name}))}><span style={{fontSize:20}}>{c.emoji}</span><span style={{fontSize:9,color:txnForm.category===c.name?c.color:"#555"}}>{c.name}</span></button>)}</div></>}
      <label style={S.lbl}>{txnForm.frequency==="monthly"?"Descripción (nombre)":"Descripción"}</label>
      <input style={{...S.inp,marginBottom:12}} type="text" placeholder={txnForm.frequency==="monthly"?"ej: Spotify":"ej: almuerzo"} value={txnForm.description} onChange={e=>setTxnForm(f=>({...f,description:e.target.value}))}/>
      <label style={S.lbl}>{txnForm.frequency==="monthly"?"Día del mes":"Fecha"}</label>
      <input style={{...S.inp,marginBottom:20}} type={txnForm.frequency==="monthly"?"number":"date"} min="1" max="31" value={txnForm.date} onChange={e=>setTxnForm(f=>({...f,date:e.target.value}))}/>
      <button style={S.sub()} onClick={onSave}>{flash?"✅ Guardado":saveLabel}</button>
    </div>
  );

  if(modal==="txn")     return <div style={S.modal}><TxnModalBody onSave={addTxn} saveLabel="Guardar"/></div>;
  if(modal==="editTxn") return <div style={S.modal}><TxnModalBody onSave={saveTxnEdit} saveLabel="Guardar cambios" isEdit={true}/></div>;
  if(modal==="bill")    return <div style={S.modal}><div style={{padding:"28px 20px"}}><div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Nuevo compromiso mensual</div></div><BillFormBody onSave={addBill} saveLabel="Guardar compromiso"/></div></div>;
  if(modal==="editBill")return <div style={S.modal}><div style={{padding:"28px 20px"}}><div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Editar compromiso</div></div><BillFormBody onSave={saveBillEdit} saveLabel="Guardar cambios"/></div></div>;
  if(modal==="account") return <div style={S.modal}><div style={{padding:"28px 20px"}}><div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Nueva cuenta</div></div><AccFormBody onSave={addAccount} saveLabel="Crear cuenta"/></div></div>;
  if(modal==="editAcc") return <div style={S.modal}><div style={{padding:"28px 20px"}}><div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Editar cuenta</div></div><AccFormBody onSave={saveAccEdit} saveLabel="Guardar cambios"/></div></div>;

  if(modal==="saving") return(
    <div style={S.modal}><div style={{padding:"28px 20px"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Nueva meta de ahorro</div></div>
      <label style={S.lbl}>¿Para qué?</label><input style={{...S.inp,marginBottom:14}} type="text" placeholder="ej: Cámara…" value={savForm.name} onChange={e=>setSavForm(f=>({...f,name:e.target.value}))}/>
      <label style={S.lbl}>Objetivo ($)</label><input style={{...S.inp,marginBottom:14}} type="number" value={savForm.goal} onChange={e=>setSavForm(f=>({...f,goal:e.target.value}))}/>
      <label style={S.lbl}>Ya ahorrado ($)</label><input style={{...S.inp,marginBottom:24}} type="number" placeholder="$ 0" value={savForm.saved} onChange={e=>setSavForm(f=>({...f,saved:e.target.value}))}/>
      <button style={S.sub()} onClick={addSaving}>{flash?"✅ Guardado":"Crear meta"}</button>
    </div></div>
  );

  if(modal==="cats") return(
    <div style={S.modal}><div style={{padding:"28px 20px"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div><div style={S.ey}>Configurar categorías</div><div style={{fontSize:18}}>Mis categorías</div></div></div>
      {/* Gastos */}
      <div style={{fontSize:11,letterSpacing:3,color:C.red,textTransform:"uppercase",marginBottom:10}}>💸 Categorías de gasto</div>
      {catsGasto.map((c,i)=>(
        <div key={i} style={{...S.row,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
          <span style={{fontSize:20,width:32}}>{c.emoji}</span>
          <span style={{flex:1,fontSize:14,color:c.color}}>{c.name}</span>
          <button onClick={()=>startEditCat("gasto",i)} style={S.penBtn}>✏️</button>
          <button onClick={()=>delCat("gasto",i)} style={S.xBtn}>×</button>
        </div>
      ))}
      <button onClick={()=>{setCatForm(emptyCat);setModal("addCat_gasto");}} style={{width:"100%",padding:11,borderRadius:11,background:"rgba(232,90,90,0.08)",border:"1px solid rgba(232,90,90,0.2)",color:C.red,fontSize:13,cursor:"pointer",fontFamily:"Georgia",marginTop:10}}>+ Agregar categoría de gasto</button>
      {/* Ingresos */}
      <div style={{fontSize:11,letterSpacing:3,color:C.green,textTransform:"uppercase",margin:"20px 0 10px"}}>💰 Categorías de ingreso</div>
      {catsIngreso.map((c,i)=>(
        <div key={i} style={{...S.row,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
          <span style={{fontSize:20,width:32}}>{c.emoji}</span>
          <span style={{flex:1,fontSize:14,color:c.color}}>{c.name}</span>
          <button onClick={()=>startEditCat("ingreso",i)} style={S.penBtn}>✏️</button>
          <button onClick={()=>delCat("ingreso",i)} style={S.xBtn}>×</button>
        </div>
      ))}
      <button onClick={()=>{setCatForm(emptyCat);setModal("addCat_ingreso");}} style={{width:"100%",padding:11,borderRadius:11,background:"rgba(90,232,154,0.08)",border:"1px solid rgba(90,232,154,0.2)",color:C.green,fontSize:13,cursor:"pointer",fontFamily:"Georgia",marginTop:10,marginBottom:40}}>+ Agregar categoría de ingreso</button>
    </div></div>
  );

  if(modal==="addCat_gasto"||modal==="addCat_ingreso"||modal==="editCat") return(
    <div style={S.modal}><div style={{padding:"28px 20px"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={()=>setModal("cats")} style={S.back}>←</button><div style={S.ey}>{modal==="editCat"?"Editar categoría":"Nueva categoría"}</div></div>
      <label style={S.lbl}>Nombre</label>
      <input style={{...S.inp,marginBottom:14}} type="text" placeholder="ej: Mascota, Auto…" value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))}/>
      <label style={S.lbl}>Emoji</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>{EMOJIS_CAT.map(e=><button key={e} onClick={()=>setCatForm(f=>({...f,emoji:e}))} style={{width:40,height:40,borderRadius:9,border:`1px solid ${catForm.emoji===e?C.gold:"rgba(255,255,255,0.08)"}`,background:catForm.emoji===e?"rgba(200,169,126,0.15)":"rgba(255,255,255,0.03)",fontSize:22,cursor:"pointer"}}>{e}</button>)}</div>
      <label style={S.lbl}>Color</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>{CAT_COLORS.map(c=><button key={c} onClick={()=>setCatForm(f=>({...f,color:c}))} style={{width:30,height:30,borderRadius:"50%",background:c,border:catForm.color===c?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>)}</div>
      <button style={S.sub()} onClick={()=>modal==="editCat"?saveCatEdit():addCat(modal==="addCat_gasto"?"gasto":"ingreso")}>{flash?"✅ Guardado":"Guardar"}</button>
    </div></div>
  );

  if(modal==="usd") return(
    <div style={S.modal}><div style={{padding:"28px 20px"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Tipo de cambio</div></div>
      <label style={S.lbl}>1 US$ = $ pesos</label>
      <input style={{...S.inp,fontSize:26,textAlign:"center",marginBottom:8}} type="number" placeholder={String(usdRate)} value={tempRate} onChange={e=>setTempRate(e.target.value)}/>
      <div style={{fontSize:12,color:"#555",textAlign:"center",marginBottom:24}}>Actual: ${usdRate.toLocaleString("es-AR")}</div>
      <button style={S.sub(C.blue)} onClick={saveRate}>{flash?"✅ Guardado":"Guardar"}</button>
    </div></div>
  );

  if(modal==="budget") return(
    <div style={S.modal}><div style={{padding:"28px 20px"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Presupuesto mensual</div></div>
      <label style={S.lbl}>¿Cuánto querés gastar por mes?</label>
      <input style={{...S.inp,fontSize:26,textAlign:"center",marginBottom:8}} type="number" placeholder={budget>0?String(budget):"$ 0"} value={tempBudget} onChange={e=>setTempBudget(e.target.value)}/>
      <div style={{fontSize:12,color:"#555",textAlign:"center",marginBottom:24}}>{budget>0?`Configurado: ${fmt(budget)}`:"Sin presupuesto"}</div>
      <button style={S.sub(C.green)} onClick={saveBudget}>{flash?"✅ Guardado":"Guardar"}</button>
    </div></div>
  );

  if(modal==="cardSettings") return(
    <div style={S.modal}><div style={{padding:"28px 20px"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div><div style={S.ey}>Tarjeta de crédito</div><div style={{fontSize:18}}>Fechas</div></div></div>
      <div style={{background:"rgba(232,122,206,0.08)",border:"1px solid rgba(232,122,206,0.2)",borderRadius:14,padding:16,marginBottom:20,fontSize:13,color:C.pink,lineHeight:1.8}}>
        Cargos de <strong>Abril</strong> → Resumen Abril → vence día {cardSettings.dueDay} de <strong>Mayo</strong>
      </div>
      <label style={S.lbl}>Día de cierre</label>
      <input style={{...S.inp,marginBottom:16}} type="number" min="1" max="31" placeholder={String(cardSettings.closingDay)} value={tempCard.closingDay} onChange={e=>setTempCard(f=>({...f,closingDay:e.target.value}))}/>
      <label style={S.lbl}>Día de vencimiento (mes siguiente)</label>
      <input style={{...S.inp,marginBottom:24}} type="number" min="1" max="31" placeholder={String(cardSettings.dueDay)} value={tempCard.dueDay} onChange={e=>setTempCard(f=>({...f,dueDay:e.target.value}))}/>
      <button style={S.sub(C.pink)} onClick={saveCardSettings_}>{flash?"✅ Guardado":"Guardar"}</button>
    </div></div>
  );

  if(modal==="payResumenModal") return(
    <div style={S.modal}><div style={{padding:"28px 20px"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={()=>setModal(null)} style={S.back}>←</button><div><div style={S.ey}>Pagar resumen</div><div style={{fontSize:18}}>Tarjeta {MONTHS_FULL[PM]}</div></div></div>
      <div style={{background:"rgba(232,122,206,0.08)",border:"1px solid rgba(232,122,206,0.25)",borderRadius:16,padding:20,marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:11,color:C.pink,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Total a pagar</div>
        <div style={{fontSize:34,fontFamily:"Georgia",color:C.pink,marginBottom:4}}>{fmt(prevResumenAmount)}</div>
      </div>
      <div style={{...S.card(),marginBottom:14,maxHeight:150,overflowY:"auto"}}>
        {activeCardBillsPrevMonth.map(b=><div key={b.id} style={{...S.row,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><span style={{fontSize:16}}>{b.emoji}</span><span style={{flex:1,fontSize:13}}>{b.name}</span><span style={{fontSize:13,fontFamily:"Georgia",color:C.pink}}>{fmt(b.amount)}</span></div>)}
      </div>
      <label style={S.lbl}>¿Con qué cuenta pagás?</label>
      <AccPills selected={resumenPayAcc} onSelect={setResumenPayAcc} showNone={true} exclude={["tarjeta"]}/>
      <button disabled={!resumenPayAcc} style={{...S.sub(resumenPayAcc?C.pink:"#333"),color:resumenPayAcc?C.bg:"#555"}} onClick={()=>payCardResumen(resumenPayAcc,prevResumenKey_,prevResumenAmount)}>{flash?"✅ Pagado":"Confirmar pago"}</button>
    </div></div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ACCOUNT DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if(accountDetail){
    const acc=accounts.find(a=>a.id===accountDetail);
    if(!acc) { setAccountDetail(null); return null; }
    const accTxns=txns.filter(t=>t.accountId===accountDetail).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const bal=accountBalance(accountDetail);
    const isTarjeta=accountDetail==="tarjeta";
    return(
      <div style={S.app(isMobile)}>
        <div style={{...S.hdr,display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setAccountDetail(null)} style={S.back}>←</button>
          <div style={{flex:1}}>
            <div style={S.ey}>{acc.emoji} {acc.name}</div>
            <h1 style={{...S.h1,color:bal<0?C.red:acc.color}}>{bal<0&&"−"}{fmt(Math.abs(bal))}</h1>
          </div>
        </div>
        {isTarjeta&&(
          <div style={S.pinkC}>
            <div style={{fontSize:11,color:C.pink,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Resumen {MONTHS_FULL[PM]}</div>
            <div style={{fontSize:22,color:C.pink,fontFamily:"Georgia"}}>{prevResumenPaid?<span style={{color:C.green}}>✓ Pagado</span>:fmt(prevResumenAmount)}</div>
            {!prevResumenPaid&&<div style={{fontSize:11,color:"#7A4060",marginTop:4}}>Vence el {cardSettings.dueDay} de {MONTHS_FULL[CM]}</div>}
            <div style={{fontSize:11,color:"#666",marginTop:8}}>Acumulando {MONTHS_FULL[CM]}: {fmt(currAccumulating)}</div>
          </div>
        )}
        <div style={S.sec}>Historial de movimientos</div>
        {accTxns.length===0
          ?<div style={{textAlign:"center",padding:"30px",color:"#444",fontSize:13}}>Sin movimientos registrados.</div>
          :<div style={{padding:"0 20px",marginBottom:80}}>
            {accTxns.map(t=>{
              const cats=t.type==="gasto"?catsGasto:catsIngreso;
              const cat=cats.find(c=>c.name===t.category)||{emoji:"•",color:"#888"};
              return(
                <div key={t.id} style={S.txRow}>
                  <div style={S.eBox(`${cat.color}18`)}>{cat.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14}}>{t.description||t.category}</div>
                    <div style={{fontSize:11,color:"#555",marginTop:1}}>{t.category} · {fmtDate(t.date)}{t.currency==="USD"&&<span style={{color:C.blue}}> · 🇺🇸</span>}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:15,fontFamily:"Georgia",color:t.type==="gasto"?C.red:C.green}}>{t.type==="gasto"?"−":"+"}{t.currency==="USD"?fmtUSD(t.amount):fmt(t.amount)}</div>
                    {t.currency==="USD"&&<div style={{fontSize:10,color:"#444"}}>≈{fmt(t.amount*usdRate)}</div>}
                  </div>
                  <button onClick={()=>startEditTxn(t)} style={S.penBtn}>✏️</button>
                  <button onClick={()=>delTxn(t.id)} style={S.xBtn}>×</button>
                </div>
              );
            })}
          </div>
        }
        <div style={S.nav(isMobile)}>{NAV.map(([t,e,l])=><button key={t} style={S.nBtn(tab===t)} onClick={()=>{setAccountDetail(null);setTab(t);}}><span>{e}</span>{l}</button>)}</div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BILLS TAB
  // ══════════════════════════════════════════════════════════════════════════
  if(tab==="bills"){
    const viewCurr=billsView==="current";
    const viewM=viewCurr?CM:NM;
    const viewY=viewCurr?CY:NY;
    const rKey=viewCurr?prevResumenKey_:resumenKey(CM,CY);
    const rAmount=viewCurr?prevResumenAmount:currAccumulating;
    const rPaid=viewCurr?prevResumenPaid:cardResumen.includes(resumenKey(CM,CY));
    const rMonthLabel=viewCurr?MONTHS_FULL[PM]:MONTHS_FULL[CM];
    const rDueDay=cardSettings.dueDay;
    const rDaysLeft=viewCurr?daysUntil(rDueDay,CM,CY):daysUntil(rDueDay,NM,NY);
    return(
      <div style={S.app(isMobile)}>
        {!isMobile&&<Sidebar/>}
        <div style={isMobile?{}:S.content}>
        <div style={S.hdr}><div style={S.ey}>Compromisos</div><h1 style={S.h1}>{MONTHS_FULL[viewM]} {viewY}</h1></div>
        <div style={{display:"flex",gap:10,padding:"12px 14px 0"}}>
          <button onClick={()=>setBillsView("current")} style={{...S.tBtn(viewCurr,C.gold),flex:1}}>Este mes ({MONTHS_ES[CM]})</button>
          <button onClick={()=>setBillsView("next")}    style={{...S.tBtn(!viewCurr,C.blue),flex:1}}>Próximo ({MONTHS_ES[NM]}) →</button>
        </div>
        <div style={S.gCard()}>
          <div style={S.ey}>Total a pagar — {MONTHS_FULL[viewM]}</div>
          <div style={{fontSize:30,color:C.gold,margin:"6px 0 14px",fontFamily:"Georgia"}}>{fmt(regularBillsSorted.filter(b=>!isPaid(b.id,viewM,viewY)).reduce((s,b)=>s+b.amount,0)+(rPaid?0:rAmount))}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><div style={{fontSize:9,color:C.red,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Gastos fijos</div><div style={{fontSize:16,color:C.red}}>{fmt(regularBillsSorted.reduce((s,b)=>s+b.amount,0))}</div></div>
            <div><div style={{fontSize:9,color:C.pink,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Tarjeta</div><div style={{fontSize:16,color:C.pink}}>{fmt(rAmount)}</div></div>
          </div>
        </div>
        {/* Urgent */}
        {viewCurr&&(urgentRegular.length>0||resumenIsUrgent)&&(
          <div style={S.alertC}>
            <div style={{fontSize:11,letterSpacing:3,color:C.red,textTransform:"uppercase",marginBottom:8}}>⚠️ Vencidos / próximos</div>
            {resumenIsUrgent&&<div style={{...S.row,marginBottom:6}}><span style={{fontSize:16}}>💳</span><span style={{fontSize:14,flex:1}}>Resumen {rMonthLabel}</span><span style={{fontSize:11,fontWeight:"bold",color:rDaysLeft<0?C.red:"#E8844A"}}>{rDaysLeft<0?`Venció hace ${Math.abs(rDaysLeft)}d`:rDaysLeft===0?"¡HOY!":rDaysLeft===1?"Mañana":`${rDaysLeft}d`}</span><span style={{fontSize:14,color:C.pink,fontFamily:"Georgia",marginLeft:6}}>{fmt(rAmount)}</span></div>}
            {urgentRegular.map(b=>{const d=daysUntil(b.dueDay,CM,CY);return(<div key={b.id} style={{...S.row,marginBottom:6}}><span style={{fontSize:16}}>{b.emoji}</span><span style={{fontSize:14,flex:1}}>{b.name}</span><span style={{fontSize:11,fontWeight:"bold",color:d<0?C.red:"#E8844A"}}>{d<0?`Venció hace ${Math.abs(d)}d`:d===0?"¡HOY!":d===1?"Mañana":`${d}d`}</span><span style={{fontSize:14,color:C.red,fontFamily:"Georgia",marginLeft:6}}>{fmt(b.amount)}</span></div>);})}
          </div>
        )}
        {/* Resumen tarjeta */}
        <div style={S.sec}>💳 Resumen Tarjeta {rMonthLabel}</div>
        <div style={{padding:"0 14px"}}>
          <div style={{background:rPaid?"rgba(90,232,154,0.04)":"rgba(232,122,206,0.06)",border:`1px solid ${rPaid?"rgba(90,232,154,0.2)":"rgba(232,122,206,0.25)"}`,borderRadius:16,overflow:"hidden"}}>
            <div style={{...S.row,padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <button style={S.chk(rPaid)} onClick={()=>{ if(!rPaid){setResumenPayAcc("");setModal("payResumenModal");}else{const u=cardResumen.filter(k=>k!==rKey);setCardResumen(u);dbSave(KEYS.cardResumen,u);} }}>{rPaid?"✓":""}</button>
              <div style={S.eBox("rgba(232,122,206,0.15)")}>💳</div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,color:rPaid?"#888":"#EDE9E3",textDecoration:rPaid?"line-through":"none"}}>Resumen Tarjeta {rMonthLabel}</div>
                <div style={{fontSize:11,color:C.pink,marginTop:3}}>{rPaid?"✓ Pagado":`Vence el ${rDueDay} de ${MONTHS_FULL[viewM]} · ${rDaysLeft<0?`Venció hace ${Math.abs(rDaysLeft)}d`:rDaysLeft===0?"¡HOY!":rDaysLeft===1?"Mañana":`${rDaysLeft}d`}`}</div>
              </div>
              <div style={{fontSize:18,fontFamily:"Georgia",color:rPaid?C.green:C.pink,flexShrink:0}}>{fmt(rAmount)}</div>
            </div>
            <div style={{padding:"12px 16px"}}>
              <div style={{fontSize:9,color:C.pink,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Detalle</div>
              {bills.filter(b=>isCardBillActiveInMonth(b,viewCurr?PM:CM,viewCurr?PY:CY)).map(b=>(
                <div key={b.id} style={{...S.row,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                  <span style={{fontSize:15}}>{b.emoji}</span>
                  <span style={{flex:1,fontSize:13,color:"#C0B0F0"}}>{b.name}</span>
                  {b.installments&&<span style={{fontSize:10,color:"#666",marginRight:6}}>C{getInstallmentNumber(b,viewCurr?PM:CM,viewCurr?PY:CY)}/{b.installments}</span>}
                  <button onClick={()=>startEditBill(b)} style={{...S.penBtn,marginRight:4}}>✏️</button>
                  <span style={{fontSize:13,fontFamily:"Georgia",color:"#C0B0F0"}}>{fmt(b.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Regular bills */}
        <div style={S.sec}>📋 Gastos fijos mensuales — por fecha de vencimiento</div>
        <div style={{padding:"0 14px",marginBottom:80}}>
          {regularBillsSorted.length===0?<div style={{textAlign:"center",padding:"24px",color:"#444",fontSize:13}}>Sin gastos fijos. Tocá + para agregar.</div>
          :regularBillsSorted.map(b=>{
            const done=isPaid(b.id,viewM,viewY);
            const selecting=payWith.billId===b.id&&viewCurr;
            return(
              <div key={b.id} style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 4px",opacity:done?0.4:1}}>
                  <button style={S.chk(done)} onClick={()=>{ if(!viewCurr)return; if(done){togglePaid(b.id,null,viewM,viewY);}else{setPayWith(p=>p.billId===b.id?{billId:null,accountId:""}:{billId:b.id,accountId:""});} }}>{done?"✓":""}</button>
                  <div style={S.eBox("rgba(255,255,255,0.05)")}>{b.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,textDecoration:done?"line-through":"none",color:done?"#555":"#EDE9E3",marginBottom:4}}>{b.name}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{dayBadge(b.dueDay,done,viewM,viewY)}{b.installments&&<span style={{fontSize:10,color:"#666",padding:"2px 6px",borderRadius:5,background:"rgba(255,255,255,0.05)"}}>C{b.installmentCurrent}/{b.installments}</span>}</div>
                  </div>
                  <div style={{fontSize:15,fontFamily:"Georgia",color:done?"#555":"#EDE9E3",flexShrink:0}}>{fmt(b.amount)}</div>
                  <button onClick={()=>startEditBill(b)} style={S.penBtn}>✏️</button>
                  <button onClick={()=>delBill(b.id)} style={S.xBtn}>×</button>
                </div>
                {selecting&&!done&&(
                  <div style={{background:"rgba(200,169,126,0.06)",border:"1px solid rgba(200,169,126,0.15)",borderRadius:12,margin:"0 4px 10px",padding:"12px"}}>
                    <div style={{fontSize:10,letterSpacing:3,color:C.gold,textTransform:"uppercase",marginBottom:8}}>¿Con qué cuenta pagás?</div>
                    <AccPills selected={payWith.accountId} onSelect={id=>setPayWith(p=>({...p,accountId:id}))} showNone={true}/>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setPayWith({billId:null,accountId:""})} style={{flex:1,padding:"9px",borderRadius:9,background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"#666",fontSize:13,cursor:"pointer"}}>Cancelar</button>
                      <button disabled={!payWith.accountId} onClick={()=>togglePaid(b.id,payWith.accountId,viewM,viewY)} style={{flex:2,padding:"9px",borderRadius:9,background:payWith.accountId?C.gold:"#333",border:"none",color:payWith.accountId?C.bg:"#555",fontSize:13,cursor:payWith.accountId?"pointer":"default",fontFamily:"Georgia"}}>✓ Marcar pagado</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button style={S.fab} onClick={()=>setModal("bill")}>+</button>
        <div style={S.nav(isMobile)}>{NAV.map(([t,e,l])=><button key={t} style={S.nBtn(tab===t)} onClick={()=>setTab(t)}><span>{e}</span>{l}</button>)}</div>
        {!isMobile&&<div/>}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACCOUNTS TAB
  // ══════════════════════════════════════════════════════════════════════════
  if(tab==="accounts") return(
    <div style={S.app(isMobile)}>
      {!isMobile&&<Sidebar/>}
      <div style={isMobile?{}:S.content}>
      <div style={S.hdr}><div style={S.ey}>Mis cuentas</div><h1 style={S.h1}>Balance por cuenta</h1></div>
      {accounts.map(acc=>{
        const bal=accountBalance(acc.id);const neg=bal<0;const isTarjeta=acc.id==="tarjeta";
        return(
          <div key={acc.id} style={{...S.gCard(),borderColor:neg?"rgba(232,90,90,0.4)":isTarjeta?"rgba(232,122,206,0.35)":"rgba(200,169,126,0.25)",background:neg?"linear-gradient(135deg,#1A0808,#220D0D)":isTarjeta?"linear-gradient(135deg,#150818,#1A0D20)":"linear-gradient(135deg,#1A1208,#221808)"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{width:46,height:46,borderRadius:13,background:`${acc.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,cursor:"pointer"}} onClick={()=>setAccountDetail(acc.id)}>{acc.emoji}</div>
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>setAccountDetail(acc.id)}>
                <div style={{fontSize:13,color:"#888",marginBottom:4}}>{acc.name}{isTarjeta&&<span style={{fontSize:10,color:C.pink,marginLeft:8}}>VISA</span>}</div>
                <div style={{fontSize:26,fontFamily:"Georgia",color:neg?C.red:acc.color}}>{neg&&"−"}{fmt(Math.abs(bal))}</div>
                <div style={{fontSize:11,color:"#555",marginTop:2}}>Tocá para ver movimientos →</div>
                {isTarjeta&&!prevResumenPaid&&<div style={{fontSize:12,color:C.pink,marginTop:4}}>Resumen {MONTHS_FULL[PM]}: {fmt(prevResumenAmount)} (vence {cardSettings.dueDay}/{CM+1})</div>}
                {isTarjeta&&prevResumenPaid&&<div style={{fontSize:12,color:C.green,marginTop:4}}>✓ Resumen {MONTHS_FULL[PM]} pagado</div>}
                {neg&&!isTarjeta&&<div style={{fontSize:12,color:C.red,marginTop:4}}>⚠️ Saldo negativo</div>}
              </div>
              <button onClick={()=>startEditAcc(acc)} style={S.penBtn}>✏️</button>
              <button onClick={()=>delAccount(acc.id)} style={S.xBtn}>×</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
              <div><div style={{fontSize:9,color:C.green,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>{isTarjeta?"Pagos":"Ingresos"}</div><div style={{fontSize:16,color:C.green,fontFamily:"Georgia"}}>{fmt(txns.filter(t=>t.type==="ingreso"&&t.accountId===acc.id).reduce((s,t)=>s+toARS(t),0))}</div></div>
              <div><div style={{fontSize:9,color:C.red,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Gastos</div><div style={{fontSize:16,color:C.red,fontFamily:"Georgia"}}>{fmt(txns.filter(t=>t.type==="gasto"&&t.accountId===acc.id).reduce((s,t)=>s+toARS(t),0))}</div></div>
            </div>
            {isTarjeta&&<div style={{marginTop:12,paddingTop:10,borderTop:"1px solid rgba(232,122,206,0.15)"}}>
              <div style={{fontSize:9,color:C.pink,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Acumulando {MONTHS_FULL[CM]}</div>
              {activeCardBillsThisMonth.map(b=><div key={b.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#C0B0F0",padding:"2px 0"}}><span>{b.emoji} {b.name}</span><span style={{fontFamily:"Georgia"}}>{fmt(b.amount)}</span></div>)}
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.pink,padding:"8px 0 0",borderTop:"1px solid rgba(232,122,206,0.15)",marginTop:4}}><span>Total → vence {cardSettings.dueDay}/{NM+1}</span><span style={{fontFamily:"Georgia"}}>{fmt(currAccumulating)}</span></div>
            </div>}
          </div>
        );
      })}
      {/* Savings */}
      <div style={S.sec}>Metas de ahorro</div>
      {savings.map(g=>{const pct=Math.min(100,Math.round((g.saved/g.goal)*100));const isAdd=addSavId===g.id;return(
        <div key={g.id} style={S.card()}>
          <div style={{...S.row,marginBottom:10}}><div style={{flex:1}}><div style={{fontSize:15}}>{g.name}</div><div style={{fontSize:12,color:"#666",marginTop:2}}>{fmt(g.saved)} de {fmt(g.goal)}</div></div><div style={{fontSize:20,fontFamily:"Georgia",color:C.gold}}>{pct}%</div><button style={S.xBtn} onClick={()=>delSaving(g.id)}>×</button></div>
          <div style={{height:6,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.gold},#E8C89A)`,borderRadius:4}}/></div>
          {isAdd?<div style={{display:"flex",gap:8}}><input style={{...S.inp,flex:1,padding:"10px 12px",fontSize:14}} type="number" placeholder="$ cuánto" value={addSavAmt} onChange={e=>setAddSavAmt(e.target.value)}/><button onClick={addToSaving} style={{padding:"10px 14px",borderRadius:10,background:C.gold,border:"none",color:C.bg,cursor:"pointer"}}>+</button><button onClick={()=>{setAddSavId(null);setAddSavAmt("");}} style={{padding:"10px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"#666",cursor:"pointer"}}>✕</button></div>:<button onClick={()=>setAddSavId(g.id)} style={{width:"100%",padding:"9px",borderRadius:10,background:"rgba(200,169,126,0.08)",border:`1px solid rgba(200,169,126,0.2)`,color:C.gold,fontSize:13,cursor:"pointer",fontFamily:"Georgia"}}>+ Agregar ahorro</button>}
        </div>
      );})}
      {savings.length===0&&<div style={{textAlign:"center",padding:"10px 20px",color:"#444",fontSize:13}}>Sin metas todavía.</div>}
      {/* Config buttons */}
      {[
        [()=>setModal("saving"),"rgba(200,169,126,0.07)","rgba(200,169,126,0.2)",C.gold,"+ Nueva meta de ahorro"],
        [()=>{setTempCard({closingDay:String(cardSettings.closingDay),dueDay:String(cardSettings.dueDay)});setModal("cardSettings");},"rgba(232,122,206,0.07)","rgba(232,122,206,0.25)",C.pink,`💳 Tarjeta: cierre día ${cardSettings.closingDay}, vence día ${cardSettings.dueDay}`],
        [()=>setModal("cats"),"rgba(160,124,254,0.07)","rgba(160,124,254,0.25)",C.purple,"🏷️ Configurar categorías"],
        [()=>{setTempRate(String(usdRate));setModal("usd");},"rgba(90,155,232,0.07)","rgba(90,155,232,0.2)",C.blue,`🇺🇸 TC dólar: $${usdRate.toLocaleString("es-AR")}/US$`],
        [()=>{setTempBudget(String(budget));setModal("budget");},"rgba(90,232,154,0.07)","rgba(90,232,154,0.2)",C.green,`🎯 Presupuesto: ${budget>0?fmt(budget):"No configurado"}`],
      ].map(([fn,bg,border,col,label],i)=>(
        <div key={i} style={{margin:"6px 14px"}}><button onClick={fn} style={{width:"100%",padding:12,borderRadius:12,background:bg,border:`1px solid ${border}`,color:col,fontSize:13,cursor:"pointer",fontFamily:"Georgia"}}>{label}</button></div>
      ))}
      <button style={S.fab} onClick={()=>setModal("account")}>+</button>
      <div style={S.nav(isMobile)}>{NAV.map(([t,e,l])=><button key={t} style={S.nBtn(tab===t)} onClick={()=>setTab(t)}><span>{e}</span>{l}</button>)}</div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // INSIGHTS TAB
  // ══════════════════════════════════════════════════════════════════════════
  if(tab==="insights") return(
    <div style={S.app(isMobile)}>
      {!isMobile&&<Sidebar/>}
      <div style={isMobile?{}:S.content}>
      <div style={S.hdr}><div style={S.ey}>Análisis</div><h1 style={S.h1}>¿A dónde va tu plata?</h1></div>
      <div style={S.gCard()}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {[["Ingresos",C.green,fmt(totalIn)],["Gastos",C.red,fmt(totalOut)],["Disponible",txnBalance>=0?C.gold:C.red,fmt(txnBalance)]].map(([l,c,v])=>(<div key={l}><div style={{fontSize:9,letterSpacing:2,color:c,textTransform:"uppercase",marginBottom:4}}>{l}</div><div style={{fontSize:14,color:c,fontFamily:"Georgia"}}>{v}</div></div>))}
        </div>
      </div>
      {/* Budget */}
      {budget>0&&(
        <div style={{...S.card(),background:budgetPct>=100?"rgba(232,90,90,0.07)":"rgba(90,232,154,0.05)",border:`1px solid ${budgetPct>=100?"rgba(232,90,90,0.25)":"rgba(90,232,154,0.2)"}`}}>
          <div style={{...S.row,marginBottom:10}}><div style={{flex:1}}><div style={{fontSize:11,color:budgetPct>=100?C.red:C.green,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>🎯 Presupuesto mensual</div><div style={{fontSize:13,color:"#888"}}>{fmt(thisMonthSpend)} de {fmt(budget)}</div></div><div style={{fontSize:22,fontFamily:"Georgia",color:budgetPct>=100?C.red:C.gold}}>{budgetPct}%</div></div>
          <div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,budgetPct)}%`,background:budgetPct>=100?`linear-gradient(90deg,${C.red},#FF8080)`:`linear-gradient(90deg,${C.green},#8BC34A)`,borderRadius:4}}/></div>
          {budgetPct>=90&&<div style={{fontSize:12,color:C.red,marginTop:8}}>{budgetPct>=100?"⚠️ Superaste el presupuesto":"⏰ Cerca del límite"}</div>}
        </div>
      )}
      {/* Gastos por categoría — pie */}
      <div style={S.sec}>Gastos por categoría</div>
      {gatosCatData.length>0?(
        <>
          <div style={{height:180,margin:"0 14px"}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={gatosCatData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={74} innerRadius={34}>{gatosCatData.map((c,i)=><Cell key={i} fill={c.color}/>)}</Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1A24",border:"1px solid #333",borderRadius:8,color:"#EDE9E3",fontFamily:"Georgia"}}/></PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{padding:"0 14px"}}>
            {gatosCatData.map(c=>(
              <div key={c.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:c.color}}/>
                <span style={{fontSize:16}}>{c.emoji}</span>
                <span style={{flex:1,fontSize:13,color:"#C8C4BE"}}>{c.name}</span>
                <span style={{fontSize:14,fontFamily:"Georgia",color:C.red}}>{fmt(c.total)}</span>
                <span style={{fontSize:10,color:"#444",minWidth:32,textAlign:"right"}}>{totalOut>0?Math.round(c.total/totalOut*100):0}%</span>
              </div>
            ))}
          </div>
        </>
      ):<div style={{textAlign:"center",padding:"20px",color:"#444",fontSize:13}}>Registrá gastos para ver el análisis por categoría.</div>}
      {/* Gastos fijos */}
      <div style={S.sec}>📋 Compromisos fijos mensuales</div>
      <div style={S.card()}>
        <div style={{...S.row,marginBottom:12,paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.07)"}}><span style={{flex:1,fontSize:13,color:"#888"}}>Total comprometido por mes</span><span style={{fontSize:20,fontFamily:"Georgia",color:C.gold}}>{fmt(monthlyFixedTotal)}</span></div>
        {bills.filter(b=>{if(b.isCard)return isCardBillActiveInMonth(b,CM,CY);return b.installments===null||b.installmentCurrent<=b.installments;}).sort((a,b2)=>a.dueDay-b2.dueDay).map(b=>(
          <div key={b.id} style={{...S.row,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <span style={{fontSize:16}}>{b.emoji}</span>
            <span style={{flex:1,fontSize:13,color:"#C8C4BE"}}>{b.name}{b.isCard&&<span style={{color:C.pink,marginLeft:4,fontSize:10}}>💳</span>}</span>
            {b.installments&&<span style={{fontSize:10,color:"#666",marginRight:6}}>C{b.installmentCurrent}/{b.installments}</span>}
            <span style={{fontSize:10,color:"#555",marginRight:8}}>día {b.dueDay}</span>
            <span style={{fontSize:14,fontFamily:"Georgia",color:"#EDE9E3"}}>{fmt(b.amount)}</span>
            <button onClick={()=>startEditBill(b)} style={S.penBtn}>✏️</button>
          </div>
        ))}
      </div>
      {/* 12-month bar chart */}
      <div style={S.sec}>Gasto mensual — últimos 12 meses</div>
      <div style={{height:200,margin:"0 14px"}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyChartData} margin={{top:5,right:5,left:0,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
            <XAxis dataKey="label" tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"#555",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${v/1000}k`:v} width={28}/>
            <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1A24",border:"1px solid #333",borderRadius:8,color:"#EDE9E3",fontFamily:"Georgia"}} labelStyle={{color:C.gold}}/>
            <Bar dataKey="txns" name="Gastos" stackId="a" fill={C.red} opacity={0.8} radius={[0,0,0,0]}/>
            <Bar dataKey="bills" name="Fijos" stackId="a" fill="#E8844A" opacity={0.7} radius={[0,0,0,0]}/>
            <Bar dataKey="card" name="Tarjeta" stackId="a" fill={C.pink} opacity={0.7} radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
        <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:8}}>
          {[[C.red,"Gastos"],["#E8844A","Fijos"],[C.pink,"Tarjeta"]].map(([col,lbl])=><div key={lbl} style={{...S.row,gap:5}}><div style={{width:10,height:10,borderRadius:2,background:col}}/><span style={{fontSize:10,color:"#555"}}>{lbl}</span></div>)}
        </div>
      </div>
      <div style={{height:80}}/>
      <div style={S.nav(isMobile)}>{NAV.map(([t,e,l])=><button key={t} style={S.nBtn(tab===t)} onClick={()=>setTab(t)}><span>{e}</span>{l}</button>)}</div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // HOME TAB — solo pendientes y urgentes
  // ══════════════════════════════════════════════════════════════════════════
  return(
    <div style={S.app(isMobile)}>
      {!isMobile&&<Sidebar/>}
      <div style={isMobile?{}:S.content}>
      <div style={{...S.hdr,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={S.ey}>Mis finanzas · {MONTHS_FULL[CM]}</div><h1 style={S.h1}>Hola 👋</h1></div>
      </div>
      {/* Balance */}
      <div style={S.gCard()}>
        <div style={S.ey}>Balance real disponible</div>
        <div style={{fontSize:34,color:realBalance>=0?C.gold:C.red,margin:"6px 0 4px",fontFamily:"Georgia"}}>{fmt(realBalance)}</div>
        <div style={{fontSize:10,color:"#555",marginBottom:14}}>ingresos − gastos − compromisos pendientes</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div><div style={{fontSize:9,color:C.green,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Ingresos</div><div style={{fontSize:18,color:C.green,fontFamily:"Georgia"}}>{fmt(totalIn)}</div></div>
          <div><div style={{fontSize:9,color:C.red,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Gastos</div><div style={{fontSize:18,color:C.red,fontFamily:"Georgia"}}>{fmt(totalOut)}</div></div>
        </div>
      </div>
      {/* Budget bar */}
      {budget>0&&<div style={S.card()}><div style={{...S.row,marginBottom:8}}><span style={{flex:1,fontSize:12,color:"#888"}}>🎯 Presupuesto del mes</span><span style={{fontSize:13,color:budgetPct>=100?C.red:C.gold,fontFamily:"Georgia"}}>{fmt(thisMonthSpend)} / {fmt(budget)}</span></div><div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,budgetPct)}%`,background:budgetPct>=100?`linear-gradient(90deg,${C.red},#FF8080)`:`linear-gradient(90deg,${C.green},#8BC34A)`,borderRadius:4}}/></div></div>}
      {/* Resumen tarjeta */}
      {!prevResumenPaid&&prevResumenAmount>0?(
        <div style={S.pinkC}>
          <div style={{...S.row,marginBottom:8}}><span style={{fontSize:11,color:C.pink,letterSpacing:2,textTransform:"uppercase",flex:1}}>💳 Resumen Tarjeta {MONTHS_FULL[PM]}</span><button onClick={()=>setTab("bills")} style={{background:"none",border:`1px solid rgba(232,122,206,0.3)`,borderRadius:7,padding:"4px 10px",color:C.pink,fontSize:11,cursor:"pointer"}}>Pagar →</button></div>
          <div style={{fontSize:24,color:C.pink,fontFamily:"Georgia"}}>{fmt(prevResumenAmount)}</div>
          <div style={{fontSize:11,color:"#7A4060",marginTop:3}}>Vence el {cardSettings.dueDay} de {MONTHS_FULL[CM]} · {resumenDaysLeft<0?`Venció hace ${Math.abs(resumenDaysLeft)}d`:resumenDaysLeft===0?"¡HOY!":resumenDaysLeft===1?"Mañana":`${resumenDaysLeft} días`}</div>
        </div>
      ):null}
      {prevResumenPaid&&currAccumulating>0&&(
        <div style={{...S.card(),background:"rgba(90,232,154,0.05)",border:"1px solid rgba(90,232,154,0.15)"}}>
          <div style={S.row}><span style={{fontSize:20}}>✅</span><div style={{flex:1}}><div style={{fontSize:13,color:C.green}}>Resumen {MONTHS_FULL[PM]} pagado</div><div style={{fontSize:11,color:"#666",marginTop:2}}>Acumulando {MONTHS_FULL[CM]}: {fmt(currAccumulating)} → vence {cardSettings.dueDay}/{NM+1}</div></div></div>
        </div>
      )}
      {/* Pending regular bills */}
      {pendingRegularBills.length>0&&(
        <div style={S.alertC}>
          <div style={{...S.row,marginBottom:6}}><span style={{fontSize:11,color:C.red,letterSpacing:2,textTransform:"uppercase",flex:1}}>⚠️ Gastos fijos pendientes</span><button onClick={()=>setTab("bills")} style={{background:"none",border:`1px solid rgba(232,90,90,0.3)`,borderRadius:7,padding:"4px 10px",color:C.red,fontSize:11,cursor:"pointer"}}>Ver →</button></div>
          <div style={{fontSize:22,color:C.red,fontFamily:"Georgia"}}>{fmt(pendingRegularBills.reduce((s,b)=>s+b.amount,0))}</div>
          <div style={{fontSize:11,color:"#7A4040",marginTop:2}}>{pendingRegularBills.length} pagos pendientes este mes</div>
        </div>
      )}
      {/* Urgent upcoming — max 4 */}
      {(urgentRegular.length>0||resumenIsUrgent)&&(
        <div style={S.card()}>
          <div style={{fontSize:11,letterSpacing:3,color:C.gold,textTransform:"uppercase",marginBottom:10}}>📅 Próximos vencimientos</div>
          {resumenIsUrgent&&prevResumenAmount>0&&(
            <div style={{...S.row,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <div style={S.eBox("rgba(232,122,206,0.12)")}>💳</div>
              <div style={{flex:1}}><div style={{fontSize:14}}>Resumen {MONTHS_FULL[PM]}</div><div style={{fontSize:11,color:C.pink}}>Vence el {cardSettings.dueDay}</div></div>
              <div style={{fontSize:15,fontFamily:"Georgia",color:C.pink}}>{fmt(prevResumenAmount)}</div>
            </div>
          )}
          {urgentRegular.slice(0,4-(resumenIsUrgent?1:0)).map(b=>{const d=daysUntil(b.dueDay,CM,CY);return(
            <div key={b.id} style={{...S.row,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <div style={S.eBox("rgba(255,255,255,0.04)")}>{b.emoji}</div>
              <div style={{flex:1}}><div style={{fontSize:14}}>{b.name}</div><div style={{fontSize:11,color:d<0?C.red:d<=1?"#E8844A":"#E8A45A"}}>{d<0?`⚠️ Venció hace ${Math.abs(d)}d`:d===0?"🔴 Hoy":d===1?"🟠 Mañana":`🟡 ${d}d`}</div></div>
              <div style={{fontSize:15,fontFamily:"Georgia",color:C.red}}>{fmt(b.amount)}</div>
            </div>
          );})}
          <button onClick={()=>setTab("bills")} style={{width:"100%",marginTop:10,padding:"8px",borderRadius:9,background:"transparent",border:`1px solid rgba(200,169,126,0.2)`,color:C.gold,fontSize:12,cursor:"pointer",fontFamily:"Georgia"}}>Ver todos los pagos →</button>
        </div>
      )}
      {/* Accounts strip */}
      {accounts.some(a=>accountBalance(a.id)!==0)&&<>
        <div style={S.sec}>Mis cuentas</div>
        <div style={{display:"flex",gap:10,padding:"0 14px",overflowX:"auto",paddingBottom:6}}>
          {accounts.map(acc=>{const b=accountBalance(acc.id);const neg=b<0;return(
            <div key={acc.id} onClick={()=>setAccountDetail(acc.id)} style={{flexShrink:0,background:neg?"rgba(232,90,90,0.08)":"rgba(255,255,255,0.04)",border:`1px solid ${neg?"rgba(232,90,90,0.3)":acc.color+"33"}`,borderRadius:14,padding:"14px 16px",cursor:"pointer",minWidth:110}}>
              <div style={{fontSize:18,marginBottom:4}}>{acc.emoji}</div>
              <div style={{fontSize:11,color:"#666",marginBottom:4}}>{acc.name}</div>
              <div style={{fontSize:16,fontFamily:"Georgia",color:neg?C.red:acc.color}}>{neg&&"−"}{fmt(Math.abs(b))}</div>
            </div>
          );})}
        </div>
      </>}
      {/* Monthly fixed summary */}
      <div style={S.card()}>
        <div style={S.row}><span style={{fontSize:20}}>📋</span><div style={{flex:1}}><div style={{fontSize:11,color:"#888",marginBottom:2}}>Total gasto fijo mensual</div><div style={{fontSize:20,fontFamily:"Georgia",color:C.gold}}>{fmt(monthlyFixedTotal)}</div></div><button onClick={()=>setTab("insights")} style={{background:"none",border:`1px solid rgba(200,169,126,0.2)`,borderRadius:8,padding:"6px 12px",color:C.gold,fontSize:11,cursor:"pointer"}}>Ver →</button></div>
      </div>
      <div style={{height:80}}/>
      <button style={S.fab} onClick={()=>setModal("txn")}>+</button>
      <div style={S.nav(isMobile)}>{NAV.map(([t,e,l])=><button key={t} style={S.nBtn(tab===t)} onClick={()=>setTab(t)}><span>{e}</span>{l}</button>)}</div>
      </div>
    </div>
  );
}
