import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {netlifyConfig,buildNetlify} from '../scripts/build-netlify.mjs';
import {createArenaServer} from '../server.js';

test('Netlify build refuses missing, local, frontend, credential-bearing and non-HTTPS backend URLs',()=>{
  for(const value of ['',null,'not a URL','http://backend.example','https://localhost','https://127.0.0.1','https://velocity-arena.netlify.app','https://user:secret@backend.example','https://backend.example/path','https://backend.example/?token=value'])assert.throws(()=>netlifyConfig(value));
  const config=netlifyConfig('https://backend.example/');assert.equal(config.origin,'https://backend.example');assert.match(config.redirects,/^\/api https:\/\/backend.example\/api 200!/);assert.match(config.redirects,/\/api\/\* https:\/\/backend.example\/api\/:splat 200!/);
});
test('Netlify build publishes only frontend files and proxy rules with HTTP gameplay',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'velocity-netlify-'));
  const fetchImpl=async url=>{assert.equal(url,'https://backend.example/health');return Response.json({name:'Velocity Arena',emailAccounts:true});};
  const out=await buildNetlify('https://backend.example',{outputRoot:root,fetchImpl});
  assert.equal(out,path.join(root,'dist'));
  const files=await readdir(out);for(const allowed of ['index.html','styles.css','src','assets','_redirects','_headers'])assert(files.includes(allowed));
  for(const forbidden of ['server.js','profile-store.js','data','tests','package.json','.env','node_modules','starter'])assert(!files.includes(forbidden));
  assert.match(await readFile(path.join(out,'src/deployment.js'),'utf8'),/FORCE_HTTP=true/);
  await writeFile(path.join(out,'stale-file.txt'),'old build');await buildNetlify('https://backend.example',{outputRoot:root,fetchImpl});assert(!(await readdir(out)).includes('stale-file.txt'));
});
test('Netlify builds reject HTML, unavailable and outdated backend health responses',async()=>{
  for(const response of [new Response('<html>',{headers:{'Content-Type':'text/html'}}),Response.json({error:'unavailable'},{status:503}),Response.json({name:'Different app',emailAccounts:true}),Response.json({name:'Velocity Arena'})])await assert.rejects(buildNetlify('https://backend.example',{fetchImpl:async()=>response}));
});
test('backend accepts only the exact configured Netlify origin and preserves account cookies',async t=>{
  const origin='https://velocity-arena.netlify.app',app=createArenaServer({port:0,host:'127.0.0.1',publicOrigin:origin,secureCookies:true});
  const address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const post=(data,requestOrigin=origin,cookie='')=>fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Origin:requestOrigin,Cookie:cookie,'Sec-Fetch-Site':'same-origin'},body:JSON.stringify(data)});
  const signup=await post({action:'account',operation:'register',username:'ProxyFixture',email:'proxy@example.test',password:'Disposable proxy fixture 473!'});assert.equal(signup.status,200);assert.match(signup.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Max-Age=2592000; Secure/);
  const cookie=signup.headers.get('set-cookie').split(';')[0],profile=await post({action:'profile'},origin,cookie);assert.equal((await profile.json()).user.username,'ProxyFixture');
  for(const badOrigin of ['https://evil.example','http://velocity-arena.netlify.app','https://velocity-arena.netlify.app.evil.example'])assert.equal((await post({action:'profile'},badOrigin,cookie)).status,403);
  assert.throws(()=>createArenaServer({publicOrigin:origin+'/bad-path'}),/PUBLIC_ORIGIN/);
});
