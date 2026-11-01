import json, hashlib, os, glob, shutil, cv2, numpy as np
from master import PALETTE
PKG="pkg/bali-batik-motifs-master"
sha=lambda p: hashlib.sha256(open(p,"rb").read()).hexdigest()
def lab(im,t):
    bar=np.full((44,im.shape[1],3),(242,247,250),np.uint8)
    cv2.putText(bar,t,(14,30),cv2.FONT_HERSHEY_SIMPLEX,0.8,(73,48,15),2,cv2.LINE_AA); return np.vstack([bar,im])
for d in sorted(glob.glob(PKG+"/[0-9][0-9]-*")):
    k=d.split("/")[-1][3:]
    o=cv2.imread(d+"/reference/original-crop.png"); f=cv2.imread(f"{d}/{k}.preview.png")
    H=760 if k!="border-filler-ornament" else 200
    fit=lambda im: cv2.resize(im,(max(1,int(im.shape[1]*H/im.shape[0])),H),interpolation=cv2.INTER_AREA if im.shape[0]>H else cv2.INTER_CUBIC)
    pad=lambda im: cv2.copyMakeBorder(im,20,20,20,20,cv2.BORDER_CONSTANT,value=(242,247,250))
    a,b=lab(pad(fit(o)),"ORIGINAL (your sheet)"),lab(pad(fit(f)),"MASTER v2.0.0")
    row=np.hstack([a,b]) if k!="border-filler-ornament" else np.vstack([a,cv2.resize(b,(a.shape[1],int(b.shape[0]*a.shape[1]/b.shape[1])))])
    cv2.imwrite(d+"/reference/comparison.png",row)
man={"collection":"Bali Batik Motifs","edition":"master","version":"2.0.0","status":"LOCKED",
     "source_images":{"motif_sheet_sha256":sha(PKG+"/_source/original-motif-sheet.png"),"pattern_layout_sha256":sha(PKG+"/_source/original-pattern-layout.png")},
     "palette":[{"token":n,"hex":h} for n,h in PALETTE],"assets":[]}
for d in sorted(glob.glob(PKG+"/[0-9][0-9]-*")):
    sp=json.load(open(d+"/spec.json"))
    files=sorted(f for f in glob.glob(d+"/**/*",recursive=True) if os.path.isfile(f) and not f.endswith("spec.json"))
    sp["files"]={os.path.relpath(f,d):{"sha256":sha(f),"bytes":os.path.getsize(f)} for f in files}
    json.dump(sp,open(d+"/spec.json","w"),indent=2)
    man["assets"].append({"id":sp["id"],"title":sp["title"],"folder":os.path.basename(d),"viewBox":sp["master"]["viewBox"],
       "source_region_px":sp["source_reference"]["region_px"],"files":{k:v["sha256"] for k,v in sp["files"].items()},"spec_sha256":sha(d+"/spec.json")})
pl=PKG+"/pattern-layouts"
pf=sorted(f for f in glob.glob(pl+"/**/*",recursive=True) if os.path.isfile(f))
man["assets"].append({"id":"pattern-layouts","title":"Pattern layouts","folder":"pattern-layouts","files":{os.path.relpath(f,pl):sha(f) for f in pf}})
json.dump(man,open(PKG+"/manifest.lock.json","w"),indent=2)
json.dump({n:h for n,h in PALETTE},open(PKG+"/palette.json","w"),indent=2)
open(PKG+"/palette.css","w").write(":root{\n"+"".join(f"  --batik-{n}: {h};\n" for n,h in PALETTE)+"}\n")
v=open("../work/pkg/bali-batik-motifs/verify_lock.py").read().replace('checks = dict(a["files"], **{"spec.json": a["spec_sha256"]})','checks = dict(a["files"], **({"spec.json": a["spec_sha256"]} if "spec_sha256" in a else {}))')
open(PKG+"/verify_lock.py","w").write(v)
print("done")
