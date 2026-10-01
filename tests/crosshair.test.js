import test from 'node:test';
import assert from 'node:assert/strict';
import {CROSSHAIR_DEFAULTS,normalizeCrosshair,crosshairGap,crosshairFileKind,validStoredImage} from '../src/crosshair-model.js';

test('corrupt crosshair preferences recover to finite bounded values',()=>{
  for(const value of [null,[],42,'bad'])assert.deepEqual(normalizeCrosshair(value),CROSSHAIR_DEFAULTS);
  const p=normalizeCrosshair({mode:'script',style:'unknown',color:'url(bad)',size:Infinity,gap:-50,opacity:9,imageSize:2000,imageX:NaN,dynamic:'false'});
  assert.equal(p.mode,'built');assert.equal(p.style,'cross');assert.equal(p.color,CROSSHAIR_DEFAULTS.color);
  assert.equal(p.size,6);assert.equal(p.gap,0);assert.equal(p.opacity,1);assert.equal(p.imageSize,160);assert.equal(p.imageX,0);assert.equal(p.dynamic,true);
  assert.equal(normalizeCrosshair({color:'#FF00DD',dynamic:false}).color,'#ff00dd');
  assert.equal(normalizeCrosshair({imageBackground:'unknown',imageThreshold:Infinity}).imageBackground,'auto');
  assert.equal(normalizeCrosshair({imageBackground:'original',imageThreshold:80}).imageBackground,'original');
  assert.equal(normalizeCrosshair({imageThreshold:80}).imageThreshold,48);
});
test('static crosshair keeps its gap; dynamic gap expands and settles when aiming',()=>{
  const p=normalizeCrosshair({gap:7});assert.equal(crosshairGap(p),7);
  assert.ok(crosshairGap(p,{speed:15,recoil:.7})>7);
  assert.equal(crosshairGap(p,{speed:15,recoil:.7,ads:1}),2);
  assert.equal(crosshairGap({...p,dynamic:false},{speed:15,recoil:.7,ads:1}),7);
});
test('image import accepts supported image types and rejects invalid or oversized files',()=>{
  for(const type of ['image/png','image/webp','image/jpeg'])assert.equal(crosshairFileKind({size:20,type}),'raster');
  assert.equal(crosshairFileKind({name:'mark.SVG',size:20,type:''}),'svg');
  assert.equal(crosshairFileKind({name:'mark.png',size:20,type:''}),'raster');
  assert.throws(()=>crosshairFileKind({name:'not-an-image.png',size:20,type:'text/html'}),/Use a PNG/);
  assert.throws(()=>crosshairFileKind({size:0,type:'image/png'}),/non-empty/);
  assert.throws(()=>crosshairFileKind({size:2097153,type:'image/png'}),/too large/);
  assert.throws(()=>crosshairFileKind({size:20,type:'image/gif'}),/Use a PNG/);
});
test('saved images only restore bounded normalized PNG data URLs',()=>{
  assert.equal(validStoredImage('data:image/png;base64,iVBORw0KGgo='),true);
  for(const value of [null,{},'https://example.com/mark.png','javascript:alert(1)','data:image/svg+xml,<svg/>','data:image/png;base64,ab<script>','data:image/png;base64,'+'a'.repeat(1500001)])assert.equal(validStoredImage(value),false);
});
