import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes,createHash } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { TICK, MAPS, createMatch, createPlayer, cleanInput, resetPlayer, mapById, readyPlayer, stepMatch, snapshot, emit } from './src/shared.js';
import { ProfileStore,normalizeEmail } from './profile-store.js';
import { rewardFor } from './src/economy.js';
import { createBot,botInput } from './src/bot.js';

const ROOT=fileURLToPath(new URL('.',import.meta.url));
export function createArenaServer({port=Number(process.env.PORT)||3000,host=process.env.HOST||'0.0.0.0',dataDir=null,profileStore=null,secureCookies=process.env.NODE_ENV==='production',publicOrigin=process.env.PUBLIC_ORIGIN||''}={}){
  if(publicOrigin){const url=new URL(publicOrigin);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('PUBLIC_ORIGIN must be the exact frontend origin, without a path.');publicOrigin=url.origin;}
  const rooms=new Map(),sessions=new Map(),limits=new Map();
  const profiles=profileStore||new ProfileStore(dataDir);
  const maxRooms=100, ttl=15000;
  function rate(ip,kind,max,window){const key=`${kind}:${ip}`,now=Date.now();let r=limits.get(key);if(!r||now>r.until){r={n:0,until:now+window};limits.set(key,r);}return ++r.n<=max;}
  function response(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
  function safeOrigin(req){if(req.headers['sec-fetch-site']==='cross-site')return false;if(!req.headers.origin)return true;try{const origin=new URL(req.headers.origin);return origin.host===req.headers.host||(publicOrigin&&origin.origin===publicOrigin);}catch{return false;}}
  const fail=(message,status=400)=>Object.assign(new Error(message),{status});
  function cookieToken(req){return String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('velocity_session='))?.slice('velocity_session='.length)||null;}
  function setCookie(res,token){res.setHeader('Set-Cookie',`velocity_session=${token||''}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token?2592000:0}${secureCookies?'; Secure':''}`);}
  function auth(req,res){const token=cookieToken(req),identity=profiles.authenticate(token);if(token&&!identity){setCookie(res,null);throw fail('Your sign-in expired. Sign in again to load your saved progress.',401);}return identity;}
  function requireLobby(profileId){if(profileId&&[...sessions.values()].some(s=>s.profileId===profileId))throw fail('Leave your room before changing your account or armory.',409);}
  function checkIdentity(data,identity){if(Object.hasOwn(data,'expectedUser')&&data.expectedUser!==(identity?.user.username||null))throw fail('Your account changed in another tab. Refresh to load it.',409);}
  function view(s){return {...snapshot(s.room.match),you:s.id,room:s.room.code,practice:!!s.room.practice,paused:!!s.room.paused,profile:profiles.getById(s.profileId)};}
  function session(data){const s=sessions.get(data.token);if(s?.authSession&&!profiles.sessionActive(s.authSession)){leave(s);throw fail('Your sign-in expired. Sign in again.',401);}if(!s)throw fail('Session expired. Create or join a room again.',410);s.seen=Date.now();return s;}
  function leave(s){
    if(!sessions.has(s.token))return;sessions.delete(s.token);s.socket?.close(1000,'Left room');
    const r=s.room;r.match.players=r.match.players.filter(p=>p.id!==s.id);delete r.inputs[s.id];
    if(!r.match.players.length||r.practice){rooms.delete(r.code);return;}
    r.match.phase='waiting';r.match.clock=0;r.match.winner=null;r.match.round=1;
    for(const p of r.match.players){p.score=0;p.ready=false;}emit(r.match,'disconnect',{player:s.id});
  }
  function action(data,ip,identity=null){
    if(!data||typeof data!=='object'||Array.isArray(data))throw Object.assign(new Error('Invalid request'),{status:400});
    if(['profile','purchase','loadout'].includes(data.action)){
      if(data.action!=='profile')checkIdentity(data,identity);
      if(data.action==='profile'&&!identity&&!data.profileToken){if(!rate(ip,'profile',20,60000))throw fail('Please wait before creating another profile.',429);return profiles.create();}
      const profileId=identity?.profileId||profiles.guestId(data.profileToken),profile=profiles.getById(profileId);if(!profile)throw fail('Saved guest profile was not found. If you created an account, sign in to recover it.',410);
      if(data.action==='profile')return {profile,user:identity?.user||null};
      requireLobby(profileId);
      return {profile:data.action==='purchase'?profiles.purchaseById(profileId,data.weapon):profiles.equipById(profileId,data.loadout)};
    }
    if(data.action==='create'||data.action==='join'||data.action==='practice'){
      checkIdentity(data,identity);
      if(!rate(ip,'room',20,60000))throw Object.assign(new Error('Too many room requests. Please wait a minute.'),{status:429});
      let r;
      if(data.action==='create'||data.action==='practice'){
        if(rooms.size>=maxRooms)throw Object.assign(new Error('Server full'),{status:503});
        let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));
        r={code,match:createMatch(mapById(data.map).id),inputs:{},members:{},rewardCursor:0,practice:data.action==='practice',bot:createBot(),difficulty:['easy','normal','hard'].includes(data.difficulty)?data.difficulty:'normal',touched:Date.now()};
      }else{
        const code=String(data.room||'').trim().toUpperCase();r=rooms.get(code);
        if(!r)throw Object.assign(new Error('Room not found. Check the code and use the same server.'),{status:404});
        if(r.match.players.length>=2)throw Object.assign(new Error('Room full. This mode is a 1v1 duel.'),{status:409});
      }
      let profileToken=identity?null:data.profileToken,profileId=identity?.profileId||profiles.guestId(profileToken);
      if(profileToken&&!profileId)throw fail('Saved profile was not found on this server. Sign in if this wallet belongs to an account.',410);
      if(profileId&&[...sessions.values()].some(s=>s.profileId===profileId))throw fail('This profile already has an open room. Leave it in your other tab first.',409);
      if(!profileId){profileToken=profiles.create().profileToken;profileId=profiles.guestId(profileToken);}
      rooms.set(r.code,r);
      const token=randomBytes(32).toString('hex'),id=randomBytes(8).toString('hex');
      const slot=r.match.players.some(p=>p.slot===0)?1:0;
      const p=createPlayer(id,String(data.name||identity?.user.username||'Runner').replace(/[<>\x00-\x1f]/g,'').slice(0,18),slot);p.loadout=[...profiles.getById(profileId).loadout];p.weapon=p.loadout[0];resetPlayer(p,mapById(r.match.map));r.match.players.push(p);r.members[id]=profileId;
      if(r.practice){const bot=createPlayer('bot','ECHO',1);r.match.players.push(bot);readyPlayer(r.match,p);readyPlayer(r.match,bot);r.paused=true;}
      const s={token,id,room:r,profileId,authSession:identity?.sessionId||null,seen:Date.now(),inputAt:0,socket:null};sessions.set(token,s);return {token,profileToken,...view(s)};
    }
    const s=session(data),p=s.room.match.players.find(p=>p.id===s.id);
    if(data.action==='input'){
      const next=cleanInput(data.input),prev=s.room.inputs[s.id];
      if(!prev||next.seq>prev.seq){s.room.inputs[s.id]=next;s.inputAt=Date.now();}
    }else if(data.action==='ready'){readyPlayer(s.room.match,p);if(s.room.practice){s.room.bot=createBot();readyPlayer(s.room.match,s.room.match.players.find(p=>p.id==='bot'));}}
    else if(data.action==='leave'){leave(s);return {ok:true};}
    else if(data.action!=='poll')throw Object.assign(new Error('Unknown action'),{status:400});
    return view(s);
  }
  async function accountAction(data,ip,req,res){
    if(!data||typeof data!=='object'||Array.isArray(data))throw fail('Invalid request');
    const oldToken=cookieToken(req),old=profiles.authenticate(oldToken);
    if(data.action==='logout'){
      for(const s of sessions.values())if(old&&s.authSession===old.sessionId)leave(s);
      profiles.logout(oldToken);setCookie(res,null);return {ok:true};
    }
    if(!['register','login','add-email'].includes(data.action))throw fail('Unknown account action');
    if(old&&data.action!=='add-email')throw fail('Sign out before switching accounts.',409);
    const identifier=data.identifier??data.email??data.username;
    const rateIdentity=profiles.accountKey(identifier)||String(identifier||'').trim().toLowerCase().slice(0,254);
    const rateKey=createHash('sha256').update(data.action==='add-email'&&old?old.profileId:rateIdentity).digest('hex');
    if(!rate(ip,'auth',30,60000)||!rate(rateKey,'auth-name',10,60000))throw fail('Too many sign-in attempts. Try again in a minute.',429);
    let result;
    if(data.action==='add-email'){
      if(!old)throw fail('Sign in before adding an email.',401);
      checkIdentity(data,old);
      result=await profiles.addEmail(oldToken,data.email,data.password,requireLobby);
    }else if(data.action==='register'){
      if(!rate(ip,'register',10,3600000))throw fail('Too many account requests. Try again later.',429);
      normalizeEmail(data.email);
      result=await profiles.register(data.username,data.password,data.profileToken,requireLobby,data.email);
    }else result=await profiles.login(identifier,data.password);
    if(result.token)setCookie(res,result.token);
    return {user:result.user,profile:profiles.getById(result.profileId)};
  }
  async function body(req){let size=0;const parts=[];for await(const chunk of req){size+=chunk.length;if(size>16384)throw Object.assign(new Error('Request too large'),{status:413});parts.push(chunk);}try{return JSON.parse(Buffer.concat(parts).toString());}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}}
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost'),ip=req.socket.remoteAddress;
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    try{
      if(url.pathname==='/health'||url.pathname==='/api/status'){profiles.assertHealthy();response(res,200,{ok:true,name:'Velocity Arena',version:7,release:'1.8.0',speedClashes:true,rooms:rooms.size,accounts:true,emailAccounts:true,storage:profileStore?'database':dataDir?'disk':'memory',transports:['websocket','https-polling']});return;}
      if(url.pathname==='/api'||url.pathname==='/api/auth'){
        if(req.method!=='POST'){response(res,405,{error:'Use POST'});return;}
        if(!safeOrigin(req)){response(res,403,{error:'Origin not allowed'});return;}
        if(!String(req.headers['content-type']).startsWith('application/json')){response(res,415,{error:'JSON required'});return;}
        if(!rate(ip,'http',200,1000)){response(res,429,{error:'Slow down'});return;}
        profiles.assertHealthy();
        const data=await body(req);
        const accountRequest=url.pathname==='/api/auth'||data?.action==='account';
        const result=structuredClone(accountRequest?await accountAction(data?.action==='account'?{...data,action:data.operation}:data,ip,req,res):action(data,ip,auth(req,res)));
        await profiles.flush();
        response(res,200,result);return;
      }
      if(req.method!=='GET'&&req.method!=='HEAD'){response(res,405,{error:'Method not allowed'});return;}
      let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
      // Only public game files are exposed; server, tests, docs, and starter stay private.
      if(!/^(index\.html|styles\.css|app-icon\.svg|manifest\.webmanifest|robots\.txt|sitemap\.xml|src\/[a-z-]+\.js|assets\/[a-zA-Z0-9_.-]+)$/.test(relative)){response(res,404,{error:'Not found'});return;}
      const file=path.join(ROOT,relative);await stat(file);
      const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.webmanifest':'application/manifest+json','.glb':'model/gltf-binary'}[path.extname(file)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; media-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"});
      res.end(req.method==='HEAD'?undefined:await readFile(file));
    }catch(err){res.removeHeader('Set-Cookie');response(res,err.status||(err.code==='ENOENT'?404:400),{error:err.message});}
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{if(req.url!=='/socket'||!safeOrigin(req)||!rate(req.socket.remoteAddress,'upgrade',25,60000)){socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
  wss.on('connection',(ws,req)=>{
    let s=null;const authTimeout=setTimeout(()=>{if(!s)ws.close(1008,'Authentication required');},5000);authTimeout.unref();
    ws.on('message',raw=>{
      try{
        profiles.assertHealthy();
        if(!rate(req.socket.remoteAddress,'ws',180,1000)){ws.close(1008,'Rate limit');return;}
        const data=JSON.parse(raw);
        if(!s){s=session(data);s.socket?.close(1000,'Connection replaced');s.socket=ws;clearTimeout(authTimeout);if(profiles.settled)ws.send(JSON.stringify({type:'snapshot',...view(s)}));return;}
        // Socket identity comes from authentication, never from the input payload.
        if(data.action==='input'||data.action==='ready'||data.action==='poll')action({...data,token:s.token},req.socket.remoteAddress);
      }catch(err){ws.send(JSON.stringify({type:'error',error:err.message}));}
    });
    ws.on('close',()=>{clearTimeout(authTimeout);if(s?.socket===ws)s.socket=null;});ws.on('error',()=>{});
  });
  let ticks=0,last=performance.now(),acc=0;
  const timer=setInterval(()=>{
    try{profiles.assertHealthy();}catch{for(const ws of wss.clients)ws.close(1011,'Account storage unavailable');return;}
    const now=performance.now();acc=Math.min(acc+(now-last)/1000,.15);last=now;
    while(acc>=TICK){
      for(const r of rooms.values()){
        const inputs={};for(const p of r.match.players){const i=r.inputs[p.id];const s=[...sessions.values()].find(s=>s.id===p.id);inputs[p.id]=s&&Date.now()-s.inputAt<250?i:{...i,x:0,z:0,fire:false,jump:p.lastJump,slide:p.lastSlide,yaw:p.yaw,pitch:p.pitch,weapon:p.weapon};}
        if(r.practice){const human=r.match.players.find(p=>p.id!=='bot'),s=[...sessions.values()].find(s=>s.id===human?.id),i=inputs[human?.id];r.paused=!s||Date.now()-s.inputAt>500||!i||i.paused;
          if(r.paused)continue;
          inputs.bot=botInput(r.bot,r.match.players.find(p=>p.id==='bot'),human,r.match,TICK,r.difficulty);
        }
        stepMatch(r.match,inputs,TICK);
        const rewardEvents=r.match.events.filter(e=>e.id>r.rewardCursor);r.rewardCursor=r.match.eventSeq;
        for(const event of rewardEvents)for(const [id,profileId]of Object.entries(r.members)){
          if(!r.match.players.some(p=>p.id===id))continue;const amount=rewardFor(event,id);if(!amount)continue;
          const profile=profiles.rewardById(profileId,amount);if(profile)emit(r.match,'coins',{player:id,amount,balance:profile.coins,reason:event.type==='matchEnd'?'MATCH COMPLETE':'ROUND COMPLETE'});
        }
      }acc-=TICK;ticks++;
      if(ticks%3===0&&profiles.settled)for(const s of sessions.values())if(s.socket?.readyState===WebSocket.OPEN&&s.socket.bufferedAmount<65536)s.socket.send(JSON.stringify({type:'snapshot',...view(s)}));
    }
    if(ticks%60<2){for(const s of sessions.values())if(Date.now()-s.seen>ttl||(s.authSession&&!profiles.sessionActive(s.authSession)))leave(s);for(const [key,v]of limits)if(Date.now()>v.until)limits.delete(key);}
  },8);timer.unref();
  return {server,rooms,sessions,profiles,listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>resolve(server.address()));}),close:async()=>{await new Promise(resolve=>{clearInterval(timer);for(const ws of wss.clients)ws.terminate();wss.close();server.close(resolve);server.closeAllConnections();});await profiles.flush();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.env.REQUIRE_DATABASE==='true'&&!process.env.DATABASE_URL)throw Error('Cloud account storage must be configured.');
    let profileStore=null;
    if(process.env.DATABASE_URL){
      const {database,snapshotRepository}=await import('./database/neon.js');
      const {openDatabaseProfiles}=await import('./database/profile-store.js');
      profileStore=await openDatabaseProfiles(snapshotRepository(database(process.env.DATABASE_URL)));
    }
    const arena=createArenaServer({profileStore,dataDir:profileStore?null:process.env.DATA_DIR||path.join(ROOT,'data')});const address=await arena.listen();console.log(`\nVELOCITY ARENA\nOpen http://localhost:${address.port}\nLAN: open this computer's LAN IP on port ${address.port}.\nAccount storage: ${profileStore?'database':'local disk'}.\nKeep this window open. Ctrl+C stops the server.\n`);
    let stopping=false;
    const stop=async()=>{if(stopping)return;stopping=true;try{await arena.close();process.exit(0);}catch{process.exit(1);}};
    process.on('SIGINT',stop);process.on('SIGTERM',stop);
  }catch{console.error('Unable to start the arena. Check the database connection, run npm run db:migrate for cloud storage, and confirm the port is available. Private connection details are not logged.');process.exitCode=1;}
}
