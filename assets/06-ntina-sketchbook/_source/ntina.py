"""Ntina — taiganja-inspired emblems (three directions). Original drawings; seeded, reproducible."""
import math, os, json
from draw import Art, COLOURWAYS, xform, rose, rebung_shoot, leaf_at, petal, PHI, GA

def keyhole(cx, cy, rx, ry, hole_r, hole_cy, slit_w, n=120):
    """Open oval (tubu): outer oval with a central hole and a slit to the bottom edge, as one outline."""
    half = slit_w / 2
    # outer oval, starting at the right side of the slit (bottom) and going round anticlockwise on screen
    a0 = math.pi / 2 - math.asin(half / rx)  # angle where the slit meets the oval bottom (y down)
    a1 = math.pi / 2 + math.asin(half / rx)
    pts = []
    for i in range(n + 1):
        a = a0 - i * (2 * math.pi - (a1 - a0)) / n
        pts.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
    # up the left edge of the slit to the hole
    hb = hole_cy + math.sqrt(max(hole_r ** 2 - half ** 2, 0))
    pts.append((cx - half, hb))
    # round the hole the other way (clockwise), from bottom-left to bottom-right
    b0 = math.pi / 2 + math.asin(half / hole_r)
    b1 = math.pi / 2 - math.asin(half / hole_r) + 2 * math.pi
    m = 60
    for i in range(1, m):
        b = b0 + i * (b1 - b0) / m
        pts.append((cx + hole_r * math.cos(b), hole_cy + hole_r * math.sin(b)))
    pts.append((cx + half, hb))
    return pts

def spiral_scroll(a, cx, cy, r0, turns, side, tok, sw, start=0.0):
    b = math.log(PHI) / (math.pi / 2)
    pts, th = [], 0.0
    while th < turns * 2 * math.pi:
        r = r0 * math.exp(-b * th)
        ang = start + side * th
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
        th += 0.08
    a.line(pts, tok, sw, amp=0.6, k=1)
    return pts

def granules(a, pts_fn, count, r, tok):
    for i in range(count):
        x, y = pts_fn(i / count)
        a.dot(x, y, r, tok)

# ---------- A: Taiganja Ntina (faithful structure, our articulation) ----------
def horn(side, cx, cy):
    """Buffalo horn springing from the tubu shoulder, sweeping up and out to a fine tip."""
    base_o, base_i = (cx + side * 205, cy - 150), (cx + side * 120, cy - 235)
    outer, inner = [], []
    for i in range(25):
        t = i / 24
        # outer edge: wide arc outward then up
        ox = cx + side * (205 + 175 * math.sin(t * math.pi * 0.62))
        oy = cy - 150 - 300 * t ** 1.15
        ix = cx + side * (120 + 190 * math.sin(t * math.pi * 0.55) * t ** 0.6)
        iy = cy - 235 - 215 * t ** 1.05
        outer.append((ox, oy)); inner.append((ix, iy))
    tip = (cx + side * 300, cy - 470)
    return outer + [tip] + inner[::-1]

def ntina_crown(seed=71):
    a = Art(1000, 1150, seed)
    cx, cy = 500, 690
    for side in (-1, 1):
        a.shape(horn(side, cx, cy), "gold", amp=1.2, k=1, stroke="line", sw=6)
        # highlight groove along each horn
        a.line([(cx + side * (170 + 120 * t), cy - 200 - 230 * t) for t in [0, 0.25, 0.5, 0.75, 1.0]], "gold-light", 9, amp=0.6, k=3)
        # tali ranga: a golden-spiral volute growing out of the body's side
        a.line([(cx + side * 228, cy + 10), (cx + side * 285, cy - 10), (cx + side * 320, cy + 30)], "gold-deep", 22, amp=0.6, k=3)
        spiral_scroll(a, cx + side * 330, cy + 70, 62, 2.0, -side, "gold", 14, start=-math.pi / 2)
    # granule crown between the horns
    for i in range(5):
        a.dot(cx - 56 + i * 28, cy - 290 - 16 * math.sin(math.pi * i / 4), 11, "gold-light")
    a.dot(cx, cy - 330, 17, "pearl")
    # tubu: the open oval body, with a shadow rim and a highlight
    a.shape(keyhole(cx, cy, 230, 260, 74, cy - 40, 30), "gold", amp=1.2, k=1, stroke="line", sw=7)
    a.shape(keyhole(cx, cy, 186, 214, 104, cy - 40, 30), "gold-deep", amp=1.0, k=1)
    a.shape(keyhole(cx, cy, 150, 176, 104, cy - 40, 30), "gold-light", amp=0.8, k=1)
    granules(a, lambda t: (cx + 210 * math.cos(math.pi / 2 + 0.25 + t * (2 * math.pi - 0.5)), cy + 238 * math.sin(math.pi / 2 + 0.25 + t * (2 * math.pi - 0.5))), 34, 8, "pearl")
    # sopa: a fan of granules and two small volutes beneath the slit
    for i in range(8):
        ang = math.pi / 2 + (i - 3.5) * 0.17
        a.dot(cx + 330 * math.cos(ang), cy + 30 + 300 * math.sin(ang), 9, "gold-light")
    for side in (-1, 1):
        spiral_scroll(a, cx + side * 70, cy + 330, 42, 1.6, -side, "gold", 7, start=0 if side > 0 else math.pi)
    return a

