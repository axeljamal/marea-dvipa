"""Ntina reproducible marks: four experimental directions, flat vector, built from masks + potrace.
Unit canvas 1000 x 1000 (D4 is a tile). Every mark is one ink (D3 adds an optional accent ink)."""
import sys, math, json, os
import numpy as np, cv2
sys.path.insert(0, "/home/claude/m2")
import ptrace

S = 4  # mask pixels per unit
PHI = (1 + 5 ** 0.5) / 2
GA = math.pi * (3 - 5 ** 0.5)

def canvas(w=1000, h=1000):
    return np.zeros((h * S, w * S), np.uint8)

def P(pts):
    return np.array([[int(round(x * S)), int(round(y * S))] for x, y in pts], np.int32)

def ellipse(m, cx, cy, rx, ry, v=1):
    cv2.ellipse(m, (int(cx * S), int(cy * S)), (int(rx * S), int(ry * S)), 0, 0, 360, v, -1, cv2.LINE_8)

def circle(m, cx, cy, r, v=1):
    cv2.circle(m, (int(cx * S), int(cy * S)), max(1, int(r * S)), v, -1, cv2.LINE_8)

def poly(m, pts, v=1):
    cv2.fillPoly(m, [P(pts)], v, cv2.LINE_8)

def stroke(m, pts, w, v=1, closed=False):
    cv2.polylines(m, [P(pts)], closed, v, max(1, int(w * S)), cv2.LINE_8)
    if not closed:  # round caps
        for x, y in (pts[0], pts[-1]):
            circle(m, x, y, w / 2, v)

def ell_pts(cx, cy, rx, ry, a0, a1, n=200):
    return [(cx + rx * math.cos(a0 + (a1 - a0) * i / n), cy + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]

def bez(p0, p1, p2, p3, n=60):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append((u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0], u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]))
    return out

def taper(center, wfun):
    n = len(center); L, R = [], []
    for i, (x, y) in enumerate(center):
        a = center[max(i - 1, 0)]; b = center[min(i + 1, n - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]; d = math.hypot(tx, ty) or 1
        nx, ny = -ty / d, tx / d; w = wfun(i / (n - 1)) / 2
        L.append((x + nx * w, y + ny * w)); R.append((x - nx * w, y - ny * w))
    return L + R[::-1]

def spiral(cx, cy, r_out, turns, side, start):
    """Golden spiral from outside in: radius shrinks by phi each quarter turn."""
    b = math.log(PHI) / (math.pi / 2); pts = []; th = 0.0
    while th <= turns * 2 * math.pi:
        r = r_out * math.exp(-b * th); a = start + side * th
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a))); th += 0.03
    return pts

def dilate(m, units):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(2 * units * S) + 1,) * 2)
    return cv2.dilate(m, k)

# ---------------- D1 CAP: the mark as a batik cap (copper-strip stamp), monoline ----------------
def d1_cap():
    m = canvas(); W = 22
    cx, cy = 500, 560
    # outer and inner contours of the open oval, both broken at the slit
    g = 0.11
    stroke(m, ell_pts(cx, cy, 300, 330, math.pi / 2 + g, math.pi * 2.5 - g), W)
    stroke(m, ell_pts(cx, cy, 225, 252, math.pi / 2 + g * 1.4, math.pi * 2.5 - g * 1.4), W)
    # slit walls joining the two contours, then the hole
    for s in (-1, 1):
        x = cx + s * 33
        stroke(m, [(x, cy + 327), (x, cy + 60)], W)
    stroke(m, ell_pts(cx, cy - 60, 100, 100, math.pi / 2 + 0.34, math.pi * 2.5 - 0.34), W)
    # 21 cecek dots between the contours (a Fibonacci count)
    for i in range(21):
        t = math.pi / 2 + 0.3 + i * (2 * math.pi - 0.6) / 20
        circle(m, cx + 262 * math.cos(t), cy + 291 * math.sin(t), 13)
    # horns as three parallel copper strips each side
    for s in (-1, 1):
        for k, off in enumerate((0, 42, 84)):
            c = bez((cx + s * (60 + off * 0.3), cy - 330 - off * 0.2), (cx + s * (150 + off), cy - 395 - off * 0.4), (cx + s * (300 + off * 0.6), cy - 380 - off), (cx + s * (360 + off * 0.3), cy - 520 - off * 0.8), 60)
            stroke(m, c, W)
    # the bomba flower in the hole: five monoline petal loops
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        loop = [(cx + 62 * math.cos(a) + 30 * math.cos(t) * math.cos(a) - 18 * math.sin(t) * math.sin(a),
                 cy - 60 + 62 * math.sin(a) + 30 * math.cos(t) * math.sin(a) + 18 * math.sin(t) * math.cos(a)) for t in np.linspace(0, 2 * math.pi, 40)]
        stroke(m, loop, 12, closed=True)
    circle(m, cx, cy - 60, 14)
    # sopa: three dots under the slit
    for i in range(3):
        circle(m, cx, cy + 380 + i * 42, 14 - i * 2)
    return {"ink": m}

