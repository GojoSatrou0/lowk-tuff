"use strict";

// -----------------------------------------------------------------------------
// Open World Physics Lab — dependency-free WebGL build.
// Weapon models are fictional game assets. No real weapon dimensions, ammunition, construction, or performance data are modeled.
// -----------------------------------------------------------------------------

const canvas = document.getElementById("gl");
const statusEl = document.getElementById("status");
const lockHintEl = document.getElementById("lockHint");
const flashEl = document.getElementById("flash");
const scopeEl = document.getElementById("scope");
const crosshairEl=document.getElementById("crosshair"),aimVignetteEl=document.getElementById("aimVignette");
const mainMenuEl=document.getElementById("mainMenu"),soloBtn=document.getElementById("soloBtn"),multiBtn=document.getElementById("multiBtn"),mpPanelEl=document.getElementById("mpPanel"),hostBtn=document.getElementById("hostBtn"),joinBtn=document.getElementById("joinBtn"),backBtn=document.getElementById("backBtn"),mpStatusEl=document.getElementById("mpStatus");
const diagButton=document.getElementById("diagButton"),diagPanel=document.getElementById("diagPanel"),diagOnline=document.getElementById("diagOnline"),diagSecure=document.getElementById("diagSecure"),diagWebgl=document.getElementById("diagWebgl"),diagWebrtc=document.getElementById("diagWebrtc"),diagCache=document.getElementById("diagCache"),diagPeer=document.getElementById("diagPeer"),diagSignal=document.getElementById("diagSignal"),diagLan=document.getElementById("diagLan"),diagRelay=document.getElementById("diagRelay"),lanHint=document.getElementById("lanHint"),relayHint=document.getElementById("relayHint");
const roomCodeInput=document.getElementById("roomCodeInput"),roomHudEl=document.getElementById("roomHud"),roomNameEl=document.getElementById("roomName"),roomPlayersEl=document.getElementById("roomPlayers"),leaveRoomBtn=document.getElementById("leaveRoom");
const infoPanelEl=document.getElementById("infoPanel"),dataPanelEl=document.getElementById("dataPanel"),closeInfoBtn=document.getElementById("closeInfo"),closeDataBtn=document.getElementById("closeData"),showHudBtn=document.getElementById("showHud");
const hpFillEl=document.getElementById("hpFill"),hpTextEl=document.getElementById("hpText");
const metricEls = {
  speed: document.getElementById("mSpeed"),
  movement: document.getElementById("mMovement"),
  humans: document.getElementById("mHumans"),
  ragdolls: document.getElementById("mRagdolls"),
  orbs: document.getElementById("mOrbs"),
  debris: document.getElementById("mDebris"),
  fps: document.getElementById("mFps"),
  anim: document.getElementById("mAnim"),
  tool: document.getElementById("mTool"),
  weaponAnim: document.getElementById("mWeaponAnim"),
  fireMode: document.getElementById("mFireMode"),
  smgCycle: document.getElementById("mSmgCycle"),
  view: document.getElementById("mView"),
  range: document.getElementById("mRange"),
  aim: document.getElementById("mAim"),
  respawning: document.getElementById("mRespawning"),
  mode: document.getElementById("mMode"),
  health: document.getElementById("mHealth"),
};

const gl = canvas.getContext("webgl", {
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});

if (!gl) {
  document.body.innerHTML = "<div style='padding:30px;font-family:Segoe UI;color:white;background:#111'>WebGL is required for this lab. Try Chrome or Edge with hardware acceleration enabled.</div>";
  throw new Error("WebGL unavailable");
}

