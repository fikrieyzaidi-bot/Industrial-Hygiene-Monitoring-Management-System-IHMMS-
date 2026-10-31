/* CEM Calculator — app logic (state, calculations, chemicals, CoA reading, appendices) */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY="ihcc_cem2";
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function toast(m,ms=2800){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),ms)}
function busy(on,msg){$("#busy").classList.toggle("show",!!on);if(msg)$("#busyMsg").textContent=msg}
const PDFJS="https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/legacy/build/";
const TESS="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
const APPX=[["A","CERTIFICATE OF COMPETENCY"],["B","FORM A"],["C","PROCESS FLOWCHART"],["D","METHOD USED"],["E","CALIBRATION CERTIFICATE"],["F","DATA AND CALCULATION FORM"],["G","CERTIFICATE OF ANALYSIS"],["H","PLAN LAYOUT"]];
const DEF_INFO={htPos:"Industrial Hygiene Executive (HT1)",hours:"Normal, 08:00 am – 5:00 pm; break 12:00 pm – 1:00 pm",area:"Plant",
  consName:"Environmental Science (M) Sdn. Bhd.",consAddr:"No.9, Persiaran Industri, Sri Damansara, 52200 Kuala Lumpur, Malaysia.",consTel:"Tel : 03 - 6273 6013 Fax : 03 - 6275 9325",consEmail:"E-mail: general@esm.com.my"};
const ENG=["Local exhaust ventilation (LEV) at source","General / dilution ventilation","Enclosure or isolation of the source","Wet method / water spray dust suppression","Dust collector / bag filter","Automation / remote or cabin operation"];
const ADM=["Safe work procedure (SOP) in place","Job rotation / limited exposure time","Housekeeping by vacuum or wet cleaning","Chemical hazard training given","Warning signage at exposure area","Restricted access to exposure area","LEV examined and tested within the last 12 months"];
const PPE=["Chemical-resistant gloves","Safety goggles / face shield","Coverall","Safety boots"];
const RPE={"":["— not recorded —",null],none:["No respirator",1],ffp:["Disposable respirator (N95 / P2)",10],hfp:["Half-face respirator with particulate filter (P2/P3)",10],hfv:["Half-face respirator with organic vapour cartridge",10],hfc:["Half-face respirator with combination cartridge",10],ffr:["Full-face respirator",50],papr:["Powered air-purifying respirator (PAPR)",25],sar:["Supplied-air respirator",1000]};

/* ---------------- USECHH Schedule I database ---------------- */
const DB=(window.USECHH||[]).map((e,i)=>({...e,i}));
const nnum=v=>{const n=parseFloat(String(v??"").replace(",","."));return isFinite(n)?n:null};
const normN=s=>String(s||"").toLowerCase().replace(/^\*+/,"").replace(/[-–—]\s*\(kulit\)|\(kulit\)/g,"").replace(/\((respirable|inhalable|total)\)/g," $1 ").replace(/particulates?|fraction|[()*,.;:]/g," ").replace(/\s+/g," ").trim();
DB.forEach(e=>{e.keys=[e.n,e.en,...(e.al||[])].filter(Boolean).map(normN);e.casL=(e.cas||"").split(";").map(c=>c.trim()).filter(Boolean)});
function dbFind(name){const n=normN(name);if(!n)return null;
  if(/^\d{2,7}-\d{2}-\d$/.test(n))return DB.find(e=>e.casL.includes(n))||null;
  return DB.find(e=>e.keys.includes(n))||DB.find(e=>e.keys.some(k=>k===n||k.startsWith(n+" ")))||DB.find(e=>e.en&&normN(e.en).includes(n))||null}
const MEDIA={"0500":"Filter (Tared 37-mm, 5-µm PVC filter)","0600":"Cyclone + Filter (Higgins-Dewell [HD] + Tared 5-µm PVC filter)","7602":"Cyclone + Filter (Higgins-Dewell [HD] + Tared 5-µm PVC filter)","7500":"Cyclone + Filter (Higgins-Dewell [HD] + Tared 5-µm PVC filter)",
  "1501":"Charcoal sorbent tube (100 mg/50 mg)","1003":"Charcoal sorbent tube (100 mg/50 mg)","1005":"Charcoal sorbent tube (100 mg/50 mg)","1500":"Charcoal sorbent tube (100 mg/50 mg)","1300":"Charcoal sorbent tube (100 mg/50 mg)","1400":"Charcoal sorbent tube (100 mg/50 mg)","1401":"Charcoal sorbent tube (100 mg/50 mg)","1450":"Charcoal sorbent tube (100 mg/50 mg)","1457":"Charcoal sorbent tube (100 mg/50 mg)","1022":"Charcoal sorbent tube (100 mg/50 mg)","1550":"Charcoal sorbent tube (100 mg/50 mg)",
  "2016":"DNPH-coated silica gel cartridge","7300":"MCE membrane filter, 0.8 µm, 37-mm","7400":"MCE membrane filter, 0.8 µm, 25-mm with conductive cowl"};
