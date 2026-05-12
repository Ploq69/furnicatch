#!/usr/bin/env python3
"""
Contract: first-zone progression must be understandable with minimal text.

Required behavior:
- HUD/objective state uses icons/pips for mine, sell, upgrade, spell, gate.
- Blocks expose lock/tier cues.
- Shop highlights the next affordable/required pickaxe upgrade.
- Gates show icon requirements, not only sentence labels.
"""
import sys

from zone_contract_common import CheckResult, fail_if, print_report, read_js


def main() -> int:
    ui = read_js("UIManager.js")
    game = read_js("Game.js")
    shop_ui = read_js("ShopUI.js")
    html = (read_js("../index.html") if False else (read_js.__globals__["JS_ROOT"].parent / "index.html").read_text())

    checks: list[CheckResult] = [
        fail_if("objective" not in ui.lower() and "quest" not in ui.lower(),
                "UIManager must expose an icon-based objective/quest HUD for the current next action."),
        fail_if("showMiningBlocked" not in ui and "showBlockLocked" not in ui,
                "UIManager must show non-verbal blocked mining feedback with lock/tier cues."),
        fail_if("pickaxe-tier" not in html and "tier-pip" not in html and "pickaxePip" not in ui,
                "UI must include pickaxe tier pips/icons for child-readable progression."),
        fail_if("nextUpgrade" not in shop_ui and "recommended" not in shop_ui.lower() and "canUpgradePickaxeTier" not in shop_ui,
                "Shop UI must highlight the next relevant/affordable pickaxe upgrade."),
        fail_if("gateway" not in ui.lower() or ("icon" not in ui.lower() and "requirement" not in ui.lower()),
                "Gate UI must show icon requirements for letters/enemies/gear/completion."),
        fail_if("Need " in game and "showMiningBlocked" not in game,
                "Gameplay feedback should move away from sentence-only 'Need ...' messages toward icon feedback."),
    ]

    return print_report("player_guidance_contract", checks)


if __name__ == "__main__":
    sys.exit(main())
