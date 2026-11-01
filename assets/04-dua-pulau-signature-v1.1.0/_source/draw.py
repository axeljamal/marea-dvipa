"""Dua Pulau signature motifs — drawn procedurally with a hand-made wobble.
Deterministic: every motif is built from a fixed seed, so it reproduces exactly."""
import math, random, json, os

PHI = (1 + 5 ** 0.5) / 2
GA = math.pi * (3 - 5 ** 0.5)

# Colourways map tokens -> hex. Tokens are shared with the master palette where they overlap.
COLOURWAYS = {
    "dua-pulau": {  # navy + gold + pearl: Bali master palette meeting Bomba gold
        "gold": "#C39B65", "gold-light": "#D1B285", "gold-deep": "#A78960",
        "navy": "#1E4157", "navy-deep": "#02213D", "teal": "#527582", "pearl": "#FAF7F2", "line": "#02213D",
    },
    "buya-bomba": {  # gold on black, after the two-colour Donggala buya bomba
        "gold": "#C9A35A", "gold-light": "#E0C27E", "gold-deep": "#9C7A3C",
        "navy": "#1A1712", "navy-deep": "#0E0C09", "teal": "#6E5A33", "pearl": "#F3E3B5", "line": "#0E0C09",
    },
}


class Wobble:
    """Smooth, seeded hand tremor: a sum of a few sines with random phase."""
    def __init__(self, seed, amp):
        r = random.Random(seed)
        self.terms = [(r.uniform(0.6, 2.6), r.uniform(0, 6.283), r.uniform(0.4, 1.0)) for _ in range(4)]
        self.amp = amp

    def __call__(self, t):
        return self.amp * sum(a * math.sin(f * t * 6.283 + p) for f, p, a in self.terms) / 2.2


def catmull(pts, closed=True):
    n = len(pts)
    if n < 3:
        return ""
    f = lambda v: f"{v:.1f}"
    d = f"M{f(pts[0][0])} {f(pts[0][1])}"
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if closed else pts[max(i - 1, 0)]
        p1 = pts[i]
        p2 = pts[(i + 1) % n] if closed else pts[i + 1]
        p3 = pts[(i + 2) % n] if closed else pts[min(i + 2, n - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}"
    return d + ("Z" if closed else "")


def resample(pts, k=6, closed=True):
    """Insert k points per segment so the wobble has somewhere to live."""
    out, n = [], len(pts)
    segs = n if closed else n - 1
    for i in range(segs):
        a, b = pts[i], pts[(i + 1) % n]
        for j in range(k):
            t = j / k
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    if not closed:
        out.append(pts[-1])
    return out


def wobble_pts(pts, seed, amp, closed=True):
    w1, w2 = Wobble(seed, amp), Wobble(seed + 99, amp)
    n = len(pts)
    return [(x + w1(i / n), y + w2(i / n)) for i, (x, y) in enumerate(pts)]


def xform(pts, cx, cy, ang, s=1.0):
    c, sn = math.cos(ang), math.sin(ang)
    return [(cx + (x * c - y * sn) * s, cy + (x * sn + y * c) * s) for x, y in pts]


class Art:
    def __init__(self, w, h, seed):
        self.w, self.h, self.seed, self.items, self.n = w, h, seed, [], 0

    def nxt(self):
        self.n += 1
        return self.seed * 1000 + self.n

    def shape(self, pts, tok, amp=2.0, closed=True, k=5, stroke=None, sw=0):
        p = wobble_pts(resample(pts, k, closed), self.nxt(), amp, closed) if amp else pts
        self.items.append(("path", catmull(p, closed), tok, stroke, sw))

    def line(self, pts, tok, sw, amp=1.5, k=5):
        p = wobble_pts(resample(pts, k, False), self.nxt(), amp, False) if amp else pts
        self.items.append(("line", catmull(p, False), None, tok, sw))

    def dot(self, x, y, r, tok):
        r2 = r * (1 + 0.12 * math.sin(self.nxt()))
        self.items.append(("dot", (x, y, r2), tok, None, 0))

    def svg(self, cw, title, desc):
        C = COLOURWAYS[cw]
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" role="img" aria-label="{title}">',
               f"  <title>{title}</title>", f"  <desc>{desc}</desc>"]
        for kind, d, fill, stroke, sw in self.items:
            if kind == "dot":
                x, y, r = d
                out.append(f'  <circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{C[fill]}" data-ink="{fill}"/>')
            elif kind == "line":
                out.append(f'  <path d="{d}" fill="none" stroke="{C[stroke]}" stroke-width="{sw:.1f}" stroke-linecap="round" stroke-linejoin="round" data-ink="{stroke}"/>')
            else:
                st = f' stroke="{C[stroke]}" stroke-width="{sw:.1f}" stroke-linejoin="round"' if stroke else ""
                out.append(f'  <path d="{d}" fill="{C[fill]}" data-ink="{fill}"{st}/>')
        out.append("</svg>")
        return "\n".join(out) + "\n"


