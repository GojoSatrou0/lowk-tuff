const unavailable='The game server returned a page instead of game data. Restart START_GAME.bat from the updated project folder, then reopen the game. Hosted games need the updated Node server running.';
export async function readApiResponse(response){
  if(!/application\/(?:[a-z0-9.-]+\+)?json\b/i.test(response.headers.get('content-type')||''))throw Object.assign(new Error(globalThis.location?.hostname?.endsWith('.netlify.app')?'This Netlify site is not connected to the game server. Accounts and online play will work after the site owner finishes backend setup.':unavailable),{status:response.status,code:'WRONG_SERVER'});
  let body;try{body=await response.json();}catch{throw Object.assign(new Error('The game server sent an incomplete response. Try again.'),{status:response.status,code:'INVALID_RESPONSE'});}
  if(!body||typeof body!=='object'||Array.isArray(body))throw Object.assign(new Error('The game server sent an invalid response. Restart the updated server.'),{code:'INVALID_RESPONSE'});
  if(!response.ok)throw Object.assign(new Error(typeof body.error==='string'?body.error:`The game server is unavailable (${response.status}).`),{status:response.status});
  return body;
}

// Only retry this read-only readiness check. Never retry account, purchase or
// room POSTs automatically: the first request may already have committed.
export function serverReadiness({fetchImpl=(...args)=>fetch(...args),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,timeout=120000,interval=2500}={}){
  let pending=null,lastReady=0,lastStatus;
  return function ensureReady(onWaiting=()=>{}){
    if(lastStatus&&now()-lastReady<10000)return Promise.resolve(lastStatus);
    if(pending){onWaiting();return pending;}
    pending=(async()=>{
      const deadline=now()+timeout;let announced=false;
      while(true){
        try{
          const response=await fetchImpl('/api/status',{cache:'no-store',signal:AbortSignal.timeout(Math.max(1,Math.min(20000,deadline-now())))});
          const status=await readApiResponse(response);
          if(!status.emailAccounts)throw new Error('The game server needs the email account update.');
          lastStatus=status;lastReady=now();return status;
        }catch(error){
          const retry=error.code==='WRONG_SERVER'||[502,503,504].includes(error.status)||['TimeoutError','AbortError','TypeError'].includes(error.name);
          if(!retry)throw error;
          if(now()>=deadline)throw new Error('The game server could not wake up. Try again in a minute. Free Play is still available.');
          if(!announced){announced=true;onWaiting();}
          await wait(Math.min(interval,Math.max(0,deadline-now())));
        }
      }
    })().finally(()=>{pending=null;});
    return pending;
  };
}
export const ensureServerReady=serverReadiness();
