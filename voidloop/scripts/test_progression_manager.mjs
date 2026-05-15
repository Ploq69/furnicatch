import assert from 'node:assert/strict';
import { ProgressionManager } from '../js/ProgressionManager.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
}

const manager = new ProgressionManager(new MemoryStorage());

assert.equal(manager.getPickaxeWidth(), 1);
assert.equal(manager.getNextPickaxeWidthCost(), 25);

let purchase = manager.purchase('pickaxe_width', 25);
assert.equal(purchase.success, true);
assert.equal(purchase.coins, 0);
assert.equal(manager.getPickaxeWidth(), 2);

purchase = manager.purchase('pickaxe_width', 75);
assert.equal(purchase.success, true);
assert.equal(manager.getPickaxeWidth(), 3);
assert.equal(manager.getPurchaseCost('grenade_unlock'), 250);

purchase = manager.purchase('grenade_unlock', 250);
assert.equal(purchase.success, true);
assert.equal(manager.state.grenade.unlocked, true);
assert.equal(manager.getGrenadeCooldown(), 12);

purchase = manager.purchase('grenade_charge', 90);
assert.equal(purchase.success, true);
assert.equal(manager.state.grenade.charges, 1);
assert.equal(manager.spendGrenadeCharge(), true);
assert.equal(manager.state.grenade.charges, 0);

assert.equal(manager.getPurchaseCost('missile_unlock'), null);
manager.purchase('pickaxe_width', 350);
assert.equal(manager.getPickaxeWidth(), 4);
assert.equal(manager.getPurchaseCost('missile_unlock'), 1500);
manager.purchase('missile_unlock', 1500);
assert.equal(manager.state.missile.unlocked, true);

let letter = manager.collectLetter('A');
assert.equal(letter.queued, true);
assert.deepEqual(manager.peekQuiz(), { letter: 'A', threshold: 1 });

let resolved = manager.resolveQuiz('A', true);
assert.equal(resolved.correct, true);
assert.equal(resolved.xpGained, 1);
assert.equal(manager.hasPassedLetter('A'), true);
assert.equal(manager.getLetter('A').level, 1);

manager.collectLetter('A');
resolved = manager.resolveQuiz('A', true);
assert.equal(resolved.levelUp, false);
manager.collectLetter('A');
resolved = manager.resolveQuiz('A', true);
assert.equal(resolved.levelUp, true);
assert.equal(manager.getLetter('A').level, 2);
assert.equal(manager.getQuizThreshold('A'), 2);

manager.purchase('round_time', 100);
assert.equal(manager.getRoundStartTime(60), 75);

console.log('ProgressionManager tests passed');
