const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage();
 for (const f of process.argv.slice(2)) { const svg=fs.readFileSync(f,'utf8');
  const m=svg.match(/viewBox="0 0 (\d+) (\d+)"/); const w=+m[1],h=+m[2]; const s=+(process.env.SCALE||1);
  await p.setViewportSize({width:Math.round(w*s),height:Math.round(h*s)});
  const bg=process.env.BG||'transparent';
  await p.setContent(`<html><body style="margin:0;background:${bg}">${svg.replace(/width="\d+" height="\d+"/,`width="${w*s}" height="${h*s}"`)}</body></html>`);
  await p.screenshot({path:f.replace(/\.svg$/, process.env.SUF||'.png'),omitBackground:bg==='transparent'}); }
 await b.close(); })();
