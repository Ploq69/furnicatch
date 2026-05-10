#!/usr/bin/env python3
import re
import sys
from audit_common import all_source, ok, fail


CHECKS = [
    ("run completion by block clear", r"world\.blocks\.size\s*>\s*0|world\.blocks\.size\s*===\s*0"),
    ("Discovery Queue", r"class\s+DiscoveryQueue"),
    ("Survey Report", r"buildSurveyReport|Survey Report"),
    ("Study Chests", r"studyChests|Study Chests|addStudyChest"),
    ("quiz consolidation", r"duplicateConsolidation|_takeBestBundle|rewardCount"),
    ("pet slots", r"petSlots|pet_slot"),
    ("pet mining", r"class\s+PetSystem[\s\S]+breakBlock\(target|LetterPet[\s\S]+takeDamage"),
    ("category unlocks", r"unlockTier|getUnlockedItems|pacing\.stages"),
    ("tone prestige", r"tonePrestige|Tone Prestige"),
    ("OP mining tools", r"twin_strike|chain_crack|quarry_burst"),
    ("anti fatigue caps", r"surveyReportMaxQuizzes|forcedQuizMinSeconds|studyChestThreshold"),
]


def main():
    print("FEATURE PLAN")
    source = all_source()
    errors = 0
    for label, pattern in CHECKS:
        if re.search(pattern, source, re.S):
            ok(label)
        else:
            fail(label)
            errors += 1
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
