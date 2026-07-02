import { useState, useEffect, useCallback, useRef } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const INITIAL_BILLS = [];
const DEFAULT_ACCOUNTS = [
  { id:"sueldo",    name:"Sueldo",    emoji:"💼", color:"#5AE89A" },
  { id:"freelance", name:"Freelance", emoji:"🎨", color:"#A07CFE" },
  { id:"efectivo",  name:"Efectivo",  emoji:"💵", color:"#C8A97E" },
  { id:"tarjeta",   name:"Tarjeta",   emoji:"💳", color:"#E87ACE" },
];
const DEFAULT_CATS_GASTO = [
  { name:"Comida",                   emoji:"🍔", color:"#E8845A" },
  { name:"Café",                     emoji:"☕", color:"#C8A97E" },
  { name:"Transporte",               emoji:"🚌", color:"#5A9BE8" },
  { name:"Salidas",                  emoji:"🎉", color:"#C85AE8" },
  { name:"Cine",                     emoji:"🎬", color:"#A07CFE" },
  { name:"Ocio",                     emoji:"🎮", color:"#7C9EFE" },
  { name:"Belleza",                  emoji:"💅", color:"#E87ACE" },
  { name:"Mascotas",                 emoji:"🐾", color:"#8BC34A" },
  { name:"Hijos",                    emoji:"👶", color:"#FFD54F" },
  { name:"Alquiler",                 emoji:"🏠", color:"#E8D45A" },
  { name:"Servicios e Impuestos",    emoji:"🧾", color:"#FF9800" },
  { name:"Suscripciones",            emoji:"📺", color:"#26C6DA" },
  { name:"Gimnasio",                 emoji:"🏋️", color:"#5AE8B4" },
  { name:"Salud",                    emoji:"💊", color:"#5AE8E8" },
  { name:"Educación",                emoji:"🎓", color:"#4CAF50" },
  { name:"Indumentaria",             emoji:"👗", color:"#E85A8A" },
  { name:"Regalos",                  emoji:"🎁", color:"#E87ACE" },
  { name:"Tecnología",               emoji:"💻", color:"#5A9BE8" },
  { name:"Hogar y Electro",          emoji:"🛋️", color:"#A07C5A" },
  { name:"Vehículos",                emoji:"🚗", color:"#5AE8B4" },
  { name:"Reparaciones y Repuestos", emoji:"🔧", color:"#90A4AE" },
  { name:"Finanzas",                 emoji:"💰", color:"#FFD54F" },
  { name:"Trámites y Multas",        emoji:"📋", color:"#FF7043" },
  { name:"Viajes",                   emoji:"✈️", color:"#29B6F6" },
  { name:"Otros",                    emoji:"📦", color:"#888"    },
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
  cardSettings:"fv6-card", cardResumen:"fv6-resumen", resumenPending:"fv6-resumen-pending",
  catsGasto:"fv6-cats-gasto", catsIngreso:"fv6-cats-ingreso",
  people:"fv6-people", tercerosSeen:"fv6-terceros-seen", onboardingSeen:"fv6-onboarding-seen",
};
const EMOJIS_BILL = ["📋","🏠","💡","📱","🚗","💊","🎓","🛒","💈","🏋️","📺","🌐","🎵","🍕","🔥","🛡️","🖼️","🎬","🏰","🤖","🎨","✂️","🐾","✈️","🎮"];
const EMOJIS_ACC  = ["💼","🎨","💵","🏦","💳","🏠","📱","🚗","💡","🎓","🛒","✨","💎","🌟"];
const EMOJIS_CAT  = ["🍔","🚌","🎉","👗","🚗","🏠","💊","📱","🎁","📦","🎓","✈️","🐾","🎮","☕","🛒","💄","⚽","🎵","🔧","💅","🍕","🌿","🏋️","📚","🛁","🧹","🎨"];
const ACC_COLORS  = ["#5AE89A","#A07CFE","#C8A97E","#5A9BE8","#E8845A","#E85A8A","#5AE8E8","#E8D45A","#E87ACE","#4CAF50","#FF9800","#2196F3"];
const CAT_COLORS  = ["#E8845A","#5A9BE8","#C85AE8","#E85A8A","#5AE8B4","#E8D45A","#5AE8E8","#A07CFE","#E87ACE","#4CAF50","#FF9800","#2196F3","#8BC34A","#FF5722","#9C27B0","#607D8B"];

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
const monthOffset=(m1,y1,m2,y2)=>(y2-y1)*12+(m2-m1);

async function dbLoad(key){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):null; }catch{ return null; } }
async function dbSave(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); }catch{} }

