import json, hashlib, os, glob, cv2, numpy as np, shutil
from build_fine import PALETTE
PKG="pkg_fine/bali-batik-motifs-fine"; STD="pkg/bali-batik-motifs"
sha=lambda p: hashlib.sha256(open(p,"rb").read()).hexdigest()
def lab(im,t):
    bar=np.full((44,im.shape[1],3),255,np.uint8)
    cv2.putText(bar,t,(14,30),cv2.FONT_HERSHEY_SIMPLEX,0.8,(90,58,22),2,cv2.LINE_AA); return np.vstack([bar,im])
for d in sorted(glob.glob(PKG+"/0*")):
    slug=d.split("/")[-1][3:]
    o=cv2.imread(d+"/reference/original-crop@8x.png")
    s=cv2.imread(glob.glob(f"{STD}/*-{slug}/{slug}.preview.png")[0]); f=cv2.imread(f"{d}/{slug}.preview.png")
    H=700; fit=lambda im: cv2.resize(im,(max(1,int(im.shape[1]*H/im.shape[0])),H),interpolation=cv2.INTER_AREA)
    pad=lambda im: cv2.copyMakeBorder(im,20,20,20,20,cv2.BORDER_CONSTANT,value=(255,255,255))
    row=np.hstack([lab(pad(fit(o)),"ORIGINAL (source crop)"),lab(pad(fit(s)),"STANDARD v1.0.0"),lab(pad(fit(f)),"FINE v1.0.0")])
    cv2.imwrite(d+"/reference/comparison.png",row)
man={"collection":"Bali Batik Motifs","edition":"fine","version":"1.0.0","status":"LOCKED",
     "palette":[{"token":n,"hex":h} for n,h in PALETTE]+[{"token":"paper","hex":"#FFFFFF","note":"ground; transparent in assets"}],"assets":[]}
for d in sorted(glob.glob(PKG+"/0*")):
    sp=json.load(open(d+"/spec.json"))
    files=sorted(f for f in glob.glob(d+"/**/*",recursive=True) if os.path.isfile(f) and not f.endswith("spec.json"))
    sp["files"]={os.path.relpath(f,d):{"sha256":sha(f),"bytes":os.path.getsize(f)} for f in files}
    json.dump(sp,open(d+"/spec.json","w"),indent=2)
    man["assets"].append({"id":sp["id"],"title":sp["title"],"folder":os.path.basename(d),"viewBox":sp["master"]["viewBox"],
        "source_region_px":sp["source_reference"]["region_px"],"files":{k:v["sha256"] for k,v in sp["files"].items()},"spec_sha256":sha(d+"/spec.json")})
man["source_image_sha256"]=sp["source_reference"]["sha256"]
json.dump(man,open(PKG+"/manifest.lock.json","w"),indent=2)
json.dump({n:h for n,h in PALETTE}|{"paper":"#FFFFFF"},open(PKG+"/palette.json","w"),indent=2)
open(PKG+"/palette.css","w").write(":root{\n"+"".join(f"  --batik-{n}: {h};\n" for n,h in PALETTE)+"  --batik-paper: #FFFFFF;\n}\n")
shutil.copy(STD+"/verify_lock.py",PKG+"/verify_lock.py")
os.makedirs(PKG+"/_source",exist_ok=True); shutil.copy("src.png",PKG+"/_source/original-pattern.png")