# ---------------- D2 VOID: solid form, meaning carried by the cut-out ----------------
def d2_void():
    m = canvas(); cx, cy = 500, 600
    ellipse(m, cx, cy, 300, 320)
    hole = canvas(); circle(hole, cx, cy - 40, 104)
    poly(hole, [(cx - 30, cy - 40), (cx + 30, cy - 40), (cx + 30, cy + 340), (cx - 30, cy + 340)])
    m[hole > 0] = 0
    # horns: one continuous crescent, thick at the middle, sharp at the tips
    c = bez((cx - 420, cy - 520), (cx - 360, cy - 250), (cx - 120, cy - 330), (cx, cy - 330), 60)
    c += bez((cx, cy - 330), (cx + 120, cy - 330), (cx + 360, cy - 250), (cx + 420, cy - 520), 60)[1:]
    horns = canvas(); poly(horns, taper(c, lambda t: 6 + 96 * math.sin(math.pi * t) ** 1.6))
    horns[dilate(m, 26) > 0] = 0  # keep a clean gap between horns and body
    m |= horns
    # crab-claw notches: a V cut into each side of the body
    for s in (-1, 1):
        cut = canvas(); poly(cut, [(cx + s * 320, cy - 60), (cx + s * 230, cy), (cx + s * 320, cy + 60)])
        m[cut > 0] = 0
    # seed of the flower: a single dot floating in the void
    circle(m, cx, cy - 40, 30)
    return {"ink": m}

# ---------------- D3 GOLDEN CONSTRUCT: horns as golden spirals, the bomba flower as phyllotaxis ----------------
def d3_golden():
    ink = canvas(); acc = canvas(); cx, cy = 500, 590
    W = 30
    g = 0.12
    stroke(ink, ell_pts(cx, cy, 270, 300, math.pi / 2 + g, math.pi * 2.5 - g), W)
    for s in (-1, 1):
        x = cx + s * 32
        stroke(ink, [(x, cy + 297), (x, cy + 108)], W)
    stroke(ink, ell_pts(cx, cy - 30, 140, 140, math.pi / 2 + 0.23, math.pi * 2.5 - 0.23), W)
    # golden-spiral horns springing from the shoulders and curling outward and up
    for s in (-1, 1):
        ccx, ccy = cx + s * 300, cy - 400
        sx, sy = cx + s * 140, cy - 268
        start = math.atan2(sy - ccy, sx - ccx)
        r0 = math.hypot(sx - ccx, sy - ccy)
        sp = spiral(ccx, ccy, r0, 1.25, s, start)
        stroke(ink, sp, W)
    # the bomba flower: 34 dots at the golden angle inside the opening, growing outward
    for i in range(1, 35):
        r = 20 * math.sqrt(i)
        a = i * GA
        circle(acc, cx + r * math.cos(a), cy - 30 + r * math.sin(a), 5 + 7 * (i / 34))
    circle(acc, cx, cy - 30, 14)
    acc[dilate(ink, 4) > 0] = 0
    return {"ink": ink, "accent": acc}

