import cv2, numpy as np, json, os, sys
import ptrace

SRC = cv2.imread("src.png")[:600]
LABIMG = cv2.cvtColor(SRC, cv2.COLOR_BGR2LAB).astype(np.float32)
# steepen the soft AI-blur transitions so ink edges classify cleanly
_bl = cv2.GaussianBlur(LABIMG, (0, 0), 1.6)
LABIMG = np.clip(LABIMG + 1.25 * (LABIMG - _bl), 0, 255)
COMP = np.load("lab.npy")
S = 8  # source px -> master px (fine edition)

# Locked palette, drawn bottom -> top
PALETTE = [
    ("pale-sand",    "#EAE1D2"),
    ("sand-wash",    "#D9C9B0"),
    ("stone",        "#C8CCCD"),
    ("temple-gold",  "#B39062"),
    ("mist-blue",    "#93A8B6"),
    ("steel-blue",   "#6A8699"),
    ("harbour-blue", "#46677F"),
    ("navy-ink",     "#163A5A"),
    ("deep-navy",    "#0D2740"),
]
PAPER = "#FFFFFF"


def hex2lab(h):
    rgb = np.uint8([[[int(h[5:7], 16), int(h[3:5], 16), int(h[1:3], 16)]]])  # BGR
    return cv2.cvtColor(rgb, cv2.COLOR_BGR2LAB)[0, 0].astype(np.float32)


# classification anchors (what the source ink looks like) vs locked output colours
ANCHOR = {"pale-sand": "#E9E2D6", "sand-wash": "#D9CBB4", "stone": "#C9CDCF", "temple-gold": "#BA9C76",
          "mist-blue": "#9DAFBB", "steel-blue": "#71899A", "harbour-blue": "#4B687C",
          "navy-ink": "#1C4263", "deep-navy": "#0E2C46"}
PAL_LAB = np.array([hex2lab(PAPER)] + [hex2lab(ANCHOR[n]) for n, _ in PALETTE])
W_CH = np.array([1.0, 2.0, 2.2], np.float32)  # weight hue axes so gold/stone/mist separate


LIGHT = {1, 2, 3, 5}  # sand, stone, mist: classes that appear as blend artefacts


def fix_fringe(idx, prob, band=9, thin_r=3):
    ink = (idx > 0).astype(np.uint8)
    dist = cv2.distanceTransform(ink, cv2.DIST_L2, 5)
    interior = (dist >= band)
    # nearest interior pixel's class for band pixels
    zero = (~interior).astype(np.uint8)
    dd, lbl = cv2.distanceTransformWithLabels(zero, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    iy, ix = np.where(interior)
    out = idx.copy()
    bandpx = (ink > 0) & ~interior
    if len(iy):
        cls = idx[iy, ix]
        near = cls[np.clip(lbl - 1, 0, len(cls) - 1)]
        ok = bandpx & (dd <= band * 1.8)
        out[ok] = near[ok]
    # thin strokes with no interior: darkest class nearby
    rest = bandpx & ((dd > band * 1.8) | (len(iy) == 0))
    if rest.any():
        Lrank = np.argsort(np.argsort(-PAL_LAB[:, 0]))  # paper -> 0 darkest... rank by lightness
        dark_order = np.argsort(PAL_LAB[1:, 0]) + 1     # darkest first
        k = np.ones((2 * band + 1, 2 * band + 1), np.uint8)
        for c in dark_order[::-1]:  # lightest first so darker overwrite
            present = cv2.dilate((idx == c).astype(np.uint8), k).astype(bool)
            out[rest & present] = c
    # thin light-class slivers between two inks -> neighbour class
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * thin_r + 1, 2 * thin_r + 1))
    for c in LIGHT:
        own = (out == c).astype(np.uint8)
        thin = own.astype(bool) & ~cv2.morphologyEx(own, cv2.MORPH_OPEN, disk).astype(bool)
        if thin.any():
            p2 = prob.copy(); p2[..., c] = -1; p2[..., 0] = -1
            out[thin] = p2[thin].argmax(-1)
    return out


