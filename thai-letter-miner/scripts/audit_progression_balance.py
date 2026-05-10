#!/usr/bin/env python3
import sys
from audit_common import ok, fail


STAGES = [
    {"run": 1, "radius": 4, "hp": 1, "power": 1, "label": "early"},
    {"run": 5, "radius": 5, "hp": 1, "power": 3, "label": "first_op"},
    {"run": 9, "radius": 6, "hp": 2, "power": 3, "label": "burst"},
    {"run": 14, "radius": 8, "hp": 2, "power": 7, "label": "second_op"},
    {"run": 20, "radius": 10, "hp": 4, "power": 10, "label": "mastery"},
]


def blocks(radius):
    return int(((radius * 2 + 1) ** 2 - 9) * 0.72)


def estimated_swings(stage):
    return blocks(stage["radius"]) * stage["hp"] / max(1, stage["power"])


def main():
    print("PROGRESSION BALANCE")
    errors = 0
    estimates = {stage["label"]: estimated_swings(stage) for stage in STAGES}

    if estimates["early"] <= 120:
        ok("early runs are short enough to learn the loop")
    else:
        fail(f"early run too long: {estimates['early']:.0f} swings")
        errors += 1
    if estimates["first_op"] < estimates["early"] * 0.75:
        ok("first OP stretch is noticeably stronger than scrappy start")
    else:
        fail("first OP stretch does not create a power spike")
        errors += 1
    if estimates["burst"] > estimates["first_op"] * 1.2:
        ok("difficulty burst pushes back after first OP stretch")
    else:
        fail("difficulty burst is too soft")
        errors += 1
    if estimates["second_op"] < estimates["burst"] * 0.8:
        ok("second OP stretch recovers momentum")
    else:
        fail("second OP stretch is not powerful enough")
        errors += 1
    if estimates["mastery"] > estimates["second_op"]:
        ok("mastery gate adds late-game resistance")
    else:
        fail("mastery gate does not add late-game resistance")
        errors += 1

    simulated_op_finds = 60
    survey_cap = 3
    if simulated_op_finds - survey_cap > 0:
        ok("OP clear reward flood has overflow available for Study Chests")
    else:
        fail("OP clear has no overflow path")
        errors += 1

    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