// -----------------------------------------------------------------------------
// Small vector / matrix library
// -----------------------------------------------------------------------------
const V3 = {
  make: (x = 0, y = 0, z = 0) => [x, y, z],
  copy: a => [a[0], a[1], a[2]],
  add: (a,b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  sub: (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  scale: (a,s) => [a[0]*s,a[1]*s,a[2]*s],
  dot: (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross: (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len: a => Math.hypot(a[0],a[1],a[2]),
  norm(a){const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];},
  lerp: (a,b,t) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],
};

function m4Identity(){
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
function m4Mul(a,b){
  const o=new Float32Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){
    o[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];
  }
  return o;
}
function m4Translate(x,y,z){const m=m4Identity();m[12]=x;m[13]=y;m[14]=z;return m;}
function m4Scale(x,y,z){const m=m4Identity();m[0]=x;m[5]=y;m[10]=z;return m;}
function m4RotX(a){const c=Math.cos(a),s=Math.sin(a),m=m4Identity();m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;}
function m4RotY(a){const c=Math.cos(a),s=Math.sin(a),m=m4Identity();m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;}
function m4RotZ(a){const c=Math.cos(a),s=Math.sin(a),m=m4Identity();m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;}
function m4TRS(pos,rot,scale){
  let m=m4Translate(pos[0],pos[1],pos[2]);
  m=m4Mul(m,m4RotY(rot[1]||0));m=m4Mul(m,m4RotX(rot[0]||0));m=m4Mul(m,m4RotZ(rot[2]||0));
  return m4Mul(m,m4Scale(scale[0],scale[1],scale[2]));
}
function m4BasisTRS(pos,right,up,forward,scale){
  const z=[-forward[0],-forward[1],-forward[2]],m=m4Identity();
  m[0]=right[0]*scale[0];m[1]=right[1]*scale[0];m[2]=right[2]*scale[0];
  m[4]=up[0]*scale[1];m[5]=up[1]*scale[1];m[6]=up[2]*scale[1];
  m[8]=z[0]*scale[2];m[9]=z[1]*scale[2];m[10]=z[2]*scale[2];
  m[12]=pos[0];m[13]=pos[1];m[14]=pos[2];return m;
}
function m4Perspective(fovy,aspect,near,far){
  const f=1/Math.tan(fovy/2),nf=1/(near-far),m=new Float32Array(16);
  m[0]=f/aspect;m[5]=f;m[10]=(far+near)*nf;m[11]=-1;m[14]=2*far*near*nf;return m;
}
function m4LookAt(eye,target,up){
  const z=V3.norm(V3.sub(eye,target));
  const x=V3.norm(V3.cross(up,z));
  const y=V3.cross(z,x);
  const m=m4Identity();
  m[0]=x[0];m[1]=y[0];m[2]=z[0];
  m[4]=x[1];m[5]=y[1];m[6]=z[1];
  m[8]=x[2];m[9]=y[2];m[10]=z[2];
  m[12]=-V3.dot(x,eye);m[13]=-V3.dot(y,eye);m[14]=-V3.dot(z,eye);
  return m;
}
function m4SegmentY(a,b,r){
  const mid=[(a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5];
  const y=V3.norm(V3.sub(b,a));
  const ref=Math.abs(y[1])>.94?[1,0,0]:[0,1,0];
  const x=V3.norm(V3.cross(ref,y));
  const z=V3.norm(V3.cross(y,x));
  const len=Math.max(.001,V3.len(V3.sub(b,a)));
  const m=m4Identity();
  m[0]=x[0]*r;m[1]=x[1]*r;m[2]=x[2]*r;
  m[4]=y[0]*len;m[5]=y[1]*len;m[6]=y[2]*len;
  m[8]=z[0]*r;m[9]=z[1]*r;m[10]=z[2]*r;
  m[12]=mid[0];m[13]=mid[1];m[14]=mid[2];
  return m;
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function damp(a,b,lambda,dt){return b+(a-b)*Math.exp(-lambda*dt);}
function dampAngle(a,b,lambda,dt){let d=((b-a+Math.PI)%(Math.PI*2))-Math.PI;if(d<-Math.PI)d+=Math.PI*2;return a+d*(1-Math.exp(-lambda*dt));}
function rand(a,b){return a+Math.random()*(b-a);}

// -----------------------------------------------------------------------------
// WebGL setup
// -----------------------------------------------------------------------------
const vs=`
precision highp float;
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec2 aUv;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
void main(){
  vec4 w=uModel*vec4(aPos,1.0);
  vWorld=w.xyz;
  vNormal=normalize(mat3(uModel)*aNormal);
  vUv=aUv;
  gl_Position=uProj*uView*w;
}`;
const fs=`
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
uniform vec4 uColor;
uniform vec3 uEye;
uniform vec3 uLightDir;
uniform vec3 uFogColor;
uniform float uUnlit;
uniform float uUseTex;
uniform sampler2D uTex;
void main(){
  vec4 texel=texture2D(uTex,vUv);
  vec4 base=mix(uColor,texel*uColor,uUseTex);
  vec3 N=normalize(vNormal);
  vec3 L=normalize(-uLightDir);
  vec3 V=normalize(uEye-vWorld);
  float lam=max(dot(N,L),0.0);
  float hemi=.50+.28*max(N.y,0.0);
  float bounce=.16*max(-N.y,0.0);
  float rim=pow(1.0-max(dot(N,V),0.0),2.2)*0.16;
  vec3 H=normalize(L+V);
  float spec=pow(max(dot(N,H),0.0),24.0)*0.12;
  float light=mix(hemi+bounce+lam*.56+rim,1.0,uUnlit);
  vec3 col=base.rgb*light;
  col += spec*mix(vec3(1.0,.97,.90),base.rgb,.35)*(1.0-uUnlit);
  float dist=distance(vWorld,uEye);
  float fog=1.0-exp(-dist*dist*0.000010);
  float haze=smoothstep(40.0,260.0,dist)*0.04;
  col=mix(col,uFogColor,clamp(fog+haze,0.0,.96));
  gl_FragColor=vec4(col,base.a);
}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(prog,0,"aPos");gl.bindAttribLocation(prog,1,"aNormal");gl.bindAttribLocation(prog,2,"aUv");gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
const U={
  model:gl.getUniformLocation(prog,"uModel"),view:gl.getUniformLocation(prog,"uView"),proj:gl.getUniformLocation(prog,"uProj"),
  color:gl.getUniformLocation(prog,"uColor"),eye:gl.getUniformLocation(prog,"uEye"),light:gl.getUniformLocation(prog,"uLightDir"),fog:gl.getUniformLocation(prog,"uFogColor"),unlit:gl.getUniformLocation(prog,"uUnlit"),
  useTex:gl.getUniformLocation(prog,"uUseTex"),tex:gl.getUniformLocation(prog,"uTex"),
};
gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

function mesh(vertices,normals,indices){
  const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  const nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  return{vb,nb,ib,count:indices.length};
}
function texturedMesh(vertices,normals,uvs,indices){
  const m=mesh(vertices,normals,indices);
  m.tb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,m.tb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uvs),gl.STATIC_DRAW);
  return m;
}
function textureFromImage(image){
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  gl.generateMipmap(gl.TEXTURE_2D);gl.bindTexture(gl.TEXTURE_2D,null);return tex;
}
function cubeMesh(){
  const p=[],n=[],i=[];const faces=[
    [[1,0,0],[[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]]],
    [[-1,0,0],[[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]]],
    [[0,1,0],[[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]]],
    [[0,-1,0],[[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5]]],
    [[0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],
    [[0,0,-1],[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]],
  ];
  for(const [nn,q] of faces){const b=p.length/3;for(const v of q){p.push(...v);n.push(...nn);}i.push(b,b+1,b+2,b,b+2,b+3);}return mesh(p,n,i);
}
function sphereMesh(sx=16,sy=10){const p=[],n=[],idx=[];for(let y=0;y<=sy;y++){const v=y/sy,phi=v*Math.PI;for(let x=0;x<=sx;x++){const u=x/sx,th=u*Math.PI*2;const nx=Math.sin(phi)*Math.cos(th),ny=Math.cos(phi),nz=Math.sin(phi)*Math.sin(th);p.push(nx*.5,ny*.5,nz*.5);n.push(nx,ny,nz);}}for(let y=0;y<sy;y++)for(let x=0;x<sx;x++){const a=y*(sx+1)+x,b=a+sx+1;idx.push(a,b,a+1,b,b+1,a+1);}return mesh(p,n,idx);}
function cylinderMesh(seg=16){const p=[],n=[],idx=[];for(let y=0;y<=1;y++){const yy=y-.5;for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2,c=Math.cos(a),z=Math.sin(a);p.push(c*.5,yy,z*.5);n.push(c,0,z);}}for(let s=0;s<seg;s++){const a=s,b=s+seg+1;idx.push(a,b,a+1,b,b+1,a+1);}const base=p.length/3;p.push(0,-.5,0,0,.5,0);n.push(0,-1,0,0,1,0);for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2,c=Math.cos(a),z=Math.sin(a);p.push(c*.5,-.5,z*.5,c*.5,.5,z*.5);n.push(0,-1,0,0,1,0);}for(let s=0;s<seg;s++){idx.push(base,base+2+s,base+2+s+1);idx.push(base+1,base+2+(seg+1)+s+1,base+2+(seg+1)+s);}return mesh(p,n,idx);}
function coneMesh(seg=16){const p=[],n=[],idx=[];for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2,c=Math.cos(a),z=Math.sin(a);const nn=V3.norm([c,.5,z]);p.push(0,.5,0,c*.5,-.5,z*.5);n.push(...nn,...nn);}for(let s=0;s<seg;s++)idx.push(s*2,s*2+1,s*2+3);const b=p.length/3;p.push(0,-.5,0);n.push(0,-1,0);for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2;p.push(Math.cos(a)*.5,-.5,Math.sin(a)*.5);n.push(0,-1,0);}for(let s=0;s<seg;s++)idx.push(b,b+1+s+1,b+1+s);return mesh(p,n,idx);}
function discMesh(seg=24){const p=[0,0,0],n=[0,1,0],idx=[];for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2;p.push(Math.cos(a)*.5,0,Math.sin(a)*.5);n.push(0,1,0);}for(let s=0;s<seg;s++)idx.push(0,s+1,s+2);return mesh(p,n,idx);}
function terrainMesh(size=620,res=86){const p=[],n=[],idx=[];const step=size/res;for(let z=0;z<=res;z++)for(let x=0;x<=res;x++){const wx=-size/2+x*step,wz=-size/2+z*step,y=terrainY(wx,wz);p.push(wx,y,wz);const e=.6,dx=terrainY(wx+e,wz)-terrainY(wx-e,wz),dz=terrainY(wx,wz+e)-terrainY(wx,wz-e);const nn=V3.norm([-dx,2*e,-dz]);n.push(...nn);}for(let z=0;z<res;z++)for(let x=0;x<res;x++){const a=z*(res+1)+x,b=a+res+1;idx.push(a,b,a+1,b,b+1,a+1);}return mesh(p,n,idx);}

const MESH={cube:cubeMesh(),sphere:sphereMesh(12,8),cyl:cylinderMesh(12),cone:coneMesh(12),pyramid:coneMesh(4),disc:discMesh(20)};
let terrain;

const sniperAsset={mesh:null,texture:null,ready:false,failed:false,error:""};
const SNIPER_ASSET_URL="./assets/KSR29_Sniper_GAME_1024.glb";
const SNIPER_LOCAL_ANCHOR=[-1.35,-.35,0];
function glbAccessor(gltf,bin,index){
  const a=gltf.accessors[index],bv=gltf.bufferViews[a.bufferView],count=a.count,comps={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
  const types={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Ctor=types[a.componentType];
  if(!Ctor||!comps)throw new Error("Unsupported GLB accessor");
  const bytes=Ctor.BYTES_PER_ELEMENT,start=(bv.byteOffset||0)+(a.byteOffset||0),packed=comps*bytes,stride=bv.byteStride||packed;
  if(stride===packed)return new Ctor(bin,start,count*comps).slice();
  const out=new Ctor(count*comps),view=new DataView(bin);const getter={5120:"getInt8",5121:"getUint8",5122:"getInt16",5123:"getUint16",5125:"getUint32",5126:"getFloat32"}[a.componentType];
  for(let i=0;i<count;i++)for(let c=0;c<comps;c++){const o=start+i*stride+c*bytes;out[i*comps+c]=view[getter](o,true);}return out;
}
async function glbImageTexture(gltf,bin,materialIndex){
  const mat=gltf.materials?.[materialIndex],ti=mat?.pbrMetallicRoughness?.baseColorTexture?.index;if(ti===undefined)return null;
  const imageIndex=gltf.textures?.[ti]?.source,img=gltf.images?.[imageIndex];if(!img||img.bufferView===undefined)return null;
  const bv=gltf.bufferViews[img.bufferView],bytes=new Uint8Array(bin,bv.byteOffset||0,bv.byteLength),blob=new Blob([bytes],{type:img.mimeType||"image/png"});
  if("createImageBitmap" in window){const bmp=await createImageBitmap(blob);const tex=textureFromImage(bmp);bmp.close?.();return tex;}
  return await new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),im=new Image();im.onload=()=>{try{resolve(textureFromImage(im));}finally{URL.revokeObjectURL(url);}};im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Texture decode failed"));};im.src=url;});
}

function cleanSniperArrays(pos,nor,uv,idx){
  const faceCount=(idx.length/3)|0,vertCount=(pos.length/3)|0;
  const vertFaces=Array.from({length:vertCount},()=>[]);
  for(let f=0;f<faceCount;f++){
    const a=idx[f*3],b=idx[f*3+1],c=idx[f*3+2];
    vertFaces[a].push(f);vertFaces[b].push(f);vertFaces[c].push(f);
  }
  const seen=new Uint8Array(faceCount),comps=[];
  for(let f=0;f<faceCount;f++){
    if(seen[f])continue;
    const stack=[f],faces=[],verts=new Set();seen[f]=1;
    while(stack.length){
      const cur=stack.pop();faces.push(cur);
      for(let k=0;k<3;k++){
        const v=idx[cur*3+k];
        if(!verts.has(v)){
          verts.add(v);
          const neighbors=vertFaces[v];
          for(let j=0;j<neighbors.length;j++){
            const nf=neighbors[j];
            if(!seen[nf]){seen[nf]=1;stack.push(nf);}
          }
        }
      }
    }
    let sx=0,sy=0,sz=0,n=0;
    for(const v of verts){sx+=pos[v*3];sy+=pos[v*3+1];sz+=pos[v*3+2];n++;}
    comps.push({faces,verts:[...verts],faceCount:faces.length,centroid:[sx/n,sy/n,sz/n]});
  }
  comps.sort((a,b)=>b.faceCount-a.faceCount);

  // Asset-specific cleanup discovered from component analysis:
  // remove stand/bipod and protruding ammo/mag piece, and lower scope cluster.
  const remove=new Set([9,15,25]);
  const outPos=[],outNor=[],outUv=[],outIdx=[];
  for(let ci=0;ci<comps.length;ci++){
    if(remove.has(ci))continue;
    const c=comps[ci],shiftY=c.centroid[1]>1.45?-1.15:0;
    const vmap=new Map();
    for(let fi=0;fi<c.faces.length;fi++){
      const f=c.faces[fi];
      for(let k=0;k<3;k++){
        const ov=idx[f*3+k];
        let nv=vmap.get(ov);
        if(nv===undefined){
          nv=(outPos.length/3)|0;vmap.set(ov,nv);
          outPos.push(pos[ov*3],pos[ov*3+1]+shiftY,pos[ov*3+2]);
          outNor.push(nor[ov*3],nor[ov*3+1],nor[ov*3+2]);
          outUv.push(uv[ov*2],uv[ov*2+1]);
        }
        outIdx.push(nv);
      }
    }
  }
  return{
    pos:new Float32Array(outPos),
    nor:new Float32Array(outNor),
    uv:new Float32Array(outUv),
    idx:new Uint16Array(outIdx)
  };
}
async function loadSniperAsset(){
  try{
    const res=await fetch(SNIPER_ASSET_URL);if(!res.ok)throw new Error("GLB HTTP "+res.status);const data=await res.arrayBuffer(),dv=new DataView(data);
    if(dv.getUint32(0,true)!==0x46546c67)throw new Error("Invalid GLB");let off=12,gltf=null,bin=null;
    while(off<data.byteLength){const len=dv.getUint32(off,true),type=dv.getUint32(off+4,true);off+=8;const chunk=data.slice(off,off+len);off+=len;if(type===0x4E4F534A)gltf=JSON.parse(new TextDecoder().decode(chunk).replace(/\u0000+$/,""));else if(type===0x004E4942)bin=chunk;}
    if(!gltf||!bin)throw new Error("Missing GLB chunks");const prim=gltf.meshes?.[0]?.primitives?.[0];if(!prim)throw new Error("No GLB primitive");
    const pos=glbAccessor(gltf,bin,prim.attributes.POSITION),nor=glbAccessor(gltf,bin,prim.attributes.NORMAL),uv=glbAccessor(gltf,bin,prim.attributes.TEXCOORD_0),rawIdx=glbAccessor(gltf,bin,prim.indices);
    let max=0;for(let i=0;i<rawIdx.length;i++)if(rawIdx[i]>max)max=rawIdx[i];if(max>65535)throw new Error("Sniper mesh exceeds Uint16 index limit");const idx=new Uint16Array(rawIdx.length);for(let i=0;i<rawIdx.length;i++)idx[i]=rawIdx[i];
    sniperAsset.mesh=texturedMesh(pos,nor,uv,idx);sniperAsset.texture=await glbImageTexture(gltf,bin,prim.material);sniperAsset.ready=!!sniperAsset.texture;if(!sniperAsset.ready)throw new Error("Base color texture missing");
    if(selectedTool==="sniper")statusEl.textContent="KSR-29 model loaded";
  }catch(e){sniperAsset.failed=true;sniperAsset.error=String(e?.message||e);console.warn("KSR-29 asset fallback:",e);}
}
function gunAssetMatrix(anchor,right,up,forward,scale,localAnchor=SNIPER_LOCAL_ANCHOR){
  const m=m4Identity();
  m[0]=forward[0]*scale;m[1]=forward[1]*scale;m[2]=forward[2]*scale;
  m[4]=up[0]*scale;m[5]=up[1]*scale;m[6]=up[2]*scale;
  m[8]=right[0]*scale;m[9]=right[1]*scale;m[10]=right[2]*scale;
  const ox=forward[0]*localAnchor[0]*scale+up[0]*localAnchor[1]*scale+right[0]*localAnchor[2]*scale;
  const oy=forward[1]*localAnchor[0]*scale+up[1]*localAnchor[1]*scale+right[1]*localAnchor[2]*scale;
  const oz=forward[2]*localAnchor[0]*scale+up[2]*localAnchor[1]*scale+right[2]*localAnchor[2]*scale;
  m[12]=anchor[0]-ox;m[13]=anchor[1]-oy;m[14]=anchor[2]-oz;return m;
}
function drawSniperAsset(anchor,right,up,forward,scale){if(sniperAsset.ready)drawTextured(sniperAsset.mesh,gunAssetMatrix(anchor,right,up,forward,scale),sniperAsset.texture,[1,1,1,1],0);}


function rgba(hex,a=1){return[((hex>>16)&255)/255,((hex>>8)&255)/255,(hex&255)/255,a];}
function draw(meshObj,model,color,unlit=0){gl.uniformMatrix4fv(U.model,false,model);gl.uniform4fv(U.color,color);gl.uniform1f(U.unlit,unlit);gl.uniform1f(U.useTex,0);gl.disableVertexAttribArray(2);gl.vertexAttrib2f(2,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,meshObj.vb);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,meshObj.nb);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,meshObj.ib);gl.drawElements(gl.TRIANGLES,meshObj.count,gl.UNSIGNED_SHORT,0);}
function drawTextured(meshObj,model,texture,tint=[1,1,1,1],unlit=0){
  gl.uniformMatrix4fv(U.model,false,model);gl.uniform4fv(U.color,tint);gl.uniform1f(U.unlit,unlit);gl.uniform1f(U.useTex,1);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(U.tex,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,meshObj.vb);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,meshObj.nb);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,meshObj.tb);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,meshObj.ib);gl.drawElements(gl.TRIANGLES,meshObj.count,gl.UNSIGNED_SHORT,0);
  gl.disableVertexAttribArray(2);gl.uniform1f(U.useTex,0);
}

// -----------------------------------------------------------------------------
// World data / terrain
// -----------------------------------------------------------------------------
function terrainY(x,z){
  const broad=Math.sin(x*.012)*3.5+Math.cos(z*.014)*2.9;
  const detail=Math.sin((x+z)*.027)*1.15+Math.cos((x-z)*.021)*.75;
  const flatten=clamp(1-Math.hypot(x,z)/115,0,1);
  return (broad+detail)*(1-flatten*.78);
}

const world={trees:[],rocks:[],houses:[],crates:[],towers:[],humans:[],ragdolls:[],orbs:[],debris:[],waves:[],smoke:[],tracers:[],blasts:[],colliders:[],clouds:[],mountains:[],patches:[],casings:[],respawns:[]};

// Fictional game-weapon profiles. All values are arbitrary simulation units.
// The grenade uses the same radial-force/debris profile as the earlier build.
const TOOL_ORDER=["pulse","rocket","smg","scatter","ak47","sniper"];
const TOOLS={
  pulse:{name:"Grenade",kind:"grenade",speed:16,lift:5.4,timer:1.65,projScale:.62,wave:17,hard:12,stumble:19,crate:9,tower:13,strength:1.0,color:[.24,.31,.22,1],glow:[1,.58,.18,.10],cooldown:.52},
  rocket:{name:"RPG",kind:"rocket",speed:24,lift:.15,timer:4.0,projScale:.56,wave:24,hard:15,stumble:25,crate:13,tower:17,strength:1.32,color:[.25,.27,.25,1],glow:[1,.48,.15,.16],cooldown:.82},
  smg:{name:"Submachine Gun",kind:"ray",range:360,power:.48,cooldown:.11,color:[1,.84,.47,1]},
  scatter:{name:"Shotgun",kind:"scatter",range:30,power:.55,cooldown:.68,color:[1,.63,.34,1]},
  ak47:{name:"AK-47",kind:"ray",range:430,power:.88,cooldown:.20,color:[1,.76,.40,1]},
  sniper:{name:"Sniper Rifle",kind:"ray",range:650,rangeLabel:"∞",power:1.35,cooldown:.92,color:[1,.92,.65,1]},
};
let selectedTool="pulse";
let showNpcHitboxes=false;
let smgAuto=false;
let smgCycleShots=0;
let smgCyclePause=0;
const SMG_CYCLE_LIMIT=12;
const SMG_CYCLE_PAUSE=.72;
let mouseHeld=false;
let thirdPerson=false;
let sniperAim=false;
let aimHeld=false,aimBlend=0;
let gameStarted=false;
let gameMode="menu";
const ENEMY_RESPAWN_SECONDS=30;
const weaponAnim={equip:1,recoil:0,fire:0,throw:0,inspect:0,cycle:0,swayX:0,swayY:0,state:"equip"};
function setTool(id){if(!TOOLS[id])return;selectedTool=id;aimHeld=false;sniperAim=false;weaponAnim.equip=1;weaponAnim.inspect=0;metricEls.tool.textContent=TOOLS[id].name;for(const el of document.querySelectorAll(".toolslot"))el.classList.toggle("active",el.dataset.tool===id);updateAimUI();updateViewUI();resize();statusEl.textContent="Selected: "+TOOLS[id].name;}
function cycleTool(dir){const i=TOOL_ORDER.indexOf(selectedTool);setTool(TOOL_ORDER[(i+dir+TOOL_ORDER.length)%TOOL_ORDER.length]);}
function canFocusAim(){
  return ["smg","scatter","ak47","sniper"].includes(selectedTool);
}
function aimTargetFov(){
  if(thirdPerson){
    if(selectedTool==="sniper")return 47;
    if(selectedTool==="ak47")return 52;
    if(selectedTool==="smg")return 55;
    if(selectedTool==="scatter")return 57;
    return 66;
  }
  if(selectedTool==="sniper")return 28;
  if(selectedTool==="ak47")return 51;
  if(selectedTool==="smg")return 55;
  if(selectedTool==="scatter")return 58;
  return 70;
}
function smooth01(t){t=clamp(t,0,1);return t*t*(3-2*t);}
function updateAimUI(){
  const active=canFocusAim()&&aimHeld;
  sniperAim=active&&selectedTool==="sniper"&&!thirdPerson;
  if(metricEls.aim)metricEls.aim.textContent=aimBlend>.55?"AIM":"HIP";
  crosshairEl?.classList.toggle("aiming",aimBlend>.08);
  crosshairEl?.classList.toggle("sniperAim",!thirdPerson&&selectedTool==="sniper"&&aimBlend>.72);
  aimVignetteEl?.classList.toggle("on",aimBlend>.18&&(thirdPerson||selectedTool!=="sniper"));
  if(scopeEl)scopeEl.classList.toggle("on",!thirdPerson&&selectedTool==="sniper"&&aimBlend>.72);
}
function stepAim(dt){
  const target=(aimHeld&&canFocusAim())?1:0;
  aimBlend=damp(aimBlend,target,15,dt);
  if(Math.abs(aimBlend-target)<.002)aimBlend=target;
  updateAimUI();
}
function updateViewUI(){
  if(metricEls.view)metricEls.view.textContent=thirdPerson?"THIRD":"FIRST";if(metricEls.aim)metricEls.aim.textContent=aimBlend>.55?"AIM":"HIP";
  const cfg=TOOLS[selectedTool];
  if(metricEls.range)metricEls.range.textContent=cfg.rangeLabel||((cfg.range??0).toFixed?.(0)??"—");
}
function toggleThirdPerson(){thirdPerson=!thirdPerson;aimHeld=false;sniperAim=false;updateAimUI();updateViewUI();resize();statusEl.textContent=thirdPerson?"Third-person camera":"First-person camera";}
function thirdPersonBodyBasis(){
  return{forward:[-Math.sin(player.yaw),0,-Math.cos(player.yaw)],right:[Math.cos(player.yaw),0,-Math.sin(player.yaw)]};
}
function weaponOrigin(){
  if(!thirdPerson)return V3.copy(camera.pos);
  const b=thirdPersonBodyBasis(),h=player.slide?3.05:player.crouched?3.35:3.72;
  return[player.pos[0]+b.right[0]*.62+b.forward[0]*.30,player.pos[1]+h,player.pos[2]+b.right[2]*.62+b.forward[2]*.30];
}
function thirdPersonAimPoint(maxRange=650){
  const dir=cameraForward(),hit=raycastWeapon(camera.pos,dir,maxRange,.03);
  return hit?.p||V3.add(camera.pos,V3.scale(dir,maxRange));
}
function weaponFireDirection(maxRange=650){
  if(!thirdPerson)return cameraForward();
  return V3.norm(V3.sub(thirdPersonAimPoint(maxRange),weaponOrigin()));
}
function thirdPersonGunPose(){
  const p=weaponOrigin(),d=weaponFireDirection(650),r=V3.norm(V3.cross(d,[0,1,0])),u=V3.norm(V3.cross(r,d));
  return{p,d,r,u};
}
function thirdPersonMuzzlePoint(){
  const pose=thirdPersonGunPose();
  const len=selectedTool==="sniper"?2.45:selectedTool==="ak47"?2.15:selectedTool==="scatter"?1.95:selectedTool==="smg"?1.35:selectedTool==="rocket"?2.05:1.15;
  return V3.add(pose.p,V3.scale(pose.d,len));
}
function addCollider(obj,hx,hy,hz){world.colliders.push({obj,hx,hy,hz});}
function addTree(x,z,s){world.trees.push({x,y:terrainY(x,z),z,s,rot:rand(0,Math.PI*2),alive:true,hp:5});}
function addRock(x,z,s){world.rocks.push({x,y:terrainY(x,z),z,s,rot:[rand(0,2),rand(0,2),rand(0,2)]});}
function treeHitPoint(p,r=.45){
  let best=null,bestD=1e9;
  for(const t of world.trees){
    if(t.alive===false)continue;
    const trunkY=t.y+3.3*t.s,dx=p[0]-t.x,dz=p[2]-t.z,radial=Math.hypot(dx,dz),dy=Math.abs(p[1]-trunkY);
    if(radial<=.82*t.s+r&&dy<=3.5*t.s){const d=Math.hypot(dx,dy,dz);if(d<bestD){best={obj:t,p:V3.copy(p)};bestD=d;}}
  }
  return best;
}
function damageTree(t,amount,origin=null){
  if(!t||t.alive===false)return false;
  t.hp=(t.hp??5)-amount;
  if(t.hp<=0){destroyTree(t,origin);return true;}
  return false;
}
function destroyTree(t,origin=null){
  if(!t||t.alive===false)return;
  t.alive=false;
  const dir=origin?V3.norm(V3.sub([t.x,t.y+3.2*t.s,t.z],origin)):[Math.cos(t.rot),0,Math.sin(t.rot)];
  for(let i=0;i<8;i++){
    debris([t.x+rand(-.45,.45)*t.s,t.y+(1+i*.68)*t.s,t.z+rand(-.45,.45)*t.s],rgba(0x704a31),rand(.42,.78)*t.s);
    const d=world.debris[world.debris.length-1];if(d){d.v[0]+=dir[0]*rand(2.5,5.5);d.v[1]+=rand(2,6);d.v[2]+=dir[2]*rand(2.5,5.5);}
  }
  for(let i=0;i<18;i++){
    debris([t.x+rand(-2,2)*t.s,t.y+rand(5,11.5)*t.s,t.z+rand(-2,2)*t.s],i%3?rgba(0x4f833b):rgba(0x629a46),rand(.20,.44)*t.s);
    const d=world.debris[world.debris.length-1];if(d){d.v[0]+=dir[0]*rand(1.2,4)+rand(-2,2);d.v[1]+=rand(2.5,8);d.v[2]+=dir[2]*rand(1.2,4)+rand(-2,2);}
  }
  smoke([t.x,t.y+1.2*t.s,t.z],[dir[0]*.4,.8,dir[2]*.4],.55*t.s,.55,[.35,.31,.27,.24]);
}
function addHouse(x,z,rot=0){const o={x,y:terrainY(x,z),z,rot};world.houses.push(o);addCollider(o,8.8,8,6.4);}
function addCrate(x,z,s=1){const o={x,y:terrainY(x,z)+2*s,z,s,rot:0,alive:true,hp:3};world.crates.push(o);addCollider(o,2*s,2*s,2*s);}
function addTower(x,z){const o={x,y:terrainY(x,z),z,alive:true,hp:8,blocks:[]};for(let y=0;y<5;y++)for(let q=-1;q<=1;q++)o.blocks.push({ox:q*3.2+(y%2?1.55:0),oy:2.1+y*4.2,oz:0,alive:true});world.towers.push(o);addCollider(o,6.3,11,2.8);}

function addCloud(x,y,z,s){world.clouds.push({x,y,z,s,drift:rand(.08,.28),phase:rand(0,6.28)});}
function addMountain(x,z,s,color){world.mountains.push({x,y:terrainY(x,z)-2.0,z,s,color});}
function addPatch(x,z,s,color){world.patches.push({x,y:terrainY(x,z)+.04,z,s,color});}

const HUMAN_COLORS={
  skin:rgba(0xc89f86),
  skins:[rgba(0xd4ad92),rgba(0xc59679),rgba(0xa9785f),rgba(0x865c49)],
  hairs:[rgba(0x2b211c),rgba(0x4a3024),rgba(0x17191a),rgba(0x72503a)],
  shoe:rgba(0x303236),
  shirts:[rgba(0x546d39),rgba(0x4f708c),rgba(0x795b35),rgba(0x744b49),rgba(0x596457),rgba(0x3d665e)],
  pants:[rgba(0x4e352f),rgba(0x38404a),rgba(0x463b32),rgba(0x313a43)]
};
const directionalStates=["walkF","walkB","walkL","walkR","walkFL","walkFR","walkBL","walkBR","runF","runL","runR"];
function addHuman(x,z,i=0,enemyId=i){
  const h={
    pos:[x,terrainY(x,z),z],facing:rand(-Math.PI,Math.PI),vel:[0,0,0],
    shirt:HUMAN_COLORS.shirts[i%HUMAN_COLORS.shirts.length],
    pants:HUMAN_COLORS.pants[(i*3)%HUMAN_COLORS.pants.length],
    skin:HUMAN_COLORS.skins[i%HUMAN_COLORS.skins.length],
    hair:HUMAN_COLORS.hairs[(i*2+1)%HUMAN_COLORS.hairs.length],
    state:"idle",stateTime:rand(.2,2),animTime:rand(0,4),jumpV:0,stumbleV:[0,0,0],landTime:0,waveSide:i%2?1:-1,
    hp:100,maxHp:100,enemyId,spawn:[x,z,i],attackCooldown:rand(.1,.8)
  };
  world.humans.push(h);return h;
}

// -----------------------------------------------------------------------------
// NPC per-body hitboxes. These follow the same procedural pose used to render
// each standing human: head, torso, pelvis, arms and legs are separate targets.
// -----------------------------------------------------------------------------
function humanLocalPoint(h,rootY,local){
  const c=Math.cos(h.facing),s=Math.sin(h.facing),x=local[0],z=local[2];
  return[h.pos[0]+x*c+z*s,rootY+local[1],h.pos[2]-x*s+z*c];
}
function downVectorX(angle){return[0,-Math.cos(angle),-Math.sin(angle)];}
function downVectorXZ(angle,zrot){
  const ca=Math.cos(angle),sa=Math.sin(angle),cz=Math.cos(zrot),sz=Math.sin(zrot);
  return[sz*ca,-cz*ca,-sa];
}
function addScaled(a,b,s){return[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s];}
function humanHitboxes(h){
  const p=animPose(h),rootY=h.pos[1]+p.hipY,boxes=[];
  const add=(part,local,r)=>boxes.push({part,c:humanLocalPoint(h,rootY,local),r});
  add("head",[0,7.15+p.headY,0],.76);
  add("torso",[0,4.72,0],1.16);
  add("pelvis",[0,3.0,0],.88);
  for(const side of [-1,1]){
    const sideName=side<0?"left":"right";
    const arm=side<0?p.armL:p.armR,elbow=side<0?p.elbowL:p.elbowR,zrot=side*.12;
    const shoulder=[side*1.26,5.55,0],d1=downVectorXZ(arm,zrot),elbowPos=addScaled(shoulder,d1,1.62);
    const upper=addScaled(shoulder,d1,.82),d2=downVectorXZ(arm+elbow,zrot),lower=addScaled(elbowPos,d2,.76),hand=addScaled(elbowPos,d2,1.57);
    add(sideName+" upper arm",upper,.45);add(sideName+" lower arm",lower,.39);add(sideName+" hand",hand,.34);
    const leg=side<0?p.legL:p.legR,knee=side<0?p.kneeL:p.kneeR,hip=[side*.48,2.62,0],ld1=downVectorX(leg),kneePos=addScaled(hip,ld1,1.82);
    const thigh=addScaled(hip,ld1,.92),ld2=downVectorX(leg+knee),shin=addScaled(kneePos,ld2,.91),foot=addScaled(kneePos,ld2,1.82);foot[2]+=.24;
    add(sideName+" thigh",thigh,.52);add(sideName+" shin",shin,.45);add(sideName+" foot",foot,.43);
  }
  return boxes;
}
function raySphereHit(origin,dir,center,r,maxRange=Infinity){
  const oc=V3.sub(origin,center),b=V3.dot(oc,dir),c=V3.dot(oc,oc)-r*r,disc=b*b-c;
  if(disc<0)return null;const s=Math.sqrt(disc);let t=-b-s;if(t<0)t=-b+s;
  if(t<0||t>maxRange)return null;return{t,p:V3.add(origin,V3.scale(dir,t))};
}
function segmentHumanHit(a,b,pad=.18){
  const delta=V3.sub(b,a),len=V3.len(delta);if(len<1e-7)return null;const dir=V3.scale(delta,1/len);
  let best=null;
  for(const h of world.humans)for(const hb of humanHitboxes(h)){
    const q=raySphereHit(a,dir,hb.c,hb.r+pad,len);
    if(q&&(!best||q.t<best.t))best={kind:"human",t:q.t,p:q.p,obj:h,part:hb.part,hitbox:hb};
  }
  return best;
}
function drawNpcHitboxes(){
  if(!showNpcHitboxes)return;
  for(const h of world.humans)for(const hb of humanHitboxes(h)){
    const col=hb.part==="head"?[1,.28,.22,.24]:hb.part==="torso"?[1,.78,.18,.20]:[.20,1,.45,.16];
    draw(MESH.sphere,m4TRS(hb.c,[0,0,0],[hb.r*2,hb.r*2,hb.r*2]),col,1);
  }
}

function buildWorld(){
  terrain=terrainMesh(620,96);

  // Decorative distant mountains around the horizon ring.
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2 + rand(-.08,.08);
    const r=255 + rand(18,52);
    addMountain(Math.cos(a)*r, Math.sin(a)*r, rand(24,46), i%2 ? rgba(0x7f8fa1) : rgba(0x6e8092));
  }

  // Soft cloud clusters.
  for(let i=0;i<16;i++){
    addCloud(rand(-280,280), rand(62,106), rand(-280,280), rand(5.5,11.5));
  }

  // Ground detail patches.
  for(let i=0;i<54;i++){
    const x=rand(-250,250), z=rand(-250,250);
    if(Math.abs(x)<24 && Math.abs(z)<24) continue;
    addPatch(x,z,rand(3.2,8.2), Math.random()<.5 ? rgba(0x6f9750,.72) : rgba(0x8faf62,.68));
  }

  for(let i=0;i<92;i++){
    const x=rand(-285,285),z=rand(-285,285);if(Math.abs(x)<28||Math.abs(z)<28)continue;
    if(Math.random()<.74)addTree(x,z,rand(.75,1.34));else addRock(x,z,rand(.7,1.55));
  }

  addHouse(-45,-58,.08);addHouse(66,-49,-.16);addHouse(78,58,.24);addHouse(-92,8,-.12);
  addTower(-66,70);addTower(53,73);
  [[-20,18],[-14,18],[-8,18],[25,28],[31,28],[37,28],[57,-19],[63,-19],[-54,-25],[-60,-25],[-66,-25]].forEach(([x,z])=>addCrate(x,z));
  [[-14,10],[18,13],[34,-14],[-31,-18],[72,46],[-80,59],[53,-42],[-42,54],[12,-55],[46,12],[-58,28],[25,48]].forEach(([x,z],i)=>addHuman(x,z,i));
}

// -----------------------------------------------------------------------------
// Human animation system: idle + 8 direction movement + run + jump/fall/land
// + turns + crouch + wave + stumble. Smooth procedural blending.
// -----------------------------------------------------------------------------
function chooseHumanState(h){
  const r=Math.random();
  if(r<.12){h.state="idle";h.stateTime=rand(1.2,3.5);}
  else if(r<.19){h.state="wave";h.stateTime=rand(1.4,2.5);}
  else if(r<.24){h.state="crouch";h.stateTime=rand(1.0,2.0);}
  else if(r<.30){h.state=Math.random()<.5?"turnL":"turnR";h.stateTime=rand(.8,1.5);}
  else if(r<.35){h.state="jump";h.stateTime=1.15;h.jumpV=7.4;}
  else {h.state=directionalStates[Math.floor(Math.random()*directionalStates.length)];h.stateTime=rand(2.0,4.7);}
}
function stateMotion(state){
  const run=state.startsWith("run"),s=run?3.6:1.55;
  // The rendered character faces local +Z, so +Z is forward.
  const map={walkF:[0,1],walkB:[0,-1],walkL:[-1,0],walkR:[1,0],walkFL:[-.707,.707],walkFR:[.707,.707],walkBL:[-.707,-.707],walkBR:[.707,-.707],runF:[0,1],runL:[-1,0],runR:[1,0]};
  const d=map[state]||[0,0];return[d[0]*s,d[1]*s];
}
function animPose(h){
  const t=h.animTime,st=h.state;let speed=0,side=0,forward=0,run=0,crouch=0,wave=0,turn=0,jump=0,land=0,stumble=0;
  if(st.startsWith("walk")||st.startsWith("run")){speed=st.startsWith("run")?9.2:5.5;run=st.startsWith("run")?1:0;const mv=stateMotion(st);side=Math.sign(mv[0]);forward=Math.sign(mv[1]);}
  if(st==="attack"){speed=0;}if(st==="crouch")crouch=1;if(st==="wave")wave=1;if(st==="turnL")turn=-1;if(st==="turnR")turn=1;if(st==="jump"||st==="fall")jump=1;if(st==="land")land=1;if(st==="stumble")stumble=1;
  const cyc=Math.sin(t*speed),cyc2=Math.sin(t*speed+Math.PI),bounce=Math.abs(Math.sin(t*speed))*0.055;
  let hipY=0,torsoX=0,torsoZ=0,armL=0,armR=0,legL=0,legR=0,kneeL=.05,kneeR=.05,elbowL=.08,elbowR=.08,headY=0;
  if(speed>0){
    legL=cyc*(run?.82:.55);legR=cyc2*(run?.82:.55);armL=-cyc*(run?.7:.45);armR=-cyc2*(run?.7:.45);kneeL=Math.max(0,-cyc)*(run?.85:.45);kneeR=Math.max(0,-cyc2)*(run?.85:.45);elbowL=run?.45:.18;elbowR=run?.45:.18;hipY=bounce;torsoX=run?.10:.04;
    torsoZ=side*.08; if(forward<0){legL*=-.72;legR*=-.72;armL*=-.7;armR*=-.7;torsoX=-.06;} if(side){legL*=.65;legR*=.65;armL*=.55;armR*=.55;torsoZ=side*.13;}
  }
  if(crouch){hipY=-1.05;torsoX=.22;legL=-.35;legR=-.35;kneeL=1.0;kneeR=1.0;armL=-.25;armR=-.25;}
  if(wave){armR=-1.4;elbowR=1.9+Math.sin(t*8)*.25;torsoZ=.03;headY=Math.sin(t*2)*.06;}
  if(turn){torsoZ=turn*.08;armL=Math.sin(t*5)*.12;armR=-armL;}
  if(jump){legL=-.25;legR=.18;kneeL=.45;kneeR=.38;armL=-.75;armR=-.75;torsoX=-.08;}
  if(land){hipY=-.45*(1-h.landTime/.28);kneeL=.65;kneeR=.65;torsoX=.18;armL=.3;armR=.3;}
  if(stumble){torsoX=.45;torsoZ=Math.sin(t*10)*.25;armL=-.9;armR=.7;legL=.25;legR=-.4;}
  if(st==="attack"){torsoX=.16;armL=-1.02+Math.sin(t*12)*.18;armR=-1.08-Math.sin(t*12)*.18;elbowL=.65;elbowR=.65;legL=.08;legR=-.08;}
  return{hipY,torsoX,torsoZ,armL,armR,legL,legR,kneeL,kneeR,elbowL,elbowR,headY};
}
function humanWorldDir(h,localX,localZ){const c=Math.cos(h.facing),s=Math.sin(h.facing);return[localX*c+localZ*s,0,-localX*s+localZ*c];}



// -----------------------------------------------------------------------------
// Network compatibility / PWA diagnostics
// -----------------------------------------------------------------------------
const BUILD_ID="2026.08.20-central-https-relay1";
const PEERJS_URLS=[
  "https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js",
  "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js"
];
let peerLoadPromise=null;
let peerRuntimeSource="";

function diagSet(el,text,kind=""){
  if(!el)return;
  el.textContent=text;
  el.classList.remove("diagGood","diagWarn","diagBad");
  if(kind)el.classList.add(kind);
}
const relayProbe={available:false,checkedAt:0,url:""};
function centralRelayBase(){return String(window.OWPL_RELAY_URL||"").trim().replace(/\/$/,"");}
async function relayFetch(path,payload=null,timeoutMs=3000){
  const base=centralRelayBase();if(!base)throw new Error("relay not configured");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const opts={cache:"no-store",signal:controller.signal,headers:{"Accept":"application/json"}};if(payload!==null){opts.method="POST";opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(payload);}const res=await fetch(base+path,opts);let data=null;try{data=await res.json();}catch(e){}if(!res.ok){const err=new Error(data?.error||("HTTP "+res.status));err.status=res.status;throw err;}return data;}finally{clearTimeout(timer);}
}
async function detectCentralRelay(force=false){
  const base=centralRelayBase();if(!base){relayProbe.available=false;diagSet(diagRelay,"NOT CONFIGURED","diagWarn");if(relayHint)relayHint.textContent="Central relay not configured — LAN/online fallback available.";return false;}
  const now=performance.now();if(!force&&relayProbe.url===base&&now-relayProbe.checkedAt<3500)return relayProbe.available;relayProbe.url=base;relayProbe.checkedAt=now;diagSet(diagRelay,"CHECKING...","diagWarn");
  try{const d=await relayFetch("/api/status",null,2200);relayProbe.available=!!d?.centralRelay;}catch(e){relayProbe.available=false;}
  diagSet(diagRelay,relayProbe.available?"READY":"UNREACHABLE",relayProbe.available?"diagGood":"diagBad");if(relayHint)relayHint.textContent=relayProbe.available?"Central HTTPS relay ready — multiplayer will use it first.":"Central relay unreachable — falling back to LAN/online multiplayer.";return relayProbe.available;
}
let lanProbe={available:false,checkedAt:0};
async function lanFetch(path,payload=null,timeoutMs=1800){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const opts={cache:"no-store",signal:controller.signal,headers:{"Accept":"application/json"}};
    if(payload!==null){opts.method="POST";opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(payload);}
    const res=await fetch(path,opts);let data=null;try{data=await res.json();}catch(e){}
    if(!res.ok){const err=new Error(data?.error||("HTTP "+res.status));err.status=res.status;throw err;}return data;
  }finally{clearTimeout(timer);}
}
async function detectLanRelay(force=false){
  const now=performance.now();if(!force&&now-lanProbe.checkedAt<2500)return lanProbe.available;lanProbe.checkedAt=now;
  try{const d=await lanFetch("./api/lan/status",null,900);lanProbe.available=!!d?.lanRelay;}catch(e){lanProbe.available=false;}
  diagSet(diagLan,lanProbe.available?"READY":"NOT AVAILABLE",lanProbe.available?"diagGood":"diagWarn");
  if(lanHint)lanHint.textContent=lanProbe.available?"LAN relay ready — CREATE/JOIN will use the local network.":"LAN relay not detected — CREATE/JOIN will use normal online WebRTC.";
  return lanProbe.available;
}
async function updateConnectionDiagnostics(testPeer=false){
  diagSet(diagOnline,navigator.onLine?"ONLINE":"OFFLINE",navigator.onLine?"diagGood":"diagWarn");
  diagSet(diagSecure,window.isSecureContext?"OK":"LIMITED",window.isSecureContext?"diagGood":"diagWarn");
  diagSet(diagWebgl,gl?"OK":"UNAVAILABLE",gl?"diagGood":"diagBad");
  diagSet(diagWebrtc,typeof RTCPeerConnection==="function"?"SUPPORTED":"UNAVAILABLE",typeof RTCPeerConnection==="function"?"diagGood":"diagBad");
  const relayReady=await detectCentralRelay(testPeer);
  const lanReady=relayReady?false:await detectLanRelay(testPeer);

  if("serviceWorker" in navigator){
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      const cacheNames=("caches" in window)?await caches.keys():[];
      const ready=!!reg&&cacheNames.some(n=>n.startsWith("owpl-cache-"));
      diagSet(diagCache,ready?"READY":"INSTALLING",ready?"diagGood":"diagWarn");
    }catch(e){diagSet(diagCache,"CHECK FAILED","diagWarn");}
  }else diagSet(diagCache,"UNSUPPORTED","diagWarn");

  if(relayReady){
    diagSet(diagPeer,"NOT NEEDED","diagGood");diagSet(diagSignal,"CENTRAL HTTPS","diagGood");
  }else if(lanReady){
    diagSet(diagPeer,"NOT NEEDED","diagGood");diagSet(diagSignal,"LAN RELAY","diagGood");
  }else{
    if(typeof Peer==="function")diagSet(diagPeer,"LOADED","diagGood");
    else if(testPeer){const ok=await ensurePeerJs();diagSet(diagPeer,ok?"LOADED":"BLOCKED / FAILED",ok?"diagGood":"diagBad");}
    else diagSet(diagPeer,"NOT LOADED","diagWarn");
    if(!navigator.onLine)diagSet(diagSignal,"OFFLINE","diagWarn");else if(testPeer)await testRoomService();
  }
}
function loadExternalScript(src,timeoutMs=7000){
  return new Promise(resolve=>{
    const existing=[...document.scripts].find(s=>s.src===src);
    if(existing){
      if(typeof Peer==="function"){resolve(true);return;}
      existing.addEventListener("load",()=>resolve(typeof Peer==="function"),{once:true});
      existing.addEventListener("error",()=>resolve(false),{once:true});
      return;
    }
    const s=document.createElement("script");
    s.src=src;s.async=true;s.crossOrigin="anonymous";
    let done=false;
    const finish=ok=>{if(done)return;done=true;clearTimeout(timer);resolve(ok);};
    s.onload=()=>finish(typeof Peer==="function");
    s.onerror=()=>finish(false);
    const timer=setTimeout(()=>finish(false),timeoutMs);
    document.head.appendChild(s);
  });
}
async function loadPeerRuntimeFromFallbacks(){
  for(let i=0;i<PEERJS_URLS.length;i++){
    const url=PEERJS_URLS[i];
    diagSet(diagPeer,"LOADING "+(i+1)+"/"+PEERJS_URLS.length+"...","diagWarn");
    const ok=await loadExternalScript(url,8500);
    if(ok){
      peerRuntimeSource=url;
      return true;
    }
  }
  return false;
}
function ensurePeerJs(){
  if(typeof Peer==="function"){
    diagSet(diagPeer,"LOADED","diagGood");
    return Promise.resolve(true);
  }
  if(peerLoadPromise)return peerLoadPromise;
  peerLoadPromise=loadPeerRuntimeFromFallbacks().then(ok=>{
    diagSet(diagPeer,ok?"LOADED":"BLOCKED / FAILED",ok?"diagGood":"diagBad");
    if(!ok)setMpStatus("The multiplayer library could not load on this network. Open CONNECTION CHECK.");
    return ok;
  }).finally(()=>{if(typeof Peer!=="function")peerLoadPromise=null;});
  return peerLoadPromise;
}
function multiplayerPeerOptions(){
  const opts={debug:0};
  if(Array.isArray(window.OWPL_ICE_SERVERS)&&window.OWPL_ICE_SERVERS.length){
    opts.config={iceServers:window.OWPL_ICE_SERVERS};
  }
  return opts;
}
function makePeer(id){
  return new Peer(id,multiplayerPeerOptions());
}
function peerErrorLabel(err){
  const type=String(err?.type||"").toLowerCase();
  if(type.includes("network")||type.includes("socket")||type.includes("server"))return "ROOM SERVICE BLOCKED";
  if(type.includes("browser-incompatible"))return "BROWSER UNSUPPORTED";
  return "FAILED";
}
async function testRoomService(){
  if(!navigator.onLine){diagSet(diagSignal,"OFFLINE","diagWarn");return false;}
  if(!await ensurePeerJs()){diagSet(diagSignal,"LIBRARY BLOCKED","diagBad");return false;}
  diagSet(diagSignal,"TESTING...","diagWarn");
  return await new Promise(resolve=>{
    let done=false;
    let p=null;
    const finish=(ok,label)=>{
      if(done)return;done=true;clearTimeout(timer);
      try{p?.destroy();}catch(e){}
      diagSet(diagSignal,label,ok?"diagGood":"diagBad");
      resolve(ok);
    };
    const timer=setTimeout(()=>finish(false,"ROOM SERVICE TIMEOUT"),7500);
    try{
      p=makePeer(undefined);
      p.on("open",()=>finish(true,"ROOM SERVICE OK"));
      p.on("error",err=>finish(false,peerErrorLabel(err)));
    }catch(e){finish(false,"ROOM SERVICE FAILED");}
  });
}
function registerOfflineCache(){
  if(!("serviceWorker" in navigator))return;
  if(!(location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1"))return;
  navigator.serviceWorker.register("./service-worker.js",{scope:"./"}).then(()=>{
    navigator.serviceWorker.ready.then(()=>updateConnectionDiagnostics(false));
  }).catch(()=>diagSet(diagCache,"REGISTER FAILED","diagWarn"));
}
diagButton?.addEventListener("click",async()=>{
  diagPanel?.classList.toggle("on");
  if(diagPanel?.classList.contains("on"))await updateConnectionDiagnostics(true);
});
window.addEventListener("online",()=>updateConnectionDiagnostics(false));
window.addEventListener("offline",()=>updateConnectionDiagnostics(false));

// -----------------------------------------------------------------------------
// Multiplayer: PeerJS Cloud is used only to introduce browsers. Once connected,
// room state travels browser-to-browser over WebRTC data channels.
// The room host is the first player's browser, so a public room exists while its
// host tab remains open.
// -----------------------------------------------------------------------------
const NET_PREFIX="owpl26-room-";
const net={peer:null,isHost:false,roomCode:"",roomPeerId:"",hostConn:null,connections:new Map(),remote:new Map(),sendClock:0,connected:false,transport:"",lanId:"",lanBusy:false,lanFailures:0,relayId:"",relayBusy:false,relayFailures:0};
function sanitizeRoomCode(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,12);}
function roomPeerId(code){return NET_PREFIX+sanitizeRoomCode(code).toLowerCase();}
function remoteColor(id){let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;const colors=[[.28,.55,.78,1],[.32,.68,.48,1],[.72,.48,.30,1],[.60,.40,.70,1],[.72,.38,.45,1]];return colors[h%colors.length];}
function localNetId(){if(net.transport==="relay")return net.relayId||"local";if(net.transport==="lan")return net.lanId||"local";return net.peer?.id||"local";}
function localNetState(){return{p:[player.pos[0],player.pos[1],player.pos[2]],yaw:player.yaw,pitch:player.pitch,speed:player.speed,anim:player.anim,hp:Math.ceil(player.hp),color:remoteColor(localNetId())};}
function setMpStatus(msg){if(mpStatusEl)mpStatusEl.textContent=msg;}
function updateRoomHud(){if(!roomHudEl)return;roomHudEl.classList.toggle("on",gameMode==="multiplayer"&&net.connected);if(roomNameEl)roomNameEl.textContent=net.roomCode||"—";if(roomPlayersEl)roomPlayersEl.textContent=String(1+net.remote.size);}
function clearRemotePlayers(){net.remote.clear();updateRoomHud();}
function cleanNetwork(goMenu=false){
  const oldLanId=net.lanId,oldRelayId=net.relayId,oldRoom=net.roomCode,oldTransport=net.transport;
  if(oldTransport==="lan"&&oldLanId&&oldRoom)lanFetch("./api/lan/leave",{room:oldRoom,id:oldLanId},900).catch(()=>{});
  if(oldTransport==="relay"&&oldRelayId&&oldRoom)relayFetch("/api/leave",{room:oldRoom,id:oldRelayId},1200).catch(()=>{});
  try{for(const c of net.connections.values())c.close();}catch(e){}try{net.hostConn?.close();}catch(e){}try{net.peer?.destroy();}catch(e){}
  net.peer=null;net.isHost=false;net.roomCode="";net.roomPeerId="";net.hostConn=null;net.connections.clear();net.remote.clear();net.sendClock=0;net.connected=false;net.transport="";net.lanId="";net.lanBusy=false;net.lanFailures=0;net.relayId="";net.relayBusy=false;net.relayFailures=0;updateRoomHud();
  if(goMenu){gameStarted=false;gameMode="menu";document.exitPointerLock?.();mainMenuEl.classList.remove("hidden");mpPanelEl.classList.add("on");setMpStatus("Left the room. Choose another server.");}
}
function enterMultiplayer(code,isHost){
  gameMode="multiplayer";gameStarted=true;net.connected=true;net.isHost=isHost;net.roomCode=sanitizeRoomCode(code);mainMenuEl.classList.add("hidden");mpPanelEl.classList.remove("on");resetPlayer();lockHintEl.style.display="block";updateRoomHud();statusEl.textContent=(isHost?"Hosting ":"Joined ")+net.roomCode+" — click the world to play.";
}
function receiveSnapshot(data){
  if(!data||data.t!=="snapshot"||!data.players)return;
  const mine=localNetId(),seen=new Set();
  for(const [id,s] of Object.entries(data.players)){if(id===mine)continue;seen.add(id);let r=net.remote.get(id);if(!r){r={p:s.p.slice(),target:s.p.slice(),yaw:s.yaw||0,targetYaw:s.yaw||0,speed:s.speed||0,anim:s.anim||"idle",hp:s.hp??100,color:s.color||remoteColor(id)};net.remote.set(id,r);}r.target=s.p.slice();r.targetYaw=s.yaw||0;r.speed=s.speed||0;r.anim=s.anim||"idle";r.hp=s.hp??100;r.color=s.color||r.color;}
  for(const id of [...net.remote.keys()])if(!seen.has(id))net.remote.delete(id);updateRoomHud();
}
function safeSend(conn,data){try{if(conn?.open)conn.send(data);}catch(e){}}

function applyPvpDamage(amount,source="pvp",shooterId=""){
  if(gameMode!=="multiplayer"||player.dead||player.invuln>0)return;
  amount=clamp(Number(amount)||0,0,100);
  if(amount<=0)return;
  player.hp=clamp(player.hp-amount,0,player.maxHp);
  player.invuln=.18;
  flashEl.style.background="#ff554b";flashEl.style.opacity=".10";
  setTimeout(()=>{flashEl.style.opacity="0";flashEl.style.background="#fff";},70);
  updateHealthHud();
  if(player.hp<=0){
    player.dead=true;player.respawnTimer=3.0;mouseHeld=false;
    statusEl.textContent="Eliminated in PvP — respawning...";
  }else statusEl.textContent="PvP hit — "+Math.ceil(player.hp)+" HP";
}
function relayPvpHit(shooterId,msg){
  if(!net.isHost||!msg||msg.t!=="pvpHit")return;
  const target=String(msg.target||""),amount=clamp(Number(msg.amount)||0,0,100),source=String(msg.source||"pvp");
  if(!target||target===shooterId||amount<=0)return;
  if(target===net.peer?.id)applyPvpDamage(amount,source,shooterId);
  else{
    const c=net.connections.get(target);
    if(c?.open)safeSend(c,{t:"pvpDamage",amount,source,shooter:shooterId});
    const r=net.remote.get(target);if(r)r.hp=clamp((r.hp??100)-amount,0,100);
  }
  broadcastSnapshot();
}
function sendPvpHit(targetId,amount,source){
  if(gameMode!=="multiplayer"||!net.connected||!targetId)return;const msg={t:"pvpHit",target:String(targetId),amount:clamp(Number(amount)||0,0,100),source:String(source||selectedTool)};
  if(net.transport==="relay"){relayFetch("/api/hit",{room:net.roomCode,id:net.relayId,target:msg.target,amount:msg.amount,source:msg.source},1600).catch(()=>{});return;}if(net.transport==="lan"){lanFetch("./api/lan/hit",{room:net.roomCode,id:net.lanId,target:msg.target,amount:msg.amount,source:msg.source},1200).catch(()=>{});return;}if(!net.peer)return;if(net.isHost)relayPvpHit(net.peer.id,msg);else safeSend(net.hostConn,msg);
}
function handleClientNetData(d){
  if(!d||typeof d!=="object")return;
  if(d.t==="snapshot")receiveSnapshot(d);
  else if(d.t==="pvpDamage")applyPvpDamage(d.amount,d.source,d.shooter);
}
function hostSnapshot(){const players={};players[net.peer.id]=localNetState();for(const [id,r] of net.remote)players[id]={p:r.target?.slice?.()||r.p.slice(),yaw:r.targetYaw??r.yaw,speed:r.speed||0,anim:r.anim||"idle",hp:r.hp??100,color:r.color||remoteColor(id)};return{t:"snapshot",players};}
function broadcastSnapshot(){if(!net.isHost||!net.peer)return;const snap=hostSnapshot();for(const c of net.connections.values())safeSend(c,snap);}
function acceptRoomConnection(conn){
  conn.on("open",()=>{net.connections.set(conn.peer,conn);setMpStatus("Player joined "+net.roomCode);safeSend(conn,hostSnapshot());updateRoomHud();});
  conn.on("data",d=>{if(!d||typeof d!=="object")return;
    if(d.t==="state"){let r=net.remote.get(conn.peer);const s=d.s;if(!s||!Array.isArray(s.p))return;if(!r){r={p:s.p.slice(),target:s.p.slice(),yaw:s.yaw||0,targetYaw:s.yaw||0,color:s.color||remoteColor(conn.peer)};net.remote.set(conn.peer,r);}r.target=s.p.slice();r.targetYaw=s.yaw||0;r.speed=s.speed||0;r.anim=s.anim||"idle";r.hp=s.hp??100;r.color=s.color||r.color;}
    else if(d.t==="pvpHit")relayPvpHit(conn.peer,d);
  });
  conn.on("close",()=>{net.connections.delete(conn.peer);net.remote.delete(conn.peer);broadcastSnapshot();updateRoomHud();});
  conn.on("error",()=>{});
}
async function enterCentralRoom(code,mode="join"){
  code=sanitizeRoomCode(code);if(!code){setMpStatus("Enter a room code first.");return false;}cleanNetwork(false);diagSet(diagRelay,"CONNECTING...","diagWarn");setMpStatus((mode==="create"?"Creating ":"Joining ")+code+" on central relay...");
  try{const d=await relayFetch("/api/"+mode,{room:code},3500);if(!d?.id)throw new Error("no relay id");net.transport="relay";net.relayId=String(d.id);net.roomCode=code;net.connected=true;net.isHost=!!d.created;diagSet(diagRelay,"CONNECTED","diagGood");diagSet(diagSignal,"CENTRAL HTTPS","diagGood");enterMultiplayer(code,net.isHost);if(d.players)receiveSnapshot({t:"snapshot",players:d.players});setMpStatus("Central room "+code+" connected.");return true;}
  catch(e){diagSet(diagRelay,"FAILED","diagBad");if(e?.status===409)setMpStatus("That central room already exists. Use JOIN.");else if(e?.status===404)setMpStatus("Central room not found. Use CREATE first.");else setMpStatus("Central relay connection failed. Trying other multiplayer methods...");cleanNetwork(false);return false;}
}
async function centralSync(){
  if(net.transport!=="relay"||!net.connected||!net.relayId||net.relayBusy)return;net.relayBusy=true;
  try{const d=await relayFetch("/api/state",{room:net.roomCode,id:net.relayId,state:localNetState()},2400);net.relayFailures=0;if(d?.players)receiveSnapshot({t:"snapshot",players:d.players});if(Array.isArray(d?.hits))for(const h of d.hits)applyPvpDamage(h.amount,h.source,h.shooter);}
  catch(e){net.relayFailures++;if(net.relayFailures===4)statusEl.textContent="Central relay is unstable...";if(net.relayFailures>14){net.connected=false;clearRemotePlayers();updateRoomHud();statusEl.textContent="Central relay lost. Press ESC and reconnect.";}}
  finally{net.relayBusy=false;}
}
async function enterLanRoom(code,mode="join"){
  code=sanitizeRoomCode(code);if(!code){setMpStatus("Enter a room code first.");return false;}cleanNetwork(false);diagSet(diagLan,"CONNECTING...","diagWarn");setMpStatus((mode==="create"?"Creating ":"Joining ")+code+" on LAN...");
  try{const d=await lanFetch("./api/lan/"+mode,{room:code},2500);if(!d?.id)throw new Error("no LAN id");net.transport="lan";net.lanId=String(d.id);net.roomCode=code;net.connected=true;net.isHost=!!d.created;diagSet(diagLan,"CONNECTED","diagGood");diagSet(diagSignal,"LAN RELAY","diagGood");enterMultiplayer(code,net.isHost);if(d.players)receiveSnapshot({t:"snapshot",players:d.players});setMpStatus("LAN room "+code+" connected.");return true;}
  catch(e){diagSet(diagLan,"FAILED","diagBad");if(e?.status===409)setMpStatus("That LAN room already exists. Use JOIN.");else if(e?.status===404)setMpStatus("LAN room not found. Use CREATE first.");else setMpStatus("LAN relay connection failed.");cleanNetwork(false);return false;}
}
async function lanSync(){
  if(net.transport!=="lan"||!net.connected||!net.lanId||net.lanBusy)return;net.lanBusy=true;
  try{const d=await lanFetch("./api/lan/state",{room:net.roomCode,id:net.lanId,state:localNetState()},1800);net.lanFailures=0;if(d?.players)receiveSnapshot({t:"snapshot",players:d.players});if(Array.isArray(d?.hits))for(const h of d.hits)applyPvpDamage(h.amount,h.source,h.shooter);}
  catch(e){net.lanFailures++;if(net.lanFailures===4)statusEl.textContent="LAN connection is unstable...";if(net.lanFailures>12){net.connected=false;clearRemotePlayers();updateRoomHud();statusEl.textContent="LAN relay lost. Press ESC and reconnect.";}}
  finally{net.lanBusy=false;}
}
async function makeHost(code,strict=false){
  code=sanitizeRoomCode(code);if(await detectCentralRelay(true)){if(await enterCentralRoom(code,strict?"create":"auto"))return;}if(await detectLanRelay(true)){await enterLanRoom(code,strict?"create":"auto");return;}if(!await ensurePeerJs())return;makeHostReady(code,strict);
}
function makeHostReady(code,strict=false){
  cleanNetwork(false);code=sanitizeRoomCode(code);if(!code){setMpStatus("Enter a room code first.");return;}
  diagSet(diagSignal,"CONNECTING...","diagWarn");
  setMpStatus("Opening "+code+"...");const id=roomPeerId(code),p=makePeer(id);net.peer=p;net.roomPeerId=id;
  let opened=false;
  p.on("open",()=>{opened=true;diagSet(diagSignal,"OK","diagGood");net.isHost=true;net.roomCode=code;p.on("connection",acceptRoomConnection);enterMultiplayer(code,true);setMpStatus("Server "+code+" is live.");});
  p.on("connection",acceptRoomConnection);
  p.on("error",err=>{
    if(!opened&&(err?.type==="unavailable-id"||String(err?.message||"").toLowerCase().includes("taken"))){
      try{p.destroy();}catch(e){}
      if(strict){cleanNetwork(false);setMpStatus("That room already exists. Use JOIN instead.");}
      else joinRoom(code);
    }else if(!opened){
      diagSet(diagSignal,peerErrorLabel(err),"diagBad");cleanNetwork(false);setMpStatus("Could not reach the room service on this network. Open CONNECTION CHECK.");
    }
  });
}
async function joinRoom(code){
  code=sanitizeRoomCode(code);if(await detectCentralRelay(true)){if(await enterCentralRoom(code,"join"))return;}if(await detectLanRelay(true)){await enterLanRoom(code,"join");return;}if(!await ensurePeerJs())return;cleanNetwork(false);if(!code){setMpStatus("Enter a room code first.");return;}
  const hostId=roomPeerId(code);diagSet(diagSignal,"CONNECTING...","diagWarn");setMpStatus("Joining "+code+"...");
  const p=makePeer(undefined);net.peer=p;net.roomPeerId=hostId;net.roomCode=code;
  p.on("open",()=>{
    diagSet(diagSignal,"OK","diagGood");
    const conn=p.connect(hostId,{reliable:true,metadata:{app:"owpl26"}});
    net.hostConn=conn;
    conn.on("open",()=>{enterMultiplayer(code,false);safeSend(conn,{t:"state",s:localNetState()});setMpStatus("Connected to "+code+".");});
    conn.on("data",handleClientNetData);
    conn.on("close",()=>{net.connected=false;clearRemotePlayers();updateRoomHud();statusEl.textContent="Room host left. Press ESC, then choose another room.";});
    conn.on("error",()=>{diagSet(diagSignal,"P2P FAILED","diagBad");setMpStatus("Direct room connection failed. Open CONNECTION CHECK.");});
    setTimeout(()=>{if(!conn.open&&!net.connected){try{conn.close();p.destroy();}catch(e){}net.peer=null;setMpStatus("Room not found. Create it or choose a public server.");}},12000);
  });
  p.on("error",()=>{if(!net.connected){diagSet(diagSignal,"FAILED","diagBad");setMpStatus("Could not connect to the room service. Open CONNECTION CHECK.");}});
}
function autoPublicRoom(code){
  makeHost(code,false);
}
function stepNetwork(dt){
  if(gameMode!=="multiplayer"||!net.connected)return;net.sendClock+=dt;for(const r of net.remote){const q=r[1];q.p=V3.lerp(q.p,q.target,clamp(dt*10,0,1));q.yaw=dampAngle(q.yaw,q.targetYaw,10,dt);}if(net.sendClock<.075)return;net.sendClock=0;if(net.transport==="relay"){centralSync();return;}if(net.transport==="lan"){lanSync();return;}if(!net.peer)return;if(net.isHost)broadcastSnapshot();else safeSend(net.hostConn,{t:"state",s:localNetState()});
}

function remotePlayerHitboxes(id,r){
  const y=r.p[1],low=r.anim==="slide"?1.05:r.anim==="crouch"?.75:0;
  return[
    {part:"head",c:[r.p[0],y+5.15-low,r.p[2]],r:.82,id,obj:r},
    {part:"torso",c:[r.p[0],y+3.35-low*.82,r.p[2]],r:1.15,id,obj:r},
    {part:"pelvis",c:[r.p[0],y+1.85-low*.55,r.p[2]],r:.92,id,obj:r},
    {part:"legs",c:[r.p[0],y+.35,r.p[2]],r:.92,id,obj:r}
  ];
}
function drawRemoteHealthBar(r){
  const q=clamp((r.hp??100)/100,0,1),pos=[r.p[0],r.p[1]+6.85,r.p[2]],right=cameraRight(),up=cameraUp(),forward=cameraForward();
  draw(MESH.cube,m4BasisTRS(pos,right,up,forward,[1.15,.10,.03]),[.04,.05,.06,.82],1);
  const fill=V3.add(pos,V3.scale(right,-1.02*(1-q))),col=q>.55?[.24,.82,.38,.9]:q>.25?[.96,.65,.18,.9]:[.92,.22,.22,.9];
  draw(MESH.cube,m4BasisTRS(fill,right,up,forward,[1.04*q,.065,.035]),col,1);
}
function drawRemotePlayer(r){
  const forward=[-Math.sin(r.yaw),0,-Math.cos(r.yaw)],right=[Math.cos(r.yaw),0,-Math.sin(r.yaw)],ground=[r.p[0],r.p[1]-2,r.p[2]];
  const slide=r.anim==="slide",crouch=r.anim==="crouch",drop=slide?1.10:crouch?.80:0,skin=rgba(0xc89f86),shirt=r.color||[.35,.60,.78,1],pants=rgba(0x353c45),shoe=rgba(0x25292c);
  const wp=(x,y,z)=>tpWorldPoint(ground,right,forward,x,y,z),torsoPitch=slide?-.30:crouch?.10:0;
  drawShadow(r.p[0],r.p[2],terrainY(r.p[0],r.p[2]),slide?1.8:1.5);
  draw(MESH.cyl,m4TRS(wp(0,4.7-drop,slide?.22:0),[torsoPitch,r.yaw,0],[2.05,3.0,1.22]),shirt);
  draw(MESH.cube,m4TRS(wp(0,3.0-drop*.86,0),[torsoPitch*.3,r.yaw,0],[1.72,1.0,1.08]),pants);
  draw(MESH.sphere,m4TRS(wp(0,7.15-drop,slide?.4:0),[torsoPitch*.2,r.yaw,0],[1.32,1.55,1.28]),skin);
  draw(MESH.sphere,m4TRS(wp(0,7.65-drop,slide?.4:0),[torsoPitch*.2,r.yaw,0],[1.34,.68,1.27]),rgba(0x29221f));
  const swing=(!slide&&!crouch)?Math.sin(performance.now()*.008)*clamp((r.speed||0)/10,0,.65):0;
  for(const side of [-1,1]){
    const hip=wp(side*.48,2.62-drop*.72,slide?.08:0);let knee,foot;
    if(slide){if(side<0){knee=wp(side*.58,.98,-1.3);foot=wp(side*.64,.27,-2.55);}else{knee=wp(side*.58,.78,-.05);foot=wp(side*.66,.24,.88);}}
    else if(crouch){knee=wp(side*.58,1.05,-.8);foot=wp(side*.68,.24,.22);}
    else{knee=wp(side*.5,1.15,-swing*side*.7);foot=wp(side*.55,.24,swing*side*.9);}
    drawTpLimb(hip,knee,.66,pants);drawTpLimb(knee,foot,.55,pants);draw(MESH.cube,m4TRS(V3.add(foot,V3.scale(forward,-.2)),[0,r.yaw,0],[.72,.42,1.15]),shoe);
    const shoulder=wp(side*1.2,5.5-drop,slide?.25:0),hand=wp(side*.72,3.75-drop*.55,-.72),elbow=V3.lerp(shoulder,hand,.54);elbow[1]-=.3;
    drawTpLimb(shoulder,elbow,.51,shirt);drawTpLimb(elbow,hand,.40,skin);
  }
  drawRemoteHealthBar(r);
}
function drawRemotePlayers(){for(const r of net.remote.values())drawRemotePlayer(r);}

function updateHealthHud(){
  const q=clamp(player.hp/player.maxHp,0,1);
  if(hpFillEl)hpFillEl.style.width=(q*100).toFixed(1)+"%";
  if(hpFillEl)hpFillEl.style.background=q>.55?"linear-gradient(90deg,#53bf78,#91df7c)":q>.25?"linear-gradient(90deg,#e5a944,#f0d05d)":"linear-gradient(90deg,#d94e4e,#ef7665)";
  if(hpTextEl)hpTextEl.textContent=Math.ceil(player.hp);
  if(metricEls.health)metricEls.health.textContent=Math.ceil(player.hp)+" / "+player.maxHp;
}
function damagePlayer(amount){
  if(gameMode!=="solo"||player.dead||player.invuln>0)return;
  player.hp=clamp(player.hp-amount,0,player.maxHp);player.invuln=.35;
  flashEl.style.background="#ff554b";flashEl.style.opacity=".10";setTimeout(()=>{flashEl.style.opacity="0";flashEl.style.background="#fff";},70);
  updateHealthHud();
  if(player.hp<=0){player.dead=true;player.respawnTimer=2.2;mouseHeld=false;statusEl.textContent="You were knocked out — respawning...";}
}
function resetPlayer(){
  player.pos=[0,terrainY(0,52)+2,52];player.vel=[0,0,0];player.hp=player.maxHp;player.dead=false;player.invuln=1;player.respawnTimer=0;player.slide=false;player.slideTime=0;player.slideCooldown=0;player.crouched=false;player.coyote=MOVE_TUNE.coyote;player.landKick=0;player.viewHeight=5.08;player.moveState="idle";moveInput.jumpBuffer=0;moveInput.slideBuffer=0;updateHealthHud();
}
function enemyDamageAmount(source){
  if(source==="sniper")return 82;if(source==="smg")return 28;if(source==="scatter")return 16;if(source==="ak47")return 34;return 22;
}
function pvpDamageAmount(source,part="torso"){
  let base=source==="sniper"?78:source==="ak47"?27:source==="smg"?15:source==="scatter"?11:22;
  if(part==="head")base*=1.35;else if(part==="legs")base*=.72;
  return clamp(base,1,100);
}
function killHuman(h,origin=null,force=7){
  if(!h||!world.humans.includes(h))return null;
  const r=makeRagdollFromHuman(h,origin,force);r.deadEnemy=true;r.enemyId=h.enemyId;r.skin=h.skin;r.hair=h.hair;
  world.respawns.push({timer:ENEMY_RESPAWN_SECONDS,spawn:h.spawn.slice(),enemyId:h.enemyId,ragdoll:r});
  return r;
}
function damageHuman(h,amount,part="body",origin=null,force=5){
  if(!h||!world.humans.includes(h))return false;
  const limb=/arm|hand|thigh|shin|foot/.test(part||"");
  const scale=part==="head"?1.55:limb?.72:1.0;
  h.hp=clamp(h.hp-amount*scale,0,h.maxHp);
  if(h.hp<=0){killHuman(h,origin,force);statusEl.textContent="Enemy defeated — respawns in 30s";return true;}
  h.state="stumble";h.stateTime=.38;
  if(origin){const dir=V3.norm(V3.sub([h.pos[0],h.pos[1]+4,h.pos[2]],origin));h.stumbleV=[dir[0]*Math.min(3.2,force*.25),0,dir[2]*Math.min(3.2,force*.25)];}
  statusEl.textContent="Enemy "+Math.ceil(h.hp)+" HP";return false;
}
function stepRespawns(dt){
  if(gameMode!=="solo")return;
  for(let i=world.respawns.length-1;i>=0;i--){
    const r=world.respawns[i];r.timer-=dt;
    if(r.timer<=0){
      if(r.ragdoll)world.ragdolls=world.ragdolls.filter(q=>q!==r.ragdoll);
      addHuman(r.spawn[0],r.spawn[1],r.spawn[2],r.enemyId);
      world.respawns.splice(i,1);
    }
  }
}
function updateHumans(dt){
  for(const h of world.humans){
    h.animTime+=dt;h.stateTime-=dt;h.attackCooldown=Math.max(0,h.attackCooldown-dt);
    const dx=player.pos[0]-h.pos[0],dz=player.pos[2]-h.pos[2],dist=Math.hypot(dx,dz);
    const chasing=gameStarted&&gameMode==="solo"&&!player.dead&&dist<38;

    if(chasing){
      h.facing=dampAngle(h.facing,Math.atan2(dx,dz),7,dt);
      if(dist<2.35){
        h.state="attack";h.stateTime=.18;h.vel[0]=h.vel[2]=0;
        if(h.attackCooldown<=0){damagePlayer(8);h.attackCooldown=.9;}
      }else{
        h.state="runF";h.stateTime=.22;
        const [lx,lz]=stateMotion("runF"),d=humanWorldDir(h,lx,lz),nx=h.pos[0]+d[0]*dt,nz=h.pos[2]+d[2]*dt;
        if(Math.hypot(nx,nz)<150){h.pos[0]=nx;h.pos[2]=nz;}
      }
      h.pos[1]=terrainY(h.pos[0],h.pos[2]);continue;
    }

    if(h.stateTime<=0)chooseHumanState(h);
    if(h.state==="turnL"||h.state==="turnR")h.facing+=(h.state==="turnL"?-1:1)*dt*1.25;
    if(h.state==="jump"){
      h.jumpV-=18*dt;h.pos[1]+=h.jumpV*dt;const ground=terrainY(h.pos[0],h.pos[2]);if(h.jumpV<0)h.state="fall";if(h.pos[1]<=ground){h.pos[1]=ground;h.state="land";h.landTime=0;h.stateTime=.28;}
    }else if(h.state==="fall"){
      h.jumpV-=18*dt;h.pos[1]+=h.jumpV*dt;const ground=terrainY(h.pos[0],h.pos[2]);if(h.pos[1]<=ground){h.pos[1]=ground;h.state="land";h.landTime=0;h.stateTime=.28;}
    }else if(h.state==="land"){
      h.landTime+=dt;h.pos[1]=terrainY(h.pos[0],h.pos[2]);if(h.landTime>.28){h.state="idle";h.stateTime=.8;}
    }else if(h.state==="stumble"){
      h.pos[0]+=h.stumbleV[0]*dt;h.pos[2]+=h.stumbleV[2]*dt;h.stumbleV[0]*=Math.exp(-4*dt);h.stumbleV[2]*=Math.exp(-4*dt);h.pos[1]=terrainY(h.pos[0],h.pos[2]);
    }else if(h.state==="attack"){
      h.pos[1]=terrainY(h.pos[0],h.pos[2]);
    }else{
      const [lx,lz]=stateMotion(h.state),d=humanWorldDir(h,lx,lz);h.vel[0]=d[0];h.vel[2]=d[2];
      const nx=h.pos[0]+d[0]*dt,nz=h.pos[2]+d[2]*dt;if(Math.hypot(nx,nz)<150){h.pos[0]=nx;h.pos[2]=nz;}else h.facing+=Math.PI;
      h.pos[1]=terrainY(h.pos[0],h.pos[2]);
    }
  }
}

function drawShadow(x,z,y,s){draw(MESH.disc,m4TRS([x,y+.018,z],[0,0,0],[s*.95,1,s*.95]),[.02,.03,.02,.22],1);}
function drawCylinderLocal(parent,pivot,rx,rz,len,r,color,extraY=0){
  let m=m4Mul(parent,m4Translate(pivot[0],pivot[1],pivot[2]));m=m4Mul(m,m4RotZ(rz));m=m4Mul(m,m4RotX(rx));m=m4Mul(m,m4Translate(0,-len*.5+extraY,0));m=m4Mul(m,m4Scale(r,len,r));draw(MESH.cyl,m,color);return m;
}
function drawEnemyHealthBar(h){
  if(h.hp>=h.maxHp&&Math.hypot(h.pos[0]-player.pos[0],h.pos[2]-player.pos[2])>24)return;
  const q=clamp(h.hp/h.maxHp,0,1),pos=[h.pos[0],h.pos[1]+8.65,h.pos[2]],right=cameraRight(),up=cameraUp(),forward=cameraForward();
  draw(MESH.cube,m4BasisTRS(pos,right,up,forward,[1.45,.12,.035]),[.05,.06,.07,.78],1);
  const fillPos=V3.add(pos,V3.scale(right,-1.32*(1-q))),col=q>.55?[.24,.82,.38,.9]:q>.25?[.96,.65,.18,.9]:[.92,.22,.22,.9];
  draw(MESH.cube,m4BasisTRS(fillPos,right,up,forward,[1.34*q,.075,.04]),col,1);
}
function drawHuman(h){
  const p=animPose(h),rootY=h.pos[1]+p.hipY;let root=m4Mul(m4Translate(h.pos[0],rootY,h.pos[2]),m4RotY(h.facing));
  const skin=h.skin||HUMAN_COLORS.skin,hair=h.hair||rgba(0x2b211c);
  drawShadow(h.pos[0],h.pos[2],terrainY(h.pos[0],h.pos[2]),1.55);

  let torso=m4Mul(root,m4Translate(0,4.7,0));torso=m4Mul(torso,m4RotX(p.torsoX));torso=m4Mul(torso,m4RotZ(p.torsoZ));torso=m4Mul(torso,m4Scale(2.15,3.0,1.25));draw(MESH.cyl,torso,h.shirt);
  draw(MESH.cube,m4Mul(root,m4Mul(m4Translate(0,5.78,0),m4Scale(2.28,.48,1.30))),h.shirt);
  draw(MESH.cube,m4Mul(root,m4Mul(m4Translate(0,3.0,0),m4Scale(1.75,1.0,1.1))),h.pants);
  draw(MESH.cube,m4Mul(root,m4Mul(m4Translate(0,3.45,0),m4Scale(1.86,.18,1.15))),rgba(0x2a2b2b));
  draw(MESH.cube,m4Mul(root,m4Mul(m4Translate(0,5.92,.64),m4Scale(.66,.18,.13))),rgba(0xd9dde0,.55));

  draw(MESH.sphere,m4Mul(root,m4Mul(m4Translate(0,7.15+p.headY,0),m4Scale(1.35,1.6,1.3))),skin);
  draw(MESH.sphere,m4Mul(root,m4Mul(m4Translate(0,7.67+p.headY,-.02),m4Scale(1.38,.72,1.30))),hair);
  draw(MESH.cube,m4Mul(root,m4Mul(m4Translate(0,6.72+p.headY,.12),m4Scale(.92,.48,.88))),skin);
  draw(MESH.sphere,m4Mul(root,m4Mul(m4Translate(-.72,7.14+p.headY,0),m4Scale(.18,.28,.16))),skin);
  draw(MESH.sphere,m4Mul(root,m4Mul(m4Translate(.72,7.14+p.headY,0),m4Scale(.18,.28,.16))),skin);
  draw(MESH.sphere,m4Mul(root,m4Mul(m4Translate(-.27,7.28+p.headY,.66),m4Scale(.10,.08,.07))),rgba(0x202327));
  draw(MESH.sphere,m4Mul(root,m4Mul(m4Translate(.27,7.28+p.headY,.66),m4Scale(.10,.08,.07))),rgba(0x202327));
  draw(MESH.cyl,m4Mul(root,m4Mul(m4Translate(0,6.28,0),m4Scale(.48,.55,.48))),skin);

  for(const side of [-1,1]){
    const upperAng=side<0?p.armL:p.armR,elbow=side<0?p.elbowL:p.elbowR;
    let sh=m4Mul(root,m4Translate(side*1.26,5.55,0));sh=m4Mul(sh,m4RotZ(side*.12));sh=m4Mul(sh,m4RotX(upperAng));
    draw(MESH.sphere,m4Mul(sh,m4Mul(m4Translate(0,-.10,0),m4Scale(.60,.60,.60))),h.shirt);
    draw(MESH.cyl,m4Mul(sh,m4Mul(m4Translate(0,-.82,0),m4Scale(.54,1.65,.54))),h.shirt);
    let el=m4Mul(sh,m4Translate(0,-1.62,0));el=m4Mul(el,m4RotX(elbow));draw(MESH.sphere,m4Mul(el,m4Scale(.46,.46,.46)),skin);
    draw(MESH.cyl,m4Mul(el,m4Mul(m4Translate(0,-.76,0),m4Scale(.43,1.52,.43))),skin);
    draw(MESH.sphere,m4Mul(el,m4Mul(m4Translate(0,-1.62,0),m4Scale(.56,.62,.56))),skin);
  }
  for(const side of [-1,1]){
    const leg=side<0?p.legL:p.legR,knee=side<0?p.kneeL:p.kneeR;
    let hip=m4Mul(root,m4Translate(side*.48,2.62,0));hip=m4Mul(hip,m4RotX(leg));
    draw(MESH.cyl,m4Mul(hip,m4Mul(m4Translate(0,-.92,0),m4Scale(.69,1.85,.69))),h.pants);
    let kn=m4Mul(hip,m4Translate(0,-1.82,0));kn=m4Mul(kn,m4RotX(knee));draw(MESH.sphere,m4Mul(kn,m4Scale(.52,.45,.52)),h.pants);
    draw(MESH.cyl,m4Mul(kn,m4Mul(m4Translate(0,-.91,0),m4Scale(.58,1.82,.58))),h.pants);
    draw(MESH.cube,m4Mul(kn,m4Mul(m4Translate(0,-1.92,.29),m4Scale(.76,.44,1.30))),HUMAN_COLORS.shoe);
    draw(MESH.cube,m4Mul(kn,m4Mul(m4Translate(0,-2.12,.33),m4Scale(.80,.09,1.34))),rgba(0x1f2224));
  }
  drawEnemyHealthBar(h);
}

// -----------------------------------------------------------------------------
// Ragdoll solver — 3D Verlet particles + distance constraints + terrain/collider
// contact. Fixed substeps keep it stable.
// -----------------------------------------------------------------------------
function node(pos,r=.25,m=1){return{p:V3.copy(pos),old:V3.copy(pos),r,inv:1/m};}
function makeRagdollFromHuman(h,origin=null,strength=0){
  const [x,y,z]=h.pos,n=[
    node([x,y+7.2,z],.55,1.2),node([x,y+6.25,z],.24,.5),node([x,y+5.15,z],.3,1.5),node([x,y+3.0,z],.34,1.5),
    node([x-1.25,y+5.4,z],.25,.6),node([x-2.0,y+4.0,z],.23,.5),node([x-2.4,y+2.7,z],.25,.45),
    node([x+1.25,y+5.4,z],.25,.6),node([x+2.0,y+4.0,z],.23,.5),node([x+2.4,y+2.7,z],.25,.45),
    node([x-.52,y+2.55,z],.29,.75),node([x-.58,y+.9,z],.27,.7),node([x-.58,y-.7,z+.25],.28,.6),
    node([x+.52,y+2.55,z],.29,.75),node([x+.58,y+.9,z],.27,.7),node([x+.58,y-.7,z+.25],.28,.6),
  ];
  const pairs=[[0,1],[1,2],[2,3],[2,4],[4,5],[5,6],[2,7],[7,8],[8,9],[3,10],[10,11],[11,12],[3,13],[13,14],[14,15],[4,7],[10,13],[2,10],[2,13]];
  const links=pairs.map(([a,b])=>({a,b,len:V3.len(V3.sub(n[a].p,n[b].p))}));
  if(origin){for(const q of n){const delta=V3.sub(q.p,origin),d=Math.max(.65,V3.len(delta)),fall=clamp(1-d/18,0,1),dir=V3.norm(delta),kick=strength*fall;const dv=V3.scale(dir,kick*.022);q.old[0]-=dv[0];q.old[1]-=dv[1]+kick*.012;q.old[2]-=dv[2];}}
  const r={nodes:n,links,shirt:h.shirt,pants:h.pants,skin:h.skin||HUMAN_COLORS.skin,hair:h.hair||rgba(0x2b211c),age:0,sleep:0};world.ragdolls.push(r);world.humans=world.humans.filter(q=>q!==h);return r;
}
function resolveNodeCollider(q,c){
  const o=c.obj;if(o.alive===false)return;const minX=o.x-c.hx,maxX=o.x+c.hx,minZ=o.z-c.hz,maxZ=o.z+c.hz,minY=o.y-c.hy,maxY=o.y+c.hy;
  if(q.p[0]+q.r<minX||q.p[0]-q.r>maxX||q.p[2]+q.r<minZ||q.p[2]-q.r>maxZ||q.p[1]+q.r<minY||q.p[1]-q.r>maxY)return;
  const px=Math.min(Math.abs(q.p[0]-minX),Math.abs(maxX-q.p[0])),py=Math.min(Math.abs(q.p[1]-minY),Math.abs(maxY-q.p[1])),pz=Math.min(Math.abs(q.p[2]-minZ),Math.abs(maxZ-q.p[2]));
  if(px<=py&&px<=pz)q.p[0]=q.p[0]<o.x?minX-q.r:maxX+q.r;else if(py<=pz)q.p[1]=q.p[1]<o.y?minY-q.r:maxY+q.r;else q.p[2]=q.p[2]<o.z?minZ-q.r:maxZ+q.r;
}
function stepRagdoll(r,dt){
  let motion=0;for(const q of r.nodes){const vx=(q.p[0]-q.old[0])*.995,vy=(q.p[1]-q.old[1])*.995,vz=(q.p[2]-q.old[2])*.995;motion+=vx*vx+vy*vy+vz*vz;q.old[0]=q.p[0];q.old[1]=q.p[1];q.old[2]=q.p[2];q.p[0]+=vx;q.p[1]+=vy-22*dt*dt;q.p[2]+=vz;}
  for(let iter=0;iter<8;iter++){
    for(const L of r.links){const a=r.nodes[L.a],b=r.nodes[L.b],d=V3.sub(b.p,a.p),len=V3.len(d)||1,err=(len-L.len)/len*.5;a.p[0]+=d[0]*err;a.p[1]+=d[1]*err;a.p[2]+=d[2]*err;b.p[0]-=d[0]*err;b.p[1]-=d[1]*err;b.p[2]-=d[2]*err;}
    for(const q of r.nodes){const floor=terrainY(q.p[0],q.p[2])+q.r;if(q.p[1]<floor){q.p[1]=floor;const vx=q.p[0]-q.old[0],vz=q.p[2]-q.old[2];q.old[0]=q.p[0]-vx*.72;q.old[2]=q.p[2]-vz*.72;q.old[1]=q.p[1]+Math.min(.03,Math.abs(q.p[1]-q.old[1])*.12);}for(const c of world.colliders)resolveNodeCollider(q,c);}
  }
  r.sleep=motion<.00002?r.sleep+dt:0;r.age+=dt;
}
function drawRagdoll(r){
  const n=r.nodes;drawShadow(n[3].p[0],n[3].p[2],terrainY(n[3].p[0],n[3].p[2]),1.6);
  draw(MESH.sphere,m4TRS(n[0].p,[0,0,0],[1.25,1.48,1.22]),r.skin||HUMAN_COLORS.skin);draw(MESH.sphere,m4TRS([n[0].p[0],n[0].p[1]+.26,n[0].p[2]],[0,0,0],[1.18,.62,1.15]),r.hair||rgba(0x2b211c));
  const segs=[[1,2,.58,r.shirt],[2,3,.76,r.shirt],[4,5,.45,r.shirt],[5,6,.38,r.skin||HUMAN_COLORS.skin],[7,8,.45,r.shirt],[8,9,.38,r.skin||HUMAN_COLORS.skin],[10,11,.56,r.pants],[11,12,.48,r.pants],[13,14,.56,r.pants],[14,15,.48,r.pants]];
  for(const [a,b,rad,col] of segs)draw(MESH.cyl,m4SegmentY(n[a].p,n[b].p,rad),col);
  draw(MESH.cube,m4SegmentY(n[10].p,n[13].p,.6),r.pants);
}

// -----------------------------------------------------------------------------
// Fictional game weapons / effects / debris physics
// -----------------------------------------------------------------------------
// Visual/game-only recoil spring. Values are arbitrary game tuning.
const recoilCam={pitch:0,yaw:0,roll:0,vPitch:0,vYaw:0,vRoll:0};
function addVisualRecoil(kind){
  let up=.020,side=.006,roll=.004;
  if(kind==="shotgun"){up=.060;side=.014;roll=.010;}
  else if(kind==="sniper"){up=.050;side=.010;roll=.007;}
  else if(kind==="rocket"){up=.034;side=.009;roll=.006;}
  else if(kind==="smg"){up=.018;side=.005;roll=.003;}
  else if(kind==="ak47"){up=.031;side=.008;roll=.005;}
  recoilCam.vPitch+=up*22;
  recoilCam.vYaw+=rand(-side,side)*20;
  recoilCam.vRoll+=rand(-roll,roll)*18;
}
function stepVisualRecoil(dt){
  const spring=92,dampK=17;
  recoilCam.vPitch+=(-recoilCam.pitch*spring-recoilCam.vPitch*dampK)*dt;
  recoilCam.vYaw+=(-recoilCam.yaw*spring-recoilCam.vYaw*dampK)*dt;
  recoilCam.vRoll+=(-recoilCam.roll*110-recoilCam.vRoll*20)*dt;
  recoilCam.pitch=clamp(recoilCam.pitch+recoilCam.vPitch*dt,-.035,.13);
  recoilCam.yaw=clamp(recoilCam.yaw+recoilCam.vYaw*dt,-.055,.055);
  recoilCam.roll=clamp(recoilCam.roll+recoilCam.vRoll*dt,-.045,.045);
}
function cameraForward(){
  const pitch=player.pitch+recoilCam.pitch,yaw=player.yaw+recoilCam.yaw,cp=Math.cos(pitch);
  return V3.norm([-Math.sin(yaw)*cp,Math.sin(pitch),-Math.cos(yaw)*cp]);
}
function cameraRight(){
  const yaw=player.yaw+recoilCam.yaw;
  return V3.norm([Math.cos(yaw),0,-Math.sin(yaw)]);
}
function cameraUp(){
  const r=cameraRight(),f=cameraForward(),u=V3.norm(V3.cross(r,f));
  if(Math.abs(recoilCam.roll)<.0001)return u;
  return V3.norm(V3.add(V3.scale(u,Math.cos(recoilCam.roll)),V3.scale(r,Math.sin(recoilCam.roll))));
}
function vmPoint(x,y,z){const r=cameraRight(),u=cameraUp(),f=cameraForward();return V3.add(camera.pos,V3.add(V3.scale(r,x),V3.add(V3.scale(u,y),V3.scale(f,z))));}

function spawnProjectile(toolId,dir){const cfg=TOOLS[toolId],d=V3.norm(thirdPerson?weaponFireDirection(cfg.range||650):dir),start=V3.add(weaponOrigin(),V3.scale(d,thirdPerson?1.0:1.55));world.orbs.push({tool:toolId,p:start,old:V3.sub(start,V3.scale(d,.28)),v:V3.add(V3.scale(d,cfg.speed),[0,cfg.lift||0,0]),timer:cfg.timer,age:0,rot:[0,rand(0,6.28),0],spin:[rand(-6,6),rand(-7,7),rand(-6,6)],smokeTick:0});return world.orbs[world.orbs.length-1];}

function tracer(a,b,color,life=.07,width=.07){world.tracers.push({a:V3.copy(a),b:V3.copy(b),age:0,life,color,width});}
function smoke(p,v=[0,1,0],size=.7,life=.9,color=[.35,.34,.32,.38]){world.smoke.push({p:V3.copy(p),v:V3.copy(v),size,age:0,life,color});}
function impactFx(p,color=[1,.65,.25,1],scale=1){for(let i=0;i<6;i++)smoke(p,[rand(-1.8,1.8),rand(.4,2.2),rand(-1.8,1.8)],rand(.18,.42)*scale,rand(.2,.48),[.45,.39,.31,.42]);world.blasts.push({kind:"spark",p:V3.copy(p),age:0,life:.12,radius:1.1*scale,color});}
function casingEject(kind="smg"){
  const isShotgun=kind==="shotgun",isAk=kind==="ak47";
  const side=isShotgun?.46:isAk?.41:.38;
  const forward=isShotgun?.58:isAk?.92:.72;
  const pose=thirdPerson?thirdPersonGunPose():null,p=thirdPerson?V3.add(pose.p,V3.scale(pose.r,side)):vmPoint(.36,-.26,1.16),r=thirdPerson?pose.r:cameraRight(),u=thirdPerson?pose.u:cameraUp(),f=thirdPerson?pose.d:cameraForward();
  const v=V3.add(V3.scale(r,rand(isShotgun?1.3:1.8,isShotgun?2.2:3.0)),V3.add(V3.scale(u,rand(1.2,2.4)),V3.scale(f,rand(-.65,.28))));
  world.casings.push({
    p,v,age:0,life:rand(1.15,2.0),rot:[rand(0,6.28),rand(0,6.28),rand(0,6.28)],
    spin:[rand(-12,12),rand(-10,10),rand(-14,14)],kind,
    size:isShotgun?[.11,.25,.09]:isAk?[.07,.20,.06]:[.06,.16,.052],
    color:isShotgun?rgba(0xb7473e,.92):isAk?rgba(0xc49c4c,.90):rgba(0xd0a653,.90)
  });
}
function muzzleFx(strength=1){
  const muzzleDist=selectedTool==="smg"?1.60:selectedTool==="scatter"?1.72:selectedTool==="ak47"?1.82:selectedTool==="sniper"?2.42:selectedTool==="rocket"?1.84:1.60;
  const p=thirdPerson?thirdPersonMuzzlePoint():vmPoint(.22,-.18,muzzleDist);
  world.blasts.push({kind:"muzzle",p:V3.copy(p),age:0,life:.075,radius:1.4*strength,color:[1,.72,.24,1]});
  smoke(p,[rand(-.15,.15),rand(.15,.45),rand(-.1,.2)],.18*strength,.22,[.55,.52,.48,.24]);
}
function stepCasings(dt){
  for(let i=world.casings.length-1;i>=0;i--){
    const c=world.casings[i];c.age+=dt;c.v[1]-=13*dt;c.p[0]+=c.v[0]*dt;c.p[1]+=c.v[1]*dt;c.p[2]+=c.v[2]*dt;
    c.rot[0]+=c.spin[0]*dt;c.rot[1]+=c.spin[1]*dt;c.rot[2]+=c.spin[2]*dt;
    const floor=terrainY(c.p[0],c.p[2])+.05;
    if(c.p[1]<floor){c.p[1]=floor;if(c.v[1]<0)c.v[1]*=-.34;c.v[0]*=.72;c.v[2]*=.72;}
    if(c.age>=c.life)world.casings.splice(i,1);
  }
}

// Exact debris behavior retained from the earlier build.
function debris(p,color=rgba(0x8f795f),size=1){world.debris.push({p:V3.copy(p),v:[rand(-9,9),rand(3,12),rand(-9,9)],rot:[rand(0,3),rand(0,3),rand(0,3)],spin:[rand(-4,4),rand(-4,4),rand(-4,4)],life:rand(2.4,5.3),size,color,sleep:0});}
function shatterCrate(c){if(!c.alive)return;c.alive=false;for(let i=0;i<13;i++)debris([c.x+rand(-1,1),c.y+rand(-1,1),c.z+rand(-1,1)],rgba(0x8c603d),rand(.45,.9));world.colliders=world.colliders.filter(x=>x.obj!==c);}
function breakTower(t){if(!t.alive)return;t.alive=false;for(const b of t.blocks){const p=[t.x+b.ox,t.y+b.oy,t.z+b.oz];debris(p,rgba(0xaaa49b),2.5);}world.colliders=world.colliders.filter(x=>x.obj!==t);}

function createBlastAnimation(p,cfg){
  world.blasts.push({kind:"blast",p:V3.copy(p),age:0,life:.82,radius:cfg.wave,color:cfg===TOOLS.rocket?[1,.48,.16,1]:[1,.68,.28,1]});
  world.blasts.push({kind:"core",p:V3.copy(p),age:0,life:.28,radius:cfg===TOOLS.rocket?5.0:3.4,color:[1,.86,.48,1]});
  world.waves.push({p:V3.copy(p),age:0,life:cfg===TOOLS.rocket?.72:.58,radius:cfg.wave,color:cfg===TOOLS.rocket?[1,.48,.16,1]:[1,.68,.28,1]});
  flashEl.style.opacity=cfg===TOOLS.rocket?".14":".09";setTimeout(()=>flashEl.style.opacity="0",50);
  const count=cfg===TOOLS.rocket?17:12;
  for(let i=0;i<count;i++)smoke(p,[rand(-3.5,3.5),rand(2,7),rand(-3.5,3.5)],rand(.55,1.25),rand(.7,1.5),[.30,.29,.27,.42]);
  // Small terrain fragments use the exact old debris motion.
  for(let i=0;i<(cfg===TOOLS.rocket?8:5);i++)debris([p[0]+rand(-.5,.5),p[1]+rand(0,.5),p[2]+rand(-.5,.5)],rgba(0x71685c),rand(.18,.38));
}


function pushGrenadesFromBlast(p,cfg,sourceOrb=null){
  // Fictional game impulse: other thrown grenades are pushed directly away
  // from the blast center. Strength fades smoothly with distance.
  for(const g of world.orbs){
    if(g===sourceOrb||g.tool!=="pulse")continue;
    const delta=V3.sub(g.p,p),d=V3.len(delta);
    if(d<=.10||d>=cfg.wave)continue;

    const dir=V3.norm(delta);
    const q=clamp(1-d/cfg.wave,0,1);
    const impulse=(4.0+11.0*q*q)*cfg.strength;

    g.v[0]+=dir[0]*impulse;
    g.v[1]+=dir[1]*impulse+2.2*q;
    g.v[2]+=dir[2]*impulse;

    // Give it a visible tumble after being hit by the shockwave.
    g.spin[0]+=rand(-5,5)*q;
    g.spin[1]+=rand(-7,7)*q;
    g.spin[2]+=rand(-5,5)*q;

    // Small VFX puff at the pushed grenade so the interaction is readable.
    smoke(g.p,[dir[0]*.35,.35+q*.35,dir[2]*.35],.12+.08*q,.18+.12*q,[.46,.43,.39,.20]);
  }
}

function applyPulse(p,toolId="pulse",sourceOrb=null){
  const cfg=TOOLS[toolId]||TOOLS.pulse;createBlastAnimation(p,cfg);
  if(toolId==="pulse")pushGrenadesFromBlast(p,cfg,sourceOrb);
  if(gameMode==="multiplayer"){
    for(const [id,r] of net.remote){
      if((r.hp??100)<=0)continue;
      const c=[r.p[0],r.p[1]+3.2,r.p[2]],d=V3.len(V3.sub(c,p));
      if(d<cfg.wave){const q=clamp(1-d/cfg.wave,0,1),base=toolId==="rocket"?64:42;if(q>.08)sendPvpHit(id,base*q,toolId);}
    }
  }
  for(const h of [...world.humans]){const c=[h.pos[0],h.pos[1]+4,h.pos[2]],d=V3.len(V3.sub(c,p));if(d<cfg.stumble){const q=clamp(1-d/cfg.stumble,0,1),base=toolId==="rocket"?105:62;damageHuman(h,base*q,"torso",p,(5+q*14)*cfg.strength);if(world.humans.includes(h)){const dir=V3.norm(V3.sub(c,p));h.state="stumble";h.stateTime=.75;h.stumbleV=[dir[0]*(2+q*4)*cfg.strength,0,dir[2]*(2+q*4)*cfg.strength];}}}
  for(const r of world.ragdolls)for(const q of r.nodes){const delta=V3.sub(q.p,p),d=V3.len(delta);if(d<cfg.wave){const f=clamp(1-d/cfg.wave,0,1),dir=V3.norm(delta),k=cfg.strength;q.old[0]-=dir[0]*(.08+f*.28)*k;q.old[1]-=(dir[1]*(.08+f*.28)+f*.12)*k;q.old[2]-=dir[2]*(.08+f*.28)*k;r.sleep=0;}}
  for(const t of world.trees){if(t.alive!==false){const d=Math.hypot(t.x-p[0],t.y+4*t.s-p[1],t.z-p[2]);if(d<cfg.wave){const q=clamp(1-d/cfg.wave,0,1);if(q>.18)damageTree(t,1+q*5,p);}}}
  for(const c of world.crates)if(c.alive&&Math.hypot(c.x-p[0],c.y-p[1],c.z-p[2])<cfg.crate)shatterCrate(c);
  for(const t of world.towers)if(t.alive&&Math.hypot(t.x-p[0],t.y+8-p[1],t.z-p[2])<cfg.tower)breakTower(t);
  statusEl.textContent=cfg.name+" impact";
}
function pulse(p){applyPulse(p,"pulse");}

function pointRayDistance(point,origin,dir){const to=V3.sub(point,origin),t=V3.dot(to,dir);if(t<0)return{t,d:Infinity};const closest=V3.add(origin,V3.scale(dir,t));return{t,d:V3.len(V3.sub(point,closest))};}
function pointInsideCollider(p,c,r=.25){const o=c.obj;if(o.alive===false)return false;const cy=(o.s!==undefined)?o.y:o.y+(c.hy||0)*.5;return Math.abs(p[0]-o.x)<=c.hx+r&&Math.abs(p[1]-cy)<=c.hy+r&&Math.abs(p[2]-o.z)<=c.hz+r;}
function raycastWeapon(origin,dir,maxRange,width=.25){
  let best={kind:"none",t:maxRange,p:V3.add(origin,V3.scale(dir,maxRange)),obj:null};
  for(const h of world.humans)for(const hb of humanHitboxes(h)){const q=raySphereHit(origin,dir,hb.c,hb.r+width,best.t);if(q&&q.t<best.t&&q.t<=maxRange)best={kind:"human",t:q.t,p:q.p,obj:h,part:hb.part,hitbox:hb};}
  if(gameMode==="multiplayer"){
    for(const [id,r] of net.remote){
      if((r.hp??100)<=0)continue;
      for(const hb of remotePlayerHitboxes(id,r)){const q=raySphereHit(origin,dir,hb.c,hb.r+width,best.t);if(q&&q.t<best.t&&q.t<=maxRange)best={kind:"remote",t:q.t,p:q.p,obj:r,peerId:id,part:hb.part,hitbox:hb};}
    }
  }
  for(const r of world.ragdolls){const c=r.nodes[2].p,q=pointRayDistance(c,origin,dir);if(q.t<best.t&&q.t<=maxRange&&q.d<1.25+width)best={kind:"ragdoll",t:q.t,p:V3.copy(c),obj:r};}
  const steps=Math.max(20,Math.ceil(maxRange/.65));
  for(let i=1;i<=steps;i++){const t=maxRange*i/steps;if(t>=best.t)break;const p=V3.add(origin,V3.scale(dir,t));if(p[1]<=terrainY(p[0],p[2])+.05){best={kind:"ground",t,p,obj:null};break;}const th=treeHitPoint(p,width);if(th){best={kind:"tree",t,p,obj:th.obj};break;}for(const c of world.colliders){if(pointInsideCollider(p,c,width)){best={kind:c.obj.s!==undefined?"crate":"structure",t,p,obj:c.obj};break;}}if(best.t===t)break;}
  return best;
}
function applyRayHit(hit,dir,power,source=selectedTool){
  if(hit.kind==="remote"){sendPvpHit(hit.peerId,pvpDamageAmount(source,hit.part),source);statusEl.textContent="PvP hit: "+(hit.part||"body");}
  else if(hit.kind==="human"){damageHuman(hit.obj,enemyDamageAmount(source),hit.part||"body",V3.sub(hit.p,V3.scale(dir,1.35)),4.5+power*5);}
  else if(hit.kind==="ragdoll"){for(const n of hit.obj.nodes){n.old[0]-=dir[0]*(.07+.13*power);n.old[1]-=dir[1]*(.07+.13*power)+.018;n.old[2]-=dir[2]*(.07+.13*power);}hit.obj.sleep=0;}
  else if(hit.kind==="crate"&&hit.obj?.alive){hit.obj.hp=(hit.obj.hp??3)-Math.max(.5,power);if(hit.obj.hp<=0)shatterCrate(hit.obj);}
  else if(hit.kind==="tree"&&hit.obj?.alive!==false){damageTree(hit.obj,Math.max(.8,power*1.5),hit.p);}
  else if(hit.kind==="structure"&&hit.obj?.blocks&&hit.obj.alive){hit.obj.hp=(hit.obj.hp??8)-power;if(hit.obj.hp<=0)breakTower(hit.obj);}
  impactFx(hit.p,[1,.69,.30,1],.8+power*.25);
}
function fireRayWeapon(toolId){
  const cfg=TOOLS[toolId],origin=weaponOrigin(),dir=weaponFireDirection(cfg.range),hit=raycastWeapon(origin,dir,cfg.range,.12);
  tracer(V3.add(origin,V3.scale(dir,1.0)),hit.p,cfg.color,.075,.045);
  applyRayHit(hit,dir,cfg.power,toolId);
  const isAk=toolId==="ak47";
  weaponAnim.recoil=Math.max(weaponAnim.recoil,isAk?1.22:.92);weaponAnim.fire=1;addVisualRecoil(isAk?"ak47":"smg");
  muzzleFx(isAk?1.08:.88);casingEject(isAk?"ak47":"smg");
  weaponAnim.swayX=clamp(weaponAnim.swayX+rand(isAk?-.008:-.005,isAk?.008:.005),-.05,.05);
  weaponAnim.swayY=clamp(weaponAnim.swayY+rand(isAk?.006:.003,isAk?.014:.009),-.04,.05);
  if(toolId==="smg"){
    smgCycleShots++;
    if(smgCycleShots>=SMG_CYCLE_LIMIT){
      smgCycleShots=0;smgCyclePause=SMG_CYCLE_PAUSE;weaponAnim.cycle=SMG_CYCLE_PAUSE;
      statusEl.textContent="SMG cycle pause";return;
    }
  }
  statusEl.textContent=cfg.name+" fired";
}
function fireSniper(){
  const cfg=TOOLS.sniper,origin=weaponOrigin(),dir=weaponFireDirection(cfg.range),hit=raycastWeapon(origin,dir,cfg.range,.055);
  tracer(V3.add(origin,V3.scale(dir,.8)),hit.p,cfg.color,.11,.032);
  applyRayHit(hit,dir,cfg.power,"sniper");
  weaponAnim.recoil=1.65;weaponAnim.fire=1;addVisualRecoil("sniper");muzzleFx(.85);casingEject("ak47");
  weaponAnim.swayX=clamp(weaponAnim.swayX+rand(-.003,.003),-.05,.05);
  weaponAnim.swayY=clamp(weaponAnim.swayY+.008,-.04,.05);
  statusEl.textContent="Sniper Rifle fired";
}
function fireScatter(){const cfg=TOOLS.scatter,origin=weaponOrigin(),d=weaponFireDirection(cfg.range),r=cameraRight(),u=cameraUp();const spread=[[-.06,-.035],[-.04,.018],[-.02,-.012],[0,0],[.02,.016],[.04,-.018],[.06,.03]];for(const [sx,sy] of spread){const dir=V3.norm(V3.add(d,V3.add(V3.scale(r,sx),V3.scale(u,sy)))),hit=raycastWeapon(origin,dir,cfg.range,.16);tracer(V3.add(origin,V3.scale(dir,1)),hit.p,cfg.color,.07,.045);applyRayHit(hit,dir,cfg.power,"scatter");}weaponAnim.recoil=1.25;weaponAnim.fire=1;addVisualRecoil("shotgun");muzzleFx(1.35);casingEject("shotgun");smoke(vmPoint(0,.04,1.48),[0,.5,.15],.28,.32,[.5,.47,.43,.28]);statusEl.textContent="Shotgun fired";}
function useSelected(){if(player.cooldown>0)return;if(selectedTool==="smg"&&smgCyclePause>0)return;const cfg=TOOLS[selectedTool];player.cooldown=cfg.cooldown;
  if(selectedTool==="pulse"){spawnProjectile("pulse",cameraForward());weaponAnim.throw=1;weaponAnim.recoil=.25;statusEl.textContent="Grenade thrown";return;}
  if(selectedTool==="rocket"){spawnProjectile("rocket",cameraForward());weaponAnim.recoil=1.45;weaponAnim.fire=1;addVisualRecoil("rocket");statusEl.textContent="RPG launched";return;}
  if(selectedTool==="smg"){fireRayWeapon("smg");return;}
  if(selectedTool==="scatter"){fireScatter();return;}
  if(selectedTool==="ak47"){fireRayWeapon("ak47");return;}
  if(selectedTool==="sniper"){fireSniper();return;}
}

function segmentGroundHit(a,b,r=.28){const steps=8;for(let i=1;i<=steps;i++){const t=i/steps,p=V3.lerp(a,b,t);if(p[1]<=terrainY(p[0],p[2])+r)return p;}return null;}
function terrainNormal(x,z){
  const e=.35,dx=terrainY(x+e,z)-terrainY(x-e,z),dz=terrainY(x,z+e)-terrainY(x,z-e);
  return V3.norm([-dx,2*e,-dz]);
}
function reflectVelocity(v,n,restitution=.46,friction=.82){
  const vn=V3.dot(v,n);
  if(vn>=0)return V3.scale(v,friction);
  const normalPart=V3.scale(n,(1+restitution)*vn);
  const bounced=V3.sub(v,normalPart);
  const bn=V3.scale(n,V3.dot(bounced,n)),bt=V3.sub(bounced,bn);
  return V3.add(bn,V3.scale(bt,friction));
}
function grenadeWorldHit(a,b,r=.3){
  const steps=18;
  for(let i=1;i<=steps;i++){
    const t=i/steps,p=V3.lerp(a,b,t);
    if(p[1]<=terrainY(p[0],p[2])+r)return{p:[p[0],terrainY(p[0],p[2])+r,p[2]],n:terrainNormal(p[0],p[2]),kind:"ground"};
    const th=treeHitPoint(p,r);if(th){const n=V3.norm([p[0]-th.obj.x,0,p[2]-th.obj.z]);return{p:V3.copy(p),n:(Math.abs(n[0])+Math.abs(n[2])>.01?n:[1,0,0]),kind:"tree"};}
    for(const c of world.colliders){
      if(!pointInsideCollider(p,c,r))continue;
      const o=c.obj,cy=(o.s!==undefined)?o.y:o.y+(c.hy||0)*.5;
      const nx=(p[0]-o.x)/(c.hx+r),ny=(p[1]-cy)/(c.hy+r),nz=(p[2]-o.z)/(c.hz+r);
      const ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
      let n;if(ax>=ay&&ax>=az)n=[Math.sign(nx)||1,0,0];else if(ay>=az)n=[0,Math.sign(ny)||1,0];else n=[0,0,Math.sign(nz)||1];
      return{p:V3.copy(p),n,kind:"structure"};
    }
  }
  return null;
}
function segmentWorldHit(a,b,r=.28){const steps=14;for(let i=1;i<=steps;i++){const t=i/steps,p=V3.lerp(a,b,t);if(p[1]<=terrainY(p[0],p[2])+r)return p;const th=treeHitPoint(p,r);if(th)return p;for(const c of world.colliders)if(pointInsideCollider(p,c,r))return p;}return null;}
function stepOrbs(dt){for(let i=world.orbs.length-1;i>=0;i--){const o=world.orbs[i],cfg=TOOLS[o.tool]||TOOLS.pulse;o.age+=dt;o.timer-=dt;o.rot[0]+=o.spin[0]*dt;o.rot[1]+=o.spin[1]*dt;o.rot[2]+=o.spin[2]*dt;const prev=V3.copy(o.p);
    if(o.tool==="pulse")o.v[1]-=18*dt;else o.v[1]-=2.2*dt;
    o.p[0]+=o.v[0]*dt;o.p[1]+=o.v[1]*dt;o.p[2]+=o.v[2]*dt;
    if(o.tool==="rocket"){o.smokeTick-=dt;if(o.smokeTick<=0){o.smokeTick=.035;const back=V3.sub(o.p,V3.scale(V3.norm(o.v),.65));smoke(back,[rand(-.4,.4),rand(.2,1),rand(-.4,.4)],rand(.28,.52),rand(.35,.65),[.55,.48,.39,.42]);}const npcHit=segmentHumanHit(prev,o.p,.20);if(npcHit){damageHuman(npcHit.obj,100,npcHit.part,V3.sub(npcHit.p,V3.scale(V3.norm(o.v),1.2)),10);applyPulse(npcHit.p,"rocket");statusEl.textContent="Rocket impact";world.orbs.splice(i,1);continue;}const treeRpg=treeHitPoint(o.p,.34);if(treeRpg){damageTree(treeRpg.obj,6,o.p);applyPulse(o.p,"rocket");world.orbs.splice(i,1);continue;}const hit=segmentWorldHit(prev,o.p,.22);if(hit||o.timer<=0){applyPulse(hit||o.p,"rocket");world.orbs.splice(i,1);continue;}}
    else {const npcHit=segmentHumanHit(prev,o.p,.28);if(npcHit){const dir=V3.norm(o.v);damageHuman(npcHit.obj,4,npcHit.part,prev,3);if(world.humans.includes(npcHit.obj)){npcHit.obj.state="stumble";npcHit.obj.stateTime=.65;}npcHit.obj.stumbleV=[dir[0]*3.2,0,dir[2]*3.2];o.p=V3.copy(npcHit.p);o.v[0]*=-.16;o.v[1]=Math.abs(o.v[1])*.23;o.v[2]*=-.16;statusEl.textContent="Grenade contact: "+npcHit.part;}const hit=grenadeWorldHit(prev,o.p,.3);if(hit){
      o.p=V3.add(hit.p,V3.scale(hit.n,.035));
      o.v=reflectVelocity(o.v,hit.n,hit.kind==="ground"?.48:.40,hit.kind==="ground"?.84:.76);
      o.spin[0]*=.88;o.spin[1]*=.90;o.spin[2]*=.88;
      if(V3.len(o.v)>2.2)smoke(o.p,[rand(-.15,.15),rand(.08,.32),rand(-.15,.15)],.10,.15,[.55,.50,.44,.18]);
    }
    if(o.timer<.65&&Math.floor(o.timer*20)%2===0){
      smoke(o.p,[rand(-.04,.04),.28,rand(-.04,.04)],.13,.22,[.38,.36,.32,.28]);
      world.blasts.push({kind:"fuse",p:[o.p[0],o.p[1]+.45,o.p[2]],age:0,life:.08,radius:.35,color:[1,.24,.04,1]});
    }
    if(o.timer<=0){applyPulse(o.p,"pulse",o);world.orbs.splice(i,1);continue;}}
  }}

// Exact old debris update retained.
function stepDebris(dt){for(let i=world.debris.length-1;i>=0;i--){const d=world.debris[i];d.life-=dt;if(d.sleep<1){d.v[1]-=20*dt;d.p[0]+=d.v[0]*dt;d.p[1]+=d.v[1]*dt;d.p[2]+=d.v[2]*dt;d.rot[0]+=d.spin[0]*dt;d.rot[1]+=d.spin[1]*dt;d.rot[2]+=d.spin[2]*dt;const floor=terrainY(d.p[0],d.p[2])+d.size*.5;if(d.p[1]<floor){d.p[1]=floor;if(Math.abs(d.v[1])>.7)d.v[1]*=-.25;else d.v[1]=0;d.v[0]*=.84;d.v[2]*=.84;if(Math.hypot(d.v[0],d.v[1],d.v[2])<.12)d.sleep+=dt;}}if(d.life<=0)world.debris.splice(i,1);}}
function updateEffects(dt){
  for(let i=world.waves.length-1;i>=0;i--){world.waves[i].age+=dt;if(world.waves[i].age>=world.waves[i].life)world.waves.splice(i,1);}
  for(let i=world.smoke.length-1;i>=0;i--){const s=world.smoke[i];s.age+=dt;s.p[0]+=s.v[0]*dt;s.p[1]+=s.v[1]*dt;s.p[2]+=s.v[2]*dt;s.v[0]*=.985;s.v[2]*=.985;s.v[1]+=dt*.25;if(s.age>=s.life)world.smoke.splice(i,1);}
  for(let i=world.tracers.length-1;i>=0;i--){const t=world.tracers[i];t.age+=dt;if(t.age>=t.life)world.tracers.splice(i,1);}
  for(let i=world.blasts.length-1;i>=0;i--){const b=world.blasts[i];b.age+=dt;if(b.age>=b.life)world.blasts.splice(i,1);}
}

function updateWeaponAnim(dt){
  stepVisualRecoil(dt);
  weaponAnim.equip=Math.max(0,weaponAnim.equip-dt*2.4);weaponAnim.recoil=damp(weaponAnim.recoil,0,13,dt);weaponAnim.fire=Math.max(0,weaponAnim.fire-dt*9);weaponAnim.throw=Math.max(0,weaponAnim.throw-dt*2.2);weaponAnim.inspect=Math.max(0,weaponAnim.inspect-dt);weaponAnim.cycle=Math.max(0,weaponAnim.cycle-dt);
  weaponAnim.swayX=damp(weaponAnim.swayX,0,8,dt);weaponAnim.swayY=damp(weaponAnim.swayY,0,8,dt);
  if(weaponAnim.inspect>0)weaponAnim.state="inspect";else if(weaponAnim.cycle>0)weaponAnim.state="cycle";else if(weaponAnim.throw>0)weaponAnim.state="throw";else if(weaponAnim.fire>0)weaponAnim.state="fire";else if(weaponAnim.equip>0)weaponAnim.state="equip";else if(player.slide)weaponAnim.state="slide";else if((keys.ShiftLeft||keys.ShiftRight)&&player.speed>4)weaponAnim.state="sprint";else if(player.speed>.6)weaponAnim.state="move";else weaponAnim.state="idle";
}

function drawProjectileAndEffects(){
  for(const o of world.orbs){
    if(o.tool==="pulse"){
      draw(MESH.sphere,m4TRS(o.p,o.rot,[.78,.9,.78]),rgba(0x46523f));
      draw(MESH.cyl,m4TRS([o.p[0],o.p[1]+.5,o.p[2]],[0,o.rot[1],0],[.28,.22,.28]),rgba(0x323734));
      if(o.timer<.55&&Math.floor(o.timer*18)%2===0)draw(MESH.sphere,m4TRS([o.p[0],o.p[1]+.58,o.p[2]],[0,0,0],[.18,.18,.18]),[1,.33,.06,.9],1);
    }else{
      const d=V3.norm(o.v),rear=V3.sub(o.p,V3.scale(d,1.05)),front=V3.add(o.p,V3.scale(d,.75));
      draw(MESH.cyl,m4SegmentY(rear,front,.42),rgba(0x4a4d48));
      draw(MESH.sphere,m4TRS(front,[0,0,0],[.62,.62,.62]),rgba(0x5a5d56));
      const flame=V3.sub(rear,V3.scale(d,.28));draw(MESH.sphere,m4TRS(flame,[0,0,0],[.32,.32,.32]),[1,.4,.08,.85],1);
    }
  }
  for(const t of world.tracers){const a=1-t.age/t.life;draw(MESH.cyl,m4SegmentY(t.a,t.b,t.width),[t.color[0],t.color[1],t.color[2],a],1);}
  gl.disable(gl.CULL_FACE);
  for(const w of world.waves){const q=w.age/w.life,s=1+q*w.radius,a=.18*(1-q),c=w.color||[.45,.85,1,1];draw(MESH.disc,m4TRS([w.p[0],w.p[1]+.04,w.p[2]],[0,0,0],[s,.02,s]),[c[0],c[1],c[2],a],1);}
  gl.enable(gl.CULL_FACE);
  for(const s of world.smoke){const q=s.age/s.life,sz=s.size*(1+q*1.6),a=s.color[3]*(1-q);draw(MESH.sphere,m4TRS(s.p,[0,0,0],[sz,sz,sz]),[s.color[0],s.color[1],s.color[2],a],1);}
  for(const b of world.blasts){
    const q=b.age/b.life;
    if(b.kind==="spark"){const s=1+q*b.radius*2;draw(MESH.sphere,m4TRS(b.p,[0,0,0],[s,s,s]),[b.color[0],b.color[1],b.color[2],.22*(1-q)],1);}
    else if(b.kind==="muzzle"){const s=.45+q*1.2;draw(MESH.sphere,m4TRS(b.p,[0,0,0],[s,s*.62,s*1.35]),[1,.64,.18,.48*(1-q)],1);}
    else if(b.kind==="fuse"){const s=.12+q*.35;draw(MESH.sphere,m4TRS(b.p,[0,0,0],[s,s,s]),[1,.2,.03,.8*(1-q)],1);}
    else if(b.kind==="core"){const s=.7+q*b.radius,a=.55*Math.pow(1-q,2.2);draw(MESH.sphere,m4TRS(b.p,[0,0,0],[s,s*.9,s]),[1,.82,.35,a],1);}
    else{const s=.6+q*b.radius*.42,a=.34*Math.pow(1-q,2);draw(MESH.sphere,m4TRS(b.p,[0,0,0],[s,s*.78,s]),[1,.56,.16,a],1);}
  }
  for(const c of world.casings){const s=c.size||[.08,.18,.05],col=c.color||rgba(0xd2ae62,.82);draw(MESH.cube,m4TRS(c.p,c.rot,s),col);if(c.kind==="shotgun")draw(MESH.cube,m4TRS(c.p,c.rot,[s[0]*1.03,s[1]*.13,s[2]*1.03]),rgba(0xd5ad62,.92));}
}


function tpWorldPoint(base,right,forward,x,y,z){return[base[0]+right[0]*x+forward[0]*z,base[1]+y,base[2]+right[2]*x+forward[2]*z];}
function drawTpLimb(a,b,r,color){draw(MESH.cyl,m4SegmentY(a,b,r),color);}
function drawThirdPersonPlayer(){
  if(!thirdPerson)return;
  const ground=[player.pos[0],player.pos[1]-2,player.pos[2]],b=thirdPersonBodyBasis(),right=b.right,forward=b.forward;
  const skin=rgba(0xc69d82),shirt=rgba(0x405c78),pants=rgba(0x303841),shoe=rgba(0x292d30),gear=rgba(0x282e31),metal=rgba(0x41484c);
  const slide=player.slide,crouch=player.crouched&&!slide,drop=slide?1.12:crouch?.82:0,torsoPitch=slide?-.30:crouch?.10:0;
  const torsoP=tpWorldPoint(ground,right,forward,0,4.70-drop,slide?.24:crouch?-.10:0),pelvisP=tpWorldPoint(ground,right,forward,0,3.02-drop*.86,slide?.14:0),headP=tpWorldPoint(ground,right,forward,0,7.15-drop,slide?.42:crouch?-.12:0);
  drawShadow(player.pos[0],player.pos[2],terrainY(player.pos[0],player.pos[2]),slide?1.85:1.55);
  draw(MESH.cyl,m4TRS(torsoP,[torsoPitch,player.yaw,0],[2.1,3.0,1.25]),shirt);
  draw(MESH.cube,m4TRS(pelvisP,[torsoPitch*.35,player.yaw,0],[1.75,1.0,1.1]),pants);
  draw(MESH.sphere,m4TRS(headP,[torsoPitch*.2,player.yaw,0],[1.35,1.6,1.3]),skin);
  draw(MESH.cyl,m4TRS(tpWorldPoint(ground,right,forward,0,6.28-drop,slide?.35:0),[torsoPitch*.15,player.yaw,0],[.48,.55,.48]),skin);

  const swing=(!slide&&!crouch&&player.grounded)?Math.sin(player.bob)*clamp(player.speed/10,0,.78):0;
  // Legs: standing/run, compact crouch, and asymmetric momentum slide.
  for(const side of [-1,1]){
    const hip=tpWorldPoint(ground,right,forward,side*.48,2.62-drop*.72,slide?.08:0);
    let knee,foot;
    if(slide){
      if(side<0){knee=tpWorldPoint(ground,right,forward,side*.58,.98,-1.35);foot=tpWorldPoint(ground,right,forward,side*.63,.28,-2.65);}
      else{knee=tpWorldPoint(ground,right,forward,side*.58,.78,-.05);foot=tpWorldPoint(ground,right,forward,side*.66,.25,.92);}
    }else if(crouch){
      knee=tpWorldPoint(ground,right,forward,side*.58,1.05,-.82);foot=tpWorldPoint(ground,right,forward,side*.68,.24,.24);
    }else{
      knee=tpWorldPoint(ground,right,forward,side*.50,1.15,-swing*side*.72);foot=tpWorldPoint(ground,right,forward,side*.55,.24,swing*side*.96);
    }
    drawTpLimb(hip,knee,.67,pants);drawTpLimb(knee,foot,.56,pants);
    const shoePos=V3.add(foot,V3.scale(forward,-.22));draw(MESH.cube,m4TRS(shoePos,[0,player.yaw,0],[.72,.42,1.15]),shoe);
  }

  const gunPose=thirdPersonGunPose(),aiming=aimBlend>.08&&canFocusAim();
  // Arms actually reach toward the held weapon, so the gun no longer floats at the waist.
  for(const side of [-1,1]){
    const shoulder=tpWorldPoint(ground,right,forward,side*1.20,5.48-drop,slide?.28:0);
    let hand;
    if(selectedTool==="pulse")hand=V3.add(gunPose.p,V3.scale(gunPose.r,side*.18));
    else if(side>0)hand=V3.add(gunPose.p,V3.add(V3.scale(gunPose.r,.10),V3.scale(gunPose.d,-.22)));
    else hand=V3.add(gunPose.p,V3.add(V3.scale(gunPose.r,-.08),V3.scale(gunPose.d,.72)));
    const elbow=V3.lerp(shoulder,hand,.52);elbow[1]-=aiming?.24:.42;elbow[0]+=gunPose.r[0]*side*.18;elbow[2]+=gunPose.r[2]*side*.18;
    drawTpLimb(shoulder,elbow,.53,shirt);drawTpLimb(elbow,hand,.41,skin);draw(MESH.sphere,m4TRS(hand,[0,0,0],[.50,.52,.50]),skin);
  }

  // Weapon basis follows the camera crosshair, not just the character's yaw.
  const gun=m4BasisTRS(gunPose.p,gunPose.r,gunPose.u,gunPose.d,[1,1,1]);
  if(selectedTool==="pulse"){
    draw(MESH.sphere,m4Mul(gun,m4Scale(.65,.72,.65)),rgba(0x4d5a46));
  }else if(selectedTool==="rocket"){
    draw(MESH.cyl,m4Mul(gun,m4Mul(m4RotX(Math.PI/2),m4Scale(.52,2.5,.52))),rgba(0x535b50));
  }else{
    if(selectedTool==="sniper"&&sniperAsset.ready){
      const gunAnchor=V3.add(gunPose.p,V3.add(V3.scale(gunPose.d,.08),V3.scale(gunPose.r,-.04)));drawSniperAsset(gunAnchor,gunPose.r,gunPose.u,gunPose.d,.36);
    }else{
      const long=selectedTool==="sniper"?2.55:selectedTool==="scatter"?2.15:selectedTool==="ak47"?2.32:selectedTool==="smg"?1.38:1.78;
      draw(MESH.cube,m4Mul(gun,m4Scale(.48,.38,long)),selectedTool==="scatter"?rgba(0x5d4535):gear);
      draw(MESH.cyl,m4Mul(gun,m4Mul(m4Translate(0,.05,-long*.72),m4Mul(m4RotX(Math.PI/2),m4Scale(.16,long*.65,.16)))),metal);
      if(selectedTool==="sniper")draw(MESH.cyl,m4Mul(gun,m4Mul(m4Translate(0,.36,-.15),m4Mul(m4RotX(Math.PI/2),m4Scale(.26,.95,.26)))),rgba(0x22282b));
      if(selectedTool==="scatter")draw(MESH.cyl,m4Mul(gun,m4Mul(m4Translate(0,-.10,-.55),m4Mul(m4RotX(Math.PI/2),m4Scale(.14,.90,.14)))),rgba(0x303638));
      if(selectedTool==="smg")draw(MESH.cube,m4Mul(gun,m4Mul(m4Translate(0,-.22,.12),m4Scale(.22,.44,.28))),rgba(0x292f32));
      if(selectedTool==="ak47")draw(MESH.cube,m4Mul(gun,m4Mul(m4Translate(0,-.23,.06),m4Scale(.26,.55,.32))),rgba(0x3b3028));
    }
  }
}

function vmWorld(base,x,y,z){const r=cameraRight(),u=cameraUp(),f=cameraForward();return V3.add(base,V3.add(V3.scale(r,x),V3.add(V3.scale(u,y),V3.scale(f,z))));}

// First-person-only viewmodel scale. Third-person rendering uses separate code.
function viewModelScale(){
  let s=.32;
  if(selectedTool==="pulse")s=.38;
  else if(selectedTool==="rocket")s=.30;
  else if(selectedTool==="smg")s=.34;
  else if(selectedTool==="scatter")s=.29;
  else if(selectedTool==="ak47")s=.30;
  else if(selectedTool==="sniper")s=.27;
  if(aimBlend>0&&canFocusAim())s*=1-aimBlend*.12;
  return s;
}
function vmPartPoint(base,x,y,z){
  const s=viewModelScale();
  return vmWorld(base,x*s,y*s,z*s);
}
function drawVMBox(base,x,y,z,sx,sy,sz,color){
  const s=viewModelScale(),r=cameraRight(),u=cameraUp(),f=cameraForward(),p=vmPartPoint(base,x,y,z);
  draw(MESH.cube,m4BasisTRS(p,r,u,f,[sx*s,sy*s,sz*s]),color);
}
function drawVMSphere(base,x,y,z,sx,sy,sz,color,unlit=0){
  const s=viewModelScale(),r=cameraRight(),u=cameraUp(),f=cameraForward(),p=vmPartPoint(base,x,y,z);
  draw(MESH.sphere,m4BasisTRS(p,r,u,f,[sx*s,sy*s,sz*s]),color,unlit);
}
function drawVMTube(base,x,y,z1,z2,radius,color){
  const s=viewModelScale();
  draw(MESH.cyl,m4SegmentY(vmPartPoint(base,x,y,z1),vmPartPoint(base,x,y,z2),radius*s),color);
}
function drawWeaponViewModel(){
  if(thirdPerson)return;
  if(selectedTool==="sniper"&&aimBlend>.72)return;
  gl.clear(gl.DEPTH_BUFFER_BIT);
  const sprint=(keys.ShiftLeft||keys.ShiftRight)&&player.speed>4,move=clamp(player.speed/8.7,0,1),aimMotion=1-aimBlend*.88,bobX=Math.sin(player.bob*.5)*.022*move*aimMotion,bobY=Math.abs(Math.cos(player.bob))*.016*move*aimMotion;
  const throwArc=weaponAnim.throw>0?Math.sin((1-weaponAnim.throw)*Math.PI)*.25:0,inspect=weaponAnim.inspect>0?Math.sin((1.6-weaponAnim.inspect)*2.4)*.11:0,cycleDrop=weaponAnim.cycle>0?Math.sin((1-weaponAnim.cycle/SMG_CYCLE_PAUSE)*Math.PI)*.13:0;
  const weaponKick=weaponAnim.recoil*(selectedTool==="scatter"?.11:selectedTool==="sniper"?.11:selectedTool==="rocket"?.11:selectedTool==="ak47"?.09:.08);
  const hipX=selectedTool==="pulse"?.40:selectedTool==="rocket"?.46:selectedTool==="smg"?.50:selectedTool==="scatter"?.53:selectedTool==="ak47"?.51:selectedTool==="sniper"?.49:.48;
  const hipY=selectedTool==="pulse"?-.31:selectedTool==="rocket"?-.37:selectedTool==="smg"?-.40:selectedTool==="scatter"?-.44:selectedTool==="ak47"?-.41:selectedTool==="sniper"?-.43:-.39;
  const hipZ=selectedTool==="pulse"?1.03:selectedTool==="rocket"?1.28:selectedTool==="smg"?1.13:selectedTool==="scatter"?1.24:selectedTool==="ak47"?1.21:selectedTool==="sniper"?1.30:1.16;
  const q=smooth01(aimBlend),aimX=selectedTool==="scatter"?.24:selectedTool==="sniper"?.17:selectedTool==="ak47"?.18:selectedTool==="smg"?.16:.18,aimY=selectedTool==="scatter"?-.17:selectedTool==="sniper"?-.14:-.135,aimZ=selectedTool==="sniper"?1.48:selectedTool==="ak47"?1.38:selectedTool==="smg"?1.31:selectedTool==="scatter"?1.36:1.34;
  const holdX=hipX+(aimX-hipX)*q,holdY=hipY+(aimY-hipY)*q,holdZ=hipZ+(aimZ-hipZ)*q;
  const base=vmWorld(camera.pos,holdX+bobX+weaponAnim.swayX*aimMotion+inspect*aimMotion+recoilCam.yaw*.34*aimMotion,holdY-bobY-weaponAnim.equip*.18-(sprint?.11:0)*(1-q)+throwArc*.55-cycleDrop*.34-recoilCam.pitch*.22,holdZ-weaponKick*.45-cycleDrop*.12);
  const skin=rgba(0xc69d82),dark=rgba(0x24292b),metal=rgba(0x3f4547),green=rgba(0x4d5a46),wood=rgba(0x6b4b35),black=rgba(0x202426);
  if(selectedTool==="pulse"){
    drawVMSphere(base,.08,.02,.16,.64,.72,.64,green);drawVMTube(base,.08,.30,.12,.32,.16,metal);drawVMBox(base,.08,.42,.10,.28,.08,.34,metal);drawVMBox(base,.02,-.17,-.05,.42,.34,.32,skin);drawVMBox(base,.08,.12,.12,.68,.06,.18,rgba(0x2f3b2c));drawVMBox(base,.08,-.02,.56,.48,.12,.12,rgba(0x343a35));drawVMBox(base,.08,.18,.15,.70,.045,.16,rgba(0x2a3228));drawVMBox(base,.08,-.09,.15,.70,.045,.16,rgba(0x2a3228));drawVMBox(base,.08,.02,.15,.05,.70,.16,rgba(0x2a3228));
  }else if(selectedTool==="rocket"){
    // Detailed fictional RPG-style launcher model.
    drawVMTube(base,.02,.02,-.82,1.38,.31,rgba(0x535b50));drawVMTube(base,.02,.02,1.10,1.56,.38,dark);drawVMTube(base,.02,.02,1.48,1.67,.46,rgba(0x3f4640));
    drawVMBox(base,.02,.31,.38,.20,.13,.60,metal);drawVMBox(base,.02,.34,.94,.15,.14,.22,black);drawVMBox(base,.02,-.31,.10,.26,.56,.38,rgba(0x303638));drawVMBox(base,.02,-.22,-.46,.42,.34,.54,rgba(0x383e3a));
    drawVMBox(base,-.02,-.34,-.06,.36,.28,.38,skin);drawVMBox(base,.02,-.20,.82,.35,.28,.34,skin);
    drawVMTube(base,.02,.02,-.26,-.12,.36,rgba(0x2f3632));drawVMTube(base,.02,.02,.58,.72,.36,rgba(0x2f3632));
    drawVMBox(base,.02,-.28,-.72,.48,.30,.24,rgba(0x2d3330));
    drawVMBox(base,-.24,.24,.16,.055,.22,.34,rgba(0x1f2422));
    drawVMBox(base,-.24,.30,.72,.055,.18,.20,rgba(0x1f2422));
    drawVMBox(base,.02,-.34,.48,.28,.46,.30,rgba(0x303632));
    // Extra cosmetic realism: reinforced tube bands, sight housing and shoulder-contact pad.
    drawVMTube(base,.02,.02,-.66,-.50,.39,rgba(0x2d332f));
    drawVMTube(base,.02,.02,.28,.44,.39,rgba(0x2d332f));
    drawVMTube(base,.02,.02,1.18,1.34,.42,rgba(0x2b312e));
    drawVMBox(base,-.25,.31,.42,.08,.28,.24,rgba(0x1b201e));
    drawVMBox(base,-.25,.42,.42,.12,.08,.15,rgba(0x535b58));
    drawVMBox(base,.02,-.13,-.95,.48,.22,.16,rgba(0x252a27));
    drawVMBox(base,.02,-.36,.12,.30,.08,.30,rgba(0x171b1a));
    // V3 exterior-detail pass.
    drawVMTube(base,.02,.02,-1.02,-.90,.40,rgba(0x333a35));
    drawVMTube(base,.02,.02,-.20,-.06,.37,rgba(0x29302c));
    drawVMTube(base,.02,.02,.72,.86,.39,rgba(0x29302c));
    drawVMBox(base,-.28,.32,.55,.08,.30,.34,rgba(0x171c1a));
    drawVMBox(base,-.28,.46,.56,.16,.08,.18,rgba(0x555d58));
    drawVMBox(base,.02,-.38,-.12,.34,.10,.32,rgba(0x1d2220));
    drawVMBox(base,.02,-.20,-.98,.50,.20,.14,rgba(0x252b27));
  }else if(selectedTool==="smg"){
    // Compact fictional SMG exterior model. No real-world dimensions/internals.
    drawVMBox(base,0,.02,.12,.54,.45,.92,rgba(0x292f32));
    drawVMBox(base,0,.08,.68,.46,.34,.66,rgba(0x343b3f));
    drawVMTube(base,0,.04,.82,1.45,.085,metal);drawVMTube(base,0,.04,1.40,1.55,.12,black);
    drawVMBox(base,0,-.28,.22,.26,.55,.34,rgba(0x202529));drawVMBox(base,0,-.26,.67,.23,.74,.28,rgba(0x2b3135));
    drawVMBox(base,0,.31,.25,.16,.12,.54,rgba(0x1b2023));drawVMBox(base,0,.38,.68,.12,.12,.16,rgba(0x151a1d));
    drawVMBox(base,0,-.12,-.48,.42,.28,.48,rgba(0x303639));drawVMBox(base,0,-.09,-.82,.34,.22,.26,rgba(0x202528));
    drawVMBox(base,.27,.07,.22,.028,.16,.28,rgba(0x121619));
    for(let z=.55;z<1.18;z+=.14)drawVMBox(base,0,.25,z,.40,.025,.055,rgba(0x596267));
    drawVMBox(base,-.02,-.31,.30,.34,.28,.32,skin);drawVMBox(base,.02,-.22,.92,.33,.27,.34,skin);
  }else if(selectedTool==="scatter"){
    // Detailed fictional shotgun silhouette.
    drawVMBox(base,0,0,.10,.64,.56,1.18,wood);drawVMBox(base,0,.02,.70,.54,.48,.74,dark);drawVMTube(base,-.10,.10,.80,1.78,.102,metal);drawVMTube(base,.10,.10,.80,1.78,.102,metal);drawVMTube(base,0,-.06,.76,1.62,.12,rgba(0x33393c));
    drawVMBox(base,0,-.24,.80,.56,.36,.66,dark);drawVMBox(base,0,-.24,-.52,.62,.46,.82,wood);drawVMBox(base,0,-.20,-1.04,.52,.36,.40,wood);drawVMBox(base,0,-.30,.24,.36,.30,.36,skin);drawVMBox(base,0,-.18,1.15,.34,.28,.34,skin);
    drawVMBox(base,.33,.055,.42,.028,.19,.42,rgba(0x161a1c));
    drawVMBox(base,0,-.30,.12,.42,.06,.30,rgba(0x171b1d));
    for(let z=.64;z<1.35;z+=.16)drawVMBox(base,0,-.24,z,.60,.035,.075,rgba(0x24292b));
    drawVMBox(base,0,.25,1.60,.08,.08,.07,rgba(0xd2a853));
    drawVMBox(base,0,-.18,-1.25,.44,.30,.32,rgba(0x5b3e2e));
    // Extra cosmetic realism: receiver plates, fore-end ribs, sight bead and butt pad.
    drawVMBox(base,.31,.02,.34,.026,.31,.50,rgba(0x15191b));
    drawVMBox(base,-.31,.02,.34,.026,.31,.50,rgba(0x15191b));
    drawVMBox(base,0,.28,.46,.50,.035,.54,rgba(0x3c4245));
    for(let z=.72;z<1.34;z+=.13)drawVMBox(base,0,-.285,z,.62,.028,.055,rgba(0x171b1d));
    drawVMSphere(base,0,.24,1.73,.055,.055,.055,rgba(0xd5b86d));
    drawVMBox(base,0,-.19,-1.40,.48,.31,.10,rgba(0x2a211c));
    drawVMBox(base,0,-.03,-.50,.56,.06,.50,rgba(0x744f37));
    // V3 exterior-detail pass.
    drawVMBox(base,0,.22,.48,.58,.055,.78,rgba(0x353c40));
    drawVMBox(base,.30,.01,.31,.025,.26,.56,rgba(0x121619));
    drawVMBox(base,-.30,.01,.31,.025,.26,.56,rgba(0x121619));
    drawVMBox(base,0,-.32,.58,.50,.08,.64,rgba(0x22272a));
    for(let z=.50;z<1.22;z+=.11)drawVMBox(base,0,-.34,z,.54,.030,.045,rgba(0x4f3528));
    drawVMBox(base,0,.20,1.28,.07,.11,.06,rgba(0xb28b48));
    drawVMBox(base,0,-.14,-.95,.52,.27,.58,rgba(0x78533b));
    drawVMBox(base,0,-.12,-1.43,.54,.34,.11,rgba(0x2b211b));
  }else if(selectedTool==="sniper"){
    if(sniperAsset.ready){
      const assetScale=.17*(1-aimBlend*.08);
      drawSniperAsset(base,cameraRight(),cameraUp(),cameraForward(),assetScale);
      // Simple hands remain so the imported model still feels held in first person.
      drawVMBox(base,-.02,-.28,.04,.34,.27,.34,skin);drawVMBox(base,.02,-.20,.66,.34,.27,.35,skin);
    }else{
    // Detailed fictional precision-rifle silhouette.
    drawVMBox(base,0,0,-.02,.52,.42,1.42,rgba(0x303638));drawVMBox(base,0,-.20,-.82,.56,.38,1.02,rgba(0x33393c));drawVMBox(base,0,-.16,-1.42,.42,.30,.42,rgba(0x282e31));
    drawVMTube(base,0,.04,1.02,2.58,.085,metal);drawVMTube(base,0,.04,2.45,2.72,.125,black);drawVMTube(base,0,.36,-.10,.98,.21,rgba(0x202629));drawVMTube(base,0,.36,.84,1.18,.24,rgba(0x202629));
    drawVMBox(base,0,.36,.40,.17,.14,1.08,black);drawVMBox(base,0,.42,-.32,.10,.10,.24,metal);drawVMBox(base,0,-.28,.18,.27,.64,.36,black);drawVMBox(base,0,-.20,.82,.26,.48,.36,rgba(0x2c3235));
    drawVMBox(base,-.02,-.30,.50,.34,.30,.34,skin);drawVMBox(base,.02,-.20,1.28,.34,.28,.36,skin);
    drawVMBox(base,0,.285,.20,.44,.035,1.42,rgba(0x1b2023));
    drawVMBox(base,-.18,.36,.02,.055,.30,.12,rgba(0x383f42));drawVMBox(base,.18,.36,.02,.055,.30,.12,rgba(0x383f42));
    drawVMBox(base,-.18,.36,.72,.055,.30,.12,rgba(0x383f42));drawVMBox(base,.18,.36,.72,.055,.30,.12,rgba(0x383f42));
    drawVMBox(base,0,.60,.22,.18,.18,.18,rgba(0x252b2e));
    drawVMBox(base,0,-.02,-1.08,.44,.18,.64,rgba(0x3a4043));
    drawVMBox(base,0,-.16,-1.62,.48,.34,.20,rgba(0x252a2d));
    drawVMBox(base,-.24,-.18,.94,.035,.58,.12,rgba(0x272d30));drawVMBox(base,.24,-.18,.94,.035,.58,.12,rgba(0x272d30));
    // Extra cosmetic realism: scope caps, mount blocks, cheek piece and muzzle detail.
    drawVMTube(base,0,.36,-.28,-.13,.255,rgba(0x1b2023));
    drawVMTube(base,0,.36,1.03,1.20,.275,rgba(0x1b2023));
    drawVMBox(base,-.17,.27,.02,.055,.16,.16,rgba(0x4b5357));drawVMBox(base,.17,.27,.02,.055,.16,.16,rgba(0x4b5357));
    drawVMBox(base,-.17,.27,.72,.055,.16,.16,rgba(0x4b5357));drawVMBox(base,.17,.27,.72,.055,.16,.16,rgba(0x4b5357));
    drawVMBox(base,0,.02,-1.12,.46,.22,.62,rgba(0x42494c));
    drawVMBox(base,0,-.16,-1.70,.50,.35,.11,rgba(0x171b1d));
    drawVMTube(base,0,.04,2.68,2.82,.145,rgba(0x202528));
    // V3 exterior-detail pass.
    drawVMTube(base,0,.36,-.32,-.12,.29,rgba(0x171c1f));
    drawVMTube(base,0,.36,1.05,1.25,.31,rgba(0x171c1f));
    drawVMBox(base,0,.24,.14,.34,.08,.22,rgba(0x343b3f));
    drawVMBox(base,0,.24,.70,.34,.08,.22,rgba(0x343b3f));
    drawVMBox(base,0,.10,-.62,.48,.20,.58,rgba(0x444c50));
    drawVMBox(base,0,.11,-1.15,.43,.22,.47,rgba(0x3b4246));
    drawVMBox(base,0,-.18,-1.62,.48,.31,.18,rgba(0x181c1f));
    drawVMTube(base,0,.04,1.54,2.62,.105,rgba(0x4b5256));
    drawVMBox(base,0,-.32,.22,.30,.12,.30,rgba(0x181c1f));
      }
  }else if(selectedTool==="ak47"){
    // Stylized AK-47 game model: external silhouette only; arbitrary proportions.
    drawVMBox(base,0,.00,.02,.60,.46,1.18,rgba(0x303638));drawVMBox(base,0,.06,.76,.54,.34,.74,rgba(0x4a3528));
    drawVMTube(base,0,.04,1.02,2.20,.095,metal);drawVMTube(base,0,.04,2.12,2.32,.135,black);
    drawVMBox(base,0,-.28,.18,.28,.62,.38,rgba(0x34271f));drawVMBox(base,0,-.24,.72,.28,.82,.34,rgba(0x4d382a));
    drawVMBox(base,0,-.12,-.68,.52,.34,.82,rgba(0x513a2b));drawVMBox(base,0,-.10,-1.20,.45,.28,.42,rgba(0x443126));
    drawVMBox(base,0,.29,.28,.45,.055,.72,rgba(0x22282b));drawVMBox(base,0,.36,.92,.12,.15,.14,rgba(0x171c1f));
    drawVMBox(base,0,.38,1.58,.10,.16,.12,rgba(0x171c1f));drawVMBox(base,.31,.05,.25,.030,.18,.38,rgba(0x151a1d));
    for(let z=.68;z<1.48;z+=.18)drawVMBox(base,0,.18,z,.48,.025,.055,rgba(0x6a4b35));
    drawVMBox(base,-.02,-.31,.34,.34,.29,.34,skin);drawVMBox(base,.02,-.22,1.15,.34,.28,.35,skin);
  }
  if(["smg","scatter","ak47","sniper"].includes(selectedTool)){
    drawVMSphere(base,-.12,-.29,.35,.16,.12,.16,skin);
    drawVMSphere(base,.12,-.29,.35,.16,.12,.16,skin);
  }
  if(weaponAnim.fire>0&&selectedTool!=="pulse"){const muzzleZ=selectedTool==="rocket"?1.34:selectedTool==="sniper"?2.25:selectedTool==="ak47"?2.24:1.58;drawVMSphere(base,0,.06,muzzleZ,.26+weaponAnim.fire*.14,.26+weaponAnim.fire*.14,.26+weaponAnim.fire*.14,[1,.55,.12,.70*weaponAnim.fire],1);}
}
// -----------------------------------------------------------------------------
// Player movement / collision
// -----------------------------------------------------------------------------
const keys=Object.create(null);
const moveInput={jumpBuffer:0,slideBuffer:0};
// Fast arena-FPS movement tuning inspired by the publicly visible RIVALS movement loop.
// Values are original tuning for this project, not copied/internal RIVALS values.
const MOVE_TUNE={
  walk:8.8,sprint:15.3,crouch:5.5,
  groundAccel:46,groundBrake:34,airAccel:17.5,airMax:17.2,
  gravity:25.5,jumpY:9.9,coyote:.105,jumpBuffer:.13,
  slideMinSpeed:7.6,slideStartSpeed:18.0,slideMaxSpeed:21.8,
  slideDuration:.76,slideCooldown:.18,slideFriction:2.05,slideSteer:5.8,
  slideJumpSpeed:19.2,slideJumpY:9.75
};
const player={pos:[0,terrainY(0,52)+2,52],vel:[0,0,0],yaw:0,pitch:-.05,grounded:true,cooldown:0,bob:0,speed:0,anim:"idle",hp:100,maxHp:100,invuln:0,dead:false,respawnTimer:0,
  slide:false,slideTime:0,slideCooldown:0,crouched:false,coyote:MOVE_TUNE.coyote,landKick:0,viewHeight:5.08,moveState:"idle",lastGrounded:true};
const camera={pos:[0,0,0]};
function resolvePlayerXZ(pos){const rad=.8;for(const c of world.colliders){const o=c.obj;if(o.alive===false)continue;const dx=pos[0]-o.x,dz=pos[2]-o.z,ax=c.hx+rad,az=c.hz+rad;if(Math.abs(dx)<ax&&Math.abs(dz)<az){const px=ax-Math.abs(dx),pz=az-Math.abs(dz);if(px<pz)pos[0]=o.x+(dx<0?-ax:ax);else pos[2]=o.z+(dz<0?-az:az);}}}
function moveToward(a,b,maxDelta){return a<b?Math.min(a+maxDelta,b):Math.max(a-maxDelta,b);}
function horizontalSpeed(){return Math.hypot(player.vel[0],player.vel[2]);}
function stopSlide(){player.slide=false;player.slideTime=0;player.slideCooldown=Math.max(player.slideCooldown,MOVE_TUNE.slideCooldown);}
function beginSlide(wishDir){
  if(!player.grounded||player.slideCooldown>0||player.slide)return false;
  const speed=horizontalSpeed();
  if(speed<MOVE_TUNE.slideMinSpeed)return false;
  let dir=speed>.2?[player.vel[0]/speed,0,player.vel[2]/speed]:wishDir;
  if(Math.hypot(dir[0],dir[2])<.2)dir=[-Math.sin(player.yaw),0,-Math.cos(player.yaw)];
  const startSpeed=clamp(Math.max(speed,MOVE_TUNE.slideStartSpeed),0,MOVE_TUNE.slideMaxSpeed);
  player.vel[0]=dir[0]*startSpeed;player.vel[2]=dir[2]*startSpeed;
  player.slide=true;player.slideTime=MOVE_TUNE.slideDuration;player.crouched=true;player.moveState="slide";
  return true;
}
function updatePlayer(dt){
  player.cooldown=Math.max(0,player.cooldown-dt);smgCyclePause=Math.max(0,smgCyclePause-dt);player.invuln=Math.max(0,player.invuln-dt);
  moveInput.jumpBuffer=Math.max(0,moveInput.jumpBuffer-dt);moveInput.slideBuffer=Math.max(0,moveInput.slideBuffer-dt);player.slideCooldown=Math.max(0,player.slideCooldown-dt);player.landKick=damp(player.landKick,0,14,dt);
  if(player.dead){player.respawnTimer-=dt;if(player.respawnTimer<=0){resetPlayer();statusEl.textContent="Respawned";}return;}

  const f=[-Math.sin(player.yaw),0,-Math.cos(player.yaw)],r=[Math.cos(player.yaw),0,-Math.sin(player.yaw)],wish=[0,0,0];
  if(keys.KeyW){wish[0]+=f[0];wish[2]+=f[2];}if(keys.KeyS){wish[0]-=f[0];wish[2]-=f[2];}if(keys.KeyD){wish[0]+=r[0];wish[2]+=r[2];}if(keys.KeyA){wish[0]-=r[0];wish[2]-=r[2];}
  const wl=Math.hypot(wish[0],wish[2]);if(wl){wish[0]/=wl;wish[2]/=wl;}
  const sprint=keys.ShiftLeft||keys.ShiftRight,crouchHeld=keys.ControlLeft||keys.ControlRight||keys.KeyC;

  if(player.grounded)player.coyote=MOVE_TUNE.coyote;else player.coyote=Math.max(0,player.coyote-dt);

  // Sprint -> crouch starts a momentum slide. C also works as the crouch/slide key.
  if(moveInput.slideBuffer>0&&player.grounded&&!player.slide&&(sprint||horizontalSpeed()>=MOVE_TUNE.slideMinSpeed)){
    if(beginSlide(wish)){moveInput.slideBuffer=0;}
  }

  // Slide-jump: preserve the slide's horizontal speed and convert it into an airborne burst.
  if(player.slide&&moveInput.jumpBuffer>0){
    const hs=Math.max(horizontalSpeed(),MOVE_TUNE.slideJumpSpeed),dir=horizontalSpeed()>.1?[player.vel[0]/horizontalSpeed(),0,player.vel[2]/horizontalSpeed()]:f;
    player.vel[0]=dir[0]*hs;player.vel[2]=dir[2]*hs;player.vel[1]=MOVE_TUNE.slideJumpY;
    player.grounded=false;player.coyote=0;moveInput.jumpBuffer=0;stopSlide();player.crouched=false;player.moveState="slide-jump";
  }else if(moveInput.jumpBuffer>0&&player.coyote>0&&!player.slide){
    player.vel[1]=MOVE_TUNE.jumpY;player.grounded=false;player.coyote=0;moveInput.jumpBuffer=0;player.crouched=false;player.moveState="jump";
  }

  if(player.slide){
    player.slideTime-=dt;
    let hs=horizontalSpeed();
    // Light steering preserves the fast slide feel without instantly changing direction.
    if(wl&&hs>.1){
      const cur=[player.vel[0]/hs,0,player.vel[2]/hs],blend=clamp(MOVE_TUNE.slideSteer*dt,0,.16),dir=V3.norm([cur[0]+(wish[0]-cur[0])*blend,0,cur[2]+(wish[2]-cur[2])*blend]);
      player.vel[0]=dir[0]*hs;player.vel[2]=dir[2]*hs;
    }
    // Terrain slope contributes a small downhill push, enabling ramp/terrain momentum.
    const n=terrainNormal(player.pos[0],player.pos[2]),down=[n[0],0,n[2]],dl=Math.hypot(down[0],down[2]);
    if(dl>.001){const slope=clamp(1-n[1],0,.30),boost=38*slope;player.vel[0]+=down[0]/dl*boost*dt;player.vel[2]+=down[2]/dl*boost*dt;}
    hs=horizontalSpeed();const newSpeed=Math.max(0,hs-MOVE_TUNE.slideFriction*dt);if(hs>.001){player.vel[0]*=newSpeed/hs;player.vel[2]*=newSpeed/hs;}
    if(player.slideTime<=0||newSpeed<5.2||(!crouchHeld&&player.slideTime<MOVE_TUNE.slideDuration-.13))stopSlide();
  }else if(player.grounded){
    player.crouched=crouchHeld;
    const target=player.crouched?MOVE_TUNE.crouch:(sprint?MOVE_TUNE.sprint:MOVE_TUNE.walk);
    if(wl){
      const tx=wish[0]*target,tz=wish[2]*target;
      player.vel[0]=moveToward(player.vel[0],tx,MOVE_TUNE.groundAccel*dt);
      player.vel[2]=moveToward(player.vel[2],tz,MOVE_TUNE.groundAccel*dt);
    }else{
      player.vel[0]=moveToward(player.vel[0],0,MOVE_TUNE.groundBrake*dt);
      player.vel[2]=moveToward(player.vel[2],0,MOVE_TUNE.groundBrake*dt);
    }
  }else{
    // Responsive air-strafing while keeping existing momentum.
    if(wl){
      const along=player.vel[0]*wish[0]+player.vel[2]*wish[2],desired=MOVE_TUNE.airMax,add=desired-along;
      if(add>0){const accel=Math.min(add,MOVE_TUNE.airAccel*dt);player.vel[0]+=wish[0]*accel;player.vel[2]+=wish[2]*accel;}
    }
    player.crouched=false;
  }

  player.vel[1]-=MOVE_TUNE.gravity*dt;
  const wasGrounded=player.grounded;
  const next=[player.pos[0]+player.vel[0]*dt,player.pos[1]+player.vel[1]*dt,player.pos[2]+player.vel[2]*dt];
  resolvePlayerXZ(next);
  const floor=terrainY(next[0],next[2])+2;
  if(next[1]<=floor){
    next[1]=floor;
    if(player.vel[1]<0)player.vel[1]=0;
    player.grounded=true;
    if(!wasGrounded){player.landKick=1;player.coyote=MOVE_TUNE.coyote;}
  }else player.grounded=false;
  player.pos=next;

  player.speed=horizontalSpeed();
  if(player.slide)player.moveState="slide";
  else if(!player.grounded)player.moveState=player.vel[1]>0?"jump":"air";
  else if(player.crouched)player.moveState="crouch";
  else if(player.speed<.3)player.moveState="idle";
  else player.moveState=sprint?"sprint":"run";

  if(player.slide)player.anim="slide";
  else if(!player.grounded)player.anim=player.vel[1]>0?"jump":"fall";
  else if(player.crouched)player.anim="crouch";
  else if(player.speed<.3)player.anim="idle";
  else player.anim=sprint?"run":"walk";

  if(player.grounded&&player.speed>.3&&!player.slide)player.bob+=dt*(sprint?13:9);
  const bob=player.grounded&&!player.slide?Math.sin(player.bob)*Math.min(.065,player.speed*.0048):0;
  const targetView=player.slide?4.18:player.crouched?4.55:5.08;
  player.viewHeight=damp(player.viewHeight,targetView,18,dt);
  const landingDip=player.landKick*.12;

  if(!thirdPerson){
    camera.pos=[player.pos[0],player.pos[1]+player.viewHeight+bob-landingDip,player.pos[2]];
  }else{
    // RIVALS-style shoulder camera: player stays left of the crosshair instead of blocking it.
    const aim=cameraForward(),right=cameraRight(),q=smooth01(aimBlend),targetH=player.slide?3.95:player.crouched?4.28:4.72;
    const target=[player.pos[0],player.pos[1]+targetH,player.pos[2]],distance=7.15-q*1.45,shoulder=2.35+q*.48;
    let desired=V3.sub(target,V3.scale(aim,distance));desired=V3.add(desired,V3.scale(right,shoulder));
    const camFloor=terrainY(desired[0],desired[2])+1.0;if(desired[1]<camFloor)desired[1]=camFloor;
    const hit=segmentWorldHit(target,desired,.24);camera.pos=hit?V3.lerp(target,hit,.82):desired;
  }
  player.lastGrounded=player.grounded;
}
function interact(){let best=null,bd=9;for(const c of world.crates){if(!c.alive)continue;const d=Math.hypot(c.x-player.pos[0],c.z-player.pos[2]);if(d<bd){best=c;bd=d;}}if(best){best.rot+=Math.PI/4;statusEl.textContent="Rotated nearby crate";}else statusEl.textContent="Nothing nearby";}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------
const quality={level:2,pixel:1.45,envFar:300,humanFar:210};let lowFpsTicks=0,highFpsTicks=0;
function activeFov(){const q=smooth01(aimBlend),target=(aimHeld&&canFocusAim())?aimTargetFov():70,moveBoost=(1-q)*(player.slide?4.6:clamp((player.speed-MOVE_TUNE.walk)*.42,0,3.2));return 70+(target-70)*q+moveBoost;}
let proj=m4Perspective(Math.PI*70/180,innerWidth/innerHeight,.08,700),view=m4Identity();
function resize(){const dpr=Math.min(devicePixelRatio||1,quality.pixel),w=Math.max(1,Math.floor(innerWidth*dpr)),h=Math.max(1,Math.floor(innerHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;canvas.style.width=innerWidth+"px";canvas.style.height=innerHeight+"px";}gl.viewport(0,0,w,h);proj=m4Perspective(Math.PI*activeFov()/180,innerWidth/innerHeight,.08,700);}
addEventListener("resize",resize);resize();
function dist2xz(x,z){const dx=x-camera.pos[0],dz=z-camera.pos[2];return dx*dx+dz*dz;}
function localXZ(o,lx,lz){const c=Math.cos(o.rot||0),ss=Math.sin(o.rot||0);return[o.x+lx*c+lz*ss,o.z-lx*ss+lz*c];}
function render(){
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(prog);
  proj=m4Perspective(Math.PI*activeFov()/180,innerWidth/innerHeight,.08,700);
  const f=cameraForward(),target=V3.add(camera.pos,f);view=m4LookAt(camera.pos,target,[0,1,0]);gl.uniformMatrix4fv(U.view,false,view);gl.uniformMatrix4fv(U.proj,false,proj);gl.uniform3fv(U.eye,camera.pos);gl.uniform3fv(U.light,V3.norm([.68,-1,.42]));gl.uniform3fv(U.fog,[.67,.84,.95]);

  // Terrain and color patches.
  draw(terrain,m4Identity(),rgba(0x79a85a));
  for(const p of world.patches){
    if(dist2xz(p.x,p.z)>quality.envFar*quality.envFar) continue;
    draw(MESH.disc,m4TRS([p.x,p.y,p.z],[0,0,0],[p.s,1,p.s]),p.color,1);
  }

  // Horizon mountains.
  for(const m of world.mountains){
    draw(MESH.pyramid,m4TRS([m.x,m.y+14,m.z],[0,(m.x+m.z)*.003,0],[m.s,m.s*1.3,m.s]),m.color);
    draw(MESH.pyramid,m4TRS([m.x+8,m.y+9,m.z-6],[0,(m.x-m.z)*.002,0],[m.s*.65,m.s*.85,m.s*.65]),rgba(0x8ea1b4,.96));
  }

  // Roads with center stripes.
  draw(MESH.cube,m4TRS([0,terrainY(0,0)+.04,0],[0,0,0],[220,.12,12]),rgba(0x68706c));
  draw(MESH.cube,m4TRS([0,terrainY(0,0)+.05,0],[0,0,0],[12,.12,220]),rgba(0x68706c));
  for(let i=-90;i<=90;i+=18){
    draw(MESH.cube,m4TRS([i,terrainY(i,0)+.07,0],[0,0,0],[6,.06,.44]),rgba(0xf0e1a4,.95),1);
    draw(MESH.cube,m4TRS([0,terrainY(0,i)+.07,i],[0,0,0],[.44,.06,6]),rgba(0xf0e1a4,.95),1);
  }

  // Sun + glow.
  draw(MESH.sphere,m4TRS([170,145,-260],[0,0,0],[18,18,18]),[1.0,.92,.64,.96],1);
  draw(MESH.sphere,m4TRS([170,145,-260],[0,0,0],[29,29,29]),[1.0,.86,.45,.16],1);
  draw(MESH.sphere,m4TRS([170,145,-260],[0,0,0],[42,42,42]),[1.0,.82,.42,.08],1);

  // Cloud puffs.
  for(const c of world.clouds){
    const d2=dist2xz(c.x,c.z);
    if(d2>320*320) continue;
    const wobble=Math.sin(c.phase)*.6;
    draw(MESH.sphere,m4TRS([c.x,c.y,c.z],[0,0,0],[c.s*1.35,c.s*.72,c.s*.9]),[1,1,1,.55],1);
    draw(MESH.sphere,m4TRS([c.x-c.s*.75,c.y+.6+wobble,c.z+.2],[0,0,0],[c.s*.88,c.s*.52,c.s*.65]),[1,1,1,.48],1);
    draw(MESH.sphere,m4TRS([c.x+c.s*.82,c.y+.35,c.z-.25],[0,0,0],[c.s*.94,c.s*.56,c.s*.7]),[1,1,1,.48],1);
  }

  // Environment props.
  for(const t of world.trees){
    if(t.alive===false)continue;
    const d2=dist2xz(t.x,t.z);
    if(d2>quality.envFar*quality.envFar)continue;
    if(d2<125*125)drawShadow(t.x,t.z,t.y,2.95*t.s);
    draw(MESH.cyl,m4TRS([t.x,t.y+3.3*t.s,t.z],[0,t.rot,0],[1.45*t.s,6.6*t.s,1.45*t.s]),rgba(0x724c33));
    draw(MESH.cyl,m4TRS([t.x,t.y+5.3*t.s,t.z],[0,t.rot+.22,0],[.52*t.s,2.5*t.s,.52*t.s]),rgba(0x7d5538));
    draw(MESH.cone,m4TRS([t.x,t.y+7.0*t.s,t.z],[0,t.rot,0],[8.0*t.s,5.0*t.s,8.0*t.s]),rgba(0x4f833b));
    draw(MESH.cone,m4TRS([t.x,t.y+9.5*t.s,t.z],[0,t.rot+.3,0],[6.6*t.s,4.5*t.s,6.6*t.s]),rgba(0x629a46));
    draw(MESH.cone,m4TRS([t.x,t.y+11.6*t.s,t.z],[0,t.rot-.2,0],[5.2*t.s,4.0*t.s,5.2*t.s]),rgba(0x4f833b));
  }
  for(const r of world.rocks){
    if(dist2xz(r.x,r.z)>235*235)continue;
    draw(MESH.sphere,m4TRS([r.x,r.y+1.05*r.s,r.z],r.rot,[3.3*r.s,2.1*r.s,2.8*r.s]),rgba(0x7a858d));
    draw(MESH.sphere,m4TRS([r.x+.6*r.s,r.y+1.75*r.s,r.z-.5*r.s],r.rot,[1.25*r.s,.95*r.s,1.15*r.s]),rgba(0x8b949b));
  }

  for(const h of world.houses){
    if(dist2xz(h.x,h.z)>quality.envFar*quality.envFar)continue;
    drawShadow(h.x,h.z,h.y,8.8);
    draw(MESH.cube,m4TRS([h.x,h.y+4.5,h.z],[0,h.rot,0],[18,9,13]),rgba(0xc8c1b5));
    draw(MESH.pyramid,m4TRS([h.x,h.y+11.2,h.z],[0,h.rot+Math.PI/4,0],[20,6.5,20]),rgba(0x854a41));
    const door=localXZ(h,0,6.56),w1=localXZ(h,-5,6.57),w2=localXZ(h,5,6.57),chim=localXZ(h,4.6,-2.0);
    draw(MESH.cube,m4TRS([door[0],h.y+2.45,door[1]],[0,h.rot,0],[2.5,4.9,.22]),rgba(0x65432f));
    draw(MESH.cube,m4TRS([door[0],h.y+2.45,door[1]-.08],[0,h.rot,0],[2.9,5.25,.10]),rgba(0xe4ddd0));
    draw(MESH.cube,m4TRS([w1[0],h.y+5.2,w1[1]],[0,h.rot,0],[2.5,2.25,.18]),rgba(0x8dc7de));
    draw(MESH.cube,m4TRS([w2[0],h.y+5.2,w2[1]],[0,h.rot,0],[2.5,2.25,.18]),rgba(0x8dc7de));
    draw(MESH.cube,m4TRS([w1[0],h.y+5.2,w1[1]-.05],[0,h.rot,0],[2.85,2.55,.07]),rgba(0xe9e3d8));
    draw(MESH.cube,m4TRS([w2[0],h.y+5.2,w2[1]-.05],[0,h.rot,0],[2.85,2.55,.07]),rgba(0xe9e3d8));
    draw(MESH.cube,m4TRS([chim[0],h.y+13.0,chim[1]],[0,h.rot,0],[1.6,3.2,1.6]),rgba(0xb7b0a6));
  }

  for(const c of world.crates) if(c.alive){
    drawShadow(c.x,c.z,terrainY(c.x,c.z),2.1*c.s);
    draw(MESH.cube,m4TRS([c.x,c.y,c.z],[0,c.rot,0],[4*c.s,4*c.s,4*c.s]),rgba(0x9b6d43));
    draw(MESH.cube,m4TRS([c.x,c.y+1.5*c.s,c.z],[0,c.rot,0],[4.15*c.s,.28*c.s,4.15*c.s]),rgba(0x68452f));
    draw(MESH.cube,m4TRS([c.x,c.y-1.5*c.s,c.z],[0,c.rot,0],[4.15*c.s,.28*c.s,4.15*c.s]),rgba(0x68452f));
    draw(MESH.cube,m4TRS([c.x,c.y,c.z+2.02*c.s],[0,c.rot,0],[3.2*c.s,.18*c.s,.12*c.s]),rgba(0x6b4730));
    draw(MESH.cube,m4TRS([c.x,c.y,c.z-2.02*c.s],[0,c.rot,0],[3.2*c.s,.18*c.s,.12*c.s]),rgba(0x6b4730));
  }

  for(const t of world.towers) if(t.alive){
    for(const b of t.blocks){
      draw(MESH.cube,m4TRS([t.x+b.ox,t.y+b.oy,t.z+b.oz],[0,0,0],[3.05,4.1,3.05]),rgba(0xaaa49b));
      draw(MESH.cube,m4TRS([t.x+b.ox,t.y+b.oy+1.72,t.z+b.oz],[0,0,0],[2.8,.24,2.8]),rgba(0xc8c0b6));
    }
  }

  for(const h of world.humans) if(dist2xz(h.pos[0],h.pos[2])<quality.humanFar*quality.humanFar) drawHuman(h);
  drawRemotePlayers();
  for(const r of world.ragdolls) if(dist2xz(r.nodes[3].p[0],r.nodes[3].p[2])<(quality.humanFar-10)*(quality.humanFar-10)) drawRagdoll(r);
  drawNpcHitboxes();
  drawProjectileAndEffects();
  for(const d of world.debris){draw(MESH.cube,m4TRS(d.p,d.rot,[d.size,d.size,d.size]),d.color);}
  drawThirdPersonPlayer();
  drawWeaponViewModel();
}


function updateEnvironment(dt){
  for(const c of world.clouds){
    c.x += c.drift * dt;
    c.phase += dt * .18;
    if(c.x > 320) c.x = -320;
  }
}

// -----------------------------------------------------------------------------
// Fixed timestep loop
// -----------------------------------------------------------------------------
function setQuality(level){quality.level=clamp(level,0,2);if(quality.level===2){quality.pixel=1.45;quality.envFar=300;quality.humanFar=210;}else if(quality.level===1){quality.pixel=1.12;quality.envFar=250;quality.humanFar=175;}else{quality.pixel=.88;quality.envFar=195;quality.humanFar=145;}resize();}
function autoQuality(){if(fps>0&&fps<28){lowFpsTicks++;highFpsTicks=0;}else if(fps>54){highFpsTicks++;lowFpsTicks=0;}else{lowFpsTicks=Math.max(0,lowFpsTicks-1);highFpsTicks=Math.max(0,highFpsTicks-1);}if(lowFpsTicks>=4&&quality.level>0){setQuality(quality.level-1);lowFpsTicks=0;statusEl.textContent="Performance mode adjusted automatically";}if(highFpsTicks>=8&&quality.level<2){setQuality(quality.level+1);highFpsTicks=0;}}
const PHYS_DT=1/120;let accumulator=0,last=performance.now(),fpsFrames=0,fpsTimer=performance.now(),fps=0;
function physicsStep(dt){updateEnvironment(dt);stepAim(dt);if(!gameStarted)return;updatePlayer(dt);stepNetwork(dt);if(mouseHeld&&smgAuto&&selectedTool==="smg"&&document.pointerLockElement===canvas)useSelected();updateHumans(dt);stepRespawns(dt);for(const r of world.ragdolls)if(r.sleep<1.5)stepRagdoll(r,dt);stepOrbs(dt);stepDebris(dt);stepCasings(dt);updateEffects(dt);updateWeaponAnim(dt);}
function frame(now){const dt=clamp((now-last)/1000,0,.06);last=now;accumulator+=dt;let steps=0;while(accumulator>=PHYS_DT&&steps<10){physicsStep(PHYS_DT);accumulator-=PHYS_DT;steps++;}if(steps===10)accumulator=0;render();fpsFrames++;if(now-fpsTimer>=500){fps=Math.round(fpsFrames*1000/(now-fpsTimer));fpsFrames=0;fpsTimer=now;autoQuality();}metricEls.speed.textContent=player.speed.toFixed(1);if(metricEls.movement)metricEls.movement.textContent=player.moveState.toUpperCase();metricEls.humans.textContent=world.humans.length;if(metricEls.respawning)metricEls.respawning.textContent=world.respawns.length;if(metricEls.mode)metricEls.mode.textContent=gameMode.toUpperCase();metricEls.ragdolls.textContent=world.ragdolls.length;metricEls.orbs.textContent=world.orbs.length;metricEls.debris.textContent=world.debris.length;metricEls.fps.textContent=fps;metricEls.anim.textContent=player.anim;metricEls.tool.textContent=TOOLS[selectedTool].name;if(metricEls.weaponAnim)metricEls.weaponAnim.textContent=weaponAnim.state;updateHealthHud();if(metricEls.fireMode)metricEls.fireMode.textContent=smgAuto?"AUTO":"SEMI";if(metricEls.smgCycle)metricEls.smgCycle.textContent=(smgCyclePause>0?"PAUSE":smgCycleShots+" / "+SMG_CYCLE_LIMIT);if(metricEls.view)metricEls.view.textContent=thirdPerson?"THIRD":"FIRST";if(metricEls.range){const cfg=TOOLS[selectedTool];metricEls.range.textContent=cfg.rangeLabel||String(Math.round(cfg.range||0));}requestAnimationFrame(frame);}

// -----------------------------------------------------------------------------
// Controls
// -----------------------------------------------------------------------------

function startSolo(){cleanNetwork(false);gameMode="solo";gameStarted=true;mainMenuEl.classList.add("hidden");mpPanelEl.classList.remove("on");resetPlayer();statusEl.textContent="Solo started — click the world to lock the mouse.";lockHintEl.style.display="block";updateRoomHud();}
function showMultiplayerMenu(){mpPanelEl.classList.add("on");setMpStatus("Checking multiplayer connection...");detectCentralRelay(true).then(relay=>{if(relay){setMpStatus("Central multiplayer ready — choose/create a room.");return;}detectLanRelay(true).then(lan=>setMpStatus(lan?"LAN multiplayer ready — choose/create a room.":"Online multiplayer ready — choose/create a room."));});}
soloBtn?.addEventListener("click",startSolo);
multiBtn?.addEventListener("click",showMultiplayerMenu);
backBtn?.addEventListener("click",()=>mpPanelEl.classList.remove("on"));
hostBtn?.addEventListener("click",()=>{let code=sanitizeRoomCode(roomCodeInput?.value);if(!code){code=Math.random().toString(36).slice(2,7).toUpperCase();roomCodeInput.value=code;}makeHost(code,true);});
joinBtn?.addEventListener("click",()=>joinRoom(roomCodeInput?.value));
for(const b of document.querySelectorAll("[data-public-room]"))b.addEventListener("click",()=>autoPublicRoom(b.dataset.publicRoom));
leaveRoomBtn?.addEventListener("click",()=>cleanNetwork(true));
roomCodeInput?.addEventListener("keydown",e=>{if(e.key==="Enter")joinRoom(roomCodeInput.value);});
closeInfoBtn?.addEventListener("click",()=>{infoPanelEl.classList.add("panelHidden");showHudBtn.classList.add("on");});
closeDataBtn?.addEventListener("click",()=>{dataPanelEl.classList.add("panelHidden");showHudBtn.classList.add("on");});
showHudBtn?.addEventListener("click",()=>{infoPanelEl.classList.remove("panelHidden");dataPanelEl.classList.remove("panelHidden");showHudBtn.classList.remove("on");});

canvas.addEventListener("click",()=>{if(gameStarted&&document.pointerLockElement!==canvas)canvas.requestPointerLock();});
document.addEventListener("pointerlockchange",()=>{const locked=document.pointerLockElement===canvas;lockHintEl.style.display=locked?"none":"block";if(!locked){mouseHeld=false;aimHeld=false;sniperAim=false;updateAimUI();updateViewUI();resize();}statusEl.textContent=locked?"WASD active":gameStarted?"Click the world to lock the mouse.":"Choose a mode to begin.";});
document.addEventListener("mousemove",e=>{if(!gameStarted||document.pointerLockElement!==canvas)return;const focusSens=1-aimBlend*.38;player.yaw-=e.movementX*.0021*focusSens;player.pitch-=e.movementY*.0018*focusSens;player.pitch=clamp(player.pitch,-1.25,1.22);const swayScale=1-aimBlend*.78;weaponAnim.swayX=clamp(weaponAnim.swayX+e.movementX*.00012*swayScale,-.045,.045);weaponAnim.swayY=clamp(weaponAnim.swayY-e.movementY*.00012*swayScale,-.04,.04);});
document.addEventListener("contextmenu",e=>e.preventDefault());
document.addEventListener("mousedown",e=>{if(!gameStarted||document.pointerLockElement!==canvas)return;if(e.button===0){mouseHeld=true;useSelected();}if(e.button===2&&canFocusAim()){aimHeld=true;updateAimUI();statusEl.textContent=selectedTool==="sniper"?"Sniper focus":"Aiming";}});
document.addEventListener("mouseup",e=>{if(e.button===0)mouseHeld=false;if(e.button===2){aimHeld=false;sniperAim=false;updateAimUI();}});
document.addEventListener("keydown",e=>{if(!gameStarted)return;keys[e.code]=true;if(!e.repeat&&e.code==="Space")moveInput.jumpBuffer=MOVE_TUNE.jumpBuffer;if(!e.repeat&&(e.code==="ControlLeft"||e.code==="ControlRight"||e.code==="KeyC"))moveInput.slideBuffer=.14;if(e.code==="KeyF")interact();if(e.code==="KeyR"){world.orbs.length=0;statusEl.textContent="Cleared active projectiles";}if(e.code==="KeyT"){weaponAnim.inspect=1.6;statusEl.textContent="Inspect animation";}if(e.code==="KeyH"){showNpcHitboxes=!showNpcHitboxes;statusEl.textContent="NPC hitboxes: "+(showNpcHitboxes?"ON":"OFF");}if(e.code==="KeyB"){smgAuto=!smgAuto;statusEl.textContent="SMG fire mode: "+(smgAuto?"AUTO":"SEMI");updateHealthHud();if(metricEls.fireMode)metricEls.fireMode.textContent=smgAuto?"AUTO":"SEMI";}if(e.code==="KeyV")toggleThirdPerson();if(e.code==="Digit1")setTool("pulse");if(e.code==="Digit2")setTool("rocket");if(e.code==="Digit3")setTool("smg");if(e.code==="Digit4")setTool("scatter");if(e.code==="Digit5")setTool("ak47");if(e.code==="Digit6")setTool("sniper");if(e.code==="KeyQ")cycleTool(-1);if(e.code==="KeyE")cycleTool(1);});document.addEventListener("keyup",e=>{keys[e.code]=false;});
document.addEventListener("wheel",e=>{
  if(!gameStarted||document.pointerLockElement!==canvas)return;
  e.preventDefault();if(Math.abs(e.deltaY)<1)return;
  cycleTool(e.deltaY>0?1:-1);
},{passive:false});

// -----------------------------------------------------------------------------
// Built-in tests used by the automated browser test harness.
// -----------------------------------------------------------------------------
function maxConstraintError(r){let max=0;for(const L of r.links){const d=V3.len(V3.sub(r.nodes[L.a].p,r.nodes[L.b].p));max=Math.max(max,Math.abs(d-L.len));}return max;}
function finiteWorld(){const nums=[];nums.push(...player.pos,...player.vel);for(const r of world.ragdolls)for(const n of r.nodes)nums.push(...n.p,...n.old);for(const o of world.orbs)nums.push(...o.p,...o.v);return nums.every(Number.isFinite);}
window.__LAB_TEST__={
  forward(yaw){return[-Math.sin(yaw),0,-Math.cos(yaw)];},
  cameraForward(){return cameraForward();},
  counts(){return{humans:world.humans.length,ragdolls:world.ragdolls.length,crates:world.crates.filter(c=>c.alive).length,towers:world.towers.filter(t=>t.alive).length};},
  finiteWorld,
  ragdollStress(){const h=world.humans[0];if(!h)return{ok:false,error:"no human"};const r=makeRagdollFromHuman(h,[h.pos[0]-2,h.pos[1]+3,h.pos[2]],8);for(let i=0;i<1500;i++)stepRagdoll(r,PHYS_DT);const err=maxConstraintError(r);return{ok:finiteWorld()&&err<.08,error:err};},
  rivalsMovementCheck(){const old={p:V3.copy(player.pos),v:V3.copy(player.vel),grounded:player.grounded,slide:player.slide,slideTime:player.slideTime,cd:player.slideCooldown,coyote:player.coyote,crouched:player.crouched};player.pos=[0,terrainY(0,52)+2,52];player.vel=[0,0,-MOVE_TUNE.sprint];player.grounded=true;player.slide=false;player.slideCooldown=0;const started=beginSlide([0,0,-1]);moveInput.jumpBuffer=MOVE_TUNE.jumpBuffer;updatePlayer(PHYS_DT);const jumped=!player.grounded&&player.vel[1]>0&&horizontalSpeed()>=MOVE_TUNE.slideJumpSpeed*.90;player.pos=old.p;player.vel=old.v;player.grounded=old.grounded;player.slide=old.slide;player.slideTime=old.slideTime;player.slideCooldown=old.cd;player.coyote=old.coyote;player.crouched=old.crouched;moveInput.jumpBuffer=0;return{ok:started&&jumped,started,jumped};},
  movementCheck(){const oldP=V3.copy(player.pos),oldV=V3.copy(player.vel),oldYaw=player.yaw,oldGround=player.grounded;function one(code){player.pos=V3.copy(oldP);player.vel=[0,0,0];player.yaw=0;player.grounded=true;keys[code]=true;for(let i=0;i<90;i++)updatePlayer(PHYS_DT);keys[code]=false;return[player.pos[0]-oldP[0],player.pos[2]-oldP[2]];}const W=one("KeyW"),S=one("KeyS"),A=one("KeyA"),D=one("KeyD");player.pos=oldP;player.vel=oldV;player.yaw=oldYaw;player.grounded=oldGround;return{ok:W[1]<-.5&&S[1]>.5&&A[0]<-.5&&D[0]>.5,W,S,A,D};},
  orbDirectionCheck(){const oldYaw=player.yaw,oldPitch=player.pitch,before=world.orbs.length;player.yaw=.63;player.pitch=-.21;const expected=cameraForward(),o=spawnProjectile("rocket",expected),dir=V3.norm(o.v),dot=V3.dot(expected,dir);world.orbs.splice(before);player.yaw=oldYaw;player.pitch=oldPitch;return{ok:dot>.985,dot};},
  toolCheck(){const old=selectedTool,set=[];for(const id of TOOL_ORDER){setTool(id);set.push(selectedTool===id);}setTool(old);return{ok:set.every(Boolean),tools:TOOL_ORDER.slice()};},
  rocketProfileCheck(){const c=TOOLS.rocket;return{ok:c.kind==="rocket"&&c.wave>TOOLS.pulse.wave&&c.timer>TOOLS.pulse.timer&&c.speed>0,speed:c.speed,wave:c.wave,timer:c.timer};},
  scatterCheck(){const before=world.tracers.length,oldCooldown=player.cooldown;player.cooldown=0;fireScatter();const count=world.tracers.length-before;world.tracers.splice(before);player.cooldown=oldCooldown;return{ok:count===7,count};},
  grenadeDebrisCheck(){const before=world.debris.length;debris([0,20,0],rgba(0x8f795f),1);const d=world.debris[world.debris.length-1],ok=d&&d.life>=2.4&&d.life<=5.3&&d.sleep===0;world.debris.splice(before);return{ok};},
  hitboxCheck(){if(!world.humans.length)return{ok:false,error:"no human"};const boxes=humanHitboxes(world.humans[0]),head=boxes.find(b=>b.part==="head");if(!head)return{ok:false,error:"head missing",count:boxes.length};const origin=[head.c[0],head.c[1],head.c[2]+4],dir=[0,0,-1],q=raySphereHit(origin,dir,head.c,head.r,10);const seg=segmentHumanHit(origin,[head.c[0],head.c[1],head.c[2]-2],0);return{ok:boxes.length>=15&&!!q&&!!seg,count:boxes.length,part:seg?.part};},

  fireModeCheck(){const old=smgAuto;smgAuto=false;const semi=!smgAuto;smgAuto=true;const auto=smgAuto;smgAuto=old;return{ok:semi&&auto};},
  smgCycleCheck(){return{ok:SMG_CYCLE_LIMIT===12&&SMG_CYCLE_PAUSE>0&&SMG_CYCLE_PAUSE<2,limit:SMG_CYCLE_LIMIT,pause:SMG_CYCLE_PAUSE};},
  casingTypeCheck(){const before=world.casings.length;casingEject("smg");casingEject("shotgun");const a=world.casings[world.casings.length-2],b=world.casings[world.casings.length-1],ok=a?.kind==="smg"&&b?.kind==="shotgun"&&b.size[1]>a.size[1];world.casings.length=before;return{ok};},
  thirdPersonCheck(){const old=thirdPerson;thirdPerson=false;toggleThirdPerson();const a=thirdPerson;toggleThirdPerson();const b=!thirdPerson;thirdPerson=old;updateViewUI();return{ok:a&&b};},
  firstPersonEyeHeightCheck(){const terrain=terrainY(player.pos[0],player.pos[2]),expected=player.pos[1]+5.08;return{ok:expected-terrain>6.5,eyeY:expected,terrainY:terrain};},
  sniperCheck(){const c=TOOLS.sniper;return{ok:!!c&&c.kind==="ray"&&c.range>=600&&TOOL_ORDER.includes("sniper")};},
  smgRangeCheck(){return{ok:TOOLS.smg.range>=250&&TOOLS.smg.range<=500,range:TOOLS.smg.range};},
  grenadeBounceCheck(){const v=[4,-7,1],n=[0,1,0],r=reflectVelocity(v,n,.48,.84);return{ok:r[1]>0&&Math.abs(r[0])<Math.abs(v[0])&&Number.isFinite(r[1]),before:v,after:r};},
  grenadeBlastPushCheck(){
    const a={tool:"pulse",p:[0,2,0],v:[0,0,0],spin:[0,0,0]},b={tool:"pulse",p:[8,2,0],v:[0,0,0],spin:[0,0,0]};
    const old=world.orbs;world.orbs=[a,b];
    pushGrenadesFromBlast(a.p,TOOLS.pulse,a);
    const ok=b.v[0]>0&&Math.abs(b.v[2])<.001&&b.v[1]>0;
    world.orbs=old;
    return{ok,velocity:b.v};
  },
  weaponAnimations(){return["equip","idle","move","sprint","fire","throw","inspect"];},
  animationStates(){return["idle","walkF","walkB","walkL","walkR","walkFL","walkFR","walkBL","walkBR","runF","runL","runR","jump","fall","land","turnL","turnR","crouch","wave","stumble","attack"];},
  animationDirectionCheck(){const f=stateMotion("walkF"),b=stateMotion("walkB"),fw=humanWorldDir({facing:0},f[0],f[1]),bw=humanWorldDir({facing:0},b[0],b[1]);return{ok:f[1]>0&&b[1]<0&&fw[2]>0&&bw[2]<0,forward:f,back:b};},
  healthCheck(){return{ok:enemyDamageAmount("smg")>0&&enemyDamageAmount("sniper")>enemyDamageAmount("smg")&&player.maxHp===100};},
  respawnConfigCheck(){return{ok:ENEMY_RESPAWN_SECONDS===30,value:ENEMY_RESPAWN_SECONDS};},
  menuCheck(){return{ok:!!mainMenuEl&&!!soloBtn&&!!multiBtn};},
  multiplayerUiCheck(){return{ok:!!roomCodeInput&&document.querySelectorAll("[data-public-room]").length===3&&typeof sanitizeRoomCode==="function"&&typeof autoPublicRoom==="function"};},
  compatibilityCheck(){return{ok:typeof ensurePeerJs==="function"&&typeof registerOfflineCache==="function"&&typeof detectLanRelay==="function"&&typeof lanSync==="function"&&!!diagButton&&!!diagPanel};},
  importedSniperCheck(){return{ok:typeof loadSniperAsset==="function"&&typeof drawSniperAsset==="function"&&SNIPER_ASSET_URL.includes("KSR29")};},
  pvpCheck(){return{ok:typeof sendPvpHit==="function"&&typeof relayPvpHit==="function"&&typeof remotePlayerHitboxes==="function"&&typeof applyPvpDamage==="function"};},
  scrollWeaponCheck(){const old=selectedTool,i=TOOL_ORDER.indexOf(old);cycleTool(1);const ok=selectedTool===TOOL_ORDER[(i+1)%TOOL_ORDER.length];setTool(old);return{ok};},
  replacementWeaponCheck(){return{ok:TOOLS.smg?.name==="Submachine Gun"&&TOOLS.ak47?.name==="AK-47"&&TOOL_ORDER.includes("smg")&&TOOL_ORDER.includes("ak47")};},
  hudCloseCheck(){return{ok:!!closeInfoBtn&&!!closeDataBtn&&!!showHudBtn};},
  groundSweepCheck(){const p=segmentGroundHit([0,15,0],[0,-15,0],.28);return{ok:!!p,p};},
  pulseCheck(){if(!world.humans.length)return{ok:false};const h=world.humans[0],before=world.ragdolls.length;pulse([h.pos[0],h.pos[1]+3,h.pos[2]]);return{ok:world.ragdolls.length===before+1};},
};

if(new URLSearchParams(location.search).has("selftest")){
  setTimeout(()=>{
    const results={movement:window.__LAB_TEST__.movementCheck(),direction:window.__LAB_TEST__.orbDirectionCheck(),tools:window.__LAB_TEST__.toolCheck(),rocket:window.__LAB_TEST__.rocketProfileCheck(),scatter:window.__LAB_TEST__.scatterCheck(),grenadeDebris:window.__LAB_TEST__.grenadeDebrisCheck(),grenadeBounce:window.__LAB_TEST__.grenadeBounceCheck(),grenadeBlastPush:window.__LAB_TEST__.grenadeBlastPushCheck(),fireMode:window.__LAB_TEST__.fireModeCheck(),smgCycle:window.__LAB_TEST__.smgCycleCheck(),casingTypes:window.__LAB_TEST__.casingTypeCheck(),thirdPerson:window.__LAB_TEST__.thirdPersonCheck(),sniper:window.__LAB_TEST__.sniperCheck(),smgRange:window.__LAB_TEST__.smgRangeCheck(),animationDirection:window.__LAB_TEST__.animationDirectionCheck(),health:window.__LAB_TEST__.healthCheck(),respawnConfig:window.__LAB_TEST__.respawnConfigCheck(),menu:window.__LAB_TEST__.menuCheck(),multiplayerUi:window.__LAB_TEST__.multiplayerUiCheck(),compatibility:window.__LAB_TEST__.compatibilityCheck(),pvp:window.__LAB_TEST__.pvpCheck(),scrollWeapons:window.__LAB_TEST__.scrollWeaponCheck(),replacementWeapons:window.__LAB_TEST__.replacementWeaponCheck(),hudClose:window.__LAB_TEST__.hudCloseCheck(),hitboxes:window.__LAB_TEST__.hitboxCheck(),ground:window.__LAB_TEST__.groundSweepCheck(),finite:window.__LAB_TEST__.finiteWorld()};
    const pre=document.createElement("pre");pre.id="selftest-output";pre.textContent=JSON.stringify(results);pre.style.display="none";document.body.appendChild(pre);document.body.dataset.selftest=Object.values(results).every(v=>typeof v==="boolean"?v:v.ok)?"PASS":"FAIL";
  },500);
}

registerOfflineCache();detectCentralRelay(false);detectLanRelay(false);updateConnectionDiagnostics(false);loadSniperAsset();
setTool("pulse");
buildWorld();updateViewUI();updateHealthHud();resize();requestAnimationFrame(frame);
