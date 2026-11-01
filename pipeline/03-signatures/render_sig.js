const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage();
 async function show(html){fs.writeFileSync('/tmp/claude-0/s.html',html); await p.goto('file:///tmp/claude-0/s.html'); await p.waitForTimeout(150);}
 for (const f of process.argv.slice(2)) { const svg=fs.readFileSync(f,'utf8');
  const [w,h]=svg.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number);
  const isTile=f.includes('isen-isen'); const bg=f.includes('buya-bomba')?'#0E0C09':'#FAF7F2';
  const jobs=isTile?[[1024,'@1024.png','transparent',false],[1200,'.swatch.png',bg,true]]:[[2048,'@2048.png','transparent',false],[512,'@512.png','transparent',false],[1200,'.preview.png',bg,false]];
  for (const [edge,suf,bgc,rep] of jobs){ const s=edge/Math.max(w,h); const W=Math.round(w*s),H=Math.round(h*s);
   if(rep){ await p.setViewportSize({width:1200,height:800}); await show(`<html><body style="margin:0;width:1200px;height:800px;background-color:${bgc};background-image:url('file://${path.resolve(f)}');background-size:160px 160px"></body></html>`); await p.screenshot({path:f.replace('.svg',suf)}); continue; }
   await p.setViewportSize({width:W,height:H});
   await show(`<html><body style="margin:0;background:${bgc}"><img src="file://${path.resolve(f)}" style="width:${W}px;height:${H}px;display:block"></body></html>`);
   await p.screenshot({path:f.replace('.svg',suf),omitBackground:bgc==='transparent'}); } }
 await b.close(); })();
