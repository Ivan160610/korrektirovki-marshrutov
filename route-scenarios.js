/* Draft fleet scenarios. Recorded trials are kept distinct from model estimates. */
(()=>{
 const $=s=>document.querySelector(s),clone=x=>JSON.parse(JSON.stringify(x)),baseline=clone(data);let fleet=null,current=4,remembered=4;const assumptions={stop:1.5,pax:4};let stopPlan=null,compact=new URLSearchParams(location.search).get('pickups')!=='original';
 document.body.classList.add('fleet-planning');
 const header=$('header.app-header'),center=document.createElement('div');center.className='fleet-header';header.append(center);
 const picker=$('.route-picker'),time=document.createElement('div');time.className='fleet-time';time.append($('.trip-direction-tabs'),$('.shifts'));picker.prepend(time);center.append(picker);
 const controls=document.createElement('div');controls.className='fleet-tools';controls.setAttribute('role','group');controls.setAttribute('aria-label','Количество автобусов');controls.append(Object.assign(document.createElement('span'),{textContent:'Автобусов:'}));
 for(const n of [4,5,6]){const b=document.createElement('button');b.type='button';b.dataset.fleet=n;b.textContent=n;b.disabled=n!==4;b.setAttribute('aria-pressed',String(n===4));b.onclick=()=>apply(n);controls.append(b)}
 center.append(controls);
 const pickupTools=document.createElement('div');pickupTools.className='pickup-plan-tools';pickupTools.setAttribute('role','group');pickupTools.setAttribute('aria-label','Схема посадок');pickupTools.innerHTML='<span>Посадки:</span>';for(const [mode,label]of [['original','Исходные'],['compact','Укрупнённые']]){const b=document.createElement('button');b.type='button';b.dataset.stopPlan=mode;b.textContent=label;b.disabled=true;b.setAttribute('aria-pressed',String(compact===(mode==='compact')));b.onclick=()=>{compact=mode==='compact';apply(current)};pickupTools.append(b)}center.append(pickupTools);center.append(time,controls,$('.route-choices'),pickupTools);picker.hidden=true;

 const panel=document.createElement('aside');panel.className='fleet-summary';panel.setAttribute('aria-label','Маршруты и время в пути');panel.setAttribute('aria-live','polite');$('.map').append(panel);
 const note=document.createElement('div');note.className='fleet-note';note.setAttribute('role','status');$('.map').append(note);
 function estimate(s,variant){if(s.model==='balanced-road-leg')return s[variant];if(s.legs){let total=5+s.occupied*assumptions.stop+s.count*assumptions.pax/60;for(const leg of s.legs){const b=fleet.baseline.find(b=>b.id===leg.source),moving=b[variant]-5-b.occupied*assumptions.stop-b.count*assumptions.pax/60;if(moving<0)return null;total+=leg.minutes*moving/b.driveMinutes}return Math.ceil(total)}const source=fleet.baseline.find(b=>b.id===s.source);if(!s.changed)return s[variant];const base=source[variant],dwell=source.occupied*assumptions.stop+source.count*assumptions.pax/60,rate=(base-5-dwell)/source.weighted;if(rate<0)return null;let chosen=rate;if(current!==6&&s.id===5){const other=fleet.baseline[1],r=(other[variant]-5-other.occupied*assumptions.stop-other.count*assumptions.pax/60)/other.weighted;chosen=Math.max(rate,r)}return Math.ceil(5+s.weighted*chosen+s.occupied*assumptions.stop+s.count*assumptions.pax/60)}
 function scenarioTime(n,s,variant){const save=current;current=n;const value=estimate(s,variant);current=save;return value}
function fleetTimeTable(n,variant,model,doc,onSelect){
 const table=document.createElement('table');table.className='fleet-time-table fleet-comparison-table';
 table.setAttribute('aria-label','Сравнение схем на 4, 5 и 6 автобусов');
 const schemes=[4,5,6],stats=count=>count===4?model.baseline:model.scenarios[count].stats;
 table.innerHTML='<colgroup><col style="width:19%"><col style="width:9%"><col style="width:19%"><col style="width:9%"><col style="width:8%"><col style="width:19%"><col style="width:9%"><col style="width:8%"></colgroup><thead><tr class="comparison-groups">'+schemes.map(count=>'<th colspan="'+(count===4?2:3)+'" scope="colgroup" data-comparison-fleet="'+count+'" class="'+(count===n?'is-active':'')+'">'+(count===4?'Исходная схема · 4 автобуса':'Схема · '+count+' автобусов')+(count===n?' · на карте':'')+'</th>').join('')+'</tr><tr>'+schemes.map(count=>'<th scope="col">Маршрут</th><th scope="col">Время</th>'+(count===4?'':'<th scope="col">Изменение, %</th>')).join('')+'</tr></thead>';
 const ids=[...new Set(schemes.flatMap(count=>stats(count).map(stat=>stat.id)))].sort((a,b)=>a-b),tbody=document.createElement('tbody');
 const format=value=>value.toLocaleString('ru-RU',{maximumFractionDigits:1});
 function routeCell(stat,source,scenario){
  const cell=document.createElement('td');cell.className='comparison-route';cell.dataset.comparisonFleet=scenario;
  if(!stat){cell.textContent='—';cell.setAttribute('aria-label','В схеме на '+scenario+' автобусов маршрута нет');return cell}
  const route=source.routes.find(r=>r.id===stat.id),button=document.createElement('button');
  button.type='button';button.dataset.summaryRoute=stat.id;button.textContent='№'+stat.id;
  button.style.setProperty('--route-color',colors[stat.id-1]);button.title=route?.title||'Маршрут №'+stat.id;
  button.setAttribute('aria-pressed',String(selected===stat.id));button.onclick=()=>{if(scenario!==current)apply(scenario);onSelect?.(stat.id)};cell.append(button);
  const label=document.createElement('small');label.className='table-route-start';label.textContent=route?.title||'Маршрут №'+stat.id;label.title=label.textContent;cell.append(label);
  const metrics=document.createElement('small');metrics.textContent=format(stat.km)+' км · '+stat.count+' чел.';cell.append(metrics);return cell;
 }
 for(const id of ids){
  if(selected&&id!==selected)continue;
  const before=model.baseline.find(b=>b.id===id),tr=document.createElement('tr');tr.dataset.timeRoute=id;
  if(selected===id)tr.classList.add('is-selected');
  for(const count of schemes){
   const stat=stats(count).find(s=>s.id===id),source=count===4?baseline:count===n?doc:model.scenarios[count].data;
   tr.append(routeCell(stat,source,count));
   const time=document.createElement('td');time.className='table-time';time.dataset.comparisonFleet=count;
   if(!stat){time.textContent='—';tr.append(time);if(count>4){const empty=document.createElement('td');empty.textContent='—';tr.append(empty)}continue}
   const value=count===4?stat[variant]:scenarioTime(count,stat,variant);time.textContent=(count===4?'':'≈ ')+value+' мин';
   if(count===4){const basis=document.createElement('small');basis.textContent=variant==='night'&&stat.measured?'замер':'план';time.append(basis)}tr.append(time);
   if(count===4)continue;
   const change=document.createElement('td');change.className='table-change';change.dataset.comparisonFleet=count;
   if(!before){change.textContent='Новый';change.classList.add('is-new');const detail=document.createElement('small');detail.textContent='нет исходного рейса';change.append(detail)}
   else{
    const delta=value-before[variant],pct=100*delta/before[variant],sign=delta<0?'−':delta>0?'+':'';
    change.dataset.delta=delta;change.dataset.percent=pct.toFixed(1);change.classList.add(delta<0?'is-saving':delta>0?'is-longer':'is-same');change.textContent=sign+format(Math.abs(pct))+'%';
    const minutes=document.createElement('small');minutes.textContent=delta===0?'без изменений':sign+Math.abs(delta)+' мин';change.append(minutes);
    change.setAttribute('aria-label',delta===0?'Время без изменений':(delta<0?'Сокращение на ':'Увеличение на ')+format(Math.abs(pct))+' процента, '+Math.abs(delta)+' минут');
   }
   tr.append(change);
  }
  tbody.append(tr);
 }
 table.append(tbody);const scroll=document.createElement('div');scroll.className='fleet-comparison-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Сравнение маршрутов; на узком экране таблицу можно прокрутить вправо');scroll.append(table);return scroll;
}
function consolidateDocument(original,n,plan){
 const doc=JSON.parse(JSON.stringify(original));doc.walks=doc.walks||[];
 for(const r of plan.fleets[n]){for(const p of doc.points.filter(p=>p.route===r.route&&['boarding','pass'].includes(p.kind))){const ids=p.staffAssignmentIds?.length?[...new Set(p.staffAssignmentIds)]:[p.id],count=ids.reduce((sum,id)=>sum+(plan.allocations[id]||0),0);p.count=p.dayCount=p.nightCount=count;p.kind=count>0||p.id===r.startId?'boarding':'pass';p.staffAssignmentIds=ids}
  for(const m of r.merges){const from=doc.points.find(p=>p.id===m.from),to=doc.points.find(p=>p.id===m.to);if(!from||!to)continue;to.staffAssignmentIds.push(...from.staffAssignmentIds);for(const key of ['count','dayCount','nightCount'])to[key]+=from[key];from.kind='walk';from.targetId=to.id;from.target=to.name;from.walkMin=m.minutes;from.walkMetres=m.metres;from.count=from.dayCount=from.nightCount=0;from.staffAssignmentIds=[];doc.walks.push({route:r.route,xy:m.xy});}
 }doc.stopConsolidation=true;return doc;
}
function consolidationCard(r){
 const card=document.createElement('details');card.className='consolidation-card';card.dataset.consolidationRoute=r.route;const heading=document.createElement('summary');heading.textContent='№'+r.route+' · переносы посадок';card.append(heading);
 const start=document.createElement('p');start.textContent='Старт: '+r.startName+' · сохранён';card.append(start);
 for(const m of r.merges){const p=document.createElement('p');p.textContent=m.fromName+' → '+m.toName;const span=document.createElement('small');span.textContent='Дополнительно пешком: '+m.minutes+' мин · '+m.metres+' м между остановками';p.append(span);card.append(p)}
 if(r.empty.length){const p=document.createElement('p');p.textContent='Проезд без посадки: '+r.empty.map(p=>p.name).join('; ')+'. В назначениях сотрудников — 0.';card.append(p)}
 if(!r.empty.length&&!r.merges.length){const p=document.createElement('p');p.textContent='Близких посадок для объединения в пределах 10 минут нет.';card.append(p)}return card;
}
function transferInfo(id,doc){
 if(id<5)return null;const groups=new Map();
 for(const p of doc.points.filter(p=>p.route===id&&p.kind==='boarding')){const match=p.id.match(/^(?:city-|m)([1-4])-/);if(!match)continue;const source=Number(match[1]);if(!groups.has(source))groups.set(source,[]);const names=groups.get(source);if(!names.includes(p.name))names.push(p.name)}
 if(!groups.size)return null;return {label:'Разгружает '+[...groups.keys()].sort().map(n=>'№'+n).join(', '),groups:[...groups].sort((a,b)=>a[0]-b[0])};
}
function transferCard(id,doc){
 const info=transferInfo(id,doc);if(!info)return null;const card=document.createElement('section');card.className='route-transfer-card';card.setAttribute('aria-label','Откуда посадки маршрута №'+id);
 const title=document.createElement('h3');title.textContent='№'+id+' · '+info.label.toLowerCase();card.append(title);
 for(const [source,names]of info.groups){const line=document.createElement('p');line.textContent='С исходного №'+source+' · посадок: '+names.length+' · '+names[0]+(names.length>1?' → '+names.at(-1):'');card.append(line)}
 const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Какие остановки переходят';details.append(summary);
 for(const [source,names]of info.groups){const group=document.createElement('p');group.textContent='С №'+source+': '+names.join('; ')+'.';details.append(group)}card.append(details);return card;
}
 function renderPanel(){
  panel.replaceChildren();const outbound=TripDirections.isOutbound(),variant=shift==='night'?'night':'day',heading=document.createElement('h2');heading.textContent=outbound?'Развоз с базы':'Сравнение времени';panel.append(heading);
  const subtitle=document.createElement('p');subtitle.className='fleet-summary-subtitle';subtitle.textContent=(variant==='night'?'Вечер':'Утро')+' · '+(outbound?'выезд '+(variant==='night'?'20:15':'08:15'):'прибытие к '+(variant==='night'?'19:45':'07:45'))+(selected?' · маршрут №'+selected:' · все маршруты');panel.append(subtitle);
  if(!fleet&&!outbound){panel.append(Object.assign(document.createElement('p'),{textContent:'Загружаем маршруты…'}));return}
  if(outbound){for(const r of data.routes){const times=data.points.filter(p=>p.route===r.id&&p.dropoff).map(p=>p[variant==='night'?'evening':'morning']).filter(Number.isFinite),value=times.length?Math.max(...times)-(variant==='night'?1215:495):null;const row=document.createElement('button');row.className='fleet-summary-row';row.dataset.summaryRoute=r.id;row.textContent='№'+r.id+' · '+(value===null?'—':value+' мин')+' · план';row.onclick=()=>openRoute(r.id);panel.append(row)}}else panel.append(fleetTimeTable(current,variant,fleet,data,openRoute));
  const caption=document.createElement('p');caption.className='fleet-summary-caption';caption.textContent=outbound?'Плановое время развоза.':'Схемы на 4, 5 и 6 автобусов показаны одновременно. Процент — изменение времени относительно исходного №1–№4. Минус — быстрее, плюс — дольше. ≈ — расчёт; вечером исходные №1/№2 — замер. Для новых №5/№6 исходного рейса нет.';panel.append(caption);
  if(!outbound&&current>4){if(current===5){const warning=document.createElement('p');warning.className='pickup-plan-note';warning.textContent='№5 — сборный маршрут: утром он длиннее остальных. Схема с 6 автобусами распределяет нагрузку ровнее.';panel.append(warning)}for(const r of data.routes.filter(r=>r.id>=5)){const card=transferCard(r.id,data);if(card)panel.append(card)}}
  if(!outbound&&compact&&stopPlan&&selected){const r=stopPlan.fleets[current].find(r=>r.route===selected);if(r){const card=consolidationCard(r);panel.append(card)}}
 }
 function buttons(){const choices=$('.route-choices');choices.replaceChildren();$('#routeSelect').replaceChildren();for(const id of [0,...data.routes.map(r=>r.id)]){const r=data.routes.find(r=>r.id===id),b=document.createElement('button'),o=document.createElement('option');b.type='button';b.dataset.pickRoute=id;b.textContent=id?'№'+id:'Все';b.setAttribute('aria-label',r?'Показать маршрут №'+id+' — '+r.title:'Показать все маршруты');b.title=r?.title||'Все маршруты';b.onclick=()=>openRoute(id);choices.append(b);o.value=id;o.textContent=b.textContent;$('#routeSelect').append(o)}}
 function apply(n){if(n>4&&!fleet)return;if(n>4&&fleet.scenarios[n].stats.some(s=>['day','night'].some(v=>scenarioTime(n,s,v)===null))){note.textContent='Допущения посадки превышают замеренное время. Уменьшите их; карта оставлена без изменения.';return;}if(TripDirections.isOutbound()&&n!==4)return;current=n;remembered=n;const source=n===4?baseline:fleet.scenarios[n].data,next=compact&&stopPlan?consolidateDocument(source,n,stopPlan):clone(source);for(const b of pickupTools.querySelectorAll('button')){b.disabled=!stopPlan;b.setAttribute('aria-pressed',String(compact===(b.dataset.stopPlan==='compact')))}for(const key of Object.keys(data))delete data[key];Object.assign(data,next);
  if(n>4){for(const s of fleet.scenarios[n].stats){if(!s.changed)continue;const day=scenarioTime(n,s,'day'),night=scenarioTime(n,s,'night'),route=data.routes.find(r=>r.id===s.id),total=route.xy.slice(1).reduce((v,p,i)=>v+Math.hypot(p[0]-route.xy[i][0],p[1]-route.xy[i][1]),0);for(const p of data.points.filter(p=>p.route===s.id)){p.estimatedMorning=Math.round(465-day+day*p.routePosition/total);p.estimatedEvening=Math.round(1185-night+night*p.routePosition/total)}}}
  for(const r of data.routes)colors[r.id-1]=['#7dc5d5','#e69be8','#ff977c','#b5a7ff','#edbf70','#65d9b3'][r.id-1];buttons();openRoute(0);syncShift();for(const b of controls.querySelectorAll('[data-fleet]'))b.setAttribute('aria-pressed',String(Number(b.dataset.fleet)===n));note.textContent=n===4?'Исходная схема · 4 маршрута':'Проект · '+n+' автобусов · разгружены №1–№4 · время расчётное';
 }
 document.addEventListener('tripdirectionchange',()=>{const outbound=TripDirections.isOutbound();for(const b of controls.querySelectorAll('[data-fleet]')){b.disabled=outbound||(!fleet&&b.dataset.fleet!=='4');if(outbound)b.setAttribute('aria-pressed',String(b.dataset.fleet==='4'))}for(const b of pickupTools.querySelectorAll('button'))b.disabled=outbound||!stopPlan;if(outbound){current=4;buttons();openRoute(0);note.textContent='Развоз с базы · исходные 4 маршрута. Сценарии 5/6 рассчитаны только для привоза.';renderPanel()}else apply(remembered)});
 function refreshTimes(){const outbound=TripDirections.isOutbound();for(const [id,value]of [['day',outbound?'08:15':'07:45'],['night',outbound?'20:15':'19:45']])$('#'+id+' span').textContent=value}
 $('#mapTheme')?.addEventListener('change',refreshTimes);
 const oldRoute=openRoute;openRoute=function(id){oldRoute(id);refreshTimes();renderPanel()};
 const oldShift=syncShift;syncShift=function(){oldShift();refreshTimes();if(!TripDirections.isOutbound())note.textContent=current===4?'Исходная схема · 4 маршрута':'Проект · '+current+' автобусов · разгружены №1–№4 · время расчётное';renderPanel()};
 note.textContent='Исходная схема · 4 маршрута';buttons();openRoute(0);
 Promise.all([fetch('./fleet-scenarios.json?v=20261104',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('data');return r.json()}),fetch('./stop-consolidation-balanced.json?v=20261109',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('plan');return r.json()}).catch(()=>null),fetch('./fleet-balanced.json?v=20261109',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('balanced');return r.json()})]).then(([v,p,b])=>{fleet={...v,scenarios:b.scenarios};stopPlan=p;if(!p)compact=false;for(const b of controls.querySelectorAll('[data-fleet]'))b.disabled=TripDirections.isOutbound();if(!TripDirections.isOutbound())apply(current);else renderPanel()}).catch(()=>{note.textContent='Сценарии не загрузились. Доступна исходная схема; обновите страницу.';panel.textContent='Время маршрутов не загрузилось. Обновите страницу.'});
})();
