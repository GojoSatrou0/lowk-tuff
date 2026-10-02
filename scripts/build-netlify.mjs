import {mkdir,cp,writeFile,lstat,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=fileURLToPath(new URL('../',import.meta.url));

export function netlifyConfig(value){
  if(!value)throw Error('Set ARENA_SERVER_URL to your hosted Node backend URL. Netlify cannot run server.js as a static site. See docs/NETLIFY.md.');
  let url;try{url=new URL(value);}catch{throw Error('ARENA_SERVER_URL must be a complete HTTPS backend URL.');}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.hostname.endsWith('.netlify.app'))throw Error('Use the root HTTPS URL of your Node backend, not localhost or your Netlify frontend.');
  return {origin:url.origin,redirects:`/api ${url.origin}/api 200!\n/api/* ${url.origin}/api/:splat 200!\n/health ${url.origin}/health 200!\n`};
}
export async function buildNetlify(value,{outputRoot=ROOT,fetchImpl=fetch}={}){
  const config=netlifyConfig(value);
  const response=await fetchImpl(config.origin+'/health',{signal:AbortSignal.timeout(20000)});
  if(!response.ok||!(response.headers.get('content-type')||'').includes('application/json'))throw Error('The backend /health endpoint is not responding with JSON. Start the hosted Node service before deploying Netlify.');
  const health=await response.json();
  if(health.name!=='Velocity Arena'||!health.emailAccounts)throw Error('The backend needs the current Velocity Arena email/account update.');
  const root=path.resolve(outputRoot),out=path.resolve(root,'dist');
  // Never remove an arbitrary path or follow a user-created directory link.
  if(path.dirname(out)!==root||path.basename(out)!=='dist')throw Error('Unsafe build output path.');
  const old=await lstat(out).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(old?.isSymbolicLink()||(old&&!old.isDirectory()))throw Error('dist must be a normal build directory.');
  if(old)await rm(out,{recursive:true,force:true});
  await mkdir(out,{recursive:true});
  for(const file of ['index.html','styles.css','app-icon.svg','manifest.webmanifest','robots.txt','sitemap.xml','src','assets'])await cp(path.join(ROOT,file),path.join(out,file),{recursive:true});
  await writeFile(path.join(out,'src/deployment.js'),`export const FORCE_HTTP=false;\nexport const SOCKET_URL=${JSON.stringify(config.origin.replace('https:','wss:')+'/socket')};\n`);
  await writeFile(path.join(out,'_redirects'),config.redirects);
  await writeFile(path.join(out,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: same-origin\n/src/*\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n');
  return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const out=await buildNetlify(process.env.ARENA_SERVER_URL);console.log(`Netlify frontend ready: ${out}\nPublish this dist folder, not the project root.`);}catch(e){console.error(e.message);process.exitCode=1;}
}
