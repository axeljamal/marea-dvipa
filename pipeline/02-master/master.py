import cv2, numpy as np
import ptrace

SHEET = cv2.imread("sheet.png")
LAB0 = cv2.cvtColor(SHEET, cv2.COLOR_BGR2LAB).astype(np.float32)
BG = np.median(LAB0[:10].reshape(-1, 3), 0)
_bl = cv2.GaussianBlur(LAB0, (0, 0), 1.2)
LABS = np.clip(LAB0 + 0.6 * (LAB0 - _bl), 0, 255)
DIST_BG = np.sqrt(((LAB0 - BG) ** 2).sum(-1))

# Locked master palette: token, output hex (sampled from the sheet), lightest -> darkest
PALETTE = [
    ("pearl",        "#FAF7F2"),
    ("ivory",        "#E5DFD4"),
    ("sand",         "#D2C7B6"),
    ("light-gold",   "#D1B285"),
    ("silver-mist",  "#A2AAAA"),
    ("temple-gold",  "#C39B65"),
    ("antique-gold", "#A78960"),
    ("mist-grey",    "#7C8B8D"),
    ("teal-blue",    "#527582"),
    ("bronze",       "#756C59"),
    ("harbour-blue", "#3F616F"),
    ("indigo-slate", "#2C5063"),
    ("navy-ink",     "#1E4157"),
    ("deep-navy",    "#0F3049"),
    ("midnight",     "#02213D"),
]


def hex2lab(h):
    bgr = np.uint8([[[int(h[5:7], 16), int(h[3:5], 16), int(h[1:3], 16)]]])
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)[0, 0].astype(np.float32)


# class 0 = sheet ground (transparent); classes 1.. = PALETTE (pearl is only assigned to enclosed ground)
INK = PALETTE[1:]
ANCH = np.array([BG] + [hex2lab(h) for _, h in INK], np.float32)
WCH = np.array([1.0, 1.8, 1.8], np.float32)
NCLS = len(ANCH)
PEARL = NCLS  # extra class index used after classification


def classify(up, mup, blur, temp=11.0):
    d = np.stack([(((up - ANCH[j]) * WCH) ** 2).sum(-1) for j in range(NCLS)], -1)
    d[..., 0] *= 0.9
    p = np.exp(-(d - d.min(-1, keepdims=True)) / (2 * temp ** 2)).astype(np.float32)
    del d
    p /= p.sum(-1, keepdims=True)
    p[~mup, 0] = 1; p[~mup, 1:] = 0
    if blur > 0:
        for i in range(NCLS):
            p[..., i] = cv2.GaussianBlur(p[..., i], (0, 0), blur)
    return p


def fix_fringe(idx, prob, band, thin_r):
    light = {i for i in range(1, NCLS) if ANCH[i][0] > 165}
    ink = (idx > 0).astype(np.uint8)
    dist = cv2.distanceTransform(ink, cv2.DIST_L2, 5)
    interior = dist >= band
    dd, lbl = cv2.distanceTransformWithLabels((~interior).astype(np.uint8), cv2.DIST_L2, 5,
                                              labelType=cv2.DIST_LABEL_PIXEL)
    iy, ix = np.where(interior)
    out = idx.copy()
    bandpx = (ink > 0) & ~interior
    if len(iy):
        near = idx[iy, ix][np.clip(lbl - 1, 0, len(iy) - 1)]
        ok = bandpx & (dd <= band * 1.8) & np.isin(idx, list(light))  # only light fringe gets replaced
        out[ok] = near[ok]
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * thin_r + 1,) * 2)
    for c in light:
        own = (out == c).astype(np.uint8)
        thin = own.astype(bool) & ~cv2.morphologyEx(own, cv2.MORPH_OPEN, disk).astype(bool)
        if thin.any():
            p2 = prob[thin].copy(); p2[:, c] = -1; p2[:, 0] = -1
            out[thin] = p2.argmax(-1)
    return out