def build(name, comps, box=None, sym=False, cut=None, pad=8, blur=2.6, min_island=220, extra_white=None):
    """comps: component ids; box: optional (x0,y0,x1,y1) clip in source px; cut: fn(mask)->mask"""
    m = np.isin(COMP, comps).astype(np.uint8)
    if box is not None:
        bx = np.zeros_like(m); x0, y0, x1, y1 = box; bx[y0:y1, x0:x1] = 1; m &= bx
    if cut is not None:
        m = cut(m)
    m = cv2.dilate(m, np.ones((3, 3), np.uint8))
    ys, xs = np.where(m)
    x0, x1 = xs.min() - pad, xs.max() + pad + 1
    y0, y1 = max(ys.min() - pad, 0), ys.max() + pad + 1
    labc = LABIMG[y0:y1, x0:x1].copy() if x0 >= 0 else None
    if labc is None:
        raise ValueError("crop off-image")
    mc = m[y0:y1, x0:x1]
    labc[mc == 0] = PAL_LAB[0]
    up = cv2.resize(labc, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
    mup = cv2.resize(mc.astype(np.float32), None, fx=S, fy=S, interpolation=cv2.INTER_LINEAR) > 0.5
    # soft assignment to palette
    d = np.stack([(((up - PAL_LAB[j]) * W_CH) ** 2).sum(-1) for j in range(len(PAL_LAB))], -1)
    d[:, :, 0] *= 0.85  # slight bias to paper so fringes drop out
    prob = np.exp(-(d - d.min(-1, keepdims=True)) / (2 * 14.0 ** 2))
    prob /= prob.sum(-1, keepdims=True)
    prob[~mup, 0] = 1.0
    prob[~mup, 1:] = 0.0
    k = int(blur * 2) * 2 + 1
    prob = np.stack([cv2.GaussianBlur(prob[:, :, i], (k, k), blur) for i in range(prob.shape[2])], -1)
    H, Wd = prob.shape[:2]
    axis = None
    if sym:
        ink = 1 - prob[:, :, 0]
        best = (-1, 0)
        c0 = Wd // 2
        for dx in range(-80, 81, 1):
            c = c0 + dx
            half = min(c, Wd - c) - 2
            a = ink[:, c - half:c]; b = ink[:, c:c + half][:, ::-1]
            s = (a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-6)
            if s > best[0]: best = (s, c)
        c = best[1]; axis = c
        half = min(c, Wd - c)
        prob = prob[:, c - half:c + half]
        prob = 0.5 * (prob + prob[:, ::-1])
        Wd = prob.shape[1]
    lab_idx = prob.argmax(-1)
    lab_idx = fix_fringe(lab_idx, prob)
    # remove tiny islands per class
    for it in range(2):
        for ci in range(len(PAL_LAB)):
            mm = (lab_idx == ci).astype(np.uint8)
            n, cl, st, _ = cv2.connectedComponentsWithStats(mm, connectivity=4)
            small = np.isin(cl, np.where(st[:, 4] < min_island)[0]) & (mm > 0)
            if small.any():
                p2 = prob.copy(); p2[small, ci] = -1
                lab_idx[small] = p2[small].argmax(-1)
    if sym:
        lab_idx = np.where(np.arange(Wd)[None, :] < Wd // 2, lab_idx, lab_idx[:, ::-1])
    ink_all = lab_idx > 0
    # trim to content
    ys, xs = np.where(ink_all)
    m2 = 32
    ty0, ty1 = max(ys.min() - m2, 0), ys.max() + m2
    tx0, tx1 = max(xs.min() - m2, 0), xs.max() + m2
    if sym:  # keep symmetric trim
        e = max(Wd // 2 - tx0, tx1 - Wd // 2); tx0, tx1 = Wd // 2 - e, Wd // 2 + e
    lab_idx = lab_idx[ty0:ty1, tx0:tx1]
    ink_all = lab_idx > 0
    H, Wd = lab_idx.shape
    layers = []
    for i, (lname, hx) in enumerate(PALETTE, start=1):
        own = (lab_idx == i)
        if own.sum() < 50:
            continue
        # tuck lower layers under the ones above to avoid seams
        above = np.isin(lab_idx, list(range(i + 1, len(PAL_LAB))))
        under = cv2.dilate(own.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & ink_all
        mask = own | (under & above)
        dpath = ptrace.trace(mask, turdsize=18, alphamax=1.0, opttolerance=0.25)
        layers.append((lname, hx, dpath, int(own.sum())))
    return dict(name=name, w=Wd, h=H, layers=layers, idx=lab_idx, sym=sym)


def svg_doc(a, title):
    g = "\n".join(f'  <path id="{n}" fill="{h}" fill-rule="evenodd" d="{d}"/>' for n, h, d, _ in a["layers"])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {a["w"]} {a["h"]}" '
            f'width="{a["w"]}" height="{a["h"]}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n{g}\n</svg>\n')