function fromDb(e,displayName){
  const mg=nnum(e.mg),ppm=nnum(e.ppm);let pel=mg,conv=false;
  if(pel==null&&ppm!=null&&e.mw){pel=+(ppm*e.mw/24.45).toFixed(2);conv=true}
  const code=((e.niosh||"").match(/\d{4}/)||[""])[0];
  const lim=[ppm!=null?ppm+" ppm":"",mg!=null?mg+" mg/m³":"",conv?`≈ ${pel} mg/m³ (converted, MW ${e.mw})`:""].filter(Boolean).join(" / ")||"no numeric limit (—)";
  const ceil=(nnum(e.cppm)!=null||nnum(e.cmg)!=null)?` · Ceiling: ${[nnum(e.cppm)!=null?e.cppm+" ppm":"",nnum(e.cmg)!=null?e.cmg+" mg/m³":""].filter(Boolean).join(" / ")}`:"";
  return{name:displayName||e.en||e.n.replace(/-\s*\(kulit\)/,"").trim(),cas:e.cas||"",method:e.niosh||"",media:MEDIA[code]||"",pel:pel??"",ppm:ppm??"",ceil:ceil.replace(" · ",""),
    skin:!!e.skin,s2:!!e.s2,mw:e.mw||"",db:e.i,src:`USECHH 2000 Sch. I — ${e.n}: ${lim}${ceil}${e.skin?" · skin":""}${e.s2?" · Sch. II medical surveillance":""}${e.unit?" · unit "+e.unit:""}${e.chk?" · ⚠ "+e.chk:""}`,
    ceilOnly:pel==null&&nnum(e.cmg)!=null,unit:e.unit||""}}
function defaultParams(){const P=[];const add=(q,n,media)=>{const e=dbFind(q);if(e){const p=fromDb(e,n);if(media)p.media=media;P.push(p)}};
  add("respirable dust","Respirable Dust","Cyclone + Filter (Higgins-Dewell [HD] + Tared 5-µm PVC filter)");
  add("inhalable dust","Inhalable Particulate Dust","Filter (Tared 37-mm, 5-µm PVC filter)");
  add("silica quartz","Silica Quartz (Respirable)","Cyclone + Filter (Higgins-Dewell [HD] + Tared 5-µm PVC filter)");
  P.forEach(p=>{if(p.name==="Respirable Dust")p.method="NIOSH 0600 (Issue 3: 15 January 1998)";if(p.name==="Inhalable Particulate Dust")p.method="NIOSH 0500 (Issue 2: 15 August 1994)";if(p.name.startsWith("Silica"))p.method="NIOSH 7602 (Issue 4: 25 July 2017)"});
  return P}

