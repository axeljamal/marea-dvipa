const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage();
 for (const f of process.argv.slice(2)) { const svg=fs.readFileSync(f,'utf8');
  const [w,h]=svg.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number);
  for (const [edge,suf,bg] of [[2048,'@2048.png','transparent'],[512,'@512.png','transparent'],[1200,'.preview.png','#FAF7F2']]) {
   const s=edge/Math.max(w,h); const W=Math.round(w*s),H=Math.round(h*s);
   await p.setViewportSize({width:W,height:H});
   await p.setContent(`<html><body style="margin:0;background:${bg}">${svg.replace(/width="\d+" height="\d+"/,`width="${W}" height="${H}"`)}</body></html>`);
   await p.screenshot({path:f.replace(/\.svg$/,suf),omitBackground:bg==='transparent'}); } }
 await b.close(); })();
