const C="lagomo-v1";
self.addEventListener("install",e=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||new URL(e.request.url).pathname.startsWith("/api/"))return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c)).catch(()=>{});return r}).catch(()=>caches.match(e.request).then(m=>m||caches.match("/"))))});
// Alerts from friends. One notification per friend and kind (the tag replaces the old one, so nothing stacks up).
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){}
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{
    if(cs.some(c=>c.visibilityState==="visible"&&c.focused))return; // you are looking at the app: it shows its own message
    return self.registration.showNotification(d.title||"Lagomo",{body:d.body||"",tag:d.tag||"lagomo",renotify:false,icon:"/icon.svg",badge:"/icon.svg",data:{url:d.url||"/"}});
  }))});
self.addEventListener("notificationclick",e=>{e.notification.close();const url=(e.notification.data&&e.notification.data.url)||"/";
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{for(const c of cs){if("focus"in c){try{c.postMessage({type:"open",url:url});}catch(_){}return c.focus();}}return self.clients.openWindow(url);}))});