/* ---------------- state ---------------- */
function load(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}}
const st=Object.assign({info:{...DEF_INFO},params:defaultParams(),points:{},rows:[],divTotal:false,text:{},att:{},ctl:{eng:[],adm:[],ppe:[]}},load()||{});
st.info={...DEF_INFO,...st.info};st.ctl={eng:[],adm:[],ppe:[],...st.ctl};
let saveT;function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}},200)}
const idb={db:null,
  open(){return this.db?Promise.resolve(this.db):new Promise((res,rej)=>{const r=indexedDB.open("ihcc_cem_files",1);r.onupgradeneeded=()=>r.result.createObjectStore("f");r.onsuccess=()=>res(this.db=r.result);r.onerror=()=>rej(r.error)})},
  async put(k,v){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction("f","readwrite");t.objectStore("f").put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})},
  async get(k){const db=await this.open();return new Promise((res,rej)=>{const r=db.transaction("f").objectStore("f").get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
  async del(k){const db=await this.open();return new Promise(res=>{const t=db.transaction("f","readwrite");t.objectStore("f").delete(k);t.oncomplete=res})}};

/* ---------------- calculations ---------------- */
const num=v=>{if(v===""||v==null)return null;const n=+String(v).replace(",",".");return isFinite(n)?n:null};
function massOf(m){const s=String(m??"").trim();if(!s)return{v:null};
  if(/^(nd|n\.d\.?|bdl|not detected)$/i.test(s))return{v:null,nd:true};
  const lt=/^</.test(s),v=num(s.replace(/^<\s*/,""));return{v,lt}}
const param=name=>st.params.find(p=>p.name===name)||{name,pel:null,method:"",media:""};
const worker=pt=>(st.points[pt]&&st.points[pt].name)||pt||"—";
function calc(r){const fc=num(r.fc),t=num(r.t),Pc=num(r.Pc),Tc=num(r.Tc),P=num(r.P),T=num(r.T),M=massOf(r.mass);
  if([fc,t,Pc,Tc,P,T].some(x=>x==null)||P<=0)return{M};
  const TK=T+273,TcK=Tc+273,Vm=fc*t*Math.sqrt((Pc*TK)/(P*TcK)),Vs=Vm*(P/760)*(298/TK),Ci=M.v==null||Vs<=0?null:M.v/Vs;
  return{TK,TcK,Vm,Vs,Ci,M,lt:M.lt}}
const ptSort=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
function groups(){
  const g=new Map();
  st.rows.forEach(r=>{const k=(r.param||"—")+"||"+(r.point||"—");if(!g.has(k))g.set(k,{param:r.param||"—",point:r.point||"—",rows:[]});g.get(k).rows.push({r,c:calc(r)})});
  const order=st.params.map(p=>p.name);
  return [...g.values()].sort((a,b)=>((order.indexOf(a.param)+1||99)-(order.indexOf(b.param)+1||99))||ptSort(a.point,b.point)).map(G=>{
    const ok=G.rows.filter(x=>x.c.Ci!=null),complete=ok.length===G.rows.length&&ok.length>0;
    const sumT=G.rows.reduce((a,x)=>a+(num(x.r.t)||0),0),sumCt=ok.reduce((a,x)=>a+x.c.Ci*num(x.r.t),0);
    const div=st.divTotal?sumT:480,twa=complete&&div>0?sumCt/div:null,lt=complete&&G.rows.every(x=>x.c.lt);
    const pel=num(param(G.param).pel),pct=twa!=null&&pel?twa/pel*100:null;
    return{...G,worker:worker(G.point),sumT,sumCt,div,twa,lt,pel,pct,complete}});
}
const f=(v,d=3)=>v==null||!isFinite(v)?"–":(+v).toFixed(d);
const twaTxt=g=>g.twa==null?"–":(g.lt?"<":"")+f(g.twa,3);
const cls=p=>p==null?"":p>=100?"over":p>=50?"warn":"safe";
const remark=g=>g.pct==null?"–":g.lt?"Below detection limit":g.pct>=100?"Exceeds PEL":g.pct>=50?"Above 50% PEL":g.pct>=10?"Above 10% PEL":"Below 10% PEL";

/* ---------------- UI: info + controls ---------------- */
function renderInfo(){$$("[data-i]").forEach(el=>{el.value=st.info[el.dataset.i]||"";el.oninput=()=>{st.info[el.dataset.i]=el.value;save();renderTexts(true)}})}
$("#logoIn").onchange=async e=>{const fl=e.target.files[0];if(!fl)return;await idb.put("logo",{name:fl.name,type:fl.type,data:await fl.arrayBuffer()});st.info.logoName=fl.name;save();$("#logoName").textContent=fl.name;toast("Logo saved")};
function renderControls(){const C=st.ctl;
  const box=(id,list,key)=>{$(id).innerHTML=list.map((t,i)=>`<label class="chk"><input type="checkbox" data-ck="${key}" value="${esc(t)}" ${C[key].includes(t)?"checked":""}>${esc(t)}</label>`).join("")};
  box("#cEng",ENG,"eng");box("#cAdm",ADM,"adm");box("#cPpe",PPE,"ppe");
  $("#cRpe").innerHTML=Object.entries(RPE).map(([k,[l]])=>`<option value="${k}">${l}</option>`).join("");
  $$("[data-ck]").forEach(el=>el.onchange=()=>{const a=C[el.dataset.ck];if(el.checked){if(!a.includes(el.value))a.push(el.value)}else a.splice(a.indexOf(el.value),1);save();renderTexts(true)});
  $$("[data-c]").forEach(el=>{el.value=C[el.dataset.c]||"";el[el.tagName==="SELECT"?"onchange":"oninput"]=()=>{C[el.dataset.c]=el.value;save();renderTexts(true)}})}

/* ---------------- UI: chemicals ---------------- */
const optLabel=e=>`${e.en||e.n}${e.en?" — "+e.n:""}${e.cas?" ["+e.cas+"]":""}`;
function fillChemList(){$("#chemList").innerHTML=DB.map(e=>`<option value="${esc(optLabel(e))}">`).join("")}
const byLabel=v=>DB.find(e=>optLabel(e)===v);
$("#chemSearch").onchange=e=>{const d=byLabel(e.target.value)||dbFind(e.target.value);if(!d){toast("Not found in Schedule I. Pick from the list, or type the CAS number.");return}
  const p=fromDb(d);if(st.params.some(x=>x.name===p.name)){toast(p.name+" is already in the list");e.target.value="";return}
  st.params.push(p);e.target.value="";save();renderAll();toast(`${p.name} added. PEL ${p.pel||"–"} mg/m³${p.method?", "+p.method:""}`)};
function renderParams(){
  $("#tPar").innerHTML=`<tr><th>Chemical / parameter</th><th>Method</th><th>Sampling media</th><th>PEL 8-hr TWA (mg/m³)</th><th>Source (USECHH 2000)</th><th class="noP"></th></tr>`+
   st.params.map((p,i)=>`<tr><td><input data-p="${i}" data-k="name" list="chemList" value="${esc(p.name)}" style="min-width:200px"></td><td><input data-p="${i}" data-k="method" value="${esc(p.method)}" style="min-width:230px"></td>
   <td><input data-p="${i}" data-k="media" value="${esc(p.media)}" style="min-width:250px"></td><td><input data-p="${i}" data-k="pel" type="number" step="any" value="${esc(p.pel)}" style="width:100px;${p.pel===""||p.pel==null?"border-color:var(--over)":""}"></td>
   <td class="src">${p.src?esc(p.src):'<span class="muted">entered manually</span>'}</td><td class="noP"><button class="sm" data-pdel="${i}">✕</button></td></tr>`).join("");
  $$("[data-p]").forEach(el=>el.onchange=()=>{const i=+el.dataset.p,p=st.params[i],old=p.name,k=el.dataset.k;
    if(k==="name"){const d=byLabel(el.value);if(d){const np=fromDb(d);np.name=np.name;Object.assign(p,np);toast(`PEL and method filled from Schedule I: ${p.pel||"–"} mg/m³`)}else p.name=el.value;
      st.rows.forEach(r=>{if(r.param===old)r.param=p.name})}
    else{p[k]=el.value;if(k==="pel")p.src=(p.src||"").startsWith("USECHH")?p.src+" · PEL edited manually":p.src}
    save();renderAll()});
  $$("[data-pdel]").forEach(b=>b.onclick=()=>{st.params.splice(+b.dataset.pdel,1);save();renderAll()});
}
function renderPoints(){
  const pts=[...new Set(st.rows.map(r=>r.point).filter(Boolean))].sort(ptSort);
  pts.forEach(p=>{if(!st.points[p])st.points[p]={name:/blank/i.test(p)?"Field blank":"Worker "+(p.match(/\d+/)||[p])[0],task:""}});
  $("#tPts").innerHTML=pts.length?`<tr><th>Point</th><th>Worker name / job title</th><th>Task / activity</th><th>Samples</th></tr>`+pts.map(p=>`<tr><td><b>${esc(p)}</b></td><td><input data-pt="${esc(p)}" data-k="name" value="${esc(st.points[p].name)}" style="min-width:220px"></td><td><input data-pt="${esc(p)}" data-k="task" value="${esc(st.points[p].task||"")}" placeholder="e.g. Crusher operator" style="min-width:240px"></td><td>${st.rows.filter(r=>r.point===p).length}</td></tr>`).join("")
    :`<tr><td class="muted">Points appear here after you upload a CoA or add samples.</td></tr>`;
  $$("[data-pt]").forEach(el=>el.onchange=()=>{st.points[el.dataset.pt][el.dataset.k]=el.value;save();renderOut();renderTexts(true)});
}
const COLS=[["point","Point",70],["param","Parameter",0],["sample","Sample ID",90],["period","Period (hrs)",100,1],["fc","fc (L/min)",80,1],["t","t (min)",70,1],["Tc","Tc (°C)",65,1],["Pc","Pc (mmHg)",75,1],["T","T (°C)",65,1],["P","P (mmHg)",75,1],["mass","Mass (µg)",80]];
function ciCell(r){const c=calc(r);return c.Ci==null?(c.M.nd?"ND":"–"):(c.lt?"<":"")+f(c.Ci,3)}
function renderRows(){
  const pOpts=n=>st.params.map(p=>`<option ${p.name===n?"selected":""}>${esc(p.name)}</option>`).join("")+(n&&!st.params.some(p=>p.name===n)?`<option selected>${esc(n)}</option>`:"");
  $("#tIn").innerHTML=`<tr><th>#</th>${COLS.map(c=>`<th>${c[1]}${c[3]?` <button class="sm noP" data-fill="${c[0]}" title="Fill empty cells from above">↓</button>`:""}</th>`).join("")}<th>Ci (mg/m³)</th><th class="noP"></th></tr>`+
   (st.rows.length?st.rows.map((r,i)=>`<tr><td>${i+1}</td>${COLS.map(([k,,w])=>k==="param"?`<td><select data-r="${i}" data-k="param" style="min-width:190px">${pOpts(r.param)}</select></td>`
     :`<td><input data-r="${i}" data-k="${k}" value="${esc(r[k])}" style="width:${w}px" ${["fc","t","Tc","Pc","T","P"].includes(k)?'inputmode="decimal"':""}></td>`).join("")}
     <td class="n">${ciCell(r)}</td><td class="noP"><button class="sm" data-del="${i}">✕</button></td></tr>`).join("")
   :`<tr><td colspan="${COLS.length+3}" class="muted">No samples yet. Upload a CoA above, or click “+ Add sample”.</td></tr>`);
  $$("#tIn [data-r]").forEach(el=>el[el.tagName==="SELECT"?"onchange":"oninput"]=()=>{st.rows[+el.dataset.r][el.dataset.k]=el.value;save();
    if(el.dataset.k==="point"||el.dataset.k==="param")renderAll();else{el.closest("tr").children[COLS.length+1].textContent=ciCell(st.rows[+el.dataset.r]);renderOut();renderTexts(true)}});
  $$("[data-del]").forEach(b=>b.onclick=()=>{st.rows.splice(+b.dataset.del,1);save();renderAll()});
  $$("[data-fill]").forEach(b=>b.onclick=()=>{const k=b.dataset.fill;let last="";st.rows.forEach(r=>{if(String(r[k]??"").trim()==="")r[k]=last;else last=r[k]});save();renderAll()});
}
$("#bAdd").onclick=()=>{const l=st.rows[st.rows.length-1]||{};st.rows.push({point:l.point||"P1",param:l.param||st.params[0]?.name||"",sample:"",period:"",fc:l.fc||"",t:l.t||"",Tc:l.Tc??25,Pc:l.Pc??760,T:l.T??25,P:l.P??760,mass:""});save();renderAll()};
$("#bClr").onclick=()=>{if(!st.rows.length)return;st.rows=[];save();renderAll();toast("All samples cleared")};
$("#divTotal").onchange=e=>{st.divTotal=e.target.checked;save();renderOut();renderTexts(true)};

/* ---------------- UI: calc + summary ---------------- */
function twaExpr(g){if(!g.complete)return"TWA₈: enter fc, t, temperatures, pressures and mass for every sample.";
  return `TWA₈ = [${g.rows.map(({r,c})=>`(${f(c.Ci,3)} × ${f(num(r.t),0)})`).join(" + ")}] / ${f(g.div,0)} = <b>${twaTxt(g)} mg/m³</b>`}
function renderOut(){
  const G=groups();$("#divLbl").textContent=st.divTotal?"Σt (total sampling duration)":"480";
  $("#calc").innerHTML=G.length?G.map(g=>`<div style="margin-bottom:14px"><div style="font-size:13px;margin-bottom:4px"><b>${esc(st.info.client||"Client")}</b> — Point: ${esc(g.point)} — Parameter: ${esc(g.param)} — ${esc(g.worker)}</div>
   <div class="ts"><table><tr><th>Sample</th><th>Period (hrs)</th><th>fc (L/min)</th><th>t (min)</th><th>Tc (K)</th><th>Pc</th><th>T (K)</th><th>P</th><th>M (µg)</th><th>Vm (L)</th><th>Vs (L)</th><th>Ci (mg/m³)</th></tr>
   ${g.rows.map(({r,c})=>`<tr><td>${esc(r.sample)||"–"}</td><td>${esc(r.period)||"–"}</td><td class="n">${f(num(r.fc),4)}</td><td class="n">${f(num(r.t),0)}</td><td class="n">${f(c.TcK,1)}</td><td class="n">${esc(r.Pc)}</td><td class="n">${f(c.TK,1)}</td><td class="n">${esc(r.P)}</td><td class="n">${esc(r.mass)||"–"}</td><td class="n">${f(c.Vm,1)}</td><td class="n">${f(c.Vs,1)}</td><td class="n">${c.Ci==null?"–":(c.lt?"<":"")+f(c.Ci,3)}</td></tr>`).join("")}</table></div>
   <div class="muted" style="font-size:12.5px;margin-top:4px">${twaExpr(g)}</div></div>`).join(""):'<p class="muted">–</p>';
  $("#tSum").innerHTML=`<tr><th>Name (Sample No)</th><th>Parameter</th><th>Sampling duration</th><th>Exposure level (mg/m³)</th><th>PEL 8-hr TWA (mg/m³)</th><th>% PEL</th><th>Remarks</th></tr>`+
   (G.length?G.map(g=>`<tr><td>${esc(g.worker)} (${esc(g.point)})</td><td>${esc(g.param)}</td><td>${f(g.sumT,0)} min</td><td class="n"><b>${twaTxt(g)}</b></td><td class="n">${g.pel??'<span class="pill p-over">set PEL</span>'}</td><td class="n">${g.pct==null?"–":(g.lt?"<":"")+f(g.pct,1)}</td><td>${g.pct==null?(g.complete?"–":'<span class="muted">incomplete field data</span>'):`<span class="pill p-${g.lt?"safe":cls(g.pct)}">${remark(g)}</span>`}</td></tr>`).join(""):`<tr><td colspan="7" class="muted">–</td></tr>`);
  renderReadiness();
}

/* ---------------- CoA reading ---------------- */
let pdfjsLib=null;
async function getPdfjs(){if(pdfjsLib)return pdfjsLib;const m=await import(PDFJS+"pdf.min.mjs");m.GlobalWorkerOptions.workerSrc=PDFJS+"pdf.worker.min.mjs";return pdfjsLib=m}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Could not load "+src));document.head.appendChild(s)})}
async function ocr(img,scale=1){if(!window.Tesseract)await loadScript(TESS);const {data}=await Tesseract.recognize(img,"eng");
  return (data.words||[]).map(w=>({t:w.text,x:w.bbox.x0/scale,y:w.bbox.y1/scale,w:(w.bbox.x1-w.bbox.x0)/scale}))}
async function pagesFromPdf(bytes){
  const lib=await getPdfjs(),doc=await lib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise,out=[];
  for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),vp=pg.getViewport({scale:1}),tc=await pg.getTextContent();
    let items=tc.items.filter(it=>it.str&&it.str.trim()).map(it=>({t:it.str.trim(),x:it.transform[4],y:vp.height-it.transform[5],w:it.width})),tol=3;
    if(items.map(i=>i.t).join("").length<30){busy(true,`Reading scanned page ${i} of ${doc.numPages} (OCR)…`);
      const v2=pg.getViewport({scale:2.5}),cv=document.createElement("canvas");cv.width=v2.width;cv.height=v2.height;
      await pg.render({canvasContext:cv.getContext("2d"),viewport:v2}).promise;items=await ocr(cv,2.5);tol=6}
    out.push({items,mode:"nearest",tol})}
  return out}
