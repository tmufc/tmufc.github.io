const CACHE='tmu-pos-v31';
const FILES=['./','./index.html','./condition.html','./training.html','./schedule.html','./fb.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
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
  e.waitUntil(self.registration.showNotification(title,{body:n.body||d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:d.tag||undefined,data:{url:d.url||'./'}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    const c=cs.find(x=>x.url.split('#')[0]===url.split('#')[0]);
    if(c){c.focus();return c.navigate?c.navigate(url):null;}
    return self.clients.openWindow(url);
  }));
});
