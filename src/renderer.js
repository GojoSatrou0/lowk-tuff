// Primitive mesh generation is adapted from the supplied starter WebGL renderer.
import { V3, m4TRS, m4Identity, m4Perspective, m4LookAt, m4SegmentY, m4Mul, m4Translate, m4RotX, m4RotY, m4RotZ, m4Scale } from './math.js';
import { MAPS, WEAPONS, eyeHeight, forward, isMelee } from './shared.js';
import { bladeSwing,weaponMotion } from './weapon-presentation.js';
export function createRenderer(canvas) {
const gl=canvas.getContext('webgl',{antialias:true,alpha:true,powerPreference:'high-performance'});
if(!gl) throw new Error('WebGL is unavailable. Enable hardware acceleration in Chrome or Edge.');
function mesh(vertices,normals,indices){
  const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  const nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normals),gl.STATIC_DRAW);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  return{vb,nb,ib,count:indices.length,positions:vertices,normals,indices};
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
function cylinderMesh(seg=16){const p=[],n=[],idx=[];for(let y=0;y<=1;y++){const yy=y-.5;for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2,c=Math.cos(a),z=Math.sin(a);p.push(c*.5,yy,z*.5);n.push(c,0,z);}}for(let s=0;s<seg;s++){const a=s,b=s+seg+1;idx.push(a,b,a+1,b,b+1,a+1);}const base=p.length/3;p.push(0,-.5,0,0,.5,0);n.push(0,-1,0,0,1,0);for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2,c=Math.cos(a),z=Math.sin(a);p.push(c*.5,-.5,z*.5,c*.5,.5,z*.5);n.push(0,-1,0,0,1,0);}for(let s=0;s<seg;s++){idx.push(base,base+2+s*2,base+4+s*2);idx.push(base+1,base+5+s*2,base+3+s*2);}return mesh(p,n,idx);}
function coneMesh(seg=16){const p=[],n=[],idx=[];for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2,c=Math.cos(a),z=Math.sin(a);const nn=V3.norm([c,.5,z]);p.push(0,.5,0,c*.5,-.5,z*.5);n.push(...nn,...nn);}for(let s=0;s<seg;s++)idx.push(s*2,s*2+1,s*2+3);const b=p.length/3;p.push(0,-.5,0);n.push(0,-1,0);for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2;p.push(Math.cos(a)*.5,-.5,Math.sin(a)*.5);n.push(0,-1,0);}for(let s=0;s<seg;s++)idx.push(b,b+1+s+1,b+1+s);return mesh(p,n,idx);}
function discMesh(seg=24){const p=[0,0,0],n=[0,1,0],idx=[];for(let s=0;s<=seg;s++){const a=s/seg*Math.PI*2;p.push(Math.cos(a)*.5,0,Math.sin(a)*.5);n.push(0,1,0);}for(let s=0;s<seg;s++)idx.push(0,s+1,s+2);return mesh(p,n,idx);}
function bladeMesh(bevel=false){
  const outline=[[-.062,.18],[.061,.18],[.065,.57],[-.025,.76],[-.072,.60]],p=[],n=[],idx=[];
  const triangle=(a,b,c)=>{const normal=V3.norm(V3.cross(V3.sub(b,a),V3.sub(c,a))),start=p.length/3;for(const point of [a,b,c]){p.push(...point);n.push(...normal);}idx.push(start,start+1,start+2);};
  for(const side of [-1,1])for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length],outerA=[...a,0],outerB=[...b,0],innerA=[a[0]*.68,.44+(a[1]-.44)*.91,side*.022],innerB=[b[0]*.68,.44+(b[1]-.44)*.91,side*.022];
    const tri=(a,b,c)=>side===1?triangle(a,b,c):triangle(c,b,a);
    if(bevel){tri(outerA,outerB,innerB);tri(outerA,innerB,innerA);}else tri([0,.44,side*.022],innerA,innerB);
  }return mesh(p,n,idx);
}

