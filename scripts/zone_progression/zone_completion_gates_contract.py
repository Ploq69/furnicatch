#!/usr/bin/env python3
"""
Contract: zone gates unlock from completion, not proximity alone.

Required behavior:
- Zone state tracks completed zones separately from unlocked zones.
- Completion requires all zone letters spelled and all zone enemies defeated.
- Gates check previous-zone completion before unlocking the next zone.
- Current zone / letter pool follows the player's actual zone.
"""
import sys

from zone_contract_common import (
    ZONES,
    CheckResult,
    fail_if,
    function_body,
    print_report,
    read_js,
)


def main() -> int:
    game = read_js("Game.js")
    zone_manager = read_js("ZoneManager.js")
    zone_data = read_js("ZoneData.js")
    check_gateway = function_body(zone_manager, "checkGateway")
    check_gateways = function_body(game, "_checkGateways")

    checks: list[CheckResult] = [
        fail_if("completedZones" not in zone_manager and "completed" not in zone_manager,
                "ZoneManager must persist completed zone state separately from unlocked zones."),
        fail_if("markZoneCompleted" not in zone_manager and "completeZone" not in zone_manager,
                "ZoneManager needs an explicit method to mark a zone complete."),
        fail_if("allSpelledForLevel" not in game,
                "Game must require all zone letters to be spelled before zone completion."),
        fail_if("aliveZoneEnemies" not in game and ("every(e => e.dead)" not in game and ".every(" not in game),
                "Game must require all relevant zone enemies to be defeated before zone completion."),
        fail_if("completed" not in check_gateway and "isZoneCompleted" not in check_gateway,
                "ZoneManager.checkGateway must check previous-zone completion."),
        fail_if("status.canEnter" in check_gateways and "unlockZone" in check_gateways and "complete" not in check_gateways.lower(),
                "Game._checkGateways currently unlocks from canEnter/proximity without a completion check."),
        fail_if("setCurrentZone(" not in game,
                "Game must update ZoneManager.currentZoneId when the player enters a new zone."),
        fail_if("getZoneAtPosition" in game and ("letterPool.setLetters" not in game or "_syncCurrentZoneFromPosition" not in game),
                "Letter pool must refresh when player position moves into a different zone."),
    ]

    for zone in ZONES[1:]:
        checks.append(fail_if(zone not in zone_data, f"{zone} must remain defined in ZoneData."))

    return print_report("zone_completion_gates_contract", checks)


if __name__ == "__main__":
    sys.exit(main())
