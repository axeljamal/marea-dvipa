import json, hashlib, os, shutil, glob, datetime, cv2, numpy as np
from master import PALETTE
from run import SPECS
PKG="pkg/bali-batik-motifs-master"
shutil.rmtree("pkg",ignore_errors=True); os.makedirs(PKG+"/_source")
shutil.copy("sheet.png",PKG+"/_source/original-motif-sheet.png"); shutil.copy("layout.png",PKG+"/_source/original-pattern-layout.png")
meta=json.load(open("out/meta.json")); sheet=cv2.imread("sheet.png")
sha=lambda p: hashlib.sha256(open(p,"rb").read()).hexdigest()
ssha=sha("sheet.png"); V="2.0.0"
now=datetime.datetime.now(datetime.UTC).replace(microsecond=0).isoformat().replace("+00:00","Z")
for i,k in enumerate(SPECS,1):
    m=meta[k]; d=f"{PKG}/{i:02d}-{k}"; os.makedirs(d+"/reference")
    shutil.copy(f"out/{k}.svg",f"{d}/{k}.svg")
    r=m["src_region"]; crop=sheet[r["y"]:r["y"]+r["h"],r["x"]:r["x"]+r["w"]]
    cv2.imwrite(d+"/reference/original-crop.png",crop)
    json.dump({"id":k,"title":m["name"],"name_on_sheet":m["name"].upper(),"edition":"master","version":V,"status":"LOCKED","locked_at":now,
      "source_reference":{"file":"_source/original-motif-sheet.png","sha256":ssha,"region_px":r,
         "reference_files":["reference/original-crop.png","reference/comparison.png"]},
      "treatment":f"Detail-optimised: {m['S']}x upscale with light edge recovery, 14-ink palette sampled from the sheet + pearl keylines, light smoothing (σ≈{0.33*m['S']:.1f}px), fine curve tracing; cream keylines kept as pearl so the motif is self-contained on any ground.",
      "master":{"file":f"{k}.svg","viewBox":[0,0,m["w"],m["h"]],"aspect_ratio":round(m["w"]/m["h"],4)},
      "symmetry":"bilateral (mirrored about vertical centre line)" if m["sym"] else "none (directional; mirror only intentionally)",
      "inks_bottom_to_top":[{"token":t,"hex":h} for t,h in m["inks"]],
      "reproduction_rules":["Scale proportionally only; never stretch or skew.",
        "Use only the listed inks; recolours map whole tokens and ship as a new version.",
        "Keep layer order; lower layers tuck under upper ones to avoid seams.",
        "Works on light or dark grounds (pearl keylines are part of the drawing).",
        "Keep clear space of at least 8% of the motif's width in layouts; repeats follow pattern-layouts/ specs.",
        "Use the SVG as master; regenerate PNGs from it, never edit PNGs.",
        "Any change = new version + new hashes; run verify_lock.py."],"files":{}},open(d+"/spec.json","w"),indent=2)
print("ok")
