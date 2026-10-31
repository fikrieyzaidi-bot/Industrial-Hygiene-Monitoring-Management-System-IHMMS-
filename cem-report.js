/* CEM Calculator — expert report text, report model, PDF + Word output */
const list=a=>a.length<=1?(a[0]||""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
const pctTxt=p=>p==null?"–":p<0.1?"<0.1%":(p<1?p.toFixed(1):Math.round(p))+"%";
const noDot=s=>String(s||"").replace(/\.+$/,"");
const pctG=g=>g.pct==null?"–":(g.lt?"<":"")+pctTxt(g.pct);
const lc=s=>String(s||"").replace(/^[A-Z](?=[a-z])/,c=>c.toLowerCase());
function hazType(name){const s=(name+" "+((DB[param(name).db]||{}).en||"")).toLowerCase();
  if(/silica|quartz|cristobalite|tridymite/.test(s))return"silica";
  if(/isocyanate|\bmdi\b|\btdi\b|\bhdi\b/.test(s))return"isocyanate";
  if(/fume|welding|lead|cadmium|chromium|manganese|nickel|copper|zinc|iron|alumin|cobalt|arsenic|mercury|\btin\b|antimony|beryllium|metal/.test(s))return"fume";
  if(/dust|particulate|pnoc|cement|talc|kaolin|wood|grain|carbonate|gypsum|titanium|graphite|coal|fibre|asbestos/.test(s))return"dust";
  if(/ammonia|hydrogen sulfide|sulfur dioxide|nitrogen dioxide|nitric oxide|carbon monoxide|carbon dioxide|chlorine|ozone|phosgene|cyanide|hydrogen chloride|hydrogen fluoride/.test(s))return"gas";
  if(/acid|hydroxide/.test(s))return"acid";
  return"solvent"}
const CAT={over:"exceeded the PEL",half:"exceeded half (50%) of the PEL",ten:"exceeded 10% of the PEL",low:"below 10% of the PEL"};
function analyse(){
  const I=st.info,C=st.ctl,G=groups().filter(g=>g.point!=="Blank"),client=I.client||"the client";
  G.forEach(g=>{g.cat=g.pct==null?null:g.lt?"nd":g.pct>=100?"over":g.pct>=50?"half":g.pct>=10?"ten":"low";g.ratio=g.pct==null?null:g.pct/100;g.task=(st.points[g.point]||{}).task||""});
  const params=[...new Set(G.map(g=>g.param))],pts=[...new Set(G.map(g=>g.point))],n=pts.length;
  const P=params.map(p=>{const gs=G.filter(g=>g.param===p),done=gs.filter(g=>g.twa!=null),pp=param(p);
    const worst=done.reduce((a,b)=>!a||b.twa>a.twa?b:a,null),best=done.reduce((a,b)=>!a||b.twa<b.twa?b:a,null);
    const lo=done.reduce((a,b)=>!a||b.twa<a.twa?b:a,null);
    const cats=done.map(g=>g.cat),top=["over","half","ten","low","nd"].find(c=>cats.includes(c))||null;
    return{p,gs,done,pel:num(pp.pel),worst,lo,top,haz:hazType(p),skin:!!pp.skin,s2:!!pp.s2,maxRatio:worst&&worst.ratio}});
  const rpe=RPE[C.rpe||""]||RPE[""],apf=rpe[1],need=Math.max(0,...P.map(x=>x.maxRatio||0));
  const worstCat=["over","half","ten","low","nd"].find(c=>P.some(x=>x.top===c))||null;
  const ndHigh=G.filter(g=>g.cat==="nd"&&g.pct>=10);
  const wl=g=>`Worker ${g.point} (${g.worker}${g.task?", "+g.task:""}) for ${g.param} (${twaTxt(g)} mg/m³, ${pctG(g)} of PEL)`;
  return{ndHigh,I,C,G,P,client,params,n,wN:n+" worker"+(n===1?"":"s"),area:(I.area||"workplace").toLowerCase(),rpe,apf,need,worstCat,wl,
    over:G.filter(g=>g.cat==="over"),half:G.filter(g=>g.cat==="half"),ten:G.filter(g=>g.cat==="ten"),low:G.filter(g=>g.cat==="low"),
    pelList:params.map(p=>`${p} (${param(p).pel??"–"} mg/m³)`),eng:[...C.eng,...(C.engOther?[C.engOther]:[])],adm:[...C.adm,...(C.admOther?[C.admOther]:[])]}}
function freqLine(a){if(a.over.length)return"Repeat personal exposure monitoring within six (6) months, after the improved controls are in place, to confirm that exposure has been reduced below the PEL.";
  if(a.half.length)return"Repeat personal exposure monitoring at intervals not exceeding twelve (12) months, since results were above half of the PEL.";
  if(a.ten.length||a.ndHigh.length)return"Collect a further six (6) personal exposure samples for the parameters above 10% of the PEL to complete the compliance assessment, in line with the Guidelines on Monitoring of Airborne Chemical Hazardous to Health 2022.";
  return"Further monitoring should follow the CHRA assessor's recommendation; continue to review exposure whenever the process, materials or controls change."}
function engAdvice(h){return{
  silica:"Control respirable crystalline silica at source: keep water sprays/misting working at crushers, screens and conveyor transfer points, enclose transfer points and fit local exhaust ventilation (LEV) with a dust collector, and provide operator cabins with filtered air where practicable. Prohibit dry sweeping and the use of compressed air for cleaning; use wet methods or an H-class (HEPA) vacuum.",
  dust:"Reduce dust generation at source with water sprays or misting at crushing, screening and transfer points, enclose dusty transfer points, and connect them to LEV with a dust collector. Use wet cleaning or vacuum instead of dry sweeping.",
  fume:"Provide on-tool or local fume extraction (LEV) positioned as close as possible to the fume source, and maintain good general ventilation in the work area.",
  solvent:"Provide LEV at mixing, spraying, dispensing and cleaning points (for example a spray booth or slot hood), keep solvent containers closed when not in use, reduce the quantity held at the workstation, and evaluate substitution with lower-volatility or less hazardous products.",
  gas:"Improve containment at the source and ventilation in the work area, and install fixed gas detection with alarms where the gas can accumulate.",
  isocyanate:"Carry out isocyanate spraying only inside an enclosed, ventilated spray booth with LEV, and restrict access to the area during and after spraying.",
  acid:"Provide LEV or fume extraction over tanks and baths, keep tanks covered when not in use, and maintain good general ventilation."}[h]}
function rpeAdvice(h){return{silica:"a half-face respirator with P3 particulate filters (or at least a P2 / N95 respirator where exposure is well below the PEL)",dust:"a P2 (N95) particulate respirator",fume:"a P2/P3 particulate respirator suited to metal fume",
  solvent:"a half-face respirator with organic vapour (type A) cartridges and a documented cartridge change-out schedule",gas:"a respirator with a cartridge rated for the specific gas, or supplied air where concentrations may be high",
  isocyanate:"supplied-air respiratory protection during spraying",acid:"a respirator with an acid-gas (type E) or combination cartridge"}[h]}

const TEXTS=[
 ["exec","1.0 Executive summary",a=>{
   const ranges=a.P.filter(x=>x.done.length).map(x=>x.done.length>1?`${x.p} ranged from ${twaTxt(x.lo)} to ${twaTxt(x.worst)} mg/m³ (${pctG(x.lo)}–${pctG(x.worst)} of the PEL of ${x.pel} mg/m³)`:`${x.p} was ${twaTxt(x.worst)} mg/m³ (${pctG(x.worst)} of the PEL of ${x.pel} mg/m³)`);
   let p4;
   if(a.over.length)p4=`The exposure of ${list(a.over.map(a.wl))} exceeded the Permissible Exposure Limit (PEL). The existing control measures are therefore not adequate for this exposure, and the employer must take immediate action to reduce exposure, review the controls and repeat the monitoring.`;
   else if(a.half.length)p4=`All results were below the PEL. However, ${list(a.half.map(a.wl))} exceeded half (50%) of the PEL, which indicates that the existing controls need to be improved and monitored more closely.`;
   else if(a.ten.length||a.ndHigh.length)p4=a.ten.length?`All results were below the PEL; however, ${list(a.ten.map(a.wl))} exceeded 10% of the PEL. In accordance with the Guidelines on Monitoring of Airborne Chemical Hazardous to Health 2022, a further six (6) personal exposure samples should be collected for these parameters to complete the compliance assessment and give a more representative picture of the workers’ exposure.`:`All results were below the PEL. Some results were below the laboratory detection limit, but the detection limit was above 10% of the PEL, so a larger air volume is recommended at the next monitoring to confirm low exposure.`;
   else p4=`All results were below 10% of the applicable PEL, indicating that exposure is well controlled under the conditions observed during monitoring.`;
   const s2=a.P.filter(x=>x.s2).map(x=>x.p);
   const keys=[a.over.length||a.half.length?"improve engineering controls at the source":"maintain the existing controls",
     a.need>=1||((a.over.length||a.half.length)&&(a.C.rpeUse!=="consistent"||a.C.fit!=="yes"))?"ensure suitable respiratory protection is worn consistently, with fit testing":"continue proper use of PPE",
     s2.length?`arrange medical surveillance for workers exposed to ${list(s2)}`:"",freqLine(a).split(",")[0].toLowerCase()].filter(Boolean);
   return `Chemical Exposure Monitoring (CEM) was conducted at ${a.client} by a registered Industrial Hygiene Technician (IHT-1) as recommended in the Chemical Health Risk Assessment (CHRA)${a.I.chraNo?` (Report No.: ${a.I.chraNo})`:""} and in accordance with the Occupational Safety and Health (Use and Standards of Exposure of Chemical Hazardous to Health) Regulations 2000 (USECHH 2000).\n`+
   `The monitoring assessed the personal exposure of ${a.wN} to ${list(a.params)}${a.C.activities?` during ${lc(a.C.activities.replace(/\.$/,""))}`:` during normal working activities at the ${a.area}`}. Personal air sampling was carried out in the workers’ breathing zone over a full 8-hour (480-minute) work shift, and results were compared against the 8-hour Time-Weighted Average (TWA) PEL in Schedule I of USECHH 2000.\n`+
   (ranges.length?`The 8-hour TWA exposure for ${ranges.join("; ")}.\n`:"")+p4+`\n`+
   `The key recommendations are to ${list(keys)}. Details are given in Sections 6.0 and 7.0.`}],
 ["intro","2.0 Introduction",a=>`${a.I.consName||"The consultant"} has been appointed to conduct a chemical exposure monitoring program at ${a.client}, which is located at ${a.I.locAddr||"the client's premises"}. This report presents the details of personnel exposure monitoring in order to comply with the USECHH Regulations 2000.`],
 ["seg","4.3 Selection of worker from Similar Exposure Group (SEG)",a=>`Workers selected were those nearest to the source, with the highest duration and frequency of exposure, whose work practice exposed them directly to the chemicals, taking available control measures into account.${a.G.some(g=>g.task)?" The workers monitored were: "+list([...new Set(a.G.map(g=>`${g.worker} (${g.point})${g.task?" – "+g.task:""}`))])+".":""}`],
 ["just","4.4 Justification on monitoring duration and number of samples",a=>`Results are compared with the 8-hour Time Weighted Average limit (PEL-TWA) stated in Schedule I of USECHH 2000: ${list(a.pelList)}. Monitoring used a full-period consecutive samples strategy over the entire 8-hour shift, with the personal sampling pump positioned in the worker’s breathing zone.`],
 ["d1","6.1 Chemical Exposure Monitoring Results",a=>{
   const out=[`CEM was conducted to assess the personal exposure of ${a.wN} to ${list(a.params)} during normal work activities at ${a.client}. The results are discussed by parameter below, using the following action levels: above the PEL (immediate action), above 50% of the PEL (controls to be improved and monitoring at least every 12 months), above 10% of the PEL (additional sampling under the 2022 Guidelines) and below 10% of the PEL (exposure well controlled).`];
   a.P.forEach(x=>{if(!x.done.length){out.push(`${x.p}: results are incomplete because field data is missing, so no conclusion can be drawn yet.`);return}
     const lt=x.done.filter(g=>g.lt);
     let s=`${x.p} (PEL ${x.pel} mg/m³${param(x.p).ppm?`, ${param(x.p).ppm} ppm`:""}): `+(x.done.length>1?`exposure ranged from ${twaTxt(x.lo)} to ${twaTxt(x.worst)} mg/m³ (${pctG(x.lo)}–${pctG(x.worst)} of the PEL), with the highest exposure recorded for ${x.worst.worker} (${x.worst.point})${x.worst.task?", "+x.worst.task:""}.`:`exposure was ${twaTxt(x.worst)} mg/m³ (${pctG(x.worst)} of the PEL).`);
     const byCat=c=>x.done.filter(g=>g.cat===c).map(g=>`${g.point}`);
     if(x.top==="over")s+=` The result for ${list(byCat("over"))} exceeded the PEL, so the existing controls do not adequately protect the worker${byCat("over").length>1?"s":""} and immediate action is required.`;
     else if(x.top==="half")s+=` Results for ${list(byCat("half"))} were above half of the PEL, which shows that exposure is significant and existing controls should be strengthened.`;
     else if(x.top==="ten")s+=` Results for ${list(byCat("ten"))} were above 10% of the PEL; a further six (6) samples are recommended to confirm compliance.`;
     else if(x.top==="low")s+=` All quantified results were below 10% of the PEL.`;
     if(lt.length){const ndG=x.done.filter(g=>g.cat==="nd");s+=` ${ndG.length?`For ${list(ndG.map(g=>g.point))} the laboratory result${ndG.length>1?"s were":" was"} below the detection limit (“<”), so the reported TWA is an upper bound and the actual exposure is lower.`:"Some individual samples were below the detection limit; the detection limit was used in the calculation, so these TWAs are conservative."}`;
       const hi=ndG.filter(g=>g.pct>=10);if(hi.length)s+=` Because this upper bound (${pctTxt(hi[0].pct)} of the PEL) is above 10% of the PEL, the result cannot confirm that exposure is below 10% of the PEL. Longer sampling times or a higher flow rate (larger air volume) are recommended next time to lower the detection limit.`}
     if(x.skin)s+=` ${x.p} carries a skin notation in Schedule I, so skin absorption may add to the total dose and skin protection is important.`;
     if(x.s2)s+=` ${x.p} is listed in Schedule II of USECHH 2000 (chemicals for which medical surveillance is appropriate).`;
     out.push(s)});
   return out.join("\n")}],
 ["d2","6.2 Factors Contributing Towards the Results and Adequacy of Existing Control Measures",a=>{
   const C=a.C,out=[];
   out.push(`The results were influenced by the nature of the work activities${C.activities?` (${lc(C.activities.replace(/\.$/,""))})`:""}, the duration and frequency of exposure, work practices and the working environment.${C.obs?" Site observations during monitoring: "+lc(noDot(C.obs))+".":""}`);
   out.push(a.eng.length?`Engineering controls in place: ${list(a.eng.map(lc))}.`:`No engineering controls were recorded at the monitored work areas.`);
   if(a.adm.length)out.push(`Administrative controls in place: ${list(a.adm.map(lc))}.`);
   if(C.rpe){let r=`Respiratory protection: ${lc(a.rpe[0])}`+(a.apf>1?` (assigned protection factor ${a.apf})`:"")+`${C.rpeUse==="consistent"?", worn consistently":C.rpeUse==="partial"?", but not worn consistently":C.rpeUse==="no"?", but not worn during the work":""}${C.fit==="yes"?", with fit testing done":C.fit==="no"?", without fit testing":""}.`;
     if(a.need>=1){r+=a.apf&&a.apf>a.need&&C.rpeUse==="consistent"&&C.fit==="yes"?` Since the highest exposure was ${a.need.toFixed(1)} times the PEL, this RPE gives adequate protection, provided it is used properly, but it must be treated as a temporary measure until engineering controls are improved.`
       :` The highest exposure was ${a.need.toFixed(1)} times the PEL. The current RPE ${a.apf&&a.apf>a.need?"could give enough protection on paper, but its effectiveness cannot be relied on":"does not give enough protection"} ${C.rpeUse!=="consistent"?"because it is not worn consistently":C.fit!=="yes"?"because no fit test has been done":"for this exposure level"}.`}
     else if((a.half.length||a.ndHigh.length||a.ten.length)&&(C.rpeUse!=="consistent"||C.fit!=="yes"))r+=` Although exposure was below the PEL, ${a.half.length?"it exceeded half of the PEL, so ":""}RPE should be worn consistently and fit tested as an additional safeguard while engineering controls are improved.`;
     out.push(r)}
   else out.push("The type of respiratory protection used was not recorded.");
   if(C.ppe.length)out.push(`Other PPE in use: ${list(C.ppe.map(lc))}.`);
   const gaps=[];a.P.forEach(x=>{if(x.top&&x.top!=="low"){if((x.haz==="dust"||x.haz==="silica")&&!a.eng.some(e=>/wet|water|spray|lev|exhaust|collector|enclos/i.test(e)))gaps.push(`no dust suppression or extraction was recorded for ${x.p}`);
     if((x.haz==="solvent"||x.haz==="fume"||x.haz==="isocyanate")&&!a.eng.some(e=>/lev|exhaust|extraction|booth|enclos/i.test(e)))gaps.push(`no local exhaust ventilation was recorded for ${x.p}`);
     if(x.skin&&!a.C.ppe.some(p=>/glove/i.test(p)))gaps.push(`no chemical-resistant gloves were recorded although ${x.p} has a skin notation`)}});
   let verdict;
   if(a.worstCat==="over")verdict="Overall, the existing control measures are not adequate: at least one worker was exposed above the PEL.";
   else if(a.worstCat==="half")verdict="Overall, the existing control measures keep exposure below the PEL but are only partially adequate, as exposure exceeded half of the PEL.";
   else if(a.worstCat==="ten")verdict="Overall, the existing control measures are generally adequate, as all exposures were below half of the PEL; they should be maintained and verified through the additional sampling.";
   else if(a.worstCat==="low"||a.worstCat==="nd")verdict="Overall, the existing control measures are adequate and effective under the conditions observed, and should be maintained.";
   else verdict="The adequacy of the existing controls will be assessed once all results are complete.";
   out.push(verdict+(gaps.length?` Gaps noted: ${list(gaps)}.`:""));
   return out.join("\n")}],
 ["d3","6.3 Justification on Sampling Strategy",a=>`Personal air sampling was conducted on ${a.wN} considered representative of the work activities with potential exposure. Sampling over a full 8-hour (480-minute) shift allowed assessment against the 8-hour TWA PEL, and personal sampling in the breathing zone represents the actual exposure during normal work.`],
 ["r1","7.1 Action to Be Taken",a=>{
   const B=[],need=a.P.filter(x=>x.top&&x.top!=="low"&&x.top!=="nd"),fam=h=>({silica:"part",dust:"part",fume:"part"}[h]||h),rank={silica:3,fume:2,dust:1};
   const hz=[];(need.length?need:a.P).forEach(x=>{const i=hz.findIndex(h=>fam(h)===fam(x.haz));if(i<0)hz.push(x.haz);else if((rank[x.haz]||0)>(rank[hz[i]]||0))hz[i]=x.haz});
   const hzAll=[];a.P.forEach(x=>{const i=hzAll.findIndex(h=>fam(h)===fam(x.haz));if(i<0)hzAll.push(x.haz);else if((rank[x.haz]||0)>(rank[hzAll[i]]||0))hzAll[i]=x.haz});
   if(a.over.length)B.push(`Immediate action: reduce the exposure of ${list(a.over.map(g=>`${g.worker} (${g.point})`))} below the PEL. Until engineering improvements are complete, enforce suitable respiratory protection in the affected area.`);
   if(need.length)hz.forEach(h=>B.push(`Engineering control: ${engAdvice(h)}`));
   else B.push("Maintain the existing engineering controls in good working condition and keep them in use during all work activities.");
   if(a.eng.some(e=>/lev|exhaust|collector|booth/i.test(e))||need.some(x=>x.haz!=="gas"))B.push("Ensure all local exhaust ventilation is maintained, and examined and tested by a competent person at intervals not exceeding 12 months, with records kept.");
   B.push(`Administrative control: ${[a.over.length||a.half.length?"limit the time each worker spends at the highest-exposure tasks through job rotation":"",
     "keep the safe work procedures up to date and make sure they are followed","maintain good housekeeping by wet cleaning or vacuuming rather than dry sweeping",
     "give workers information, instruction and training on the chemical hazards, the monitoring results and the correct use of controls and PPE (USECHH 2000, Part VII, Regulation 22)"].filter(Boolean).join("; ")}.`);
   (need.length?hz:hzAll.slice(0,1)).forEach(h=>{const ok=a.C.rpe&&a.apf&&a.apf>a.need&&a.C.rpeUse==="consistent"&&a.C.fit==="yes";
     B.push(`Respiratory protection: ${ok?"continue the current RPE programme, ":""}provide ${rpeAdvice(h)} for the affected workers${a.need>=1||a.C.fit!=="yes"?", with fit testing for each wearer":""}, plus training, a cleaning and storage routine, and supervision to ensure it is worn throughout the exposure.`)});
   a.P.filter(x=>x.skin).forEach(x=>B.push(`Skin protection: ${x.p} can be absorbed through the skin. Provide suitable chemical-resistant gloves and protective clothing, and enforce washing before eating, drinking or smoking.`));
   const s2=a.P.filter(x=>x.s2);if(s2.length)B.push(`Health surveillance: ${list(s2.map(x=>x.p))} ${s2.length>1?"are":"is"} listed in Schedule II of USECHH 2000. Arrange medical surveillance by a registered Occupational Health Doctor (OHD) for exposed workers under Regulation 27${s2.some(x=>x.haz==="silica")?", including chest X-ray and lung function (spirometry) for workers exposed to crystalline silica":""}, and keep the records.`);
   B.push(`Further monitoring: ${freqLine(a)}`);
   B.push("Communicate these results to the workers and to the CHRA assessor, so that the CHRA can be reviewed and updated with the findings of this monitoring.");
   return B.map(b=>"• "+b).join("\n")}],
 ["concl","8.0 Conclusion",a=>{
   const s=a.over.length?`The monitoring results showed that ${list(a.over.map(a.wl))} exceeded the PEL stipulated in Schedule I of the USECHH Regulations 2000. The existing control measures are not adequate for these exposures and must be improved without delay, followed by repeat monitoring to confirm that exposure is below the PEL.`
     :a.half.length?`The monitoring results showed that all concentrations were below the PEL stipulated in Schedule I of the USECHH Regulations 2000, but ${list(a.half.map(a.wl))} exceeded half of the PEL. The existing controls should be strengthened and exposure monitored at least every twelve (12) months.`
     :`The monitoring results showed that the concentrations of ${list(a.params.map(p=>p.toLowerCase()))} during monitoring were below the PEL stipulated in Schedule I of the USECHH Regulations 2000, indicating that the existing control measures were generally adequate in controlling workers’ exposure during the monitoring period.`+(a.ten.length?" However, selected results were above 10% of the applicable PEL. Therefore, six (6) additional personal exposure samples are recommended in accordance with the applicable DOSH guidelines to further assess the workers’ exposure profile and confirm compliance.":"");
   return s+`\nRecommendations as described in Section 7.0 were made in order to comply with the USECHH Regulations 2000. The objectives of the exposure monitoring conducted at ${a.client} have been fulfilled.`}]];
const dd=s=>String(s).replace(/(^|[^.])\.\.(?!\.)/g,"$1.");
const textOf=k=>{const t=TEXTS.find(x=>x[0]===k);return st.text[k]!=null?st.text[k]:dd(t[2](analyse()))};
function renderTexts(softly){
  if(softly){TEXTS.forEach(([k])=>{const el=$(`[data-tx="${k}"]`);if(el&&st.text[k]==null&&document.activeElement!==el)el.value=textOf(k)});return}
  $("#texts").innerHTML=TEXTS.map(([k,t])=>`<div class="tx"><div class="row"><label style="margin:0;font-weight:600;color:var(--ink)">${t}</label><button class="sm noP" data-txr="${k}">Rewrite</button></div><textarea data-tx="${k}"></textarea></div>`).join("");
  TEXTS.forEach(([k])=>{const el=$(`[data-tx="${k}"]`);el.value=textOf(k);el.style.height=Math.min(420,Math.max(110,el.value.length/4))+"px";el.oninput=()=>{st.text[k]=el.value;save()}});
  $$("[data-txr]").forEach(b=>b.onclick=()=>{delete st.text[b.dataset.txr];save();$(`[data-tx="${b.dataset.txr}"]`).value=textOf(b.dataset.txr)});
}
$("#bRegen").onclick=()=>{st.text={};save();renderTexts();toast("All sections rewritten from results")};

/* ---------------- report model (shared by PDF and Word) ---------------- */
function model(){
  const I=st.info,client=I.client||"Client",a=analyse(),GR=a.G,params=a.params,B=[];
  const T=(cap,txt,head,rows,w,o={})=>{B.push({t:"cap",b:cap,x:txt});B.push({t:"table",head,rows,w,...o})};
  B.push({t:"cover"});B.push({t:"toc"});
  B.push({t:"h1",x:"1.0 EXECUTIVE SUMMARY",page:1});B.push({t:"p",x:textOf("exec")});
  B.push({t:"h1",x:"2.0 INTRODUCTION",page:1});B.push({t:"p",x:textOf("intro")});
  T("Table 1:","Particulars of facility and working hours",["Item","Details"],[["Name of Facility",I.locName||client],["Work Areas/Unit",I.area||"-"],["Working Hours",I.hours||"-"]],[.28,.72]);
  B.push({t:"p",x:"The monitoring was undertaken by a DOSH registered Hygiene Technician 1 (HT1) (refer to Appendix A)."});
  T("Table 2:","Particulars of registered Hygiene Technician 1",["Name","JKKP Registration No."],[[I.htName||"-",I.htReg||"-"]],[.5,.5]);
  B.push({t:"h1",x:"3.0 OBJECTIVES",page:1});B.push({t:"p",x:"The objectives of this chemical exposure monitoring are:\n(a) To measure concentration of chemicals hazardous to health at the identified work area.\n(b) To measure workers’ exposure levels to these chemicals at the identified work area.\n(c) To compare results of monitoring with the Permissible Exposure Limit stipulated under Schedule I of the USECHH Regulations 2000.\n(d) To recommend action to be taken based on the results of this monitoring in order to comply with the USECHH Regulations 2000.",tight:1});
  B.push({t:"h1",x:"4.0 METHODOLOGY",page:1});B.push({t:"h2",x:"4.1 Method Used"});
  T("Table 3:","List of chemical, method, sampling media and analytical technique",["Chemical","Method","Sampling Media"],params.map(p=>[p,param(p).method||"-",param(p).media||"-"]),[.24,.33,.43]);
  B.push({t:"h2",x:"4.2 Equipment Used"});T("Table 4:","List and details of equipment and sampling media",["Equipment / media"],(I.equipment||"-").split("\n").filter(l=>l.trim()).map(l=>[l]),[1]);
  B.push({t:"h2",x:"4.3 Selection of worker from Similar Exposure Group (SEG)"});B.push({t:"p",x:textOf("seg")});
  B.push({t:"h2",x:"4.4 Justification on monitoring duration and number of samples"});B.push({t:"p",x:textOf("just")});
  B.push({t:"h1",x:"5.0 RESULTS & FINDINGS",page:1});B.push({t:"h2",x:"5.1 Monitoring Area Information"});
  const nPts=new Set(GR.map(g=>g.point)).size;
  T("Table 5:","List of work area and number of workers monitored",["Area","Chemical","Work specification","Exposed / monitored"],[[I.area||"-",params.join(", "),I.workSpec||"",`${I.exposed||nPts} / ${nPts}`]],[.14,.5,.18,.18]);
  B.push({t:"h2",x:"5.2 Monitoring Result"});
  T("Table 6:",`Summary of result analysis — ${I.area||"Workplace"}`,["Name (Sample No)","Parameter","Sampling Duration","Exposure Level (mg/m³)","PEL 8-hr TWA (mg/m³)","% PEL","Remarks"],
    GR.map(g=>[`${g.worker} (${g.point})`,g.param,`${f(g.sumT,0)} min`,twaTxt(g),String(g.pel??"-"),g.pct==null?"-":pctG(g),remark(g)]),[.17,.2,.11,.13,.12,.09,.18],{bold:3});
  B.push({t:"p",x:"Results are expressed as 8-hour time weighted average airborne concentration. “<” = below the minimum detectable limit of the analysis. ND = not detectable. PEL = Permissible Exposure Limit, Schedule I, USECHH Regulations 2000.",s:9.5});
  B.push({t:"h1",x:"6.0 DISCUSSION",page:1});
  [["d1","6.1 Chemical Exposure Monitoring Results"],["d2","6.2 Factors Contributing Towards the Results and Adequacy of Existing Control Measures"],["d3","6.3 Justification on Sampling Strategy"]].forEach(([k,t])=>{B.push({t:"h2",x:t});B.push({t:"p",x:textOf(k)})});
  B.push({t:"h1",x:"7.0 RECOMMENDATION",page:1});B.push({t:"p",x:"The following points should be considered to comply with the Occupational Safety and Health Act (OSHA) 1994 and USECHH Regulations 2000."});
  B.push({t:"h2",x:"7.1 Action to Be Taken"});B.push({t:"p",x:textOf("r1"),tight:1});
  B.push({t:"h2",x:"7.2 Record Keeping"});B.push({t:"p",x:"Under Regulation 26(4), records of monitoring shall be kept for at least 30 years where representative of personal exposure, and at least 5 years in any other case (e.g. area monitoring)."});
  B.push({t:"h2",x:"7.3 Regulations Compliance"});B.push({t:"p",x:"The employer should keep exposure to chemical hazards at the lowest practicable level and below the permissible exposure limits."});
  B.push({t:"h2",x:"7.4 Necessity of further monitoring"});B.push({t:"table",head:["Exposure Result","Frequency of monitoring"],rows:[["Above the permissible exposure limit","Not more than six (6) months"],["Above half of the eight-hour TWA but below the eight-hour TWA","Not more than twelve (12) months"]],w:[.6,.4]});
  B.push({t:"p",x:"Based on this monitoring: "+freqLine(a)});
  B.push({t:"h2",x:"7.5 Necessity to review the control measures according to the regulations"});
  B.push({t:"p",x:"1. If any of the initial three (3) samples exceed the PEL, the employer must review and improve existing control measures before proceeding with additional monitoring.\n2. If the compliance test fails after statistical analysis, the employer must immediately review engineering controls, work practices, administrative controls and PPE, and implement improvements.",tight:1});
  B.push({t:"h2",x:"7.6 Frequency of Monitoring"});B.push({t:"p",x:"The management is advised to communicate the CEM results to the CHRA assessor to determine the necessity for further monitoring. Air monitoring may be discontinued if at least two consecutive measurements taken at least seven days apart show exposures below half of the eight-hour TWA, the maximum exposure limit/STEL, or the ceiling limit."});
  B.push({t:"h1",x:"8.0 CONCLUSION",page:1});B.push({t:"p",x:textOf("concl")});B.push({t:"prep"});
  APPX.forEach(([L,Tt])=>{
    if(L!=="F"){B.push({t:"appx",L,T:Tt});return}
    B.push({t:"h1",x:"APPENDIX F: DATA AND CALCULATION FORM",page:1});
    GR.forEach(g=>{B.push({t:"rich",parts:[[client,1],[` — Point: ${g.point} — Parameter: ${g.param} — ${g.worker}`,0]],keep:1});
      B.push({t:"table",head:["Sample","Period (hrs)","fc (L/min)","t (min)","Tc (K)","Pc","T (K)","P","M (µg)","Vm (L)","Vs (L)","Ci (mg/m³)"],
        rows:g.rows.map(({r,c})=>[r.sample||"-",r.period||"-",f(num(r.fc),4),f(num(r.t),0),f(c.TcK,1),String(r.Pc??""),f(c.TK,1),String(r.P??""),String(r.mass||"-"),f(c.Vm,1),f(c.Vs,1),c.Ci==null?"-":(c.lt?"<":"")+f(c.Ci,3)]),
        w:[.075,.105,.08,.065,.075,.06,.075,.06,.08,.08,.08,.165],s:8,after:2});
      B.push({t:"mono",x:"Vm = fc × t × √(Pc×T / P×Tc); Vs = Vm × (P/760) × (298/T); Ci = M / Vs"});
      B.push({t:"twa",x:g.complete?`TWA₈ = [${g.rows.map(({r,c})=>`(${f(c.Ci,3)} × ${f(num(r.t),0)})`).join(" + ")}] / ${f(g.div,0)} = `:"TWA₈ = incomplete field data",b:g.complete?`${twaTxt(g)} mg/m³`:""})});
  });
  return B}

/* ---------------- PDF renderer (pdf-lib) ---------------- */
const clean=s=>String(s??"").replace(/μ/g,"µ").replace(/√/g,"sqrt").replace(/₈/g,"8").replace(/≤/g,"<=").replace(/≥/g,">=").replace(/Σ/g,"Sum ").replace(/≈/g,"~").replace(/[‐-‒]/g,"-").replace(/[^\n\x20-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g,"");
async function toPng(fl){const bmp=await createImageBitmap(new Blob([fl.data],{type:fl.type}));const c=document.createElement("canvas");c.width=bmp.width;c.height=bmp.height;c.getContext("2d").drawImage(bmp,0,0);
  return{data:new Uint8Array(await (await new Promise(r=>c.toBlob(r,"image/png"))).arrayBuffer()),w:bmp.width,h:bmp.height}}
async function buildPdf(B){
  const {PDFDocument,StandardFonts,rgb}=PDFLib,pdf=await PDFDocument.create();
  const R=await pdf.embedFont(StandardFonts.Helvetica),BD=await pdf.embedFont(StandardFonts.HelveticaBold);
  const PW=595.28,PH=841.89,ML=56,MR=56,CW=PW-ML-MR,TOP=PH-78,BOT=70;
  const INK=rgb(.1,.12,.15),GREY=rgb(.42,.45,.5),NAVY=rgb(.15,.25,.43),GREEN=rgb(.2,.6,.35),HEAD=rgb(.91,.93,.95),LINE=rgb(.35,.38,.42);
  const I=st.info,client=I.client||"Client",gen=new Set();let page,y;
  const newPage=()=>{page=pdf.addPage([PW,PH]);gen.add(page);y=TOP;return page};
  const tw=(t,f,s)=>f.widthOfTextAtSize(clean(t),s);
  const wrap=(t,f,s,w)=>{const out=[];clean(t).split("\n").forEach(par=>{const words=par.split(/ +/);let line="";words.forEach(wd=>{const test=line?line+" "+wd:wd;if(tw(test,f,s)>w&&line){out.push(line);line=wd}else line=test});out.push(line)});return out};
  const ensure=h=>{if(y-h<BOT)newPage()};
  const txt=(t,x,yy,f=R,s=10,c=INK)=>page.drawText(clean(t),{x,y:yy,font:f,size:s,color:c});
  const cx=(t,f,s,yy,c=INK,from=ML,to=PW-MR)=>txt(t,from+((to-from)-tw(t,f,s))/2,yy,f,s,c);
  function para(t,{s=10.5,lh=15,f=R,gap=7}={}){clean(t).split("\n").filter(p=>p.trim()).forEach(p=>{const bullet=/^• /.test(p),ind=bullet?12:0,body=bullet?p.slice(2):p,w=CW-ind;
      const lines=wrap(body,f,s,w);lines.forEach((ln,i)=>{ensure(lh);if(bullet&&i===0)txt("•",ML,y-s,f,s);const last=i===lines.length-1,words=ln.split(" "),x=ML+ind;
        if(!last&&words.length>1){const free=w-words.reduce((a,wd)=>a+tw(wd,f,s),0),sp=free/(words.length-1);let xx=x;words.forEach(wd=>{txt(wd,xx,y-s,f,s);xx+=tw(wd,f,s)+sp})}else txt(ln,x,y-s,f,s);y-=lh});y-=gap})}
  function table(head,body,fr,{s=9,pad=4.5,bold=-1,after=10}={}){
    const ws=fr.map(v=>v*CW),lh=s+3;
    const row=(cells,isHead)=>{const lines=cells.map((c,i)=>wrap(c,isHead||i===bold?BD:R,s,ws[i]-2*pad));return{lines,h:Math.max(...lines.map(l=>l.length))*lh+2*pad-3}};
    const draw=(cells,isHead)=>{const r=row(cells,isHead);if(y-r.h<BOT){newPage();if(!isHead)draw(head,true)}
      let x=ML;r.lines.forEach((ls,i)=>{page.drawRectangle({x,y:y-r.h,width:ws[i],height:r.h,borderColor:LINE,borderWidth:.6,color:isHead?HEAD:undefined});
        ls.forEach((l,j)=>txt(l,x+pad,y-pad-s+1-j*lh,isHead||i===bold?BD:R,s,isHead?rgb(.3,.35,.42):INK));x+=ws[i]});y-=r.h};
    draw(head,true);body.forEach(b=>draw(b));y-=after}
  const toc=[];let tocPage,tocPos={};
  for(let bi=0;bi<B.length;bi++){const b=B[bi];
    if(b.t==="cover"){newPage();y=PH-90;
      const lg=await idb.get("logo").catch(()=>null);let lx=ML;
      if(lg){try{const im=/png/i.test(lg.type)?await pdf.embedPng(lg.data):await pdf.embedJpg(lg.data);const d=im.scaleToFit(70,70);page.drawImage(im,{x:ML,y:y-d.height+8,width:d.width,height:d.height});lx=ML+d.width+14}catch(e){}}
      cx((I.consName||"").toUpperCase(),BD,15,y,INK,lx);y-=18;[I.consAddr,I.consTel,I.consEmail].filter(Boolean).forEach(l=>{cx(l,R,8.5,y,GREY,lx);y-=12});
      y=PH-235;page.drawLine({start:{x:ML,y},end:{x:PW-MR,y},thickness:1.2,color:GREEN});y-=40;
      ["PERSONAL","CHEMICAL EXPOSURE MONITORING","REPORT"].forEach(l=>{cx(l,BD,17,y,NAVY);y-=22});
      cx(`(REF. NO.: ${I.reportNo||"-"})`,BD,10,y,NAVY);y-=26;page.drawLine({start:{x:ML,y},end:{x:PW-MR,y},thickness:1.2,color:GREEN});y-=60;
      cx(client.toUpperCase(),BD,12,y);y-=16;if(I.clientDosh){cx(`(DOSH NO.: ${I.clientDosh})`,BD,10.5,y);y-=16}
      y-=36;cx((I.locName||client).toUpperCase(),BD,12,y);y-=16;if(I.locAddr)wrap(I.locAddr.toUpperCase(),BD,11,CW).forEach(l=>{cx(l,BD,11,y);y-=15});
      y-=50;[["HYGIENE TECHNICIAN NAME",I.htName],["DOSH REG. NO.",I.htReg],["DOSH REPORT NO.",I.doshReportNo],["ESM REPORT NO.",I.reportNo],["MONITORING DATE",I.dates]].forEach(([k,v])=>{txt(k,ML+30,y,BD,9.5);txt(": "+String(v||"-").toUpperCase(),ML+230,y,BD,9.5);y-=19});continue}
    if(b.t==="toc"){newPage();tocPage=page;txt("TABLE OF CONTENTS",ML,y-15,BD,15);y-=34;
      B.filter(x=>x.t==="h1"||x.t==="appx").forEach((x,i)=>{const label=x.t==="appx"?`APPENDIX ${x.L}: ${x.T}`:x.x;txt(label,ML,y-10.5,R,10.5);tocPos[label]=y-10.5;y-=19});continue}
    if(b.t==="h1"){if(b.page)newPage();else ensure(40);toc.push({label:b.x,page});txt(b.x,ML,y-15,BD,15);y-=34;continue}
    if(b.t==="h2"){ensure(36);wrap(b.x,BD,11.5,CW).forEach(l=>{txt(l,ML,y-11.5,BD,11.5);y-=16});y-=5;continue}
    if(b.t==="p"){para(b.x,{s:b.s||10.5,lh:b.s?13.5:15,gap:b.tight?5:7});continue}
    if(b.t==="cap"){ensure(60);let x=ML;txt(b.b+" ",x,y-10.5,BD,10.5);x+=tw(b.b+" ",BD,10.5);txt(b.x,x,y-10.5,R,10.5);y-=18;continue}
    if(b.t==="table"){table(b.head,b.rows,b.w,{s:b.s||9,bold:b.bold??-1,after:b.after??10});continue}
    if(b.t==="rich"){ensure(b.keep?110:18);let x=ML;b.parts.forEach(([t,bo])=>{txt(t,x,y-10,bo?BD:R,10);x+=tw(t,bo?BD:R,10)});y-=17;continue}
    if(b.t==="mono"){ensure(14);txt(b.x,ML,y-9.5,R,9.5);y-=14;continue}
    if(b.t==="twa"){const ls=wrap(b.x,R,9.5,CW-80);ls.forEach((l,i)=>{ensure(14);txt(l,ML,y-9.5,R,9.5);if(i===ls.length-1&&b.b)txt(b.b,ML+tw(l,R,9.5)+2,y-9.5,BD,9.5);y-=14});y-=12;continue}
    if(b.t==="prep"){y-=24;ensure(80);txt("Prepared by,",ML,y-10.5,BD,10.5);y-=26;[["Name",I.htName],["Position",I.htPos],["Registration No.",I.htReg]].forEach(([k,v])=>{txt(`${k} : ${v||"-"}`,ML,y-10.5,R,10.5);y-=17});continue}
    if(b.t==="appx"){newPage();const label=`APPENDIX ${b.L}: ${b.T}`;toc.push({label,page});cx(label,BD,16,PH/2+10);
      const fs=st.att[b.L]||[];if(!fs.length)cx("(No document attached)",R,10,PH/2-14,GREY);
      for(const meta of fs){const fl=await idb.get("file:"+meta.id);if(!fl)continue;
        try{if(/pdf/i.test(fl.type)||/\.pdf$/i.test(fl.name)){const src=await PDFDocument.load(fl.data,{ignoreEncryption:true});(await pdf.copyPages(src,src.getPageIndices())).forEach(p=>pdf.addPage(p))}
          else{let im;if(/png/i.test(fl.type))im=await pdf.embedPng(fl.data);else if(/jpe?g/i.test(fl.type))im=await pdf.embedJpg(fl.data);else im=await pdf.embedPng((await toPng(fl)).data);
            newPage();const d=im.scaleToFit(CW,TOP-BOT-10);page.drawImage(im,{x:ML+(CW-d.width)/2,y:TOP-d.height,width:d.width,height:d.height})}}
        catch(e){console.error(e);newPage();txt(`Could not attach ${meta.name}: ${e.message}`,ML,TOP-20,R,10,rgb(.75,.2,.15))}}
      continue}
  }
  const all=pdf.getPages(),N=all.length,hdr=`Chemical Exposure Monitoring at ${client} — Report No.: ${I.reportNo||"-"}`;
  const disc=dd(`This report shall not be reproduced, distributed or copied without prior written consent of ${I.consName||"the consultant"}.`);
  let hs=8;const fitW=()=>tw(hdr,R,hs)+tw(I.dates||"",R,hs)+14;while(fitW()>CW&&hs>6.3)hs-=0.1;const dW=tw(I.dates||"",R,hs);
  let hT=hdr;while(hT.length>10&&tw(hT,R,hs)>CW-dW-14)hT=hT.slice(0,-2);if(hT!==hdr)hT=hT.trim()+"…";
  all.forEach((p,i)=>{if(!gen.has(p))return;page=p;txt(hT,ML,PH-40,R,hs,GREY);txt(I.dates||"",PW-MR-dW,PH-40,R,hs,GREY);
    txt(disc,ML,36,R,6.8,GREY);const pn=`Page ${i+1} of ${N}`;txt(pn,PW-MR-tw(pn,R,8.5),36,R,8.5,GREY)});
  page=tocPage;toc.forEach(t=>{if(tocPos[t.label]==null)return;const n=String(all.indexOf(t.page)+1);txt(n,PW-MR-tw(n,R,10.5),tocPos[t.label],R,10.5)});
  return pdf.save()}

/* ---------------- Word renderer (docx) ---------------- */
async function pdfPagesAsPng(bytes,scale=1.6){const lib=await getPdfjs(),doc=await lib.getDocument({data:new Uint8Array(bytes.slice(0))}).promise,out=[];
  for(let i=1;i<=doc.numPages;i++){const pg=await doc.getPage(i),vp=pg.getViewport({scale}),cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;
    await pg.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;out.push({data:new Uint8Array(await (await new Promise(r=>cv.toBlob(r,"image/png"))).arrayBuffer()),w:cv.width,h:cv.height})}
  return out}
async function buildDocx(B){
  const D=window.docx,I=st.info,client=I.client||"Client",kids=[];let brk=false;
  const AL=D.AlignmentType,W=D.WidthType.PERCENTAGE,SZ=21;
  const run=(text,o={})=>new D.TextRun({text:String(text??""),size:o.size||SZ,bold:!!o.bold,color:o.color});
  const P=(children,o={})=>{const p=new D.Paragraph({children,alignment:o.align,spacing:"line" in o?{after:o.after??120,before:o.before}:{after:o.after??120,line:300,before:o.before},heading:o.heading,pageBreakBefore:brk||!!o.pb,keepNext:o.keepNext});brk=false;return p};
  const fit=(w,h,maxW=600,maxH=820)=>{const k=Math.min(maxW/w,maxH/h,1);return{width:Math.round(w*k),height:Math.round(h*k)}};
  const img=(d,type)=>new D.ImageRun({type,data:d.data,transformation:fit(d.w,d.h)});
  const table=(head,rows,w,o={})=>{if(brk){kids.push(new D.Paragraph({children:[new D.PageBreak()]}));brk=false}
    kids.push(new D.Table({width:{size:100,type:W},rows:[head,...rows].map((cells,ri)=>new D.TableRow({tableHeader:ri===0,cantSplit:true,children:cells.map((c,ci)=>new D.TableCell({width:{size:Math.round(w[ci]*100),type:W},
      shading:ri===0?{fill:"E8ECF1",type:D.ShadingType.CLEAR,color:"auto"}:undefined,margins:{top:50,bottom:50,left:80,right:80},
      children:[new D.Paragraph({spacing:{after:0},children:[run(c,{size:o.s?o.s*2:18,bold:ri===0||ci===o.bold,color:ri===0?"4A5563":undefined})]})]}))}))}));
    kids.push(new D.Paragraph({spacing:{after:o.after===2?40:160},children:[]}))};
  for(const b of B){
    if(b.t==="cover"){const lg=await idb.get("logo").catch(()=>null);
      if(lg){try{const bmp=await createImageBitmap(new Blob([lg.data],{type:lg.type}));kids.push(P([new D.ImageRun({type:/png/i.test(lg.type)?"png":"jpg",data:new Uint8Array(lg.data),transformation:fit(bmp.width,bmp.height,90,90)})],{align:AL.CENTER,line:null}))}catch(e){}}
      kids.push(P([run((I.consName||"").toUpperCase(),{bold:true,size:30})],{align:AL.CENTER,after:60}));
      [I.consAddr,I.consTel,I.consEmail].filter(Boolean).forEach(l=>kids.push(P([run(l,{size:17,color:"6B7280"})],{align:AL.CENTER,after:0})));
      kids.push(P([],{before:1200,after:400}));
      ["PERSONAL","CHEMICAL EXPOSURE MONITORING","REPORT"].forEach(l=>kids.push(P([run(l,{bold:true,size:34,color:"26406E"})],{align:AL.CENTER,after:60})));
      kids.push(P([run(`(REF. NO.: ${I.reportNo||"-"})`,{bold:true,size:20,color:"26406E"})],{align:AL.CENTER,after:900}));
      kids.push(P([run(client.toUpperCase(),{bold:true,size:24})],{align:AL.CENTER,after:40}));if(I.clientDosh)kids.push(P([run(`(DOSH NO.: ${I.clientDosh})`,{bold:true,size:21})],{align:AL.CENTER}));
      kids.push(P([run((I.locName||client).toUpperCase(),{bold:true,size:24})],{align:AL.CENTER,before:600,after:40}));if(I.locAddr)kids.push(P([run(I.locAddr.toUpperCase(),{bold:true,size:22})],{align:AL.CENTER,after:900}));
      [["HYGIENE TECHNICIAN NAME",I.htName],["DOSH REG. NO.",I.htReg],["DOSH REPORT NO.",I.doshReportNo],["ESM REPORT NO.",I.reportNo],["MONITORING DATE",I.dates]].forEach(([k,v])=>
        kids.push(new D.Paragraph({tabStops:[{type:D.TabStopType.LEFT,position:4200}],spacing:{after:80},indent:{left:600},children:[run(k,{bold:true,size:19}),run("\t: "+String(v||"-").toUpperCase(),{bold:true,size:19})]})));
      brk=true;continue}
    if(b.t==="toc"){kids.push(P([run("TABLE OF CONTENTS",{bold:true,size:30})],{after:240}));
      B.filter(x=>x.t==="h1"||x.t==="appx").forEach(x=>kids.push(P([run(x.t==="appx"?`APPENDIX ${x.L}: ${x.T}`:x.x)],{after:110})));brk=true;continue}
    if(b.t==="h1"){if(b.page)brk=true;kids.push(P([run(b.x,{bold:true,size:30,color:"1D2A35"})],{heading:D.HeadingLevel.HEADING_1,after:240}));continue}
    if(b.t==="h2"){kids.push(P([run(b.x,{bold:true,size:23})],{heading:D.HeadingLevel.HEADING_2,before:120,after:100,keepNext:true}));continue}
    if(b.t==="p"){b.x.split("\n").filter(s=>s.trim()).forEach(s=>{const bl=/^• /.test(s);kids.push(bl?new D.Paragraph({children:[run(s.slice(2),{size:b.s?b.s*2:SZ})],bullet:{level:0},alignment:AL.JUSTIFIED,spacing:{after:100,line:300},pageBreakBefore:brk}):P([run(s,{size:b.s?b.s*2:SZ})],{align:AL.JUSTIFIED,after:b.tight?80:140}));brk=false});continue}
    if(b.t==="cap"){kids.push(P([run(b.b+" ",{bold:true}),run(b.x)],{after:80,keepNext:true}));continue}
    if(b.t==="table"){table(b.head,b.rows,b.w,{s:b.s,bold:b.bold,after:b.after});continue}
    if(b.t==="rich"){kids.push(P(b.parts.map(([t,bo])=>run(t,{bold:!!bo,size:20})),{after:80,keepNext:true,before:120}));continue}
    if(b.t==="mono"){kids.push(P([run(b.x,{size:18})],{after:20}));continue}
    if(b.t==="twa"){kids.push(P([run(b.x,{size:18}),run(b.b,{size:18,bold:true})],{after:200}));continue}
    if(b.t==="prep"){kids.push(P([run("Prepared by,",{bold:true})],{before:400}));[["Name",I.htName],["Position",I.htPos],["Registration No.",I.htReg]].forEach(([k,v])=>kids.push(P([run(`${k} : ${v||"-"}`)],{after:60})));continue}
    if(b.t==="appx"){brk=true;kids.push(P([run(`APPENDIX ${b.L}: ${b.T}`,{bold:true,size:30})],{heading:D.HeadingLevel.HEADING_1,align:AL.CENTER,before:3600,after:200}));
      const fs=st.att[b.L]||[];if(!fs.length)kids.push(P([run("(No document attached)",{color:"6B7280"})],{align:AL.CENTER}));
      for(const meta of fs){const fl=await idb.get("file:"+meta.id);if(!fl)continue;
        try{let imgs;if(/pdf/i.test(fl.type)||/\.pdf$/i.test(fl.name)){busy(true,`Adding ${meta.name} to the Word file…`);imgs=(await pdfPagesAsPng(fl.data)).map(d=>[d,"png"])}
          else if(/png|jpe?g/i.test(fl.type)){const bmp=await createImageBitmap(new Blob([fl.data],{type:fl.type}));imgs=[[{data:new Uint8Array(fl.data),w:bmp.width,h:bmp.height},/png/i.test(fl.type)?"png":"jpg"]]}
          else imgs=[[await toPng(fl),"png"]];
          imgs.forEach(([d,t])=>{brk=true;kids.push(P([img(d,t)],{align:AL.CENTER,after:0,line:null}))})}
        catch(e){console.error(e);kids.push(P([run(`Could not attach ${meta.name}: ${e.message}`,{color:"C0392B"})]))}}
      continue}
  }
  const hdr=`Chemical Exposure Monitoring at ${client} — Report No.: ${I.reportNo||"-"}`,disc=dd(`This report shall not be reproduced, distributed or copied without prior written consent of ${I.consName||"the consultant"}.`);
  const doc=new D.Document({creator:I.htName||"IH Control",title:`CEM Report ${I.reportNo||""}`,
    styles:{default:{document:{run:{font:"Arial",size:SZ}}},paragraphStyles:[{id:"Heading1",name:"Heading 1",basedOn:"Normal",next:"Normal",run:{font:"Arial",size:30,bold:true,color:"1D2A35"}},{id:"Heading2",name:"Heading 2",basedOn:"Normal",next:"Normal",run:{font:"Arial",size:23,bold:true,color:"1D2A35"}}]},
    numbering:undefined,
    sections:[{properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:1300,bottom:1200,left:1134,right:1134,header:560,footer:560}}},
      headers:{default:new D.Header({children:[new D.Paragraph({tabStops:[{type:D.TabStopType.RIGHT,position:9638}],children:[run(hdr,{size:12,color:"6B7280"}),run("\t"+(I.dates||""),{size:12,color:"6B7280"})]})]}),first:new D.Header({children:[new D.Paragraph({children:[]})]})},
      footers:{default:new D.Footer({children:[new D.Paragraph({tabStops:[{type:D.TabStopType.RIGHT,position:9638}],children:[run(disc,{size:12,color:"6B7280"}),new D.TextRun({children:["\tPage ",D.PageNumber.CURRENT," of ",D.PageNumber.TOTAL_PAGES],size:16,color:"6B7280"})]})]}),first:new D.Footer({children:[new D.Paragraph({children:[]})]})},
      children:kids}]});
  return D.Packer.toBlob(doc)}

