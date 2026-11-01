import json, pickle, sys
from build import *
specs = {
 "barong-mask":      dict(comps=[27], sym=True),
 "sailing-ship":     dict(comps=[29], sym=False),
 "temple-gateway":   dict(comps=[24], sym=True),
 "damask-medallion": dict(comps=[16,15], sym=True),
 "gold-flourish":    dict(comps=[11], sym=False),
 "lotus-bud-finial": dict(comps=[20], sym=True),
 "gold-lotus":       dict(comps=[24], box=(625,232,706,314), sym=True),
}
only = sys.argv[1:] or list(specs)
os.makedirs("out", exist_ok=True)
for k in only:
    a = build(k, **specs[k])
    open(f"out/{k}.svg","w").write(svg_doc(a, k))
    print(k, a["w"], a["h"], [(l[0], l[3]) for l in a["layers"]], len(open(f"out/{k}.svg").read())//1024, "KB")