const vertex=`attribute vec3 aPos;attribute vec3 aNormal;uniform mat4 model,view,projection;varying vec3 world,normal;void main(){vec4 p=model*vec4(aPos,1.);world=p.xyz;normal=normalize(mat3(model)*aNormal);gl_Position=projection*view*p;}`;
const fragment=`precision highp float;varying vec3 world,normal;uniform vec4 color;uniform vec3 eye,fog;uniform float unlit,night,hasShadow;uniform mat4 lightVP;uniform sampler2D shadowMap;
void main(){vec3 N=normalize(normal);vec3 L=normalize(vec3(-.6,1.,.45));float diffuse=max(dot(N,L),0.);float visibility=1.;
if(hasShadow>.5){vec4 lp=lightVP*vec4(world,1.);vec3 q=lp.xyz/lp.w*.5+.5;if(q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.&&q.z<1.){float sum=0.;float bias=max(.003,.007*(1.-dot(N,L)));for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){float depth=texture2D(shadowMap,q.xy+vec2(float(x),float(y))/1024.).r;sum+=q.z-bias<=depth?1.:0.;}}visibility=.2+.8*sum/9.;}}
float hemi=.40+N.y*.15;vec3 V=normalize(eye-world);float rim=pow(1.-max(dot(N,V),0.),3.)*.12;float spec=pow(max(dot(N,normalize(L+V)),0.),40.)*.13;vec3 lit=color.rgb*(hemi+diffuse*.65*visibility+rim);lit+=vec3(1.,.9,.76)*spec*visibility;lit+=vec3(.13,.2,.25)*max(-N.x,0.)*.18;vec3 c=mix(lit,color.rgb,unlit);float haze=1.-exp(-pow(distance(eye,world)*.0065,2.));c=mix(c,fog,clamp(haze,0.,.9));gl_FragColor=vec4(c,color.a);}`;
function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.bindAttribLocation(program,0,'aPos');gl.bindAttribLocation(program,1,'aNormal');gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const U={};for(const key of ['model','view','projection','color','eye','fog','unlit','night','hasShadow','lightVP','shadowMap'])U[key]=gl.getUniformLocation(program,key);
// Bake directional shadows once per map. Fall back cleanly without depth textures.
let shadowReady=false,shadowFramebuffer=null,shadowDepth=null;
const ortho=new Float32Array([1/46,0,0,0,0,1/46,0,0,0,0,-2/179,0,0,0,-181/179,1]);
const lightVP=m4Mul(ortho,m4LookAt([-48,80,36],[0,0,0],[0,1,0]));
const shadowProgram=gl.createProgram();gl.attachShader(shadowProgram,compile(gl.VERTEX_SHADER,'attribute vec3 aPos;uniform mat4 vp;void main(){gl_Position=vp*vec4(aPos,1.);}'));gl.attachShader(shadowProgram,compile(gl.FRAGMENT_SHADER,'precision mediump float;void main(){gl_FragColor=vec4(1.);}'));gl.bindAttribLocation(shadowProgram,0,'aPos');gl.linkProgram(shadowProgram);
if(gl.getExtension('WEBGL_depth_texture')){
  shadowFramebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);
  shadowDepth=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shadowDepth);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT,1024,1024,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowDepth,0);
  const colorBuffer=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,colorBuffer);gl.renderbufferStorage(gl.RENDERBUFFER,gl.RGBA4,1024,1024);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,colorBuffer);shadowReady=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
