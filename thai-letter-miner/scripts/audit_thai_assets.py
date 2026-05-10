#!/usr/bin/env python3
import sys
from collections import Counter
from audit_common import OBJ_ROOT, GLB_ROOT, REQUIRED_COUNTS, parse_manifest, ok, fail


def main():
    print("THAI ASSETS")
    items = parse_manifest()
    errors = 0

    obj_files = sorted(OBJ_ROOT.glob("Thai Letters_OBJ/*.obj"))
    if len(obj_files) == 67:
        ok("all 67 OBJ source files extracted")
    else:
        fail(f"{len(obj_files)} OBJ files extracted, expected 67")
        errors += 1

    missing_models = []
    for item in items:
        if not (OBJ_ROOT / item["modelFile"]).exists():
            missing_models.append(item["modelFile"])
    if not missing_models:
        ok("every manifest modelFile points to an extracted OBJ")
    else:
        fail(f"missing OBJ references: {missing_models[:12]}")
        errors += 1

    counts = Counter(item["category"] for item in items)
    for category, expected in REQUIRED_COUNTS.items():
        if counts[category] >= expected:
            ok(f"{category} planned minimum met")
        else:
            fail(f"{category} planned minimum missing")
            errors += 1

    glb_files = sorted(GLB_ROOT.glob("*.glb"))
    if len(glb_files) >= 67:
        ok("converted GLB files exist for every Thai source item")
    else:
        fail(f"only {len(glb_files)} GLB files found; run scripts/convert_obj_to_glb.py before final signoff")
        errors += 1

    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
