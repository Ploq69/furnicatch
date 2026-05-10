#!/usr/bin/env python3
import json
import struct
import sys
from audit_common import GLB_ROOT, OBJ_ROOT, parse_manifest, ok, fail


def read_glb(path):
    data = path.read_bytes()
    magic, version, length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or length != len(data):
        raise ValueError("invalid GLB header")
    offset = 12
    chunks = {}
    while offset < len(data):
        chunk_len, chunk_type = struct.unpack_from("<I4s", data, offset)
        offset += 8
        chunks[chunk_type] = data[offset:offset + chunk_len]
        offset += chunk_len
    if b"JSON" not in chunks:
        raise ValueError("missing JSON chunk")
    return json.loads(chunks[b"JSON"].decode("utf-8"))


def obj_vertex_count(path):
    count = 0
    with path.open(encoding="utf-8", errors="ignore") as fh:
        for line in fh:
            if line.startswith("v "):
                count += 1
    return count


def main():
    print("THAI MODEL GEOMETRY")
    errors = 0
    bad = []
    for item in parse_manifest():
        glb = GLB_ROOT / f"{item['id']}.glb"
        obj = OBJ_ROOT / item["modelFile"]
        try:
            doc = read_glb(glb)
        except Exception as exc:
            bad.append((item["id"], f"unreadable GLB: {exc}"))
            continue
        generator = str(doc.get("asset", {}).get("generator", "")).lower()
        if "placeholder" in generator or "minimal" in generator:
            bad.append((item["id"], f"bad generator metadata: {generator}"))
        primitives = [prim for mesh in doc.get("meshes", []) for prim in mesh.get("primitives", [])]
        if not primitives:
            bad.append((item["id"], "no mesh primitives"))
            continue
        accessors = doc.get("accessors", [])
        position_counts = []
        valid_bounds = False
        for prim in primitives:
            pos_index = prim.get("attributes", {}).get("POSITION")
            if pos_index is None or pos_index >= len(accessors):
                continue
            accessor = accessors[pos_index]
            position_counts.append(accessor.get("count", 0))
            mins = accessor.get("min") or []
            maxs = accessor.get("max") or []
            if len(mins) == 3 and len(maxs) == 3:
                spans = [abs(maxs[i] - mins[i]) for i in range(3)]
                if max(spans) > 0.01:
                    valid_bounds = True
        vertex_count = sum(position_counts)
        source_vertices = obj_vertex_count(obj)
        if vertex_count < 20:
            bad.append((item["id"], f"too few GLB vertices: {vertex_count}"))
        if source_vertices and vertex_count < max(20, source_vertices * 0.25):
            bad.append((item["id"], f"GLB vertex count {vertex_count} suspicious vs OBJ {source_vertices}"))
        if not valid_bounds:
            bad.append((item["id"], "missing/non-meaningful POSITION bounds"))
    if bad:
        fail(f"bad Thai model geometry: {bad[:20]}")
        errors += 1
    else:
        ok("all Thai GLBs contain real mesh geometry with meaningful bounds")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
