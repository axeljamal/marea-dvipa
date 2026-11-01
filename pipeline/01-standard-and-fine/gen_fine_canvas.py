import json, html, glob
exec(open("gen_canvas.py").read().split("boards={}; order=[]")[0])  # reuse HEAD/TAIL/swatch/fonts
svgb={"barong-mask":"79e02606d9c73c1917a78821a1e2cb5c","sailing-ship":"179417d9c011a4a80de1c475d7c88172","temple-gateway":"6aeae706170b634f4672ef3eec165167","damask-medallion":"2825aafc61911105d9800596eb51737a","gold-flourish":"5b6d276753d8ffa3b9a0de38c49c2f34","lotus-bud-finial":"5e6cdc00d329fbb4368eb7084da0e28d","gold-lotus":"1376266edbdaa749ff2a2ed4a7e991ad"}
orib={"barong-mask":"a75a95b76453f924df1c409c2860eefa","sailing-ship":"318ff996cbfb3c93ee7f54a5e560e9bb","temple-gateway":"cd19d8a861d2d8f577a35afb483f6e7c","damask-medallion":"3f82a50fa32797ed320da834d3a5a22b","gold-flourish":"6290983dec3b253ec44ce707aca7f1f0","lotus-bud-finial":"f33820cabbea7fc15bb4b701c147febc","gold-lotus":"2644af608e80b93d8b39714ee3c4b4b0"}
man=json.load(open("pkg_fine/bali-batik-motifs-fine/manifest.lock.json"))
BW,BH=880,620; boards={}; order=[]; Y0=3980
for i,a in enumerate(man["assets"]):
    slug=a["id"]; sp=json.load(open(f"pkg_fine/bali-batik-motifs-fine/{a['folder']}/spec.json"))
    r=sp["source_reference"]["region_px"]
    inks="\n".join(swatch(x["token"],x["hex"]) for x in reversed(sp["inks_bottom_to_top"]))
    def panel(label,src,alt,extra=""):
        return f'''<div style="flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 8px">
<div style="{mono}; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: {MUTED}">{label}</div>
<div style="height: 300px; border: 1px solid #DCE1E5; border-radius: 4px; display: flex; align-items: center; justify-content: center; padding: 16px; background: #FFFFFF">
<img src="/_blob/{src}" alt="{alt}" style="max-width: 100%; max-height: 268px; object-fit: contain{extra}">
</div>
</div>'''
    f=f"Fine-{i+1:02d}-{slug}.dc.html"
    body=HEAD.format(title=sp["title"]+" — fine")+f'''<div style="width: {BW}px; height: {BH}px; box-sizing: border-box; padding: 32px; background: #FFFFFF; color: {NAVY}; display: flex; flex-direction: column; gap: 18px">
<div style="display: flex; justify-content: space-between; align-items: center">
<h2 style="margin: 0; {serif}; font-weight: 600; font-size: 30px; line-height: 1">{html.escape(sp['title'])}</h2>
<div style="{mono}; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: {NAVY}; border: 1px solid {NAVY}; border-radius: 3px; padding: 3px 8px">Fine · Locked v1.0.0</div>
</div>
<div style="display: flex; gap: 20px">
{panel("Original — your upload", orib[slug], sp['title']+" as it appears in the original pattern", "; width: 100%; height: 268px")}
{panel("Fine edition — 9 inks", svgb[slug], sp['title']+" fine edition")}
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 12px">
{inks}
</div>
<div style="{mono}; font-size: 11px; color: {MUTED}; border-top: 1px solid #DCE1E5; padding-top: 10px; display: flex; justify-content: space-between; gap: 12px">
<span>Source region x{r['x']} y{r['y']} · {r['w']}×{r['h']} px</span><span>{a['folder']}/{slug}.svg · {a['viewBox'][2]}×{a['viewBox'][3]}</span>
</div>
</div>
'''+TAIL.format(w=BW,h=BH)
    open(f"canvas/project/{f}","w").write(body)
    rr,c=divmod(i,4)
    boards[f]={"x":c*(BW+80),"y":Y0+rr*(BH+120),"w":BW,"h":BH,"title":sp["title"]+" — fine"}; order.append(f)
json.dump({"boards":boards,"order":order},open("fine_layout.json","w"))
