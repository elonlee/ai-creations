"""Weld coincident vertices, soften edges with Blender's bevel, and export the 32 GLBs.

Run with Blender Python (for example the `bpy` wheel for Python 3.13):
    python blender_finalize.py

The input GLBs are produced by generate_assets.py. This script replaces each
file only after Blender has exported a valid replacement into a staging folder.
"""
from __future__ import annotations

import os
import struct
from pathlib import Path

import bmesh
import bpy

ROOT = Path(__file__).parent
ASSETS = ROOT / "assets" / "furniture"
STAGING = ROOT / "assets" / ".blender-staging"
STAGING.mkdir(exist_ok=True)

files = sorted(ASSETS.glob("*.glb"))
if len(files) != 34:
    raise RuntimeError(f"Expected 34 assets, found {len(files)}")

for number, source in enumerate(files, 1):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        # Merge coincident face corners so Blender's bevel acts on real manifold edges.
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(obj.data)
        bm.free()

        bevel = obj.modifiers.new("Soft edges", "BEVEL")
        bevel.width = 0.005
        bevel.segments = 1
        bevel.limit_method = "ANGLE"
        bevel.angle_limit = 0.52
        bevel.loop_slide = True
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        for poly in obj.data.polygons:
            poly.use_smooth = False
    target = STAGING / source.name
    bpy.ops.export_scene.gltf(filepath=str(target), export_format="GLB", export_apply=True, export_yup=True)
    data = target.read_bytes()
    if data[:4] != b"glTF" or struct.unpack_from("<I", data, 8)[0] != len(data):
        raise RuntimeError(f"Invalid Blender export: {target}")
    os.replace(target, source)
    print(f"[{number:02}/32] Blender export: {source.name}")

STAGING.rmdir()
print("34 Blender GLBs finalized")
