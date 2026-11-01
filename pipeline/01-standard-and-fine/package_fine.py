import json, hashlib, os, re, shutil, datetime
import numpy as np, cv2
from build_fine import PALETTE
PKG = "pkg_fine/bali-batik-motifs-fine"
STD = "pkg/bali-batik-motifs"
shutil.rmtree("pkg_fine", ignore_errors=True); os.makedirs(PKG)
INFO = {
 "barong-mask":      ("Barong Mask", "Guardian mask with flame-leaf crown; the hero motif.", True, [27], None),
 "sailing-ship":     ("Sailing Ship on Waves", "Two-masted perahu riding curling waves.", False, [29], None),
 "temple-gateway":   ("Temple Gateway (Candi Bentar)", "Split gate pair joined by a garland, gold lotus at the apex.", True, [24], None),
 "damask-medallion": ("Damask Medallion", "Central lotus medallion with sweeping wave-scroll arms.", True, [16,15], None),
 "gold-flourish":    ("Gold Flourish", "Small gold scroll sprig with a teal blossom; filler/accent.", False, [11], None),
 "lotus-bud-finial": ("Lotus Bud Finial", "Small navy lotus bud with gold tips; spacer/finial.", True, [20], None),
 "gold-lotus":       ("Gold Lotus", "Standalone gold lotus bloom (also used at the gateway apex).", True, [24], (625,232,706,314)),
}
V = "1.0.0"; ED = "fine"
SRC_PATH = "src.png"; src = cv2.imread(SRC_PATH); COMP = np.load("lab.npy")
sha = lambda p: hashlib.sha256(open(p,"rb").read()).hexdigest()
src_sha = sha(SRC_PATH)
now = datetime.datetime.now(datetime.UTC).replace(microsecond=0).isoformat().replace("+00:00","Z")
for i,(slug,(title,desc,sym,comps,box)) in enumerate(INFO.items(),1):
    folder=f"{PKG}/{i:02d}-{slug}"; os.makedirs(folder+"/reference")
    # reference: exact source crop
    m=np.isin(COMP,comps)
    if box: bm=np.zeros_like(m); bm[box[1]:box[3],box[0]:box[2]]=1; m&=bm.astype(bool)
    ys,xs=np.where(m); p=6
    x0,y0,x1,y1=max(xs.min()-p,0),max(ys.min()-p,0),xs.max()+p+1,min(ys.max()+p+1,src.shape[0])
    crop=src[y0:y1,x0:x1]
    cv2.imwrite(f"{folder}/reference/original-crop.png",crop)
    cv2.imwrite(f"{folder}/reference/original-crop@8x.png",cv2.resize(crop,None,fx=8,fy=8,interpolation=cv2.INTER_LANCZOS4))
    svg=open(f"out_fine/{slug}.svg").read()
    svg=re.sub(r'<path id="([a-z-]+)"', lambda mm: f'<path id="{slug}-fine__{mm.group(1)}" data-ink="{mm.group(1)}"', svg)
    svg=svg.replace(f'aria-label="{slug}"', f'aria-label="{title} (fine)"').replace(f"<title>{slug}</title>",
        f"<title>{title} — Fine detail</title>\n  <desc>Bali Batik Motifs · Fine edition · {slug} · v{V} · LOCKED. Source: uploaded pattern tile, region x{x0}-{x1} y{y0}-{y1}. Do not edit paths or fills; see spec.json.</desc>")
    open(f"{folder}/{slug}.svg","w").write(svg)
    w,h=map(int,re.search(r'viewBox="0 0 (\d+) (\d+)"',svg).groups())
    inks=re.findall(r'data-ink="([a-z-]+)" fill="(#[0-9A-F]+)"',svg)
    json.dump({"id":slug,"edition":"fine","title":title,"description":desc,"version":V,"status":"LOCKED","locked_at":now,
      "source_reference":{"file":"original uploaded pattern tile (1254×1254 px)","sha256":src_sha,
          "region_px":{"x":int(x0),"y":int(y0),"w":int(x1-x0),"h":int(y1-y0)},
          "reference_files":["reference/original-crop.png","reference/original-crop@8x.png","reference/comparison.png"],
          "standard_edition_counterpart":f"bali-batik-motifs/{i:02d}-{slug}/{slug}.svg"},
      "treatment":"Detail-preserving: 8x upscale, stronger edge recovery, 9-ink tonal palette, light smoothing (σ 2.6), islands kept down to 220 px², fine curve tracing. Mirrored motifs averaged with their reflection.",
      "master":{"file":f"{slug}.svg","viewBox":[0,0,w,h],"aspect_ratio":round(w/h,4)},
      "symmetry":"bilateral (mirrored about vertical centre line)" if sym else "none (directional — do not mirror unless intentional)",
      "inks_bottom_to_top":[{"token":t,"hex":c} for t,c in inks],
      "reproduction_rules":["Scale proportionally only; never stretch or skew.",
        "Use only the inks listed; colour changes must map whole tokens, never individual paths.",
        "Keep layer order; lower layers tuck under upper ones by design to avoid seams.",
        "Fine edition is for large/hero use (≥ 300 px or ≥ 8 cm print); below that use the standard edition.",
        "Keep clear space of at least 8% of the motif's width around it.",
        "Use the SVG as master; regenerate PNGs from it, never edit PNGs.",
        "Any change = new version number and new hashes; run verify_lock.py before release."],
      "files":{}},open(f"{folder}/spec.json","w"),indent=2)
print("ok")
