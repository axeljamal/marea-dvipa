import json, hashlib, os, re, shutil, subprocess, datetime
from build import PALETTE
PKG = "pkg/bali-batik-motifs"
shutil.rmtree("pkg", ignore_errors=True); os.makedirs(PKG)
INFO = {
 "barong-mask":      ("Barong Mask", "Guardian mask with flame-leaf crown; the hero motif.", True),
 "sailing-ship":     ("Sailing Ship on Waves", "Two-masted perahu riding curling waves.", False),
 "temple-gateway":   ("Temple Gateway (Candi Bentar)", "Split gate pair joined by a garland, gold lotus at the apex.", True),
 "damask-medallion": ("Damask Medallion", "Central lotus medallion with sweeping wave-scroll arms.", True),
 "gold-flourish":    ("Gold Flourish", "Small gold scroll sprig with a teal blossom; filler/accent.", False),
 "lotus-bud-finial": ("Lotus Bud Finial", "Small navy lotus bud with gold tips; spacer/finial.", True),
 "gold-lotus":       ("Gold Lotus", "Standalone gold lotus bloom (also used at the gateway apex).", True),
}
VERSION = "1.0.0"
now = datetime.datetime.utcnow().replace(microsecond=0).isoformat()+"Z"
sha = lambda p: hashlib.sha256(open(p,"rb").read()).hexdigest()
manifest = {"collection":"Bali Batik Motifs","version":VERSION,"locked_at":now,"palette":{n:h for n,h in PALETTE},"assets":{}}
for i,(slug,(title,desc,sym)) in enumerate(INFO.items(),1):
    folder=f"{PKG}/{i:02d}-{slug}"; os.makedirs(folder)
    svg=open(f"out/{slug}.svg").read()
    svg=re.sub(r'<path id="([a-z-]+)"', lambda m: f'<path id="{slug}__{m.group(1)}" data-ink="{m.group(1)}"', svg)
    svg=svg.replace(f'aria-label="{slug}"', f'aria-label="{title}"').replace(f"<title>{slug}</title>",
        f"<title>{title}</title>\n  <desc>Bali Batik Motifs · {slug} · v{VERSION} · LOCKED. Do not edit paths or fills; see spec.json.</desc>")
    open(f"{folder}/{slug}.svg","w").write(svg)
    w,h=map(int,re.search(r'viewBox="0 0 (\d+) (\d+)"',svg).groups())
    inks=re.findall(r'data-ink="([a-z-]+)" fill="(#[0-9A-F]+)"',svg)
    manifest["assets"][slug]={"folder":os.path.basename(folder),"w":w,"h":h}
    json.dump({"id":slug,"title":title,"description":desc,"version":VERSION,"status":"LOCKED","locked_at":now,
      "source":"Extracted from the supplied Balinese pattern tile; cleaned, upscaled 6x, quantised to the locked palette and vector-traced.",
      "master":{"file":f"{slug}.svg","viewBox":[0,0,w,h],"aspect_ratio":round(w/h,4)},
      "symmetry":"bilateral (mirrored about vertical centre line)" if sym else "none (directional — do not mirror unless intentional)",
      "inks_bottom_to_top":[{"token":t,"hex":c} for t,c in inks],
      "reproduction_rules":["Scale proportionally only; never stretch or skew.",
        "Use only the inks listed; colour changes must map whole tokens (e.g. a two-tone variant), never individual paths.",
        "Keep layer order; layers overlap slightly underneath each other by design to avoid seams.",
        "Keep clear space of at least 8% of the motif's width around it in layouts.",
        "Use the SVG as the master; regenerate PNGs from it rather than editing PNGs.",
        "Any change = new version number and new hashes; run verify_lock.py before release."],
      "files":{}},open(f"{folder}/spec.json","w"),indent=2)
os.makedirs("pkg/_tmp",exist_ok=True)
