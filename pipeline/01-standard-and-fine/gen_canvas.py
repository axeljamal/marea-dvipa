import json, html
root="canvas/project"
blobs={"barong-mask":"c2d575fc2f05ab5517cd31087dbc9966","sailing-ship":"55317dc611bc54fefc6f826aea5d0090","temple-gateway":"4813bf580cfa7d67e5deb461b79eee61","damask-medallion":"de7f2c36edd995f110f8a4079ecd528d","gold-flourish":"83ba89d5b0d2dc6cee7b0d7dccded175","lotus-bud-finial":"431deef0baf538ae3050d20cb94e536e","gold-lotus":"a50a3c1abd4112c1900533774b02e479"}
man=json.load(open("pkg/bali-batik-motifs/manifest.lock.json"))
PAL={p["token"]:p["hex"] for p in man["palette"]}
NAVY="#163A5A"; MUTED="#4A5866"
HEAD='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
a{{color:#163A5A}}a:hover{{color:#0B2238}}
</style>
</helmet>
'''
TAIL='''</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
'''
mono="font-family: 'IBM Plex Mono', ui-monospace, monospace"
serif="font-family: 'Cormorant Garamond', Georgia, serif"
def swatch(tok,hx,big=False):
    s=56 if big else 18
    if big:
        return f'''<div style="display: flex; flex-direction: column; gap: 10px; width: 150px">
<div style="width: 150px; height: 96px; background: {hx}; border-radius: 4px; border: 1px solid #DCE1E5"></div>
<div style="{mono}; font-size: 13px; font-weight: 500; color: {NAVY}">{tok}</div>
<div style="{mono}; font-size: 12px; color: {MUTED}">{hx}</div>
</div>'''
    return f'''<div style="display: flex; align-items: center; gap: 8px">
<div style="width: 18px; height: 18px; border-radius: 3px; background: {hx}; border: 1px solid #DCE1E5"></div>
<div style="{mono}; font-size: 11px; color: {MUTED}">{tok} {hx}</div>
</div>'''
boards={}; order=[]
# Main / palette board
W,H=1240,640
sw="\n".join(swatch(t,h,True) for t,h in PAL.items())
main=HEAD.format(title="Bali Batik Motifs — locked palette")+f'''<div style="width: {W}px; height: {H}px; box-sizing: border-box; padding: 64px; background: #FFFFFF; color: {NAVY}; display: flex; flex-direction: column; gap: 40px">
<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 24px">
<div style="display: flex; flex-direction: column; gap: 8px">
<div style="{mono}; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: {MUTED}">Asset library · v1.0.0 · Locked</div>
<h1 style="margin: 0; {serif}; font-weight: 600; font-size: 64px; line-height: 1">Bali Batik Motifs</h1>
</div>
<div style="{mono}; font-size: 12px; color: {MUTED}; text-align: right; line-height: 1.6">7 motifs · 6 inks + paper<br>SVG master per motif</div>
</div>
<div style="display: flex; gap: 20px; flex-wrap: wrap">
{sw}
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; border-top: 1px solid #DCE1E5; padding-top: 28px">
<p style="margin: 0; {mono}; font-size: 12px; line-height: 1.7; color: {MUTED}"><span style="color: {NAVY}; font-weight: 500">Master.</span> Each motif's SVG is the single source of truth. PNGs are re-rendered from it, never edited.</p>
<p style="margin: 0; {mono}; font-size: 12px; line-height: 1.7; color: {MUTED}"><span style="color: {NAVY}; font-weight: 500">Inks are tokens.</span> Recolour whole tokens only, as a new version. Scale proportionally, keep layer order.</p>
<p style="margin: 0; {mono}; font-size: 12px; line-height: 1.7; color: {MUTED}"><span style="color: {NAVY}; font-weight: 500">Verified.</span> Every file's SHA-256 is in manifest.lock.json; verify_lock.py flags any drift.</p>
</div>
</div>
'''+TAIL.format(w=W,h=H)
open(f"{root}/Main.dc.html","w").write(main)
boards["Main.dc.html"]={"x":0,"y":1300,"w":W,"h":H,"title":"Palette & lock rules"}; order.append("Main.dc.html")
BW,BH=520,680
for i,a in enumerate(man["assets"]):
    slug=a["id"]; sp=json.load(open(f"pkg/bali-batik-motifs/{a['folder']}/spec.json"))
    vw,vh=a["viewBox"][2],a["viewBox"][3]
    inks="\n".join(swatch(x["token"],x["hex"]) for x in reversed(sp["inks_bottom_to_top"]))
    sym="Mirrored" if sp["symmetry"].startswith("bilateral") else "Directional"
    f=f"Motif-{i+1:02d}-{slug}.dc.html"
    src=HEAD.format(title=sp["title"])+f'''<div style="width: {BW}px; height: {BH}px; box-sizing: border-box; padding: 32px; background: #FFFFFF; color: {NAVY}; display: flex; flex-direction: column; gap: 20px">
<div style="display: flex; justify-content: space-between; align-items: center">
<div style="{mono}; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: {MUTED}">{i+1:02d} / 07</div>
<div style="{mono}; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: {NAVY}; border: 1px solid {NAVY}; border-radius: 3px; padding: 3px 8px">Locked v1.0.0</div>
</div>
<div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; min-height: 0">
<img src="/_blob/{blobs[slug]}" alt="{html.escape(sp['title'])} motif" style="max-width: 100%; max-height: 360px; object-fit: contain">
</div>
<div style="display: flex; flex-direction: column; gap: 6px">
<h2 style="margin: 0; {serif}; font-weight: 600; font-size: 32px; line-height: 1.05">{html.escape(sp['title'])}</h2>
<p style="margin: 0; font-family: Georgia, serif; font-size: 14px; line-height: 1.45; color: {MUTED}">{html.escape(sp['description'])}</p>
</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 12px">
{inks}
</div>
<div style="{mono}; font-size: 11px; color: {MUTED}; border-top: 1px solid #DCE1E5; padding-top: 10px; display: flex; justify-content: space-between">
<span>{a['folder']}/{slug}.svg</span><span>{vw}×{vh} · {sym}</span>
</div>
</div>
'''+TAIL.format(w=BW,h=BH)
    open(f"{root}/{f}","w").write(src)
    r,c=divmod(i,4)
    boards[f]={"x":c*(BW+80),"y":1300+H+120+r*(BH+120),"w":BW,"h":BH,"title":sp["title"]}; order.append(f)
print(json.dumps({"boards":boards,"order":order}))
