"""Generate compact, low-poly furniture GLBs for the static demo.

Requires only Python 3 for the primitive stage. Run blender_finalize.py with
Blender Python afterward to produce the final checked-in assets.
"""
from __future__ import annotations

import json
import math
import struct
from pathlib import Path

OUT = Path(__file__).parent / "assets" / "furniture"
OUT.mkdir(parents=True, exist_ok=True)
MATERIALS = {
    "oak": [0.69, 0.50, 0.30, 1],
    "oak_light": [0.83, 0.67, 0.46, 1],
    "ivory": [0.87, 0.85, 0.79, 1],
    "sage": [0.48, 0.55, 0.47, 1],
    "stone": [0.69, 0.67, 0.62, 1],
    "dark": [0.27, 0.30, 0.27, 1],
    "brass": [0.69, 0.54, 0.30, 1],
    "white": [0.93, 0.91, 0.85, 1],
}


def build_asset(name, parts):
    buffers = bytearray()
    views, accessors, meshes, nodes = [], [], [], []

    def accessor(values, typ, component=5126):
        while len(buffers) % 4:
            buffers.append(0)
        offset = len(buffers)
        for value in values:
            buffers.extend(struct.pack("<f" if component == 5126 else "<H", value))
        view = len(views)
        views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(buffers) - offset})
        count = len(values) // {"VEC3": 3, "VEC2": 2, "SCALAR": 1}[typ]
        entry = {"bufferView": view, "componentType": component, "count": count, "type": typ}
        if typ == "VEC3":
            triples = [values[i:i + 3] for i in range(0, len(values), 3)]
            entry["min"] = [min(v[i] for v in triples) for i in range(3)]
            entry["max"] = [max(v[i] for v in triples) for i in range(3)]
        accessors.append(entry)
        return len(accessors) - 1

    for part in parts:
        kind, x, y, z, sx, sy, sz, material = part
        positions, normals, uvs, indices = [], [], [], []
        if kind == "box":
            faces = [
                ((0, 0, 1), [(-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]),
                ((0, 0, -1), [(1, -1, -1), (-1, -1, -1), (-1, 1, -1), (1, 1, -1)]),
                ((1, 0, 0), [(1, -1, 1), (1, -1, -1), (1, 1, -1), (1, 1, 1)]),
                ((-1, 0, 0), [(-1, -1, -1), (-1, -1, 1), (-1, 1, 1), (-1, 1, -1)]),
                ((0, 1, 0), [(-1, 1, 1), (1, 1, 1), (1, 1, -1), (-1, 1, -1)]),
                ((0, -1, 0), [(-1, -1, -1), (1, -1, -1), (1, -1, 1), (-1, -1, 1)]),
            ]
            for normal, corners in faces:
                base = len(positions) // 3
                for (cx, cy, cz), uv in zip(corners, [(0, 0), (1, 0), (1, 1), (0, 1)]):
                    positions += [x + cx * sx / 2, y + cy * sy / 2, z + cz * sz / 2]
                    normals += list(normal)
                    uvs += list(uv)
                indices += [base, base + 1, base + 2, base, base + 2, base + 3]
        else:
            sides = 12 if kind == "cylinder" else 20
            for i in range(sides + 1):
                theta = i / sides * math.tau
                c, s = math.cos(theta), math.sin(theta)
                for yy in (-1, 1):
                    positions += [x + c * sx / 2, y + yy * sy / 2, z + s * sz / 2]
                    normals += [c, 0, s]
                    uvs += [i / sides, (yy + 1) / 2]
            for i in range(sides):
                a = i * 2
                indices += [a, a + 1, a + 3, a, a + 3, a + 2]
            for yy, normal in ((-1, -1), (1, 1)):
                base = len(positions) // 3
                positions += [x, y + yy * sy / 2, z]
                normals += [0, normal, 0]
                uvs += [0.5, 0.5]
                for i in range(sides + 1):
                    theta = i / sides * math.tau
                    c, s = math.cos(theta), math.sin(theta)
                    positions += [x + c * sx / 2, y + yy * sy / 2, z + s * sz / 2]
                    normals += [0, normal, 0]
                    uvs += [(c + 1) / 2, (s + 1) / 2]
                for i in range(sides):
                    indices += [base, base + i + (1 if yy == 1 else 2), base + i + (2 if yy == 1 else 1)]
        attrs = {"POSITION": accessor(positions, "VEC3"), "NORMAL": accessor(normals, "VEC3"), "TEXCOORD_0": accessor(uvs, "VEC2")}
        idx = accessor(indices, "SCALAR", 5123)
        meshes.append({"name": f"{name}_{material}_{len(meshes)}", "primitives": [{"attributes": attrs, "indices": idx, "material": list(MATERIALS).index(material)}]})
        nodes.append({"mesh": len(meshes) - 1})

    gltf = {
        "asset": {"version": "2.0", "generator": "second-room primitive furniture generator"},
        "scene": 0, "scenes": [{"nodes": list(range(len(nodes)))}], "nodes": nodes,
        "meshes": meshes, "buffers": [{"byteLength": len(buffers)}],
        "bufferViews": views, "accessors": accessors,
        "materials": [{"name": key, "pbrMetallicRoughness": {"baseColorFactor": value, "metallicFactor": 0, "roughnessFactor": 0.8}, "doubleSided": True} for key, value in MATERIALS.items()],
    }
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode()
    json_bytes += b" " * (-len(json_bytes) % 4)
    buffers += b"\x00" * (-len(buffers) % 4)
    total = 12 + 8 + len(json_bytes) + 8 + len(buffers)
    (OUT / f"{name}.glb").write_bytes(b"glTF" + struct.pack("<II", 2, total) + struct.pack("<I4s", len(json_bytes), b"JSON") + json_bytes + struct.pack("<I4s", len(buffers), b"BIN\x00") + buffers)


def box(x, y, z, sx, sy, sz, mat="oak"):
    return ("box", x, y, z, sx, sy, sz, mat)


def cyl(x, y, z, sx, sy, sz, mat="oak"):
    return ("cylinder", x, y, z, sx, sy, sz, mat)


def legs(width, depth, height, mat="oak"):
    return [box(x * width * .42, height / 2, z * depth * .42, .075, height, .075, mat) for x in (-1, 1) for z in (-1, 1)]


def seat(width=1.8, depth=.8, color="sage"):
    return [box(0, .32, 0, width, .28, depth, color), box(0, .68, -depth * .42, width, .62, .17, color), box(-width * .46, .56, 0, .16, .56, depth, color), box(width * .46, .56, 0, .16, .56, depth, color)] + legs(width * .85, depth * .75, .19)


def table(width=1.2, depth=.65, height=.72, top="oak_light"):
    return [box(0, height, 0, width, .075, depth, top)] + legs(width * .9, depth * .82, height - .04)


def cabinet(width=1.5, height=.8, depth=.42, mat="oak_light"):
    return [box(0, height / 2 + .09, 0, width, height - .18, depth, mat), box(0, height + .08, 0, width + .04, .04, depth + .04, "oak"), box(0, .05, 0, width * .86, .1, depth * .85, "dark")]


def bed(width=1.7, depth=2.0):
    return [box(0, .27, 0, width + .12, .23, depth + .1, "oak"), box(0, .48, .06, width, .2, depth * .9, "ivory"), box(0, .62, -depth * .5, width + .1, .86, .12, "oak_light"), box(-width * .25, .61, -depth * .27, width * .43, .1, .38, "white"), box(width * .25, .61, -depth * .27, width * .43, .1, .38, "white")]


assets = {
    "sofa": seat(2.35, .9),
    "coffee_table": [cyl(0, .32, 0, 1.05, .06, .62, "oak_light"), cyl(0, .16, 0, .36, .31, .28, "oak")],
    "media_console": cabinet(1.85, .52, .42),
    "floor_lamp": [cyl(0, .03, 0, .38, .06, .38, "stone"), cyl(0, .82, 0, .035, 1.6, .035, "brass"), cyl(0, 1.62, 0, .42, .38, .42, "ivory")],
    "side_table": [cyl(0, .51, 0, .42, .05, .42, "stone"), cyl(0, .26, 0, .055, .5, .055, "oak")],
    "kitchen_counter": cabinet(2.55, .87, .58, "ivory") + [box(0, .91, 0, 2.6, .055, .61, "stone"), box(-.63, 1.35, -.26, .74, .87, .06, "white")],
    "upper_cabinet": [box(0, .35, 0, 2.1, .68, .36, "ivory"), box(0, .35, .19, .035, .55, .035, "oak_light")],
    "dining_table": table(1.4, .78, .75),
    "dining_chair": [box(0, .47, 0, .44, .07, .43, "oak_light"), box(0, .75, -.19, .44, .55, .06, "oak_light")] + legs(.44, .43, .45),
    "shoe_cabinet": cabinet(1.55, 1.06, .33),
    "bench": [box(0, .47, 0, .95, .1, .35, "oak_light")] + legs(.95, .35, .42),
    "mirror": [box(0, .76, 0, .68, 1.52, .04, "oak"), box(0, .76, .024, .58, 1.41, .01, "stone")],
    "bed_double": bed(1.72, 2.02),
    "bedside": cabinet(.46, .52, .36),
    "wardrobe": cabinet(1.8, 2.37, .58, "ivory"),
    "table_lamp": [cyl(0, .03, 0, .22, .05, .22, "stone"), cyl(0, .23, 0, .04, .42, .04, "brass"), cyl(0, .47, 0, .32, .24, .32, "ivory")],
    "desk": table(1.65, .68, .75) + [box(0, .35, -.28, 1.3, .18, .16, "oak_light")],
    "office_chair": [box(0, .47, 0, .53, .12, .52, "sage"), box(0, .86, -.22, .5, .72, .11, "sage"), cyl(0, .22, 0, .05, .45, .05, "dark"), box(0, .04, 0, .58, .05, .58, "dark")],
    "bookcase": [box(0, 1.08, 0, 1.75, 2.15, .32, "oak_light")] + [box(0, y, .17, 1.66, .04, .32, "oak") for y in (.4, .82, 1.24, 1.66, 2.08)] + [box(x, y, .35, .19, .27, .11, "sage" if i % 2 else "ivory") for i, (x, y) in enumerate([(-.52,.57),(.16,.99),(.55,1.4),(-.17,1.82)])],
    "reading_chair": seat(.84, .78, "ivory"),
    "desk_lamp": [cyl(0, .03, 0, .2, .05, .2, "dark"), box(0, .25, 0, .035, .45, .035, "brass"), cyl(.1, .51, 0, .25, .14, .25, "ivory")],
    "sofa_bed": seat(1.85, 1.06, "ivory") + [box(0, .18, .19, 1.72, .16, .62, "sage")],
    "round_table": [cyl(0, .42, 0, .72, .06, .72, "oak_light"), cyl(0, .21, 0, .13, .4, .13, "oak")],
    "low_cabinet": cabinet(1.4, .64, .4),
    "luggage_rack": [box(0, .53, 0, .72, .08, .43, "oak_light")] + legs(.7, .42, .49),
    "rug": [cyl(0, .014, 0, 1.85, .028, 1.28, "ivory")],
    "bed_single": bed(.96, 1.83),
    "low_bookshelf": cabinet(1.28, .79, .38) + [box(0, .5, .23, 1.1, .05, .38, "oak")],
    "kids_table": table(.9, .54, .55),
    "kids_chair": [box(0, .32, 0, .34, .06, .32, "sage"), box(0, .57, -.13, .34, .5, .05, "sage")] + legs(.34, .32, .3),
    "toy_shelf": cabinet(1.04, .86, .36) + [box(x, .87, .02, .23, .23, .22, mat) for x, mat in [(-.33, "sage"), (0, "stone"), (.33, "ivory")]],
    "round_rug": [cyl(0, .014, 0, 1.65, .028, 1.65, "sage")],
}

assert len(assets) == 32
for name, parts in assets.items():
    build_asset(name, parts)
print(f"Generated {len(assets)} GLB assets in {OUT}")
