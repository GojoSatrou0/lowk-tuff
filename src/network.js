import {readApiResponse,ensureServerReady} from './api.js';
import {FORCE_HTTP,SOCKET_URL} from './deployment.js';
export class ArenaNetwork {
  constructor(onSnapshot,onError,{socketUrl=SOCKET_URL,createSocket=url=>new WebSocket(url),now=()=>performance.now()}={}){
    Object.assign(this,{onSnapshot,onError,socketUrl,createSocket,now});
    this.token=null;this.ws=null;this.timer=null;this.transport='connecting';this.pollLabel=location.protocol==='https:'?'HTTPS polling':'HTTP polling';this.ping=0;this.busy=false;this.failures=0;this.lastReceive=0;this.generation=0;this.nextSocketAttempt=0;this.socketBackoff=5000;this.lastSnapshotTime=-1;this.pingSeq=0;
  }
  async request(data){const start=this.now();const response=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,token:this.token}),signal:AbortSignal.timeout(5000)});const body=await readApiResponse(response);if(this.transport!=='WebSocket')this.ping=Math.round(this.now()-start);return body;}
  receive(s){if(Number.isFinite(s.time)&&s.time<this.lastSnapshotTime)return;this.lastSnapshotTime=s.time??this.lastSnapshotTime;this.onSnapshot(s);}
  async connect(action,options,input){
    options={...options,http:options.http||FORCE_HTTP};
    const leaving=this.close(),generation=this.generation;await leaving;if(generation!==this.generation)return null;
    await ensureServerReady(()=>this.onError('Waking the free game server. This can take about a minute.'));if(generation!==this.generation)return null;
    const s=await this.request({action,...options});if(generation!==this.generation){if(s.token)await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'leave',token:s.token}),keepalive:true}).catch(()=>{});return null;}
    this.token=s.token;this.you=s.you;this.code=s.room;this.forceHTTP=options.http;this.transport=this.pollLabel;this.input=input;this.lastReceive=this.now();this.receive(s);
    if(!options.http)this.openSocket();
    this.timer=setInterval(()=>this.send(),options.http?80:33);return s;
  }
  openSocket(){
    if(!this.token||this.forceHTTP||this.ws)return;
    const generation=this.generation,token=this.token;
    this.nextSocketAttempt=this.now()+this.socketBackoff;this.socketBackoff=Math.min(this.socketBackoff*2,30000);
    let ws;try{ws=this.createSocket(this.socketUrl||`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/socket`);}catch{return;}
    this.ws=ws;const current=()=>this.ws===ws&&this.generation===generation&&this.token===token;
    const timeout=setTimeout(()=>{if(current()&&this.transport!=='WebSocket')ws.close();},15000);
    ws.onopen=()=>{if(current())ws.send(JSON.stringify({token}));else ws.close();};
    ws.onmessage=e=>{if(!current())return;try{const s=JSON.parse(e.data);
      if(s.type==='snapshot'){clearTimeout(timeout);this.transport='WebSocket';this.socketBackoff=5000;this.lastReceive=this.now();this.failures=0;this.receive(s);}
      else if(s.type==='pong'&&s.id===this.pendingPing?.id){this.ping=Math.round(this.now()-this.pendingPing.at);this.pendingPing=null;}
      else if(s.type==='error')this.onError(s.error);
    }catch{this.onError('The server returned an invalid update.');}};
    ws.onerror=()=>{};ws.onclose=()=>{clearTimeout(timeout);if(current()){this.ws=null;this.transport=this.pollLabel;this.pendingPing=null;this.nextSocketAttempt=this.now()+this.socketBackoff;}};
  }
  async send(){
    if(!this.token)return;
    if(!this.forceHTTP&&!this.ws&&this.now()>=this.nextSocketAttempt)this.openSocket();
    if(this.ws?.readyState===1&&this.transport==='WebSocket'){
      if(this.now()-this.lastReceive>3500){this.ws.close();this.transport=this.pollLabel;return;}
      if(this.ws.bufferedAmount<16384){this.ws.send(JSON.stringify({action:'input',input:this.input()}));
        if(!this.lastPing||this.now()-this.lastPing>3000){this.lastPing=this.now();this.pendingPing={id:++this.pingSeq,at:this.now()};this.ws.send(JSON.stringify({action:'ping',id:this.pendingPing.id}));}
      }return;
    }
    if(this.busy||this.now()-(this.lastPoll||0)<75)return;
    this.busy=true;this.lastPoll=this.now();const generation=this.generation;
    try{const s=await this.request({action:'input',input:this.input()});if(generation!==this.generation||this.transport==='WebSocket')return;this.lastReceive=this.now();this.failures=0;this.receive(s);}
    catch(e){if(generation!==this.generation||this.transport==='WebSocket')return;if(e.status===410||++this.failures>=4){this.close();this.onError(e.status===410?e.message:'Connection lost. Rejoin the room when your connection is back.',true);}}
    finally{if(generation===this.generation)this.busy=false;}
  }
  async ready(){const generation=this.generation,s=await this.request({action:'ready'});if(generation===this.generation)this.receive(s);}
  close(){const token=this.token,ws=this.ws;this.generation++;clearInterval(this.timer);this.timer=null;this.token=null;this.ws=null;ws?.close();this.transport='offline';this.busy=false;this.failures=0;this.lastPoll=0;this.lastPing=0;this.pendingPing=null;this.nextSocketAttempt=0;this.socketBackoff=5000;this.lastSnapshotTime=-1;if(token)this.leaving=fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'leave',token}),keepalive:true,signal:AbortSignal.timeout(5000)}).catch(()=>{});return this.leaving;}
}
