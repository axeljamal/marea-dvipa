"""Ntina engraved emblems: taiganja-inspired, drawn as cast and chased metal.
Anatomy from the sources: tubu (keyhole open oval), jonga (buffalo horns + suspension eyelets),
tali ranga (crab pincers at the sides), sopa (base). Our articulation: Fibonacci counts,
batik isen-isen translated into chasing (sawut strokes, cecek punches), golden-spiral filigree,
and (Bloom Within) the Bomba rose held in the opening with the slit becoming its stem."""
import math, os
import draw
from draw import Art, xform, PHI
from ntina import keyhole

_line = Art.line
def _line2(self, pts, tok, sw, amp=1.5, k=5):
    """Two-point strokes (chasing marks) need a midpoint so the curve builder keeps them."""
    if len(pts) == 2:
        (x0, y0), (x1, y1) = pts
        pts = [(x0, y0), ((x0 + x1) / 2, (y0 + y1) / 2), (x1, y1)]
    return _line(self, pts, tok, sw, amp=amp, k=k)
Art.line = _line2

# Colourways are the four taiganja metals, each on buya bomba black.
METALS = {
    "gold":   {"base": "#C9A35A", "light": "#F1D695", "deep": "#7E5E25", "shadow": "#3A2A0E", "bright": "#FFF3CF"},
    "brass":  {"base": "#B99A4A", "light": "#E6CF84", "deep": "#6E5620", "shadow": "#2F250C", "bright": "#FBF0C2"},
    "bronze": {"base": "#A8703A", "light": "#DDA56A", "deep": "#5C3816", "shadow": "#2A170A", "bright": "#F6D3A8"},
    "silver": {"base": "#B9BEC3", "light": "#E9ECEF", "deep": "#686E74", "shadow": "#2B2F33", "bright": "#FFFFFF"},
}
for name, m in METALS.items():
    draw.COLOURWAYS[name] = {"gold": m["base"], "gold-light": m["light"], "gold-deep": m["deep"], "line": m["shadow"],
                             "navy": m["shadow"], "navy-deep": m["shadow"], "teal": m["deep"], "pearl": m["bright"]}

def ellipse_pts(cx, cy, rx, ry, a0, a1, n):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / n), cy + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]

def taper(center, w0, w1, power=1.0):
    """Polygon around a centre line, width tapering from w0 to w1."""
    n = len(center); L, R = [], []
    for i, (x, y) in enumerate(center):
        a = center[max(i - 1, 0)]; b = center[min(i + 1, n - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]; d = math.hypot(tx, ty) or 1
        nx, ny = -ty / d, tx / d
        t = i / (n - 1); w = (w0 + (w1 - w0) * t ** power) / 2
        L.append((x + nx * w, y + ny * w)); R.append((x - nx * w, y - ny * w))
    return L + R[::-1], L, R

def bez(p0, p1, p2, p3, n=40):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append((u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0], u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]))
    return out

def bead(a, x, y, r):
    """A granule: deep base, gold body, bright catch-light up-left (light from the top left)."""
    a.dot(x + r * 0.18, y + r * 0.22, r * 1.08, "line")
    a.dot(x, y, r, "gold")
    a.dot(x - r * 0.32, y - r * 0.34, r * 0.38, "pearl")

def rope(a, pts, sw, tick=7):
    """Filigree twisted wire: a rail with diagonal ticks."""
    a.line(pts, "gold-light", sw, amp=0, k=1)
    for i in range(2, len(pts) - 2, 3):
        x, y = pts[i]; px, py = pts[i - 1]; tx, ty = x - px, y - py; d = math.hypot(tx, ty) or 1
        nx, ny = -ty / d, tx / d
        a.line([(x - nx * tick + tx / d * 3, y - ny * tick + ty / d * 3), (x + nx * tick - tx / d * 3, y + ny * tick - ty / d * 3)], "gold-deep", sw * 0.35, amp=0, k=1)

def filigree_spiral(a, cx, cy, r0, turns, side, start, sw):
    b = math.log(PHI) / (math.pi / 2); pts = []; th = 0.0
    while th < turns * 2 * math.pi:
        r = r0 * math.exp(-b * th); ang = start + side * th
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang))); th += 0.07
    rope(a, pts, sw, tick=sw * 0.7)
    bead(a, pts[-1][0], pts[-1][1], sw * 0.9)

