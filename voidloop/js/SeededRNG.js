/**
 * SeededRNG — Deterministic pseudo-random number generator
 * Used so host and guest generate identical worlds from the same seed.
 * Based on a simple LCG (Linear Congruential Generator) for speed.
 */

export class SeededRNG {
  constructor(seed) {
    this._seed = seed || Date.now();
  }

  // Set a new seed
  setSeed(seed) {
    this._seed = seed;
  }

  // Get current seed
  getSeed() {
    return this._seed;
  }

  // Random float in [0, 1)
  random() {
    // LCG parameters from Numerical Recipes
    this._seed = (this._seed * 1664525 + 1013904223) % 4294967296;
    return (this._seed >>> 0) / 4294967296;
  }

  // Random float in [min, max)
  range(min, max) {
    return min + this.random() * (max - min);
  }

  // Random integer in [min, max]
  rangeInt(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  // Random item from array
  choice(array) {
    return array[Math.floor(this.random() * array.length)];
  }

  // Shuffle array in-place (Fisher-Yates)
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
