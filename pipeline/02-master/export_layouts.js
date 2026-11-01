const fs=require('fs'), path=require('path'); const {chromium}=require('playwright');
const {AR,LAYOUTS,placeLayout}=require('./layouts.js');
async function show(p,html){fs.writeFileSync('/tmp/claude-0/ex.html',html); await p.goto('file:///tmp/claude-0/ex.html');}
const PKG='pkg/bali-batik-motifs-master/pattern-layouts'; fs.mkdirSync(PKG,{recursive:true});
const sym={};
function symbol(m){ if(sym[m]) return sym[m];
  const s=fs.readFileSync(`out/${m}.svg`,'utf8'); const vb=s.match(/viewBox="([^"]+)"/)[1];
  const paths=s.match(/<path[\s\S]*?\/>/g).join('\n');
  return sym[m]=`<symbol id="${m}" viewBox="${vb}">\n${paths}\n</symbol>`; }
function use(it){ const t=it.flip?` transform="translate(${(2*it.x+it.w).toFixed(2)} 0) scale(-1 1)"`:'';
  return `<use href="#${it.m}" x="${it.x.toFixed(2)}" y="${it.y.toFixed(2)}" width="${it.w.toFixed(2)}" height="${it.h.toFixed(2)}"${t}/>`; }
function svgDoc(items,vb,w,h,title,bg){ const used=[...new Set(items.map(i=>i.m))];
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${vb}" width="${w}" height="${h}" role="img" aria-label="${title}">\n<title>${title}</title>\n<defs>\n${used.map(symbol).join('\n')}\n</defs>\n${bg?`<rect x="-99999" y="-99999" width="199998" height="199998" fill="${bg}"/>\n`:''}${items.map(use).join('\n')}\n</svg>\n`; }
const DEF={scale:1,spacing:1,hero:'barong-mask',crown:'large-floral-ornament',mirror:false};
const GROUNDS={'pearl':'#FAF7F2','midnight':'#02213D'};
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const recipes={};
 let n=0;
 for (const [key,L] of Object.entries(LAYOUTS)){ n++;
  const dir=`${PKG}/${String(n).padStart(2,'0')}-${key}`; fs.mkdirSync(dir,{recursive:true});
  const o={...DEF,layout:key}; const base=L.items(o); const tw=L.tw, th=L.th; const items=[];
  for (const dy of [-th,0,th]) for (const dx of [-tw,0,tw]) for (const bb of base){
    const w=bb[3], h=w*AR[bb[0]], x=bb[1]+dx-w/2, y=bb[2]+dy-h/2;
    if (x+w< -tw/2 || x> tw/2 || y+h< -th/2 || y> th/2) continue;
    items.push({m:bb[0],x,y,w,h,flip:!!bb[4]}); }
  const vb=`${-tw/2} ${-th/2} ${tw} ${th}`;
  fs.writeFileSync(`${dir}/${key}-tile.svg`, svgDoc(items,vb,tw*4,th*4,`${L.title} — seamless tile (transparent)`,null));
  recipes[key]={title:L.title,note:L.note,tile_units:{w:tw,h:th},unit_px_at_master:4,defaults:DEF,
    items:base.map(bb=>({motif:bb[0],cx:bb[1],cy:bb[2],width:bb[3],flip:!!bb[4]}))};
  fs.writeFileSync(`${dir}/recipe.json`,JSON.stringify(recipes[key],null,2));
  const tileAbs=path.resolve(`${dir}/${key}-tile.svg`);
  // tile png (transparent) @2048 wide
  const W=2048,H=Math.round(2048*th/tw);
  await p.setViewportSize({width:W,height:H});
  await show(p,`<html><body style="margin:0;background:transparent"><img src="file://${tileAbs}" style="width:${W}px;height:${H}px;display:block"></body></html>`);
  await p.waitForTimeout(300); await p.screenshot({path:`${dir}/${key}-tile@2048.png`,omitBackground:true});
  // repeat swatches proving the seam, on two grounds
  for (const [gn,gc] of Object.entries(GROUNDS)){
    await p.setViewportSize({width:1800,height:1200});
    await show(p,`<html><body style="margin:0;background-color:${gc};background-image:url('file://${tileAbs}');background-size:${tw*1.3}px ${th*1.3}px;width:1800px;height:1200px"></body></html>`);
    await p.waitForTimeout(500); await p.screenshot({path:`${dir}/${key}-swatch-${gn}.png`}); }
  console.log(key, items.length);
 }
 // the reference panel recreation
 const dir=`${PKG}/00-reference-panel`; fs.mkdirSync(dir,{recursive:true});
 for (const rows of [2,4]){ const VW=1000, VH=rows*390+200;
   const {items}=placeLayout({...DEF,layout:'temple-column',panel:true,rows},VW,VH);
   const f=`${dir}/temple-column-panel-${rows}x.svg`;
   fs.writeFileSync(f,svgDoc(items,`0 0 ${VW} ${VH}`,VW*2,VH*2,`Temple Column panel, ${rows} repeats`,null));
   await p.setViewportSize({width:VW*2,height:VH*2});
   await show(p,`<html><body style="margin:0;background:#FAF7F2"><img src="file://${path.resolve(f)}" style="width:${VW*2}px;display:block"></body></html>`);
   await p.waitForTimeout(400); await p.screenshot({path:f.replace('.svg','.png')}); }
 fs.writeFileSync(`${PKG}/layouts.js`,fs.readFileSync('layouts.js'));
 await b.close(); })();