/* ---------------- downloads ---------------- */
function download(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}
const baseName=()=>`CEM-Report-${(st.info.reportNo||"draft").replace(/[^\w\-]+/g,"_")}`;
async function makeReport(kind,open){$("#mDl").classList.remove("show");
  if(kind==="pdf"&&!window.PDFLib)return toast("PDF library didn't load. Check your internet connection.");
  if(kind==="docx"&&!window.docx)return toast("Word library didn't load. Check your internet connection.");
  busy(true,kind==="pdf"?"Building PDF report…":"Building Word report…");
  try{const B=model();
    if(kind==="pdf"){const bytes=await buildPdf(B),blob=new Blob([bytes],{type:"application/pdf"});window.__lastReport={kind,bytes};if(open){const w=window.open(URL.createObjectURL(blob),"_blank");if(!w)download(blob,baseName()+".pdf")}else download(blob,baseName()+".pdf")}
    else{const blob=await buildDocx(B);window.__lastReport={kind,blob};download(blob,baseName()+".docx")}
    toast(kind==="pdf"?"PDF report ready":"Word report ready")}
  catch(e){console.error(e);toast("Could not build the report: "+e.message,6000)}finally{busy(false)}}
$("#bDl").onclick=()=>$("#mDl").classList.add("show");
$("#dlPdf").onclick=()=>makeReport("pdf",$("#dlPreview").checked);$("#dlDoc").onclick=()=>makeReport("docx");
$("#bPrint").onclick=()=>window.print();
$("#bXls").onclick=()=>{if(!window.XLSX)return toast("Excel library didn't load");const wb=XLSX.utils.book_new(),G=groups();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(Object.entries(st.info).filter(([k])=>k!=="logoName").map(([k,v])=>({Field:k,Value:v}))),"Report info");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(st.rows.map(r=>{const c=calc(r);return{Point:r.point,Worker:worker(r.point),Parameter:r.param,"Sample ID":r.sample,"Period (hrs)":r.period,"fc (L/min)":r.fc,"t (min)":r.t,"Tc (°C)":r.Tc,"Pc (mmHg)":r.Pc,"T (°C)":r.T,"P (mmHg)":r.P,"Mass (µg)":r.mass,"Vm (L)":c.Vm&&+c.Vm.toFixed(2),"Vs (L)":c.Vs&&+c.Vs.toFixed(2),"Ci (mg/m³)":c.Ci&&+c.Ci.toFixed(4)}})),"Calculation");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(G.map(g=>({Worker:g.worker,Point:g.point,Parameter:g.param,"Duration (min)":g.sumT,"TWA8 (mg/m³)":twaTxt(g),"PEL (mg/m³)":g.pel,"% PEL":g.pct&&+g.pct.toFixed(1),Remarks:remark(g)}))),"Summary");
  XLSX.writeFile(wb,`CEM-${st.info.reportNo||"report"}.xlsx`)};

/* ---------------- start ---------------- */
function renderAll(){renderParams();renderPoints();renderRows();renderOut();renderTexts(true)}
try{document.documentElement.dataset.theme=JSON.parse(localStorage.getItem("ihcc_theme"))||""}catch(e){}
$("#divTotal").checked=!!st.divTotal;$("#logoName").textContent=st.info.logoName||"";
fillChemList();renderInfo();renderControls();renderAll();renderTexts();renderAtt();
(async()=>{const C=window.IHCC_CONFIG||{};const go=()=>location.replace("index.html");
  if(C.TEST_MODE){document.body.style.visibility="visible";return}
  try{if(!window.supabase||!C.SUPABASE_URL||C.SUPABASE_URL.includes("YOUR-PROJECT"))return go();
    const sb=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY);const {data:{session}}=await sb.auth.getSession();if(!session)return go();
    const {data}=await sb.from("app_users").select("role").eq("email",(session.user.email||"").toLowerCase()).maybeSingle();if(!data)return go();
    document.body.style.visibility="visible"}catch(e){go()}})();
