export const CROSSHAIR_DEFAULTS=Object.freeze({mode:'built',style:'cross',color:'#e8fffa',size:6,thickness:2,gap:5,dot:true,dotSize:2,outline:1,opacity:1,dynamic:true,hideADS:false,imageSize:48,imageRotation:0,imageX:0,imageY:0,imageBackground:'auto',imageThreshold:6});
export const CROSSHAIR_STYLES=['cross','dot','circle','t'];
export const CROSSHAIR_FILE_LIMIT=2*1024*1024;
export function normalizeCrosshair(value={}){
  const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{},p={...CROSSHAIR_DEFAULTS};
  p.mode=v.mode==='image'?'image':'built';p.style=CROSSHAIR_STYLES.includes(v.style)?v.style:p.style;
  if(['auto','original','checker','dark','light'].includes(v.imageBackground))p.imageBackground=v.imageBackground;
  if(typeof v.color==='string'&&/^#[0-9a-f]{6}$/i.test(v.color))p.color=v.color.toLowerCase();
  for(const [key,min,max]of [['size',2,28],['thickness',1,8],['gap',0,24],['dotSize',1,10],['outline',0,3],['opacity',.1,1],['imageSize',8,160],['imageRotation',-180,180],['imageX',-32,32],['imageY',-32,32],['imageThreshold',0,48]])if(typeof v[key]==='number'&&Number.isFinite(v[key]))p[key]=Math.max(min,Math.min(max,v[key]));
  for(const key of ['dot','dynamic','hideADS'])if(typeof v[key]==='boolean')p[key]=v[key];return p;
}
export function crosshairGap(p,{speed=0,recoil=0,ads=0}={}){return p.dynamic?(p.gap+Math.max(0,speed)*.3+Math.max(0,recoil)*7)*(1-ads)+Math.min(p.gap,2)*ads:p.gap;}
export function crosshairFileKind(file){
  if(!file||!Number.isFinite(file.size)||file.size<=0)throw Error('Choose a non-empty image file.');
  if(file.size>CROSSHAIR_FILE_LIMIT)throw Error('That image is too large. Use a file under 2 MB.');
  const ext=String(file.name||'').split('.').pop().toLowerCase(),type=String(file.type||'').toLowerCase();
  if(type==='image/svg+xml'||(!type&&ext==='svg'))return 'svg';
  if(['image/png','image/jpeg','image/webp'].includes(type)||(!type&&['png','jpg','jpeg','webp'].includes(ext)))return 'raster';
  throw Error('Use a PNG, SVG, WebP, or JPG crosshair image.');
}
export function validStoredImage(value){return typeof value==='string'&&value.length<=1500000&&/^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(value);}
