// Math routines retained from the supplied Open World Physics Lab starter.
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

export {V3,m4Identity,m4Mul,m4Translate,m4Scale,m4RotX,m4RotY,m4RotZ,m4TRS,m4BasisTRS,m4Perspective,m4LookAt,m4SegmentY,clamp,damp,rand};
