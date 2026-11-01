"""Ntina system, round 4: primary mark (with an optical small size), line version, pattern unit.
Builds on the D5 synthesis and the lessons in the sketchbook (design-taste skill). Flat, one ink."""
import math, os, json
import numpy as np
from marks import canvas, ellipse, circle, poly, stroke, ell_pts, bez, taper, dilate, to_svg, GA, S

INKS = {"bomba-black": {"ink": "#16130F", "accent": "#B8862F"},
        "bomba-gold": {"ink": "#D2A852", "accent": "#F2E6CC"},
        "lagoon-teal": {"ink": "#2A6F74", "accent": "#D2A852"}}

def horn_center(cx, cy, k):
    """Upswept buffalo crescent drawn as one continuous elliptical U: no flat middle (moustache) and no curls."""
    pts = []
    for i in range(141):
        th = math.pi + 0.28 - i * (math.pi + 0.56) / 140   # from just past the left, through the bottom, to just past the right
        pts.append((cx + 350 * k * math.cos(th), cy - 585 * k + 190 * k * math.sin(th)))
    return pts

def mark(m, cx, cy, k=1.0, seeds=21):
    """Primary mark into mask m. k scales from the 1000-unit master. seeds: 21 (master) or 5 (small optical size)."""
    body = np.zeros_like(m)
    ellipse(body, cx, cy, 290 * k, 314 * k)               # slight vertical overshoot reads as a true oval
    cut = np.zeros_like(m)
    oy = cy - 48 * k
    circle(cut, cx, oy, 128 * k)
    # the slit widens a little as it leaves the opening: a stem rooting, not a ruler-straight cut
    poly(cut, [(cx - 24 * k, oy), (cx + 24 * k, oy), (cx + 31 * k, cy + 330 * k), (cx - 31 * k, cy + 330 * k)])
    body[cut > 0] = 0
    if seeds == 21:
        for i in range(1, 22):
            r = 24 * math.sqrt(i) * k; a = i * GA + 0.4
            circle(body, cx + r * math.cos(a), oy + r * math.sin(a), (7 + 8 * (i / 21)) * k)
    # optical small size (seeds=0): the opening stays empty; seeds read as a face below 48 px
    horns = np.zeros_like(m)
    poly(horns, taper(horn_center(cx, cy, k), lambda t: (6 + 90 * math.sin(math.pi * t) ** 1.7) * k))
    horns[dilate(body, 28 * k) > 0] = 0
    m |= body | horns

def offset(c, d):
    out = []
    for i, (x, y) in enumerate(c):
        a = c[max(i - 1, 0)]; b = c[min(i + 1, len(c) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]; n = math.hypot(tx, ty) or 1
        out.append((x - ty / n * d, y + tx / n * d))
    return out

def line_mark(m, cx, cy, k=1.0, W=20):
    """Line version: two contours, a broken opening, 13 stamped dots, horns as two separate copper strips."""
    g = 0.115; oy = cy - 48 * k; W *= k
    stroke(m, ell_pts(cx, cy, 290 * k, 314 * k, math.pi / 2 + g, math.pi * 2.5 - g), W)
    stroke(m, ell_pts(cx, cy, 214 * k, 236 * k, math.pi / 2 + g * 1.5, math.pi * 2.5 - g * 1.5), W)
    for s in (-1, 1):
        stroke(m, [(cx + s * 33 * k, cy + 312 * k), (cx + s * 33 * k, oy + 120 * k)], W)
    stroke(m, ell_pts(cx, oy, 128 * k, 128 * k, math.pi / 2 + 0.27, math.pi * 2.5 - 0.27), W)
    for i in range(13):
        t = math.pi / 2 + 0.36 + i * (2 * math.pi - 0.72) / 12
        circle(m, cx + 252 * k * math.cos(t), cy + 275 * k * math.sin(t), 12 * k)
    for i in range(1, 9):
        r = 27 * math.sqrt(i) * k; a = i * GA + 0.4
        circle(m, cx + r * math.cos(a), oy + r * math.sin(a), 11 * k)
    c = horn_center(cx, cy, k)
    for d in (-26 * k, 26 * k):
        strip = offset(c, d)[3:-3]
        stroke(m, strip, W * 0.9)

def tile():
    """Pattern unit, 1000 x 1000, seamless. The mark sits at the centre; where tiles meet, ketupat diamonds
    and golden-angle blooms appear, and a line of cecek carries each mark's stem into the horns of the mark below."""
    m = canvas(); k = 0.56; cx, cy = 500, 500
    mark(m, cx, cy, k)
    for x in (0, 1000):  # half ketupat on the side edges
        d = canvas(); poly(d, [(x, 470), (x + 92, 560), (x, 650), (x - 92, 560)])
        inner = canvas(); poly(inner, [(x, 525), (x + 36, 560), (x, 595), (x - 36, 560)])
        d[inner > 0] = 0; m |= d
    for (x0, y0) in ((0, 0), (1000, 0), (0, 1000), (1000, 1000)):  # quarter blooms complete at the corners
        circle(m, x0, y0, 20)
        for i in range(1, 22):
            r = 21 * math.sqrt(i); a = i * GA
            circle(m, x0 + r * math.cos(a), y0 + r * math.sin(a), 6 + 7 * (i / 21))
    # the stream: cecek from the stem (bottom) across the edge into the next tile's horn cradle
    for y in list(range(900, 1001, 34)) + list(range(0, 210, 34)):
        circle(m, cx, y, 9)
    return m

def render_all():
    os.makedirs("system_out", exist_ok=True)
    outs = {}
    a = canvas(); mark(a, 500, 655); outs["ntina-mark"] = a
    b = canvas(); mark(b, 500, 655, seeds=0); outs["ntina-mark-small"] = b
    c = canvas(); line_mark(c, 500, 655); outs["ntina-line"] = c
    outs["ntina-tile"] = tile()
    for slug, layer in outs.items():
        for ink, cols in INKS.items():
            open(f"system_out/{slug}--{ink}.svg", "w").write(to_svg({"ink": layer}, cols, title=f"Ntina {slug}"))
    print("ok", list(outs))

if __name__ == "__main__":
    render_all()
