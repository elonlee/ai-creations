"""Generate compact, manifold, beveled low-poly furniture GLBs for the static demo.

Conventions across all 32 assets:
- Local +Y is up; every asset's bounding box min Y rests cleanly at 0.000.
- Local +Z is the front face (doors, drawers, seating direction, mirror glass).
- All geometry uses closed, outward-facing CCW meshes with chamfered/beveled
  edges and world-scaled box-projected UVs so textures render cleanly.

Optional Blender pass: blender_finalize.py welds vertices and applies an
additional Blender export if bpy is available.
"""
from __future__ import annotations

import json
import math
import struct
from pathlib import Path

OUT = Path(__file__).parent / "assets" / "furniture"
OUT.mkdir(parents=True, exist_ok=True)

MATERIALS = {
    "oak": ([0.69, 0.50, 0.30, 1.0], 0.0, 0.78),
    "oak_light": ([0.83, 0.67, 0.46, 1.0], 0.0, 0.76),
    "ivory": ([0.87, 0.85, 0.79, 1.0], 0.0, 0.88),
    "sage": ([0.48, 0.55, 0.47, 1.0], 0.0, 0.86),
    "stone": ([0.69, 0.67, 0.62, 1.0], 0.0, 0.64),
    "dark": ([0.27, 0.30, 0.27, 1.0], 0.05, 0.74),
    "brass": ([0.72, 0.56, 0.30, 1.0], 0.42, 0.38),
    "white": ([0.93, 0.91, 0.85, 1.0], 0.0, 0.88),
    "mirror": ([0.86, 0.89, 0.88, 1.0], 0.92, 0.08),
    "bulb": ([0.98, 0.92, 0.74, 1.0], 0.0, 0.30),
    "steel": ([0.62, 0.64, 0.63, 1.0], 0.75, 0.32),
    "screen": ([0.14, 0.17, 0.16, 1.0], 0.42, 0.18),
}


def _rot_mat(rx: float, ry: float, rz: float):
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    # Intrinsic XYZ -> Rz * Ry * Rx
    return (
        (cy * cz, cz * sx * sy - cx * sz, cx * cz * sy + sx * sz),
        (cy * sz, cx * cz + sx * sy * sz, cx * sy * sz - cz * sx),
        (-sy, cy * sx, cx * cy),
    )


def _apply_rot(v, m):
    x, y, z = v
    return (
        m[0][0] * x + m[0][1] * y + m[0][2] * z,
        m[1][0] * x + m[1][1] * y + m[1][2] * z,
        m[2][0] * x + m[2][1] * y + m[2][2] * z,
    )


def _sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _cross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def _dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _norm(v):
    l = math.hypot(v[0], v[1], v[2])
    return (v[0] / l, v[1] / l, v[2] / l) if l > 1e-12 else (0.0, 1.0, 0.0)


def _box_uv(p, n, half_extents=None):
    if half_extents and n[2] > 0.5:
        hx, hy, _ = half_extents
        return ((p[0] + hx) / (2.0 * hx), (p[1] + hy) / (2.0 * hy))
    ax, ay, az = abs(n[0]), abs(n[1]), abs(n[2])
    if ax >= ay and ax >= az:
        return (p[2] + 0.5, p[1] + 0.5)
    if ay >= ax and ay >= az:
        return (p[0] + 0.5, p[2] + 0.5)
    return (p[0] + 0.5, p[1] + 0.5)


def _emit_poly(verts, p_idx_list, mat_map, out_pos, out_nrm, out_uv, out_idx, m_rot, center, unit_front_extents=None):
    pts = [verts[i] for i in p_idx_list]
    n_local = _norm(_cross(_sub(pts[1], pts[0]), _sub(pts[2], pts[0])))
    centroid = tuple(sum(p[k] for p in pts) / len(pts) for k in range(3))
    if _dot(n_local, centroid) < 0:
        pts = list(reversed(pts))
        n_local = (-n_local[0], -n_local[1], -n_local[2])
    n_world = _apply_rot(n_local, m_rot)
    base = len(out_pos) // 3
    for p in pts:
        pw = _apply_rot(p, m_rot)
        out_pos.extend((center[0] + pw[0], center[1] + pw[1], center[2] + pw[2]))
        out_nrm.extend(n_world)
        out_uv.extend(_box_uv(p, n_local, unit_front_extents))
    for k in range(1, len(pts) - 1):
        out_idx.extend((base, base + k, base + k + 1))


def make_bevel_box(cx, cy, cz, sx, sy, sz, mat="oak", bevel=0.008, rx=0.0, ry=0.0, rz=0.0):
    hx, hy, hz = sx / 2.0, sy / 2.0, sz / 2.0
    b = min(bevel, hx * 0.38, hy * 0.38, hz * 0.38)
    m_rot = _rot_mat(rx, ry, rz)
    center = (cx, cy, cz)
    pos, nrm, uv, idx = [], [], [], []
    unit_ext = (hx, hy, hz) if mat == "screen" else None

    if b <= 1e-5:
        verts = [(ox * hx, oy * hy, oz * hz) for ox in (-1, 1) for oy in (-1, 1) for oz in (-1, 1)]
        def vid(ox, oy, oz):
            return (0 if ox < 0 else 4) + (0 if oy < 0 else 2) + (0 if oz < 0 else 1)
        quads = [
            [vid(-1, -1, 1), vid(1, -1, 1), vid(1, 1, 1), vid(-1, 1, 1)],
            [vid(1, -1, -1), vid(-1, -1, -1), vid(-1, 1, -1), vid(1, 1, -1)],
            [vid(1, -1, 1), vid(1, -1, -1), vid(1, 1, -1), vid(1, 1, 1)],
            [vid(-1, -1, -1), vid(-1, -1, 1), vid(-1, 1, 1), vid(-1, 1, -1)],
            [vid(-1, 1, 1), vid(1, 1, 1), vid(1, 1, -1), vid(-1, 1, -1)],
            [vid(-1, -1, -1), vid(1, -1, -1), vid(1, -1, 1), vid(-1, -1, 1)],
        ]
        for q in quads:
            _emit_poly(verts, q, None, pos, nrm, uv, idx, m_rot, center, unit_ext)
        return mat, pos, nrm, uv, idx

    # 24 corner-inset vertices: 3 per octant (x-face, y-face, z-face)
    verts = []
    ix_map, iy_map, iz_map = {}, {}, {}
    for ox in (-1, 1):
        for oy in (-1, 1):
            for oz in (-1, 1):
                key = (ox, oy, oz)
                ix_map[key] = len(verts)
                verts.append((ox * hx, oy * (hy - b), oz * (hz - b)))
                iy_map[key] = len(verts)
                verts.append((ox * (hx - b), oy * hy, oz * (hz - b)))
                iz_map[key] = len(verts)
                verts.append((ox * (hx - b), oy * (hy - b), oz * hz))

    polys = []
    # 6 main faces
    for s in (-1, 1):
        polys.append([ix_map[(s, -1, -1)], ix_map[(s, -1, 1)], ix_map[(s, 1, 1)], ix_map[(s, 1, -1)]])
        polys.append([iy_map[(-1, s, -1)], iy_map[(1, s, -1)], iy_map[(1, s, 1)], iy_map[(-1, s, 1)]])
        polys.append([iz_map[(-1, -1, s)], iz_map[(1, -1, s)], iz_map[(1, 1, s)], iz_map[(-1, 1, s)]])

    # 12 edge bevel quads
    for oy in (-1, 1):
        for oz in (-1, 1):
            polys.append([iy_map[(-1, oy, oz)], iy_map[(1, oy, oz)], iz_map[(1, oy, oz)], iz_map[(-1, oy, oz)]])
    for ox in (-1, 1):
        for oz in (-1, 1):
            polys.append([ix_map[(ox, -1, oz)], ix_map[(ox, 1, oz)], iz_map[(ox, 1, oz)], iz_map[(ox, -1, oz)]])
    for ox in (-1, 1):
        for oy in (-1, 1):
            polys.append([ix_map[(ox, oy, -1)], ix_map[(ox, oy, 1)], iy_map[(ox, oy, 1)], iy_map[(ox, oy, -1)]])

    # 8 corner bevel triangles
    for ox in (-1, 1):
        for oy in (-1, 1):
            for oz in (-1, 1):
                k = (ox, oy, oz)
                polys.append([ix_map[k], iy_map[k], iz_map[k]])

    for p in polys:
        _emit_poly(verts, p, None, pos, nrm, uv, idx, m_rot, center, unit_ext)
    return mat, pos, nrm, uv, idx


