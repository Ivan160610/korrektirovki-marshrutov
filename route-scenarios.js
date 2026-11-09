/* Draft fleet scenarios. Recorded trials are kept distinct from model estimates. */
(()=>{
 const $=s=>document.querySelector(s),clone=x=>JSON.parse(JSON.stringify(x)),baseline=clone(data);let fleet=null,current=4,remembered=4;const assumptions={stop:1.5,pax:4};
 document.body.classList.add('fleet-planning');
 const header=$('header.app-header'),center=document.createElement('div');center.className='fleet-header';header.append(center);
 const picker=$('.route-picker'),time=document.createElement('div');time.className='fleet-time';time.append($('.trip-direction-tabs'),$('.shifts'));picker.prepend(time);center.append(picker);
 const controls=document.createElement('div');controls.className='fleet-tools';controls.setAttribute('role','group');controls.setAttribute('aria-label','Количество автобусов');controls.append(Object.assign(document.createElement('span'),{textContent:'Автобусов:'}));
 for(const n of [4,5,6]){const b=document.createElement('button');b.type='button';b.dataset.fleet=n;b.textContent=n;b.disabled=n!==4;b.setAttribute('aria-pressed',String(n===4));b.onclick=()=>apply(n);controls.append(b)}
 center.append(controls);
 const panel=document.createElement('aside');panel.className='fleet-summary';panel.setAttribute('aria-label','Маршруты и время в пути');panel.setAttribute('aria-live','polite');$('.map').append(panel);
 const note=document.createElement('div');note.className='fleet-note';note.setAttribute('role','status');$('.map').append(note);
 function estimate(s,variant){if(s.legs){let total=5+s.occupied*assumptions.stop+s.count*assumptions.pax/60;for(const leg of s.legs){const b=fleet.baseline.find(b=>b.id===leg.source),moving=b[variant]-5-b.occupied*assumptions.stop-b.count*assumptions.pax/60;if(moving<0)return null;total+=leg.minutes*moving/b.driveMinutes}return Math.ceil(total)}const source=fleet.baseline.find(b=>b.id===s.source);if(!s.changed)return s[variant];const base=source[variant],dwell=source.occupied*assumptions.stop+source.count*assumptions.pax/60,rate=(base-5-dwell)/source.weighted;if(rate<0)return null;let chosen=rate;if(current!==6&&s.id===5){const other=fleet.baseline[1],r=(other[variant]-5-other.occupied*assumptions.stop-other.count*assumptions.pax/60)/other.weighted;chosen=Math.max(rate,r)}return Math.ceil(5+s.weighted*chosen+s.occupied*assumptions.stop+s.count*assumptions.pax/60)}
 function scenarioTime(n,s,variant){const save=current;current=n;const value=estimate(s,variant);current=save;return value}
 function renderPanel(){
  const focused=panel.contains(document.activeElement)?document.activeElement.dataset.summaryRoute:null;panel.replaceChildren();
  const outbound=TripDirections.isOutbound(),variant=shift==='night'?'night':'day';
  const heading=document.createElement('h2');heading.textContent='Время в пути';
  const subtitle=document.createElement('p');subtitle.className='fleet-summary-subtitle';subtitle.textContent=(outbound?'От базы в ':'На базе к ')+(outbound?(variant==='night'?'20:15':'08:15'):(variant==='night'?'19:45':'07:45'));
  panel.append(heading,subtitle);
  if(!fleet&&!outbound){const loading=document.createElement('p');loading.textContent='Загружаем время маршрутов…';panel.append(loading);return}
  const rows=document.createElement('div');rows.className='fleet-summary-rows';
  for(const route of data.routes){
   const stat=outbound?null:(current===4?fleet.baseline:fleet.scenarios[current].stats).find(s=>s.id===route.id);
   const original=stat&&fleet.baseline.find(s=>s.id===(current===4?stat.id:stat.source));
   let value=stat?(current===4?stat[variant]:scenarioTime(current,stat,variant)):null;
   if(outbound){const key=variant==='night'?'evening':'morning',departure=variant==='night'?1215:495;
    const times=data.points.filter(p=>p.route===route.id&&p.dropoff).map(p=>p[key]).filter(Number.isFinite);if(times.length)value=Math.max(...times)-departure}
   const row=document.createElement('button');row.type='button';row.className='fleet-summary-row';row.dataset.summaryRoute=route.id;row.setAttribute('aria-pressed',String(selected===route.id));row.title=route.title;row.onclick=()=>openRoute(route.id);
   const number=document.createElement('span');number.className='fleet-summary-number';number.textContent='№'+route.id;number.style.setProperty('--route-color',colors[route.id-1]);
   const timing=document.createElement('span');timing.className='fleet-summary-timing';
   const total=document.createElement('strong');total.textContent=value===null?'—':(current>4&&stat?.changed?'≈ ':'')+value+' мин';timing.append(total);
   const basis=document.createElement('small');basis.textContent=outbound?'План':current===4?(variant==='night'&&stat.measured?'Факт заезда':'По расписанию'):'Было '+(original.id!==route.id?'№'+original.id+' · ':'')+original[variant]+' мин';timing.append(basis);row.append(number,timing);
   if(!outbound&&current>4&&value!==null){const delta=original[variant]-value,badge=document.createElement('span');badge.className='fleet-saving'+(delta>0?' is-reduced':delta<0?' is-increased':'');
    if(delta!==0){const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.className='fleet-saving-arrow';arrow.textContent=delta>0?'↓':'↑';badge.append(arrow)}
    badge.append(document.createTextNode(delta===0?'Без изменений':Math.abs(delta)+' мин'));
    badge.setAttribute('aria-label',delta>0?'Сокращение времени на '+delta+' минут':delta<0?'Увеличение времени на '+Math.abs(delta)+' минут':'Время не изменилось');row.append(badge)}
   rows.append(row);
  }
  panel.append(rows);if(focused)rows.querySelector('[data-summary-route="'+focused+'"]')?.focus({preventScroll:true});
  const caption=document.createElement('p');caption.className='fleet-summary-caption';caption.textContent=outbound?'Плановое время развоза.':current===4?'Длительность от первой посадки до базы.':'Расчётное сокращение относительно 4 автобусов. Для новых №5/6 указан исходный маршрут. Пробки не учитываются.';panel.append(caption);
 }
 function buttons(){const choices=$('.route-choices');choices.replaceChildren();$('#routeSelect').replaceChildren();for(const id of [0,...data.routes.map(r=>r.id)]){const r=data.routes.find(r=>r.id===id),b=document.createElement('button'),o=document.createElement('option');b.type='button';b.dataset.pickRoute=id;b.textContent=id?'№'+id:'Все';b.setAttribute('aria-label',r?'Показать маршрут №'+id+' — '+r.title:'Показать все маршруты');b.title=r?.title||'Все маршруты';b.onclick=()=>openRoute(id);choices.append(b);o.value=id;o.textContent=b.textContent;$('#routeSelect').append(o)}}
 function apply(n){if(n>4&&!fleet)return;if(n>4&&fleet.scenarios[n].stats.some(s=>['day','night'].some(v=>scenarioTime(n,s,v)===null))){note.textContent='Допущения посадки превышают замеренное время. Уменьшите их; карта оставлена без изменения.';return;}if(TripDirections.isOutbound()&&n!==4)return;current=n;remembered=n;const next=clone(n===4?baseline:fleet.scenarios[n].data);for(const key of Object.keys(data))delete data[key];Object.assign(data,next);
  if(n>4){for(const s of fleet.scenarios[n].stats){if(!s.changed)continue;const day=scenarioTime(n,s,'day'),night=scenarioTime(n,s,'night'),route=data.routes.find(r=>r.id===s.id),total=route.xy.slice(1).reduce((v,p,i)=>v+Math.hypot(p[0]-route.xy[i][0],p[1]-route.xy[i][1]),0);for(const p of data.points.filter(p=>p.route===s.id)){p.estimatedMorning=Math.round(465-day+day*p.routePosition/total);p.estimatedEvening=Math.round(1185-night+night*p.routePosition/total)}}}
  for(const r of data.routes)colors[r.id-1]=['#7dc5d5','#e69be8','#ff977c','#b5a7ff','#edbf70','#65d9b3'][r.id-1];buttons();openRoute(0);syncShift();for(const b of controls.querySelectorAll('[data-fleet]'))b.setAttribute('aria-pressed',String(Number(b.dataset.fleet)===n));note.textContent=n===4?'Исходная схема · 4 маршрута':'Проект · '+n+' автобусов · время на карте рассчитано для прибытия к '+(shift==='night'?'19:45':'07:45')+' · не факт';
 }
 document.addEventListener('tripdirectionchange',()=>{const outbound=TripDirections.isOutbound();for(const b of controls.querySelectorAll('[data-fleet]')){b.disabled=outbound||(!fleet&&b.dataset.fleet!=='4');if(outbound)b.setAttribute('aria-pressed',String(b.dataset.fleet==='4'))}if(outbound){current=4;buttons();openRoute(0);note.textContent='Развоз с базы · исходные 4 маршрута. Сценарии 5/6 рассчитаны только для привоза.';renderPanel()}else apply(remembered)});
 function refreshTimes(){const outbound=TripDirections.isOutbound();for(const [id,value]of [['day',outbound?'08:15':'07:45'],['night',outbound?'20:15':'19:45']])$('#'+id+' span').textContent=value}
 $('#mapTheme')?.addEventListener('change',refreshTimes);
 const oldRoute=openRoute;openRoute=function(id){oldRoute(id);refreshTimes();renderPanel()};
 const oldShift=syncShift;syncShift=function(){oldShift();refreshTimes();if(current>4&&!TripDirections.isOutbound())note.textContent='Проект · '+current+' автобусов · время на карте для прибытия к '+(shift==='night'?'19:45':'07:45')+' · не факт';renderPanel()};
 note.textContent='Исходная схема · 4 маршрута';buttons();openRoute(0);
 fetch('./fleet-scenarios.json?v=20261104',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('data');return r.json()}).then(v=>{fleet=v;for(const b of controls.querySelectorAll('[data-fleet]'))b.disabled=TripDirections.isOutbound();renderPanel()}).catch(()=>{note.textContent='Сценарии не загрузились. Доступна исходная схема; обновите страницу.';panel.textContent='Время маршрутов не загрузилось. Обновите страницу.'});
})();
