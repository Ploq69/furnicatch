#!/usr/bin/env python3
"""
Contract: floating block mining must follow the zone pickaxe progression plan.

Required behavior:
- Every floating block knows its zone id.
- Floating blocks require the real pickaxe tool, not any weapon.
- The equipped zone pickaxe must match the block's zone.
- Zone pickaxe tier gates block tier.
- Too-hard blocks produce explicit blocked feedback instead of being skipped.
"""
import sys

from zone_contract_common import (
    CheckResult,
    fail_if,
    function_body,
    print_report,
    read_js,
)


def main() -> int:
    game = read_js("Game.js")
    world = read_js("World.js")
    find_mineable = function_body(game, "_findMineableBlock")
    place_floating = function_body(world, "_placeFloatingBlock")
    spawn_zone = function_body(world, "_spawnFloatingBlocksZone")

    checks: list[CheckResult] = [
        fail_if("block.zoneId" not in place_floating, "World._placeFloatingBlock must assign block.zoneId from floating block data."),
        fail_if("zoneId" not in spawn_zone, "World._spawnFloatingBlocksZone must pass the source zone id into each floating block."),
        fail_if("blockIsFloating && !isPickaxe" not in find_mineable and "isPickaxe === false" not in find_mineable,
                "Game._findMineableBlock must reject floating blocks when the active tool is not the pickaxe."),
        fail_if("getEquippedTool" not in find_mineable,
                "Mining must check Inventory/Player equipped tool, not only the hotbar weapon id."),
        fail_if("pickaxeId" not in find_mineable,
                "Mining must compare the equipped tool to the current zone's pickaxeId."),
        fail_if("getPickaxeTier" not in find_mineable or "blockDef.tier" not in find_mineable,
                "Mining must compare zone pickaxe tier against the floating block tier."),
        fail_if("showMiningBlocked" not in game and "showBlockLocked" not in game and "blockedMine" not in game,
                "Too-hard or wrong-tool blocks need a dedicated blocked feedback path, not silent target skipping."),
        fail_if("continue;" in find_mineable and "zonePickaxeTier < blockDef.tier" in find_mineable and "showFloatingText" not in find_mineable,
                "Tier-locked blocks are currently skipped before feedback; nearest blocked target should explain the lock."),
    ]

    return print_report("mining_mechanics_contract", checks)


if __name__ == "__main__":
    sys.exit(main())