# ---------- B: Bloom Within (taiganja holding the Bomba rose; the slit becomes the stem) ----------
def ntina_bloom(seed=72):
    a = Art(1000, 1200, seed)
    cx, cy = 500, 600
    # jonga as a crown of five rebung shoots (Fibonacci)
    for i in range(5):
        ang = -math.pi / 2 + (i - 2) * 0.32
        bx, by = cx + 246 * math.cos(ang), cy + 276 * math.sin(ang)
        pts = [(x, y - 0) for x, y in [(-34, 0), (-24, -50), (-9, -100), (0, -126), (9, -100), (24, -50), (34, 0)]]
        a.shape(xform(pts, bx, by, ang + math.pi / 2), "gold", amp=1.0, k=3, stroke="line", sw=4)
        for f in (0.3, 0.6):
            ww = 34 * (1 - f) * 0.8
            a.line(xform([(-ww, -126 * f + 8), (0, -126 * f - 6), (ww, -126 * f + 8)], bx, by, ang + math.pi / 2), "navy-deep", 4, amp=0.4, k=3)
    a.shape(keyhole(cx, cy, 250, 280, 118, cy - 30, 44), "gold", amp=1.2, k=1, stroke="line", sw=7)
    a.shape(keyhole(cx, cy, 206, 236, 140, cy - 30, 44), "navy", amp=1.0, k=1)
    granules(a, lambda t: (cx + 228 * math.cos(math.pi / 2 + 0.3 + t * (2 * math.pi - 0.6)), cy + 258 * math.sin(math.pi / 2 + 0.3 + t * (2 * math.pi - 0.6))), 55, 6.5, "gold-light")
    # the slit continues as the stem of the rose, with three leaves below the oval
    a.line([(cx, cy + 40), (cx - 4, cy + 200), (cx + 6, cy + 320), (cx, cy + 470)], "navy", 22, amp=1.5)
    leaf_at(a, cx - 2, cy + 340, math.radians(-60), 200, 66)
    leaf_at(a, cx + 4, cy + 410, math.radians(60), 200, 66)
    leaf_at(a, cx, cy + 470, math.radians(180), 120, 44)
    # the life within: a Bomba rosette held in the hole
    rose(a, cx, cy - 30, 112, rings=(13, 8, 5, 3))
    return a

# ---------- C: Open Oval Ripple (minimal: five nested open ovals in Fibonacci proportion) ----------
def ntina_ripple(seed=73):
    a = Art(1000, 1100, seed)
    cx, cy = 500, 560
    sizes = [89, 55, 34, 21, 13]
    toks = ["gold", "navy", "gold-light", "teal", "gold"]
    for i, s in enumerate(sizes):
        rx, ry = 4.6 * s, 5.3 * s
        hole = max(18, 1.25 * s)
        a.shape(keyhole(cx, cy + 40 - 40 * (i / 4), rx, ry, hole, cy - 10 - 20 * (i / 4), 20 + 4 * (4 - i)), toks[i], amp=1.0, k=1, stroke="line", sw=5)
    # granules on the channel the slits make, like water drops
    for j in range(8):
        a.dot(cx, cy + 300 + j * 26, 7 - j * 0.5, "gold-light")
    for side in (-1, 1):
        for j in range(13):
            ang = math.pi / 2 + side * (0.35 + j * 0.2)
            a.dot(cx + 460 * math.cos(ang), cy + 40 + 520 * math.sin(ang), 6, "gold-deep")
    return a

NTINA = {"ntina-crown": (ntina_crown, "Ntina Crown"), "ntina-bloom": (ntina_bloom, "Ntina Bloom Within"), "ntina-ripple": (ntina_ripple, "Ntina Ripple")}

if __name__ == "__main__":
    os.makedirs("ntina_out", exist_ok=True)
    for slug, (fn, title) in NTINA.items():
        a = fn()
        for cw in COLOURWAYS:
            open(f"ntina_out/{slug}--{cw}.svg", "w").write(a.svg(cw, title, f"Ntina · {title} · taiganja-inspired original emblem · {cw} · draft"))
    print("ok")