def horn(a, cx, cy, side):
    c = bez((cx + side * 95, cy - 210), (cx + side * 170, cy - 300), (cx + side * 330, cy - 300), (cx + side * 360, cy - 470), 50)
    poly, L, R = taper(c, 92, 8, 1.15)
    a.shape(poly, "gold", amp=0.8, k=1, stroke="line", sw=5)
    # light along the outer (upper) edge, shadow along the inner edge
    hi = L if side > 0 else R
    lo = R if side > 0 else L
    a.line(hi[2:-6], "gold-light", 6, amp=0, k=1)
    a.line(lo[2:-4], "gold-deep", 5, amp=0, k=1)
    # 13 ring grooves across the horn (Fibonacci), chased
    for j in range(1, 14):
        i = int(j * (len(c) - 6) / 14)
        a.line([L[i], R[i]], "gold-deep", 3.2, amp=0, k=1)
        a.line([(L[i][0] - side * 2, L[i][1] + 3), (R[i][0] - side * 2, R[i][1] + 3)], "gold-light", 1.6, amp=0, k=1)

def pincer(a, cx, cy, side):
    # arm from the tubu's side, then two prongs closing like a crab claw
    arm = bez((cx + side * 215, cy - 10), (cx + side * 270, cy - 20), (cx + side * 300, cy - 10), (cx + side * 330, cy + 5), 16)
    poly, _, _ = taper(arm, 58, 46)
    a.shape(poly, "gold", amp=0.6, k=1, stroke="line", sw=5)
    up = bez((cx + side * 325, cy - 5), (cx + side * 380, cy - 90), (cx + side * 470, cy - 60), (cx + side * 430, cy + 20), 30)
    lo = bez((cx + side * 325, cy + 15), (cx + side * 360, cy + 80), (cx + side * 430, cy + 90), (cx + side * 425, cy + 40), 24)
    for prong, w0 in ((up, 60), (lo, 40)):
        p, L, R = taper(prong, w0, 6, 1.1)
        a.shape(p, "gold", amp=0.6, k=1, stroke="line", sw=5)
        inner = R if side > 0 else L
        # serrated inner edge (the crab's teeth) as small chased triangles
        for i in range(4, len(inner) - 4, 3):
            x, y = inner[i]
            a.dot(x, y, 3.2, "gold-deep")
        a.line((L if side > 0 else R)[2:-3], "gold-light", 4, amp=0, k=1)
    # sawut strokes across the arm
    for i in range(2, 15, 3):
        x, y = arm[i]
        a.line([(x, y - 20), (x + side * 4, y + 20)], "gold-deep", 2.6, amp=0, k=1)

def tubu(a, cx, cy, rx, ry, hole_r, hole_cy, slit, rings=True):
    a.shape(keyhole(cx, cy, rx, ry, hole_r, hole_cy, slit), "gold", amp=0.8, k=1, stroke="line", sw=7)
    gap = 0.16
    # raised rim: light on the upper left, shadow on the lower right
    a.line(ellipse_pts(cx, cy, rx - 9, ry - 9, math.pi * 0.95, math.pi * 1.75, 60), "gold-light", 7, amp=0, k=1)
    a.line(ellipse_pts(cx, cy, rx - 9, ry - 9, -0.15, math.pi * 0.42, 50), "gold-deep", 7, amp=0, k=1)
    if not rings:
        return
    # chased grooves following the oval, broken at the slit
    for d in (30, 92):
        a.line(ellipse_pts(cx, cy, rx - d, ry - d, math.pi / 2 + gap, math.pi * 2.5 - gap, 120), "gold-deep", 3.4, amp=0, k=1)
        a.line(ellipse_pts(cx, cy + 3, rx - d - 3, ry - d - 3, math.pi / 2 + gap, math.pi * 2.5 - gap, 120), "gold-light", 1.6, amp=0, k=1)
    # 34 granules between the grooves
    for i in range(34):
        t = math.pi / 2 + gap + 0.06 + i * (2 * math.pi - 2 * gap - 0.12) / 33
        bead(a, cx + (rx - 61) * math.cos(t), cy + (ry - 61) * math.sin(t), 10.5)
    # isen sawut: 89 short chased strokes inside the inner groove (a Fibonacci count)
    for i in range(89):
        t = math.pi / 2 + gap + i * (2 * math.pi - 2 * gap) / 88
        r1x, r1y, r2x, r2y = rx - 104, ry - 104, rx - 124, ry - 124
        a.line([(cx + r1x * math.cos(t), cy + r1y * math.sin(t)), (cx + r2x * math.cos(t), cy + r2y * math.sin(t))], "gold-deep", 2.2, amp=0, k=1)

