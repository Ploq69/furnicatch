#!/usr/bin/env python3
"""
Shared helpers for Voidloop zone progression contract validators.

These scripts intentionally validate behavior contracts, not just whether a
keyword appears somewhere. They are still static checks, so each validator
looks for implementation anchors that are hard to satisfy accidentally.
"""
from __future__ import annotations

import pathlib
import re
from dataclasses import dataclass


REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
JS_ROOT = REPO_ROOT / "voidloop" / "js"
DOC_ROOT = REPO_ROOT / "voidloop" / "docs"


ZONES = ["forest", "fire", "ice", "desert", "steelworks", "mire", "citadel"]
ZONE_PICKAXES = {
    "forest": "forest_pickaxe",
    "fire": "fire_pickaxe",
    "ice": "ice_pickaxe",
    "desert": "desert_pickaxe",
    "steelworks": "steel_pickaxe",
    "mire": "mire_pickaxe",
    "citadel": "royal_pickaxe",
}
ZONE_SUITS = {
    "fire": "fire_suit",
    "ice": "ice_suit",
    "desert": "desert_suit",
    "steelworks": "ventilator_suit",
    "mire": "wading_boots",
    "citadel": "royal_shield",
}
ZONE_STAVES = {
    "fire": "fire_staff",
    "ice": "ice_staff",
    "desert": "desert_staff",
    "steelworks": "tesla_staff",
    "mire": "vine_staff",
    "citadel": "scepter",
}
BASE_PICKAXE_COSTS = {
    "fire_pickaxe": 300,
    "ice_pickaxe": 600,
    "desert_pickaxe": 1000,
    "steel_pickaxe": 2000,
    "mire_pickaxe": 3500,
    "royal_pickaxe": 5000,
}
BLOCK_TIERS = {
    "forest": ["mossy_stone", "forest_crystal", "amber_ore", "ancient_wood"],
    "fire": ["scorched_rock", "magma_crystal", "obsidian", "ember_core"],
    "ice": ["packed_ice", "frost_crystal", "glacial_ore", "blizzard_core"],
    "desert": ["sandstone_block", "desert_crystal", "desert_gold_ore", "sun_core"],
    "steelworks": ["rusted_scrap", "factory_crystal", "alloy_ore", "furnace_core"],
    "mire": ["mud_clump", "moss_crystal", "petrified_log", "heart_of_the_mire"],
    "citadel": ["castle_brick", "royal_crystal", "citadel_gold_ore", "crown_core"],
}


@dataclass
class CheckResult:
    passed: bool
    message: str


def read_js(filename: str) -> str:
    path = JS_ROOT / filename
    if not path.exists():
        raise FileNotFoundError(path)
    return path.read_text()


def read_doc(filename: str) -> str:
    path = DOC_ROOT / filename
    if not path.exists():
        raise FileNotFoundError(path)
    return path.read_text()


def section_between(content: str, start: str, end: str | None = None) -> str:
    start_idx = content.find(start)
    if start_idx == -1:
        return ""
    if end is None:
        return content[start_idx:]
    end_idx = content.find(end, start_idx + len(start))
    if end_idx == -1:
        return content[start_idx:]
    return content[start_idx:end_idx]


def function_body(content: str, name: str) -> str:
    match = re.search(rf"{re.escape(name)}\s*\([^)]*\)\s*{{", content)
    if not match:
        return ""
    idx = match.end()
    depth = 1
    while idx < len(content) and depth > 0:
        if content[idx] == "{":
            depth += 1
        elif content[idx] == "}":
            depth -= 1
        idx += 1
    return content[match.start():idx]


def has_all(content: str, needles: list[str]) -> bool:
    return all(needle in content for needle in needles)


def print_report(name: str, checks: list[CheckResult]) -> int:
    errors = [check.message for check in checks if not check.passed]
    if errors:
        print(f"FAIL: {name}")
        for error in errors:
            print(f"  - {error}")
        return 1
    print(f"PASS: {name} — contract satisfied")
    return 0


def ok(message: str) -> CheckResult:
    return CheckResult(True, message)


def fail_if(condition: bool, message: str) -> CheckResult:
    return CheckResult(not condition, message)