export default function App() {
  const [tab,setTab]=useState("home");
  const [txns,setTxns]=useState([]);
  const [bills,setBills]=useState([]);
  const [paid,setPaid]=useState([]);
  const [cardResumen,setCardResumen]=useState([]);
  const [resumenPending,setResumenPending]=useState({});
  const [accounts,setAccounts]=useState(DEFAULT_ACCOUNTS);
  const [savings,setSavings]=useState([]);
  const [catsGasto,setCatsGasto]=useState(DEFAULT_CATS_GASTO);
  const [catsIngreso,setCatsIngreso]=useState(DEFAULT_CATS_INGRESO);
  const [usdRate,setUsdRate]=useState(1200);
  const [budget,setBudget]=useState(0);
  const [cardSettings,setCardSettings]=useState({closingDay:25,dueDay:1});
  const [people,setPeople]=useState([]); // 🆕 cuentas de terceros
  const [tercerosSeen,setTercerosSeen]=useState(false); // 🆕 ya vio el intro
  const [onboardingSeen,setOnboardingSeen]=useState(false); // 🆕 ya vio el onboarding de primer uso
  const [onboardingStep,setOnboardingStep]=useState(0);     // 🆕 paso actual del onboarding
  const [loading,setLoading]=useState(true);
  const [isMobile,setIsMobile]=useState(window.innerWidth<900);
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);

  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<900);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,async(u)=>{
      setUser(u); setAuthLoading(false);
      if(u){
        const ref=doc(db,"users",u.uid);
        const snap=await getDoc(ref);
        if(snap.exists()){
          const d=snap.data();
          if(d.txns)   setTxns(JSON.parse(d.txns));
          if(d.bills){ const rb=JSON.parse(d.bills); setBills(rb.map(b=>b.isCard&&(!b.accountId||b.accountId==="")?{...b,accountId:"tarjeta"}:b)); }
          if(d.paid)         setPaid(JSON.parse(d.paid));
          if(d.accounts)     setAccounts(JSON.parse(d.accounts));
          if(d.savings)      setSavings(JSON.parse(d.savings));
          if(d.cardResumen)  setCardResumen(JSON.parse(d.cardResumen));
          if(d.resumenPending) setResumenPending(JSON.parse(d.resumenPending));
          if(d.usdRate)      setUsdRate(JSON.parse(d.usdRate));
          if(d.budget)       setBudget(JSON.parse(d.budget));
          if(d.cardSettings) setCardSettings(JSON.parse(d.cardSettings));
          if(d.catsGasto)    setCatsGasto(JSON.parse(d.catsGasto));
          if(d.catsIngreso)  setCatsIngreso(JSON.parse(d.catsIngreso));
          if(d.people)       setPeople(JSON.parse(d.people));
          if(d.onboardingSeen) setOnboardingSeen(JSON.parse(d.onboardingSeen));
          if(d.firstUseDate) setFirstUseDate(JSON.parse(d.firstUseDate));
          else { const fu=todayStr(); setFirstUseDate(fu); setDoc(ref,{firstUseDate:JSON.stringify(fu)},{merge:true}); }
        } else {
          const fu=todayStr(); setFirstUseDate(fu); setDoc(ref,{firstUseDate:JSON.stringify(fu)},{merge:true});
        }
      }
    });
    return ()=>unsub();
  },[]);

  // ✅ FIX: try/catch para no silenciar errores de Firestore
  const saveToFirestore=useCallback(async(updates)=>{
    if(!user) return;
    try{ await setDoc(doc(db,"users",user.uid),updates,{merge:true}); }
    catch(e){ console.error("Firestore error:",e); }
  },[user]);

  const [modal,setModal]=useState(null);
  const [accountDetail,setAccountDetail]=useState(null);
  const [billsView,setBillsView]=useState("current");
  const [addType,setAddType]=useState("gasto");
  const [flash,setFlash]=useState(false);
  const [payWith,setPayWith]=useState({billId:null,accountId:""});
  const [resumenPayAcc,setResumenPayAcc]=useState("");
  const [resumenPayAmt,setResumenPayAmt]=useState("");
  const [resumenPayKeep,setResumenPayKeep]=useState(true);
  const [resumenPayTarget,setResumenPayTarget]=useState(null); // 🆕 qué resumen se está pagando (mes en curso o adelantado)
  const [editingTxn,setEditingTxn]=useState(null);
  const [editingBill,setEditingBill]=useState(null);
  const [editingAcc,setEditingAcc]=useState(null);
  const [editingCat,setEditingCat]=useState(null);
  const [resetTaps,setResetTaps]=useState(0); // 🆕 contador oculto para Reinicio
  const [saving,setSaving]=useState(false);   // 🆕 feedback "Guardando…" + evita doble carga
  const savingRef=useRef(false);              // 🆕 candado instantáneo contra el doble toque

  const emptyTxn={amount:"",category:"",description:"",date:todayStr(),accountId:"",currency:"ARS",frequency:"once",installments:"",installmentAmountType:"perInstallment",fromId:"",toId:""};
  const emptyPerson={name:"",emoji:"🧑",color:"#5A9BE8",saldo:"",saldoTipo:"teDebe"};
  const emptyBill={name:"",emoji:"📋",amount:"",dueDay:"",isCard:false,accountId:"",installments:"",installmentCurrent:"1"};
  const emptyAcc={name:"",emoji:"💼",color:"#5AE89A"};
  const emptySav={name:"",goal:"",saved:""};
  const emptyCat={name:"",emoji:"🍔",color:"#E8845A"};
  const [txnForm,setTxnForm]=useState(emptyTxn);
  const [billForm,setBillForm]=useState(emptyBill);
  const [accForm,setAccForm]=useState(emptyAcc);
  const [savForm,setSavForm]=useState(emptySav);
  const [catForm,setCatForm]=useState(emptyCat);
  const [personForm,setPersonForm]=useState(emptyPerson); // 🆕
  const [editingPerson,setEditingPerson]=useState(null);   // 🆕
  const [terceroDetail,setTerceroDetail]=useState(null);   // 🆕 persona abierta en el modal
  const [addSavId,setAddSavId]=useState(null);
  const [addSavAmt,setAddSavAmt]=useState("");
  const [addSavAcc,setAddSavAcc]=useState("none"); // 🆕 cuenta de la que sale el ahorro ("none" = solo seguimiento)
  const [tempRate,setTempRate]=useState("");
  const [tempBudget,setTempBudget]=useState("");
  const [tempCard,setTempCard]=useState({closingDay:"",dueDay:""});

  useEffect(()=>{
    (async()=>{
      const [t,b,p,a,s,r,bg,cs,cr,cg,ci,pe,ts,ob,rp]=await Promise.all([
        dbLoad(KEYS.txns),dbLoad(KEYS.bills),dbLoad(KEYS.paid),dbLoad(KEYS.accounts),
        dbLoad(KEYS.savings),dbLoad(KEYS.usdRate),dbLoad(KEYS.budget),dbLoad(KEYS.cardSettings),
        dbLoad(KEYS.cardResumen),dbLoad(KEYS.catsGasto),dbLoad(KEYS.catsIngreso),
        dbLoad(KEYS.people),dbLoad(KEYS.tercerosSeen),dbLoad(KEYS.onboardingSeen),dbLoad(KEYS.resumenPending),
      ]);
      if(t) setTxns(t); if(p) setPaid(p); if(s) setSavings(s);
      if(r) setUsdRate(r); if(bg) setBudget(bg); if(cs) setCardSettings(cs);
      if(cr) setCardResumen(cr); if(cg) setCatsGasto(cg); if(ci) setCatsIngreso(ci);
      if(pe) setPeople(pe); if(ts) setTercerosSeen(ts); if(ob) setOnboardingSeen(ob); if(rp) setResumenPending(rp);
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

  const doFlash=()=>{ setFlash(true); setTimeout(()=>setFlash(false),1200); };
  const guardado=async(fn)=>{ if(savingRef.current) return; savingRef.current=true; setSaving(true); try{ await fn(); } finally{ savingRef.current=false; setSaving(false); } }; // 🆕 candado + "Guardando…" para todos los botones
  const isPaid=(id,m,y)=>paid.includes(paidKey(id,m,y));
  const toARS=t=>t.currency==="USD"?t.amount*usdRate:t.amount;
  const closeModal=()=>{
    setModal(null); setEditingTxn(null); setEditingBill(null); setEditingAcc(null); setEditingCat(null);
    setTxnForm(emptyTxn); setBillForm(emptyBill); setAccForm(emptyAcc); setSavForm(emptySav); setCatForm(emptyCat);
    setPayWith({billId:null,accountId:""}); setResumenPayAcc(""); setResumenPayAmt(""); setResumenPayKeep(true); setResumenPayTarget(null);
    setTempRate(""); setTempBudget(""); setTempCard({closingDay:"",dueDay:""});
    setAddSavId(null); setAddSavAmt(""); setDelTarget(null);
    setPersonForm(emptyPerson); setEditingPerson(null);
  };

  const {m:CM,y:CY}=getNow();
  const {m:NM,y:NY}=getNext();
  const {m:PM,y:PY}=getPrev();

  // 🆕 LÓGICA DE CIERRE DE TARJETA
  // Si la compra es DESPUÉS del día de cierre, entra al resumen del mes siguiente.
  // Si es el día de cierre o antes, entra al resumen de este mes.
  const resumenMonthForDate=(dateStr)=>{
    const dt=new Date((dateStr||todayStr())+"T12:00:00");
    let m=dt.getMonth(), y=dt.getFullYear();
    if(dt.getDate()>cardSettings.closingDay){ m++; if(m>11){m=0;y++;} }
    return {m,y};
  };
  // 🆕 Cada cuota de tarjeta tiene su propio resumen (schedule). Construye el plan
  // partiendo del resumen real de la compra y avanzando 1 mes por cuota.
  const buildSchedule=(purchaseDate,count)=>{
    const {m,y}=resumenMonthForDate(purchaseDate);
    const arr=[]; let cm=m,cy=y;
    for(let i=1;i<=count;i++){ arr.push({n:i,m:cm,y:cy}); cm++; if(cm>11){cm=0;cy++;} }
    return arr;
  };
  const dueIdx=PY*12+PM; // resumen "que vence" → referencia para congelar lo pasado
  // Una cuota está congelada si ya se pagó su resumen o si pertenece a un resumen ya cerrado/pasado.
  const entryLocked=(e)=>{
    if(cardResumen.includes(resumenKey(e.m,e.y))) return true;
    if(e.y*12+e.m < dueIdx) return true;
    return false;
  };
  // ✅ bills regulares/mensuales: respeta inicio, meses salteados (skip) y fin (end)
  const billStartedBy=(b,m,y)=>{
    if(b.installmentStartMonth===null||b.installmentStartMonth===undefined||b.installmentStartYear===null||b.installmentStartYear===undefined) return true;
    return monthOffset(b.installmentStartMonth,b.installmentStartYear,m,y)>=0;
  };
  const recurringActive=(b,m,y)=>{
    if(!billStartedBy(b,m,y)) return false;
    if(Array.isArray(b.skip)&&b.skip.includes(`${m}-${y}`)) return false;
    if(b.endMonth!==null&&b.endMonth!==undefined){ if(monthOffset(b.endMonth,b.endYear,m,y)>0) return false; }
    return true;
  };
  const isCardBillActiveInMonth=(bill,m,y)=>{
    if(!bill.isCard) return false;
    if(bill.installments===null) return recurringActive(bill,m,y);
    if(Array.isArray(bill.schedule)) return bill.schedule.some(e=>e.m===m&&e.y===y);
    const sm=bill.installmentStartMonth!==null?bill.installmentStartMonth:m;
    const sy=bill.installmentStartYear!==null?bill.installmentStartYear:y;
    const offset=monthOffset(sm,sy,m,y);
    if(offset<1) return false;
    return offset<=bill.installments;
  };
  const getInstallmentNumber=(bill,m,y)=>{
    if(!bill.installments) return null;
    if(Array.isArray(bill.schedule)){ const e=bill.schedule.find(x=>x.m===m&&x.y===y); return e?e.n:null; }
    const sm=bill.installmentStartMonth!==null?bill.installmentStartMonth:m;
    const sy=bill.installmentStartYear!==null?bill.installmentStartYear:y;
    return monthOffset(sm,sy,m,y);
  };
  // 🆕 unidades en un resumen (puede haber 2 cuotas juntas tras un adelanto de cierre)
  const cardUnitsInResumen=(b,m,y)=>{
    if(!b.isCard) return 0;
    if(b.installments===null) return recurringActive(b,m,y)?1:0;
    if(Array.isArray(b.schedule)) return b.schedule.filter(e=>e.m===m&&e.y===y).length;
    return isCardBillActiveInMonth(b,m,y)?1:0;
  };
  const cardFixedTotalForResumen=(m,y)=>bills.reduce((s,b)=>s+cardUnitsInResumen(b,m,y)*b.amount,0);
  // 🆕 filas de tarjeta para un resumen (con número de cuota y la entrada, para mover/borrar)
  const cardRowsForResumen=(m,y)=>{
    const rows=[];
    bills.forEach(b=>{
      if(!b.isCard) return;
      if(b.installments===null){ if(recurringActive(b,m,y)) rows.push({bill:b,n:null,e:null}); }
      else if(Array.isArray(b.schedule)){ b.schedule.filter(e=>e.m===m&&e.y===y).forEach(e=>rows.push({bill:b,n:e.n,e})); }
      else if(isCardBillActiveInMonth(b,m,y)){ rows.push({bill:b,n:getInstallmentNumber(b,m,y),e:null}); }
    });
    return rows;
  };

  const txnInResumen=(t,m,y)=>{
    if(t.type!=="gasto"||t.accountId!=="tarjeta") return false;
    const r=resumenMonthForDate(t.date);
    return r.m===m&&r.y===y;
  };
  const cardTxnsForResumen=(m,y)=>txns.filter(t=>txnInResumen(t,m,y));
  const prevResumenOf=(m,y)=>{ let pm=m-1,py=y; if(pm<0){pm=11;py--;} return {m:pm,y:py}; };
  const carryInto=(m,y)=>{ const p=prevResumenOf(m,y); return resumenPending[resumenKey(p.m,p.y)]||0; };
  const resumenTotal=(m,y)=>cardFixedTotalForResumen(m,y)+cardTxnsForResumen(m,y).reduce((s,t)=>s+toARS(t),0)+carryInto(m,y);

  const activeCardBillsThisMonth=bills.filter(b=>isCardBillActiveInMonth(b,CM,CY));
  const activeCardBillsPrevMonth=bills.filter(b=>isCardBillActiveInMonth(b,PM,PY));
  // ✅ totales por cierre, contando cuotas dobles si las hubiera
  const prevResumenAmount=resumenTotal(PM,PY);
  const currAccumulating=resumenTotal(CM,CY);

  const prevResumenKey_=resumenKey(PM,PY);
  const prevResumenPaid=cardResumen.includes(prevResumenKey_);
  const resumenDueDay=cardSettings.dueDay;
  const resumenDaysLeft=daysUntil(resumenDueDay,CM,CY);
  const closingPassed=new Date().getDate()>cardSettings.closingDay;
  const currResumenPaid=cardResumen.includes(resumenKey(CM,CY));

  const regularBills=bills.filter(b=>!b.isCard);
  const regularBillsSorted=[...regularBills].filter(b=>(b.installments===null||b.installmentCurrent<=b.installments)&&recurringActive(b,CM,CY)).sort((a,b2)=>a.dueDay-b2.dueDay);
  const pendingRegularBills=regularBillsSorted.filter(b=>!isPaid(b.id,CM,CY));
  const pendingTotal=pendingRegularBills.reduce((s,b)=>s+b.amount,0)+(prevResumenPaid?0:prevResumenAmount);
  const monthlyFixedTotal=regularBills.filter(b=>(b.installments===null||b.installmentCurrent<=b.installments)&&recurringActive(b,CM,CY)).reduce((s,b)=>s+b.amount,0)+cardFixedTotalForResumen(CM,CY);
  const urgentRegular=pendingRegularBills.filter(b=>daysUntil(b.dueDay,CM,CY)<=5).sort((a,b2)=>daysUntil(a.dueDay,CM,CY)-daysUntil(b2.dueDay,CM,CY));
  const resumenIsUrgent=!prevResumenPaid&&resumenDaysLeft<=5&&prevResumenAmount>0;

  // 🆕 ids de cuentas reales (las personas/terceros NO cuentan como plata propia)
  const realIds=new Set(accounts.map(a=>a.id));
  const isPersonId=(id)=>people.some(p=>p.id===id);
  // Ingresos/Gastos propios (excluye gastos financiados por terceros, que no son plata tuya)
  const totalIn=txns.filter(t=>t.type==="ingreso"&&realIds.has(t.accountId)).reduce((s,t)=>s+toARS(t),0);
  const totalOut=txns.filter(t=>t.type==="gasto"&&realIds.has(t.accountId)).reduce((s,t)=>s+toARS(t),0);
  // transferencias que entran/salen de cuentas reales (devolver/prestar/que te depositen)
  const transferNetReal=txns.filter(t=>t.type==="transfer").reduce((s,t)=>s+(realIds.has(t.toId)?toARS(t):0)-(realIds.has(t.fromId)?toARS(t):0),0);
  const txnBalance=totalIn-totalOut;
  const realBalance=txnBalance+transferNetReal-pendingTotal;

  const accountBalance=(accId)=>{
    const inc=txns.filter(t=>t.type==="ingreso"&&t.accountId===accId).reduce((s,t)=>s+toARS(t),0);
    const out=txns.filter(t=>t.type==="gasto"&&t.accountId===accId).reduce((s,t)=>s+toARS(t),0);
    const tIn=txns.filter(t=>t.type==="transfer"&&t.toId===accId).reduce((s,t)=>s+toARS(t),0);
    const tOut=txns.filter(t=>t.type==="transfer"&&t.fromId===accId).reduce((s,t)=>s+toARS(t),0);
    const base=inc-out+tIn-tOut;
    if(isPersonId(accId)) return base; // personas: + = te debe, − = le debés (sin deudas ni resumen)
    if(accId==="tarjeta") return base-(prevResumenPaid?0:prevResumenAmount);
    const debt=regularBills.filter(b=>b.accountId===accId&&!isPaid(b.id,CM,CY)&&(b.installments===null||b.installmentCurrent<=b.installments)).reduce((s,b)=>s+b.amount,0);
    return base-debt;
  };
  // 🆕 nombre/emoji/color de cualquier entidad (cuenta real o persona)
  const entityOf=(id)=>{ const sv=savings.find(s=>s.id===id); return accounts.find(a=>a.id===id)||people.find(p=>p.id===id)||(sv?{id:sv.id,name:sv.name,emoji:"🎯",color:"#C8A97E"}:null); };
  // 🆕 movimientos asociados a una entidad (cuenta real o persona), con dirección de impacto
  const entityMovements=(id)=>{
    const res=[];
    txns.forEach(t=>{
      if(t.type==="transfer"){
        if(t.fromId===id){ const o=entityOf(t.toId); res.push({t,dir:-1,label:t.description||`Transferencia → ${o?o.name:"?"}`}); }
        else if(t.toId===id){ const o=entityOf(t.fromId); res.push({t,dir:1,label:t.description||`Transferencia ← ${o?o.name:"?"}`}); }
      } else if(t.accountId===id){ res.push({t,dir:t.type==="ingreso"?1:-1,label:t.description||t.category}); }
    });
    return res.sort((a,b)=>new Date(b.t.date+"T12:00:00")-new Date(a.t.date+"T12:00:00"));
  };

  const thisMonthSpend=txns.filter(t=>{ if(t.type!=="gasto") return false; const dt=new Date(t.date+"T12:00:00"); return dt.getMonth()===CM&&dt.getFullYear()===CY; }).reduce((s,t)=>s+toARS(t),0)+regularBills.filter(b=>isPaid(b.id,CM,CY)).reduce((s,b)=>s+b.amount,0);
  const budgetPct=budget>0?Math.min(120,Math.round((thisMonthSpend/budget)*100)):0;

  const last12=Array.from({length:12},(_,i)=>{ const d=new Date(); d.setMonth(d.getMonth()-(11-i)); return{m:d.getMonth(),y:d.getFullYear(),label:MONTHS_ES[d.getMonth()]}; });
  const monthlyChartData=last12.map(({m,y,label})=>{
    const txnSpend=txns.filter(t=>{ if(t.type!=="gasto"||t.accountId==="tarjeta")return false; const dt=new Date(t.date+"T12:00:00"); return dt.getMonth()===m&&dt.getFullYear()===y; }).reduce((s,t)=>s+toARS(t),0);
    const billSpend=regularBills.filter(b=>paid.includes(paidKey(b.id,m,y))).reduce((s,b)=>s+b.amount,0);
    // ✅ tarjeta agrupada por cierre
    const cardTxn=cardTxnsForResumen(m,y).reduce((s,t)=>s+toARS(t),0);
    const cardFixed=cardFixedTotalForResumen(m,y);
    return{label,txns:Math.round(txnSpend/1000)*1000,bills:Math.round(billSpend/1000)*1000,card:Math.round((cardFixed+cardTxn)/1000)*1000};
  });
  const gatosCatData=catsGasto.map(c=>({...c,total:txns.filter(t=>t.type==="gasto"&&t.category===c.name).reduce((s,t)=>s+toARS(t),0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);

  // ── CRUD: Transactions ────────────────────────────────────────────────────
  // 🆕 Transacción: mover plata de una cuenta a otra (real o de tercero)
  const addTransfer=async()=>{
    if(!txnForm.amount||!txnForm.fromId||!txnForm.toId||txnForm.fromId===txnForm.toId) return;
    const t={id:Date.now(),type:"transfer",fromId:txnForm.fromId,toId:txnForm.toId,amount:parseFloat(txnForm.amount),date:txnForm.date,description:txnForm.description,currency:txnForm.currency||"ARS"};
    const u=[t,...txns]; setTxns(u); await dbSave(KEYS.txns,u); await saveToFirestore({txns:JSON.stringify(u)});
    doFlash(); closeModal();
  };
  // 🆕 CRUD personas (cuentas de terceros)
  const markTercerosSeen=async()=>{ setTercerosSeen(true); await dbSave(KEYS.tercerosSeen,true); await saveToFirestore({tercerosSeen:JSON.stringify(true)}); };
  const finishOnboarding=async()=>{ setOnboardingSeen(true); setOnboardingStep(0); await dbSave(KEYS.onboardingSeen,true); await saveToFirestore({onboardingSeen:JSON.stringify(true)}); };
  const addPerson=async()=>{ if(!personForm.name) return; const pid="p"+Date.now().toString(); const pr={id:pid,name:personForm.name,emoji:personForm.emoji,color:personForm.color}; const u=[...people,pr]; setPeople(u); await dbSave(KEYS.people,u); await saveToFirestore({people:JSON.stringify(u)}); const sal=parseFloat(personForm.saldo); if(sal>0){ const signo=personForm.saldoTipo==="teDebe"?1:-1; const t={id:Date.now()+1,type:"transfer",fromId:signo>0?"_init":pid,toId:signo>0?pid:"_init",amount:sal,currency:"ARS",date:todayStr(),description:"Saldo inicial"}; const tu=[t,...txns]; setTxns(tu); await dbSave(KEYS.txns,tu); await saveToFirestore({txns:JSON.stringify(tu)}); } doFlash(); setPersonForm(emptyPerson); setEditingPerson(null); setModal("terceros"); };
  const delPerson=async id=>{ const u=people.filter(p=>p.id!==id); setPeople(u); await dbSave(KEYS.people,u); await saveToFirestore({people:JSON.stringify(u)}); if(terceroDetail===id) setTerceroDetail(null); };
  const startEditPerson=(pr)=>{ setEditingPerson(pr.id); setPersonForm({name:pr.name,emoji:pr.emoji,color:pr.color}); setModal("personForm"); };
  const savePersonEdit=async()=>{ if(!personForm.name) return; const u=people.map(p=>p.id===editingPerson?{...p,name:personForm.name,emoji:personForm.emoji,color:personForm.color}:p); setPeople(u); await dbSave(KEYS.people,u); await saveToFirestore({people:JSON.stringify(u)}); doFlash(); setPersonForm(emptyPerson); setEditingPerson(null); setModal("terceros"); };

  const addTxn=async()=>{
    if(!txnForm.amount||!txnForm.accountId) return;
    if(txnForm.frequency==="monthly"){
      if(!txnForm.description) return;
      const day=parseInt(txnForm.date)||15;
      const isCard=txnForm.accountId==="tarjeta";
      // ✅ FIX: guardamos el mes actual como punto de inicio para que no aparezca en meses pasados
      const b={id:Date.now(),name:txnForm.description,emoji:"📋",amount:parseFloat(txnForm.amount),dueDay:day,isCard,accountId:txnForm.accountId,installments:null,installmentCurrent:null,installmentStartMonth:CM,installmentStartYear:CY};
      const u=[...bills,b]; setBills(u); await dbSave(KEYS.bills,u); await saveToFirestore({bills:JSON.stringify(u)});
      doFlash(); closeModal(); return;
    }
    if(txnForm.frequency==="installments"&&txnForm.installments){
      const totalInst=parseInt(txnForm.installments);
      let perInst=parseFloat(txnForm.amount);
      if(txnForm.installmentAmountType==="total") perInst=Math.round(perInst/totalInst);
      const isCard=txnForm.accountId==="tarjeta";
      const pDate=txnForm.date||todayStr();
      const cd=new Date(pDate+"T12:00:00");
      let startM=cd.getMonth(), startY=cd.getFullYear();
      let schedule=null;
      // 🆕 tarjeta: cada cuota guarda su resumen propio (según el cierre vigente al cargarla)
      if(isCard){ schedule=buildSchedule(pDate,totalInst); startM=schedule[0].m; startY=schedule[0].y; }
      const b={id:Date.now(),name:txnForm.description||txnForm.category||"Compra en cuotas",emoji:"💳",amount:perInst,dueDay:cd.getDate()||1,isCard,accountId:txnForm.accountId,installments:totalInst,installmentCurrent:1,installmentStartMonth:startM,installmentStartYear:startY,purchaseDate:pDate,schedule};
      const u=[...bills,b]; setBills(u); await dbSave(KEYS.bills,u); await saveToFirestore({bills:JSON.stringify(u)});
      doFlash(); closeModal(); return;
    }
    if(addType==="gasto"&&!txnForm.category&&txnForm.accountId!=="tarjeta") return;
    if(addType==="ingreso"&&!txnForm.category) return;
    const t={id:Date.now(),type:addType,amount:parseFloat(txnForm.amount),category:txnForm.category||"Otros",description:txnForm.description,date:txnForm.date,accountId:txnForm.accountId,currency:txnForm.currency||"ARS"};
    const u=[t,...txns]; setTxns(u); await dbSave(KEYS.txns,u); await saveToFirestore({txns:JSON.stringify(u)});
    doFlash(); closeModal();
  };

  const delTxn=async id=>{
    const txn=txns.find(t=>t.id===id);
    const u=txns.filter(t=>t.id!==id);
    setTxns(u); await dbSave(KEYS.txns,u);
    await saveToFirestore({txns:JSON.stringify(u)}); // ✅ FIX siempre sincroniza
    if(!txn) return;
    const txnDate=new Date(txn.date+"T12:00:00");
    const txnM=txnDate.getMonth(); const txnY=txnDate.getFullYear();
    let newPaid=[...paid]; let newResumen=[...cardResumen];
    if(txn._billId!==undefined){ newPaid=newPaid.filter(k=>k!==`${txn._billId}-${txn._paidM}-${txn._paidY}`); }
    if(txn.description&&txn.description.startsWith("Pago: ")){
      const bn=txn.description.replace("Pago: ","");
      bills.filter(b=>b.name===bn).forEach(b=>{ newPaid=newPaid.filter(k=>k!==`${b.id}-${txnM}-${txnY}`); });
    }
    if(txn._cardResumenKey){ newResumen=newResumen.filter(k=>k!==txn._cardResumenKey); }
    if(txn.description&&txn.description.startsWith("Resumen Tarjeta")){
      const prevM=txnM===0?11:txnM-1; const prevY=txnM===0?txnY-1:txnY;
      newResumen=newResumen.filter(k=>k!==`resumen-${prevM}-${prevY}`);
    }
    // ✅ FIX sincroniza paid y cardResumen si cambiaron
    if(newPaid.length!==paid.length){ setPaid(newPaid); await dbSave(KEYS.paid,newPaid); await saveToFirestore({paid:JSON.stringify(newPaid)}); }
    if(newResumen.length!==cardResumen.length){ setCardResumen(newResumen); await dbSave(KEYS.cardResumen,newResumen); await saveToFirestore({cardResumen:JSON.stringify(newResumen)}); }
    if(txn._cardResumenKey&&resumenPending[txn._cardResumenKey]!==undefined){ const np={...resumenPending}; delete np[txn._cardResumenKey]; setResumenPending(np); await dbSave(KEYS.resumenPending,np); await saveToFirestore({resumenPending:JSON.stringify(np)}); }
  };

  const startEditTxn=(txn)=>{ setEditingTxn(txn.id); setTxnForm({amount:String(txn.amount),category:txn.category||"",description:txn.description||"",date:txn.date,accountId:txn.accountId||"",currency:txn.currency||"ARS",frequency:"once",installments:"",installmentAmountType:"perInstallment"}); setAddType(txn.type); setModal("editTxn"); };

  const saveTxnEdit=async()=>{
    if(!txnForm.amount||!txnForm.accountId||!txnForm.category) return;
    const u=txns.map(t=>t.id===editingTxn?{...t,amount:parseFloat(txnForm.amount),category:txnForm.category,description:txnForm.description,date:txnForm.date,accountId:txnForm.accountId,currency:txnForm.currency}:t);
    setTxns(u); await dbSave(KEYS.txns,u);
    await saveToFirestore({txns:JSON.stringify(u)}); // ✅ FIX sincroniza al editar
    doFlash(); closeModal();
  };

  // ── CRUD: Bills ────────────────────────────────────────────────────────────
  const addBill=async()=>{
    if(!billForm.name||!billForm.amount||!billForm.dueDay) return;
    const hasInst=billForm.installments&&parseInt(billForm.installments)>0;
    const b={id:Date.now(),name:billForm.name,emoji:billForm.emoji,amount:parseFloat(billForm.amount),dueDay:parseInt(billForm.dueDay),isCard:billForm.isCard,accountId:billForm.isCard?"tarjeta":(billForm.accountId||""),installments:hasInst?parseInt(billForm.installments):null,installmentCurrent:hasInst?parseInt(billForm.installmentCurrent):null,installmentStartMonth:null,installmentStartYear:null};
    const u=[...bills,b]; setBills(u); await dbSave(KEYS.bills,u); await saveToFirestore({bills:JSON.stringify(u)}); doFlash(); closeModal();
  };
  const delBill=async id=>{ const u=bills.filter(b=>b.id!==id); setBills(u); await dbSave(KEYS.bills,u); await saveToFirestore({bills:JSON.stringify(u)}); };
  const startEditBill=(bill)=>{ setEditingBill(bill.id); setBillForm({name:bill.name,emoji:bill.emoji,amount:String(bill.amount),dueDay:String(bill.dueDay),isCard:bill.isCard,accountId:bill.accountId||"",installments:bill.installments?String(bill.installments):"",installmentCurrent:bill.installmentCurrent?String(bill.installmentCurrent):"1"}); setModal("editBill"); };
  const saveBillEdit=async()=>{
    if(!billForm.name||!billForm.amount||!billForm.dueDay) return;
    const hasInst=billForm.installments&&parseInt(billForm.installments)>0;
    const u=bills.map(b=>{
      if(b.id!==editingBill) return b;
      const nb={...b,name:billForm.name,emoji:billForm.emoji,amount:parseFloat(billForm.amount),dueDay:parseInt(billForm.dueDay),isCard:billForm.isCard,accountId:billForm.isCard?"tarjeta":(billForm.accountId||""),installments:hasInst?parseInt(billForm.installments):null,installmentCurrent:hasInst?parseInt(billForm.installmentCurrent):null};
      // 🆕 si es cuota de tarjeta y cambió la cantidad de cuotas, rearmamos el schedule (respetando lo ya pagado)
      if(nb.isCard&&hasInst){
        const newCount=parseInt(billForm.installments);
        if(!Array.isArray(b.schedule)){ nb.schedule=buildSchedule(b.purchaseDate||todayStr(),newCount); nb.purchaseDate=b.purchaseDate||todayStr(); }
        else if(b.schedule.length!==newCount){
          const kept=b.schedule.filter(e=>e.n<=newCount);
          if(newCount>b.schedule.length){ const nat=buildSchedule(b.purchaseDate||todayStr(),newCount); for(let i=b.schedule.length+1;i<=newCount;i++){ const x=nat.find(z=>z.n===i); kept.push({n:i,m:x.m,y:x.y}); } }
          nb.schedule=kept.sort((a,c)=>a.n-c.n);
        }
      }
      if(!nb.isCard||!hasInst){ nb.schedule=null; }
      return nb;
    });
    setBills(u); await dbSave(KEYS.bills,u); await saveToFirestore({bills:JSON.stringify(u)}); doFlash(); closeModal();
  };

  // 🆕 BORRAR CUOTA (con confirmación de "siguientes")
  const [delTarget,setDelTarget]=useState(null); // {kind, billId, n, m, y, name}
  const openDelCuota=(b,n,m,y)=>{ setDelTarget({kind:"cuota",billId:b.id,n,m,y,name:b.name,hasSchedule:Array.isArray(b.schedule)}); setModal("delCuota"); };
  const openDelMonthly=(b,m,y)=>{ setDelTarget({kind:"monthly",billId:b.id,m,y,name:b.name}); setModal("delMonthly"); };
  const deleteCuota=async(mode)=>{
    const b=bills.find(x=>x.id===delTarget.billId); if(!b){closeModal();return;}
    let u;
    if(Array.isArray(b.schedule)){
      let sched;
      if(mode==="onlyThis") sched=b.schedule.filter(e=>e.n!==delTarget.n);
      else sched=b.schedule.filter(e=>e.n<delTarget.n||entryLocked(e)); // esta y las siguientes (sin tocar lo congelado)
      u=sched.length===0?bills.filter(x=>x.id!==b.id):bills.map(x=>x.id===b.id?{...x,schedule:sched}:x);
    } else {
      u=bills.filter(x=>x.id!==b.id); // modelo viejo sin schedule → se borra la compra completa
    }
    setBills(u); await dbSave(KEYS.bills,u); await saveToFirestore({bills:JSON.stringify(u)}); doFlash(); closeModal();
  };
  const deleteMonthly=async(mode)=>{
    const b=bills.find(x=>x.id===delTarget.billId); if(!b){closeModal();return;}
    const {m,y}=delTarget; let u;
    if(mode==="all"){ u=bills.filter(x=>x.id!==b.id); }
    else if(mode==="onlyThis"){ const skip=Array.isArray(b.skip)?[...b.skip]:[]; if(!skip.includes(`${m}-${y}`)) skip.push(`${m}-${y}`); u=bills.map(x=>x.id===b.id?{...x,skip}:x); }
    else { let em=m-1,ey=y; if(em<0){em=11;ey--;} if(b.installmentStartMonth!==null&&b.installmentStartMonth!==undefined&&monthOffset(b.installmentStartMonth,b.installmentStartYear,em,ey)<0){ u=bills.filter(x=>x.id!==b.id); } else u=bills.map(x=>x.id===b.id?{...x,endMonth:em,endYear:ey}:x); }
    setBills(u); await dbSave(KEYS.bills,u); await saveToFirestore({bills:JSON.stringify(u)}); doFlash(); closeModal();
  };
  // 🆕 RECALCULAR cuotas no pagadas según el día de cierre actual (congela pagadas/pasadas)
  const recalcInstallments=async()=>{
    const u=bills.map(b=>{
      if(!b.isCard||b.installments===null||!Array.isArray(b.schedule)||!b.purchaseDate) return b;
      const natural=buildSchedule(b.purchaseDate,b.installments);
      const newSched=b.schedule.map(e=>{ if(entryLocked(e)) return e; const nat=natural.find(x=>x.n===e.n); return nat?{...e,m:nat.m,y:nat.y}:e; });
      return {...b,schedule:newSched};
    });
    setBills(u); await dbSave(KEYS.bills,u); await saveToFirestore({bills:JSON.stringify(u)}); doFlash();
  };
  // 🆕 mover una cuota puntual (adelanto de cierre por feriado, etc.)
  const moveCuota=async(billId,n,dir)=>{
    const u=bills.map(b=>{
      if(b.id!==billId||!Array.isArray(b.schedule)) return b;
      const sched=b.schedule.map(e=>{ if(e.n!==n) return e; let m=e.m+dir,y=e.y; if(m>11){m=0;y++;} if(m<0){m=11;y--;} return {...e,m,y}; });
      return {...b,schedule:sched};
    });
    setBills(u); await dbSave(KEYS.bills,u); await saveToFirestore({bills:JSON.stringify(u)});
  };

  // ── Toggle paid ────────────────────────────────────────────────────────────
  const togglePaid=async(billId,fromAccountId,m,y)=>{
    const key=paidKey(billId,m,y);
    if(paid.includes(key)){
      // ✅ FIX al desmarcar también sincroniza con Firestore
      const u=paid.filter(k=>k!==key); setPaid(u); await dbSave(KEYS.paid,u); await saveToFirestore({paid:JSON.stringify(u)});
    } else {
      const u=[...paid,key]; setPaid(u); await dbSave(KEYS.paid,u); await saveToFirestore({paid:JSON.stringify(u)});
      const bill=bills.find(b=>b.id===billId);
      if(bill&&fromAccountId&&fromAccountId!=="none"){
        const txn={id:Date.now(),type:"gasto",amount:bill.amount,category:"Servicios e Impuestos",description:`Pago: ${bill.name}`,date:todayStr(),accountId:fromAccountId,currency:"ARS",_billId:billId,_paidM:m!==undefined?m:CM,_paidY:y!==undefined?y:CY};
        const tu=[txn,...txns]; setTxns(tu); await dbSave(KEYS.txns,tu); await saveToFirestore({txns:JSON.stringify(tu)});
      }
    }
    setPayWith({billId:null,accountId:""});
  };

  // ── Pay card resumen ───────────────────────────────────────────────────────
  const payCardResumen=async(fromAccountId,rKey,rTotal,labelM,paidAmount,keepPending)=>{
    const pay=(paidAmount===undefined||paidAmount===null||paidAmount==="")?rTotal:(parseFloat(paidAmount)||0);
    // marca el resumen como saldado (total, parcial o de más)
    const u=cardResumen.includes(rKey)?cardResumen:[...cardResumen,rKey];
    setCardResumen(u); await dbSave(KEYS.cardResumen,u); await saveToFirestore({cardResumen:JSON.stringify(u)});
    // remanente: solo si pagaste de menos Y marcaste que queda pendiente
    const remainder=(pay<rTotal&&keepPending)?Math.round(rTotal-pay):0;
    const np={...resumenPending};
    if(remainder>0) np[rKey]=remainder; else delete np[rKey];
    setResumenPending(np); await dbSave(KEYS.resumenPending,np); await saveToFirestore({resumenPending:JSON.stringify(np)});
    // movimiento real: sale lo que efectivamente pagaste (si pagaste de más, el excedente queda como intereses/cargos en Finanzas)
    if(fromAccountId&&fromAccountId!=="none"&&pay>0){
      const desc=pay>rTotal?`Resumen Tarjeta ${MONTHS_FULL[labelM!==undefined?labelM:PM]} (incluye intereses/cargos)`:`Resumen Tarjeta ${MONTHS_FULL[labelM!==undefined?labelM:PM]}`;
      const txn={id:Date.now(),type:"gasto",amount:pay,category:"Finanzas",description:desc,date:todayStr(),accountId:fromAccountId,currency:"ARS",_cardResumenKey:rKey};
      const tu=[txn,...txns]; setTxns(tu); await dbSave(KEYS.txns,tu); await saveToFirestore({txns:JSON.stringify(tu)});
    }
    doFlash(); setResumenPayAcc(""); setResumenPayAmt(""); setResumenPayKeep(true); setModal(null);
  };

  // ── CRUD: Accounts ─────────────────────────────────────────────────────────
  const addAccount=async()=>{ if(!accForm.name) return; const a={id:Date.now().toString(),name:accForm.name,emoji:accForm.emoji,color:accForm.color}; const u=[...accounts,a]; setAccounts(u); await dbSave(KEYS.accounts,u); await saveToFirestore({accounts:JSON.stringify(u)}); doFlash(); closeModal(); };
  const delAccount=async id=>{ const u=accounts.filter(a=>a.id!==id); setAccounts(u); await dbSave(KEYS.accounts,u); await saveToFirestore({accounts:JSON.stringify(u)}); };
  const startEditAcc=(acc)=>{ setEditingAcc(acc.id); setAccForm({name:acc.name,emoji:acc.emoji,color:acc.color}); setModal("editAcc"); };
  const saveAccEdit=async()=>{ const u=accounts.map(a=>a.id===editingAcc?{...a,name:accForm.name,emoji:accForm.emoji,color:accForm.color}:a); setAccounts(u); await dbSave(KEYS.accounts,u); await saveToFirestore({accounts:JSON.stringify(u)}); doFlash(); closeModal(); };

  // ── CRUD: Savings ──────────────────────────────────────────────────────────
  const addSaving=async()=>{ if(!savForm.name||!savForm.goal) return; const s={id:Date.now().toString(),name:savForm.name,goal:parseFloat(savForm.goal),saved:parseFloat(savForm.saved||0)}; const u=[...savings,s]; setSavings(u); await dbSave(KEYS.savings,u); await saveToFirestore({savings:JSON.stringify(u)}); doFlash(); closeModal(); };
  const addToSaving=async()=>{
    if(!addSavId||!addSavAmt) return;
    const amt=parseFloat(addSavAmt); if(!amt||amt<=0) return;
    const u=savings.map(s=>s.id===addSavId?{...s,saved:s.saved+amt}:s);
    setSavings(u); await dbSave(KEYS.savings,u); await saveToFirestore({savings:JSON.stringify(u)});
    // 🆕 si se eligió una cuenta, el dinero sale de ahí (se registra como transferencia al ahorro, no como gasto)
    if(addSavAcc&&addSavAcc!=="none"&&realIds.has(addSavAcc)){
      const t={id:Date.now(),type:"transfer",fromId:addSavAcc,toId:addSavId,amount:amt,currency:"ARS",date:todayStr(),description:`Ahorro: ${savings.find(s=>s.id===addSavId)?.name||""}`};
      const tu=[t,...txns]; setTxns(tu); await dbSave(KEYS.txns,tu); await saveToFirestore({txns:JSON.stringify(tu)});
    }
    setAddSavId(null); setAddSavAmt(""); setAddSavAcc("none");
  };
  const delSaving=async id=>{ const u=savings.filter(s=>s.id!==id); setSavings(u); await dbSave(KEYS.savings,u); await saveToFirestore({savings:JSON.stringify(u)}); };

  // ── CRUD: Categories ───────────────────────────────────────────────────────
  const addCat=async(type)=>{
    if(!catForm.name) return;
    const cat={name:catForm.name,emoji:catForm.emoji,color:catForm.color};
    if(type==="gasto"){ const u=[...catsGasto,cat]; setCatsGasto(u); await dbSave(KEYS.catsGasto,u); await saveToFirestore({catsGasto:JSON.stringify(u)}); } // ✅ FIX
    else { const u=[...catsIngreso,cat]; setCatsIngreso(u); await dbSave(KEYS.catsIngreso,u); await saveToFirestore({catsIngreso:JSON.stringify(u)}); } // ✅ FIX
    doFlash(); closeModal();
  };
  const delCat=async(type,idx)=>{
    if(type==="gasto"){ const u=catsGasto.filter((_,i)=>i!==idx); setCatsGasto(u); await dbSave(KEYS.catsGasto,u); await saveToFirestore({catsGasto:JSON.stringify(u)}); } // ✅ FIX
    else { const u=catsIngreso.filter((_,i)=>i!==idx); setCatsIngreso(u); await dbSave(KEYS.catsIngreso,u); await saveToFirestore({catsIngreso:JSON.stringify(u)}); } // ✅ FIX
  };
  const startEditCat=(type,idx)=>{ const cat=type==="gasto"?catsGasto[idx]:catsIngreso[idx]; setEditingCat({type,idx}); setCatForm({name:cat.name,emoji:cat.emoji,color:cat.color}); setModal("editCat"); };
  const saveCatEdit=async()=>{
    const {type,idx}=editingCat;
    if(type==="gasto"){ const u=catsGasto.map((c,i)=>i===idx?{...c,...catForm}:c); setCatsGasto(u); await dbSave(KEYS.catsGasto,u); await saveToFirestore({catsGasto:JSON.stringify(u)}); } // ✅ FIX
    else { const u=catsIngreso.map((c,i)=>i===idx?{...c,...catForm}:c); setCatsIngreso(u); await dbSave(KEYS.catsIngreso,u); await saveToFirestore({catsIngreso:JSON.stringify(u)}); } // ✅ FIX
    doFlash(); closeModal();
  };

  // ── Misc saves ─────────────────────────────────────────────────────────────
  const saveRate=async()=>{ const n=parseFloat(tempRate); if(!n||n<=0) return; setUsdRate(n); await dbSave(KEYS.usdRate,n); await saveToFirestore({usdRate:JSON.stringify(n)}); doFlash(); closeModal(); }; // ✅ FIX
  const saveBudget=async()=>{ const n=parseFloat(tempBudget); if(!n||n<=0) return; setBudget(n); await dbSave(KEYS.budget,n); await saveToFirestore({budget:JSON.stringify(n)}); doFlash(); closeModal(); }; // ✅ FIX
  const saveCardSettings_=async()=>{ const s={closingDay:parseInt(tempCard.closingDay)||25,dueDay:parseInt(tempCard.dueDay)||1}; setCardSettings(s); await dbSave(KEYS.cardSettings,s); await saveToFirestore({cardSettings:JSON.stringify(s)}); doFlash(); closeModal(); }; // ✅ FIX

  // 🆕 REINICIO TOTAL — borra todos los datos de prueba y vuelve todo a cero.
  // Mantiene la configuración (tipo de cambio y fechas de tarjeta).
  const resetAll=async()=>{
    setTxns([]); setBills([]); setPaid([]); setCardResumen([]); setSavings([]); setResumenPending({});
    setAccounts(DEFAULT_ACCOUNTS); setBudget(0); setPeople([]);
    setCatsGasto(DEFAULT_CATS_GASTO); setCatsIngreso(DEFAULT_CATS_INGRESO);
    setAccountDetail(null); setTerceroDetail(null); setTab("home");
    await Promise.all([
      dbSave(KEYS.txns,[]), dbSave(KEYS.bills,[]), dbSave(KEYS.paid,[]),
      dbSave(KEYS.cardResumen,[]), dbSave(KEYS.savings,[]), dbSave(KEYS.people,[]), dbSave(KEYS.resumenPending,{}),
      dbSave(KEYS.accounts,DEFAULT_ACCOUNTS), dbSave(KEYS.budget,0),
      dbSave(KEYS.catsGasto,DEFAULT_CATS_GASTO), dbSave(KEYS.catsIngreso,DEFAULT_CATS_INGRESO),
    ]);
    await saveToFirestore({
      txns:JSON.stringify([]), bills:JSON.stringify([]), paid:JSON.stringify([]),
      cardResumen:JSON.stringify([]), savings:JSON.stringify([]), people:JSON.stringify([]), resumenPending:JSON.stringify({}),
      accounts:JSON.stringify(DEFAULT_ACCOUNTS), budget:JSON.stringify(0),
      catsGasto:JSON.stringify(DEFAULT_CATS_GASTO), catsIngreso:JSON.stringify(DEFAULT_CATS_INGRESO),
    });
    doFlash(); setTimeout(()=>closeModal(),600);
  };

  const C={gold:"#C8A97E",red:"#E85A5A",green:"#5AE89A",blue:"#5A9BE8",pink:"#E87ACE",purple:"#A07CFE",bg:"#0D0D12",text:"#EDE9E3"};
  const S={
    app:(mob)=>mob?{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"AppNums, Georgia, serif",maxWidth:430,margin:"0 auto",paddingBottom:80,overflow:"hidden"}:{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"AppNums, Georgia, serif",display:"flex",width:"100%"},
    content:{flex:1,overflowY:"auto",paddingBottom:40,minWidth:0},
    hdr:{padding:"24px 20px 12px",borderBottom:"1px solid rgba(200,169,126,0.1)"},
    ey:{fontSize:11,letterSpacing:4,color:C.gold,textTransform:"uppercase",marginBottom:2},
    h1:{fontSize:22,margin:0,fontWeight:"normal"},
    gCard:(ex={})=>({background:"linear-gradient(135deg,#1A1208,#221808)",border:"1px solid rgba(200,169,126,0.25)",borderRadius:20,padding:"20px 22px",margin:"14px 14px 0",...ex}),
    card:(ex={})=>({background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:16,margin:"10px 14px 0",...ex}),
    alertC:{background:"rgba(232,90,90,0.07)",border:"1px solid rgba(232,90,90,0.22)",borderRadius:16,padding:"14px 16px",margin:"10px 14px 0"},
    pinkC:{background:"rgba(232,122,206,0.07)",border:"1px solid rgba(232,122,206,0.22)",borderRadius:16,padding:"14px 16px",margin:"10px 14px 0"},
    sec:{fontSize:10,letterSpacing:4,color:C.gold,textTransform:"uppercase",padding:"18px 20px 10px"},
    lbl:{fontSize:10,letterSpacing:3,color:C.gold,textTransform:"uppercase",display:"block",marginBottom:7},
    inp:{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(200,169,126,0.18)",borderRadius:11,padding:"13px 14px",color:C.text,fontSize:15,fontFamily:"AppNums, Georgia, serif",boxSizing:"border-box",outline:"none"},
    row:{display:"flex",alignItems:"center",gap:10},
    tRow:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16},
    tRow3:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16},
    tBtn:(a,col)=>({padding:10,borderRadius:11,border:`1px solid ${a?col:"rgba(255,255,255,0.09)"}`,background:a?`${col}22`:"transparent",color:a?col:"#555",fontSize:12,cursor:"pointer",fontFamily:"AppNums, Georgia, serif",textAlign:"center"}),
    cGrid:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:16},
    cBtn:(a,col)=>({padding:"9px 3px",borderRadius:11,border:`1px solid ${a?col:"rgba(255,255,255,0.07)"}`,background:a?`${col}1A`:"rgba(255,255,255,0.02)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}),
    sub:(col=C.gold)=>({width:"100%",padding:15,borderRadius:13,background:col,border:"none",color:C.bg,fontSize:15,fontFamily:"AppNums, Georgia, serif",cursor:"pointer"}),
    txRow:{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"},
    eBox:bg=>({width:40,height:40,borderRadius:11,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}),
    chk:done=>({width:28,height:28,borderRadius:8,border:`2px solid ${done?C.green:"#333"}`,background:done?"rgba(90,232,154,0.12)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:15,color:C.green}),
    tog:on=>({width:46,height:24,borderRadius:12,background:on?C.gold:"#222",border:"none",cursor:"pointer",position:"relative",flexShrink:0}),
    togDot:on=>({position:"absolute",top:3,left:on?25:3,width:18,height:18,borderRadius:"50%",background:on?C.bg:"#555",transition:"left 0.2s"}),
    nav:(mob)=>mob?{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:C.bg,borderTop:"1px solid rgba(200,169,126,0.1)",display:"flex",justifyContent:"space-around",padding:"10px 0 14px",zIndex:50}:{display:"none"},
    sidebar:{width:220,background:"#111118",borderRight:"1px solid rgba(200,169,126,0.15)",display:"flex",flexDirection:"column",padding:"24px 0",flexShrink:0,minHeight:"100vh",position:"sticky",top:0,height:"100vh",overflowY:"auto"},
    nBtn:a=>({background:"none",border:"none",color:a?C.gold:"#333",fontSize:10,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"0 8px"}),
    sBtn:a=>({padding:"10px 20px",background:a?"rgba(200,169,126,0.1)":"transparent",borderLeft:a?"2px solid #C8A97E":"2px solid transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:10,border:"none",width:"100%",textAlign:"left",color:a?C.gold:"#666",fontSize:13,fontFamily:"AppNums, Georgia, serif"}),
    modal:(mob)=>mob?{position:"fixed",inset:0,background:C.bg,zIndex:200,overflowY:"auto",maxWidth:430,margin:"0 auto"}:{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",paddingTop:40},
    fab:{position:"fixed",bottom:22,right:28,width:52,height:52,borderRadius:"50%",background:C.gold,border:"none",fontSize:26,color:C.bg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(200,169,126,0.35)",zIndex:99},
    xBtn:{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:16,padding:"0 2px",flexShrink:0},
    penBtn:{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0},
    back:{background:"none",border:"none",color:C.gold,fontSize:22,cursor:"pointer"},
  };
  const NAV=[["home","🏠","Inicio"],["bills","📋","Pagos"],["accounts","💳","Cuentas"],["insights","📊","Análisis"]];
  // ═══════════════ 🆕 RECORRIDO GUIADO + FELICITACIONES (bloque pegado aparte) ═══════════════
  const [toursSeen,setToursSeen]=useState({});      // recorridos ya vistos, por pestaña
  const [tour,setTour]=useState(null);              // recorrido activo {tab, step}
  const [tourRect,setTourRect]=useState(null);      // posición del elemento resaltado
  const [celebs,setCelebs]=useState({});            // felicitaciones ya mostradas
  const [celebration,setCelebration]=useState(null);// {title, text} en pantalla   
  const [firstUseDate,setFirstUseDate]=useState(null);// 🆕 fecha del primer uso (botón repetir recorrido)
  const _tourPrevLen=useRef(null);
  const _tourArmed=useRef(false);

  // carga lo ya visto (guardado por dispositivo)
  useEffect(()=>{ (async()=>{ const ts=await dbLoad("fv6-tours-seen"); if(ts) setToursSeen(ts); const cl=await dbLoad("fv6-celebs"); if(cl) setCelebs(cl); })(); },[]);

  // Contenido de cada recorrido. La cantidad de globitos depende de la pestaña.
  const TOURS={
    home:[
      {sel:"home-balance",title:"Tu balance real 💰",text:"Este es el número más importante: lo que te queda de verdad después de los gastos y de lo que falta pagar."},
      {sel:"home-accounts",title:"Tus cuentas de un vistazo 👀",text:"Acá ves el saldo de cada cuenta. Tocá cualquiera para ver todos sus movimientos."},
      {sel:"home-fab",title:"Cargá tu primer movimiento ✏️",text:"Tocá el + para sumar un ingreso o un gasto. ¡Probemos ahora! Elegís cuenta, categoría y monto, y la app hace los números sola.",action:"openTxn"},
    ],
    bills:[
      {sel:"bills-toggle",title:"Este mes y el próximo 📅",text:"Mirá lo que tenés que pagar este mes, o adelantate al que viene con un solo toque."},
      {sel:"bills-resumen",title:"El resumen de tu tarjeta 💳",text:"Se arma solo con sus cuotas y compras. Cuando lo pagás, lo marcás y la app lo descuenta de tu cuenta."},
      {sel:"bills-fab",title:"Sumá un gasto fijo ➕",text:"Con el + agregás alquiler, servicios, suscripciones… y la app te avisa cuándo vencen."},
    ],
    accounts:[
      {sel:"acc-card",title:"El saldo de cada cuenta 💳",text:"Cada cuenta muestra su propio saldo. Tocala para ver el detalle de sus movimientos."},
      {sel:"acc-savings",title:"Tus metas de ahorro 🎯",text:"Ponete objetivos (un viaje, una cámara…) y sumá de a poco. La app te muestra cuánto te falta."},
      {sel:"acc-config",title:"Personalizá todo acá ⚙️",text:"Desde estos botones configurás tu tarjeta, el dólar, tu presupuesto, las categorías y los préstamos con otras personas."},
      {sel:"acc-fab",title:"Creá una cuenta nueva ➕",text:"Con el + sumás todas las cuentas que uses: otro banco, una billetera virtual, lo que quieras."},
    ],
    insights:[
      {sel:"ins-summary",title:"Tu resumen del mes 📊",text:"De un vistazo: cuánto entró, cuánto salió y cuánto te queda disponible."},
      {sel:"ins-cats",title:"¿En qué se te va la plata? 🍕",text:"El gráfico ordena tus gastos por categoría, de mayor a menor. Ideal para detectar fugas."},
      {sel:"ins-chart",title:"Tu historia de 12 meses 📈",text:"Compará cuánto gastaste mes a mes y fijate si vas mejorando."},
    ],
  };

  const celebrate=(title,text)=>{ setCelebration({title,text}); setTimeout(()=>setCelebration(null),3400); };
  const markCeleb=(k)=>{ const next={...celebs,[k]:true}; setCelebs(next); dbSave("fv6-celebs",next); saveToFirestore({celebs:JSON.stringify(next)}); };
  const markTourSeen=(tabKey)=>{
    const next={...toursSeen,[tabKey]:true};
    setToursSeen(next); dbSave("fv6-tours-seen",next); saveToFirestore({toursSeen:JSON.stringify(next)});
    if(["home","bills","accounts","insights"].every(k=>next[k]) && !celebs.tour){ markCeleb("tour"); celebrate("¡Completaste el recorrido! 🎉","Ya conocés todas las secciones. La app es toda tuya."); }
  };

  // Felicitación por el PRIMER movimiento (no hace falta tocar addTxn)
  useEffect(()=>{
    if(loading) return;
    if(_tourPrevLen.current===null){ _tourPrevLen.current=txns.length; setTimeout(()=>{_tourArmed.current=true;},1600); return; }
    const was=_tourPrevLen.current; _tourPrevLen.current=txns.length;
    if(_tourArmed.current && was===0 && txns.length>0 && !celebs.first){ markCeleb("first"); celebrate("¡Tu primer movimiento! 🎉","Ya empezaste a llevar el control de tu plata. Seguí cargando y la app hace los números por vos."); }
  },[txns,loading]); // eslint-disable-line

  // Arranca el recorrido la primera vez que se abre cada pestaña
  useEffect(()=>{
    if(loading||!onboardingSeen||tour||accountDetail||modal||celebration) return;
    if(!TOURS[tab]||toursSeen[tab]) return;
    const id=setTimeout(()=>setTour({tab,step:0}),550);
    return ()=>clearTimeout(id);
  },[tab,loading,onboardingSeen,toursSeen,tour,accountDetail,modal,celebration]); // eslint-disable-line

  // Mide el elemento resaltado y lo sigue al hacer scroll. Si el elemento no existe, salta ese globito.
  useEffect(()=>{
    if(!tour){ setTourRect(null); return; }
    const steps=TOURS[tour.tab]||[]; const step=steps[tour.step];
    if(!step){ setTourRect(null); return; }
    let cancelled=false;
    const locate=()=>document.querySelector(`[data-tour="${step.sel}"]`);
    if(!locate()){
      const id=setTimeout(()=>{ if(cancelled) return; if(!locate()){ if(tour.step<steps.length-1) setTour(tt=>({...tt,step:tt.step+1})); else { markTourSeen(tour.tab); setTour(null); } } },280);
      return ()=>{ cancelled=true; clearTimeout(id); };
    }
    locate().scrollIntoView({block:"center",behavior:"smooth"});
    const read=()=>{ const el=locate(); if(el){ const r=el.getBoundingClientRect(); setTourRect({top:r.top,left:r.left,width:r.width,height:r.height}); } };
    const id=setTimeout(read,160);
    window.addEventListener("resize",read); window.addEventListener("scroll",read,true);
    return ()=>{ cancelled=true; clearTimeout(id); window.removeEventListener("resize",read); window.removeEventListener("scroll",read,true); };
  },[tour]); // eslint-disable-line

  // Globito + flecha + spotlight (pantalla en tenue menos lo resaltado)
  const renderTour=()=>{
    if(!tour) return null;
    const steps=TOURS[tour.tab]||[]; const step=steps[tour.step]; if(!step) return null;
    const total=steps.length; const isLast=tour.step===total-1; const r=tourRect; const pad=10;
    const vw=window.innerWidth, vh=window.innerHeight;
    const below=r?(r.top+r.height/2<vh*0.46):true;
    const cx=r?(r.left+r.width/2):vw/2;
    const tipW=Math.min(300,vw-24);
    const tLeft=Math.min(Math.max(cx-tipW/2,12),vw-tipW-12);
    const arrowLeft=Math.min(Math.max(cx-tLeft,26),tipW-26);
    const tipStyle=r?(below?{top:r.top+r.height+pad+12,left:tLeft}:{top:r.top-pad-12,left:tLeft,transform:"translateY(-100%)"}):{top:vh*0.36,left:tLeft};
    const goNext=()=>{ if(isLast){ const act=step.action; markTourSeen(tour.tab); setTour(null); if(act==="openTxn"){ setAddType("gasto"); setTxnForm(emptyTxn); setModal("txn"); } } else setTour(tt=>({...tt,step:tt.step+1})); };
    const skip=()=>{ markTourSeen(tour.tab); setTour(null); };
    return(
      <div style={{position:"fixed",inset:0,zIndex:300}}>
        <div onClick={goNext} style={{position:"fixed",inset:0,cursor:"pointer"}}/>
        {r&&<div style={{position:"fixed",top:r.top-pad,left:r.left-pad,width:r.width+pad*2,height:r.height+pad*2,borderRadius:14,boxShadow:`0 0 0 9999px rgba(8,8,12,0.84), 0 0 22px ${C.gold}`,border:`2px solid ${C.gold}`,pointerEvents:"none",transition:"all 0.25s ease",zIndex:301}}/>}
        {!r&&<div style={{position:"fixed",inset:0,background:"rgba(8,8,12,0.84)",pointerEvents:"none",zIndex:301}}/>}
        <div onClick={e=>e.stopPropagation()} style={{position:"fixed",...tipStyle,width:tipW,background:"linear-gradient(135deg,#1F1608,#281C0A)",border:"1px solid rgba(200,169,126,0.4)",borderRadius:16,padding:"16px 18px 14px",boxShadow:"0 16px 50px rgba(0,0,0,0.6)",zIndex:303,fontFamily:"AppNums, Georgia, serif"}}>
          {r&&<div style={{position:"absolute",left:arrowLeft-7,width:14,height:14,background:"#1F1608",transform:"rotate(45deg)",...(below?{top:-8,borderLeft:"1px solid rgba(200,169,126,0.4)",borderTop:"1px solid rgba(200,169,126,0.4)"}:{bottom:-8,borderRight:"1px solid rgba(200,169,126,0.4)",borderBottom:"1px solid rgba(200,169,126,0.4)"})}}/>}
          <div style={{fontSize:10,letterSpacing:3,color:C.gold,textTransform:"uppercase",marginBottom:7}}>{tour.step+1} / {total}</div>
          <div style={{fontSize:17,color:C.text,marginBottom:7,lineHeight:1.3}}>{step.title}</div>
          <div style={{fontSize:13.5,color:"#B8AE9E",lineHeight:1.7,marginBottom:16}}>{step.text}</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={skip} style={{background:"none",border:"none",color:"#6A6356",fontSize:12,cursor:"pointer",fontFamily:"AppNums, Georgia, serif"}}>Saltar</button>
            <div style={{flex:1,display:"flex",gap:5,justifyContent:"center"}}>{steps.map((_,i)=><div key={i} style={{width:i===tour.step?18:7,height:7,borderRadius:4,background:i===tour.step?C.gold:"rgba(200,169,126,0.3)",transition:"width 0.2s"}}/>)}</div>
            <button onClick={goNext} style={{padding:"9px 16px",borderRadius:11,background:C.gold,border:"none",color:C.bg,fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia, serif"}}>{isLast?(step.action==="openTxn"?"Cargar ✏️":"Listo ✓"):"Siguiente →"}</button>
          </div>
        </div>
      </div>
    );
  };

  // Cartel de felicitación con confeti
  const renderCelebration=()=>{
    if(!celebration) return null;
    const cols=[C.gold,C.green,C.pink,C.blue,C.purple];
    return(
      <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",fontFamily:"AppNums, Georgia, serif"}}>
        <style>{`@keyframes celebPop{0%{transform:scale(.7);opacity:0}55%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}@keyframes confFall{0%{transform:translateY(-30px) rotate(0);opacity:1}100%{transform:translateY(62vh) rotate(420deg);opacity:0}}`}</style>
        {Array.from({length:18}).map((_,i)=><div key={i} style={{position:"absolute",top:"16%",left:`${4+i*5.3}%`,width:9,height:14,background:cols[i%cols.length],borderRadius:2,animation:`confFall ${1.4+(i%5)*0.22}s ease-in ${(i%4)*0.12}s forwards`}}/>)}
        <div style={{animation:"celebPop 0.4s ease-out forwards",background:"linear-gradient(135deg,#1A1208,#221808)",border:`1px solid ${C.gold}55`,borderRadius:22,padding:"30px 28px",textAlign:"center",maxWidth:320,margin:"0 24px",boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}>
          <div style={{fontSize:54,marginBottom:10}}>🎉</div>
          <div style={{fontSize:21,color:C.text,marginBottom:10,lineHeight:1.3}}>{celebration.title}</div>
          <div style={{fontSize:14,color:"#9A9286",lineHeight:1.7}}>{celebration.text}</div>
        </div>
      </div>
    );
  };
  // ════════════════════════════ fin del bloque pegado ════════════════════════════

  // 🆕 BOTÓN "VOLVER A VER EL RECORRIDO" — visible solo la primera semana de uso
  const daysSinceFirstUse=firstUseDate?Math.floor((new Date(todayStr()+"T12:00:00")-new Date(firstUseDate+"T12:00:00"))/86400000):0;
  const showReplayTour=firstUseDate!==null&&daysSinceFirstUse<7;
  const replayTour=()=>{ setToursSeen({}); dbSave("fv6-tours-seen",{}); saveToFirestore({toursSeen:JSON.stringify({})}); setAccountDetail(null); setModal(null); setTab("home"); };
  const dayBadge=(dueDay,done,m,y)=>{
    if(done) return <span style={{fontSize:10,color:C.green}}>✓ Pagado</span>;
    const d=daysUntil(dueDay,m,y); let color,bg,label;
    if(d<0)      {color=C.red;bg="rgba(232,90,90,0.15)";label=`⚠️ Venció hace ${Math.abs(d)}d (día ${dueDay})`;}
    else if(d===0){color=C.red;bg="rgba(232,90,90,0.15)";label=`🔴 Vence HOY — día ${dueDay}`;}
    else if(d===1){color="#E8844A";bg="rgba(232,132,74,0.14)";label=`🟠 Mañana — día ${dueDay}`;}
    else if(d<=3) {color="#E8A45A";bg="rgba(232,164,90,0.12)";label=`🟡 ${d} días — día ${dueDay}`;}
    else if(d<=5) {color="#D4C040";bg="rgba(212,192,64,0.1)";label=`⏰ ${d} días — día ${dueDay}`;}
    else          {color="#555";bg="rgba(80,80,80,0.1)";label=`Día ${dueDay}`;}
    return <span style={{background:bg,border:`1px solid ${color}55`,borderRadius:6,padding:"2px 8px",color,fontSize:10}}>{label}</span>;
  };

  const AccPills=({selected,onSelect,showNone=false,exclude=[],includePeople=false})=>(
    <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
      {accounts.filter(a=>!exclude.includes(a.id)).map(a=><button key={a.id} onClick={()=>onSelect(a.id)} style={{padding:"7px 11px",borderRadius:10,border:`1px solid ${selected===a.id?a.color:"rgba(255,255,255,0.08)"}`,background:selected===a.id?`${a.color}22`:"rgba(255,255,255,0.02)",color:selected===a.id?a.color:"#666",fontSize:12,cursor:"pointer",fontFamily:"AppNums, Georgia"}}>{a.emoji} {a.name}</button>)}
      {includePeople&&people.filter(p=>!exclude.includes(p.id)).map(p=><button key={p.id} onClick={()=>onSelect(p.id)} style={{padding:"7px 11px",borderRadius:10,border:`1px solid ${selected===p.id?p.color:"rgba(232,122,206,0.2)"}`,background:selected===p.id?`${p.color}22`:"rgba(232,122,206,0.05)",color:selected===p.id?p.color:"#9A6080",fontSize:12,cursor:"pointer",fontFamily:"AppNums, Georgia"}}>{p.emoji} {p.name}</button>)}
      {showNone&&<button onClick={()=>onSelect("none")} style={{padding:"7px 11px",borderRadius:10,border:`1px solid ${selected==="none"?"#888":"rgba(255,255,255,0.08)"}`,background:selected==="none"?"rgba(128,128,128,0.12)":"rgba(255,255,255,0.02)",color:selected==="none"?"#AAA":"#555",fontSize:12,cursor:"pointer",fontFamily:"AppNums, Georgia"}}>Sin registrar</button>}
    </div>
  );

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
      <button disabled={saving} style={{...S.sub(),marginTop:8,opacity:saving?0.55:1,cursor:saving?"default":"pointer"}} onClick={()=>guardado(onSave)}>{saving?"Guardando…":(flash?"✅ Guardado":saveLabel)}</button>
    </>
  );

  const AccFormBody=({onSave,saveLabel})=>(
    <>
      <label style={S.lbl}>Nombre</label>
      <input style={{...S.inp,marginBottom:14}} type="text" placeholder="ej: Banco…" value={accForm.name} onChange={e=>setAccForm(f=>({...f,name:e.target.value}))}/>
      <label style={S.lbl}>Ícono</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{EMOJIS_ACC.map(e=><button key={e} onClick={()=>setAccForm(f=>({...f,emoji:e}))} style={{width:40,height:40,borderRadius:10,border:`1px solid ${accForm.emoji===e?C.gold:"rgba(255,255,255,0.08)"}`,background:accForm.emoji===e?"rgba(200,169,126,0.15)":"rgba(255,255,255,0.03)",fontSize:22,cursor:"pointer"}}>{e}</button>)}</div>
      <label style={S.lbl}>Color</label>
      <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap"}}>{ACC_COLORS.map(c=><button key={c} onClick={()=>setAccForm(f=>({...f,color:c}))} style={{width:32,height:32,borderRadius:"50%",background:c,border:accForm.color===c?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>)}</div>
      <button disabled={saving} style={{...S.sub(),opacity:saving?0.55:1,cursor:saving?"default":"pointer"}} onClick={()=>guardado(onSave)}>{saving?"Guardando…":(flash?"✅ Guardado":saveLabel)}</button>
    </>
  );

  const handleLogin=async()=>{ try{ await signInWithPopup(auth,provider); }catch(e){ console.error(e); } };
  const handleLogout=async()=>{ await signOut(auth); setTxns([]); setBills(INITIAL_BILLS); setPaid([]); setAccounts(DEFAULT_ACCOUNTS); setSavings([]); setCardResumen([]); };

  if(authLoading) return(<div style={{minHeight:"100vh",background:"#0D0D12",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"AppNums, Georgia, serif"}}><span style={{color:"#C8A97E",fontSize:16}}>Cargando…</span></div>);

  if(!user) return(
    <div style={{minHeight:"100vh",background:"#0D0D12",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"AppNums, Georgia, serif",padding:20}}>
      <div style={{textAlign:"center",maxWidth:360}}>
        <div style={{fontSize:48,marginBottom:16}}>💰</div>
        <div style={{fontSize:11,letterSpacing:4,color:"#C8A97E",textTransform:"uppercase",marginBottom:8}}>Bienvenida a</div>
        <div style={{fontSize:32,color:"#EDE9E3",marginBottom:8}}>Mis Finanzas</div>
        <div style={{fontSize:14,color:"#555",marginBottom:40,lineHeight:1.7}}>Tu app personal para gestionar ingresos, gastos y vencimientos.</div>
        <button onClick={handleLogin} style={{display:"flex",alignItems:"center",gap:12,margin:"0 auto",padding:"14px 28px",borderRadius:14,background:"white",border:"none",cursor:"pointer",fontSize:15,fontFamily:"AppNums, Georgia, serif",color:"#333",boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>
          <img src="https://www.google.com/favicon.ico" width="20" height="20" alt="Google"/>
          Entrar con Google
        </button>
        <div style={{fontSize:11,color:"#333",marginTop:20}}>Tus datos se guardan de forma segura y privada.</div>
      </div>
    </div>
  );

  const Sidebar=()=>(
    <div style={S.sidebar}>
      <div style={{padding:"0 20px 20px",borderBottom:"1px solid rgba(200,169,126,0.1)"}}>
        <div style={{fontSize:9,letterSpacing:3,color:C.gold,textTransform:"uppercase",marginBottom:4}}>Mis finanzas</div>
        <div style={{fontSize:14,color:C.text}}>{MONTHS_FULL[CM]}</div>
      </div>
      <nav style={{padding:"16px 0",flex:1}}>
        {NAV.map(([t,e,l])=>(<button key={t} style={S.sBtn(tab===t)} onClick={()=>setTab(t)}><span style={{fontSize:16}}>{e}</span><span>{l}</span></button>))}
      </nav>
      <div style={{padding:"16px 20px"}}>
        <button onClick={()=>setModal("txn")} style={{width:"100%",padding:"12px",borderRadius:10,background:"rgba(200,169,126,0.15)",border:"1px solid rgba(200,169,126,0.3)",color:C.gold,fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia, serif",marginBottom:8}}>+ Nuevo movimiento</button>
        <button onClick={()=>setModal("settings")} style={{width:"100%",padding:"10px",borderRadius:10,background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"#888",fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia, serif",marginBottom:8}}>⚙️ Configuración</button>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0"}}>
          <img src={user?.photoURL} width={24} height={24} style={{borderRadius:"50%"}} alt=""/>
          <span style={{fontSize:11,color:"#555",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.displayName}</span>
          <button onClick={handleLogout} style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:11}}>Salir</button>
        </div>
      </div>
    </div>
  );

  if(loading) return <div style={{...S.app(isMobile),display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}><span style={{color:C.gold}}>Cargando…</span></div>;
  // 🆕 Nombre de pila para saludar (toma la primera palabra del nombre de Google)
  const firstName=(user?.displayName||"").trim().split(" ")[0]||"";

  // 🆕 ONBOARDING DE PRIMER USO — se muestra hasta que la persona lo completa
  if(!onboardingSeen){
    const steps=[
      {emoji:"💰",title:`Bienvenida${firstName?`, ${firstName}`:""} 👋`,text:"Esta es tu app personal para llevar el control de tu plata: cuánto entra, cuánto sale y qué te falta pagar. Te muestro lo básico en 30 segundos."},
      {emoji:"➕",title:"Cargá tus movimientos",text:"Con el botón + de abajo sumás ingresos y gastos. A cada uno le elegís una cuenta (sueldo, efectivo, tarjeta…) y una categoría. La app calcula sola tu balance real."},
      {emoji:"📋",title:"No te olvides de pagar",text:"En la sección Pagos cargás tus gastos fijos y el resumen de la tarjeta. La app te avisa lo que vence pronto para que no se te pase ningún vencimiento."},
      {emoji:"🔒",title:"Tus datos son privados",text:"Todo se guarda de forma segura en tu cuenta. Podés entrar desde cualquier celular o computadora y siempre vas a ver tu información."},
    ];
    const step=steps[onboardingStep];
    const last=onboardingStep===steps.length-1;
    return(
      <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"AppNums, Georgia, serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,maxWidth:430,margin:"0 auto"}}>
        <div style={{textAlign:"center",maxWidth:360,width:"100%"}}>
          <div style={{fontSize:64,marginBottom:22}}>{step.emoji}</div>
          <div style={{fontSize:11,letterSpacing:4,color:C.gold,textTransform:"uppercase",marginBottom:14}}>Paso {onboardingStep+1} de {steps.length}</div>
          <div style={{fontSize:25,color:C.text,marginBottom:14,lineHeight:1.3}}>{step.title}</div>
          <div style={{fontSize:15,color:"#888",lineHeight:1.8,marginBottom:30}}>{step.text}</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:30}}>
            {steps.map((_,i)=><div key={i} style={{width:i===onboardingStep?22:8,height:8,borderRadius:4,background:i===onboardingStep?C.gold:"rgba(200,169,126,0.25)",transition:"width 0.2s"}}/>)}
          </div>
          <button onClick={()=>last?finishOnboarding():setOnboardingStep(s=>s+1)} style={{width:"100%",padding:15,borderRadius:13,background:C.gold,border:"none",color:C.bg,fontSize:16,fontFamily:"AppNums, Georgia, serif",cursor:"pointer",marginBottom:12}}>{last?"Empezar 🚀":"Siguiente →"}</button>
          {!last&&<button onClick={finishOnboarding} style={{background:"none",border:"none",color:"#555",fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia, serif"}}>Saltar introducción</button>}
          {onboardingStep>0&&<button onClick={()=>setOnboardingStep(s=>s-1)} style={{display:"block",margin:"18px auto 0",background:"none",border:"none",color:"#444",fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia, serif"}}>← Atrás</button>}
        </div>
      </div>
    );
  }

  // ══ MODALES ══
  const TxnModalBody=({onSave,saveLabel,isEdit=false})=>(
    <div style={{padding:"28px 20px"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>{isEdit?"Editar movimiento":"Nuevo movimiento"}</div></div>
      <div style={isEdit?S.tRow:S.tRow3}>
        <button style={S.tBtn(addType==="gasto","#E87A5A")} onClick={()=>setAddType("gasto")}>💸 Gasto</button>
        <button style={S.tBtn(addType==="ingreso",C.green)} onClick={()=>setAddType("ingreso")}>💰 Ingreso</button>
        {!isEdit&&<button style={S.tBtn(addType==="transfer",C.blue)} onClick={()=>setAddType("transfer")}>🔄 Transacción</button>}
      </div>
      {addType==="transfer"&&<div style={{background:"rgba(90,155,232,0.08)",border:"1px solid rgba(90,155,232,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.blue}}>🔄 Mové plata de una cuenta a otra. Podés usar tus cuentas o las de terceros (prestar, devolver, o que te depositen).</div>}
      {!isEdit&&addType==="gasto"&&<>
        <label style={S.lbl}>Frecuencia</label>
        <div style={S.tRow3}>
          <button style={S.tBtn(txnForm.frequency==="once",C.gold)} onClick={()=>setTxnForm(f=>({...f,frequency:"once",installments:"",date:todayStr()}))}>1× Única vez</button>
          <button style={S.tBtn(txnForm.frequency==="monthly",C.green)} onClick={()=>setTxnForm(f=>({...f,frequency:"monthly",installments:"",date:""}))}>🔁 Mensual</button>
          <button style={S.tBtn(txnForm.frequency==="installments",C.purple)} onClick={()=>setTxnForm(f=>({...f,frequency:"installments",date:todayStr()}))}>💳 Cuotas</button>
        </div>
        {txnForm.frequency==="installments"&&<>
          <div style={S.tRow}>
            <button style={S.tBtn(txnForm.installmentAmountType==="perInstallment",C.purple)} onClick={()=>setTxnForm(f=>({...f,installmentAmountType:"perInstallment"}))}>$ Por cuota</button>
            <button style={S.tBtn(txnForm.installmentAmountType==="total",C.blue)} onClick={()=>setTxnForm(f=>({...f,installmentAmountType:"total"}))}>$ Total</button>
          </div>
          <label style={S.lbl}>Cantidad de cuotas</label>
          <input style={{...S.inp,marginBottom:14}} type="number" min="2" placeholder="ej: 12" value={txnForm.installments} onChange={e=>setTxnForm(f=>({...f,installments:e.target.value}))}/>
          {txnForm.amount&&txnForm.installments&&<div style={{fontSize:12,color:C.purple,textAlign:"center",marginBottom:12}}>{txnForm.installmentAmountType==="total"?`${fmt(Math.round(parseFloat(txnForm.amount)/parseInt(txnForm.installments)))} por cuota`:`${fmt(parseFloat(txnForm.amount)*parseInt(txnForm.installments))} total`}</div>}
          {txnForm.accountId==="tarjeta"&&<div style={{background:"rgba(232,122,206,0.08)",border:"1px solid rgba(232,122,206,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:C.pink}}>💳 Según el cierre (día {cardSettings.closingDay}): si comprás <strong>antes o el día del cierre</strong>, la 1ª cuota cae en el resumen de este mes; si comprás <strong>después</strong>, cae en el del mes siguiente.</div>}
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
      {addType!=="transfer"?<>
      <label style={S.lbl}>Cuenta</label>
      <AccPills selected={txnForm.accountId} onSelect={id=>setTxnForm(f=>({...f,accountId:id}))} includePeople={addType==="gasto"&&txnForm.frequency==="once"}/>
      {addType==="gasto"&&txnForm.frequency==="once"&&isPersonId(txnForm.accountId)&&<div style={{fontSize:12,color:C.pink,marginTop:-6,marginBottom:12,lineHeight:1.6}}>💡 Lo pagó {entityOf(txnForm.accountId)?.name}. Queda registrado como gasto y como deuda con esa persona; no te baja el balance real hasta que se lo devuelvas.</div>}
      {addType==="gasto"&&<><label style={S.lbl}>Categoría</label><div style={S.cGrid}>{catsGasto.map(c=><button key={c.name} style={S.cBtn(txnForm.category===c.name,c.color)} onClick={()=>setTxnForm(f=>({...f,category:c.name}))}><span style={{fontSize:20}}>{c.emoji}</span><span style={{fontSize:9,color:txnForm.category===c.name?c.color:"#555"}}>{c.name}</span></button>)}</div></>}
      {addType==="ingreso"&&<><label style={S.lbl}>Categoría</label><div style={S.cGrid}>{catsIngreso.map(c=><button key={c.name} style={S.cBtn(txnForm.category===c.name,c.color)} onClick={()=>setTxnForm(f=>({...f,category:c.name}))}><span style={{fontSize:20}}>{c.emoji}</span><span style={{fontSize:9,color:txnForm.category===c.name?c.color:"#555"}}>{c.name}</span></button>)}</div></>}
      </>:<>
      <label style={S.lbl}>Desde (de dónde sale)</label>
      <AccPills selected={txnForm.fromId} onSelect={id=>setTxnForm(f=>({...f,fromId:id}))} includePeople={true} exclude={txnForm.toId?[txnForm.toId]:[]}/>
      <label style={S.lbl}>Hacia (a dónde entra)</label>
      <AccPills selected={txnForm.toId} onSelect={id=>setTxnForm(f=>({...f,toId:id}))} includePeople={true} exclude={txnForm.fromId?[txnForm.fromId]:[]}/>
      {txnForm.fromId&&txnForm.toId&&<div style={{fontSize:12,color:"#888",marginTop:-4,marginBottom:12,lineHeight:1.6}}>{entityOf(txnForm.fromId)?.name} → {entityOf(txnForm.toId)?.name}{isPersonId(txnForm.fromId)&&!isPersonId(txnForm.toId)&&` · ${entityOf(txnForm.fromId)?.name} pone plata en ${entityOf(txnForm.toId)?.name} (le vas a deber)`}{!isPersonId(txnForm.fromId)&&isPersonId(txnForm.toId)&&` · le pasás plata a ${entityOf(txnForm.toId)?.name} (le devolvés o le prestás)`}</div>}
      </>}
      <label style={S.lbl}>{txnForm.frequency==="monthly"?"Descripción (nombre)":"Descripción"}</label>
      <input style={{...S.inp,marginBottom:12}} type="text" placeholder={txnForm.frequency==="monthly"?"ej: Spotify":"ej: almuerzo"} value={txnForm.description} onChange={e=>setTxnForm(f=>({...f,description:e.target.value}))}/>
      <label style={S.lbl}>{txnForm.frequency==="monthly"?"Día del mes":"Fecha"}</label>
      {txnForm.frequency==="monthly"
        ? <input style={{...S.inp,marginBottom:20}} type="number" min="1" max="31" placeholder="ej: 15" value={txnForm.date} onChange={e=>setTxnForm(f=>({...f,date:e.target.value}))}/>
        : <input style={{...S.inp,marginBottom:20}} type="date" value={txnForm.date||todayStr()} onChange={e=>setTxnForm(f=>({...f,date:e.target.value}))}/>
      }
      <button disabled={saving} style={{...S.sub(),opacity:saving?0.55:1,cursor:saving?"default":"pointer"}} onClick={async()=>{ if(savingRef.current) return; savingRef.current=true; setSaving(true); try{ await ((!isEdit&&addType==="transfer")?addTransfer():onSave()); } finally{ savingRef.current=false; setSaving(false); } }}>{saving?"Guardando…":(flash?"✅ Guardado":saveLabel)}</button>
    </div>
  );

  if(modal==="txn")     return <div style={S.modal(isMobile)}><div style={isMobile?{}:{background:C.bg,borderRadius:16,maxWidth:500,width:"100%",padding:"0 0 20px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>{TxnModalBody({onSave:addTxn,saveLabel:"Guardar"})}</div></div>;
  if(modal==="editTxn") return <div style={S.modal(isMobile)}><div style={isMobile?{}:{background:C.bg,borderRadius:16,maxWidth:500,width:"100%",padding:"0 0 20px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>{TxnModalBody({onSave:saveTxnEdit,saveLabel:"Guardar cambios",isEdit:true})}</div></div>;
  if(modal==="bill")    return <div style={S.modal(isMobile)}><div style={isMobile?{}:{background:C.bg,borderRadius:16,maxWidth:500,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}><div style={{padding:"28px 20px"}}><div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Nuevo compromiso mensual</div></div>{BillFormBody({onSave:addBill,saveLabel:"Guardar compromiso"})}</div></div></div>;
  if(modal==="editBill")return <div style={S.modal(isMobile)}><div style={isMobile?{}:{background:C.bg,borderRadius:16,maxWidth:500,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}><div style={{padding:"28px 20px"}}><div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Editar compromiso</div></div>{BillFormBody({onSave:saveBillEdit,saveLabel:"Guardar cambios"})}</div></div></div>;
  if(modal==="account") return <div style={S.modal(isMobile)}><div style={isMobile?{}:{background:C.bg,borderRadius:16,maxWidth:500,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}><div style={{padding:"28px 20px"}}><div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Nueva cuenta</div></div>{AccFormBody({onSave:addAccount,saveLabel:"Crear cuenta"})}</div></div></div>;
  if(modal==="editAcc") return <div style={S.modal(isMobile)}><div style={isMobile?{}:{background:C.bg,borderRadius:16,maxWidth:500,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}><div style={{padding:"28px 20px"}}><div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Editar cuenta</div></div>{AccFormBody({onSave:saveAccEdit,saveLabel:"Guardar cambios"})}</div></div></div>;

  if(modal==="saving") return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Nueva meta de ahorro</div></div>
      <label style={S.lbl}>¿Para qué?</label><input style={{...S.inp,marginBottom:14}} type="text" placeholder="ej: Cámara…" value={savForm.name} onChange={e=>setSavForm(f=>({...f,name:e.target.value}))}/>
      <label style={S.lbl}>Objetivo ($)</label><input style={{...S.inp,marginBottom:14}} type="number" value={savForm.goal} onChange={e=>setSavForm(f=>({...f,goal:e.target.value}))}/>
      <label style={S.lbl}>Ya ahorrado ($)</label><input style={{...S.inp,marginBottom:24}} type="number" placeholder="$ 0" value={savForm.saved} onChange={e=>setSavForm(f=>({...f,saved:e.target.value}))}/>
      <button disabled={saving} style={{...S.sub(),opacity:saving?0.55:1,cursor:saving?"default":"pointer"}} onClick={()=>guardado(addSaving)}>{saving?"Guardando…":(flash?"✅ Guardado":"Crear meta")}</button>
    </div></div>
  );

  if(modal==="settings") return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div><div style={S.ey}>Configuración</div><div style={{fontSize:18}}>Ajustes de la app</div></div></div>
      {[
        [()=>{setTempCard({closingDay:String(cardSettings.closingDay),dueDay:String(cardSettings.dueDay)});setModal("cardSettings");},"rgba(232,122,206,0.07)","rgba(232,122,206,0.25)",C.pink,`💳 Tarjeta: cierre día ${cardSettings.closingDay}, vence día ${cardSettings.dueDay}`],
        [()=>setModal("cats"),"rgba(160,124,254,0.07)","rgba(160,124,254,0.25)",C.purple,"🏷️ Configurar categorías"],
        [()=>{setTempRate(String(usdRate));setModal("usd");},"rgba(90,155,232,0.07)","rgba(90,155,232,0.2)",C.blue,`🇺🇸 TC dólar: $${usdRate.toLocaleString("es-AR")}/US$`],
        [()=>{setTempBudget(String(budget));setModal("budget");},"rgba(90,232,154,0.07)","rgba(90,232,154,0.2)",C.green,`🎯 Presupuesto: ${budget>0?fmt(budget):"No configurado"}`],
        [()=>{setTerceroDetail(null);setModal("terceros");},"rgba(232,122,206,0.05)","rgba(232,122,206,0.2)",C.pink,`👥 Cuentas de terceros${people.length>0?` (${people.length})`:""}`],
      ].map(([fn,bg,border,col,label],i)=>(<button key={i} onClick={fn} style={{width:"100%",padding:13,borderRadius:12,background:bg,border:`1px solid ${border}`,color:col,fontSize:14,cursor:"pointer",fontFamily:"AppNums, Georgia",marginBottom:10,textAlign:"left"}}>{label}</button>))}
      {showReplayTour&&<button onClick={replayTour} style={{width:"100%",padding:13,borderRadius:12,background:"rgba(200,169,126,0.07)",border:"1px solid rgba(200,169,126,0.25)",color:C.gold,fontSize:14,cursor:"pointer",fontFamily:"AppNums, Georgia",marginBottom:10,textAlign:"left"}}>🧭 Volver a ver el recorrido · {7-daysSinceFirstUse}d restantes</button>}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 4px 4px",marginTop:6,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        {user?.photoURL&&<img src={user.photoURL} width={28} height={28} style={{borderRadius:"50%"}} alt=""/>}
        <span style={{fontSize:12,color:"#888",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.displayName}</span>
        <button onClick={handleLogout} style={{background:"none",border:"1px solid rgba(255,255,255,0.12)",borderRadius:9,padding:"7px 14px",color:"#888",fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia"}}>Salir</button>
      </div>
    </div></div>
  );
  
  if(modal==="cats") return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div><div style={S.ey}>Configurar categorías</div><div style={{fontSize:18}}>Mis categorías</div></div></div>
      <div style={{fontSize:11,letterSpacing:3,color:C.red,textTransform:"uppercase",marginBottom:10}}>💸 Categorías de gasto</div>
      {catsGasto.map((c,i)=>(<div key={i} style={{...S.row,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><span style={{fontSize:20,width:32}}>{c.emoji}</span><span style={{flex:1,fontSize:14,color:c.color}}>{c.name}</span><button onClick={()=>startEditCat("gasto",i)} style={S.penBtn}>✏️</button><button onClick={()=>delCat("gasto",i)} style={S.xBtn}>×</button></div>))}
      <button onClick={()=>{setCatForm(emptyCat);setModal("addCat_gasto");}} style={{width:"100%",padding:11,borderRadius:11,background:"rgba(232,90,90,0.08)",border:"1px solid rgba(232,90,90,0.2)",color:C.red,fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia",marginTop:10}}>+ Agregar categoría de gasto</button>
      <div style={{fontSize:11,letterSpacing:3,color:C.green,textTransform:"uppercase",margin:"20px 0 10px"}}>💰 Categorías de ingreso</div>
      {catsIngreso.map((c,i)=>(<div key={i} style={{...S.row,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><span style={{fontSize:20,width:32}}>{c.emoji}</span><span style={{flex:1,fontSize:14,color:c.color}}>{c.name}</span><button onClick={()=>startEditCat("ingreso",i)} style={S.penBtn}>✏️</button><button onClick={()=>delCat("ingreso",i)} style={S.xBtn}>×</button></div>))}
      <button onClick={()=>{setCatForm(emptyCat);setModal("addCat_ingreso");}} style={{width:"100%",padding:11,borderRadius:11,background:"rgba(90,232,154,0.08)",border:"1px solid rgba(90,232,154,0.2)",color:C.green,fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia",marginTop:10,marginBottom:40}}>+ Agregar categoría de ingreso</button>
    </div></div>
  );

  if(modal==="addCat_gasto"||modal==="addCat_ingreso"||modal==="editCat") return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={()=>setModal("cats")} style={S.back}>←</button><div style={S.ey}>{modal==="editCat"?"Editar categoría":"Nueva categoría"}</div></div>
      <label style={S.lbl}>Nombre</label>
      <input style={{...S.inp,marginBottom:14}} type="text" placeholder="ej: Mascota, Auto…" value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))}/>
      <label style={S.lbl}>Emoji</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>{EMOJIS_CAT.map(e=><button key={e} onClick={()=>setCatForm(f=>({...f,emoji:e}))} style={{width:40,height:40,borderRadius:9,border:`1px solid ${catForm.emoji===e?C.gold:"rgba(255,255,255,0.08)"}`,background:catForm.emoji===e?"rgba(200,169,126,0.15)":"rgba(255,255,255,0.03)",fontSize:22,cursor:"pointer"}}>{e}</button>)}</div>
      <label style={S.lbl}>Color</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>{CAT_COLORS.map(c=><button key={c} onClick={()=>setCatForm(f=>({...f,color:c}))} style={{width:30,height:30,borderRadius:"50%",background:c,border:catForm.color===c?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>)}</div>
      <button disabled={saving} style={{...S.sub(),opacity:saving?0.55:1,cursor:saving?"default":"pointer"}} onClick={()=>guardado(()=>modal==="editCat"?saveCatEdit():addCat(modal==="addCat_gasto"?"gasto":"ingreso"))}>{saving?"Guardando…":(flash?"✅ Guardado":"Guardar")}</button>
    </div></div>
  );

  if(modal==="usd") return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Tipo de cambio</div></div>
      <label style={S.lbl}>1 US$ = $ pesos</label>
      <input style={{...S.inp,fontSize:26,textAlign:"center",marginBottom:8}} type="number" placeholder={String(usdRate)} value={tempRate} onChange={e=>setTempRate(e.target.value)}/>
      <div style={{fontSize:12,color:"#555",textAlign:"center",marginBottom:24}}>Actual: ${usdRate.toLocaleString("es-AR")}</div>
      <button disabled={saving} style={{...S.sub(C.blue),opacity:saving?0.55:1,cursor:saving?"default":"pointer"}} onClick={()=>guardado(saveRate)}>{saving?"Guardando…":(flash?"✅ Guardado":"Guardar")}</button>
    </div></div>
  );

  if(modal==="budget") return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Presupuesto mensual</div></div>
      <label style={S.lbl}>¿Cuánto querés gastar por mes?</label>
      <input style={{...S.inp,fontSize:26,textAlign:"center",marginBottom:8}} type="number" placeholder={budget>0?String(budget):"$ 0"} value={tempBudget} onChange={e=>setTempBudget(e.target.value)}/>
      <div style={{fontSize:12,color:"#555",textAlign:"center",marginBottom:24}}>{budget>0?`Configurado: ${fmt(budget)}`:"Sin presupuesto"}</div>
      <button disabled={saving} style={{...S.sub(C.green),opacity:saving?0.55:1,cursor:saving?"default":"pointer"}} onClick={()=>guardado(saveBudget)}>{saving?"Guardando…":(flash?"✅ Guardado":"Guardar")}</button>
    </div></div>
  );

  if(modal==="cardSettings") return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div><div style={S.ey}>Tarjeta de crédito</div><div style={{fontSize:18}}>Fechas</div></div></div>
      <div style={{background:"rgba(232,122,206,0.08)",border:"1px solid rgba(232,122,206,0.2)",borderRadius:14,padding:16,marginBottom:20,fontSize:13,color:C.pink,lineHeight:1.8}}>Cargos de <strong>Abril</strong> → Resumen Abril → vence día {cardSettings.dueDay} de <strong>Mayo</strong></div>
      <label style={S.lbl}>Día de cierre</label>
      <input style={{...S.inp,marginBottom:16}} type="number" min="1" max="31" placeholder={String(cardSettings.closingDay)} value={tempCard.closingDay} onChange={e=>setTempCard(f=>({...f,closingDay:e.target.value}))}/>
      <label style={S.lbl}>Día de vencimiento (mes siguiente)</label>
      <input style={{...S.inp,marginBottom:24}} type="number" min="1" max="31" placeholder={String(cardSettings.dueDay)} value={tempCard.dueDay} onChange={e=>setTempCard(f=>({...f,dueDay:e.target.value}))}/>
      <button disabled={saving} style={{...S.sub(C.pink),opacity:saving?0.55:1,cursor:saving?"default":"pointer"}} onClick={()=>guardado(saveCardSettings_)}>{saving?"Guardando…":(flash?"✅ Guardado":"Guardar")}</button>
      <div style={{height:14}}/>
      <div style={{fontSize:12,color:"#888",lineHeight:1.7,marginBottom:10}}>Si cambiás el cierre de forma permanente, podés reacomodar las cuotas que todavía no pagaste al ciclo que les corresponde. Las cuotas ya pagadas o de resúmenes cerrados <strong style={{color:"#aaa"}}>no se tocan</strong>.</div>
      <button style={{width:"100%",padding:14,borderRadius:13,background:"rgba(124,158,254,0.1)",border:"1px solid rgba(124,158,254,0.3)",color:"#7C9EFE",fontSize:14,cursor:"pointer",fontFamily:"AppNums, Georgia, serif"}} onClick={recalcInstallments}>{flash?"✅ Cuotas recalculadas":"🔄 Recalcular cuotas con el cierre actual"}</button>
    </div></div>
  );

  if(modal==="payResumenModal"&&resumenPayTarget) return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div><div style={S.ey}>Pagar resumen</div><div style={{fontSize:18}}>Tarjeta {MONTHS_FULL[resumenPayTarget.m]}</div></div></div>
      <div style={{background:"rgba(232,122,206,0.08)",border:"1px solid rgba(232,122,206,0.25)",borderRadius:16,padding:20,marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:11,color:C.pink,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Total a pagar</div>
        <div style={{fontSize:34,fontFamily:"AppNums, Georgia",color:C.pink,marginBottom:4}}>{fmt(resumenPayTarget.amount)}</div>
      </div>
      <div style={{...S.card(),marginBottom:14,maxHeight:150,overflowY:"auto"}}>
        {carryInto(resumenPayTarget.m,resumenPayTarget.y)>0&&<div style={{...S.row,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><span style={{fontSize:16}}>↪️</span><span style={{flex:1,fontSize:13,color:"#E8A45A"}}>Saldo anterior</span><span style={{fontSize:13,fontFamily:"AppNums, Georgia",color:"#E8A45A"}}>{fmt(carryInto(resumenPayTarget.m,resumenPayTarget.y))}</span></div>}
        {cardRowsForResumen(resumenPayTarget.m,resumenPayTarget.y).map(({bill:b,n},i)=><div key={`${b.id}-${n}-${i}`} style={{...S.row,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><span style={{fontSize:16}}>{b.emoji}</span><span style={{flex:1,fontSize:13}}>{b.name}{n!==null&&<span style={{fontSize:10,color:"#888",marginLeft:6}}>C{n}/{b.installments}</span>}</span><span style={{fontSize:13,fontFamily:"AppNums, Georgia",color:C.pink}}>{fmt(b.amount)}</span></div>)}
        {cardTxnsForResumen(resumenPayTarget.m,resumenPayTarget.y).map(t=><div key={t.id} style={{...S.row,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><span style={{fontSize:16}}>🛒</span><span style={{flex:1,fontSize:13}}>{t.description||t.category}</span><span style={{fontSize:13,fontFamily:"AppNums, Georgia",color:C.pink}}>{fmt(toARS(t))}</span></div>)}
      </div>
      <div style={{background:"rgba(200,169,126,0.06)",border:"1px solid rgba(200,169,126,0.18)",borderRadius:12,padding:"11px 14px",marginBottom:12,fontSize:12,color:"#B8AE9E",lineHeight:1.7}}>💡 Pagá el monto real que hiciste en tu banco:<br/>• <strong style={{color:C.text}}>Igual al total</strong>: resumen saldado.<br/>• <strong style={{color:"#E8A45A"}}>Menos</strong>: podés arrastrar la diferencia al próximo resumen, o marcar que quedó saldado si el banco te hizo una devolución (ej: intereses de pagos en dólares).<br/>• <strong style={{color:C.blue}}>Más</strong>: el excedente se anota como intereses/cargos en Finanzas.</div>
      <label style={S.lbl}>¿Cuánto pagaste?</label>
      <input style={{...S.inp,fontSize:22,textAlign:"center",marginBottom:8}} type="number" placeholder={String(Math.round(resumenPayTarget.amount))} value={resumenPayAmt} onChange={e=>setResumenPayAmt(e.target.value)}/>
      {(parseFloat(resumenPayAmt||resumenPayTarget.amount)||0)<resumenPayTarget.amount&&(
        <div style={{background:"rgba(232,164,90,0.08)",border:"1px solid rgba(232,164,90,0.25)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
          <div style={{fontSize:14,color:"#E8A45A",marginBottom:12,lineHeight:1.6}}>¿La diferencia la anotamos como pendiente para el próximo mes?</div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <button style={{...S.tBtn(resumenPayKeep,"#E8A45A"),flex:1}} onClick={()=>setResumenPayKeep(true)}>{resumenPayKeep?"☑":"☐"} Sí</button>
            <button style={{...S.tBtn(!resumenPayKeep,C.green),flex:1}} onClick={()=>setResumenPayKeep(false)}>{!resumenPayKeep?"☑":"☐"} No</button>
          </div>
          <div style={{fontSize:11,color:"#888",lineHeight:1.6}}>{resumenPayKeep?`Se anotan ${fmt(Math.round(resumenPayTarget.amount-(parseFloat(resumenPayAmt||resumenPayTarget.amount)||0)))} como pendiente para el próximo resumen.`:"La diferencia fue un ajuste o devolución del banco. No se anota nada."}</div>
        </div>
      )}
      {(parseFloat(resumenPayAmt||resumenPayTarget.amount)||0)>resumenPayTarget.amount&&(
        <div style={{background:"rgba(90,155,232,0.08)",border:"1px solid rgba(90,155,232,0.25)",borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:12,color:C.blue,lineHeight:1.6}}>Pagaste de más: la diferencia de {fmt(Math.round((parseFloat(resumenPayAmt||resumenPayTarget.amount)||0)-resumenPayTarget.amount))} se registra como intereses/cargos en Finanzas.</div>
      )}
      <label style={S.lbl}>¿Con qué cuenta pagás?</label>
      <AccPills selected={resumenPayAcc} onSelect={setResumenPayAcc} showNone={true} exclude={["tarjeta"]}/>
      <button disabled={!resumenPayAcc||saving} style={{...S.sub(resumenPayAcc?C.pink:"#333"),color:resumenPayAcc?C.bg:"#555",opacity:saving?0.55:1,cursor:saving?"default":"pointer"}} onClick={()=>guardado(()=>payCardResumen(resumenPayAcc,resumenPayTarget.key,resumenPayTarget.amount,resumenPayTarget.m,resumenPayAmt,resumenPayKeep))}>{saving?"Guardando…":(flash?"✅ Pagado":"Confirmar pago")}</button>
    </div></div>
  );

  // 🆕 MODAL DE REINICIO (zona de peligro, oculto)
  if(modal==="reset") return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Zona de peligro</div></div>
      <div style={{fontSize:48,textAlign:"center",marginBottom:16}}>⚠️</div>
      <div style={{fontSize:22,textAlign:"center",color:C.red,marginBottom:12}}>Reiniciar todo</div>
      <div style={{fontSize:13,color:"#888",textAlign:"center",lineHeight:1.8,marginBottom:24}}>Esto borra <strong style={{color:C.text}}>todos</strong> tus movimientos, pagos, cuotas, resúmenes, cuentas y metas de ahorro, y vuelve todo a cero. Se mantiene tu configuración (tipo de cambio y fechas de tarjeta).<br/><br/><strong style={{color:C.red}}>Esta acción no se puede deshacer.</strong></div>
      <button style={{...S.sub(C.red),marginBottom:10}} onClick={resetAll}>{flash?"✅ Todo reiniciado":"Sí, borrar todo y empezar de cero"}</button>
      <button style={{width:"100%",padding:14,borderRadius:13,background:"transparent",border:"1px solid rgba(255,255,255,0.12)",color:"#888",fontSize:14,cursor:"pointer",fontFamily:"AppNums, Georgia, serif"}} onClick={closeModal}>Cancelar</button>
    </div></div>
  );

  // 🆕 MODAL: borrar cuota (preguntar por las siguientes)
  if(modal==="delCuota"&&delTarget) return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:18}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Borrar cuota</div></div>
      <div style={{fontSize:18,textAlign:"center",marginBottom:8}}>💳 {delTarget.name}</div>
      <div style={{fontSize:13,color:"#888",textAlign:"center",lineHeight:1.7,marginBottom:24}}>{delTarget.hasSchedule?<>¿Querés borrar solo esta cuota o esta y todas las que faltan? Las cuotas ya pagadas o de resúmenes cerrados no se tocan.</>:<>Esta compra es de un formato viejo (sin cuotas separadas), así que se borra completa.</>}</div>
      {delTarget.hasSchedule&&<button style={{...S.sub(C.red),marginBottom:10}} onClick={()=>deleteCuota("thisAndNext")}>{flash?"✅ Borrado":"Borrar esta y las siguientes"}</button>}
      {delTarget.hasSchedule&&<button style={{width:"100%",padding:14,borderRadius:13,background:"rgba(232,90,90,0.1)",border:"1px solid rgba(232,90,90,0.3)",color:C.red,fontSize:14,cursor:"pointer",fontFamily:"AppNums, Georgia, serif",marginBottom:10}} onClick={()=>deleteCuota("onlyThis")}>Borrar solo esta cuota</button>}
      {!delTarget.hasSchedule&&<button style={{...S.sub(C.red),marginBottom:10}} onClick={()=>deleteCuota("thisAndNext")}>{flash?"✅ Borrado":"Borrar esta compra"}</button>}
      <button style={{width:"100%",padding:14,borderRadius:13,background:"transparent",border:"1px solid rgba(255,255,255,0.12)",color:"#888",fontSize:14,cursor:"pointer",fontFamily:"AppNums, Georgia, serif"}} onClick={closeModal}>Cancelar</button>
    </div></div>
  );

  // 🆕 MODAL: borrar gasto mensual (preguntar por los siguientes)
  if(modal==="delMonthly"&&delTarget) return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:18}}><button onClick={closeModal} style={S.back}>←</button><div style={S.ey}>Borrar gasto mensual</div></div>
      <div style={{fontSize:18,textAlign:"center",marginBottom:8}}>🔁 {delTarget.name}</div>
      <div style={{fontSize:13,color:"#888",textAlign:"center",lineHeight:1.7,marginBottom:24}}>Es un gasto que se repite todos los meses. ¿Qué querés borrar?</div>
      <button style={{...S.sub(C.red),marginBottom:10}} onClick={()=>deleteMonthly("thisAndFollowing")}>{flash?"✅ Borrado":`Borrar desde ${MONTHS_FULL[delTarget.m]} en adelante`}</button>
      <button style={{width:"100%",padding:14,borderRadius:13,background:"rgba(232,90,90,0.1)",border:"1px solid rgba(232,90,90,0.3)",color:C.red,fontSize:14,cursor:"pointer",fontFamily:"AppNums, Georgia, serif",marginBottom:10}} onClick={()=>deleteMonthly("onlyThis")}>Borrar solo {MONTHS_FULL[delTarget.m]}</button>
      <button style={{width:"100%",padding:14,borderRadius:13,background:"rgba(232,90,90,0.1)",border:"1px solid rgba(232,90,90,0.3)",color:C.red,fontSize:14,cursor:"pointer",fontFamily:"AppNums, Georgia, serif",marginBottom:10}} onClick={()=>deleteMonthly("all")}>Borrar todos (desde siempre)</button>
      <button style={{width:"100%",padding:14,borderRadius:13,background:"transparent",border:"1px solid rgba(255,255,255,0.12)",color:"#888",fontSize:14,cursor:"pointer",fontFamily:"AppNums, Georgia, serif"}} onClick={closeModal}>Cancelar</button>
    </div></div>
  );

  // 🆕 MODAL: alta/edición de persona (cuenta de tercero)
  if(modal==="personForm") return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:520,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      <div style={{...S.row,marginBottom:22}}><button onClick={()=>{setPersonForm(emptyPerson);setEditingPerson(null);setModal("terceros");}} style={S.back}>←</button><div style={S.ey}>{editingPerson?"Editar persona":"Nueva persona"}</div></div>
      <label style={S.lbl}>Nombre</label>
      <input style={{...S.inp,marginBottom:14}} type="text" placeholder="ej: Juan, Mamá…" value={personForm.name} onChange={e=>setPersonForm(f=>({...f,name:e.target.value}))}/>
      <label style={S.lbl}>Ícono</label>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{["🧑","👩","👨","👵","👴","🧔","👧","👦","💁","🧑‍🤝‍🧑","🤝","🏦"].map(e=><button key={e} onClick={()=>setPersonForm(f=>({...f,emoji:e}))} style={{width:40,height:40,borderRadius:10,border:`1px solid ${personForm.emoji===e?C.gold:"rgba(255,255,255,0.08)"}`,background:personForm.emoji===e?"rgba(200,169,126,0.15)":"rgba(255,255,255,0.03)",fontSize:22,cursor:"pointer"}}>{e}</button>)}</div>
      <label style={S.lbl}>Color</label>
      <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap"}}>{ACC_COLORS.map(c=><button key={c} onClick={()=>setPersonForm(f=>({...f,color:c}))} style={{width:32,height:32,borderRadius:"50%",background:c,border:personForm.color===c?"3px solid white":"3px solid transparent",cursor:"pointer"}}/>)}</div>
      {!editingPerson&&<>
        <label style={S.lbl}>Saldo inicial (opcional)</label>
        <div style={{...S.tRow,marginBottom:10}}>
          <button style={S.tBtn(personForm.saldoTipo==="teDebe",C.green)} onClick={()=>setPersonForm(f=>({...f,saldoTipo:"teDebe"}))}>Me debe</button>
          <button style={S.tBtn(personForm.saldoTipo==="leDebes",C.red)} onClick={()=>setPersonForm(f=>({...f,saldoTipo:"leDebes"}))}>Le debo</button>
        </div>
        <input style={{...S.inp,marginBottom:24}} type="number" placeholder="$ 0 (dejá vacío si arranca en cero)" value={personForm.saldo} onChange={e=>setPersonForm(f=>({...f,saldo:e.target.value}))}/>
      </>}
      <button disabled={saving} style={{...S.sub(),opacity:saving?0.55:1,cursor:saving?"default":"pointer"}} onClick={()=>guardado(()=>editingPerson?savePersonEdit():addPerson())}>{saving?"Guardando…":(flash?"✅ Guardado":editingPerson?"Guardar cambios":"Crear persona")}</button>
    </div></div>
  );

  // 🆕 MODAL: cuentas de terceros (lista o detalle de una persona)
  if(modal==="terceros") return(
    <div style={S.modal(isMobile)}><div style={isMobile?{padding:"28px 20px"}:{background:"#0D0D12",borderRadius:16,maxWidth:560,width:"100%",padding:"28px 28px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",margin:"40px auto"}}>
      {!terceroDetail?<>
        <div style={{...S.row,marginBottom:18}}><button onClick={closeModal} style={S.back}>←</button><div><div style={S.ey}>Cuentas de terceros</div><div style={{fontSize:18}}>Préstamos con personas</div></div></div>
        {!tercerosSeen&&<div style={{background:"rgba(90,155,232,0.07)",border:"1px solid rgba(90,155,232,0.25)",borderRadius:14,padding:16,marginBottom:18,fontSize:13,color:"#A9C4E8",lineHeight:1.8}}>
          <div style={{fontSize:13,color:C.blue,marginBottom:6}}>👋 ¿Cómo funciona?</div>
          Es una libretita de quién le debe a quién, aparte de tus cuentas. Creás una persona y cada préstamo queda registrado. <strong style={{color:C.green}}>Verde = te debe</strong>, <strong style={{color:C.red}}>rojo = le debés</strong>.<br/><br/>
          Para mover plata usá <strong>Nuevo movimiento → Transacción</strong>: por ejemplo "Sueldo → Juan" si le devolvés, o "Juan → Sueldo" si te deposita. Y si alguien te financia un gasto, cargás un <strong>Gasto</strong> y elegís a esa persona como cuenta. Eso no te baja el balance real hasta que se lo devolvés.
          <button onClick={markTercerosSeen} style={{display:"block",marginTop:14,padding:"9px 16px",borderRadius:10,background:"rgba(90,155,232,0.15)",border:"1px solid rgba(90,155,232,0.3)",color:C.blue,fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia, serif"}}>Entendido</button>
        </div>}
        {people.length===0?<div style={{textAlign:"center",padding:"24px",color:"#444",fontSize:13}}>Todavía no agregaste a nadie.</div>
          :people.map(pr=>{const bal=accountBalance(pr.id);const teDebe=bal>0;return(
            <div key={pr.id} style={{...S.card(),margin:"0 0 10px",cursor:"pointer"}} onClick={()=>setTerceroDetail(pr.id)}>
              <div style={{...S.row}}>
                <div style={S.eBox(`${pr.color}22`)}>{pr.emoji}</div>
                <div style={{flex:1}}><div style={{fontSize:15}}>{pr.name}</div><div style={{fontSize:11,color:bal===0?"#666":teDebe?C.green:C.red,marginTop:2}}>{bal===0?"Al día":teDebe?"Te debe":"Le debés"}</div></div>
                <div style={{fontSize:18,fontFamily:"AppNums, Georgia",color:bal===0?"#888":teDebe?C.green:C.red}}>{bal<0?"−":""}{fmt(Math.abs(bal))}</div>
                <button onClick={(e)=>{e.stopPropagation();startEditPerson(pr);}} style={S.penBtn}>✏️</button>
                <button onClick={(e)=>{e.stopPropagation();delPerson(pr.id);}} style={S.xBtn}>×</button>
              </div>
            </div>
          );})}
        <button onClick={()=>{setPersonForm(emptyPerson);setEditingPerson(null);setModal("personForm");}} style={{width:"100%",padding:12,borderRadius:12,background:"rgba(90,155,232,0.08)",border:"1px solid rgba(90,155,232,0.25)",color:C.blue,fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia",marginTop:8,marginBottom:40}}>+ Nueva persona</button>
      </>:(()=>{
        const pr=people.find(p=>p.id===terceroDetail); if(!pr){ setTerceroDetail(null); return null; }
        const bal=accountBalance(pr.id); const teDebe=bal>0; const movs=entityMovements(pr.id);
        return(<>
          <div style={{...S.row,marginBottom:14}}><button onClick={()=>setTerceroDetail(null)} style={S.back}>←</button><div style={{flex:1}}><div style={S.ey}>{pr.emoji} {pr.name}</div><div style={{fontSize:22,fontFamily:"AppNums, Georgia",color:bal===0?"#888":teDebe?C.green:C.red}}>{bal<0?"−":""}{fmt(Math.abs(bal))}</div><div style={{fontSize:11,color:bal===0?"#666":teDebe?C.green:C.red}}>{bal===0?"Al día":teDebe?"Te debe":"Le debés"}</div></div></div>
          <button onClick={()=>{setAddType("transfer");setTxnForm({...emptyTxn,toId:pr.id});setModal("txn");}} style={{width:"100%",padding:11,borderRadius:11,background:"rgba(90,232,154,0.08)",border:"1px solid rgba(90,232,154,0.25)",color:C.green,fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia",marginBottom:8}}>↗ Le presté / le devolví (sale de una cuenta mía)</button>
          <button onClick={()=>{setAddType("transfer");setTxnForm({...emptyTxn,fromId:pr.id});setModal("txn");}} style={{width:"100%",padding:11,borderRadius:11,background:"rgba(232,90,90,0.08)",border:"1px solid rgba(232,90,90,0.25)",color:C.red,fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia",marginBottom:16}}>↙ Me prestó / me devolvió (entra a una cuenta mía)</button>
          <div style={S.sec}>Movimientos</div>
          {movs.length===0?<div style={{textAlign:"center",padding:"20px",color:"#444",fontSize:13}}>Sin movimientos todavía.</div>
            :<div style={{marginBottom:40}}>{movs.map(({t,dir,label})=>(<div key={t.id} style={S.txRow}><div style={S.eBox(dir>0?"rgba(90,232,154,0.12)":"rgba(232,90,90,0.12)")}>{dir>0?"↘":"↗"}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14}}>{label}</div><div style={{fontSize:11,color:"#555",marginTop:1}}>{fmtDate(t.date)} · {dir>0?"te debe más / o le devolviste":"le debés más / o te devolvió"}</div></div><div style={{fontSize:15,fontFamily:"AppNums, Georgia",color:dir>0?C.green:C.red}}>{dir>0?"+":"−"}{fmt(toARS(t))}</div><button onClick={()=>delTxn(t.id)} style={S.xBtn}>×</button></div>))}</div>}
        </>);
      })()}
    </div></div>
  );

  if(accountDetail){
    const acc=accounts.find(a=>a.id===accountDetail);
    if(!acc){ setAccountDetail(null); return null; }
    const accTxns=txns.filter(t=>t.accountId===accountDetail).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const bal=accountBalance(accountDetail);
    const isTarjeta=accountDetail==="tarjeta";
    return(
      <div style={S.app(isMobile)}>
        <div style={{...S.hdr,display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setAccountDetail(null)} style={S.back}>←</button>
          <div style={{flex:1}}><div style={S.ey}>{acc.emoji} {acc.name}</div><h1 style={{...S.h1,color:bal<0?C.red:acc.color}}>{bal<0&&"−"}{fmt(Math.abs(bal))}</h1></div>
        </div>
        {isTarjeta&&(<div style={S.pinkC}><div style={{fontSize:11,color:C.pink,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Resumen {MONTHS_FULL[PM]}</div><div style={{fontSize:22,color:C.pink,fontFamily:"AppNums, Georgia"}}>{prevResumenPaid?<span style={{color:C.green}}>✓ Pagado</span>:fmt(prevResumenAmount)}</div>{!prevResumenPaid&&<div style={{fontSize:11,color:"#7A4060",marginTop:4}}>Vence el {cardSettings.dueDay} de {MONTHS_FULL[CM]}</div>}<div style={{fontSize:11,color:"#666",marginTop:8}}>Acumulando {MONTHS_FULL[CM]}: {fmt(currAccumulating)}</div></div>)}
        <div style={S.sec}>Historial de movimientos</div>
        {(()=>{const movs=entityMovements(accountDetail);return movs.length===0?<div style={{textAlign:"center",padding:"30px",color:"#444",fontSize:13}}>Sin movimientos registrados.</div>
          :<div style={{padding:"0 20px",marginBottom:80}}>{movs.map(({t,dir,label})=>{const isT=t.type==="transfer";const cat=isT?{emoji:dir>0?"↘":"↗",color:dir>0?C.green:C.red}:(t.type==="gasto"?catsGasto:catsIngreso).find(c=>c.name===t.category)||{emoji:"•",color:"#888"};return(<div key={t.id} style={S.txRow}><div style={S.eBox(`${cat.color}18`)}>{cat.emoji}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14}}>{label}</div><div style={{fontSize:11,color:"#555",marginTop:1}}>{isT?"Transferencia":t.category} · {fmtDate(t.date)}{t.currency==="USD"&&<span style={{color:C.blue}}> · 🇺🇸</span>}</div></div><div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:15,fontFamily:"AppNums, Georgia",color:dir>0?C.green:C.red}}>{dir>0?"+":"−"}{t.currency==="USD"?fmtUSD(t.amount):fmt(t.amount)}</div>{t.currency==="USD"&&<div style={{fontSize:10,color:"#444"}}>≈{fmt(t.amount*usdRate)}</div>}</div>{!isT&&<button onClick={()=>startEditTxn(t)} style={S.penBtn}>✏️</button>}<button onClick={()=>delTxn(t.id)} style={S.xBtn}>×</button></div>);})}
          </div>;})()}
        <div style={S.nav(isMobile)}>{NAV.map(([t,e,l])=><button key={t} style={S.nBtn(tab===t)} onClick={()=>{setAccountDetail(null);setTab(t);}}><span>{e}</span>{l}</button>)}</div>
      </div>
    );
  }

  // ══ BILLS TAB ══
  if(tab==="bills"){
    const viewCurr=billsView==="current";
    const viewM=viewCurr?CM:NM; const viewY=viewCurr?CY:NY;
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
          {renderTour()}{renderCelebration()}
        <div style={S.hdr}><div style={S.ey}>Compromisos</div><h1 style={S.h1}>{MONTHS_FULL[viewM]} {viewY}</h1></div>
        <div data-tour="bills-toggle" style={{display:"flex",gap:10,padding:"12px 14px 0"}}>
          <button onClick={()=>setBillsView("current")} style={{...S.tBtn(viewCurr,C.gold),flex:1}}>Este mes ({MONTHS_ES[CM]})</button>
          <button onClick={()=>setBillsView("next")} style={{...S.tBtn(!viewCurr,C.blue),flex:1}}>Próximo ({MONTHS_ES[NM]}) →</button>
        </div>
        <div style={S.gCard()}>
          <div style={S.ey}>Total a pagar — {MONTHS_FULL[viewM]}</div>
          <div style={{fontSize:30,color:C.gold,margin:"6px 0 14px",fontFamily:"AppNums, Georgia"}}>{fmt(regularBillsSorted.filter(b=>!isPaid(b.id,viewM,viewY)).reduce((s,b)=>s+b.amount,0)+(rPaid?0:rAmount))}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><div style={{fontSize:9,color:C.red,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Gastos fijos</div><div style={{fontSize:16,color:C.red}}>{fmt(regularBillsSorted.reduce((s,b)=>s+b.amount,0))}</div></div>
            <div><div style={{fontSize:9,color:C.pink,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Tarjeta</div><div style={{fontSize:16,color:C.pink}}>{fmt(rAmount)}</div></div>
          </div>
        </div>
        {viewCurr&&(urgentRegular.length>0||resumenIsUrgent)&&(<div style={S.alertC}><div style={{fontSize:11,letterSpacing:3,color:C.red,textTransform:"uppercase",marginBottom:8}}>⚠️ Vencidos / próximos</div>{resumenIsUrgent&&<div style={{...S.row,marginBottom:6}}><span style={{fontSize:16}}>💳</span><span style={{fontSize:14,flex:1}}>Resumen {rMonthLabel}</span><span style={{fontSize:11,fontWeight:"bold",color:rDaysLeft<0?C.red:"#E8844A"}}>{rDaysLeft<0?`Venció hace ${Math.abs(rDaysLeft)}d`:rDaysLeft===0?"¡HOY!":rDaysLeft===1?"Mañana":`${rDaysLeft}d`}</span><span style={{fontSize:14,color:C.pink,fontFamily:"AppNums, Georgia",marginLeft:6}}>{fmt(rAmount)}</span></div>}{urgentRegular.map(b=>{const d=daysUntil(b.dueDay,CM,CY);return(<div key={b.id} style={{...S.row,marginBottom:6}}><span style={{fontSize:16}}>{b.emoji}</span><span style={{fontSize:14,flex:1}}>{b.name}</span><span style={{fontSize:11,fontWeight:"bold",color:d<0?C.red:"#E8844A"}}>{d<0?`Venció hace ${Math.abs(d)}d`:d===0?"¡HOY!":d===1?"Mañana":`${d}d`}</span><span style={{fontSize:14,color:C.red,fontFamily:"AppNums, Georgia",marginLeft:6}}>{fmt(b.amount)}</span></div>);})}</div>)}
        <div data-tour="bills-resumen" style={S.sec}>💳 Resumen Tarjeta {rMonthLabel}</div>
        <div style={{padding:"0 14px"}}>
          <div style={{background:rPaid?"rgba(90,232,154,0.04)":"rgba(232,122,206,0.06)",border:`1px solid ${rPaid?"rgba(90,232,154,0.2)":"rgba(232,122,206,0.25)"}`,borderRadius:16,overflow:"hidden"}}>
            <div style={{...S.row,padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              {/* ✅ FIX al desmarcar resumen también llama saveToFirestore */}
              <button style={S.chk(rPaid)} onClick={()=>{ if(!rPaid){setResumenPayAcc("");setResumenPayAmt(String(Math.round(rAmount)));setResumenPayKeep(true);setResumenPayTarget({key:rKey,amount:rAmount,m:viewCurr?PM:CM,y:viewCurr?PY:CY});setModal("payResumenModal");}else{const u=cardResumen.filter(k=>k!==rKey);setCardResumen(u);dbSave(KEYS.cardResumen,u);saveToFirestore({cardResumen:JSON.stringify(u)});const np={...resumenPending};if(np[rKey]!==undefined){delete np[rKey];setResumenPending(np);dbSave(KEYS.resumenPending,np);saveToFirestore({resumenPending:JSON.stringify(np)});}} }}>{rPaid?"✓":""}</button>
              <div style={S.eBox("rgba(232,122,206,0.15)")}>💳</div>
              <div style={{flex:1}}><div style={{fontSize:15,color:rPaid?"#888":"#EDE9E3",textDecoration:rPaid?"line-through":"none"}}>Resumen Tarjeta {rMonthLabel}</div><div style={{fontSize:11,color:C.pink,marginTop:3}}>{rPaid?"✓ Pagado":`Vence el ${rDueDay} de ${MONTHS_FULL[viewM]} · ${rDaysLeft<0?`Venció hace ${Math.abs(rDaysLeft)}d`:rDaysLeft===0?"¡HOY!":rDaysLeft===1?"Mañana":`${rDaysLeft}d`}`}</div></div>
              <div style={{fontSize:18,fontFamily:"AppNums, Georgia",color:rPaid?C.green:C.pink,flexShrink:0}}>{fmt(rAmount)}</div>
            </div>
            <div style={{padding:"12px 16px"}}>
              <div style={{fontSize:9,color:C.pink,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Detalle</div>
              {carryInto(viewCurr?PM:CM,viewCurr?PY:CY)>0&&<div style={{...S.row,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}><span style={{fontSize:15}}>↪️</span><span style={{flex:1,fontSize:13,color:"#E8A45A"}}>Saldo del resumen anterior</span><span style={{fontSize:13,fontFamily:"AppNums, Georgia",color:"#E8A45A"}}>{fmt(carryInto(viewCurr?PM:CM,viewCurr?PY:CY))}</span></div>}
              {cardRowsForResumen(viewCurr?PM:CM,viewCurr?PY:CY).map(({bill:b,n,e},i)=>{const mov=e&&!entryLocked(e);return(<div key={`${b.id}-${n}-${i}`} style={{...S.row,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}><span style={{fontSize:15}}>{b.emoji}</span><span style={{flex:1,fontSize:13,color:"#C0B0F0"}}>{b.name}</span>{n!==null&&<span style={{fontSize:10,color:"#666",marginRight:6}}>C{n}/{b.installments}</span>}{mov&&<><button title="Mover al resumen anterior" onClick={()=>moveCuota(b.id,n,-1)} style={{...S.penBtn,marginRight:0,color:"#7C9EFE"}}>◀</button><button title="Mover al resumen siguiente" onClick={()=>moveCuota(b.id,n,1)} style={{...S.penBtn,marginRight:4,color:"#7C9EFE"}}>▶</button></>}<button onClick={()=>startEditBill(b)} style={{...S.penBtn,marginRight:4}}>✏️</button><button onClick={()=>n===null?openDelMonthly(b,viewCurr?PM:CM,viewCurr?PY:CY):openDelCuota(b,n,viewCurr?PM:CM,viewCurr?PY:CY)} style={{...S.xBtn,marginRight:6}}>×</button><span style={{fontSize:13,fontFamily:"AppNums, Georgia",color:"#C0B0F0"}}>{fmt(b.amount)}</span></div>);})}
              {/* 🆕 compras sueltas con tarjeta que entran a este resumen (editables/borrables) */}
              {cardTxnsForResumen(viewCurr?PM:CM,viewCurr?PY:CY).map(t=>{const cat=catsGasto.find(c=>c.name===t.category)||{emoji:"🛒",color:"#C0B0F0"};return(<div key={t.id} style={{...S.row,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}><span style={{fontSize:15}}>{cat.emoji}</span><span style={{flex:1,fontSize:13,color:"#C0B0F0"}}>{t.description||t.category}</span><button onClick={()=>startEditTxn(t)} style={{...S.penBtn,marginRight:4}}>✏️</button><button onClick={()=>delTxn(t.id)} style={{...S.xBtn,marginRight:6}}>×</button><span style={{fontSize:13,fontFamily:"AppNums, Georgia",color:"#C0B0F0"}}>{fmt(toARS(t))}</span></div>);})}
            </div>
          </div>
        </div>
        <div style={S.sec}>📋 Gastos fijos mensuales — por fecha de vencimiento</div>
        <div style={{padding:"0 14px",marginBottom:80}}>
          {/* ✅ FIX: filtramos por el mes que se está viendo, no solo el actual */}
          {regularBills.filter(b=>(b.installments===null||b.installmentCurrent<=b.installments)&&recurringActive(b,viewM,viewY)).sort((a,b2)=>a.dueDay-b2.dueDay).length===0
            ?<div style={{textAlign:"center",padding:"24px",color:"#444",fontSize:13}}>Sin gastos fijos. Tocá + para agregar.</div>
          :regularBills.filter(b=>(b.installments===null||b.installmentCurrent<=b.installments)&&recurringActive(b,viewM,viewY)).sort((a,b2)=>a.dueDay-b2.dueDay).map(b=>{
            const done=isPaid(b.id,viewM,viewY);
            const selecting=payWith.billId===b.id;
            return(
              <div key={b.id} style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 4px",opacity:done?0.4:1}}>
                  <button style={S.chk(done)} onClick={()=>{ if(done){togglePaid(b.id,null,viewM,viewY);}else{setPayWith(p=>p.billId===b.id?{billId:null,accountId:""}:{billId:b.id,accountId:""});} }}>{done?"✓":""}</button>
                  <div style={S.eBox("rgba(255,255,255,0.05)")}>{b.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,textDecoration:done?"line-through":"none",color:done?"#555":"#EDE9E3",marginBottom:4}}>{b.name}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{dayBadge(b.dueDay,done,viewM,viewY)}{b.installments&&<span style={{fontSize:10,color:"#666",padding:"2px 6px",borderRadius:5,background:"rgba(255,255,255,0.05)"}}>C{b.installmentCurrent}/{b.installments}</span>}</div>
                  </div>
                  <div style={{fontSize:15,fontFamily:"AppNums, Georgia",color:done?"#555":"#EDE9E3",flexShrink:0}}>{fmt(b.amount)}</div>
                  <button onClick={()=>startEditBill(b)} style={S.penBtn}>✏️</button>
                  <button onClick={()=>b.installments===null?openDelMonthly(b,viewM,viewY):openDelCuota(b,b.installmentCurrent,viewM,viewY)} style={S.xBtn}>×</button>
                </div>
                {selecting&&!done&&(
                  <div style={{background:"rgba(200,169,126,0.06)",border:"1px solid rgba(200,169,126,0.15)",borderRadius:12,margin:"0 4px 10px",padding:"12px"}}>
                    <div style={{fontSize:10,letterSpacing:3,color:C.gold,textTransform:"uppercase",marginBottom:8}}>¿Con qué cuenta pagás?</div>
                    <AccPills selected={payWith.accountId} onSelect={id=>setPayWith(p=>({...p,accountId:id}))} showNone={true}/>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setPayWith({billId:null,accountId:""})} style={{flex:1,padding:"9px",borderRadius:9,background:"transparent",border:"1px solid rgba(255,255,255,0.1)",color:"#666",fontSize:13,cursor:"pointer"}}>Cancelar</button>
                      <button disabled={!payWith.accountId} onClick={()=>togglePaid(b.id,payWith.accountId,viewM,viewY)} style={{flex:2,padding:"9px",borderRadius:9,background:payWith.accountId?C.gold:"#333",border:"none",color:payWith.accountId?C.bg:"#555",fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia"}}>✓ Marcar pagado</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button data-tour="bills-fab" style={S.fab} onClick={()=>setModal("bill")}>+</button>
        <div style={S.nav(isMobile)}>{NAV.map(([t,e,l])=><button key={t} style={S.nBtn(tab===t)} onClick={()=>setTab(t)}><span>{e}</span>{l}</button>)}</div>
        {!isMobile&&<div/>}
        </div>
      </div>
    );
  }

  // ══ ACCOUNTS TAB ══
  if(tab==="accounts") return(
    <div style={S.app(isMobile)}>
      {!isMobile&&<Sidebar/>}
      <div style={isMobile?{}:S.content}>
        {renderTour()}{renderCelebration()}
      <div style={S.hdr}><div style={S.ey}>Mis cuentas</div><h1 style={S.h1}>Balance por cuenta</h1></div>
      {accounts.map(acc=>{
        const bal=accountBalance(acc.id); const neg=bal<0; const isTarjeta=acc.id==="tarjeta";
        return(
          <div key={acc.id} data-tour={acc.id===accounts[0]?.id?"acc-card":undefined} style={{...S.gCard(),borderColor:neg?"rgba(232,90,90,0.4)":isTarjeta?"rgba(232,122,206,0.35)":"rgba(200,169,126,0.25)",background:neg?"linear-gradient(135deg,#1A0808,#220D0D)":isTarjeta?"linear-gradient(135deg,#150818,#1A0D20)":"linear-gradient(135deg,#1A1208,#221808)"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{width:46,height:46,borderRadius:13,background:`${acc.color}20`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,cursor:"pointer"}} onClick={()=>setAccountDetail(acc.id)}>{acc.emoji}</div>
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>setAccountDetail(acc.id)}>
                <div style={{fontSize:13,color:"#888",marginBottom:4}}>{acc.name}{isTarjeta&&<span style={{fontSize:10,color:C.pink,marginLeft:8}}>VISA</span>}</div>
                <div style={{fontSize:26,fontFamily:"AppNums, Georgia",color:neg?C.red:acc.color}}>{neg&&"−"}{fmt(Math.abs(bal))}</div>
                <div style={{fontSize:11,color:"#555",marginTop:2}}>Tocá para ver movimientos →</div>
                {isTarjeta&&!prevResumenPaid&&<div style={{fontSize:12,color:C.pink,marginTop:4}}>Resumen {MONTHS_FULL[PM]}: {fmt(prevResumenAmount)} (vence {cardSettings.dueDay}/{CM+1})</div>}
                {isTarjeta&&prevResumenPaid&&<div style={{fontSize:12,color:C.green,marginTop:4}}>✓ Resúmenes al día</div>}
                {neg&&!isTarjeta&&<div style={{fontSize:12,color:C.red,marginTop:4}}>⚠️ Saldo negativo</div>}
              </div>
              <button onClick={()=>startEditAcc(acc)} style={S.penBtn}>✏️</button>
              <button onClick={()=>delAccount(acc.id)} style={S.xBtn}>×</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
              <div><div style={{fontSize:9,color:C.green,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>{isTarjeta?"Pagos":"Ingresos"}</div><div style={{fontSize:16,color:C.green,fontFamily:"AppNums, Georgia"}}>{fmt(txns.filter(t=>t.type==="ingreso"&&t.accountId===acc.id).reduce((s,t)=>s+toARS(t),0))}</div></div>
              <div><div style={{fontSize:9,color:C.red,letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>Gastos</div><div style={{fontSize:16,color:C.red,fontFamily:"AppNums, Georgia"}}>{fmt(txns.filter(t=>t.type==="gasto"&&t.accountId===acc.id).reduce((s,t)=>s+toARS(t),0))}</div></div>
            </div>
            {isTarjeta&&<div style={{marginTop:12,paddingTop:10,borderTop:"1px solid rgba(232,122,206,0.15)"}}>
              <div style={{fontSize:9,color:C.pink,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Acumulando {MONTHS_FULL[CM]}</div>
              {cardRowsForResumen(CM,CY).map(({bill:b,n},i)=><div key={`${b.id}-${n}-${i}`} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#C0B0F0",padding:"2px 0"}}><span>{b.emoji} {b.name}{n!==null&&<span style={{color:"#888",marginLeft:4}}>C{n}/{b.installments}</span>}</span><span style={{fontFamily:"AppNums, Georgia"}}>{fmt(b.amount)}</span></div>)}
              {cardTxnsForResumen(CM,CY).map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#C0B0F0",padding:"2px 0"}}><span>🛒 {t.description||t.category}</span><span style={{fontFamily:"AppNums, Georgia"}}>{fmt(toARS(t))}</span></div>)}
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:C.pink,padding:"8px 0 0",borderTop:"1px solid rgba(232,122,206,0.15)",marginTop:4}}><span>Total → vence {cardSettings.dueDay}/{NM+1}</span><span style={{fontFamily:"AppNums, Georgia"}}>{fmt(currAccumulating)}</span></div>
            </div>}
          </div>
        );
      })}
      <div data-tour="acc-savings" style={S.sec}>Metas de ahorro</div>
      {savings.map(g=>{ const pct=Math.min(100,Math.round((g.saved/g.goal)*100)); const isAdd=addSavId===g.id; return(
        <div key={g.id} style={S.card()}>
          <div style={{...S.row,marginBottom:10}}><div style={{flex:1}}><div style={{fontSize:15}}>{g.name}</div><div style={{fontSize:12,color:"#666",marginTop:2}}>{fmt(g.saved)} de {fmt(g.goal)}</div></div><div style={{fontSize:20,fontFamily:"AppNums, Georgia",color:C.gold}}>{pct}%</div><button style={S.xBtn} onClick={()=>delSaving(g.id)}>×</button></div>
          <div style={{height:6,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.gold},#E8C89A)`,borderRadius:4}}/></div>
          {isAdd?<div style={{marginTop:4}}><input style={{...S.inp,padding:"10px 12px",fontSize:14,marginBottom:10}} type="number" placeholder="$ cuánto sumás" value={addSavAmt} onChange={e=>setAddSavAmt(e.target.value)}/><div style={{...S.lbl,marginBottom:7}}>¿De qué cuenta sale? (opcional)</div><AccPills selected={addSavAcc} onSelect={setAddSavAcc} showNone={true} exclude={["tarjeta"]}/><div style={{display:"flex",gap:8}}><button onClick={()=>{setAddSavId(null);setAddSavAmt("");setAddSavAcc("none");}} style={{flex:1,padding:"10px",borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"#666",cursor:"pointer",fontFamily:"AppNums, Georgia"}}>Cancelar</button><button disabled={saving} onClick={()=>guardado(addToSaving)} style={{flex:2,padding:"10px 14px",borderRadius:10,background:C.gold,border:"none",color:C.bg,cursor:saving?"default":"pointer",opacity:saving?0.55:1,fontFamily:"AppNums, Georgia"}}>{saving?"Guardando…":"+ Sumar ahorro"}</button></div></div>:<button onClick={()=>{setAddSavAcc("none");setAddSavId(g.id);}} style={{width:"100%",padding:"9px",borderRadius:10,background:"rgba(200,169,126,0.08)",border:"1px solid rgba(200,169,126,0.2)",color:C.gold,fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia"}}>+ Agregar ahorro</button>}
        </div>
      );})}
      {savings.length===0&&<div style={{textAlign:"center",padding:"10px 20px",color:"#444",fontSize:13}}>Sin metas todavía.</div>}
      <div style={{margin:"6px 14px"}}><button onClick={()=>setModal("saving")} style={{width:"100%",padding:12,borderRadius:12,background:"rgba(200,169,126,0.07)",border:"1px solid rgba(200,169,126,0.2)",color:C.gold,fontSize:13,cursor:"pointer",fontFamily:"AppNums, Georgia"}}>+ Nueva meta de ahorro</button></div>
      {/* 🆕 GATILLO OCULTO DE REINICIO — tocá 7 veces "v6.0" para abrir la zona de peligro */}
      <div style={{textAlign:"center",padding:"30px 0 90px"}}>
        <span onClick={()=>{const n=resetTaps+1;setResetTaps(n);if(n>=7){setResetTaps(0);setModal("reset");}}} style={{fontSize:10,color:"#1B1B23",userSelect:"none",letterSpacing:3,cursor:"default"}}>v6.0</span>
      </div>
      <button data-tour="acc-fab" style={S.fab} onClick={()=>setModal("account")}>+</button>
      <div style={S.nav(isMobile)}>{NAV.map(([t,e,l])=><button key={t} style={S.nBtn(tab===t)} onClick={()=>setTab(t)}><span>{e}</span>{l}</button>)}</div>
      </div>
    </div>
  );

  // ══ INSIGHTS TAB ══
  if(tab==="insights") return(
    <div style={S.app(isMobile)}>
      {!isMobile&&<Sidebar/>}
      <div style={isMobile?{}:S.content}>
        {renderTour()}{renderCelebration()}
      <div style={S.hdr}><div style={S.ey}>Análisis</div><h1 style={S.h1}>¿A dónde va tu plata?</h1></div>
      <div style={S.gCard()}>
        <div data-tour="ins-summary" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {[["Ingresos",C.green,fmt(totalIn)],["Gastos",C.red,fmt(totalOut)],["Disponible",txnBalance>=0?C.gold:C.red,fmt(txnBalance)]].map(([l,c,v])=>(<div key={l}><div style={{fontSize:9,letterSpacing:2,color:c,textTransform:"uppercase",marginBottom:4}}>{l}</div><div style={{fontSize:14,color:c,fontFamily:"AppNums, Georgia"}}>{v}</div></div>))}
        </div>
      </div>
      {budget>0&&(<div style={{...S.card(),background:budgetPct>=100?"rgba(232,90,90,0.07)":"rgba(90,232,154,0.05)",border:`1px solid ${budgetPct>=100?"rgba(232,90,90,0.25)":"rgba(90,232,154,0.2)"}`}}><div style={{...S.row,marginBottom:10}}><div style={{flex:1}}><div style={{fontSize:11,color:budgetPct>=100?C.red:C.green,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>🎯 Presupuesto mensual</div><div style={{fontSize:13,color:"#888"}}>{fmt(thisMonthSpend)} de {fmt(budget)}</div></div><div style={{fontSize:22,fontFamily:"AppNums, Georgia",color:budgetPct>=100?C.red:C.gold}}>{budgetPct}%</div></div><div style={{height:8,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,budgetPct)}%`,background:budgetPct>=100?`linear-gradient(90deg,${C.red},#FF8080)`:`linear-gradient(90deg,${C.green},#8BC34A)`,borderRadius:4}}/></div>{budgetPct>=90&&<div style={{fontSize:12,color:C.red,marginTop:8}}>{budgetPct>=100?"⚠️ Superaste el presupuesto":"⏰ Cerca del límite"}</div>}</div>)}
      <div data-tour="ins-cats" style={S.sec}>Gastos por categoría</div>
      {gatosCatData.length>0?(<><div style={{height:180,margin:"0 14px"}}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={gatosCatData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={74} innerRadius={34}>{gatosCatData.map((c,i)=><Cell key={i} fill={c.color}/>)}</Pie><Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1A24",border:"1px solid #333",borderRadius:8,color:"#EDE9E3",fontFamily:"AppNums, Georgia"}}/></PieChart></ResponsiveContainer></div><div style={{padding:"0 14px"}}>{gatosCatData.map(c=>(<div key={c.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><div style={{width:9,height:9,borderRadius:"50%",background:c.color}}/><span style={{fontSize:16}}>{c.emoji}</span><span style={{flex:1,fontSize:13,color:"#C8C4BE"}}>{c.name}</span><span style={{fontSize:14,fontFamily:"AppNums, Georgia",color:C.red}}>{fmt(c.total)}</span><span style={{fontSize:10,color:"#444",minWidth:32,textAlign:"right"}}>{totalOut>0?Math.round(c.total/totalOut*100):0}%</span></div>))}</div></>):<div style={{textAlign:"center",padding:"20px",color:"#444",fontSize:13}}>Registrá gastos para ver el análisis por categoría.</div>}
      <div style={S.sec}>📋 Compromisos fijos mensuales</div>
      <div style={S.card()}>
        <div style={{...S.row,marginBottom:12,paddingBottom:10,borderBottom:"1px solid rgba(255,255,255,0.07)"}}><span style={{flex:1,fontSize:13,color:"#888"}}>Total comprometido por mes</span><span style={{fontSize:20,fontFamily:"AppNums, Georgia",color:C.gold}}>{fmt(monthlyFixedTotal)}</span></div>
        {bills.filter(b=>{ if(b.isCard) return isCardBillActiveInMonth(b,CM,CY)||isCardBillActiveInMonth(b,PM,PY); return (b.installments===null||b.installmentCurrent<=b.installments)&&recurringActive(b,CM,CY); }).sort((a,b2)=>a.dueDay-b2.dueDay).map(b=>{const cn=b.isCard&&Array.isArray(b.schedule)?(getInstallmentNumber(b,CM,CY)||getInstallmentNumber(b,PM,PY)):b.installmentCurrent;return(<div key={b.id} style={{...S.row,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}><span style={{fontSize:16}}>{b.emoji}</span><span style={{flex:1,fontSize:13,color:"#C8C4BE"}}>{b.name}{b.isCard&&<span style={{color:C.pink,marginLeft:4,fontSize:10}}>💳</span>}</span>{b.installments&&<span style={{fontSize:10,color:"#666",marginRight:6}}>C{cn}/{b.installments}</span>}<span style={{fontSize:10,color:"#555",marginRight:8}}>día {b.dueDay}</span><span style={{fontSize:14,fontFamily:"AppNums, Georgia",color:"#EDE9E3"}}>{fmt(b.amount)}</span><button onClick={()=>startEditBill(b)} style={S.penBtn}>✏️</button></div>);})}
      </div>
      <div data-tour="ins-chart" style={S.sec}>Gasto mensual — últimos 12 meses</div>
      <div style={{height:200,margin:"0 14px"}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyChartData} margin={{top:5,right:5,left:0,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
            <XAxis dataKey="label" tick={{fill:"#555",fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"#555",fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${v/1000}k`:v} width={28}/>
            <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"#1A1A24",border:"1px solid #333",borderRadius:8,color:"#EDE9E3",fontFamily:"AppNums, Georgia"}} labelStyle={{color:C.gold}}/>
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

  // ══ HOME TAB ══
  const recentTxns=[...txns].sort((a,b)=>new Date(b.date+"T12:00:00")-new Date(a.date+"T12:00:00")).slice(0,12);
  return(
    <div style={S.app(isMobile)}>
      {!isMobile&&<Sidebar/>}
      <div style={isMobile?{}:S.content}>
        {renderTour()}{renderCelebration()}
      <div style={{...S.hdr,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={S.ey}>Mis finanzas · {MONTHS_FULL[CM]}</div><h1 style={S.h1}>Hola{firstName?`, ${firstName}`:""} 👋</h1></div>
        <button onClick={()=>setModal("settings")} title="Configuración" style={{width:42,height:42,borderRadius:12,background:"rgba(200,169,126,0.08)",border:"1px solid rgba(200,169,126,0.2)",color:C.gold,fontSize:20,cursor:"pointer",flexShrink:0}}>⚙️</button>
      </div>
      <div style={S.gCard()}>
        <div style={S.ey}>Balance real disponible</div>
        <div data-tour="home-balance" style={{fontSize:34,color:realBalance>=0?C.gold:C.red,margin:"6px 0 4px",fontFamily:"AppNums, Georgia"}}>{fmt(realBalance)}</div>
        <div style={{fontSize:10,color:"#555",marginBottom:14}}>ingresos − gastos − compromisos pendientes</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div><div style={{fontSize:9,color:C.green,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Ingresos</div><div style={{fontSize:18,color:C.green,fontFamily:"AppNums, Georgia"}}>{fmt(totalIn)}</div></div>
          <div><div style={{fontSize:9,color:C.red,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>Gastos</div><div style={{fontSize:18,color:C.red,fontFamily:"AppNums, Georgia"}}>{fmt(totalOut)}</div></div>
        </div>
      </div>
      {budget>0&&<div style={S.card()}><div style={{...S.row,marginBottom:8}}><span style={{flex:1,fontSize:12,color:"#888"}}>🎯 Presupuesto del mes</span><span style={{fontSize:13,color:budgetPct>=100?C.red:C.gold,fontFamily:"AppNums, Georgia"}}>{fmt(thisMonthSpend)} / {fmt(budget)}</span></div><div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,budgetPct)}%`,background:budgetPct>=100?`linear-gradient(90deg,${C.red},#FF8080)`:`linear-gradient(90deg,${C.green},#8BC34A)`,borderRadius:4}}/></div></div>}
      {!prevResumenPaid&&prevResumenAmount>0?(<div style={S.pinkC}><div style={{...S.row,marginBottom:8}}><span style={{fontSize:11,color:C.pink,letterSpacing:2,textTransform:"uppercase",flex:1}}>💳 Resumen Tarjeta {MONTHS_FULL[PM]}</span><button onClick={()=>setTab("bills")} style={{background:"none",border:"1px solid rgba(232,122,206,0.3)",borderRadius:7,padding:"4px 10px",color:C.pink,fontSize:11,cursor:"pointer"}}>Pagar →</button></div><div style={{fontSize:24,color:C.pink,fontFamily:"AppNums, Georgia"}}>{fmt(prevResumenAmount)}</div><div style={{fontSize:11,color:"#7A4060",marginTop:3}}>Vence el {cardSettings.dueDay} de {MONTHS_FULL[CM]} · {resumenDaysLeft<0?`Venció hace ${Math.abs(resumenDaysLeft)}d`:resumenDaysLeft===0?"¡HOY!":resumenDaysLeft===1?"Mañana":`${resumenDaysLeft} días`}</div></div>):null}
      {prevResumenPaid&&currAccumulating>0&&(closingPassed&&!currResumenPaid?(
  <div style={S.pinkC}><div style={{...S.row,marginBottom:8}}><span style={{fontSize:11,color:C.pink,letterSpacing:2,textTransform:"uppercase",flex:1}}>💳 Resumen Tarjeta {MONTHS_FULL[CM]}</span><button onClick={()=>setTab("bills")} style={{background:"none",border:"1px solid rgba(232,122,206,0.3)",borderRadius:7,padding:"4px 10px",color:C.pink,fontSize:11,cursor:"pointer"}}>Ver →</button></div><div style={{fontSize:24,color:C.pink,fontFamily:"AppNums, Georgia"}}>{fmt(currAccumulating)}</div><div style={{fontSize:11,color:"#7A4060",marginTop:3}}>Cerrado · vence el {cardSettings.dueDay} de {MONTHS_FULL[NM]}</div></div>
):(
  <div style={{...S.card(),background:"rgba(90,232,154,0.05)",border:"1px solid rgba(90,232,154,0.15)"}}><div style={S.row}><span style={{fontSize:20}}>✅</span><div style={{flex:1}}><div style={{fontSize:13,color:C.green}}>Último resumen pagado</div><div style={{fontSize:11,color:"#666",marginTop:2}}>{closingPassed?`Venció el ${cardSettings.dueDay} de ${MONTHS_FULL[NM]} · ${fmt(currAccumulating)}`:`Acumulando ${MONTHS_FULL[CM]}: ${fmt(currAccumulating)} → vence ${cardSettings.dueDay}/${NM+1}`}</div></div></div></div>
))}
      {pendingRegularBills.length>0&&(<div style={S.alertC}><div style={{...S.row,marginBottom:6}}><span style={{fontSize:11,color:C.red,letterSpacing:2,textTransform:"uppercase",flex:1}}>⚠️ Gastos fijos pendientes</span><button onClick={()=>setTab("bills")} style={{background:"none",border:"1px solid rgba(232,90,90,0.3)",borderRadius:7,padding:"4px 10px",color:C.red,fontSize:11,cursor:"pointer"}}>Ver →</button></div><div style={{fontSize:22,color:C.red,fontFamily:"AppNums, Georgia"}}>{fmt(pendingRegularBills.reduce((s,b)=>s+b.amount,0))}</div><div style={{fontSize:11,color:"#7A4040",marginTop:2}}>{pendingRegularBills.length} pagos pendientes este mes</div></div>)}
      {(urgentRegular.length>0||resumenIsUrgent)&&(<div style={S.card()}><div style={{fontSize:11,letterSpacing:3,color:C.gold,textTransform:"uppercase",marginBottom:10}}>📅 Próximos vencimientos</div>{resumenIsUrgent&&prevResumenAmount>0&&(<div style={{...S.row,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><div style={S.eBox("rgba(232,122,206,0.12)")}>💳</div><div style={{flex:1}}><div style={{fontSize:14}}>Resumen {MONTHS_FULL[PM]}</div><div style={{fontSize:11,color:C.pink}}>Vence el {cardSettings.dueDay}</div></div><div style={{fontSize:15,fontFamily:"AppNums, Georgia",color:C.pink}}>{fmt(prevResumenAmount)}</div></div>)}{urgentRegular.slice(0,4-(resumenIsUrgent?1:0)).map(b=>{const d=daysUntil(b.dueDay,CM,CY);return(<div key={b.id} style={{...S.row,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><div style={S.eBox("rgba(255,255,255,0.04)")}>{b.emoji}</div><div style={{flex:1}}><div style={{fontSize:14}}>{b.name}</div><div style={{fontSize:11,color:d<0?C.red:d<=1?"#E8844A":"#E8A45A"}}>{d<0?`⚠️ Venció hace ${Math.abs(d)}d`:d===0?"🔴 Hoy":d===1?"🟠 Mañana":`🟡 ${d}d`}</div></div><div style={{fontSize:15,fontFamily:"AppNums, Georgia",color:C.red}}>{fmt(b.amount)}</div></div>);})}<button onClick={()=>setTab("bills")} style={{width:"100%",marginTop:10,padding:"8px",borderRadius:9,background:"transparent",border:"1px solid rgba(200,169,126,0.2)",color:C.gold,fontSize:12,cursor:"pointer",fontFamily:"AppNums, Georgia"}}>Ver todos los pagos →</button></div>)}
      {accounts.some(a=>accountBalance(a.id)!==0)&&<><div data-tour="home-accounts" style={S.sec}>Mis cuentas</div><div style={{display:"flex",gap:10,padding:"0 14px",overflowX:"auto",paddingBottom:6}}>{accounts.map(acc=>{const b=accountBalance(acc.id);const neg=b<0;return(<div key={acc.id} onClick={()=>setAccountDetail(acc.id)} style={{flexShrink:0,background:neg?"rgba(232,90,90,0.08)":"rgba(255,255,255,0.04)",border:`1px solid ${neg?"rgba(232,90,90,0.3)":acc.color+"33"}`,borderRadius:14,padding:"14px 16px",cursor:"pointer",minWidth:110}}><div style={{fontSize:18,marginBottom:4}}>{acc.emoji}</div><div style={{fontSize:11,color:"#666",marginBottom:4}}>{acc.name}</div><div style={{fontSize:16,fontFamily:"AppNums, Georgia",color:neg?C.red:acc.color}}>{neg&&"−"}{fmt(Math.abs(b))}</div></div>);})}</div></>}
      <div style={S.card()}><div style={S.row}><span style={{fontSize:20}}>📋</span><div style={{flex:1}}><div style={{fontSize:11,color:"#888",marginBottom:2}}>Total gasto fijo mensual</div><div style={{fontSize:20,fontFamily:"AppNums, Georgia",color:C.gold}}>{fmt(monthlyFixedTotal)}</div></div><button onClick={()=>setTab("insights")} style={{background:"none",border:"1px solid rgba(200,169,126,0.2)",borderRadius:8,padding:"6px 12px",color:C.gold,fontSize:11,cursor:"pointer"}}>Ver →</button></div></div>
      {/* 🆕 ÚLTIMOS MOVIMIENTOS — todos los gastos/ingresos de una vez, editables y borrables */}
      {txns.length>0&&<><div style={S.sec}>Últimos movimientos</div><div style={{padding:"0 14px"}}>{recentTxns.map(t=>{const isT=t.type==="transfer";const cat=isT?{emoji:"🔄",color:C.blue}:(t.type==="gasto"?catsGasto:catsIngreso).find(c=>c.name===t.category)||{emoji:"•",color:"#888"};const acc=entityOf(t.accountId);const fromE=isT?entityOf(t.fromId):null;const toE=isT?entityOf(t.toId):null;return(<div key={t.id} style={S.txRow}><div style={S.eBox(`${cat.color}18`)}>{cat.emoji}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:14}}>{isT?(t.description||`${fromE?fromE.name:"?"} → ${toE?toE.name:"?"}`):(t.description||t.category)}</div><div style={{fontSize:11,color:"#555",marginTop:1}}>{isT?`${fromE?fromE.emoji+" "+fromE.name:"?"} → ${toE?toE.emoji+" "+toE.name:"?"}`:(acc?`${acc.emoji} ${acc.name}`:t.category)} · {fmtDate(t.date)}{t.currency==="USD"&&<span style={{color:C.blue}}> · 🇺🇸</span>}</div></div><div style={{fontSize:15,fontFamily:"AppNums, Georgia",color:isT?C.blue:(t.type==="gasto"?C.red:C.green),flexShrink:0}}>{isT?"":t.type==="gasto"?"−":"+"}{t.currency==="USD"?fmtUSD(t.amount):fmt(t.amount)}</div>{!isT&&<button onClick={()=>startEditTxn(t)} style={S.penBtn}>✏️</button>}<button onClick={()=>delTxn(t.id)} style={S.xBtn}>×</button></div>);})}</div></>}
      <div style={{height:80}}/>
      <button data-tour="home-fab" style={S.fab} onClick={()=>setModal("txn")}>+</button>
      <div style={S.nav(isMobile)}>{NAV.map(([t,e,l])=><button key={t} style={S.nBtn(tab===t)} onClick={()=>setTab(t)}><span>{e}</span>{l}</button>)}</div>
      </div>
    </div>
  );
}