# ---------- shapes ----------
def petal(L, W, notch=0.06):
    """Rose petal seen from above: a rounded fan with a soft scalloped lip. Base at origin, tip at -L."""
    pts = [(0, 0)]
    n = 9
    for i in range(1, n):  # left flank
        t = i / n
        pts.append((-W * math.sin(t * math.pi / 2) ** 0.7 * (0.55 + 0.45 * t), -L * 0.78 * t ** 1.1))
    for i in range(0, 13):  # scalloped lip from left to right
        u = -1 + 2 * i / 12
        lip = -L * (0.8 + 0.2 * math.cos(u * math.pi / 2)) + L * notch * (1 - abs(math.cos(u * math.pi)))
        pts.append((W * u, lip))
    for i in range(n - 1, 0, -1):  # right flank
        t = i / n
        pts.append((W * math.sin(t * math.pi / 2) ** 0.7 * (0.55 + 0.45 * t), -L * 0.78 * t ** 1.1))
    return pts


def leaf(L, W, serr=0):
    """Almond leaf pointing up from origin, optional serrated edge."""
    pts = []
    n = 14
    for i in range(n + 1):
        t = i / n
        y = -L * t
        x = -W * math.sin(math.pi * t) ** 0.85 * (1 - 0.15 * t)
        if serr and 0.1 < t < 0.9 and i % 2:
            x -= serr
        pts.append((x, y))
    for i in range(n - 1, 0, -1):
        t = i / n
        y = -L * t
        x = W * math.sin(math.pi * t) ** 0.85 * (1 - 0.15 * t)
        if serr and 0.1 < t < 0.9 and i % 2:
            x += serr
        pts.append((x, y))
    return pts


def rose(a, cx, cy, R, rings=(13, 8, 5, 3), spiral=True):
    """Bomba rose from above: petal rings in Fibonacci counts, each ring turned by the golden angle,
    every petal painted in two tones like a brushed batik petal, with a cecek vein."""
    body = ["gold", "gold", "gold-deep", "gold-deep", "gold"]
    glow = ["gold-light", "gold-light", "gold", "gold", "gold-light"]
    nr = len(rings)
    for k, n in enumerate(rings):
        outer = R * (1 - 0.19 * k)
        L = R * (0.46 - 0.05 * k)
        base = outer - L
        W = math.pi * (base + L * 0.7) / n * 1.08
        off = k * GA
        for i in range(n):
            ang = off + i * 2 * math.pi / n
            p = [(x, y - base) for x, y in petal(L, W)]
            a.shape(xform(p, cx, cy, ang), body[k % 5], amp=0, stroke="line", sw=R * 0.009, k=1)
            hi = [(x * 0.62, y * 0.62 - base - L * 0.24) for x, y in petal(L, W, 0.0)]
            a.shape(xform(hi, cx, cy, ang), glow[k % 5], amp=R * 0.002, k=1)
            if k < nr - 1:
                for j in range(3):
                    t = 0.3 + j * 0.2
                    px, py = xform([(0, -base - L * t)], cx, cy, ang)[0]
                    a.dot(px, py, R * 0.0105 * (1.25 - j * 0.18), "navy")
    rc = R * (1 - 0.19 * nr) * 0.95
    a.dot(cx, cy, rc, "navy")
    pts = []
    b = math.log(PHI) / (math.pi / 2)
    for i in range(90):
        th = i * 0.14
        r = rc * 0.06 * math.exp(b * th)
        if r > rc * 0.86:
            break
        pts.append((cx + r * math.cos(th + 1.0), cy + r * math.sin(th + 1.0)))
    a.line(pts, "gold-light", rc * 0.12, amp=0)
    a.dot(cx, cy, rc * 0.12, "pearl")


