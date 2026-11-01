import sys, json, os
from master import *
SPECS = {
 "barong-mask":            dict(name="Barong Mask", box=(30,18,384,458), sym=True),
 "traditional-boat":       dict(name="Traditional Boat", box=(390,95,716,452), sym=False),
 "split-gate-candi-bentar":dict(name="Split Gate (Candi Bentar)", box=(712,48,1131,457), sym=True),
 "large-floral-ornament":  dict(name="Large Floral Ornament", box=(1141,50,1500,432), sym=True),
 "wave-cloud-ornament":    dict(name="Wave / Cloud Ornament", box=(60,508,363,760), sym=False),
 "lotus-floral-motif":     dict(name="Lotus Floral Motif", box=(412,510,678,764), sym=True),
 "scroll-ornament":        dict(name="Scroll Ornament", box=(723,523,950,754), sym=False, hole_keep=40),
 "lotus-flower":           dict(name="Lotus Flower", box=(998,530,1218,762), sym=True),
 "lotus-bud":              dict(name="Lotus Bud", box=(1278,542,1449,757), sym=True),
 "border-filler-ornament": dict(name="Border / Filler Ornament", box=(240,815,1295,958), sym=True, target=6200, hole_keep=150),
}
if __name__ == "__main__":
    os.makedirs("out", exist_ok=True)
    meta = json.load(open("out/meta.json")) if os.path.exists("out/meta.json") else {}
    for k in (sys.argv[1:] or list(SPECS)):
        sp = dict(SPECS[k]); name = sp.pop("name")
        a = build(**sp)
        open(f"out/{k}.svg", "w").write(svg_doc(a, k, name, f"Bali Batik Motifs · Master edition · {name} · LOCKED"))
        meta[k] = dict(name=name, w=a["w"], h=a["h"], S=a["S"], src_region=a["src_region"], sym=SPECS[k]["sym"],
                       inks=[(t, h) for t, h, _, _ in a["layers"]])
        json.dump(meta, open("out/meta.json", "w"), indent=1)
        print(k, a["w"], a["h"], "S", a["S"], len(a["layers"]), "inks", os.path.getsize(f"out/{k}.svg") // 1024, "KB", flush=True)
