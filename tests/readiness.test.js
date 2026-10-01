import test from 'node:test';
import assert from 'node:assert/strict';
import {serverReadiness} from '../src/api.js';

test('concurrent startup requests share safe GET retries and recover from a sleeping proxy',async()=>{
  let calls=0,time=0,notices=0;
  const ready=serverReadiness({now:()=>time,wait:async ms=>{time+=ms;},fetchImpl:async(url,options)=>{
    assert.equal(url,'/api/status');assert.equal(options.method,undefined);
    return ++calls<3?new Response('Waking',{status:503}):Response.json({emailAccounts:true});
  }});
  const [a,b]=await Promise.all([ready(()=>notices++),ready(()=>notices++)]);
  assert.equal(a,b);assert.equal(calls,3);assert(notices>0);await ready();assert.equal(calls,3);
});
test('readiness stops at its deadline and permits a later retry',async()=>{
  let time=0,awake=false;
  const ready=serverReadiness({timeout:10,interval:5,now:()=>time,wait:async ms=>{time+=ms;},fetchImpl:async()=>awake?Response.json({emailAccounts:true}):new Response('Sleeping',{status:504})});
  await assert.rejects(ready(),/could not wake up/);awake=true;assert.equal((await ready()).emailAccounts,true);
});
test('readiness does not retry API rejections or an outdated server',async()=>{
  for(const response of [Response.json({error:'Blocked'},{status:403}),Response.json({emailAccounts:false})]){
    let calls=0;const ready=serverReadiness({fetchImpl:async()=>{calls++;return response;}});
    await assert.rejects(ready());assert.equal(calls,1);
  }
});