async function pagesFromSheet(bytes){if(!window.XLSX)throw new Error("Excel reader not loaded");
  const wb=XLSX.read(bytes,{type:"array"});return wb.SheetNames.map(n=>{const rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:"",raw:false});
    const items=[];rows.forEach((r,ri)=>r.forEach((c,ci)=>{const t=String(c).trim();if(t)items.push({t,x:ci*100,y:ri*20,w:50})}));return{items,mode:"down",tol:1}})}
async function pagesFromImage(file){busy(true,"Reading photo (OCR)… this can take a minute");return[{items:await ocr(file),mode:"nearest",tol:8}]}
const RX_ID=/^[A-Z]{1,5}[ \-\/]?\d{1,6}[A-Z]?$/i, RX_VAL=/^(<\s*)?\d+(?:[.,]\d+)?$|^(ND|N\.D\.?|BDL|not detected)$/i, RX_PT=/^(P\s?\d+[A-Z]?|S\s?\d+|Blank|Field\s*blank|Media\s*blank)$/i;
const RX_SKIPHDR=/result|[µμu]g|mg\s*\/|sample|points?$|^id$|per\s|unit/i;
function parsePage({items,mode,tol}){
  const sorted=items.slice().sort((a,b)=>a.y-b.y||a.x-b.x),lines=[];
  sorted.forEach(it=>{const L=lines.find(l=>Math.abs(l.y-it.y)<=tol);if(L)L.items.push(it);else lines.push({y:it.y,items:[it]})});
  const cells=[];lines.forEach(L=>{L.items.sort((a,b)=>a.x-b.x);let cur=null;
    L.items.forEach(it=>{if(cur&&it.x-(cur.x+cur.w)<4){cur.t+=(it.x-(cur.x+cur.w)>0.8?" ":"")+it.t;cur.w=it.x+it.w-cur.x}else{cur={...it,y:L.y};cells.push(cur)}})});
  const text=lines.map(L=>L.items.map(i=>i.t).join(" ")).join("\n"),sameLine=(a,b)=>Math.abs(a.y-b.y)<=tol;
  const cand=cells.filter(c=>RX_ID.test(c.t)&&!/^(NIOSH|OSHA|MDHS|SAMM|ISO|EPA|PAGE)/i.test(c.t)&&cells.some(v=>sameLine(v,c)&&v.x>c.x+c.w&&RX_VAL.test(v.t)));
  if(!cand.length)return{rows:[],text};
  const buckets={};cand.forEach(c=>{const k=Math.round(c.x/12);(buckets[k]=buckets[k]||[]).push(c)});
  let best=[];Object.keys(buckets).forEach(k=>{const grp=[...(buckets[k-1]||[]),...buckets[k],...(buckets[+k+1]||[])];if(grp.length>best.length)best=grp});
  const idX=best.reduce((a,c)=>a+c.x,0)/best.length,ids=cand.filter(c=>Math.abs(c.x-idX)<20).sort((a,b)=>a.y-b.y);
  const vals=[];ids.forEach(id=>cells.filter(v=>sameLine(v,id)&&v.x>id.x+id.w&&RX_VAL.test(v.t)).forEach(v=>vals.push({id,v,cx:v.x+v.w/2})));
  const colsX=[];vals.slice().sort((a,b)=>a.cx-b.cx).forEach(o=>{const c=colsX.find(c=>Math.abs(c.cx-o.cx)<35);if(c){c.n++;c.cx+=(o.cx-c.cx)/c.n}else colsX.push({cx:o.cx,n:1})});
  const top=ids[0].y;
  colsX.forEach(col=>{const above=cells.filter(c=>c.y<top-0.5&&c.y>top-160&&Math.abs(c.x+c.w/2-col.cx)<90&&!RX_VAL.test(c.t)&&!RX_ID.test(c.t)&&!RX_SKIPHDR.test(c.t)&&c.t.length>2).sort((a,b)=>b.y-a.y);
    col.param=above.length?above[0].t.replace(/^\*+\s*/,"").trim():""});
  const mg=/\bmg\s*\/\s*sample/i.test(text)&&!/[µμ]g|ug\s*\//i.test(text);
  const methodCell=cells.find(c=>/^(NIOSH|OSHA|MDHS|ISO|EPA)\s*\d/i.test(c.t)),method=methodCell?methodCell.t:"";
  const ptCells=cells.filter(c=>c.x<idX-8&&RX_PT.test(c.t)).sort((a,b)=>a.y-b.y);
  const ptFor=id=>{if(!ptCells.length)return"";if(mode==="down"){let p="";ptCells.forEach(c=>{if(c.y<=id.y+0.5)p=c.t});return p}
    return ptCells.reduce((b,c)=>Math.abs(c.y-id.y)<Math.abs(b.y-id.y)?c:b).t};
  const rows=vals.map(o=>{const col=colsX.find(c=>Math.abs(c.cx-o.cx)<35);let m=o.v.t.replace(",",".").replace(/^<\s*/,"<");
    if(mg&&!/^(nd|n\.d|bdl|not)/i.test(m)){const lt=m.startsWith("<"),n=parseFloat(m.replace("<",""))*1000;m=(lt?"<":"")+String(+n.toFixed(3))}
    const pt=ptFor(o.id).replace(/\s+/g,"");return{point:/blank/i.test(pt)?"Blank":pt.toUpperCase(),sample:o.id.t.replace(/\s+/g," ").toUpperCase(),param:col?col.param:"",mass:/^(nd|n\.d|bdl|not)/i.test(m)?"ND":m,method}});
  return{rows,text}}