function bakeShadow(){if(!shadowReady)return;gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);gl.viewport(0,0,1024,1024);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(shadowProgram);gl.uniformMatrix4fv(gl.getUniformLocation(shadowProgram,'vp'),false,lightVP);gl.disableVertexAttribArray(1);for(const b of batches){const s=b.shape;if(color(b.c)[3]<1)continue;gl.bindBuffer(gl.ARRAY_BUFFER,s.vb);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,s.ib);gl.drawElements(gl.TRIANGLES,s.count,gl.UNSIGNED_SHORT,0);}gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.useProgram(program);}
if(!shadowDepth){shadowDepth=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shadowDepth);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);}
const shapes={cube:cubeMesh(),sphere:sphereMesh(12,8),cyl:cylinderMesh(12),cone:coneMesh(8),disc:discMesh(24),blade:bladeMesh(),bladeEdge:bladeMesh(true)};
const color=hex=>{if(Array.isArray(hex))return hex;const n=parseInt(hex.replace('#',''),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,1];};
const tint=(c,f)=>color(c).map((v,i)=>i===3?v:Math.min(1,v*f));
let objects=[],batches=[],current=null,drawCalls=0;const remoteFire=new Map();
function draw(shape,matrix,c,unlit=0){const s=shapes[shape]||shape;gl.uniformMatrix4fv(U.model,false,matrix);gl.uniform4fv(U.color,color(c));gl.uniform1f(U.unlit,unlit);gl.bindBuffer(gl.ARRAY_BUFFER,s.vb);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,s.nb);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,s.ib);gl.drawElements(gl.TRIANGLES,s.count,gl.UNSIGNED_SHORT,0);drawCalls++;}
function add(shape,p,s,c,r=[0,0,0],unlit=0){objects.push({shape,m:m4TRS(p,r,s),c,unlit});}
function block(p,s,c,r=[0,0,0],unlit=0){add('cube',p,s,c,r,unlit);}
function wedge(){const p=[],n=[],idx=[];const A=[-.5,0,-.5],B=[.5,0,-.5],C=[-.5,0,.5],D=[.5,0,.5],E=[-.5,1,.5],F=[.5,1,.5];for(const tri of [[A,E,F],[A,F,B],[A,C,E],[B,F,D],[C,D,F],[C,F,E],[A,B,D],[A,D,C]]){const norm=V3.norm(V3.cross(V3.sub(tri[1],tri[0]),V3.sub(tri[2],tri[0]))),i=p.length/3;for(const v of tri){p.push(...v);n.push(...norm);}idx.push(i,i+1,i+2);}return mesh(p,n,idx);}
shapes.ramp=wedge();
function build(map){
  for(const b of batches){gl.deleteBuffer(b.shape.vb);gl.deleteBuffer(b.shape.nb);gl.deleteBuffer(b.shape.ib);}batches=[];
  current=map;objects=[];const accent=map.accent,night=map.id==='skyline',sand=map.id==='canyon';
  const ground=map.floor,wall=map.wall,dark=night?'#142331':'#303e46';
  canvas.style.background=night?'radial-gradient(ellipse at 30% 20%,#4d4265 0%,#203549 45%,#142532 100%)':sand?'linear-gradient(#9ac7ce,#f7dcac 75%)':'linear-gradient(#86b3c4,#d4dad0 75%)';
  block([0,-.7,0],[58,1.4,58],ground);
  // Floor seams, runway markings and inset color lanes make distance readable.
  for(let i=-24;i<=24;i+=6){block([i,.006,0],[.025,.012,56],tint(ground,.75));block([0,.008,i],[56,.012,.025],tint(ground,.75));}
  for(const x of [-12,12]){block([x,.015,0],[.16,.02,52],accent,[0,0,0],.65);for(let z=-22;z<=22;z+=4)block([x+1,.02,z],[.65,.025,1.5],tint(wall,.9));}
  for(const sign of [-1,1]){
    block([0,2,sign*28],[57,4,1.2],wall);block([sign*28,2,0],[1.2,4,57],wall);
    block([0,4.05,sign*28],[57,.2,1.4],dark);block([sign*28,4.05,0],[1.4,.2,57],dark);
    block([0,.25,sign*27.3],[56,.22,.12],accent,[0,0,0],1);block([sign*27.3,.25,0],[.12,.22,56],accent,[0,0,0],1);
    for(let k=-24;k<=24;k+=8){block([k,2.1,sign*27.25],[.24,3.7,.22],tint(wall,.65));block([sign*27.25,2.1,k],[.22,3.7,.24],tint(wall,.65));}
    // Spawn portals and tall corner fins.
    block([0,3,sign*26.6],[10,5.5,.4],dark);block([0,5.85,sign*26.5],[10.2,.23,.55],accent,[0,0,0],1);
    for(const side of [-1,1]){block([side*4.8,3,sign*26.35],[.15,5.2,.2],accent,[0,0,0],1);block([side*25,5.5,sign*25],[1.2,11,1.2],dark);block([side*25,10,sign*25],[1.28,.7,1.28],accent,[0,0,0],1);}
    add('disc',[0,.026,sign*23],[5,1,5],[...color(accent).slice(0,3),.4]);
  }
  for(const b of map.boxes){
    if(b.kind==='gantry'){block([b.x,b.y+b.h/2,b.z],[b.w,b.h,b.d],dark);continue;}
    const stone=b.kind==='stone';const base=b.kind==='cover'?(sand?'#476b6c':'#adbbb8'):wall;
    block([b.x,b.y+b.h/2,b.z],[b.w,b.h,b.d],base);
    block([b.x,b.y+.06,b.z],[b.w+.35,.12,b.d+.35],dark);
    block([b.x,b.y+b.h+.055,b.z],[b.w+.1,.11,b.d+.1],tint(base,1.13));
    if(b.kind==='platform'||b.kind==='bridge'){
      block([b.x,b.y+b.h+.115,b.z],[b.w-.3,.02,b.d-.3],dark);
      for(const x of [-1,1])block([b.x+x*(b.w/2-.12),b.y+b.h+.15,b.z],[.12,.035,b.d-.3],accent,[0,0,0],.9);
      for(let z=-b.d/2+1;z<b.d/2;z+=2)block([b.x,b.y+b.h+.14,b.z+z],[b.w-.5,.025,.035],tint(wall,.8));
    }else if(!stone){
      for(const s of [-1,1]){
        block([b.x,b.y+b.h*.65,b.z+s*(b.d/2+.012)],[b.w*.84,.15,.04],accent,[0,0,0],.6);
        for(let x=-b.w/2+.35;x<b.w/2;x+=.65)block([b.x+x,b.y+b.h*.35,b.z+s*(b.d/2+.02)],[.055,b.h*.45,.06],tint(base,.68));
      }
    }
    if(b.kind==='reactor'){
      add('cyl',[b.x,b.y+b.h+.6,b.z],[2,1.2,2],dark);
      add('cyl',[b.x,b.y+b.h+1.3,b.z],[1.4,.2,1.4],accent,[0,0,0],1);
      add('sphere',[b.x,b.y+b.h+1.9,b.z],[.65,.65,.65],accent,[0,0,0],1);
    }
  }
  for(const r of map.ramps){
    add('ramp',[r.x,r.y,r.z],[r.w,r.h,r.d],sand?'#c9a37b':'#708184',[0,r.dir===1?0:Math.PI,0]);
    const angle=Math.atan2(r.h,r.d)*r.dir,len=Math.hypot(r.h,r.d);
    for(const s of [-1,1])block([r.x+s*(r.w/2-.2),r.y+r.h/2+.025,r.z],[.18,.04,len],accent,[-angle,0,0],.8);
    for(let j=1;j<6;j++){const z=r.z+(j/6-.5)*r.d,y=r.y+r.h*(r.dir===1?j/6:1-j/6);block([r.x,y+.03,z],[r.w-.6,.045,.07],tint(wall,.65),[-angle,0,0]);}
  }
  // Distant scenery is decorative, outside the playable bounds.
  for(let i=0;i<26;i++){
    const a=i*2.39996,dist=46+(i%4)*11,x=Math.sin(a)*dist,z=Math.cos(a)*dist;
    if(sand){add('cone',[x,4,z],[12+(i%4)*7,18+(i%5)*5,14],tint(wall,.8+(i%3)*.1),[0,a,0]);add('cone',[x+3,1,z-2],[18,15,18],tint(wall,.9));}
    else {const h=10+(i*7%25);block([x,h/2-3,z],[7+(i%3)*3,h,8],night?'#263b50':'#8faaa9');block([x,h-2.8,z],[8,.4,9],night?'#42617a':'#667d81');if(night)for(let y=1;y<h-2;y+=3)block([x,y,z+4.02],[4,.24,.03],i%3===0?'#d99aae':'#70bec7',[0,0,0],1);}
  }
  // Overhead industrial gantry / rooftop antenna.
  if(!sand){for(let x=-22;x<24;x+=7)block([x,11.66,-10],[2,.1,.3],night?'#96e6e1':'#fff1c4',[0,0,0],1);}
  else for(const x of [-23,23])for(const z of [-14,14]){add('cyl',[x,1.3,z],[.42,2.6,.42],'#4a7870');add('cyl',[x+.4,1.5,z],[.8,.3,.3],'#4a7870',[0,0,Math.PI/2]);}
  // Bake static geometry per material: tens of GPU calls instead of hundreds.
  const groups=new Map();
  for(const o of objects){const key=JSON.stringify([o.c,o.unlit]);let group=groups.get(key);if(!group){group={p:[],n:[],i:[],c:o.c,unlit:o.unlit};groups.set(key,group);}const s=shapes[o.shape],m=o.m,offset=group.p.length/3;
    const c0=[m[0],m[1],m[2]],c1=[m[4],m[5],m[6]],c2=[m[8],m[9],m[10]],a=V3.cross(c1,c2),b=V3.cross(c2,c0),c=V3.cross(c0,c1);
    for(let i=0;i<s.positions.length;i+=3){const x=s.positions[i],y=s.positions[i+1],z=s.positions[i+2];group.p.push(m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]);const nx=s.normals[i],ny=s.normals[i+1],nz=s.normals[i+2];group.n.push(...V3.norm([a[0]*nx+b[0]*ny+c[0]*nz,a[1]*nx+b[1]*ny+c[1]*nz,a[2]*nx+b[2]*ny+c[2]*nz]));}
    for(const i of s.indices)group.i.push(i+offset);
  }
  for(const group of groups.values())batches.push({shape:mesh(group.p,group.n,group.i),m:m4Identity(),c:group.c,unlit:group.unlit});
  bakeShadow();
}
function shadow(p,radius=1.3){draw('disc',m4TRS([p[0],p[1]+.015,p[2]],[0,0,0],[radius,1,radius]),[.015,.025,.035,.25],1);}
function momentumBlade(base){
  const part=(shape,pos,size,color,rotation=[0,0,0],unlit=0)=>draw(shape,m4Mul(base,m4TRS(pos,rotation,size)),color,unlit);
  part('blade',[0,0,0],[1,1,1],'#91aebc');part('bladeEdge',[0,0,0],[1,1,1],'#e7faff',[],.12);
  // Full tang, beveled guard, ribbed grip, visible fasteners and a metal pommel.
  part('cube',[0,.035,0],[.076,.25,.062],'#344d58');part('cube',[0,.028,.037],[.086,.21,.025],'#152a33');part('cube',[0,.028,-.037],[.086,.21,.025],'#152a33');
  for(let k=0;k<7;k++)part('cube',[0,-.06+k*.029,.053],[.09,.009,.009],'#46616a',[0,0,-.13]);
  for(const y of [-.045,.105])part('cyl',[0,y,.059],[.02,.012,.02],'#b7cbd0',[Math.PI/2,0,0]);
  part('cube',[0,.165,0],[.19,.036,.115],'#516d79',[0,0,-.06]);part('cube',[.073,.178,0],[.038,.07,.1],'#ff9163',[0,0,-.22]);
  part('cube',[0,-.105,0],[.104,.035,.08],'#a2bac3',[0,0,.08]);part('cube',[-.017,.4,.0245],[.009,.28,.003],'#3d6474');part('cube',[.02,.235,.025],[.024,.008,.003],'#ff9163',[],.6);
}
function avatar(p,time,reduced=false){
  if(p.hp<=0)return;let shot=remoteFire.get(p.id);if(!shot){shot={shots:p.shots,at:-10};remoteFire.set(p.id,shot);}if(shot.shots!==p.shots){shot.at=p.shots>shot.shots?time:-10;shot.shots=p.shots;}const kick=isMelee(p.weapon)?Math.sin(Math.min(1,(time-shot.at)/.38)*Math.PI)*(reduced?.4:1):weaponMotion(p.weapon,time-shot.at,{shots:p.shots,reduced}).kick,flash=time-shot.at<.065;
  const crouch=p.crouch||p.slide>0,height=crouch?1.12:1.8,speed=Math.hypot(p.v?.[0]||0,p.v?.[2]||0),stride=Math.sin(time*12)*Math.min(speed*.028,.21),base=m4TRS(p.p,[0,p.yaw,0],[1,1,1]);
  const accent=p.slot===0?'#8de1d5':'#ff8662',armor=p.slot===0?'#e3ece6':'#3c4856';
  const part=(shape,pos,scale,c,rot=[0,0,0],unlit=0)=>draw(shape,m4Mul(base,m4TRS(pos,rot,scale)),c,unlit);
  shadow(p.p,1.6);
  part('cube',[0,height*.57,0],[.68,height*.36,.4],armor);
  part('cube',[0,height*.6,-.225],[.52,.18,.05],accent,[0,0,0],.5);
  part('sphere',[0,height-.2,0],[.52,.52,.5],armor);
  part('cube',[0,height-.17,-.233],[.39,.12,.06],accent,[0,0,0],1);
  part('cube',[0,height*.38,0],[.53,.18,.32],'#253541');
  for(const s of [-1,1]){
    part('cube',[s*.19,height*.18,s*stride],[.23,height*.37,.25],'#354854',[s*stride,0,0]);
    part('cube',[s*.19,.09,s*stride-.07],[.29,.18,.43],'#202b35');
    if(p.weapon!==4||s!==1){part('cube',[s*.44,height*.61,-.12],[.22,.49,.25],armor,[-.65,0,s*.15]);part('cube',[s*.46,height*.58,-.29],[.24,.14,.19],accent);}
  }
  const held=WEAPONS[p.weapon];
  if(isMelee(p.weapon)){
    if(p.weapon===4){
      const swing=bladeSwing(time-shot.at,p.shots),hand=[.36+swing.position[0],height*.57+swing.position[1],-.48+swing.position[2]],heldBase=m4Mul(base,m4TRS(hand,swing.rotation,[.8,.8,.8]));
      draw('cube',m4Mul(base,m4SegmentY([.4,height*.71,-.08],hand,.16)),armor);draw('cube',m4Mul(heldBase,m4TRS([.025,0,.035],[],[.12,.16,.12])),'#25373c');momentumBlade(heldBase);
    }else{
    const guard=p.parry>0;part('cube',[.3-kick*.25,height*.57,-.48],[.06,.25,.06],'#202b35');part('cube',[guard?0:.3-kick*.35,height*.72,-.5],guard?[1,.05,.08]:[.04,held.model==='scythe'?1.1:.7,.09],held.color,[0,0,guard?0:-.25]);
    if(held.model==='scythe')part('cube',[.06,height+.2,-.5],[.6,.1,.05],held.color,[0,0,.2]);
    if(guard){gl.depthMask(false);part('sphere',[0,height*.55,0],[1.1,height+.2,1.1],[.6,1,.95,.12],[],1);gl.depthMask(true);}
    }
  }else{
    const heavy=['minigun','rocket','flame'].includes(held.model);part(heavy?'cyl':'cube',[.25,height*.58+kick*.04,-.5+kick*.09],heavy?[.32,.8,.32]:[.18,.19,.65],'#202b35',heavy?[Math.PI/2,0,0]:[]);part('cube',[.25,height*.61+kick*.04,-.86+kick*.09],[.09,.08,.2],held.color);if(flash&&!held.projectile)part('sphere',[.25,height*.61,-1.03],[.17,.17,.3],held.flame?'#ffab54':'#fff0b0',[],1);
  }
}
function firstPerson(p,camera,fx,time){
  const weapon=WEAPONS[p.weapon],age=fx.shotWeapon===p.weapon?fx.shotAge:10,ads=fx.ads||0;
  const motion=weaponMotion(p.weapon,age,{ads,reload:p.reload,equipAge:fx.equipAge,shots:p.shots,reduced:fx.reduced}),cycle=motion.cycle;
  const recoil=motion.kick,speed=Math.hypot(p.v?.[0]||0,p.v?.[2]||0),bob=fx.reduced?0:Math.sin(time*12)*.012*Math.min(speed/8,1)*(1-ads),sprint=fx.reduced||isMelee(p.weapon)?0:(fx.sprint||0)*(1-ads)*(age<.2?0:1);
  const f=forward(camera.yaw,camera.pitch),right=[Math.cos(camera.yaw),0,Math.sin(camera.yaw)],up=V3.cross(right,f),basis=m4Identity();
  for(let i=0;i<3;i++){basis[i]=right[i];basis[4+i]=up[i];basis[8+i]=-f[i];basis[12+i]=camera.pos[i];}
  const reload=motion.reload,equip=motion.equip;
  let base=m4Mul(basis,m4Translate(.3*(1-ads)+motion.side+sprint*.04,-.29+ads*.12+bob-reload*.14-equip*.27-sprint*.055,-.48+recoil*.095+equip*.08));
  base=m4Mul(base,m4RotZ((fx.sway||0)*.2-reload*.6+motion.side*2+sprint*.13));base=m4Mul(base,m4RotX(recoil*.13-equip*.3));
  if(weapon.model==='katana'||weapon.model==='scythe'){
    const swing=bladeSwing(age,p.shots,fx.reduced),scale=weapon.model==='scythe'?1.15:.8,guard=weapon.parry?(fx.guard||0):0;
    base=m4Mul(base,m4Translate(swing.position[0]*scale*(1-guard)-guard*.05,swing.position[1]*.5+guard*.15,swing.position[2]*scale-guard*.12));
    base=m4Mul(base,m4RotZ((swing.rotation[2]+.3)*(1-guard)*scale-.3+guard*1.6));
  }
  if(p.weapon===4){const swing=bladeSwing(age,p.shots,fx.reduced);base=m4Mul(base,m4Translate(.06+swing.position[0],-.09+swing.position[1],-.18+swing.position[2]));base=m4Mul(base,m4TRS([0,0,0],swing.rotation,[1,1,1]));}
  const part=(s,pos,scale,c,r=[0,0,0],unlit=0)=>draw(s,m4Mul(base,m4TRS(pos,r,scale)),c,unlit);
  const metal='#23333c',light='#96a5a6',w=WEAPONS[p.weapon],accent=w.color;
  // Sleeves, wrist plates and hands.
  const boltHand=motion.boltLift;
  part('cube',[.06+boltHand*.11,-.23+boltHand*.07,.15+motion.bolt*.08],[.15,.2,.4],'#3a5059',[-.22,0,-boltHand*.3]);part('cube',[.04+boltHand*.15,-.09+boltHand*.1,.015+motion.bolt*.09],[.12,.19,.13],'#25373c');
  if(w.model==='katana'){
    part('cube',[0,.02,-.05],[.065,.24,.065],metal);part('cube',[0,.19,-.05],[.2,.03,.14],accent,[],.6);part('cube',[0,.56,-.07],[.03,.72,.075],light,[.08,0,0]);part('cube',[-.022,.56,-.07],[.018,.71,.078],accent,[.08,0,0],p.parry>0?1:.7);return;
  }
  if(w.model==='scythe'){
    part('cyl',[0,.25,-.16],[.055,1.1,.055],metal);part('cyl',[0,.06,-.16],[.075,.16,.075],accent);part('cube',[-.23,.73,-.17],[.57,.1,.06],light,[0,0,.18]);part('cube',[-.51,.59,-.17],[.06,.32,.065],accent,[0,0,-.45],.6);part('cube',[.1,.72,-.17],[.21,.13,.11],metal);return;
  }
  if(w.model==='minigun'){
    part('cyl',[0,-.03,-.15],[.32,.4,.32],metal,[Math.PI/2,0,0]);part('cube',[.16,-.14,-.08],[.2,.24,.3],accent);part('cube',[0,.2,-.05],[.28,.05,.15],light);
    for(let n=0;n<6;n++){const a=n*Math.PI/3+time*(3+(p.spin||0)*30),x=Math.cos(a)*.095,y=Math.sin(a)*.095;part('cyl',[x,y,-.55],[.055,.55,.055],light,[Math.PI/2,0,0]);}
    part('cyl',[0,0,-.77],[.28,.06,.28],metal,[Math.PI/2,0,0]);if(fx.muzzle>0)part('sphere',[0,0,-.88],[.17,.17,.3],'#fff0ba',[],1);return;
  }
  if(w.model==='flame'){
    part('cube',[0,0,-.2],[.2,.23,.38],metal);part('cyl',[.17,-.04,-.02],[.19,.38,.19],accent);part('cyl',[0,.02,-.5],[.1,.4,.1],light,[Math.PI/2,0,0]);part('cone',[0,.02,-.74],[.18,.15,.18],metal,[Math.PI/2,0,0]);part('cube',[0,-.16,-.12],[.09,.2,.13],metal);part('sphere',[0,-.06,-.78],[.045,.065,.1],'#71cffb',[],1);if(fx.muzzle>0)part('sphere',[0,.02,-.86],[.17,.15,.35],'#ffe1a1',[],1);return;
  }
  if(w.model==='shorty'){
    part('cube',[0,-.01,-.16],[.21,.17,.3],metal);for(const x of [-.055,.055]){part('cyl',[x,.015,-.4],[.095,.36,.095],light,[Math.PI/2,0,0]);part('cyl',[x,.015,-.585],[.067,.01,.067],metal,[Math.PI/2,0,0]);}part('cube',[0,-.14,-.04],[.12,.23,.15],accent,[.35,0,0]);part('cube',[0,-.07,-.34],[.21,.065,.16],accent);if(fx.muzzle>0)part('sphere',[0,.02,-.66],[.25,.18,.26],'#fff0ba',[],1);return;
  }
  if(w.model==='bow'){
    const draw=p.charge||0;const stringSnap=age<.22?Math.sin(age*95)*.035*Math.exp(-age*12):0;part('cube',[0,0,-.2],[.08,.21,.1],metal);
    for(const s of [-1,1]){part('cube',[-.1,s*.24,-.24],[.065,.36,.055],accent,[0,0,-s*.55]);part('cube',[-.24,s*.4,-.24],[.055,.12,.05],metal);drawLocalLine([-.24,s*.44,-.24],[0,0,.05+draw*.18+stringSnap],.004,'#d7e9e0');}
    if(p.reload<=0){part('cube',[0,0,-.28+draw*.15],[.015,.015,.7],light);part('cone',[0,0,-.65+draw*.15],[.05,.1,.05],accent,[-Math.PI/2,0,0]);}return;
  }
  if(w.model==='rocket'){
    part('cyl',[0,.02,-.26],[.27,.95,.27],metal,[Math.PI/2,0,0]);part('cyl',[0,.02,-.73],[.32,.06,.32],accent,[Math.PI/2,0,0]);part('cyl',[0,.02,.2],[.36,.06,.36],light,[Math.PI/2,0,0]);part('cube',[0,.19,-.28],[.055,.1,.08],accent);part('cube',[0,-.17,-.17],[.1,.21,.11],metal);if(p.ammo[p.weapon]>0)part('cone',[0,.02,-.78],[.2,.25,.2],accent,[-Math.PI/2,0,0]);return;
  }
  if(w.model==='revolver'||w.model==='dual'){
    for(const side of (w.model==='dual'?[-1,1]:[1])){const x=w.model==='dual'?side*.29:-.02,kick=w.model==='dual'?(p.shots%2===(side===1?1:0)?(fx.recoil||0)*.08:0):0,slide=cycle*(w.model==='dual'?(p.shots%2===(side===1?1:0)?1:0):1)*.075;
      part('cube',[x,.01,-.22+kick],[.12,.15,.37],metal);part('cube',[x,.09,-.22+kick+slide],[.13,.025,.36],light);part('cube',[x,-.13,-.08+kick],[.09,.2,.12],metal,[.2,0,0]);part('cube',[x,.055,-.4+kick],[.1,.05,.08],accent);
      if(w.model==='revolver')part('cyl',[x,0,-.18],[.17,.14,.17],light,[Math.PI/2,0,p.shots*Math.PI/3+cycle*.2]);else part('cube',[x,-.24,.08],[.14,.18,.27],'#344e55');if(fx.muzzle>0&&(w.model!=='dual'||p.shots%2===(side===1?1:0)))part('sphere',[x,.02,-.48+kick],[.08,.08,.17],'#fff0a9',[],1);
    }return;
  }
  if(p.weapon===4){
    momentumBlade(base);for(let k=0;k<4;k++)part('cube',[.048,-.045+k*.032,.062],[.073,.027,.073],'#314952',[0,0,-.1]);part('cube',[-.046,.04,.055],[.052,.105,.065],'#496470',[0,0,-.35]);return;
  }
  const long=p.weapon===2,shot=p.weapon===3,smg=p.weapon===1,pump=motion.pump*.16;
  if(w.model==='burst'){part('cube',[0,.03,-.49],[.19,.22,.19],accent);part('cube',[0,.17,-.2],[.14,.04,.22],metal);}
  part('cube',[0,0,-.22],[.16,.19,long?.65:smg?.36:.48],metal);
  part('cube',[0,.025,-.2],[.168,.06,long?.55:.36],light);
  part('cube',[0,-.13-motion.magazine*.26,-.2+motion.magazine*.08],[.085,.22,.15],metal,[.16+motion.magazine*.2,0,0]);
  part('cube',[0,-.04,.12],[.12,.15,.27],metal);
  part('cube',[0,0,long?-.63:-.5],[shot?.14:.065,shot?.11:.065,long?.55:.34],metal);
  part('cube',[0,0,long?-.89:-.69],[shot?.17:.09,shot?.14:.09,.085],light);
  part('cube',[.084,.01,-.21+(long?motion.bolt*.16:cycle*.1)],[.012,.065,.2],accent,[],.5);
  if(long){part('cube',[.088,.035,-.1+motion.bolt*.16],[.02,.04,.19],'#101b23');part('cyl',[.135,.028+motion.boltLift*.07,-.06+motion.bolt*.16],[.025,.12,.025],light,[0,0,Math.PI/2-motion.boltLift*.9]);part('sphere',[.19-motion.boltLift*.025,.028+motion.boltLift*.11,-.06+motion.bolt*.16],[.055,.055,.055],metal);}
  else part('cube',[.09,.025,-.08+cycle*.1],[.045,.05,.055],light);
  if(shot)part('cube',[0,-.04,-.5+pump],[.17,.13,.22],accent);
  for(let i=0;i<5;i++)part('cube',[0,.1,-.38+i*.075],[.18,.027,.022],metal);
  part('cube',[-.11+motion.magazine*.055,-.07-motion.magazine*.22,-.4+(shot?pump:0)+motion.magazine*.27],[.13,.12,.22],'#344e55',[0,-.2,0]);
  if(long){part('cyl',[0,.18,-.2],[.13,.32,.13],metal,[Math.PI/2,0,0]);part('sphere',[0,.18,-.03],[.105,.105,.025],accent,[],1);}
  else {part('cube',[0,.15,-.18],[.13,.025,.05],metal);part('cube',[-.065,.12,-.18],[.018,.08,.05],metal);part('cube',[.065,.12,-.18],[.018,.08,.05],metal);part('sphere',[0,.155,-.195],[.017,.017,.017],accent,[],1);}
  if(fx.muzzle>0){const z=long?-.99:-.78,size=Math.max(.2,fx.muzzle/.065);part('sphere',[0,.005,z],[.08*size,.08*size,.19*size],'#fff9d2',[],1);if(!fx.reduced){part('cube',[0,.005,z],[.26*size,.025,.025],'#ffc773',[0,0,p.shots*1.7],1);part('cube',[0,.005,z],[.025,.22*size,.025],'#ffe6a5',[0,0,p.shots*1.7],1);}}
  function drawLocalLine(a,b,r,c){draw('cyl',m4Mul(base,m4SegmentY(a,b,r)),c,1);}
}
function render({map,camera,players=[],local=null,fx={},time=0,tracers=[],flames=[],casings=[],projectiles=[],explosions=[],menu=false,fov=82,quality=1}){
  if(current?.id!==map.id)build(map);
  const scale=Math.min(window.devicePixelRatio||1,quality===2?1.75:quality===0?.8:1.25),w=Math.round(canvas.clientWidth*scale),h=Math.round(canvas.clientHeight*scale);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(program);drawCalls=0;
  const dir=forward(camera.yaw,camera.pitch);gl.uniformMatrix4fv(U.view,false,m4LookAt(camera.pos,V3.add(camera.pos,dir),[0,1,0]));gl.uniformMatrix4fv(U.projection,false,m4Perspective(fov*Math.PI/180,w/h,.035,260));gl.uniform3fv(U.eye,camera.pos);gl.uniform3fv(U.fog,color(map.sky).slice(0,3));gl.uniform1f(U.night,map.id==='skyline'?1:0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,shadowDepth);gl.uniform1i(U.shadowMap,0);gl.uniform1f(U.hasShadow,shadowReady&&quality>0?1:0);gl.uniformMatrix4fv(U.lightVP,false,lightVP);
  for(const o of batches)draw(o.shape,o.m,o.c,o.unlit);
  for(const id of remoteFire.keys())if(!players.some(p=>p.id===id))remoteFire.delete(id);for(const p of players)if(!local||p.id!==local.id)avatar(p,time,fx.reduced);
  for(const t of tracers){draw('cyl',m4SegmentY(t.a,t.b,.015),t.color||'#ffe1a1',1);draw('sphere',m4TRS(t.b,[0,0,0],[.055,.055,.055]),'#fff5df',1);}
  for(const p of players)if(p.grapple){const a=[p.p[0]-Math.cos(p.yaw)*.28,p.p[1]+eyeHeight(p)-.3,p.p[2]-Math.sin(p.yaw)*.28],b=p.grapple.anchor;draw('cyl',m4SegmentY(a,b,.025),'#9ad4ff',1);draw('sphere',m4TRS(b,[],[.12,.12,.12]),'#d6f4ff',1);}
  for(const p of players)if(p.stun>0&&p.id!==local?.id)for(let n=0;n<3;n++){const a=n*Math.PI*2/3+(fx.reduced?0:time*4);draw('sphere',m4TRS([p.p[0]+Math.cos(a)*.34,p.p[1]+2.1,p.p[2]+Math.sin(a)*.34],[],[.065,.065,.065]),'#ffcf88',1);}
  for(const c of casings)draw('cyl',m4TRS(c.p,[c.spin,.3,c.spin*.7],[c.shell?.065:.025,c.shell?.14:.09,c.shell?.065:.025]),c.shell?'#ca7352':'#e5bd68');
  for(const q of projectiles){const d=V3.norm(q.v),tail=q.p.map((v,i)=>v-d[i]*(q.kind==='rocket'?.6:.9));draw('cyl',m4SegmentY(tail,q.p,q.kind==='rocket'?.12:.018),WEAPONS[q.weapon].color,1);if(q.kind==='rocket')draw('sphere',m4TRS(tail,[],[.18,.18,.18]),'#fff6b0',1);}
  gl.depthMask(false);
  for(const flame of flames)for(let n=1;n<=7;n++){const t=n/7,pos=flame.a.map((v,i)=>v+(flame.b[i]-v)*t),radius=.12+t*.9;draw('sphere',m4TRS(pos,[],[radius,radius,radius]),[1,.35+t*.35,.08,flame.life/.22*.2],1);}
  for(const e of explosions){const size=e.radius*(1-e.life/.35)*1.5;draw('sphere',m4TRS(e.p,[],[size,size,size]),[1,.61,.23,e.life/.35*.45],1);}gl.depthMask(true);
  if(local&&local.hp>0&&!menu&&!(local.weapon===2&&fx.ads>.8)){gl.clear(gl.DEPTH_BUFFER_BIT);gl.uniform1f(U.hasShadow,0);firstPerson(local,camera,fx,time);}
  return drawCalls;
}
return {render,build,gl,get objectCount(){return objects.length;}};
}
