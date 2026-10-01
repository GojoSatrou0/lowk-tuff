const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const gray=(data,i)=>(data[i]+data[i+1]+data[i+2])/3;
const neutral=(data,i)=>Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])<12;

// Recognize a regular gray checkerboard at both image borders, not just two colors.
// Border profiles retain antialiased tile edges after image downscaling.
export function detectCheckerboard(data,width,height){
  if(width<24||height<24)return null;
  const histogram=new Uint32Array(256),border=[];
  for(let x=0;x<width;x++)border.push(x*4,((height-1)*width+x)*4);
  for(let y=0;y<height;y++)border.push(y*width*4,(y*width+width-1)*4);
  let usable=0;for(const i of border)if(data[i+3]===255&&neutral(data,i)){histogram[Math.round(gray(data,i))]++;usable++;}
  if(usable<border.length*.9)return null;
  const peaks=Array.from(histogram,(_,i)=>i).sort((a,b)=>histogram[b]-histogram[a]);
  const first=peaks[0],second=peaks.find(v=>Math.abs(v-first)>=10);if(second===undefined)return null;
  const low=Math.min(first,second),high=Math.max(first,second),mid=(low+high)/2,half=(high-low)/2;
  const tolerance=Math.max(4,Math.min(10,half*.4));
  const near=border.filter(i=>neutral(data,i)&&Math.min(Math.abs(gray(data,i)-low),Math.abs(gray(data,i)-high))<tolerance).length;
  if(near<border.length*.8||histogram[first]<usable*.18||histogram[second]<usable*.18)return null;
  function axis(length,index){
    const values=Array.from({length},(_,n)=>gray(data,index(n))),changes=[];let prev=values[0]>mid;
    for(let n=1;n<length;n++){const next=values[n]>mid;if(next!==prev){changes.push(n);prev=next;}}
    if(changes.length<5)return null;
    const lengths=changes.slice(1).map((n,i)=>n-changes[i]),sorted=[...lengths].sort((a,b)=>a-b),cell=sorted[Math.floor(sorted.length/2)];
    if(cell<4||cell>length/4||lengths.filter(n=>Math.abs(n-cell)<=2).length<lengths.length*.9)return null;
    return {cell,values};
  }
  const x=axis(width,n=>n*4),y=axis(height,n=>n*width*4);
  if(!x||!y||Math.abs(x.cell-y.cell)>Math.max(2,x.cell*.15))return null;
  const corner=gray(data,0)>mid?1:-1;
  return {low,high,mid,half,x:x.values.map(v=>clamp((v-mid)/half,-1,1)),y:y.values.map(v=>clamp((v-mid)/half,-1,1)),corner};
}

// Reverse a gray matte into alpha. Unpremultiplying the residual preserves the
// colored glow instead of replacing every gray-looking pixel with a hard cutout.
export function cleanCrosshairBackground(source,width,height,mode='auto',threshold=6){
  if(source.length!==width*height*4)throw Error('Invalid crosshair pixel dimensions.');
  const data=new Uint8ClampedArray(source);let hasAlpha=false;
  for(let i=3;i<data.length;i+=4)if(data[i]<255){hasAlpha=true;break;}
  if(mode==='original'||mode==='auto'&&hasAlpha)return {data,kind:hasAlpha?'transparent':'original'};
  const checker=mode==='auto'||mode==='checker'?detectCheckerboard(source,width,height):null;
  if(mode==='auto'&&!checker)return {data,kind:'opaque'};
  if(mode==='checker'&&!checker)return {data,kind:'not-found'};
  if(!checker&&!['dark','light'].includes(mode))return {data,kind:'original'};
  threshold=Number.isFinite(threshold)?clamp(threshold,0,48):6;
  let visible=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,bg=checker?checker.mid+checker.half*checker.x[x]*checker.y[y]*checker.corner:mode==='light'?255:0;
    let alpha=0,difference=0;
    for(let c=0;c<3;c++){const delta=source[i+c]-bg;difference=Math.max(difference,Math.abs(delta));alpha=Math.max(alpha,delta>=0?delta/Math.max(1,255-bg):-delta/Math.max(1,bg));}
    const t=clamp((difference-threshold)/8,0,1),feather=t*t*(3-2*t);
    data[i+3]=Math.round(clamp(alpha,0,1)*feather*source[i+3]);
    for(let c=0;c<3;c++)data[i+c]=data[i+3]?clamp((source[i+c]-bg*(1-alpha))/Math.max(alpha,.0001),0,255):0;
    if(data[i+3])visible++;
  }
  // A false match or overly strong setting must not silently erase the reticle.
  if(!visible)return {data:new Uint8ClampedArray(source),kind:'empty'};
  return {data,kind:checker?'checker':mode};
}