def leaf_at(a, x, y, ang, L, W, tok="teal", dots=True):
    a.shape(xform(leaf(L, W, serr=W * 0.035), x, y, ang), tok, amp=L * 0.004, stroke="line", sw=L * 0.012, k=2)
    a.line(xform([(0, -L * 0.05), (0, -L * 0.5), (0, -L * 0.9)], x, y, ang), "navy-deep", L * 0.02, amp=L * 0.004)
    if dots:
        for j in range(5):
            t = 0.2 + j * 0.15
            side = W * 0.38 * math.sin(math.pi * t)
            for sx in (-1, 1):
                px, py = xform([(sx * side, -L * t)], x, y, ang)[0]
                a.dot(px, py, L * 0.016, "gold-light")


# ---------- motifs ----------
def m_bomba_rose(seed=11):
    """Mawar bomba: the rose drawn from above with one stem and three leaves (after the buya bomba convention)."""
    a = Art(1000, 1400, seed)
    cx, cy, R = 500, 450, 360
    stem = [(500, 760), (488, 880), (506, 1000), (496, 1120), (502, 1230)]
    a.line(stem, "navy", 30, amp=2.5)
    leaf_at(a, 492, 930, math.radians(-62), 340, 110)
    leaf_at(a, 504, 1060, math.radians(62), 340, 110)
    leaf_at(a, 500, 1205, math.radians(180), 230, 80)
    rose(a, cx, cy, R)
    return a


def m_bomba_rosette(seed=12):
    a = Art(1000, 1000, seed)
    rose(a, 500, 500, 440, rings=(21, 13, 8, 5, 3))
    return a


def rebung_shoot(a, cx, by, w, h, up=True, tok="gold"):
    s = -1 if up else 1
    tip = (cx, by + s * h)
    left = [(cx - w / 2, by), (cx - w * 0.36, by + s * h * 0.4), (cx - w * 0.12, by + s * h * 0.82), tip,
            (cx + w * 0.12, by + s * h * 0.82), (cx + w * 0.36, by + s * h * 0.4), (cx + w / 2, by)]
    a.shape(left, tok, amp=w * 0.008, k=4, stroke="line", sw=w * 0.02)
    # nested chevrons of the shoot's sheaths
    for j, f in enumerate((0.25, 0.48, 0.7)):
        yy = by + s * h * f
        ww = w * 0.5 * (1 - f) * 0.92
        a.line([(cx - ww, yy - s * h * 0.06), (cx, yy + s * h * 0.06), (cx + ww, yy - s * h * 0.06)], "navy-deep", w * 0.03, amp=w * 0.004, k=3)
    a.dot(cx, by + s * h * 0.12, w * 0.035, "pearl")


def m_rebung_border(seed=21, n=8):
    """Two rows of bamboo shoots pointing inward to a dotted zigzag spine (seamless horizontally)."""
    W, H = 160 * n, 420
    a = Art(W, H, seed)
    mid = H / 2
    a.shape([(0, 0), (W, 0), (W, 34), (0, 34)], "navy", amp=0)
    a.shape([(0, H - 34), (W, H - 34), (W, H), (0, H)], "navy", amp=0)
    for i in range(n):
        cx = 80 + i * 160
        rebung_shoot(a, cx, 34, 140, 150, up=False)
    for i in range(n + 1):  # bottom row sits on the half-step; shoots at both edges are cut by the frame, so it tiles seamlessly
        rebung_shoot(a, i * 160, H - 34, 140, 150, up=True)
    zz = []
    for i in range(2 * n + 1):
        zz.append((i * 80, mid + (-14 if i % 2 else 14)))
    a.line(zz, "gold-light", 7, amp=1.2, k=3)
    for i in range(4 * n):
        a.dot(20 + i * 40, mid + (22 if i % 2 else -22), 5, "pearl")
    return a


