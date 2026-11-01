#!/usr/bin/env python3
"""Verify every locked asset still matches manifest.lock.json. Exit 1 on any drift."""
import hashlib, json, os, sys
root = os.path.dirname(os.path.abspath(__file__))
man = json.load(open(os.path.join(root, "manifest.lock.json")))
sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
bad = 0
for a in man["assets"]:
    d = os.path.join(root, a["folder"])
    checks = dict(a["files"], **{"spec.json": a["spec_sha256"]})
    for f, h in checks.items():
        p = os.path.join(d, f)
        ok = os.path.exists(p) and sha(p) == h
        bad += not ok
        print(("OK   " if ok else "DRIFT"), a["folder"] + "/" + f)
print(f"\n{'ALL LOCKED' if not bad else str(bad) + ' file(s) changed or missing'} — v{man['version']}")
sys.exit(1 if bad else 0)
