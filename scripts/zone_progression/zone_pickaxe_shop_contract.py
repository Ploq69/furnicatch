#!/usr/bin/env python3
"""
Contract: the shop must expose the per-zone pickaxe ladder.

Required behavior:
- Base zone pickaxes use the design-doc costs.
- Buying a base zone pickaxe initializes that zone's tier to T1.
- The shop UI renders zone-specific T2/T3/T4 upgrades.
- The UI calls ShopManager.upgradePickaxeTier(zoneId).
- The old global pick_tier upgrade cannot be the main block-unlock mechanism.
"""
from __future__ import annotations

import re
import sys

from zone_contract_common import (
    BASE_PICKAXE_COSTS,
    ZONE_PICKAXES,
    CheckResult,
    fail_if,
    function_body,
    print_report,
    read_js,
)


def item_cost(content: str, item_id: str) -> int | None:
    match = re.search(rf"id:\s*'{re.escape(item_id)}'[^}}]*cost:\s*(\d+)", content, re.S)
    return int(match.group(1)) if match else None


def main() -> int:
    shop = read_js("ShopManager.js")
    shop_ui = read_js("ShopUI.js")
    game = read_js("Game.js")
    buy_item = function_body(shop, "buyItem")
    render_upgrades = function_body(shop_ui, "_renderUpgrades")

    checks: list[CheckResult] = []
    for item_id, expected in BASE_PICKAXE_COSTS.items():
        actual = item_cost(shop, item_id)
        checks.append(fail_if(actual is None, f"{item_id} must be defined in SHOP_ITEMS."))
        checks.append(fail_if(actual is not None and actual != expected,
                              f"{item_id} cost must be {expected}, got {actual}."))

    for zone, pickaxe in ZONE_PICKAXES.items():
        if zone == "forest":
            continue
        checks.append(fail_if(pickaxe not in shop, f"{pickaxe} must exist as the base pickaxe for {zone}."))

    checks.extend([
        fail_if("pickaxeTiers" not in buy_item or "= 1" not in buy_item,
                "ShopManager.buyItem must initialize a purchased zone pickaxe to tier 1."),
        fail_if("PICKAXE_TIER_UPGRADES" not in shop_ui and "getPickaxeTierStatus" not in shop_ui,
                "ShopUI must render zone-specific pickaxe tier upgrades."),
        fail_if("upgradePickaxeTier" not in shop_ui and "upgradePickaxeTier" not in game,
                "Clicking a zone tier upgrade must call ShopManager.upgradePickaxeTier(zoneId)."),
        fail_if("pick_tier" in render_upgrades and "zoneId" not in render_upgrades,
                "The generic pick_tier card must not be the only visible pickaxe progression UI."),
        fail_if("forest_pickaxe" not in shop and "forest" not in buy_item,
                "Forest T1 starter state must be explicit so reset/new-save behavior is testable."),
    ])

    return print_report("zone_pickaxe_shop_contract", checks)


if __name__ == "__main__":
    sys.exit(main())
