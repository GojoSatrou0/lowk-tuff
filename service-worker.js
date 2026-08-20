const CACHE_NAME="owpl-cache-2026.08.20-central-https-relay1";
const CORE=["./","./index.html","./game.js","./manifest.webmanifest","./app-icon.svg","./offline.html","./version.json","./assets/KSR29_Sniper_GAME_1024.glb","./multiplayer-config.js"];
const PEERJS_URLS=[
  "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js",
  "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("owpl-cache-")&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

async function networkFirst(request,fallbackUrl=null){
  const cache=await caches.open(CACHE_NAME);
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),4500);
    const fresh=await fetch(request,{signal:controller.signal});
    clearTimeout(timer);
    if(fresh&&fresh.ok)cache.put(request,fresh.clone());
    return fresh;
  }catch(e){
    const cached=await cache.match(request);
    if(cached)return cached;
    if(fallbackUrl)return (await cache.match(fallbackUrl))||(await caches.match(fallbackUrl));
    throw e;
  }
}
async function peerCache(request){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response)cache.put(request,response.clone());
  return response;
}
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin===self.location.origin&&url.pathname.includes("/api/lan/")){event.respondWith(fetch(request));return;}
  if(request.mode==="navigate"){
    event.respondWith(networkFirst(request,"./index.html").catch(()=>caches.match("./offline.html")));
    return;
  }
  if(url.origin===self.location.origin){
    event.respondWith(networkFirst(request));
    return;
  }
  if(PEERJS_URLS.includes(request.url))event.respondWith(peerCache(request));
});