def make_frustum(cx, cy, cz, r_bot_x, r_bot_z, r_top_x, r_top_z, height, mat="oak", sides=24, hollow_bottom=False, rx=0.0, ry=0.0, rz=0.0):
    m_rot = _rot_mat(rx, ry, rz)
    center = (cx, cy, cz)
    pos, nrm, uv, idx = [], [], [], []
    hy = height / 2.0

    def add_pt(p, n, u):
        pw = _apply_rot(p, m_rot)
        nw = _apply_rot(n, m_rot)
        pos.extend((center[0] + pw[0], center[1] + pw[1], center[2] + pw[2]))
        nrm.extend(nw)
        uv.extend(u)

    # Outer shell
    base_side = len(pos) // 3
    for i in range(sides + 1):
        th = i / sides * math.tau
        c, s = math.cos(th), math.sin(th)
        slope_y = (r_bot_x - r_top_x) / max(height, 1e-5)
        rn = _norm((c, slope_y, s))
        add_pt((c * r_bot_x, -hy, s * r_bot_z), rn, (i / sides, 0.0))
        add_pt((c * r_top_x, hy, s * r_top_z), rn, (i / sides, 1.0))
    for i in range(sides):
        a = base_side + i * 2
        idx.extend((a, a + 1, a + 3, a, a + 3, a + 2))

    if hollow_bottom:
        # Thin inner wall + top rim + bottom rim for open lamp shades
        thick = min(0.012, r_top_x * 0.12, r_bot_x * 0.12)
        ibx, ibz = max(0.005, r_bot_x - thick), max(0.005, r_bot_z - thick)
        itx, itz = max(0.005, r_top_x - thick), max(0.005, r_top_z - thick)
        # Inner wall (facing inward)
        base_in = len(pos) // 3
        for i in range(sides + 1):
            th = i / sides * math.tau
            c, s = math.cos(th), math.sin(th)
            rn = _norm((-c, -(r_bot_x - r_top_x) / max(height, 1e-5), -s))
            add_pt((c * ibx, -hy, s * ibz), rn, (i / sides, 0.0))
            add_pt((c * itx, hy, s * itz), rn, (i / sides, 1.0))
        for i in range(sides):
            a = base_in + i * 2
            idx.extend((a, a + 3, a + 1, a, a + 2, a + 3))
        # Top cap / rim (closed top with inner recess or flat top disc for lamp shade)
        base_top = len(pos) // 3
        add_pt((0.0, hy, 0.0), (0.0, 1.0, 0.0), (0.5, 0.5))
        for i in range(sides + 1):
            th = i / sides * math.tau
            c, s = math.cos(th), math.sin(th)
            add_pt((c * r_top_x, hy, s * r_top_z), (0.0, 1.0, 0.0), ((c + 1) * 0.5, (s + 1) * 0.5))
        for i in range(sides):
            idx.extend((base_top, base_top + i + 2, base_top + i + 1))
        # Bottom annular rim
        base_rim = len(pos) // 3
        for i in range(sides + 1):
            th = i / sides * math.tau
            c, s = math.cos(th), math.sin(th)
            add_pt((c * r_bot_x, -hy, s * r_bot_z), (0.0, -1.0, 0.0), ((c + 1) * 0.5, (s + 1) * 0.5))
            add_pt((c * ibx, -hy, s * ibz), (0.0, -1.0, 0.0), ((c + 1) * 0.5, (s + 1) * 0.5))
        for i in range(sides):
            a = base_rim + i * 2
            idx.extend((a, a + 2, a + 3, a, a + 3, a + 1))
        # Inner ceiling underside
        base_under = len(pos) // 3
        add_pt((0.0, hy - 0.004, 0.0), (0.0, -1.0, 0.0), (0.5, 0.5))
        for i in range(sides + 1):
            th = i / sides * math.tau
            c, s = math.cos(th), math.sin(th)
            add_pt((c * itx, hy - 0.004, s * itz), (0.0, -1.0, 0.0), ((c + 1) * 0.5, (s + 1) * 0.5))
        for i in range(sides):
            idx.extend((base_under, base_under + i + 1, base_under + i + 2))
    else:
        for yy, ny in ((-hy, -1.0), (hy, 1.0)):
            rx_c = r_bot_x if yy < 0 else r_top_x
            rz_c = r_bot_z if yy < 0 else r_top_z
            base_cap = len(pos) // 3
            add_pt((0.0, yy, 0.0), (0.0, ny, 0.0), (0.5, 0.5))
            for i in range(sides + 1):
                th = i / sides * math.tau
                c, s = math.cos(th), math.sin(th)
                add_pt((c * rx_c, yy, s * rz_c), (0.0, ny, 0.0), ((c + 1) * 0.5, (s + 1) * 0.5))
            for i in range(sides):
                if ny > 0:
                    idx.extend((base_cap, base_cap + i + 2, base_cap + i + 1))
                else:
                    idx.extend((base_cap, base_cap + i + 1, base_cap + i + 2))

    return mat, pos, nrm, uv, idx