function headerInfo(text){const g=re=>{const m=text.match(re);return m?m[1].trim():""};
  return{reportNo:g(/Registration\s*No\.?\s*:?\s*([A-Z0-9][A-Z0-9\-\/]+)/i),dates:g(/Sampling\s*Date\s*:?\s*([^\n]+)/i).replace(/\s{2,}.*$/,"").replace(/(\d)\s+(st|nd|rd|th)\b/g,"$1$2")}}
async function readCoa(file){
  const bytes=await file.arrayBuffer(),ext=(file.name.split(".").pop()||"").toLowerCase();let pages;
  if(ext==="pdf"||file.type==="application/pdf")pages=await pagesFromPdf(bytes);
  else if(["xlsx","xls","csv"].includes(ext))pages=await pagesFromSheet(bytes);
  else if(file.type.startsWith("image/"))pages=await pagesFromImage(file);
  else throw new Error("Unsupported file type");
  let rows=[],text="";pages.forEach(p=>{const r=parsePage(p);rows=rows.concat(r.rows);text+=r.text+"\n"});
  return{rows,info:headerInfo(text),bytes}}
const normP=s=>String(s||"").toLowerCase().replace(/^\*+/,"").replace(/\((respirable|inhalable|total)\)/g," $1 ").replace(/particulate|fraction|[()*,]/g," ").replace(/\s+/g," ").trim();
function mapParam(name,method){if(!name)return"";const n=normP(name);
  let p=st.params.find(p=>normP(p.name)===n)||st.params.find(p=>{const a=normP(p.name);return a.includes(n)||n.includes(a)})||st.params.find(p=>{const a=normP(p.name).split(" ");return n.split(" ").every(w=>a.includes(w))});
  if(!p&&method){const code=(method.match(/\b(NIOSH|OSHA|MDHS)\s*\d+/i)||[""])[0].toLowerCase();if(code)p=st.params.find(p=>(p.method||"").toLowerCase().includes(code))}
  return p?p.name:null}
