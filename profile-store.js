import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync,copyFileSync} from 'node:fs';
import path from 'node:path';
import {randomBytes,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {domainToASCII} from 'node:url';
import isEmail from 'validator/lib/isEmail.js';
import {freshProfile,buyWeapon,equipLoadout,migrateLoadout,STARTING_COINS} from './src/economy.js';
import {WEAPONS} from './src/shared.js';

const hash=token=>createHash('sha256').update(token).digest('hex');
const validToken=token=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
const derive=promisify(scrypt);
// OWASP's 32 MiB scrypt configuration; async work keeps arena ticks responsive.
const SCRYPT={N:32768,r:8,p:3,maxmem:64*1024*1024};
const SESSION_MS=30*24*60*60*1000;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export function normalizeEmail(value){
  if(typeof value!=='string'||value.length>254)throw fail('Enter a valid email address.');
  const original=value.trim(),at=original.lastIndexOf('@'),domain=domainToASCII(original.slice(at+1));
  const canonical=original.slice(0,at).toLowerCase()+'@'+domain.toLowerCase();
  if(at<1||!domain||!isEmail(canonical,{allow_utf8_local_part:false,allow_display_name:false}))throw fail('Enter a valid email address.');
  // All email login IDs are case-insensitive. Dots and +tags remain significant.
  return {email:original,emailKey:canonical};
}
function credentials(username,password){
  if(typeof username!=='string'||!/^[a-zA-Z0-9_]{3,20}$/.test(username))throw fail('Use 3–20 letters, numbers, or underscores for your username.');
  if(typeof password!=='string'||password.length<15||password.length>128)throw fail('Use a password of 15–128 characters. Spaces are welcome.');
  return username.toLowerCase();
}
export class ProfileStore {
  constructor(directory=null){
    this.file=directory?path.join(directory,'profiles.json'):null;
    this.profiles={};this.accounts=Object.create(null);this.emails=new Map();this.claimed={};this.authSessions={};this.hashJobs=0;
    if(this.file){
      mkdirSync(directory,{recursive:true});
      if(existsSync(this.file)){
        const saved=JSON.parse(readFileSync(this.file,'utf8'));
        let changed=this.restore(saved);
        const backup=this.file+'.v'+saved.version+'.bak';if(changed&&!existsSync(backup))copyFileSync(this.file,backup);
        if(changed)this.save();
      }
    }
  }
  restore(saved){
    if(![1,2,3,4].includes(saved?.version)||!saved.profiles)throw Error('Unsupported profile database; keep a backup before migrating.');
    saved=structuredClone(saved);
    this.profiles=saved.profiles;this.accounts=Object.assign(Object.create(null),saved.accounts);this.claimed=saved.claimed||{};this.authSessions=saved.authSessions||{};this.emails=new Map();
    for(const [key,account]of Object.entries(this.accounts))if(account.email){const normalized=normalizeEmail(account.email);if(this.emails.has(normalized.emailKey))throw Error('Duplicate account email in database. Restore a valid backup.');account.emailKey=normalized.emailKey;this.emails.set(normalized.emailKey,key);}
    let changed=saved.version!==4;
    for(const p of Object.values(this.profiles))if(p.revision===0&&p.coins===300&&p.earned===0&&JSON.stringify(p.owned)==='[0,1,2,3,4]'){p.coins=STARTING_COINS;p.revision++;changed=true;}
    for(const p of Object.values(this.profiles))if(migrateLoadout(p))changed=true;
    return changed;
  }
  serialize(){return {version:4,profiles:this.profiles,accounts:this.accounts,claimed:this.claimed,authSessions:this.authSessions};}
  save(){if(!this.file)return;const temp=this.file+'.tmp';writeFileSync(temp,JSON.stringify(this.serialize()),{mode:0o600});renameSync(temp,this.file);}
  async flush(){}
  assertHealthy(){}
  get settled(){return true;}
  guestId(token){if(!validToken(token))return null;const id=hash(token);return Object.hasOwn(this.profiles,id)&&!Object.hasOwn(this.claimed,id)?id:null;}
  get(token){return this.getById(this.guestId(token));}
  getById(id){return id&&Object.hasOwn(this.profiles,id)?this.profiles[id]:null;}
  isAdmin(profileId){const key=this.claimed[profileId];return !!key&&this.accounts[key]?.profileId===profileId&&this.accounts[key]?.admin===true;}
  // Server-console operation only. No HTTP action can call this or set roles.
  grantAdmin(identifier){
    const key=this.accountKey(identifier),account=key&&this.accounts[key];if(!account)throw fail('Existing account not found. Nothing was granted.',404);
    const p=this.getById(account.profileId);if(!p)throw fail('Account profile unavailable.',404);
    const changed=account.admin!==true||WEAPONS.some((_,id)=>!p.owned.includes(id));
    account.admin=true;p.owned=[...new Set([...p.owned,...WEAPONS.map((_,id)=>id)])];
    if(changed){p.revision++;this.save();}return {username:account.username,admin:true,weapons:p.owned.length};
  }
  create(){const token=randomBytes(32).toString('hex'),profile=freshProfile();this.profiles[hash(token)]=profile;this.save();return {profileToken:token,profile:structuredClone(profile),user:null};}
  purchase(token,id){return this.purchaseById(this.guestId(token),id);}
  purchaseById(profileId,id){const p=this.getById(profileId);if(!p)throw fail('Profile unavailable. Refresh to reconnect.',410);buyWeapon(p,id);this.save();return structuredClone(p);}
  equip(token,loadout){return this.equipById(this.guestId(token),loadout);}
  equipById(profileId,loadout){const p=this.getById(profileId);if(!p)throw fail('Profile unavailable. Refresh to reconnect.',410);equipLoadout(p,loadout);this.save();return structuredClone(p);}
  reward(token,amount){return this.rewardById(this.guestId(token),amount);}
  rewardById(profileId,amount){const p=this.getById(profileId);if(!p||!Number.isInteger(amount)||amount<=0)return null;p.coins+=amount;p.earned+=amount;p.revision++;this.save();return p;}
  async passwordHash(password,salt){
    if(this.hashJobs>=2)throw fail('Sign-in is busy. Please try again in a moment.',503);
    this.hashJobs++;
    try{return await derive(password,salt,64,SCRYPT);}finally{this.hashJobs--;}
  }
  async register(username,password,guestToken,beforeClaim=()=>{},email=null){
    const key=credentials(username,password),address=email===null?null:normalizeEmail(email);
    if(Object.hasOwn(this.accounts,key))throw fail('That username is unavailable.',409);
    if(address&&this.emails.has(address.emailKey))throw fail('Unable to use that email. Try signing in or use a different address.',409);
    const salt=randomBytes(16).toString('hex'),digest=(await this.passwordHash(password,salt)).toString('hex');
    // Recheck after hashing: another request can claim a name or guest wallet while we await.
    if(Object.hasOwn(this.accounts,key))throw fail('That username is unavailable.',409);
    if(address&&this.emails.has(address.emailKey))throw fail('Unable to use that email. Try signing in or use a different address.',409);
    const guestId=guestToken?this.guestId(guestToken):null;
    if(guestToken&&!guestId)throw fail('This guest wallet is no longer available. Refresh before creating an account.',410);
    beforeClaim(guestId);
    const profileId=guestId||randomBytes(32).toString('hex');
    if(!guestId)this.profiles[profileId]=freshProfile();
    this.accounts[key]={username,...address,emailVerified:false,profileId,password:{algorithm:'scrypt',...SCRYPT,salt,digest},createdAt:Date.now()};
    if(address)this.emails.set(address.emailKey,key);
    this.claimed[profileId]=key;
    return this.startSession(key);
  }
  accountKey(identifier){
    if(typeof identifier!=='string'||identifier.length>254)return null;
    if(identifier.includes('@')){try{return this.emails.get(normalizeEmail(identifier).emailKey)||null;}catch{return null;}}
    const key=identifier.trim().toLowerCase();return Object.hasOwn(this.accounts,key)?key:null;
  }
  async verifyPassword(account,password){
    const usable=typeof password==='string'&&password.length<=128;
    const digest=await this.passwordHash(usable?password:'invalid-password',account?.password.salt||'00000000000000000000000000000000');
    const expected=account?Buffer.from(account.password.digest,'hex'):Buffer.alloc(64);
    return timingSafeEqual(digest,expected)&&usable&&!!account;
  }
  async login(identifier,password){
    const key=this.accountKey(identifier),account=key?this.accounts[key]:null;
    if(!await this.verifyPassword(account,password))throw fail('Incorrect email, username, or password.',401);
    return this.startSession(key);
  }
  async addEmail(token,email,password,beforeChange=()=>{}){
    const address=normalizeEmail(email),identity=this.authenticate(token);
    if(!identity)throw fail('Sign in before adding an email.',401);
    const key=this.claimed[identity.profileId],account=this.accounts[key];
    if(!await this.verifyPassword(account,password))throw fail('Incorrect password.',401);
    if(!this.authenticate(token))throw fail('Your sign-in expired. Sign in again.',401);
    if(account.email)throw fail('This account already has an email address.',409);
    if(this.emails.has(address.emailKey))throw fail('Unable to use that email. Try another address.',409);
    beforeChange(identity.profileId);
    Object.assign(account,address,{emailVerified:false});this.emails.set(address.emailKey,key);this.save();
    return this.authenticate(token);
  }
  startSession(key){
    const now=Date.now();for(const [id,s] of Object.entries(this.authSessions))if(s.expiresAt<=now)delete this.authSessions[id];
    const existing=Object.entries(this.authSessions).filter(([,s])=>s.account===key).sort((a,b)=>a[1].expiresAt-b[1].expiresAt);
    while(existing.length>=10)delete this.authSessions[existing.shift()[0]];
    const token=randomBytes(32).toString('hex');this.authSessions[hash(token)]={account:key,expiresAt:now+SESSION_MS};this.save();
    return {token,...this.authenticate(token)};
  }
  authenticate(token){
    if(!validToken(token))return null;
    const sessionId=hash(token),s=this.authSessions[sessionId];if(!s||s.expiresAt<=Date.now())return null;
    const a=this.accounts[s.account];return a?{sessionId,profileId:a.profileId,user:{username:a.username,email:a.email||null,emailVerified:false,admin:a.admin===true}}:null;
  }
  sessionActive(id){return !!id&&!!this.authSessions[id]&&this.authSessions[id].expiresAt>Date.now();}
  logout(token){if(validToken(token)&&this.authSessions[hash(token)]){delete this.authSessions[hash(token)];this.save();}}
}

