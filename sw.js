const CACHE='tmu-pos-v55';
const FILES=['./','./index.html','./condition.html','./training.html','./schedule.html','./review.html','./chat.html','./home.html','./fb.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!=='tmu-badge').map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    // ページは通信できればいつも最新を取り、できなければ保存済みを使う
    e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp));return r;}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
  }else if(url.hostname.endsWith('fonts.googleapis.com')||url.hostname.endsWith('fonts.gstatic.com')){
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));return res;})));
  }
});

// ---------- 通知 ----------
self.addEventListener('push',e=>{
  let p={};try{p=e.data?e.data.json():{};}catch(_){p={data:{body:e.data?e.data.text():''}};}
  const d=p.data||{},n=p.notification||{};
  const title=n.title||d.title||'TMU FC App';
  e.waitUntil(self.registration.showNotification(title,{body:n.body||d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:d.tag||undefined,data:{url:d.url||'./'}}).then(()=>bump(1)));
});
// アイコンの数字：アプリを開くとアプリ側が正しい数に直す。閉じている間は通知が来るたびに＋1
let BADGE=0;
async function getB(){try{const r=await (await caches.open('tmu-badge')).match('n');return r?(+(await r.text())||0):0;}catch(e){return BADGE;}}
async function putB(n){BADGE=n;try{await (await caches.open('tmu-badge')).put('n',new Response(String(n)));}catch(e){}}
async function bump(k){if(!self.navigator||!('setAppBadge' in self.navigator))return;const n=Math.max(0,(await getB())+k);await putB(n);try{n?await self.navigator.setAppBadge(n):await self.navigator.clearAppBadge();}catch(e){}}
self.addEventListener('message',e=>{if(e.data&&e.data.type==='badge')e.waitUntil(putB(Math.max(0,+e.data.n||0)));});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    const c=cs.find(x=>x.url.split('#')[0]===url.split('#')[0]);
    if(c){c.focus();return c.navigate?c.navigate(url):null;}
    return self.clients.openWindow(url);
  }));
});