def make_sphere(cx, cy, cz, rx_s, ry_s, rz_s, mat="bulb", rings=8, segs=12):
    pos, nrm, uv, idx = [], [], [], []
    for r in range(rings + 1):
        phi = r / rings * math.pi
        sp, cp = math.sin(phi), math.cos(phi)
        for s in range(segs + 1):
            th = s / segs * math.tau
            ct, st = math.cos(th), math.sin(th)
            nx, ny, nz = sp * ct, cp, sp * st
            pos.extend((cx + nx * rx_s, cy + ny * ry_s, cz + nz * rz_s))
            n = _norm((nx / max(rx_s, 1e-5), ny / max(ry_s, 1e-5), nz / max(rz_s, 1e-5)))
            nrm.extend(n)
            uv.extend((s / segs, r / rings))
    stride = segs + 1
    for r in range(rings):
        for s in range(segs):
            a = r * stride + s
            b = a + stride
            if r != 0:
                idx.extend((a, a + 1, b + 1))
            if r != rings - 1:
                idx.extend((a, b + 1, b))
    return mat, pos, nrm, uv, idx


def box(x, y, z, sx, sy, sz, mat="oak", bevel=0.008, rx=0.0, ry=0.0, rz=0.0):
    return make_bevel_box(x, y, z, sx, sy, sz, mat, bevel=bevel, rx=rx, ry=ry, rz=rz)


def cushion(x, y, z, sx, sy, sz, mat="ivory", rx=0.0, ry=0.0, rz=0.0):
    return make_bevel_box(x, y, z, sx, sy, sz, mat, bevel=min(0.028, sy * 0.42), rx=rx, ry=ry, rz=rz)


def cyl(x, y, z, sx, sy, sz, mat="oak", sides=24, rx=0.0, ry=0.0, rz=0.0):
    return make_frustum(x, y, z, sx / 2.0, sz / 2.0, sx / 2.0, sz / 2.0, sy, mat, sides=sides, rx=rx, ry=ry, rz=rz)


def tapered_cyl(x, y, z, d_bot, sy, d_top, mat="oak", sides=16, rx=0.0, ry=0.0, rz=0.0):
    return make_frustum(x, y, z, d_bot / 2.0, d_bot / 2.0, d_top / 2.0, d_top / 2.0, sy, mat, sides=sides, rx=rx, ry=ry, rz=rz)


def shade(x, y, z, d_bot, h, d_top, mat="ivory", sides=24):
    return make_frustum(x, y, z, d_bot / 2.0, d_bot / 2.0, d_top / 2.0, d_top / 2.0, h, mat, sides=sides, hollow_bottom=True)


def table_legs(x_span, z_span, height, d_bot=0.036, d_top=0.052, mat="oak"):
    return [
        tapered_cyl(sx * x_span / 2.0, height / 2.0, sz * z_span / 2.0, d_bot, height, d_top, mat, sides=12)
        for sx in (-1, 1)
        for sz in (-1, 1)
    ]


def strut(p1, p2, sx=0.032, sz=0.032, mat="oak", bevel=0.004):
    dx, dy, dz = p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]
    length = math.sqrt(dx * dx + dy * dy + dz * dz)
    cx, cy, cz = (p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0, (p1[2] + p2[2]) / 2.0
    horiz = math.hypot(dx, dz)
    rx = math.atan2(horiz, dy)
    ry = math.atan2(dx, dz) if horiz > 1e-6 else 0.0
    return make_bevel_box(cx, cy, cz, sx, length, sz, mat, bevel=bevel, rx=rx, ry=ry, rz=0.0)


def build_asset(name, parts):
    # Ground entire asset cleanly at min_y = 0.000
    min_y = min(min(pos[1::3]) for _, pos, _, _, _ in parts)
    # Group parts by material so each GLB has minimal meshes/draw calls while preserving material names
    by_mat = {}
    for mat, pos, nrm, uv, idx in parts:
        entry = by_mat.setdefault(mat, ([], [], [], []))
        base = len(entry[0]) // 3
        shifted = list(pos)
        for i in range(1, len(shifted), 3):
            shifted[i] -= min_y
        entry[0].extend(shifted)
        entry[1].extend(nrm)
        entry[2].extend(uv)
        entry[3].extend(i + base for i in idx)

    buffers = bytearray()
    views, accessors, meshes, nodes = [], [], [], []
    mat_list = list(by_mat.keys())

    def accessor(values, typ, component=5126):
        while len(buffers) % 4:
            buffers.append(0)
        offset = len(buffers)
        ch = "f" if component == 5126 else "H"
        buffers.extend(struct.pack(f"<{len(values)}{ch}", *values))
        view = len(views)
        views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(buffers) - offset})
        count = len(values) // {"VEC3": 3, "VEC2": 2, "SCALAR": 1}[typ]
        entry = {"bufferView": view, "componentType": component, "count": count, "type": typ}
        if typ == "VEC3":
            xs, ys, zs = values[0::3], values[1::3], values[2::3]
            entry["min"] = [min(xs), min(ys), min(zs)]
            entry["max"] = [max(xs), max(ys), max(zs)]
        accessors.append(entry)
        return len(accessors) - 1

    for mat_idx, (mat, (pos, nrm, uv, idx)) in enumerate(by_mat.items()):
        attrs = {
            "POSITION": accessor(pos, "VEC3"),
            "NORMAL": accessor(nrm, "VEC3"),
            "TEXCOORD_0": accessor(uv, "VEC2"),
        }
        idx_acc = accessor(idx, "SCALAR", 5123)
        meshes.append({
            "name": f"{name}_{mat}",
            "primitives": [{"attributes": attrs, "indices": idx_acc, "material": mat_idx}],
        })
        nodes.append({"mesh": len(meshes) - 1, "name": f"{name}_{mat}"})

    gltf_materials = []
    for mat in mat_list:
        color, metal, rough = MATERIALS[mat]
        gltf_materials.append({
            "name": mat,
            "pbrMetallicRoughness": {
                "baseColorFactor": color,
                "metallicFactor": metal,
                "roughnessFactor": rough,
            },
            "doubleSided": False,
        })

    gltf = {
        "asset": {"version": "2.0", "generator": "second-room procedural beveled generator"},
        "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": meshes,
        "buffers": [{"byteLength": len(buffers)}],
        "bufferViews": views,
        "accessors": accessors,
        "materials": gltf_materials,
    }
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode()
    json_bytes += b" " * (-len(json_bytes) % 4)
    buffers += b"\x00" * (-len(buffers) % 4)
    total = 12 + 8 + len(json_bytes) + 8 + len(buffers)
    (OUT / f"{name}.glb").write_bytes(
        b"glTF"
        + struct.pack("<II", 2, total)
        + struct.pack("<I4s", len(json_bytes), b"JSON")
        + json_bytes
        + struct.pack("<I4s", len(buffers), b"BIN\x00")
        + buffers
    )


