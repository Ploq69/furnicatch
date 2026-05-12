#!/usr/bin/env python3
"""
Contract: letter drops and spelling progress must belong to the active zone.

Required behavior:
- The active letter pool follows the player's actual zone.
- Floating block drops use the block/zone id, not stale currentZoneId state.
- Zone completion records progress for the zone being completed.
"""
import sys

from zone_contract_common import CheckResult, fail_if, function_body, print_report, read_js


def main() -> int:
    game = read_js("Game.js")
    loop = function_body(game, "_loop")
    sync_zone = function_body(game, "_syncCurrentZoneFromPosition")
    mining_section = function_body(game, "_findMiningTarget")

    checks: list[CheckResult] = [
        fail_if("getZoneAtPosition" not in loop and "getZoneAtPosition" not in sync_zone,
                "Game loop must determine the player's actual current zone from position."),
        fail_if("setCurrentZone" not in loop and "setCurrentZone" not in sync_zone,
                "Game loop must update ZoneManager when the player enters a new zone."),
        fail_if("letterPool.setLetters" not in loop and "letterPool.setLetters" not in sync_zone,
                "LetterPool must update when current zone changes."),
        fail_if("nearestBlock.zoneId" not in game and "block.zoneId" not in game,
                "Letter drops from mined floating blocks must be associated with the mined block's zone."),
        fail_if("pickRandomLetter" in game and "zoneId" not in game[game.find("pickRandomLetter") - 500:game.find("pickRandomLetter") + 500],
                "Letter drop code must select letters from the block/current zone, not a stale global pool."),
        fail_if("currentZoneId" in mining_section,
                "Mining checks should use the target block's zoneId, not only currentZoneId."),
    ]

    return print_report("letter_zone_sync_contract", checks)


if __name__ == "__main__":
    sys.exit(main())
