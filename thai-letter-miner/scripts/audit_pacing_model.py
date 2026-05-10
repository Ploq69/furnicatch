#!/usr/bin/env python3
import re
import sys
from audit_common import read, ROOT, ok, fail


def number_after(name, text):
    match = re.search(rf"{name}:\s*([0-9.]+)", text)
    if not match:
        raise ValueError(f"missing {name}")
    return float(match.group(1))


def main():
    print("PACING MODEL")
    errors = 0
    config = read(ROOT / "js" / "config.js")
    queue = read(ROOT / "js" / "DiscoveryQueue.js")

    max_quizzes = number_after("surveyReportMaxQuizzes", config)
    forced_gap = number_after("forcedQuizMinSeconds", config)
    chest_threshold = number_after("studyChestThreshold", config)
    stages = len(re.findall(r"name:\s*'", config))

    if max_quizzes <= 3:
        ok("end-run Survey Report caps automatic quizzes at 3")
    else:
        fail("Survey Report can exceed 3 automatic quizzes")
        errors += 1
    if forced_gap >= 20:
        ok("in-run forced quiz gap is at least 20 seconds")
    else:
        fail("in-run forced quiz gap is too short")
        errors += 1
    if chest_threshold <= 12:
        ok("queue overflow can become Study Chests before huge quiz chains")
    else:
        fail("Study Chest threshold is too high")
        errors += 1
    if "duplicateConsolidation: true" in config and "_takeBestBundle" in queue:
        ok("duplicate consolidation is configured and implemented")
    else:
        fail("duplicate consolidation missing")
        errors += 1
    if stages >= 5 and all(label in config for label in ["Scrappy Quarry", "First Overpower", "Vowel Burst", "Chain Mining High", "Mastery Gate"]):
        ok("pacing stages cover OP and difficulty burst arcs")
    else:
        fail("pacing stages incomplete")
        errors += 1

    simulated_finds = 80
    automatic_questions = min(max_quizzes, simulated_finds)
    overflow = simulated_finds - automatic_questions
    if automatic_questions <= 3 and overflow > 0:
        ok("simulated OP clear avoids long quiz chain")
    else:
        fail("simulated OP clear can generate quiz spam")
        errors += 1

    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