def make_cabinet(width, height, depth, body_mat="oak_light", top_mat="oak", legs_h=0.14, doors=2, plinth=False):
    parts = []
    if plinth:
        parts.append(box(0, legs_h / 2.0, -0.01, width - 0.04, legs_h, depth - 0.05, "dark", bevel=0.004))
    else:
        parts.extend(table_legs(width - 0.10, depth - 0.08, legs_h, d_bot=0.032, d_top=0.048, mat="oak"))
    top_h = 0.032
    body_h = height - legs_h - top_h
    body_y = legs_h + body_h / 2.0
    parts.append(box(0, body_y, 0, width - 0.02, body_h, depth - 0.02, body_mat, bevel=0.006))
    parts.append(box(0, height - top_h / 2.0, 0, width, top_h, depth, top_mat, bevel=0.007))
    # Front doors (+Z) with vertical shadow gaps and brass pulls
    door_w = (width - 0.04 - (doors - 1) * 0.008) / doors
    door_h = body_h - 0.024
    for i in range(doors):
        dx = -((doors - 1) / 2.0 - i) * (door_w + 0.008)
        parts.append(box(dx, body_y, depth / 2.0 - 0.004, door_w, door_h, 0.016, body_mat, bevel=0.005))
        pull_x = dx + (door_w * 0.36 if i % 2 == 0 else -door_w * 0.36)
        if doors == 1:
            pull_x = dx + door_w * 0.32
        pull_h = min(0.14, door_h * 0.32)
        parts.append(box(pull_x, body_y + door_h * 0.10, depth / 2.0 + 0.011, 0.014, pull_h, 0.016, "brass", bevel=0.003))
    return parts


def make_bed(width, depth, blanket_mat="sage", two_pillows=True):
    leg_h = 0.15
    frame_h = 0.16
    hb_h = 0.86
    parts = [
        *table_legs(width - 0.12, depth - 0.16, leg_h, d_bot=0.04, d_top=0.055, mat="oak"),
        # Frame
        box(0, leg_h + frame_h / 2.0, 0.01, width, frame_h, depth - 0.04, "oak", bevel=0.008),
        # Headboard resting on rear legs/frame at -Z
        box(0, leg_h + (hb_h - leg_h) / 2.0, -depth / 2.0 + 0.04, width + 0.02, hb_h - leg_h, 0.075, "oak_light", bevel=0.01),
        box(0, hb_h - 0.02, -depth / 2.0 + 0.04, width + 0.03, 0.04, 0.085, "oak", bevel=0.008),
        # Mattress
        cushion(0, leg_h + frame_h + 0.05, 0.02, width - 0.08, 0.20, depth - 0.14, "ivory"),
        # Folded duvet over lower 60%
        cushion(0, leg_h + frame_h + 0.135, depth * 0.16, width - 0.04, 0.065, depth * 0.56, blanket_mat),
    ]
    if two_pillows:
        pw = width * 0.39
        parts.append(cushion(-width * 0.23, leg_h + frame_h + 0.19, -depth / 2.0 + 0.28, pw, 0.10, 0.36, "white", rx=0.14))
        parts.append(cushion(width * 0.23, leg_h + frame_h + 0.19, -depth / 2.0 + 0.28, pw, 0.10, 0.36, "white", rx=0.14))
    else:
        parts.append(cushion(0, leg_h + frame_h + 0.19, -depth / 2.0 + 0.27, width * 0.58, 0.10, 0.34, "white", rx=0.14))
    return parts


def make_table(width, depth, height, top_mat="oak_light", apron_mat="oak"):
    top_h = 0.038
    leg_h = height - top_h
    return [
        box(0, height - top_h / 2.0, 0, width, top_h, depth, top_mat, bevel=0.01),
        box(0, height - top_h - 0.022, 0, width - 0.14, 0.044, depth - 0.14, apron_mat, bevel=0.004),
        *table_legs(width - 0.14, depth - 0.14, leg_h, d_bot=0.034, d_top=0.052, mat="oak"),
    ]


def make_chair(width, depth, seat_h, back_h, seat_mat="ivory", back_mat="oak_light"):
    leg_d = 0.034
    lx, lz = width / 2.0 - 0.045, depth / 2.0 - 0.045
    parts = [
        # Front legs
        tapered_cyl(-lx, seat_h / 2.0, lz, leg_d * 0.78, seat_h, leg_d, "oak", sides=10),
        tapered_cyl(lx, seat_h / 2.0, lz, leg_d * 0.78, seat_h, leg_d, "oak", sides=10),
        # Rear legs rising continuously into backrest stiles
        tapered_cyl(-lx, back_h / 2.0, -lz, leg_d * 0.78, back_h, leg_d * 0.88, "oak", sides=10),
        tapered_cyl(lx, back_h / 2.0, -lz, leg_d * 0.78, back_h, leg_d * 0.88, "oak", sides=10),
        # Seat frame & cushioned seat pad
        box(0, seat_h - 0.015, 0, width - 0.05, 0.03, depth - 0.05, "oak", bevel=0.004),
        cushion(0, seat_h + 0.018, 0.01, width - 0.02, 0.044, depth - 0.03, seat_mat),
        # Backrest rail
        box(0, back_h - 0.085, -lz - 0.005, width - 0.02, 0.14, 0.034, back_mat, bevel=0.008),
    ]
    return parts