def eyelets(a, cx, top):
    for side in (-1, 1):
        x = cx + side * 34
        ring = ellipse_pts(x, top, 22, 22, 0, 2 * math.pi, 40)
        a.line(ring, "gold", 13, amp=0, k=1)
        a.line(ellipse_pts(x, top, 22, 22, math.pi * 0.9, math.pi * 1.6, 16), "gold-light", 4, amp=0, k=1)

def sopa(a, cx, y):
    for i in range(5):
        ang = math.pi / 2 + (i - 2) * 0.24
        bead(a, cx + 120 * math.cos(ang), y - 60 + 120 * math.sin(ang) * 0.6, 11)
    for side in (-1, 1):
        filigree_spiral(a, cx + side * 78, y + 10, 44, 1.6, -side, 0 if side > 0 else math.pi, 7)

def engraved_rose(a, cx, cy, R):
    """The Bomba rose as repousse metal: Fibonacci petal rings, chased veins, a bead heart."""
    from draw import petal, GA
    rings = (13, 8, 5)
    for k, n in enumerate(rings):
        outer = R * (1 - 0.24 * k); L = R * (0.5 - 0.06 * k); base = outer - L
        W = math.pi * (base + L * 0.7) / n * 1.08
        for i in range(n):
            ang = k * GA + i * 2 * math.pi / n
            p = [(x, y - base) for x, y in petal(L, W)]
            a.shape(xform(p, cx, cy, ang), "gold", amp=0, k=1, stroke="line", sw=3.5)
            a.line(xform([(0, -base - L * 0.15), (0, -base - L * 0.8)], cx, cy, ang), "gold-deep", 2.2, amp=0, k=1)
            a.line(xform([(-W * 0.55, -base - L * 0.72), (-W * 0.2, -base - L * 0.9)], cx, cy, ang), "gold-light", 2, amp=0, k=1)
    bead(a, cx, cy, R * 0.16)

def emblem(variant, seed):
    a = Art(1000, 1200, seed)
    cx, cy = 500, 690
    eyelets(a, cx, cy - (290 if variant == "taiganja" else 300))
    for side in (-1, 1):
        horn(a, cx, cy, side)
        pincer(a, cx, cy, side)
    if variant == "taiganja":
        tubu(a, cx, cy, 230, 262, 64, cy - 52, 30)
        # hole shadow ring for depth
        a.line(ellipse_pts(cx, cy - 52, 70, 70, math.pi * 0.1, math.pi * 0.95, 20), "gold-deep", 6, amp=0, k=1)
    else:  # bloom: wider opening holding the rose; the slit continues as a stem with three leaves
        tubu(a, cx, cy, 240, 272, 112, cy - 40, 40)
        a.line(ellipse_pts(cx, cy - 40, 118, 118, 0, 2 * math.pi, 60), "gold-deep", 5, amp=0, k=1)
        engraved_rose(a, cx, cy - 40, 100)
        stem = [(cx, cy + 70), (cx - 3, cy + 180), (cx + 4, cy + 300), (cx, cy + 410)]
        a.line(stem, "gold", 18, amp=0.8)
        a.line([(x - 4, y) for x, y in stem], "gold-light", 4, amp=0.5)
        from draw import leaf
        for (x, y, ang, L, W) in ((cx - 2, cy + 300, -60, 170, 56), (cx + 3, cy + 360, 60, 170, 56), (cx, cy + 410, 180, 100, 36)):
            p = xform(leaf(L, W), x, y, math.radians(ang))
            a.shape(p, "gold", amp=0.5, k=2, stroke="line", sw=4)
            a.line(xform([(0, -L * 0.08), (0, -L * 0.9)], x, y, math.radians(ang)), "gold-deep", 3, amp=0, k=1)
            for j in range(4):
                t = 0.25 + j * 0.17
                for sx in (-1, 1):
                    a.line(xform([(0, -L * t), (sx * W * 0.45 * math.sin(math.pi * t), -L * (t + 0.1))], x, y, math.radians(ang)), "gold-deep", 1.8, amp=0, k=1)
    if variant == "taiganja":
        sopa(a, cx, cy + 330)
    return a

if __name__ == "__main__":
    os.makedirs("engraved_out", exist_ok=True)
    for variant, title, seed in (("taiganja", "Ntina Taiganja (engraved)", 81), ("bloom", "Ntina Bloom Within (engraved)", 82)):
        a = emblem(variant, seed)
        for metal in METALS:
            open(f"engraved_out/ntina-{variant}--{metal}.svg", "w").write(a.svg(metal, title, f"Ntina signature · {title} · {metal} on black · taiganja-inspired original · draft"))
    print("ok")
