#!/usr/bin/env python3
"""Report Rapier migration checklist progress.

KA-RAPIER-039: no-browser static verifier for guide IDs and source markers.
KA-RAPIER-040: manual QA checklist is enforced as a tracked migration feature.

The guide is the source of truth. A feature is considered implemented only when:
1. Its checkbox is checked in docs/RAPIER_MIGRATION_GUIDE.md.
2. The same KA-RAPIER-* ID appears in one of the source files.

Use --strict as a CI/local gate once implementation begins.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GUIDE = ROOT / "docs" / "RAPIER_MIGRATION_GUIDE.md"
SOURCE_GLOBS = ("js/*.js", "index.html", "scripts/*.py")
FEATURE_RE = re.compile(r"^- \[(?P<mark>[ xX])\] \*\*(?P<id>KA-RAPIER-\d{3})\*\* (?P<title>.+)$")


@dataclass(frozen=True)
class Feature:
    id: str
    title: str
    checked: bool


def read_features() -> list[Feature]:
    if not GUIDE.exists():
        raise SystemExit(f"Missing guide: {GUIDE}")

    features: list[Feature] = []
    for line in GUIDE.read_text(encoding="utf-8").splitlines():
      match = FEATURE_RE.match(line.strip())
      if not match:
          continue
      features.append(
          Feature(
              id=match.group("id"),
              title=match.group("title").strip(),
              checked=match.group("mark").lower() == "x",
          )
      )
    return features


def source_marker_ids() -> set[str]:
    ids: set[str] = set()
    for pattern in SOURCE_GLOBS:
        for path in ROOT.glob(pattern):
            if path == GUIDE or not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            ids.update(re.findall(r"KA-RAPIER-\d{3}", text))
    return ids


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict", action="store_true", help="fail unless every feature is checked and has a source marker")
    args = parser.parse_args()

    features = read_features()
    if not features:
        print(f"No KA-RAPIER features found in {GUIDE}", file=sys.stderr)
        return 2

    markers = source_marker_ids()
    feature_ids = {feature.id for feature in features}
    unknown_markers = sorted(markers - feature_ids)
    checked_missing_markers = [feature for feature in features if feature.checked and feature.id not in markers]
    unchecked = [feature for feature in features if not feature.checked]

    print("Rapier migration progress")
    print(f"Guide: {GUIDE}")
    print(f"Features: {len(features)}")
    print(f"Checked: {len(features) - len(unchecked)}")
    print(f"Source markers: {len(markers & feature_ids)}")
    print()

    if unchecked:
        print("Unchecked features:")
        for feature in unchecked:
            print(f"  - {feature.id}: {feature.title}")
        print()

    if checked_missing_markers:
        print("Checked in guide but missing source markers:")
        for feature in checked_missing_markers:
            print(f"  - {feature.id}: {feature.title}")
        print()

    if unknown_markers:
        print("Unknown source markers not listed in guide:")
        for marker in unknown_markers:
            print(f"  - {marker}")
        print()

    if args.strict and (unchecked or checked_missing_markers or unknown_markers):
        print("STRICT CHECK FAILED")
        return 1

    if checked_missing_markers or unknown_markers:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