def m_ketupat_tile(seed=31):
    """Seamless belah ketupat lattice tile with cecek corners."""
    S = 400
    a = Art(S, S, seed)
    def diamond(cx, cy, r, tok, stroke=True):
        a.shape([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], tok, amp=r * 0.012, k=4,
                stroke="line" if stroke else None, sw=r * 0.03)
    for cx, cy in [(200, 200), (0, 0), (400, 0), (0, 400), (400, 400)]:
        diamond(cx, cy, 150, "gold")
        diamond(cx, cy, 98, "navy")
        diamond(cx, cy, 52, "gold-light")
        a.dot(cx, cy, 13, "navy-deep")
    for cx, cy in [(200, 0), (0, 200), (400, 200), (200, 400)]:
        for dx, dy in [(0, -22), (22, 0), (0, 22), (-22, 0)]:
            a.dot(cx + dx, cy + dy, 7, "pearl")
        a.dot(cx, cy, 9, "gold-deep")
    return a


def m_clove_sprig(seed=41):
    """Cengkeh: a fan of five clove buds (a Fibonacci number) on curving stalks, two leaves."""
    a = Art(1000, 1150, seed)
    leaf_at(a, 488, 900, math.radians(-64), 360, 118, tok="navy")
    leaf_at(a, 512, 820, math.radians(60), 330, 108, tok="teal")
    a.line([(500, 1120), (496, 960), (504, 780), (500, 600)], "navy", 30, amp=2)
    for i in range(5):
        ang = math.radians(-56 + i * 28)
        L = 330 - abs(i - 2) * 30
        ex, ey = 500 + L * math.sin(ang), 600 - L * math.cos(ang)
        mid = (500 + L * 0.5 * math.sin(ang * 0.6), 600 - L * 0.55 * math.cos(ang * 0.6))
        a.line([(500, 600), mid, (ex, ey)], "gold-deep", 14, amp=1.2)
        st = xform([(-24, 10), (-15, -110), (15, -110), (24, 10)], ex, ey, ang)
        a.shape(st, "gold", amp=1.0, k=3, stroke="line", sw=4)
        a.line(xform([(0, -6), (0, -100)], ex, ey, ang), "gold-deep", 4, amp=0.5)
        hx, hy = xform([(0, -130)], ex, ey, ang)[0]
        for q in range(4):
            qa = q * math.pi / 2 + math.pi / 4 + ang
            a.shape(xform(petal(44, 26, 0.0), hx, hy, qa), "navy", amp=0, k=1, stroke="line", sw=3)
        a.dot(hx, hy, 24, "gold-light")
        a.dot(hx, hy, 8, "pearl")
    return a


def m_medallion(seed=51):
    """Dua Pulau medallion: Bomba rose at the heart, 13 rebung rays, a cecek ring, 21 outer petals."""
    a = Art(1200, 1200, seed)
    cx = cy = 600
    for i in range(21):
        ang = i * 2 * math.pi / 21 + GA / 21
        p = [(x, y - 462) for x, y in leaf(120, 44)]
        a.shape(xform(p, cx, cy, ang), "teal" if i % 2 else "navy", amp=1.2, k=2, stroke="line", sw=4)
        a.line(xform([(0, -470), (0, -560)], cx, cy, ang), "gold-light", 4, amp=0.4)
        px, py = xform([(0, -520)], cx, cy, ang)[0]
        a.dot(px, py, 9, "gold-light")
    for i in range(55):  # cecek ring, 55 dots
        ang = i * 2 * math.pi / 55
        a.dot(cx + 438 * math.cos(ang), cy + 438 * math.sin(ang), 8, "gold-light")
    for i in range(13):
        ang = i * 2 * math.pi / 13
        sh = Art(1, 1, seed)
        sh.n = a.n
        # rebung ray, base on a 250 ring, tip pointing outward
        base = [(x, y) for x, y in [(-48, 0), (-34, -60), (-12, -130), (0, -165), (12, -130), (34, -60), (48, 0)]]
        a.shape(xform([(x, y - 250) for x, y in base], cx, cy, ang), "gold", amp=1.4, k=4, stroke="line", sw=4)
        for f in (0.3, 0.6):
            yy = -250 - 165 * f
            ww = 48 * (1 - f) * 0.8
            a.line(xform([(-ww, yy + 10), (0, yy - 6), (ww, yy + 10)], cx, cy, ang), "navy-deep", 5, amp=0.6, k=3)
    a.shape([(cx + 262 * math.cos(t * 2 * math.pi / 60), cy + 262 * math.sin(t * 2 * math.pi / 60)) for t in range(60)], "navy", amp=2, k=1)
    rose(a, cx, cy, 235)
    return a


