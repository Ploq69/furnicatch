#!/usr/bin/env python3
"""
Validate VFX Integration implementation.
Checks:
1. ParticleSystem.js has waterAura spawn type
2. FlipbookVFX.js has water splash effect
3. Gateway barrier VFX exists
4. Fire zone atmosphere (orange fog) exists
"""

import os
import re
import sys

BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'voidloop', 'js')

def read_file(filename):
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        return None
    with open(path, 'r') as f:
        return f.read()

def fail(msg):
    print(f"  ❌ FAIL: {msg}")
    return False

def ok(msg):
    print(f"  ✅ {msg}")
    return True

def check_particles():
    print("\n📋 Checking ParticleSystem.js...")
    content = read_file('ParticleSystem.js')
    if content is None:
        return fail("ParticleSystem.js does not exist")
    
    checks = True
    
    # Check for water aura
    if 'water' not in content.lower() and 'aura' not in content.lower():
        checks &= fail("Water aura particle effect not found")
    else:
        checks &= ok("Water aura effect present")
    
    # Check for fire particles
    if 'fire' not in content.lower():
        checks &= fail("Fire particle effect not found")
    else:
        checks &= ok("Fire effect present")
    
    return checks

def check_flipbook():
    print("\n📋 Checking FlipbookVFX.js...")
    content = read_file('FlipbookVFX.js')
    if content is None:
        return fail("FlipbookVFX.js does not exist")
    
    checks = True
    
    # Check for water splash or similar
    if 'water' not in content.lower() and 'splash' not in content.lower():
        checks &= fail("Water splash flipbook effect not found")
    else:
        checks &= ok("Water splash flipbook present")
    
    return checks

def check_gateway_vfx():
    print("\n📋 Checking gateway barrier VFX...")
    world = read_file('World.js')
    game = read_file('Game.js')
    
    checks = True
    
    # Check for barrier/mesh/gateway visual
    if world is None:
        return fail("World.js does not exist")
    
    barrier_terms = ['barrier', 'gateway', 'Mesh', 'emissive', 'transparent']
    found = sum(1 for t in barrier_terms if t in world)
    if found < 3:
        checks &= fail("Gateway barrier visual not adequately implemented")
    else:
        checks &= ok("Gateway barrier visual present")
    
    return checks

def check_fire_atmosphere():
    print("\n📋 Checking fire zone atmosphere...")
    game = read_file('Game.js')
    world = read_file('World.js')
    
    checks = True
    
    # Check for fog color changes
    if game is None:
        return fail("Game.js does not exist")
    
    if 'fog' not in game.lower() and 'background' not in game.lower():
        checks &= fail("No atmospheric color changes found")
    else:
        checks &= ok("Atmospheric changes present")
    
    # Check for fire zone specific coloring
    if '0x2a1a1a' not in game and '0xff4422' not in game:
        checks &= fail("Fire zone colors not found")
    else:
        checks &= ok("Fire zone colors present")
    
    return checks

def main():
    print("=" * 60)
    print(" VFX INTEGRATION VALIDATION")
    print("=" * 60)
    
    results = [
        check_particles(),
        check_flipbook(),
        check_gateway_vfx(),
        check_fire_atmosphere(),
    ]
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f" RESULT: {passed}/{total} checks passed")
    if passed == total:
        print(" 🎉 All VFX checks passed!")
    else:
        print(" ⚠️  Some checks failed. Review above.")
    print("=" * 60)
    
    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
