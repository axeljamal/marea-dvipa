import { createRequire } from 'node:module';
const puppeteer = createRequire(import.meta.url)('./tools/node_modules/puppeteer-core');
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
const root=process.cwd(),M=path.resolve(root,'motion');
fs.cpSync('shots',path.join(M,'shots'),{recursive:true});fs.mkdirSync(path.join(M,'vo'),{recursive:true});fs.cpSync('vo',path.join(M,'vo'),{recursive:true});
for(const f of ['mark-night.png','isen-cecek.svg'])fs.cpSync('site/web/'+f,path.join(M,f));fs.cpSync('script.json',path.join(M,'script.json'));
const ff='tools/node_modules/ffmpeg-static/ffmpeg';const script=JSON.parse(fs.readFileSync('script.json','utf8'));const D={};
const VOICE=process.env.VOICE||'say';
for(const c of script){const f=`vo/${VOICE}/${c.id}.${VOICE==='say'?'aiff':'mp3'}`;const r=spawnSync(ff,['-i',f],{encoding:'utf8'});const m=r.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);D[c.id]=(+m[1])*3600+(+m[2])*60+(+m[3])}
fs.writeFileSync(path.join(M,'durations.json'),JSON.stringify(D));
const mime={html:'text/html',json:'application/json',png:'image/png',svg:'image/svg+xml'};
const srv=http.createServer((req,res)=>{const p=path.resolve(M,'.'+decodeURIComponent(req.url.split('?')[0]));try{const b=fs.readFileSync(p);res.writeHead(200,{'Content-Type':mime[p.split('.').pop()]||'application/octet-stream'});res.end(b)}catch{res.writeHead(404);res.end()}}).listen(8787);
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--hide-scrollbars','--disable-gpu']});
const page=await browser.newPage();page.on('pageerror',e=>console.log('PAGEERROR',e.message));page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
await page.setViewport({width:1920,height:1080});await page.goto('http://localhost:8787/index.html?render=1&t=0',{waitUntil:'networkidle0'});
await page.waitForFunction('window.READY===true',{timeout:20000});await page.evaluate(()=>document.fonts.ready);
const CH=await page.evaluate(()=>window.CHAPTERS);fs.rmSync('out/smoke',{recursive:true,force:true});fs.mkdirSync('out/smoke',{recursive:true});
const t0=Date.now();let n=0;
for(const c of CH){for(const f of [0.35,0.6,0.9]){const t=c.start+c.dur*f;await page.evaluate(tt=>window.seek(tt),t);await page.screenshot({type:'jpeg',quality:85,path:`out/smoke/${c.id}-${Math.round(f*100)}.jpg`,clip:{x:0,y:0,width:1920,height:1080}});n++}}
console.log('frames',n,'avg ms',Math.round((Date.now()-t0)/n));await browser.close();srv.close();
