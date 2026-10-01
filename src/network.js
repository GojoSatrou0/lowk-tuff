import {readApiResponse,ensureServerReady} from './api.js';
import {FORCE_HTTP} from './deployment.js';
export class ArenaNetwork {
  constructor(onSnapshot,onError){this.onSnapshot=onSnapshot;this.onError=onError;this.token=null;this.ws=null;this.timer=null;this.transport='connecting';this.pollLabel=location.protocol==='https:'?'HTTPS polling':'HTTP polling';this.ping=0;this.busy=false;this.failures=0;this.lastReceive=0;this.generation=0;}
  async request(data){const start=performance.now();const response=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,token:this.token}),signal:AbortSignal.timeout(5000)});const body=await readApiResponse(response);this.ping=Math.round(performance.now()-start);return body;}
  async connect(action,options,input){
    options={...options,http:options.http||FORCE_HTTP};
    const leaving=this.close(),generation=this.generation;await leaving;if(generation!==this.generation)return null;
    await ensureServerReady(()=>this.onError('Waking the free game server. This can take about a minute.'));if(generation!==this.generation)return null;
    const s=await this.request({action,...options});if(generation!==this.generation){if(s.token)await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'leave',token:s.token}),keepalive:true}).catch(()=>{});return null;}
    this.token=s.token;this.you=s.you;this.code=s.room;this.forceHTTP=options.http;this.transport=this.pollLabel;this.input=input;this.lastReceive=performance.now();this.onSnapshot(s);
    if(!options.http)this.openSocket();
    this.timer=setInterval(()=>this.send(),options.http?80:33);return s;
  }
  openSocket(){
    const ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/socket`);this.ws=ws;
    const timeout=setTimeout(()=>{if(this.transport!=='WebSocket')ws.close();},2200);
    ws.onopen=()=>ws.send(JSON.stringify({token:this.token}));
    ws.onmessage=e=>{if(this.ws!==ws)return;try{const s=JSON.parse(e.data);if(s.type==='snapshot'){clearTimeout(timeout);this.transport='WebSocket';this.lastReceive=performance.now();this.failures=0;this.onSnapshot(s);}else if(s.type==='error')this.onError(s.error);}catch{this.onError('The server returned an invalid update.');}};
    ws.onerror=()=>{};ws.onclose=()=>{clearTimeout(timeout);if(this.ws===ws){this.ws=null;this.transport=this.pollLabel;}};
  }
  async send(){
    if(!this.token)return;
    if(this.ws?.readyState===1&&this.transport==='WebSocket'){
      if(performance.now()-this.lastReceive>3500){this.ws.close();this.transport=this.pollLabel;return;}
      if(this.ws.bufferedAmount<16384)this.ws.send(JSON.stringify({action:'input',input:this.input()}));
      if(!this.lastPing||performance.now()-this.lastPing>5000){this.lastPing=performance.now();this.request({action:'poll'}).catch(()=>{});}return;
    }
    if(this.busy||performance.now()-(this.lastPoll||0)<75)return;
    this.busy=true;this.lastPoll=performance.now();const generation=this.generation;
    try{const s=await this.request({action:'input',input:this.input()});if(generation!==this.generation)return;this.lastReceive=performance.now();this.failures=0;this.onSnapshot(s);}
    catch(e){if(generation!==this.generation)return;if(e.status===410||++this.failures>=4){this.close();this.onError(e.status===410?e.message:'Connection lost. Rejoin the room when your connection is back.',true);}}
    finally{this.busy=false;}
  }
  async ready(){const s=await this.request({action:'ready'});this.onSnapshot(s);}
  close(){const token=this.token;this.generation++;clearInterval(this.timer);this.timer=null;this.token=null;this.ws?.close();this.ws=null;this.transport='offline';this.busy=false;if(token)this.leaving=fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'leave',token}),keepalive:true,signal:AbortSignal.timeout(5000)}).catch(()=>{});return this.leaving;}
}