def book_row(x0, x1, shelf_top_y, seed=1, z_center=0.01, stack_end=False):
    """Fill a bookshelf bay cleanly with varied vertical books and optional horizontal stack."""
    palette = ("sage", "ivory", "dark", "oak", "stone", "brass", "white", "oak_light")
    parts = []
    x = x0 + 0.012
    end = x1 - (0.20 if stack_end else 0.012)
    idx = 0
    s = seed * 1103515245 + 12345
    def rnd():
        nonlocal s
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
        return s / 4294967296.0

    while x + 0.042 <= end:
        thick = 0.026 + rnd() * 0.024
        if x + thick > end:
            break
        h = 0.19 + rnd() * 0.085
        d = 0.18 + rnd() * 0.04
        z = z_center - (0.22 - d) * 0.3
        mat = palette[(idx + seed) % len(palette)]
        parts.append(box(x + thick / 2.0, shelf_top_y + h / 2.0, z, thick - 0.003, h, d, mat, bevel=0.003))
        x += thick + 0.003
        idx += 1

    if stack_end and x + 0.16 <= x1:
        sx = x1 - 0.105
        for k, (w, h, d, mat) in enumerate([
            (0.17, 0.032, 0.22, "ivory"),
            (0.16, 0.028, 0.21, "sage"),
            (0.145, 0.026, 0.195, "dark"),
        ]):
            parts.append(box(sx, shelf_top_y + 0.015 + k * 0.030, z_center, w, h, d, mat, bevel=0.003))
    return parts


def make_bookshelf(width, height, depth, shelves_y, leg_h=0.08, dividers=1, decor=None):
    parts = [
        box(0, leg_h / 2.0, -0.005, width - 0.03, leg_h, depth - 0.03, "oak", bevel=0.004),
        # Back panel
        box(0, leg_h + (height - leg_h) / 2.0, -depth / 2.0 + 0.012, width, height - leg_h, 0.022, "oak_light", bevel=0.004),
        # Left & right side walls
        box(-width / 2.0 + 0.015, leg_h + (height - leg_h) / 2.0, 0, 0.03, height - leg_h, depth, "oak_light", bevel=0.005),
        box(width / 2.0 - 0.015, leg_h + (height - leg_h) / 2.0, 0, 0.03, height - leg_h, depth, "oak_light", bevel=0.005),
        # Top board & bottom shelf
        box(0, height - 0.015, 0, width, 0.03, depth, "oak_light", bevel=0.006),
        box(0, leg_h + 0.015, 0.01, width - 0.04, 0.028, depth - 0.02, "oak", bevel=0.004),
    ]
    for i in range(1, dividers + 1):
        dx = -width / 2.0 + width * i / (dividers + 1)
        parts.append(box(dx, leg_h + (height - leg_h) / 2.0, 0, 0.024, height - leg_h - 0.03, depth - 0.02, "oak_light", bevel=0.004))
    for sy in shelves_y:
        parts.append(box(0, sy, 0.008, width - 0.04, 0.026, depth - 0.024, "oak", bevel=0.004))
    if decor:
        parts.extend(decor)
    return parts


