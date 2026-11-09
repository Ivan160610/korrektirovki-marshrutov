/* Pre-rendered, same-site map tiles. Only visible tiles are decoded by the browser. */
(function(){
 const ns='http://www.w3.org/2000/svg';
 window.LocalBasemap={create(layer,onState){
  let data=null,lastView=null,stamp='',lastState='loading',wanted=new Set();const nodes=new Map(),packages=new Map(),pending=new Map(),failed=new Set();
  function report(){const current=[...wanted].map(key=>nodes.get(key)).filter(Boolean);const state=!data?'loading':current.some(n=>n.dataset.state==='error')?'error':current.some(n=>n.dataset.state!=='ready')?'loading':'ready';if(state==='ready')for(const [key,image]of nodes)if(!wanted.has(key)){image.onload=null;image.onerror=null;image.remove();nodes.delete(key)}layer.dataset.state=state;if(state!==lastState){lastState=state;onState(state)}}
  function ensure(theme,level){
   const key=theme+'/'+level;if(packages.has(key)||pending.has(key)||failed.has(key))return;
   const request=fetch(`./local-basemap-${theme}-${level}.json?v=20261020-fast`,{credentials:'omit'}).then(response=>{if(!response.ok)throw Error('Local map '+response.status);return response.json()}).then(value=>{if(value.version!==1||value.theme!==theme||value.level!==level||!value.tiles)throw Error('Local map format');packages.set(key,value);pending.delete(key);stamp='';if(lastView)draw(...lastView)}).catch(()=>{pending.delete(key);failed.add(key);if(!data){layer.dataset.state='error';onState('error')}});pending.set(key,request);
  }
  function draw(view,width,dark){
   lastView=[{...view},width,dark];const desired=width>=900&&!dark?4:view.w/Math.max(width,1)>.65?1:4,theme=dark?'dark':'light';ensure(theme,desired);if(desired!==1)ensure(theme,1);
   data=packages.get(theme+'/'+desired)||packages.get(theme+'/1');if(!data)return;
   const [left,top,w,h]=data.bounds,size=data.tileSize,level=data.level,margin=size/2;
   const x1=Math.max(0,Math.floor((view.x-left-margin)/size)),x2=Math.min(Math.ceil(w/size)-1,Math.floor((view.x+view.w-left+margin)/size));
   const y1=Math.max(0,Math.floor((view.y-top-margin)/size)),y2=Math.min(Math.ceil(h/size)-1,Math.floor((view.y+view.h-top+margin)/size));
   const next=`${theme}/${level}/${x1}/${x2}/${y1}/${y2}`;if(stamp===next)return;stamp=next;
   wanted=new Set();
   for(let row=y1;row<=y2;row++)for(let col=x1;col<=x2;col++){
    const key=`${theme}/${level}/${col}/${row}`,payload=data.tiles[`${level}/${col}/${row}`];if(!payload)continue;wanted.add(key);if(nodes.has(key))continue;
    const image=document.createElementNS(ns,'image');image.dataset.state='loading';image.dataset.localTile=key;
    for(const [name,value]of Object.entries({x:left+col*size,y:top+row*size,width:Math.min(size,w-col*size),height:Math.min(size,h-row*size),preserveAspectRatio:'none'}))image.setAttribute(name,value);
    image.onload=()=>{image.dataset.state='ready';report()};image.onerror=()=>{image.dataset.state='error';report()};nodes.set(key,image);layer.append(image);image.setAttribute('href','data:image/webp;base64,'+payload);
   }
   report();
  }
  return {draw};
 }};
})();