$("#coaIn").onchange=e=>{const fl=e.target.files[0];e.target.value="";if(fl)handleCoa(fl)};
const drop=$("#drop");drop.ondragover=e=>{e.preventDefault();drop.classList.add("over")};drop.ondragleave=()=>drop.classList.remove("over");
drop.ondrop=e=>{e.preventDefault();drop.classList.remove("over");const fl=e.dataTransfer.files[0];if(fl)handleCoa(fl)};
let pending=null;
async function handleCoa(fl){busy(true,"Reading CoA…");
  try{const r=await readCoa(fl);busy(false);pending={...r,file:fl};showReview()}catch(err){busy(false);console.error(err);toast("Couldn't read this file: "+err.message,5000)}}
function showReview(){
  const P=pending,R=P.rows,box=$("#review");box.style.display="block";
  if(!R.length){box.innerHTML=`<div class="note">No sample results were found in <b>${esc(P.file.name)}</b>. If it's a scan, try a clearer photo or the lab's original PDF. You can still attach it as Appendix G and type the masses in yourself.</div>
    <div class="row"><button class="pri" id="rvAttach">Attach as Appendix G only</button><button id="rvCancel">Cancel</button></div>`;
    $("#rvAttach").onclick=async()=>{await attachCoa();box.style.display="none"};$("#rvCancel").onclick=()=>box.style.display="none";return}
  R.forEach(r=>{r.include=r.point!=="Blank";r.mapped=mapParam(r.param,r.method);if(!r.mapped){const d=dbFind(r.param);r.db=d?d.i:null}});
  const fresh=[...new Set(R.filter(r=>!r.mapped&&r.param).map(r=>r.param))];
  const freshTxt=fresh.map(n=>{const d=DB.find(e=>e.i===(R.find(r=>r.param===n)||{}).db);return d?`<b>${esc(n)}</b> → found in Schedule I (${esc(d.n)}: ${[nnum(d.ppm)!=null?d.ppm+" ppm":"",nnum(d.mg)!=null?d.mg+" mg/m³":""].filter(Boolean).join(" / ")})`:`<b>${esc(n)}</b> → not in Schedule I, so enter the PEL yourself`}).join("<br>");
  box.innerHTML=`<div class="ok">Found <b>${R.length}</b> results in <b>${esc(P.file.name)}</b> (${[...new Set(R.map(r=>r.param))].filter(Boolean).length} parameters). Blanks are unticked. Check the values, then add them.</div>
   ${fresh.length?`<div class="note">New parameter${fresh.length>1?"s":""} will be added:<br>${freshTxt}</div>`:""}
   ${(P.info.reportNo||P.info.dates)?`<label class="toggle"><input type="checkbox" id="rvInfo" checked><span>Also fill Report info from the CoA where empty: ${P.info.reportNo?`Report No. <b>${esc(P.info.reportNo)}</b>`:""} ${P.info.dates?` · Monitoring date <b>${esc(P.info.dates)}</b>`:""}</span></label>`:""}
   <div class="ts" style="max-height:420px;margin-top:8px"><table><tr><th>Add</th><th>Point</th><th>Lab parameter</th><th>→ Your parameter</th><th>Sample ID</th><th>Result (µg/sample)</th><th>Method</th></tr>
   ${R.map((r,i)=>`<tr class="${r.point==="Blank"?"blank":""}"><td><input type="checkbox" data-rv="${i}" data-k="include" ${r.include?"checked":""}></td>
    <td><input data-rv="${i}" data-k="point" value="${esc(r.point)}" style="width:70px"></td><td>${esc(r.param)||"–"}</td>
    <td>${r.mapped?esc(r.mapped):`<span class="pill p-warn">new: ${esc(r.param)||"?"}</span>`}</td>
    <td><input data-rv="${i}" data-k="sample" value="${esc(r.sample)}" style="width:100px"></td><td><input data-rv="${i}" data-k="mass" value="${esc(r.mass)}" style="width:90px"></td><td class="muted" style="font-size:12px">${esc(r.method)}</td></tr>`).join("")}</table></div>
   <div class="row" style="margin-top:10px"><button class="pri" id="rvApply">Add to sample data</button><button id="rvCancel">Cancel</button></div>`;
  $$("[data-rv]").forEach(el=>el.onchange=()=>{const r=R[+el.dataset.rv];r[el.dataset.k]=el.type==="checkbox"?el.checked:el.value});
  $("#rvCancel").onclick=()=>{box.style.display="none";pending=null};$("#rvApply").onclick=applyCoa;
}
async function applyCoa(){
  const P=pending,R=P.rows.filter(r=>r.include);let upd=0,add=0;
  if($("#rvInfo")?.checked){if(!st.info.reportNo&&P.info.reportNo)st.info.reportNo=P.info.reportNo;if(!st.info.dates&&P.info.dates)st.info.dates=P.info.dates}
  const key=s=>String(s||"").replace(/\s+/g,"").toUpperCase();
  R.forEach(r=>{let pn=r.mapped;
    if(!pn){const label=(r.param||"Unknown parameter").replace(/^\*+/,"").trim();pn=label;
      if(!st.params.some(p=>p.name===pn)){const d=r.db!=null?DB.find(e=>e.i===r.db):null;const np=d?fromDb(d,label):{name:label,method:"",media:"",pel:"",src:""};
        if(r.method)np.method=r.method;st.params.push(np)}}
    const lp=param(pn);if(lp&&r.method&&(!lp.method||/^NIOSH \d{4}( \/ \d{4})?$/.test(lp.method)))lp.method=r.method;
    let row=st.rows.find(x=>key(x.sample)===key(r.sample)&&x.param===pn)||st.rows.find(x=>key(x.sample)===key(r.sample)&&!x.param);
    if(row){row.mass=r.mass;row.param=pn;if(!row.point)row.point=r.point;upd++}
    else{const prev=[...st.rows].reverse().find(x=>x.param===pn)||{};
      st.rows.push({point:r.point,param:pn,sample:r.sample,period:"",fc:prev.fc||"",t:"",Tc:prev.Tc??25,Pc:prev.Pc??760,T:prev.T??25,P:prev.P??760,mass:r.mass});add++}});
  const order=st.params.map(p=>p.name);st.rows.sort((a,b)=>((order.indexOf(a.param)+1||99)-(order.indexOf(b.param)+1||99))||ptSort(a.point,b.point));
  await attachCoa();$("#review").style.display="none";pending=null;save();renderInfo();renderAll();
  toast(`${add} samples added, ${upd} updated. Now enter the field data (period, fc, t, temperatures).`,5000)}
