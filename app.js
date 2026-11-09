const $=id=>document.getElementById(id),LS=localStorage;
let shifts=JSON.parse(LS.getItem('he_shifts')||'[]');
let cfg=Object.assign({normal:8,rate:10,mult:1.25,fixedRate:0},JSON.parse(LS.getItem('he_cfg')||'{}'));
const save=()=>{LS.setItem('he_shifts',JSON.stringify(shifts));LS.setItem('he_cfg',JSON.stringify(cfg));};
const eur=n=>n.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const hm=h=>{const m=Math.round(h*60);return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m';};
const tm=ts=>new Date(ts).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const open=()=>shifts.find(s=>!s.end);
$('worker').value=LS.getItem('he_lastW')||'';$('company').value=LS.getItem('he_lastC')||'';
['Normal','Rate','Mult'].forEach(k=>$('s'+k).value=cfg[k.toLowerCase()]);$('sFixed').value=cfg.fixedRate||'';
['sNormal','sRate','sMult','sFixed'].forEach(id=>$(id).addEventListener('input',()=>{cfg.normal=+$('sNormal').value||0;cfg.rate=+$('sRate').value||0;cfg.mult=+$('sMult').value||1;cfg.fixedRate=+$('sFixed').value||0;save();render();}));
['worker','company'].forEach(id=>$(id).addEventListener('input',()=>{LS.setItem(id==='worker'?'he_lastW':'he_lastC',$(id).value.trim());buttons();}));
$('bIn').onclick=()=>{const w=$('worker').value.trim(),c=$('company').value.trim();if(!w||!c)return alert('Rellena operario y empresa');shifts.push({id:Date.now(),worker:w,company:c,start:Date.now(),end:null,breaks:[]});save();render();};
$('bOut').onclick=()=>{const s=open();if(!s)return;const now=Date.now();s.breaks.forEach(b=>{if(!b.end)b.end=now});s.end=now;save();render();};
function toggle(type){const s=open();if(!s)return;const now=Date.now(),cur=s.breaks.find(b=>!b.end);if(cur)cur.end=now;if(!cur||cur.type!==type)s.breaks.push({type,start:now,end:null});save();render();}
$('bAl').onclick=()=>toggle('almuerzo');$('bCo').onclick=()=>toggle('comida');
function paused(s){return s&&s.breaks.some(b=>!b.end);}
function buttons(){const s=open(),ok=$('worker').value.trim()&&$('company').value.trim();
 $('bIn').disabled=!!s||!ok;$('bOut').disabled=!s;const cur=s&&s.breaks.find(b=>!b.end),t=cur&&cur.type;
 $('bAl').disabled=$('bCo').disabled=!s;$('bFix').style.display=s?'':'none';$('bAl').textContent=t==='almuerzo'?'Fin almuerzo':'Almuerzo';$('bCo').textContent=t==='comida'?'Fin comida':'Hora de comer';
 $('bAl').classList.toggle('on',t==='almuerzo');$('bCo').classList.toggle('on',t==='comida');
 $('status').textContent=s?(t==='almuerzo'?'En almuerzo':t==='comida'?'Comiendo':'Trabajando')+' · '+s.worker+' · '+s.company+' · desde '+tm(s.start):(ok?'Sin fichar':'Rellena operario y empresa');}
function tick(){shifts=JSON.parse(LS.getItem('he_shifts')||'[]');const s=open();const h=s?Calc.hours(s,Date.now()):0;const t=Math.floor(h*3600);$('clock').textContent=Math.floor(t/3600)+':'+String(Math.floor(t/60)%60).padStart(2,'0')+':'+String(t%60).padStart(2,'0');const bm=s?Math.floor(Calc.breakMs(s,Date.now())/6e4):0;$('brk').textContent=bm?'Descansos descontados: '+Math.floor(bm/60)+':'+String(bm%60).padStart(2,'0'):'';}
function opts(sel,vals,all){const v=sel.value;sel.innerHTML='<option value="">'+all+'</option>'+vals.map(x=>'<option>'+esc(x)+'</option>').join('');sel.value=vals.includes(v)?v:'';}
function render(){
 const W=[...new Set(shifts.map(s=>s.worker))].sort(),Co=[...new Set(shifts.map(s=>s.company))].sort();
 $('workers').innerHTML=W.map(x=>'<option value="'+esc(x)+'">').join('');$('companies').innerHTML=Co.map(x=>'<option value="'+esc(x)+'">').join('');
 opts($('fW'),W,'Todos');opts($('fC'),Co,'Todas');
 const f=shifts.filter(s=>(!$('fW').value||s.worker===$('fW').value)&&(!$('fC').value||s.company===$('fC').value));
 const ds=Calc.days(f,cfg);
 const tbl=(rows,lab)=>'<tr><th>'+lab+'</th><th>Trab.</th><th>Extra</th><th>€ extra</th></tr>'+(rows.length?rows.map(r=>'<tr><td>'+r.label+'</td><td>'+hm(r.worked)+'</td><td class="ot">'+hm(r.ot)+'</td><td>'+eur(r.pay)+'</td></tr>').join(''):'<tr><td colspan=4 class="muted">Sin datos</td></tr>');
 $('weeks').innerHTML=tbl(Calc.totals(ds,Calc.weekKey).slice(0,6).map(r=>({...r,label:'Sem. '+new Date(r.key+'T12:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})})),'Semana');
 $('months').innerHTML=tbl(Calc.totals(ds,Calc.monthKey).slice(0,6).map(r=>({...r,label:new Date(r.key+'-15T12:00').toLocaleDateString('es-ES',{month:'long',year:'numeric'})})),'Mes');
 $('hist').innerHTML=ds.length?ds.map(d=>'<div class="day"><div class="sh"><b>'+new Date(d.day+'T12:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})+' · '+esc(d.worker)+' · '+esc(d.company)+'</b></div>'+
  d.shifts.map(s=>{const br=Math.round(s.breaks.reduce((a,b)=>a+(b.end-b.start),0)/6e4);return '<div class="sh"><span>'+tm(s.start)+' → '+tm(s.end)+(new Date(s.end).getDate()!==new Date(s.start).getDate()?' (+1)':'')+(br?' · pausa '+br+'m':'')+'</span><button class="btn small edit" onclick="edit('+s.id+')">✏️ Editar</button></div>'}).join('')+
  '<div class="sh muted"><span>Trabajado '+hm(d.worked)+'</span><span class="ot">Extra '+hm(d.ot)+' · '+eur(d.pay)+'</span></div></div>').join(''):'<p class="muted">Aún no hay turnos.</p>';
 buttons();tick();}
$('fW').onchange=$('fC').onchange=render;
const toLocal=ts=>{const d=new Date(ts);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);};
let editing=null;
window.edit=id=>{editing=shifts.find(s=>s.id===id);$('eW').value=editing.worker;$('eC').value=editing.company;$('eS').value=toLocal(editing.start);$('eE').value=toLocal(editing.end);brEditor('eList',editing);$('dlg').showModal();};
$('bAdd').onclick=()=>{const n=Date.now();editing={id:n,worker:$('worker').value.trim(),company:$('company').value.trim(),start:n-8*36e5,end:n,breaks:[],isNew:true};edit_(editing);};
function edit_(s){$('eW').value=s.worker;$('eC').value=s.company;$('eS').value=toLocal(s.start);$('eE').value=toLocal(s.end);brEditor('eList',s);$('dlg').showModal();}
$('dlg').addEventListener('close',()=>{const v=$('dlg').returnValue;if(!editing)return;
 shifts=JSON.parse(LS.getItem('he_shifts')||'[]');if(!editing.isNew)editing=shifts.find(s=>s.id===editing.id)||editing;/* tick() recarga shifts cada segundo: buscar el turno por id */
 if(v==='del'&&!editing.isNew&&confirm('¿Borrar este turno?'))shifts=shifts.filter(s=>s.id!==editing.id);
 if(v==='ok'){let st=new Date($('eS').value).getTime(),en=new Date($('eE').value).getTime();const w=$('eW').value.trim(),c=$('eC').value.trim();
  if(!w||!c||isNaN(st)||isNaN(en))alert('Datos incompletos');else{if(en<=st)en+=864e5;/* cruza medianoche */
  Object.assign(editing,{worker:w,company:c,start:st,end:en,breaks:brRead('eList',st,en).list||editing.breaks});
  if(editing.isNew){delete editing.isNew;shifts.push(editing);}}}
 editing=null;save();render();});
$('bCsv').onclick=()=>{const q=x=>'"'+String(x).replace(/"/g,'""')+'"',n=x=>x.toFixed(2).replace('.',',');
 const f=shifts.filter(s=>s.end&&(!$('fW').value||s.worker===$('fW').value)&&(!$('fC').value||s.company===$('fC').value));
 const rows=[['Operario','Empresa','Fecha','Entrada','Salida','Pausa (min)','Horas trabajadas','Horas extra día','Importe extra día (€)'].map(q).join(';')];
 Calc.days(f,cfg).slice().reverse().forEach(d=>d.shifts.forEach((s,i)=>rows.push([s.worker,s.company,d.day,new Date(s.start).toLocaleString('es-ES'),new Date(s.end).toLocaleString('es-ES'),Math.round(s.breaks.reduce((a,b)=>a+(b.end-b.start),0)/6e4),n(Calc.hours(s)),i===d.shifts.length-1?n(d.ot):'',i===d.shifts.length-1?n(d.pay):''].map(q).join(';'))));
 const blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='horas-extra.csv';a.click();};
setInterval(tick,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});window.addEventListener('pageshow',render);render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

$('pMonth').value=Calc.dayKey(Date.now()).slice(0,7);
function buildPrint(){const mo=$('pMonth').value,fw=$('fW').value,fc=$('fC').value;
 const f=shifts.filter(s=>s.end&&Calc.dayKey(s.start).slice(0,7)===mo&&(!fw||s.worker===fw)&&(!fc||s.company===fc));
 const ds=Calc.days(f,cfg).slice().reverse();let W=0,O=0,P=0;
 let N=0,BA=0,BC=0;const bt=b=>b.type==='comida'?'comida':'almuerzo';
 const bcell=(d,t)=>{const L=d.shifts.flatMap(s=>s.breaks.filter(b=>b.end&&bt(b)===t));if(!L.length)return ['—',0];const h=L.reduce((a,b)=>a+(b.end-b.start),0)/36e5;
  return [L.map(b=>tm(b.start)+'–'+tm(b.end)).join('<br>')+'<br><small>('+hm(h)+')</small>',h];};
 const one=fw&&fc,oc=d=>one?'':'<td>'+esc(d.worker)+'</td><td>'+esc(d.company)+'</td>';
 const rows=ds.map(d=>{const ca=bcell(d,'almuerzo'),cc=bcell(d,'comida'),nh=d.worked-d.ot;N+=nh;O+=d.ot;BA+=ca[1];BC+=cc[1];W+=d.worked;P+=d.pay;
  const first=d.shifts.reduce((a,s)=>s.start<a.start?s:a),last=d.shifts.reduce((a,s)=>s.end>a.end?s:a);
  return '<tr><td>'+new Date(d.day+'T12:00').toLocaleDateString('es-ES')+'</td>'+oc(d)+'<td>'+tm(first.start)+'</td><td>'+tm(last.end)+(Calc.dayKey(last.end)!==d.day?' (+1)':'')+'</td><td>'+hm(nh)+'</td><td>'+hm(d.ot)+'</td><td class="brk">'+ca[0]+'</td><td class="brk">'+cc[0]+'</td><td>'+eur(d.pay)+'</td></tr>'}).join('');
 const ml=new Date(mo+'-15T12:00').toLocaleDateString('es-ES',{month:'long',year:'numeric'});
 $('print').innerHTML='<h1>Horas Pro by Julián Lenis · Resumen mensual</h1><p><b>Mes:</b> '+ml+'<br><b>Operario:</b> '+esc(fw||'Todos')+'<br><b>Empresa:</b> '+esc(fc||'Todas')+'<br><b>Jornada normal:</b> '+cfg.normal+' h/día · <b>Precio extra:</b> '+eur(Calc.otRate(cfg))+'/h</p>'+
 '<table><tr><th>Fecha</th>'+(one?'':'<th>Operario</th><th>Empresa</th>')+'<th>Inicio</th><th>Salida</th><th>Horas normales</th><th>Horas extras</th><th>Hora de almuerzo</th><th>Hora de comer</th><th>Importe extra</th></tr>'+(rows||'<tr><td colspan='+(one?8:10)+'>Sin turnos este mes</td></tr>')+
 '<tr><th colspan='+(one?3:5)+'>TOTAL MES (trabajado neto '+hm(W)+')</th><th>'+hm(N)+'</th><th>'+hm(O)+'</th><th>'+hm(BA)+'</th><th>'+hm(BC)+'</th><th>'+eur(P)+'</th></tr></table><p style="font-size:9pt">Generado el '+new Date().toLocaleString('es-ES')+' · Horas Pro by Julián Lenis · © 2026</p>';
 return {W,N,O,BA,BC,P};}
$('bPdf').onclick=()=>{buildPrint();const t=document.title;document.title='Horas Pro by Julián Lenis - '+$('pMonth').value;window.print();document.title=t;};


const hhmm=ts=>{const d=new Date(ts);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
// Break list editor: every break as a row (type, start, end, duration, delete)
function brRow(cid,b){const d=document.createElement('div');d.className='brow';d.dataset.type=b.type||'almuerzo';
 d.innerHTML='<span class="bt">'+(d.dataset.type==='comida'?'🍽️':'🥪')+'</span><input type="time" class="bs" aria-label="Inicio"><input type="time" class="be" aria-label="Fin"><span class="bd"></span><button type="button" class="btn small" style="background:#dc2626" aria-label="Borrar descanso">🗑️</button>';
 d.querySelector('.bs').value=b.start?hhmm(b.start):'';d.querySelector('.be').value=b.end?hhmm(b.end):'';
 const upd=()=>{d.classList.remove('bad');const sv=d.querySelector('.bs').value,ev=d.querySelector('.be').value;let m='';if(sv&&ev){const[h1,m1]=sv.split(':').map(Number),[h2,m2]=ev.split(':').map(Number);m=((h2*60+m2)-(h1*60+m1)+1440)%1440+' min';}else if(sv)m='en curso';d.querySelector('.bd').textContent=m;};
 d.querySelectorAll('input').forEach(i=>i.addEventListener('input',upd));upd();d.querySelector('button').onclick=()=>d.remove();$(cid).appendChild(d);}
function brEditor(cid,s){const box=$(cid);box.innerHTML='';const list=$(cid+'R')||document.createElement('div');
 (s.breaks||[]).slice().sort((x,y)=>x.start-y.start).forEach(b=>brRow(cid,b));
 let add=$(cid+'Add');if(!add){add=document.createElement('div');add.id=cid+'Add';add.className='badd';add.innerHTML='<button type="button" class="btn small">＋ Añadir almuerzo</button><button type="button" class="btn small">＋ Añadir comida</button>';box.after(add);
  add.children[0].onclick=()=>brRow(cid,{type:'almuerzo'});add.children[1].onclick=()=>brRow(cid,{type:'comida'});}}
function brRead(cid,st,en,openOk){const rows=[...$(cid).querySelectorAll('.brow')];rows.forEach(r=>r.classList.remove('bad'));const list=[];let opened=0;
 for(const r of rows){const sv=r.querySelector('.bs').value,ev=r.querySelector('.be').value,t=r.dataset.type,n=t==='comida'?'Hora de comer':'Almuerzo';if(!sv&&!ev)continue;
  const bad=m=>{r.classList.add('bad');return {err:n+' '+(sv||'')+': '+m};};
  if(!sv)return bad('pon la hora de inicio');const b={type:t,start:Calc.timeOn(st,sv),end:null,row:r};
  if(!ev){if(!openOk)return bad('pon la hora de fin');if(opened++)return bad('solo puede haber un descanso en curso');if(b.start>en)return bad('debe estar dentro del turno');list.push(b);continue;}
  b.end=Calc.timeOn(st,ev);if(b.end<=b.start)b.end+=864e5;const e=Calc.checkBreak(b,st,en);if(e)return bad(e);list.push(b);}
 const ov=Calc.findOverlap(list,en);if(ov){ov.forEach(b=>b.row.classList.add('bad'));const f=b=>(b.type==='comida'?'comida ':'almuerzo ')+hhmm(b.start)+'–'+(b.end?hhmm(b.end):'en curso');return {err:'Se solapan '+f(ov[0])+' y '+f(ov[1])+'. Corrige o borra (🗑️) uno de los dos (marcados en rojo).'};}
 return {list:list.sort((x,y)=>x.start-y.start).map(({row,...b})=>b)};}
$('fEd').addEventListener('submit',e=>{if(!e.submitter||e.submitter.value!=='ok')return;let st=new Date($('eS').value).getTime(),en=new Date($('eE').value).getTime();
 if(isNaN(st)||isNaN(en))return;if(en<=st)en+=864e5;const r=brRead('eList',st,en);if(r.err){e.preventDefault();alert(r.err);}});
$('bFix').onclick=()=>{const s=open();if(!s)return;$('xS').value=toLocal(s.start);brEditor('xList',s);$('dlgX').showModal();};
function readFix(){const now=Date.now();const st=new Date($('xS').value).getTime();if(isNaN(st))return {err:'Hora de inicio no válida'};if(st>now)return {err:'El inicio no puede ser posterior a ahora'};
 const r=brRead('xList',st,now,true);if(r.err)return r;const all=r.list;if(all.some((b,i)=>!b.end&&i!==all.length-1))return {err:'El descanso en curso debe ser el último'};return {st,all};}
$('fX').addEventListener('submit',e=>{if(!e.submitter||e.submitter.value!=='ok')return;const r=readFix();if(r.err){e.preventDefault();return alert(r.err);}
 const s=open();s.start=r.st;s.breaks=r.all;save();render();});