assets = {
    "sofa": [
        *table_legs(2.14, 0.72, 0.14, d_bot=0.036, d_top=0.052, mat="oak"),
        box(0, 0.165, 0, 2.26, 0.05, 0.84, "oak", bevel=0.007),
        # Armrests & backrest frame
        box(-1.06, 0.39, 0.01, 0.14, 0.41, 0.84, "sage", bevel=0.018),
        box(1.06, 0.39, 0.01, 0.14, 0.41, 0.84, "sage", bevel=0.018),
        box(0, 0.48, -0.34, 2.26, 0.58, 0.16, "sage", bevel=0.018),
        # 3 seat cushions
        cushion(-0.66, 0.275, 0.06, 0.65, 0.17, 0.72, "sage"),
        cushion(0.0, 0.275, 0.06, 0.65, 0.17, 0.72, "sage"),
        cushion(0.66, 0.275, 0.06, 0.65, 0.17, 0.72, "sage"),
        # 3 back cushions + 2 ivory throw pillows
        cushion(-0.65, 0.53, -0.20, 0.63, 0.36, 0.14, "sage", rx=-0.12),
        cushion(0.0, 0.53, -0.20, 0.63, 0.36, 0.14, "sage", rx=-0.12),
        cushion(0.65, 0.53, -0.20, 0.63, 0.36, 0.14, "sage", rx=-0.12),
        cushion(-0.88, 0.45, -0.10, 0.085, 0.24, 0.26, "ivory", rx=-0.15, rz=-0.30),
        cushion(0.88, 0.45, -0.10, 0.085, 0.24, 0.26, "ivory", rx=-0.15, rz=0.30),
    ],
    "coffee_table": [
        *table_legs(0.82, 0.42, 0.345, d_bot=0.032, d_top=0.048, mat="oak"),
        box(0, 0.145, 0, 0.80, 0.022, 0.38, "oak", bevel=0.005),
        cyl(0, 0.362, 0, 1.08, 0.036, 0.62, "oak_light", sides=32),
    ],
    "media_console": [
        *table_legs(1.72, 0.32, 0.14, d_bot=0.030, d_top=0.044, mat="oak"),
        tapered_cyl(0, 0.07, 0, 0.030, 0.14, 0.042, "oak", sides=10),
        box(0, 0.29, 0, 1.83, 0.30, 0.40, "oak_light", bevel=0.006),
        box(0, 0.46, 0, 1.86, 0.04, 0.42, "oak", bevel=0.007),
        # Left & right drawer/door panels on +Z
        box(-0.62, 0.29, 0.198, 0.54, 0.26, 0.018, "oak_light", bevel=0.005),
        box(0.62, 0.29, 0.198, 0.54, 0.26, 0.018, "oak_light", bevel=0.005),
        box(-0.44, 0.31, 0.21, 0.10, 0.014, 0.014, "brass", bevel=0.003),
        box(0.44, 0.31, 0.21, 0.10, 0.014, 0.014, "brass", bevel=0.003),
        # Center slatted shelf bay on +Z
        box(0, 0.29, 0.186, 0.62, 0.24, 0.02, "dark", bevel=0.002),
        *[box(x, 0.29, 0.20, 0.018, 0.24, 0.014, "oak", bevel=0.003) for x in (-0.25, -0.15, -0.05, 0.05, 0.15, 0.25)],
    ],
    "floor_lamp": [
        cyl(0, 0.016, 0, 0.34, 0.032, 0.34, "stone", sides=28),
        cyl(0, 0.74, 0, 0.028, 1.44, 0.028, "brass", sides=16),
        shade(0, 1.52, 0, 0.40, 0.34, 0.30, "ivory", sides=28),
        make_sphere(0, 1.48, 0, 0.05, 0.055, 0.05, "bulb"),
    ],
    "side_table": [
        cyl(0, 0.016, 0, 0.30, 0.032, 0.30, "stone", sides=24),
        tapered_cyl(0, 0.26, 0, 0.056, 0.46, 0.044, "oak", sides=18),
        cyl(0, 0.505, 0, 0.44, 0.032, 0.44, "stone", sides=28),
    ],
    "kitchen_counter": [
        # Recessed dark toe-kick (y=0..0.09)
        box(0, 0.045, -0.025, 2.46, 0.09, 0.51, "dark", bevel=0.003),
        # Main cabinet body (y=0.09..0.81)
        box(0, 0.45, 0, 2.50, 0.72, 0.58, "ivory", bevel=0.005),
        # 4 front doors on +Z
        *[box(-0.91 + i * 0.607, 0.45, 0.29, 0.59, 0.69, 0.018, "ivory", bevel=0.005) for i in range(4)],
        *[box(-0.91 + i * 0.607 + (0.21 if i % 2 == 0 else -0.21), 0.56, 0.304, 0.014, 0.14, 0.016, "brass", bevel=0.003) for i in range(4)],
        # Stone countertop (y=0.81..0.86) + rear low backsplash at -Z
        box(0, 0.835, 0, 2.52, 0.05, 0.60, "stone", bevel=0.006),
        box(0, 0.905, -0.282, 2.52, 0.09, 0.036, "stone", bevel=0.005),
        # Recessed steel sink basin (left) + curved faucet
        box(-0.66, 0.862, 0.02, 0.58, 0.014, 0.40, "steel", bevel=0.004),
        box(-0.66, 0.868, 0.02, 0.50, 0.008, 0.32, "dark", bevel=0.002),
        cyl(-0.66, 0.97, -0.21, 0.026, 0.22, 0.026, "steel", sides=14),
        box(-0.66, 1.075, -0.14, 0.024, 0.022, 0.16, "steel", bevel=0.005),
        cyl(-0.66, 1.045, -0.07, 0.022, 0.05, 0.022, "steel", sides=12),
        # Induction cooktop (right)
        box(0.62, 0.864, 0.01, 0.64, 0.012, 0.44, "dark", bevel=0.004),
        cyl(0.46, 0.871, 0.01, 0.19, 0.004, 0.19, "stone", sides=20),
        cyl(0.78, 0.871, 0.01, 0.22, 0.004, 0.22, "stone", sides=20),
    ],
    "upper_cabinet": [
        box(0, 0.34, 0, 2.10, 0.68, 0.33, "ivory", bevel=0.005),
        box(0, 0.014, 0, 2.10, 0.028, 0.33, "oak_light", bevel=0.004),
        *[box(-0.77 + i * 0.513, 0.345, 0.166, 0.50, 0.64, 0.018, "ivory", bevel=0.005) for i in range(4)],
        *[box(-0.77 + i * 0.513 + (0.18 if i % 2 == 0 else -0.18), 0.18, 0.18, 0.012, 0.13, 0.014, "brass", bevel=0.003) for i in range(4)],
    ],
    "dining_table": make_table(1.36, 0.78, 0.75),
    "dining_chair": make_chair(0.44, 0.44, 0.44, 0.82, seat_mat="ivory", back_mat="oak_light"),
    "shoe_cabinet": make_cabinet(1.16, 1.00, 0.34, body_mat="oak_light", top_mat="oak", legs_h=0.14, doors=2),
    "bench": [
        *table_legs(0.84, 0.28, 0.41, d_bot=0.032, d_top=0.044, mat="oak"),
        *[box(0, 0.13, z, 0.82, 0.018, 0.045, "oak", bevel=0.004) for z in (-0.08, 0.0, 0.08)],
        box(0, 0.425, 0, 0.92, 0.032, 0.35, "oak_light", bevel=0.007),
        cushion(0, 0.455, 0, 0.86, 0.034, 0.31, "ivory"),
    ],
    "mirror": [
        # Slightly tilted standing oak frame mirror grounded cleanly at y=0, front=+Z
        box(0, 0.78, 0.07, 0.62, 1.56, 0.038, "oak", bevel=0.008, rx=-0.09),
        box(0, 0.78, 0.086, 0.53, 1.46, 0.012, "mirror", bevel=0.002, rx=-0.09),
        # Rear A-frame easel legs touching floor at y=0 and meeting frame rear at y=1.18
        strut((-0.22, 0.016, -0.24), (-0.22, 1.18, 0.01), 0.032, 0.032, "oak"),
        strut((0.22, 0.016, -0.24), (0.22, 1.18, 0.01), 0.032, 0.032, "oak"),
        box(0, 0.34, -0.17, 0.45, 0.028, 0.028, "oak", bevel=0.004),
    ],
    "bed_double": make_bed(1.74, 2.02, blanket_mat="sage", two_pillows=True),
    "bedside": [
        *table_legs(0.38, 0.28, 0.14, d_bot=0.028, d_top=0.040, mat="oak"),
        box(0, 0.305, 0, 0.45, 0.33, 0.35, "oak_light", bevel=0.006),
        box(0, 0.485, 0, 0.46, 0.03, 0.36, "oak", bevel=0.006),
        box(0, 0.385, 0.176, 0.41, 0.135, 0.016, "oak_light", bevel=0.004),
        box(0, 0.225, 0.176, 0.41, 0.135, 0.016, "oak_light", bevel=0.004),
        box(0, 0.385, 0.188, 0.07, 0.014, 0.014, "brass", bevel=0.003),
        box(0, 0.225, 0.188, 0.07, 0.014, 0.014, "brass", bevel=0.003),
    ],
    "wardrobe": make_cabinet(1.80, 2.28, 0.58, body_mat="ivory", top_mat="oak", legs_h=0.08, doors=3, plinth=True),
    "table_lamp": [
        cyl(0, 0.022, 0, 0.16, 0.044, 0.16, "stone", sides=24),
        cyl(0, 0.16, 0, 0.022, 0.24, 0.022, "brass", sides=14),
        shade(0, 0.36, 0, 0.28, 0.24, 0.20, "ivory", sides=24),
        make_sphere(0, 0.33, 0, 0.04, 0.045, 0.04, "bulb"),
    ],
    "desk": [
        *table_legs(1.44, 0.56, 0.72, d_bot=0.034, d_top=0.048, mat="oak"),
        # Rear apron + left/right under-desk drawers (open knee space in middle)
        box(0, 0.66, -0.25, 1.44, 0.12, 0.03, "oak", bevel=0.004),
        box(-0.46, 0.66, 0.0, 0.48, 0.11, 0.54, "oak_light", bevel=0.005),
        box(0.46, 0.66, 0.0, 0.48, 0.11, 0.54, "oak_light", bevel=0.005),
        box(-0.46, 0.66, 0.275, 0.44, 0.085, 0.015, "oak_light", bevel=0.004),
        box(0.46, 0.66, 0.275, 0.44, 0.085, 0.015, "oak_light", bevel=0.004),
        box(-0.46, 0.66, 0.288, 0.09, 0.012, 0.014, "brass", bevel=0.003),
        box(0.46, 0.66, 0.288, 0.09, 0.012, 0.014, "brass", bevel=0.003),
        # Desktop
        box(0, 0.74, 0, 1.56, 0.04, 0.68, "oak_light", bevel=0.009),
    ],
    "office_chair": [
        # 5-star caster base grounded at y=0
        *[box(math.cos(i * math.tau / 5) * 0.13, 0.065, math.sin(i * math.tau / 5) * 0.13, 0.26, 0.032, 0.04, "dark", bevel=0.005, ry=-i * math.tau / 5) for i in range(5)],
        *[cyl(math.cos(i * math.tau / 5) * 0.24, 0.025, math.sin(i * math.tau / 5) * 0.24, 0.048, 0.05, 0.048, "dark", sides=12) for i in range(5)],
        cyl(0, 0.25, 0, 0.05, 0.36, 0.05, "dark", sides=14),
        cushion(0, 0.465, 0.02, 0.50, 0.075, 0.48, "sage"),
        box(0, 0.63, -0.24, 0.06, 0.34, 0.04, "dark", bevel=0.006),
        cushion(0, 0.78, -0.21, 0.46, 0.50, 0.075, "sage", rx=-0.06),
        # Armrests
        box(-0.265, 0.56, 0.02, 0.035, 0.18, 0.045, "dark", bevel=0.005),
        box(0.265, 0.56, 0.02, 0.035, 0.18, 0.045, "dark", bevel=0.005),
        box(-0.265, 0.655, 0.03, 0.055, 0.026, 0.24, "dark", bevel=0.006),
        box(0.265, 0.655, 0.03, 0.055, 0.026, 0.24, "dark", bevel=0.006),
    ],
    "bookcase": make_bookshelf(
        1.68, 2.10, 0.34, shelves_y=(0.48, 0.88, 1.28, 1.68), leg_h=0.08, dividers=1,
        decor=[
            # All 5 shelf tiers (left bay [-0.81..-0.012], right bay [+0.012..+0.81]) packed with books
            *book_row(-0.80, -0.02, 0.109, seed=11, stack_end=False),
            *book_row(0.02, 0.80, 0.109, seed=17, stack_end=True),
            *book_row(-0.80, -0.02, 0.493, seed=23, stack_end=True),
            *book_row(0.02, 0.80, 0.493, seed=31, stack_end=False),
            *book_row(-0.80, -0.02, 0.893, seed=41, stack_end=False),
            *book_row(0.02, 0.80, 0.893, seed=47, stack_end=True),
            *book_row(-0.80, -0.02, 1.293, seed=53, stack_end=True),
            *book_row(0.02, 0.80, 1.293, seed=61, stack_end=False),
            *book_row(-0.80, -0.02, 1.693, seed=71, stack_end=False),
            *book_row(0.02, 0.80, 1.693, seed=79, stack_end=True),
        ],
    ),
    "reading_chair": [
        *table_legs(0.68, 0.64, 0.17, d_bot=0.034, d_top=0.048, mat="oak"),
        box(0, 0.19, 0, 0.78, 0.04, 0.74, "oak", bevel=0.006),
        box(-0.35, 0.40, 0, 0.10, 0.38, 0.74, "ivory", bevel=0.016),
        box(0.35, 0.40, 0, 0.10, 0.38, 0.74, "ivory", bevel=0.016),
        box(0, 0.49, -0.30, 0.78, 0.56, 0.14, "ivory", bevel=0.016),
        cushion(0, 0.29, 0.04, 0.58, 0.16, 0.62, "ivory"),
        cushion(0, 0.52, -0.17, 0.56, 0.34, 0.13, "ivory", rx=-0.12),
        cushion(0, 0.44, -0.08, 0.34, 0.18, 0.09, "sage", rx=-0.22),
    ],
    "desk_lamp": [
        cyl(0, 0.012, 0, 0.17, 0.024, 0.17, "dark", sides=24),
        cyl(-0.04, 0.225, 0, 0.018, 0.41, 0.018, "brass", sides=14),
        box(0.015, 0.425, 0, 0.13, 0.018, 0.018, "brass", bevel=0.004),
        shade(0.075, 0.37, 0, 0.20, 0.13, 0.12, "ivory", sides=24),
        make_sphere(0.075, 0.35, 0, 0.032, 0.035, 0.032, "bulb"),
    ],
    "sofa_bed": [
        *table_legs(1.74, 0.88, 0.12, d_bot=0.034, d_top=0.048, mat="oak"),
        box(0, 0.18, 0.01, 1.84, 0.12, 0.98, "oak", bevel=0.007),
        # Pull-out trundle drawer panel flush at front (+Z)
        box(0, 0.18, 0.502, 1.56, 0.10, 0.018, "oak_light", bevel=0.004),
        box(0, 0.18, 0.515, 0.12, 0.014, 0.014, "brass", bevel=0.003),
        # Armrests & backrest
        box(-0.86, 0.39, 0.01, 0.12, 0.42, 0.98, "ivory", bevel=0.016),
        box(0.86, 0.39, 0.01, 0.12, 0.42, 0.98, "ivory", bevel=0.016),
        box(0, 0.48, -0.42, 1.84, 0.58, 0.14, "ivory", bevel=0.016),
        # Deep guest seat mattress
        cushion(0, 0.32, 0.08, 1.58, 0.16, 0.84, "ivory"),
        cushion(-0.48, 0.52, -0.27, 0.44, 0.30, 0.12, "sage", rx=-0.15),
        cushion(0.48, 0.52, -0.27, 0.44, 0.30, 0.12, "sage", rx=-0.15),
    ],
    "round_table": [
        cyl(0, 0.013, 0, 0.36, 0.026, 0.36, "oak", sides=28),
        tapered_cyl(0, 0.215, 0, 0.11, 0.38, 0.085, "oak", sides=20),
        cyl(0, 0.422, 0, 0.72, 0.036, 0.72, "oak_light", sides=32),
    ],
    "low_cabinet": make_cabinet(1.40, 0.68, 0.40, body_mat="oak_light", top_mat="oak", legs_h=0.14, doors=3),
    "luggage_rack": [
        # Crossed X-frame folding legs on left & right sides (x = +-0.30)
        strut((-0.30, 0.016, -0.18), (-0.30, 0.485, 0.18), 0.032, 0.032, "oak"),
        strut((-0.30, 0.016, 0.18), (-0.30, 0.485, -0.18), 0.032, 0.032, "oak"),
        strut((0.30, 0.016, -0.18), (0.30, 0.485, 0.18), 0.032, 0.032, "oak"),
        strut((0.30, 0.016, 0.18), (0.30, 0.485, -0.18), 0.032, 0.032, "oak"),
        # Top longitudinal & cross rails
        box(0, 0.485, 0.18, 0.68, 0.028, 0.028, "oak", bevel=0.004),
        box(0, 0.485, -0.18, 0.68, 0.028, 0.028, "oak", bevel=0.004),
        # Woven webbing straps across the top
        *[box(x, 0.502, 0, 0.075, 0.008, 0.38, "sage" if i % 2 == 0 else "ivory", bevel=0.002) for i, x in enumerate((-0.21, -0.07, 0.07, 0.21))],
    ],
    "rug": [
        cushion(0, 0.005, 0, 1.85, 0.010, 1.28, "ivory"),
        box(0, 0.0055, -0.54, 1.76, 0.010, 0.08, "sage", bevel=0.002),
        box(0, 0.0055, 0.54, 1.76, 0.010, 0.08, "sage", bevel=0.002),
    ],
    "bed_single": make_bed(0.98, 1.88, blanket_mat="sage", two_pillows=False),
    "low_bookshelf": make_bookshelf(
        1.26, 0.78, 0.36, shelves_y=(0.42,), leg_h=0.08, dividers=1,
        decor=[
            box(-0.32, 0.22, 0.01, 0.36, 0.24, 0.26, "ivory", bevel=0.006),
            box(0.28, 0.21, 0.01, 0.05, 0.21, 0.20, "sage", bevel=0.003),
            box(0.34, 0.22, 0.01, 0.05, 0.23, 0.20, "brass", bevel=0.003),
            box(-0.34, 0.55, 0.01, 0.05, 0.22, 0.20, "sage", bevel=0.003),
            box(-0.28, 0.54, 0.01, 0.05, 0.20, 0.20, "ivory", bevel=0.003),
            box(0.32, 0.54, 0.01, 0.34, 0.21, 0.25, "stone", bevel=0.006),
        ],
    ),
    "kids_table": make_table(0.90, 0.54, 0.52),
    "kids_chair": make_chair(0.36, 0.34, 0.30, 0.58, seat_mat="sage", back_mat="sage"),
    "toy_shelf": make_bookshelf(
        1.06, 0.84, 0.36, shelves_y=(0.45,), leg_h=0.08, dividers=2,
        decor=[
            # 3 colorful storage bins in bottom cubbies
            box(-0.34, 0.23, 0.02, 0.28, 0.24, 0.27, "sage", bevel=0.008),
            box(0.0, 0.23, 0.02, 0.28, 0.24, 0.27, "stone", bevel=0.008),
            box(0.34, 0.23, 0.02, 0.28, 0.24, 0.27, "ivory", bevel=0.008),
            # Toy blocks on middle shelf & top
            box(-0.34, 0.54, 0.01, 0.16, 0.15, 0.16, "ivory", bevel=0.008),
            box(0.34, 0.53, 0.01, 0.18, 0.13, 0.18, "sage", bevel=0.008),
            box(-0.20, 0.895, 0.0, 0.12, 0.11, 0.12, "sage", bevel=0.008),
            box(0.05, 0.905, 0.0, 0.13, 0.13, 0.13, "brass", bevel=0.008),
        ],
    ),
    "round_rug": [
        cyl(0, 0.005, 0, 1.64, 0.010, 1.64, "sage", sides=36),
        cyl(0, 0.0055, 0, 1.30, 0.010, 1.30, "ivory", sides=36),
    ],
    "tv": [
        # Two splayed stand feet grounded at y=0
        box(-0.40, 0.010, 0.0, 0.032, 0.020, 0.22, "dark", bevel=0.004),
        box(0.40, 0.010, 0.0, 0.032, 0.020, 0.22, "dark", bevel=0.004),
        box(-0.40, 0.060, -0.01, 0.028, 0.09, 0.028, "steel", bevel=0.004),
        box(0.40, 0.060, -0.01, 0.028, 0.09, 0.028, "steel", bevel=0.004),
        # Slim display chassis, rear housing, oak chin accent, and front screen glass (+Z)
        box(0, 0.44, -0.01, 1.22, 0.70, 0.030, "dark", bevel=0.006),
        box(0, 0.35, -0.034, 0.74, 0.42, 0.024, "dark", bevel=0.006),
        box(0, 0.098, 0.006, 1.22, 0.016, 0.010, "oak", bevel=0.002),
        box(0, 0.448, 0.006, 1.18, 0.65, 0.006, "screen", bevel=0.0),
    ],
    "computer": [
        # Monitor stand base & neck
        box(0, 0.007, -0.10, 0.22, 0.014, 0.16, "steel", bevel=0.004),
        box(0, 0.095, -0.15, 0.044, 0.17, 0.024, "steel", bevel=0.004, rx=-0.10),
        # 27" monitor chassis + front display (+Z)
        box(0, 0.30, -0.10, 0.62, 0.36, 0.022, "dark", bevel=0.005),
        box(0, 0.28, -0.116, 0.32, 0.20, 0.016, "dark", bevel=0.004),
        box(0, 0.304, -0.088, 0.59, 0.33, 0.006, "screen", bevel=0.0),
        # Keyboard + keycaps + wireless mouse in front (+Z)
        box(-0.04, 0.009, 0.09, 0.34, 0.014, 0.12, "steel", bevel=0.003, rx=0.05),
        box(-0.04, 0.017, 0.09, 0.32, 0.008, 0.105, "ivory", bevel=0.002, rx=0.05),
        cushion(0.20, 0.013, 0.09, 0.062, 0.026, 0.102, "ivory"),
        # Compact minimalist desktop tower on the right side
        box(0.42, 0.12, -0.06, 0.11, 0.24, 0.21, "dark", bevel=0.006),
        box(0.42, 0.12, 0.046, 0.085, 0.21, 0.008, "oak", bevel=0.002),
        box(0.42, 0.19, 0.051, 0.016, 0.016, 0.006, "brass", bevel=0.001),
    ],
}

assert len(assets) == 34
for name, parts in assets.items():
    build_asset(name, parts)
print(f"Generated {len(assets)} beveled GLB assets in {OUT}")