def find_axis(ink, W):
    best = (-1, W // 2)
    for c in range(W // 2 - 60, W // 2 + 61):
        half = min(c, W - c) - 2
        a = ink[:, c - half:c]; b = ink[:, c:c + half][:, ::-1]
        s = (a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-6)
        if s > best[0]: best = (s, c)
    return best[1]


def build(box, sym=False, target=2400, max_s=8, hole_keep=500, sym_weight=0.5):
    x0, y0, x1, y1 = box
    sel = (DIST_BG[y0:y1, x0:x1] > 12).astype(np.uint8)
    n, cl, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(sel, np.ones((5, 5), np.uint8)))
    keep = np.isin(cl, [i for i in range(1, n) if st[i, 4] > 60])
    ys, xs = np.where(keep)
    pad = 6
    ax0, ay0 = max(x0 + xs.min() - pad, 0), max(y0 + ys.min() - pad, 0)
    ax1, ay1 = x0 + xs.max() + pad + 1, y0 + ys.max() + pad + 1
    mk = np.zeros(LAB0.shape[:2], np.uint8); mk[y0:y1, x0:x1] = keep
    mk = mk[ay0:ay1, ax0:ax1]
    lab = LABS[ay0:ay1, ax0:ax1].copy(); lab[mk == 0] = BG
    S = int(min(max_s, max(3, round(target / max(lab.shape[:2])))))
    up = cv2.resize(lab, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
    mup = cv2.resize(mk.astype(np.float32), None, fx=S, fy=S, interpolation=cv2.INTER_LINEAR) > 0.5
    prob = classify(up, mup, blur=0.33 * S)
    del up
    H, W = prob.shape[:2]
    if sym:
        c = find_axis(1 - prob[..., 0], W)
        half = min(c, W - c)
        prob = prob[:, c - half:c + half]
        prob = (1 - sym_weight) * prob + sym_weight * prob[:, ::-1]
        W = prob.shape[1]
    idx = prob.argmax(-1).astype(np.int32)
    idx = fix_fringe(idx, prob, band=max(3, int(0.8 * S)), thin_r=max(2, int(0.45 * S)))
    min_island = int(5 * S * S)
    for _ in range(2):
        for ci in range(NCLS):
            mm = (idx == ci).astype(np.uint8)
            nn, cc, ss, _ = cv2.connectedComponentsWithStats(mm, connectivity=4)
            small = np.isin(cc, np.where(ss[:, 4] < min_island)[0]) & (mm > 0)
            if small.any():
                p2 = prob[small].copy(); p2[:, ci] = -1
                idx[small] = p2.argmax(-1)
    del prob
    if sym:
        idx = np.where(np.arange(W)[None, :] < W // 2, idx, idx[:, ::-1])
    # enclosed ground: small holes become pearl (self-contained on any background), big ones stay open
    ground = (idx == 0).astype(np.uint8)
    nn, cc, ss, _ = cv2.connectedComponentsWithStats(ground, connectivity=4)
    border = set(np.unique(np.concatenate([cc[0], cc[-1], cc[:, 0], cc[:, -1]])))
    for i in range(1, nn):
        if i not in border and ss[i, 4] < hole_keep * S * S:
            idx[cc == i] = PEARL
    # thin cream keylines between inks (gaps <= ~4 source px) are part of the drawing -> pearl
    ink0 = (idx > 0).astype(np.uint8)
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (4 * S + 1,) * 2)
    keyline = (cv2.morphologyEx(ink0, cv2.MORPH_CLOSE, disk) > 0) & (idx == 0)
    idx[keyline] = PEARL
    ink_all = idx > 0
    ys, xs = np.where(ink_all)
    m2 = 4 * S
    ty0, ty1 = max(ys.min() - m2, 0), min(ys.max() + m2, idx.shape[0])
    tx0, tx1 = max(xs.min() - m2, 0), min(xs.max() + m2, idx.shape[1])
    if sym:
        e = max(W // 2 - tx0, tx1 - W // 2); tx0, tx1 = max(W // 2 - e, 0), min(W // 2 + e, W)
    idx = idx[ty0:ty1, tx0:tx1]
    ink_all = idx > 0
    # draw order: lightest first; map class index -> palette entry
    cls_of = {PEARL: 0}
    for k in range(1, NCLS): cls_of[k] = k  # INK[k-1] == PALETTE[k]
    order = sorted(cls_of, key=lambda k: -hex2lab(PALETTE[cls_of[k]][1])[0])
    rank = {k: r for r, k in enumerate(order)}
    rank_img = np.full(idx.shape, -1, np.int32)
    for k, r in rank.items(): rank_img[idx == k] = r
    layers = []
    k5 = np.ones((5, 5), np.uint8)
    for k in order:
        own = idx == k
        if own.sum() < 40: continue
        above = rank_img > rank[k]
        under = cv2.dilate(own.astype(np.uint8), k5).astype(bool) & ink_all & above
        d = ptrace.trace(own | under, turdsize=int(1.5 * S * S), alphamax=1.0, opttolerance=0.2)
        tok, hx = PALETTE[cls_of[k]]
        layers.append((tok, hx, d, int(own.sum())))
    return dict(w=idx.shape[1], h=idx.shape[0], S=S, layers=layers,
                src_region=dict(x=int(ax0), y=int(ay0), w=int(ax1 - ax0), h=int(ay1 - ay0)))


def svg_doc(a, slug, title, desc):
    g = "\n".join(f'  <path id="{slug}__{n}" data-ink="{n}" fill="{h}" fill-rule="evenodd" d="{d}"/>'
                  for n, h, d, _ in a["layers"])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {a["w"]} {a["h"]}" width="{a["w"]}" '
            f'height="{a["h"]}" role="img" aria-label="{title}">\n  <title>{title}</title>\n  <desc>{desc}</desc>\n{g}\n</svg>\n')
