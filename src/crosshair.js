import {CROSSHAIR_DEFAULTS,normalizeCrosshair,crosshairGap,crosshairFileKind,validStoredImage} from './crosshair-model.js';
import {cleanCrosshairBackground} from './crosshair-background.js';
const STORAGE='velocity-crosshair-v1',$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';

// Rebuild SVGs from drawing elements only; imported markup never enters the page.
export function sanitizeCrosshairSVG(source){
  if(/<!DOCTYPE|<!ENTITY/i.test(source))throw Error('Use a self-contained SVG without a document type, or export it as PNG.');
  const parsed=new DOMParser().parseFromString(source,'image/svg+xml');
  if(parsed.querySelector('parsererror')||parsed.documentElement.localName!=='svg')throw Error('This SVG could not be read.');
  const doc=document.implementation.createDocument(NS,'svg'),tags=new Set(['svg','g','path','line','rect','circle','ellipse','polygon','polyline','defs','linearGradient','radialGradient','stop','clipPath','use']);
  const attrs=new Set(['id','viewBox','preserveAspectRatio','width','height','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','points','d','transform','gradientUnits','gradientTransform','offset','fill-rule','clip-rule','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','fill-opacity','stroke-opacity','opacity','stop-opacity']);
  const paint=new Set(['fill','stroke','color','stop-color']),styleAttrs=new Set([...paint,'stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','fill-opacity','stroke-opacity','opacity','fill-rule','clip-rule']);
  function attribute(node,name,value){
    if(paint.has(name)){if(/^(#[\da-f]{3,8}|[a-z]{1,24}|(?:rgba?|hsla?)\([\d\s.,%+-]+\)|url\(\s*#[\w.-]+\s*\))$/i.test(value))node.setAttribute(name,value);}
    else if(name==='href'||name==='xlink:href'){if(/^#[\w.-]+$/.test(value))node.setAttribute('href',value);}
    else if(name==='clip-path'){if(/^url\(\s*#[\w.-]+\s*\)$/.test(value))node.setAttribute(name,value);}
    else if(attrs.has(name)&&!/[<>\\]/.test(value))node.setAttribute(name,value);
  }
  function copy(from,to){for(const a of from.attributes){if(a.name==='style'){for(const item of a.value.split(';')){const cut=item.indexOf(':'),name=item.slice(0,cut).trim(),value=item.slice(cut+1).trim();if(cut>0&&styleAttrs.has(name))attribute(to,name,value);}}else attribute(to,a.name,a.value);}for(const child of from.children)if(tags.has(child.localName)){const next=doc.createElementNS(NS,child.localName);copy(child,next);to.append(next);}}
  copy(parsed.documentElement,doc.documentElement);const root=doc.documentElement,box=(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
  const width=parseFloat(root.getAttribute('width'))||(box.length===4?box[2]:256),height=parseFloat(root.getAttribute('height'))||(box.length===4?box[3]:256);
  if(!(width>0&&height>0&&width<=2048&&height<=2048))throw Error('Use an image no larger than 2048 × 2048 pixels.');
  root.setAttribute('width',width);root.setAttribute('height',height);root.setAttribute('xmlns',NS);return new XMLSerializer().serializeToString(root);
}

export async function decodeCrosshairFile(file){
  const kind=crosshairFileKind(file),blob=kind==='svg'?new Blob([sanitizeCrosshairSVG(await file.text())],{type:'image/svg+xml'}):file,img=new Image();
  try{img.src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read file'));reader.readAsDataURL(blob);});await img.decode();if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth>2048||img.naturalHeight>2048)throw Error('Use an image no larger than 2048 × 2048 pixels.');
    const scale=Math.min(1,512/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let visible=false;for(let i=3;i<pixels.length;i+=4)if(pixels[i]){visible=true;break;}if(!visible)throw Error('That image is fully transparent. Choose a visible crosshair.');
    return {data:canvas.toDataURL('image/png'),name:String(file.name||'Imported crosshair').slice(0,100)};
  }catch(e){throw Error(e.message.startsWith('Use ')||e.message.startsWith('That ')?e.message:'Could not decode that image. Try a PNG or another file.');}
}

export function drawCrosshair(canvas,p,image,gap=p.gap){
  const dpr=Math.min(window.devicePixelRatio||1,2),edge=320,half=edge/2;if(canvas.width!==Math.round(edge*dpr)||canvas.height!==Math.round(edge*dpr)){canvas.width=Math.round(edge*dpr);canvas.height=Math.round(edge*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,half*dpr,half*dpr);ctx.clearRect(-half,-half,edge,edge);ctx.globalAlpha=p.opacity;
  if(p.mode==='image'&&image){ctx.save();ctx.translate(p.imageX,p.imageY);ctx.rotate(p.imageRotation*Math.PI/180);const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height,scale=p.imageSize/Math.max(width,height);ctx.drawImage(image,-width*scale/2,-height*scale/2,width*scale,height*scale);ctx.restore();return;}
  ctx.strokeStyle='#0a1319';ctx.fillStyle=p.color;ctx.lineJoin='round';ctx.lineWidth=p.outline*2;
  function rect(x,y,w,h){if(p.outline)ctx.strokeRect(x,y,w,h);ctx.fillRect(x,y,w,h);}
  if(p.style==='cross'||p.style==='t'){const t=p.thickness,s=p.size;if(p.style!=='t')rect(-t/2,-gap-s,t,s);rect(-t/2,gap,t,s);rect(-gap-s,-t/2,s,t);rect(gap,-t/2,s,t);}
  if(p.style==='circle'){ctx.beginPath();ctx.arc(0,0,p.size+gap,0,Math.PI*2);if(p.outline){ctx.lineWidth=p.thickness+p.outline*2;ctx.stroke();}ctx.strokeStyle=p.color;ctx.lineWidth=p.thickness;ctx.stroke();}
  if(p.dot||p.style==='dot'){ctx.beginPath();ctx.arc(0,0,p.dotSize/2,0,Math.PI*2);if(p.outline){ctx.strokeStyle='#0a1319';ctx.lineWidth=p.outline*2;ctx.stroke();}ctx.fill();}
}

export function createCrosshair({notify}){
  let prefs={...CROSSHAIR_DEFAULTS},asset=null,image=null,sourceImage=null,version=0,drawn='',importJob=0,busy=false;
  try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved){prefs=normalizeCrosshair(saved.prefs);if(validStoredImage(saved.asset?.data))asset={data:saved.asset.data,name:String(saved.asset.name||'Imported crosshair').slice(0,100)};else prefs.mode='built';}}catch{}
  const dialog=$('crosshair-settings'),hud=$('crosshair'),preview=$('ch-preview');
  function message(text,error=false){$('ch-message').textContent=text;$('ch-message').classList.toggle('error',error);}
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify({prefs,asset}));message('Saved on this browser.');return true;}catch{message('Browser storage is full or unavailable. This change works now but will not survive a reload.',true);return false;}}
  function redraw(){version++;drawn='';drawCrosshair(preview,prefs,image);update();}
  function changed(){save();redraw();}
  function prepareImage(){
    if(!sourceImage)return;
    const surface=document.createElement('canvas');surface.width=sourceImage.naturalWidth;surface.height=sourceImage.naturalHeight;
    const ctx=surface.getContext('2d',{willReadFrequently:true});ctx.drawImage(sourceImage,0,0);
    const pixels=ctx.getImageData(0,0,surface.width,surface.height),result=cleanCrosshairBackground(pixels.data,surface.width,surface.height,prefs.imageBackground,prefs.imageThreshold);
    pixels.data.set(result.data);ctx.putImageData(pixels,0,0);image=surface;
    const notes={transparent:'Real transparency found — original alpha preserved.',original:'Original image, with no background cleanup.',opaque:'This image is opaque. Choose a cleanup mode if its background should disappear.',checker:'Checkerboard removed. The colored glow is preserved.',dark:'Dark background converted to transparency.',light:'Light background converted to transparency.','not-found':'No regular checkerboard found. Try Dark background or Light background.',empty:'This setting would erase the whole image. Showing the original; reduce cleanup.'};
    $('ch-transparency-status').textContent=notes[result.kind];$('ch-transparency-status').classList.toggle('error',['not-found','empty'].includes(result.kind));
  }
  function controls(){
    for(const node of dialog.querySelectorAll('[data-ch]')){const value=prefs[node.dataset.ch];if(node.type==='checkbox')node.checked=value;else node.value=value;}
    $('ch-color-hex').value=prefs.color;
    for(const node of dialog.querySelectorAll('[data-ch-out]')){const key=node.dataset.chOut;node.textContent=key==='opacity'?`${Math.round(prefs[key]*100)}%`:key==='imageRotation'?`${prefs[key]}°`:key==='imageThreshold'?`${prefs[key]}`:`${prefs[key]} px`;}
    dialog.querySelectorAll('[data-ch-preset]').forEach(b=>b.setAttribute('aria-pressed',String(prefs.mode==='built'&&prefs.style===b.dataset.chPreset)));
    $('ch-built-options').hidden=prefs.mode==='image';$('ch-image-options').hidden=prefs.mode!=='image';$('ch-uploaded').disabled=!image||busy;$('ch-uploaded').setAttribute('aria-pressed',String(prefs.mode==='image'));
    $('ch-file-name').textContent=asset?asset.name:'No image selected';$('ch-remove').disabled=!asset||busy;$('ch-file').disabled=busy;$('ch-browse').disabled=busy;
  }
  function update({speed=0,recoil=0,ads=0,alive=true,scoped=false}={}){
    hud.style.visibility=alive&&!scoped&&!(prefs.hideADS&&ads>.8)?'visible':'hidden';
    const gap=Math.round(crosshairGap(prefs,{speed,recoil,ads})*4)/4,key=`${version}/${gap}/${Math.min(window.devicePixelRatio||1,2)}`;
    if(key!==drawn){drawCrosshair(hud,prefs,image,gap);drawn=key;}
  }
  async function importFile(file){const job=++importJob;busy=true;controls();message('Reading crosshair…');
    try{const next=await decodeCrosshairFile(file),loaded=new Image();loaded.src=next.data;await loaded.decode();if(job!==importJob)return;asset=next;sourceImage=loaded;prefs.mode='image';prefs.imageX=prefs.imageY=prefs.imageRotation=0;prefs.imageBackground='auto';prefs.imageThreshold=6;prepareImage();const stored=save();redraw();if(stored)message(`${next.name} imported and saved.`,false);notify('Custom crosshair applied. Adjust its size and background cleanup in the preview.');}
    catch(e){if(job===importJob)message(e.message,true);}finally{if(job===importJob){busy=false;$('ch-file').value='';controls();}}
  }
  dialog.querySelectorAll('[data-ch]').forEach(node=>node.addEventListener('input',()=>{const key=node.dataset.ch;prefs=normalizeCrosshair({...prefs,[key]:node.type==='checkbox'?node.checked:node.type==='color'||node.tagName==='SELECT'?node.value:Number(node.value)});if(key==='imageBackground'||key==='imageThreshold')prepareImage();controls();changed();}));
  $('ch-color-hex').addEventListener('change',()=>{const value=$('ch-color-hex').value.trim();if(!/^#[\da-f]{6}$/i.test(value)){message('Use a hex color such as #00ffcc.',true);$('ch-color-hex').value=prefs.color;return;}prefs.color=value.toLowerCase();controls();changed();});
  dialog.querySelectorAll('[data-ch-preset]').forEach(b=>b.onclick=()=>{prefs.mode='built';prefs.style=b.dataset.chPreset;if(prefs.style==='dot')prefs.dot=true;controls();changed();});
  $('ch-uploaded').onclick=()=>{if(image){prefs.mode='image';controls();changed();}};
  $('ch-browse').onclick=()=>$('ch-file').click();$('ch-file').onchange=()=>{if($('ch-file').files[0])importFile($('ch-file').files[0]);};
  let dragDepth=0;const drop=$('ch-drop');
  for(const name of ['dragenter','dragover'])drop.addEventListener(name,e=>{e.preventDefault();if(name==='dragenter')dragDepth++;drop.classList.add('dragging');if(e.dataTransfer)e.dataTransfer.dropEffect='copy';});
  drop.addEventListener('dragleave',e=>{e.preventDefault();if(--dragDepth<=0){dragDepth=0;drop.classList.remove('dragging');}});
  drop.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;drop.classList.remove('dragging');const files=e.dataTransfer?.files;if(files?.length===1)importFile(files[0]);else message('Drop one crosshair image at a time.',true);});
  // Dropping a file outside the drop zone must not navigate away from a match.
  for(const name of ['dragover','drop'])window.addEventListener(name,e=>{if(dialog.open&&Array.from(e.dataTransfer?.types||[]).includes('Files'))e.preventDefault();});
  $('ch-remove').onclick=()=>{importJob++;asset=image=sourceImage=null;prefs.mode='built';controls();changed();};
  $('ch-reset').onclick=()=>{prefs={...CROSSHAIR_DEFAULTS};prepareImage();controls();changed();};
  $('ch-close').onclick=$('ch-done').onclick=()=>dialog.close();
  dialog.querySelectorAll('[data-ch-scene]').forEach(b=>b.onclick=()=>{$('ch-preview-stage').dataset.scene=b.dataset.chScene;dialog.querySelectorAll('[data-ch-scene]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
  $('ch-open').onclick=()=>{controls();redraw();dialog.showModal();};
  controls();redraw();
  const ready=(async()=>{if(!asset)return;const job=importJob;try{const loaded=new Image();loaded.src=asset.data;await loaded.decode();if(job!==importJob)return;sourceImage=loaded;prepareImage();controls();redraw();}catch{if(job!==importJob)return;asset=image=sourceImage=null;prefs.mode='built';controls();redraw();message('Saved image could not be read. Please import it again.',true);}})();
  return {update,ready};
}
