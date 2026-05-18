// ==========================================
// Voidloop — Letter Pool
// Cycles through alphabet in random groups for zone letter drops.
// ==========================================

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function splitIntoGroups(letters, groupSizes) {
  const groups = [];
  let idx = 0;
  for (const size of groupSizes) {
    groups.push(letters.slice(idx, idx + size));
    idx += size;
  }
  return groups;
}

export class LetterPool {
  constructor() {
    this.cycleGroups = [];
    this.cycleIndex = 0;
    this.cycleComplete = false;
    this._generateCycle();
  }

  _generateCycle() {
    const shuffled = shuffleArray(ALPHABET);
    // 8 groups: two groups of 4, six groups of 3 = 26
    const groupSizes = [4, 3, 3, 3, 3, 3, 3, 4];
    // Shuffle the group sizes so the 4s appear in random positions
    const shuffledSizes = shuffleArray(groupSizes);
    this.cycleGroups = splitIntoGroups(shuffled, shuffledSizes);
    this.cycleIndex = 0;
    this.cycleComplete = false;
  }

  advanceLevel() {
    this.cycleIndex++;
    if (this.cycleIndex >= this.cycleGroups.length) {
      this._generateCycle();
    }
  }

  getCurrentLetters() {
    return this.cycleGroups[this.cycleIndex] || [];
  }

  setLetters(letters, key = 'default') {
    this.cycleGroups[this.cycleIndex] = letters.map(l => l.toUpperCase());
  }

  pickRandomLetter() {
    const current = this.getCurrentLetters();
    if (current.length === 0) return null;
    return current[Math.floor(Math.random() * current.length)];
  }

  reset() {
    this._generateCycle();
  }
}