def isen_tile(kind, seed=61):
    """Seamless isen-isen fill tiles, transparent ground."""
    S = 240
    a = Art(S, S, seed)
    r = random.Random(seed)
    if kind == "cecek":  # dots on a staggered grid, gently jittered; jitter computed once and wrapped
        pts = []
        for j in range(8):
            for i in range(8):
                x = (i + (0.5 if j % 2 else 0)) * 30 + r.uniform(-3, 3)
                y = j * 30 + r.uniform(-3, 3)
                rad = r.uniform(2.6, 4.2)
                pts.append((x % S, y % S, rad))
        for x, y, rad in pts:
            for dx in (-S, 0, S):
                for dy in (-S, 0, S):
                    X, Y = x + dx, y + dy
                    if -6 < X < S + 6 and -6 < Y < S + 6:
                        a.items.append(("dot", (X, Y, rad), "gold", None, 0))
    elif kind == "zigzag":  # bomba zigzag bands with a periodic tremor
        for j in range(6):
            y0 = 20 + j * 40
            pts = []
            for i in range(25):
                x = i * 10
                wob = 1.6 * math.sin(2 * math.pi * x / S * 3 + j) + 1.0 * math.sin(2 * math.pi * x / S * 5 + 2 * j)
                pts.append((x, y0 + (8 if i % 2 else -8) + wob))
            d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
            a.items.append(("line", d, None, "gold", 3.2))
    elif kind == "sero":  # fine parallel strokes after the sero tangga fish trap, in staggered blocks
        for bj in range(4):
            for bi in range(4):
                horiz = (bi + bj) % 2 == 0
                x0, y0 = bi * 60, bj * 60
                for k in range(5):
                    o = 10 + k * 10 + r.uniform(-1.2, 1.2)
                    if horiz:
                        d = f"M{x0 + 8:.1f} {y0 + o:.1f} L{x0 + 52:.1f} {y0 + o + r.uniform(-1, 1):.1f}"
                    else:
                        d = f"M{x0 + o:.1f} {y0 + 8:.1f} L{x0 + o + r.uniform(-1, 1):.1f} {y0 + 52:.1f}"
                    a.items.append(("line", d, None, "gold", 2.6))
    return a


MOTIFS = {
    "bomba-rose": (m_bomba_rose, "Bomba Rose", True),
    "bomba-rosette": (m_bomba_rosette, "Bomba Rosette", True),
    "rebung-border": (m_rebung_border, "Rebung Border", False),
    "ketupat-lattice": (m_ketupat_tile, "Ketupat Lattice", True),
    "cengkeh-sprig": (m_clove_sprig, "Cengkeh Sprig", True),
    "dua-pulau-medallion": (m_medallion, "Dua Pulau Medallion", True),
}
ISEN = {"isen-cecek": "cecek", "isen-zigzag": "zigzag", "isen-sero": "sero"}

if __name__ == "__main__":
    os.makedirs("out", exist_ok=True)
    meta = {}
    for slug, (fn, title, tile) in MOTIFS.items():
        a = fn()
        for cw in COLOURWAYS:
            open(f"out/{slug}--{cw}.svg", "w").write(a.svg(cw, title, f"Dua Pulau signature · {title} · {cw} colourway · v1.0.0 · LOCKED"))
        meta[slug] = {"title": title, "w": a.w, "h": a.h, "seed": a.seed}
    for slug, kind in ISEN.items():
        a = isen_tile(kind)
        for cw in COLOURWAYS:
            open(f"out/{slug}--{cw}.svg", "w").write(a.svg(cw, slug, f"Dua Pulau isen-isen fill tile · {kind} · {cw} · seamless"))
        meta[slug] = {"title": "Isen " + kind.capitalize(), "w": a.w, "h": a.h, "seed": a.seed, "tile": True}
    json.dump(meta, open("out/meta.json", "w"), indent=1)
    print("ok", len(meta))
