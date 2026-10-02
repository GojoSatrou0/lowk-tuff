import test from 'node:test';import assert from 'node:assert/strict';
import {ArenaNetwork} from '../src/network.js';import {createArenaServer} from '../server.js';import {WebSocket} from 'ws';
class FakeSocket {constructor(url){this.url=url;this.readyState=0;this.bufferedAmount=0;this.sent=[];}open(){this.readyState=1;this.onopen?.();}send(raw){this.sent.push(JSON.parse(raw));}message(s){this.onmessage?.({data:JSON.stringify(s)});}close(){this.readyState=3;this.onclose?.();}}
function fixture(t){const previousLocation=globalThis.location;globalThis.location={protocol:'https:',host:'frontend.example'};t.after(()=>{if(previousLocation===undefined)delete globalThis.location;else globalThis.location=previousLocation;});t.mock.method(globalThis,'fetch',async()=>Response.json({}));let time=1000;const sockets=[],snapshots=[],errors=[];
  const net=new ArenaNetwork(s=>snapshots.push(s),(...e)=>errors.push(e),{socketUrl:'wss://backend.example/socket',createSocket:url=>{const ws=new FakeSocket(url);sockets.push(ws);return ws;},now:()=>time});net.token='private-room-token';net.input=()=>({seq:1});net.transport=net.pollLabel;t.after(()=>net.close());return {net,sockets,snapshots,errors,advance:ms=>time+=ms};}
test('direct socket authenticates with the room token, sends continuous input and measures socket RTT without HTTP polls',async t=>{
  const f=fixture(t);f.net.openSocket();const ws=f.sockets[0];assert.equal(ws.url,'wss://backend.example/socket');ws.open();assert.deepEqual(ws.sent[0],{token:'private-room-token'});ws.message({type:'snapshot',time:1});
  f.net.request=()=>{throw Error('WebSocket gameplay must not poll HTTP');};await f.net.send();assert(ws.sent.some(x=>x.action==='input'));const ping=ws.sent.find(x=>x.action==='ping');f.advance(92);ws.message({type:'pong',id:ping.id});assert.equal(f.net.ping,92);assert.equal(f.errors.length,0);
});
test('slow secure socket setup has fifteen seconds to connect, while an unresponsive attempt still expires',t=>{
  t.mock.timers.enable({apis:['setTimeout']});const f=fixture(t);f.net.openSocket();const slow=f.sockets[0];
  t.mock.timers.tick(6000);assert.equal(slow.readyState,0);slow.open();slow.message({type:'snapshot',time:1});t.mock.timers.tick(15000);assert.equal(slow.readyState,1);assert.equal(f.net.transport,'WebSocket');
  slow.close();f.net.openSocket();const stalled=f.sockets[1];t.mock.timers.tick(14999);assert.equal(stalled.readyState,0);t.mock.timers.tick(1);assert.equal(stalled.readyState,3);assert.equal(f.net.transport,'HTTPS polling');
});
test('late polling data and errors cannot rewind or disconnect a recovered WebSocket session',async t=>{
  const f=fixture(t);let resolve;f.net.request=()=>new Promise(r=>{resolve=r;});const polling=f.net.send(),ws=f.sockets[0];ws.open();ws.message({type:'snapshot',time:10});resolve({time:2});await polling;assert.deepEqual(f.snapshots.map(s=>s.time),[10]);
  ws.close();f.advance(31000);let reject;f.net.request=()=>new Promise((_,r)=>{reject=r;});const failing=f.net.send(),recovered=f.sockets[1];recovered.open();recovered.message({type:'snapshot',time:11});reject(Object.assign(Error('old session expired'),{status:410}));await failing;assert.equal(f.net.transport,'WebSocket');assert(f.net.token);assert.equal(f.errors.length,0);
  f.net.receive({time:3});assert.deepEqual(f.snapshots.map(s=>s.time),[10,11]);
});
test('failed sockets use polling, retry with backoff, and compatibility mode never opens sockets',async t=>{
  const f=fixture(t);f.net.request=async()=>({time:1});await f.net.send();f.sockets[0].close();f.advance(100);await f.net.send();assert.equal(f.sockets.length,1);assert.equal(f.net.transport,'HTTPS polling');f.advance(31000);await f.net.send();assert.equal(f.sockets.length,2);f.sockets[1].close();f.net.forceHTTP=true;f.advance(31000);await f.net.send();assert.equal(f.sockets.length,2);
});
test('socket callbacks from a previous room cannot authenticate or update its replacement',async t=>{
  const f=fixture(t);f.net.openSocket();const stale=f.sockets[0];await f.net.close();f.net.token='new-room-token';f.net.openSocket();stale.open();stale.message({type:'snapshot',time:999});assert.equal(stale.sent.length,0);assert.equal(f.snapshots.length,0);f.sockets[1].open();assert.deepEqual(f.sockets[1].sent[0],{token:'new-room-token'});
});
test('configured Netlify origin can use a cross-site socket and ping, but other origins and cross-site account POSTs remain rejected',async t=>{
  const origin='https://frontend.example',app=createArenaServer({port:0,host:'127.0.0.1',publicOrigin:origin}),address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const post=async(data,headers={})=>fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});
  const room=await(await post({action:'create'})).json();
  const ws=new WebSocket(base.replace('http:','ws:')+'/socket',{origin,headers:{'Sec-Fetch-Site':'cross-site'}});t.after(()=>ws.terminate());
  const pong=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No pong')),2500);ws.once('error',reject);ws.on('message',raw=>{const s=JSON.parse(raw);if(s.type==='snapshot'){assert.equal(s.you,room.you);ws.send(JSON.stringify({action:'ping',id:42}));}if(s.type==='pong'){clearTimeout(timer);resolve(s);}});});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({token:room.token}));assert.deepEqual(await pong,{type:'pong',id:42});
  for(const badOrigin of ['https://evil.example','https://frontend.example.evil.example','http://frontend.example'])await new Promise((resolve,reject)=>{const bad=new WebSocket(base.replace('http:','ws:')+'/socket',{origin:badOrigin,headers:{'Sec-Fetch-Site':'cross-site'}});bad.once('open',()=>{bad.terminate();reject(Error('Untrusted origin accepted'));});bad.once('error',()=>resolve());});
  assert.equal((await post({action:'profile'},{Origin:origin,'Sec-Fetch-Site':'cross-site'})).status,403);
});
