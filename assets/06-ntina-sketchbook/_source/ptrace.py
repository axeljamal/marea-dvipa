"""Minimal ctypes binding to libpotrace: binary mask -> SVG path data."""
import ctypes as C
import numpy as np

lib = C.CDLL("libpotrace.so.0")
WORD_BITS = 64


class DPoint(C.Structure):
    _fields_ = [("x", C.c_double), ("y", C.c_double)]


class Curve(C.Structure):
    _fields_ = [("n", C.c_int), ("tag", C.POINTER(C.c_int)), ("c", C.POINTER(DPoint * 3))]


class Path(C.Structure):
    pass


Path._fields_ = [("area", C.c_int), ("sign", C.c_int), ("curve", Curve),
                 ("next", C.POINTER(Path)), ("childlist", C.POINTER(Path)),
                 ("sibling", C.POINTER(Path)), ("priv", C.c_void_p)]


class Progress(C.Structure):
    _fields_ = [("callback", C.c_void_p), ("data", C.c_void_p),
                ("min", C.c_double), ("max", C.c_double), ("epsilon", C.c_double)]


class Param(C.Structure):
    _fields_ = [("turdsize", C.c_int), ("turnpolicy", C.c_int), ("alphamax", C.c_double),
                ("opticurve", C.c_int), ("opttolerance", C.c_double), ("progress", Progress)]


class Bitmap(C.Structure):
    _fields_ = [("w", C.c_int), ("h", C.c_int), ("dy", C.c_int), ("map", C.POINTER(C.c_ulong))]


class State(C.Structure):
    _fields_ = [("status", C.c_int), ("plist", C.POINTER(Path)), ("priv", C.c_void_p)]


lib.potrace_param_default.restype = C.POINTER(Param)
lib.potrace_trace.restype = C.POINTER(State)
lib.potrace_trace.argtypes = [C.POINTER(Param), C.POINTER(Bitmap)]
lib.potrace_state_free.argtypes = [C.POINTER(State)]
lib.potrace_param_free.argtypes = [C.POINTER(Param)]


def trace(mask, turdsize=6, alphamax=1.0, opttolerance=0.2, scale=1.0, ndigits=2):
    """mask: 2D bool array, True = ink. Returns SVG path 'd' (y-down coords)."""
    h, w = mask.shape
    words = (w + WORD_BITS - 1) // WORD_BITS
    padded = np.zeros((h, words * WORD_BITS), dtype=np.uint8)
    padded[:, :w] = mask
    # potrace row 0 is the bottom row
    padded = padded[::-1]
    packed = np.packbits(padded, axis=1, bitorder="big")  # bytes, MSB first
    arr = packed.reshape(h, words, 8)
    vals = np.zeros((h, words), dtype=np.uint64)
    for b in range(8):
        vals = (vals << np.uint64(8)) | arr[:, :, b].astype(np.uint64)
    buf = np.ascontiguousarray(vals.reshape(-1))
    bm = Bitmap(w, h, words, buf.ctypes.data_as(C.POINTER(C.c_ulong)))
    p = lib.potrace_param_default()
    p.contents.turdsize = turdsize
    p.contents.alphamax = alphamax
    p.contents.opttolerance = opttolerance
    st = lib.potrace_trace(p, C.byref(bm))
    if not st or st.contents.status != 0:
        raise RuntimeError("potrace failed")
    f = lambda v: f"{v:.{ndigits}f}".rstrip("0").rstrip(".")
    pt = lambda q: f"{f(q.x*scale)} {f((h-q.y)*scale)}"
    out = []
    node = st.contents.plist
    while node:
        cv = node.contents.curve
        n = cv.n
        start = cv.c[n - 1][2]
        seg = [f"M{pt(start)}"]
        for i in range(n):
            c = cv.c[i]
            if cv.tag[i] == 1:  # curveto
                seg.append(f"C{pt(c[0])} {pt(c[1])} {pt(c[2])}")
            else:  # corner
                seg.append(f"L{pt(c[1])} {pt(c[2])}")
        seg.append("Z")
        out.append("".join(seg))
        node = node.contents.next
    lib.potrace_state_free(st)
    lib.potrace_param_free(p)
    return "".join(out)
