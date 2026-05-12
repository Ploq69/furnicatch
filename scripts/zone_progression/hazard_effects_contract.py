#!/usr/bin/env python3
"""
Contract: each zone hazard implements its specific effect and mitigation.

Required behavior:
- burn/toxic: periodic HP damage.
- freeze/quicksand: movement slowdown.
- heat/quicksand: stamina drain.
- curse: stun/interrupt effect.
- Each hazard uses its zone mitigation item and non-verbal warning cue.
"""
import sys

from zone_contract_common import CheckResult, ZONE_SUITS, fail_if, print_report, read_js


def main() -> int:
    hazard = read_js("HazardSystem.js")
    zone_data = read_js("ZoneData.js")

    checks: list[CheckResult] = [
        fail_if("damagePerSecond" not in hazard or "takeDamage" not in hazard,
                "HazardSystem must apply damagePerSecond hazards to HP."),
        fail_if("slowdownPercent" not in hazard,
                "HazardSystem must implement freeze/quicksand slowdownPercent."),
        fail_if("staminaDrainPerSecond" not in hazard,
                "HazardSystem must implement heat/quicksand staminaDrainPerSecond."),
        fail_if("stunChancePerSecond" not in hazard,
                "HazardSystem must implement citadel curse stunChancePerSecond."),
        fail_if("mitigationItem" not in hazard or "isEquipped" not in hazard,
                "Hazard mitigation must require the mitigation item to be equipped."),
        fail_if("showHazardWarning" not in hazard and "hazardIcon" not in hazard and "showFloatingText" not in hazard,
                "Hazards need immediate child-readable warning feedback."),
    ]

    for zone, item_id in ZONE_SUITS.items():
        checks.append(fail_if(item_id not in zone_data, f"{zone} must declare mitigation item {item_id}."))
        checks.append(fail_if(item_id not in hazard,
                              f"HazardSystem must explicitly support/check mitigation item {item_id}."))

    return print_report("hazard_effects_contract", checks)


if __name__ == "__main__":
    sys.exit(main())
