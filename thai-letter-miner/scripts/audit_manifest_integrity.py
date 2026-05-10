#!/usr/bin/env python3
import sys
from collections import Counter, defaultdict
from audit_common import REQUIRED_COUNTS, parse_manifest, ok, fail


REQUIRED_FIELDS = ["id", "glyph", "category", "thaiName", "romanizedName", "audioText", "modelFile", "unlockTier", "confuserGroup"]


def main():
    print("MANIFEST INTEGRITY")
    items = parse_manifest()
    errors = 0
    if len(items) == 67:
        ok("manifest has 67 Thai script items")
    else:
        fail(f"manifest has {len(items)} items, expected 67")
        errors += 1

    ids = [item.get("id") for item in items]
    dupes = [item for item, count in Counter(ids).items() if count > 1]
    if not dupes:
        ok("ids are unique")
    else:
        fail(f"duplicate ids: {dupes}")
        errors += 1

    missing = []
    for item in items:
      for field in REQUIRED_FIELDS:
        if field not in item or item[field] in ("", None):
          missing.append((item.get("id", "<unknown>"), field))
    if not missing:
        ok("all required schema fields are present")
    else:
        fail(f"missing fields: {missing[:12]}")
        errors += 1

    counts = Counter(item["category"] for item in items)
    for category, expected in REQUIRED_COUNTS.items():
        if counts[category] >= expected:
            ok(f"{category} count {counts[category]} >= {expected}")
        else:
            fail(f"{category} count {counts[category]} < {expected}")
            errors += 1

    distractors = defaultdict(list)
    for item in items:
        distractors[(item["category"], item["confuserGroup"])].append(item)
    bad = []
    for item in items:
        same_group = [other for other in distractors[(item["category"], item["confuserGroup"])] if other["id"] != item["id"]]
        same_category = [other for other in items if other["category"] == item["category"] and other["id"] != item["id"]]
        all_other = [other for other in items if other["id"] != item["id"]]
        if len([*same_group, *same_category, *all_other]) < 2:
            bad.append(item["id"])
    if not bad:
        ok("every quiz item has at least two possible distractors")
    else:
        fail(f"items without distractors: {bad}")
        errors += 1

    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
