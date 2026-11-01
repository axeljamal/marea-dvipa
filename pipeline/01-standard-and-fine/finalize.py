import json, hashlib, os, glob
from build import PALETTE
PKG="pkg/bali-batik-motifs"
sha=lambda p: hashlib.sha256(open(p,"rb").read()).hexdigest()
man={"collection":"Bali Batik Motifs","version":"1.0.0","status":"LOCKED","palette":[{"token":n,"hex":h} for n,h in PALETTE]+[{"token":"paper","hex":"#FFFFFF","note":"ground; transparent in assets"}],"assets":[]}
for d in sorted(glob.glob(PKG+"/0*")):
    sp=json.load(open(d+"/spec.json"))
    sp["files"]={os.path.basename(f):{"sha256":sha(f),"bytes":os.path.getsize(f)} for f in sorted(glob.glob(d+"/*")) if not f.endswith("spec.json")}
    json.dump(sp,open(d+"/spec.json","w"),indent=2)
    man["assets"].append({"id":sp["id"],"title":sp["title"],"folder":os.path.basename(d),"viewBox":sp["master"]["viewBox"],
        "files":{k:v["sha256"] for k,v in sp["files"].items()},"spec_sha256":sha(d+"/spec.json")})
json.dump(man,open(PKG+"/manifest.lock.json","w"),indent=2)
json.dump({n:h for n,h in PALETTE}|{"paper":"#FFFFFF"},open(PKG+"/palette.json","w"),indent=2)
open(PKG+"/palette.css","w").write(":root{\n"+"".join(f"  --batik-{n}: {h};\n" for n,h in PALETTE)+"  --batik-paper: #FFFFFF;\n}\n")