# ---------------- D4 TILE: the mark is a pattern unit; joins grow diamonds, flowers and rivers ----------------
def d4_tile():
    m = canvas(); cx, cy = 500, 500
    ellipse(m, cx, cy, 290, 330)
    cut = canvas()
    circle(cut, cx, cy - 40, 96)
    poly(cut, [(cx - 26, 0), (cx + 26, 0), (cx + 26, 1000), (cx - 26, 1000)])  # the river runs top to bottom through every tile
    m[cut > 0] = 0
    # half diamonds on the side edges: neighbours complete them into ketupat
    for x in (0, 1000):
        d = canvas(); poly(d, [(x, cy - 170), (x + 120, cy), (x, cy + 170), (x - 120, cy)])
        inner = canvas(); poly(inner, [(x, cy - 80), (x + 56, cy), (x, cy + 80), (x - 56, cy)])
        d[inner > 0] = 0
        m |= d
    # quarter flowers at the corners: four tiles meeting make one phyllotaxis bloom
    for (x0, y0) in ((0, 0), (1000, 0), (0, 1000), (1000, 1000)):
        for i in range(1, 56):
            r = 16 * math.sqrt(i); a = i * GA
            circle(m, x0 + r * math.cos(a), y0 + r * math.sin(a), 4 + 6 * (i / 55))
        circle(m, x0, y0, 16)
    # rebung teeth along the top and bottom of the body, pointing at the river
    for s in (-1, 1):
        for k in range(3):
            x = cx + s * (80 + k * 62)
            t = canvas(); poly(t, [(x - 22, cy - 300 + k * 18), (x + 22, cy - 300 + k * 18), (x, cy - 230 + k * 18)])
            m[t > 0] = 0
    return {"ink": m}


# ---------------- D5 NTINA (synthesis): silhouette of Void, flower of Golden, horns ending in growth ----------------
def d5_ntina():
    m = canvas(); cx, cy = 500, 610
    ellipse(m, cx, cy, 290, 315)
    cut = canvas(); circle(cut, cx, cy - 46, 128)
    poly(cut, [(cx - 28, cy - 46), (cx + 28, cy - 46), (cx + 28, cy + 330), (cx - 28, cy + 330)])
    m[cut > 0] = 0
    # the bomba flower as a seed head filling the opening: 21 dots at the golden angle (no single 'eye')
    for i in range(1, 22):
        r = 24 * math.sqrt(i); a = i * GA + 0.4
        circle(m, cx + r * math.cos(a), cy - 46 + r * math.sin(a), 6 + 8 * (i / 21))
    # horns: one upswept crescent, thick over the body, fine rising tips (no curls: they read as a moustache)
    c = bez((cx - 400, cy - 600), (cx - 330, cy - 330), (cx - 120, cy - 385), (cx, cy - 385), 60)
    c += bez((cx, cy - 385), (cx + 120, cy - 385), (cx + 330, cy - 330), (cx + 400, cy - 600), 60)[1:]
    horns = canvas(); poly(horns, taper(c, lambda t: 5 + 92 * math.sin(math.pi * t) ** 1.7))
    horns[dilate(m, 24) > 0] = 0
    m |= horns
    return {"ink": m}

DIRECTIONS = {
    "d1-cap": (d1_cap, "Cap", "The mark as a batik cap: monoline copper strips, stamped in one ink."),
    "d2-void": (d2_void, "Void", "A solid form whose meaning is the cut-out: the open oval, horns and claw notches as silhouette."),
    "d3-golden": (d3_golden, "Golden Construct", "Horns become golden spirals; the Bomba flower becomes 34 dots at the golden angle inside the opening."),
    "d5-ntina": (d5_ntina, "Ntina", "Synthesis: the open-oval silhouette, a golden-angle seed head in the opening, horns that end in growth curls."),
    "d4-tile": (d4_tile, "Tile", "The mark is a pattern unit: tiled, its edges grow ketupat diamonds, corner blooms and a continuous river."),
}

def to_svg(layers, colours, w=1000, h=1000, title=""):
    paths = []
    for name in ("ink", "accent"):
        if name in layers and layers[name].any():
            d = ptrace.trace(layers[name] > 0, turdsize=8, alphamax=0.9, opttolerance=0.2, scale=1 / S)
            paths.append(f'  <path data-ink="{name}" fill="{colours[name]}" fill-rule="evenodd" d="{d}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n' + "\n".join(paths) + "\n</svg>\n")

INKS = {"bomba-black": {"ink": "#16130F", "accent": "#B8862F"}, "bomba-gold": {"ink": "#D2A852", "accent": "#F2E6CC"}}

if __name__ == "__main__":
    os.makedirs("marks_out", exist_ok=True)
    for slug, (fn, title, _) in DIRECTIONS.items():
        layers = fn()
        for ink, cols in INKS.items():
            open(f"marks_out/{slug}--{ink}.svg", "w").write(to_svg(layers, cols, title=f"Ntina {title}"))
    print("ok")
