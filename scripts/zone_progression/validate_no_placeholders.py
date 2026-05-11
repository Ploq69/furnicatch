#!/usr/bin/env python3
"""
Validate that no placeholders, TODOs, or stub implementations exist
in the zone progression codebase. Ensures everything was actually implemented.
"""

import os
import re
import sys

BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'voidloop', 'js')

PLACEHOLDER_PATTERNS = [
    r'\/\/\s*TODO',
    r'\/\/\s*FIXME',
    r'\/\*\s*TODO',
    r'not implemented',
    r'not yet implemented',
    r'placeholder',
    r'stub',
    r'\bWIP\b',
    r'work in progress',
    r'coming soon',
    r'\\.\.\\.',
    r'\/\/\s*implement',
    r'function.*\{\s*\}\s*$',  # empty function body
    r'throw new Error\([\'"]Not implemented[\'"]\)',
    r'return null\s*\/\/\s*placeholder',
    r'console\.log\([\'"].*placeholder',
    r'\/\/\s*temp',
    r'\/\/\s*temporary',
]

SKIP_FILES = ['SettingsManager.js', 'SettingsMenu.js', 'MainMenu.js', 'LobbyManager.js']

def scan_file(filepath, rel_path):
    issues = []
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines, 1):
        for pattern in PLACEHOLDER_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                issues.append((i, line.strip(), pattern))
                break  # Only report first match per line
    
    return issues

def main():
    print("=" * 60)
    print(" PLACEHOLDER / STUB DETECTION")
    print("=" * 60)
    print(f" Scanning: {BASE}")
    print(f" Patterns: {len(PLACEHOLDER_PATTERNS)}")
    print("-" * 60)
    
    total_issues = 0
    files_scanned = 0
    
    for root, dirs, files in os.walk(BASE):
        # Skip subdirectories like levelbuilder for now
        dirs[:] = [d for d in dirs if d not in ['levelbuilder']]
        
        for filename in files:
            if not filename.endswith('.js'):
                continue
            if filename in SKIP_FILES:
                continue
            
            filepath = os.path.join(root, filename)
            rel_path = os.path.relpath(filepath, BASE)
            files_scanned += 1
            
            issues = scan_file(filepath, rel_path)
            if issues:
                print(f"\n📄 {rel_path} ({len(issues)} issue(s))")
                for line_num, line_text, pattern in issues:
                    print(f"   Line {line_num}: {line_text[:80]}")
                    print(f"   → Matched: {pattern[:60]}")
                total_issues += len(issues)
    
    print("\n" + "=" * 60)
    print(f" FILES SCANNED: {files_scanned}")
    print(f" ISSUES FOUND: {total_issues}")
    
    if total_issues == 0:
        print(" 🎉 No placeholders or stubs detected!")
        print("=" * 60)
        return 0
    else:
        print(f" ⚠️  Found {total_issues} potential placeholder/stub issues.")
        print(" Review each file above and fix before merging.")
        print("=" * 60)
        return 1

if __name__ == '__main__':
    sys.exit(main())
