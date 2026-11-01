const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const { placeLayout } = require('./layouts.js');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage();
 const jobs=JSON.parse(process.argv[2]);
 for (const j of jobs){
  const {items}=placeLayout(j.opts,j.w,j.h);
  const html=`<html><body style="margin:0;background:${j.bg}"><div style="position:relative;width:${j.w}px;height:${j.h}px;overflow:hidden">`+
   items.map(it=>`<img src="file://${path.resolve('out/'+it.m+'.svg')}" style="position:absolute;left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px;${it.flip?'transform:scaleX(-1);':''}">`).join('')+`</div></body></html>`;
  fs.writeFileSync('/tmp/claude-0/pv.html',html);
  await p.setViewportSize({width:j.w,height:j.h}); await p.goto('file:///tmp/claude-0/pv.html'); await p.waitForTimeout(400);
  await p.screenshot({path:j.out}); console.log(j.out, items.length);
 } await b.close(); })();