async function attachCoa(){const P=pending;if(!P)return;const id=uid();
  await idb.put("file:"+id,{name:P.file.name,type:P.file.type||"application/pdf",data:P.bytes});
  (st.att.G=st.att.G||[]).push({id,name:P.file.name,type:P.file.type||"application/pdf"});save();renderAtt()}

/* ---------------- appendices ---------------- */
const title=t=>t.toLowerCase().replace(/(^|\s)\w/g,c=>c.toUpperCase());
function renderAtt(){
  $("#att").innerHTML=APPX.map(([L,T])=>{const fs=st.att[L]||[];
    if(L==="F")return `<div class="card"><b>Appendix ${L}: ${title(T)}</b><div class="muted" style="font-size:12.5px;margin-top:6px">Generated automatically from the calculation sheet.</div></div>`;
    return `<div class="card"><div class="row" style="justify-content:space-between"><b>Appendix ${L}: ${title(T)}</b>
    <label class="filebtn noP">+ Add file<input type="file" data-up="${L}" accept=".pdf,image/png,image/jpeg,image/webp" multiple></label></div>
    ${fs.length?`<ul>${fs.map(x=>`<li>${esc(x.name)} <button class="sm noP" data-rm="${L}:${x.id}">remove</button></li>`).join("")}</ul>`:`<div class="muted" style="font-size:12.5px;margin-top:6px">${L==="G"?"Your uploaded CoA is attached here automatically.":"No file yet"}</div>`}</div>`}).join("");
  $$("[data-up]").forEach(inp=>inp.onchange=async()=>{const L=inp.dataset.up;for(const fl of inp.files){const id=uid();await idb.put("file:"+id,{name:fl.name,type:fl.type,data:await fl.arrayBuffer()});(st.att[L]=st.att[L]||[]).push({id,name:fl.name,type:fl.type})}save();renderAtt();toast("Attached to Appendix "+L)});
  $$("[data-rm]").forEach(b=>b.onclick=async()=>{const [L,id]=b.dataset.rm.split(":");st.att[L]=(st.att[L]||[]).filter(x=>x.id!==id);await idb.del("file:"+id);save();renderAtt()});
  renderReadiness();
}
function renderReadiness(){const el=$("#readiness");if(!el)return;const G=groups().filter(g=>g.point!=="Blank"),miss=[];
  if(!st.info.client)miss.push("client name");
  if(!G.length)miss.push("sample data");else if(G.some(g=>!g.complete))miss.push("field data for "+G.filter(g=>!g.complete).length+" point/parameter group(s)");
  const noPel=[...new Set(G.filter(g=>g.pel==null).map(g=>g.param))];if(noPel.length)miss.push("PEL for "+noPel.join(", "));
  if(!st.ctl.eng.length&&!st.ctl.adm.length&&!st.ctl.rpe)miss.push("existing control measures (section 3)");
  const noAtt=APPX.filter(([L])=>L!=="F"&&!(st.att[L]||[]).length).map(([L])=>L);
  el.innerHTML=(miss.length?`<div class="note">Still missing: ${miss.map(esc).join(" · ")}. You can still download a draft.</div>`:`<div class="ok">Report data is complete.</div>`)+
   (noAtt.length?`<div class="muted" style="font-size:12.5px">No file yet for Appendix ${noAtt.join(", ")}. Those appendices will show “No document attached”.</div>`:"")}
