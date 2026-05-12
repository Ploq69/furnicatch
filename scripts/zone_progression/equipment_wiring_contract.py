#!/usr/bin/env python3
"""
Contract: shop purchases must equip functional gear and visual gear coherently.

Required behavior:
- Tool, armor, and weapon purchases all update Player functional slots.
- Staff/weapon equip calls Player.equipFunctionalWeapon.
- Inventory has explicit slot ownership/equipped state.
- Hazard and enemy systems read equipped gear from Inventory/Player.
"""
import sys

from zone_contract_common import (
    CheckResult,
    ZONE_STAVES,
    fail_if,
    function_body,
    print_report,
    read_js,
)


def main() -> int:
    game = read_js("Game.js")
    inventory = read_js("Inventory.js")
    player = read_js("Player.js")
    hazard = read_js("HazardSystem.js")
    equip_callback = function_body(game, "(itemId, isEquip) =>")

    checks: list[CheckResult] = [
        fail_if("equipFunctionalWeapon" not in game,
                "Game shop callbacks must call player.equipFunctionalWeapon for staff/weapon items."),
        fail_if("getEquippedWeapon" not in game,
                "Game combat gating must read the equipped functional weapon."),
        fail_if("equipped" not in inventory or "tool:" not in inventory or "armor:" not in inventory or "weapon:" not in inventory,
                "Inventory must track equipped tool, armor, and weapon slots."),
        fail_if("equipTool" not in player or "equipArmor" not in player or "equipFunctionalWeapon" not in player,
                "Player must expose functional equip methods for all gear slots."),
        fail_if("isEquipped" not in hazard and "getEquippedArmor" not in hazard,
                "Hazard mitigation must check equipped armor, not just ownership."),
        fail_if("equipArmor" in equip_callback and "equipFunctionalWeapon" not in equip_callback,
                "Current shop equip callback updates tool/armor but not functional weapon."),
    ]

    for item_id in ZONE_STAVES.values():
        checks.append(fail_if(item_id not in game and item_id not in inventory,
                              f"{item_id} must be reachable through functional equipment wiring."))

    return print_report("equipment_wiring_contract", checks)


if __name__ == "__main__":
    sys.exit(main())
