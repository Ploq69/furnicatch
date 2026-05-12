#!/usr/bin/env python3
"""
Contract: floating block placement must teach T1 -> T4 progression.

Required behavior:
- Each zone has exactly four ordered floating block types.
- World generation places tiers intentionally, not uniform random scatter.
- T1 appears near spawn; higher tiers appear deeper/farther or in later bands.
- Locked tiers can be visible, but not mineable.
"""
import re
import sys

from zone_contract_common import BLOCK_TIERS, CheckResult, fail_if, function_body, print_report, read_js


def main() -> int:
    zone_data = read_js("ZoneData.js")
    world = read_js("World.js")
    spawn_zone = function_body(world, "_spawnFloatingBlocksZone")

    checks: list[CheckResult] = []
    for zone, ordered_blocks in BLOCK_TIERS.items():
        expected = ", ".join(f"'{b}'" for b in ordered_blocks)
        zone_match = re.search(rf"id:\s*'{re.escape(zone)}'.*?floatingBlockTypes:\s*\[([^\]]+)\]", zone_data, re.S)
        checks.append(fail_if(zone_match is None, f"{zone} must define floatingBlockTypes."))
        if zone_match:
            actual_items = [x.strip().strip("'\"") for x in zone_match.group(1).split(",")]
            checks.append(fail_if(actual_items != ordered_blocks,
                                  f"{zone} floatingBlockTypes must be ordered T1-T4: {expected}."))

    checks.extend([
        fail_if("rng.choice(types)" in spawn_zone,
                "Floating blocks must not be placed by uniform rng.choice(types); placement must be tier-banded."),
        fail_if("tier" not in spawn_zone,
                "World._spawnFloatingBlocksZone must reason about block tier while placing clusters."),
        fail_if("dSpawn" not in spawn_zone or ("nearSpawn" not in spawn_zone and "distanceBand" not in spawn_zone and "tierBand" not in spawn_zone),
                "Placement must intentionally put T1 near spawn and higher tiers farther/deeper."),
        fail_if("locked" not in spawn_zone and "preview" not in spawn_zone and "visible" not in spawn_zone,
                "Locked higher-tier blocks should have an intentional visible/locked placement policy."),
    ])

    return print_report("floating_block_layout_contract", checks)


if __name__ == "__main__":
    sys.exit(main())
