(function(root){
function dayKey(ts){const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
// Union of overlapping breaks (an open break, end:null, absorbs anything after it); first break's type wins
function mergeBreaks(list){const L=(list||[]).slice().sort((x,y)=>x.start-y.start),out=[];for(const b of L){const p=out[out.length-1];if(p&&(p.end===null||p.end===undefined||b.start<=p.end)){if(p.end!==null&&p.end!==undefined)p.end=(b.end===null||b.end===undefined)?null:Math.max(p.end,b.end);}else out.push({...b});}return out;}
// Overlapping breaks are counted once (union), clipped to the shift
function breakMs(s,now){const e=s.end||now||Date.now();return mergeBreaks(s.breaks).reduce((a,b)=>a+Math.max(0,Math.min(b.end||e,e)-Math.max(b.start,s.start)),0);}
// Live-safe: open shifts are measured up to `now` (default Date.now()), from the stored start timestamp
function hours(s,now){const e=s.end||now||Date.now();return Math.max(0,(e-s.start-breakMs(s,e))/36e5);}
function otRate(cfg){return cfg.fixedRate>0?cfg.fixedRate:cfg.rate*cfg.mult;}
// Group by start day; overtime = day worked beyond normal hours
function days(shifts,cfg){const m={};for(const s of shifts){if(!s.end)continue;const k=dayKey(s.start)+'|'+(s.worker||'')+'|'+(s.company||'');(m[k]=m[k]||{day:dayKey(s.start),worker:s.worker||'',company:s.company||'',shifts:[],worked:0}).shifts.push(s);m[k].worked+=hours(s);}
 return Object.values(m).sort((a,b)=>a.day<b.day?1:a.day>b.day?-1:0).map(d=>{d.ot=Math.max(0,d.worked-cfg.normal);d.pay=d.ot*otRate(cfg);return d;});}
function weekKey(day){const d=new Date(day+'T12:00:00');const w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return dayKey(d);}
function totals(ds,keyFn){const m={};for(const d of ds){const k=keyFn(d.day);const t=m[k]=m[k]||{key:k,worked:0,ot:0,pay:0};t.worked+=d.worked;t.ot+=d.ot;t.pay+=d.pay;}return Object.values(m).sort((a,b)=>a.key<b.key?1:-1);}
// 'HH:MM' on the shift's start date; if earlier than shift start, it's the next day (overnight)
function timeOn(start,hhmm){const [h,m]=hhmm.split(':').map(Number);const d=new Date(start);d.setHours(h,m,0,0);let v=d.getTime();if(v<=start-6e4)v+=864e5;else if(v<start)v=start;return v;}
function checkBreak(b,start,end){if(!(b.end>b.start))return 'el fin debe ser posterior al inicio';if(b.start<start||b.end>end)return 'debe estar dentro del turno';return '';}
// First pair of overlapping breaks (sorted by start), or null
function findOverlap(list,now){const L=(list||[]).slice().sort((x,y)=>x.start-y.start);for(let i=1;i<L.length;i++)if(L[i].start<(L[i-1].end||now||Date.now()))return [L[i-1],L[i]];return null;}
const api={findOverlap,mergeBreaks,timeOn,checkBreak,dayKey,hours,breakMs,otRate,days,weekKey,totals,monthKey:d=>d.slice(0,7)};
if(typeof module!=='undefined')module.exports=api;else root.Calc=api;
})(this);
