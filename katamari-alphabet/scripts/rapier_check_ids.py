#!/usr/bin/env python3
"""Validate Rapier checklist ID hygiene.

This catches accidental renumbering, duplicated IDs, or gaps in the guide.
It is intentionally stricter than a normal Markdown lint because the IDs are
the contract between the implementation guide and source-code markers.
"""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GUIDE = ROOT / "docs" / "RAPIER_MIGRATION_GUIDE.md"
ID_RE = re.compile(r"\bKA-RAPIER-(\d{3})\b")


def main() -> int:
    if not GUIDE.exists():
        print(f"Missing guide: {GUIDE}", file=sys.stderr)
        return 2

    text = GUIDE.read_text(encoding="utf-8")
    numbers = [int(value) for value in ID_RE.findall(text)]
    counts = Counter(numbers)
    duplicates = sorted(number for number, count in counts.items() if count > 1)
    expected = list(range(1, max(numbers, default=0) + 1))
    missing = sorted(set(expected) - set(numbers))

    if not numbers:
        print("No KA-RAPIER IDs found.")
        return 1

    print(f"Found {len(numbers)} IDs from KA-RAPIER-{min(numbers):03d} to KA-RAPIER-{max(numbers):03d}.")

    if duplicates:
        print("Duplicate IDs:")
        for number in duplicates:
            print(f"  - KA-RAPIER-{number:03d}")

    if missing:
        print("Missing IDs:")
        for number in missing:
            print(f"  - KA-RAPIER-{number:03d}")

    if duplicates or missing:
        return 1

    print("ID hygiene OK.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
