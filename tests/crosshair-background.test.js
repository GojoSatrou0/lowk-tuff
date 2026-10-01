import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCrosshairBackground,detectCheckerboard} from '../src/crosshair-background.js';
function checker(width=96,height=80,low=22,high=44){const data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,v=(Math.floor(x/8)+Math.floor(y/8))%2?high:low;data.set([v,v,v,255],i);}return data;}
function over(data,width,x,y,color,alpha){const i=(y*width+x)*4;for(let c=0;c<3;c++)data[i+c]=color[c]*alpha+data[i+c]*(1-alpha);}
test('auto removes both checker shades and reconstructs colored glow across adjacent tiles',()=>{
  const src=checker(),width=96,height=80,fg=[50,255,211];over(src,width,36,36,fg,.45);over(src,width,44,36,fg,.45);over(src,width,48,40,[255,255,255],1);
  const backup=new Uint8ClampedArray(src),result=cleanCrosshairBackground(src,width,height);
  assert.equal(result.kind,'checker');assert.equal(result.data[3],0);assert.equal(result.data[(12*width+12)*4+3],0);
  for(const x of [36,44]){const i=(36*width+x)*4;assert.ok(Math.abs(result.data[i+3]-115)<=2);for(let c=0;c<3;c++)assert.ok(Math.abs(result.data[i+c]-fg[c])<=3);}
  assert.equal(result.data[(40*width+48)*4+3],255);assert.deepEqual(src,backup);
});
test('real alpha and original mode preserve every pixel, including black details',()=>{
  const src=checker();src.set([0,0,0,128],0);assert.deepEqual(cleanCrosshairBackground(src,96,80).data,src);
  const opaque=checker();assert.deepEqual(cleanCrosshairBackground(opaque,96,80,'original').data,opaque);
});
test('auto does not key a flat background or an irregular two-tone image',()=>{
  const src=new Uint8ClampedArray(96*80*4).fill(255);for(let i=0;i<src.length;i+=4){const v=(i*17%71)<20?22:44;src.set([v,v,v,255],i);}
  assert.equal(detectCheckerboard(src,96,80),null);assert.equal(cleanCrosshairBackground(src,96,80).kind,'opaque');
  src.fill(255);assert.equal(cleanCrosshairBackground(src,96,80,'checker').kind,'not-found');
});
test('manual dark and light cleanup preserve antialiased foreground; excessive cleanup restores original',()=>{
  const dark=new Uint8ClampedArray([0,0,0,255,20,100,80,255]);const result=cleanCrosshairBackground(dark,2,1,'dark',0);
  assert.equal(result.data[3],0);assert.equal(result.data[7],100);assert.ok(result.data[5]>=254);
  const light=new Uint8ClampedArray([255,255,255,255,100,100,100,255]);const inverse=cleanCrosshairBackground(light,2,1,'light',0);
  assert.equal(inverse.data[3],0);assert.equal(inverse.data[7],155);assert.equal(inverse.data[4],0);
  const faint=new Uint8ClampedArray([10,10,10,255]);assert.equal(cleanCrosshairBackground(faint,1,1,'dark',48).kind,'empty');
});
