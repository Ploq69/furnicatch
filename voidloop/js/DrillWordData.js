// ==========================================
// Voidloop — Drill Word Data
// Word lists for "starts with" and "contains" quiz questions.
// 10 words per letter.
// ==========================================

export const STARTS_WITH_WORDS = {
  A: ['apple', 'ant', 'arm', 'ask', 'add', 'act', 'aim', 'ape', 'and', 'axe'],
  B: ['ball', 'bat', 'bed', 'big', 'box', 'bug', 'bag', 'bad', 'bit', 'bus'],
  C: ['cat', 'car', 'cup', 'cut', 'can', 'cap', 'cot', 'cow', 'cake', 'cold'],
  D: ['dog', 'duck', 'dig', 'dad', 'den', 'did', 'dot', 'dip', 'doll', 'door'],
  E: ['egg', 'ear', 'eat', 'end', 'exit', 'edge', 'east', 'easy', 'elbow', 'empty'],
  F: ['fish', 'fan', 'fat', 'foot', 'fin', 'fit', 'fog', 'fox', 'fun', 'fix'],
  G: ['goat', 'game', 'gap', 'gas', 'get', 'got', 'gum', 'gun', 'good', 'gift'],
  H: ['hat', 'hen', 'hog', 'hop', 'hot', 'hug', 'hum', 'hut', 'hay', 'hand'],
  I: ['ice', 'igloo', 'ill', 'in', 'ink', 'inch', 'is', 'it', 'ivy', 'iron'],
  J: ['jam', 'jar', 'jaw', 'jet', 'jig', 'job', 'jog', 'joy', 'jug', 'jump'],
  K: ['kite', 'key', 'kid', 'kick', 'king', 'kiss', 'kit', 'kiwi', 'knee', 'knife'],
  L: ['lion', 'lamp', 'leaf', 'leg', 'let', 'lid', 'lip', 'log', 'lot', 'lake'],
  M: ['monkey', 'moon', 'mouse', 'man', 'map', 'mat', 'mix', 'mom', 'mop', 'mud'],
  N: ['nest', 'nose', 'nut', 'nap', 'net', 'new', 'nod', 'not', 'now', 'nun'],
  O: ['octopus', 'orange', 'owl', 'off', 'oil', 'old', 'on', 'one', 'out', 'open'],
  P: ['pig', 'pen', 'pan', 'pat', 'paw', 'pet', 'pin', 'pit', 'pop', 'pot'],
  Q: ['queen', 'quilt', 'quiet', 'quack', 'quail', 'quick', 'quit', 'quiz', 'quill', 'quest'],
  R: ['rabbit', 'rainbow', 'rose', 'rag', 'ram', 'rat', 'red', 'run', 'rock', 'road'],
  S: ['sun', 'snake', 'sock', 'sad', 'sat', 'saw', 'sit', 'sand', 'seal', 'soap'],
  T: ['tiger', 'table', 'tree', 'tag', 'tan', 'tap', 'ten', 'tin', 'tip', 'top'],
  U: ['umbrella', 'unicorn', 'up', 'under', 'unit', 'upon', 'use', 'ugly', 'uncle', 'uniform'],
  V: ['violin', 'van', 'vase', 'vet', 'very', 'view', 'vine', 'vast', 'vote', 'vest'],
  W: ['whale', 'worm', 'window', 'wag', 'wax', 'web', 'wet', 'wig', 'win', 'wish'],
  Y: ['yellow', 'yarn', 'yak', 'yard', 'yam', 'yell', 'yes', 'yet', 'you', 'young'],
};

// Letters where "starts with" is too sparse — use "contains" instead
export const CONTAINS_WORDS = {
  X: ['box', 'fox', 'six', 'ax', 'ox', 'taxi', 'exit', 'next', 'text', 'mix'],
  Z: ['zebra', 'zoo', 'zero', 'zap', 'zip', 'zone', 'zoom', 'zigzag', 'zest', 'zany'],
};

// Preferred quiz mode per letter
export const LETTER_QUIZ_MODE = {
  // Default is 'starts_with' for all letters except X and Z
  X: 'contains',
  Z: 'contains',
};

export function getWordsForLetter(letter) {
  const upper = letter.toUpperCase();
  const mode = LETTER_QUIZ_MODE[upper] || 'starts_with';
  const list = mode === 'contains'
    ? CONTAINS_WORDS[upper]
    : STARTS_WITH_WORDS[upper];
  return { mode, words: list || [] };
}

// Phoneme prompts for Kokoro TTS — spoken as the letter sound
export const PHONEME_PROMPTS = {
  A: 'ah',
  B: 'buh',
  C: 'kuh',
  D: 'duh',
  E: 'eh',
  F: 'fff',
  G: 'guh',
  H: 'huh',
  I: 'ih',
  J: 'juh',
  K: 'kuh',
  L: 'lll',
  M: 'mmm',
  N: 'nnn',
  O: 'oh',
  P: 'puh',
  Q: 'kwuh',
  R: 'rrr',
  S: 'sss',
  T: 'tuh',
  U: 'uh',
  V: 'vvv',
  W: 'wuh',
  X: 'ks',
  Y: 'yuh',
  Z: 'zzz',
};

// Question prompt texts for Kokoro TTS
export function getQuestionPrompt(letter, mode) {
  const upper = letter.toUpperCase();
  switch (mode) {
    case 'starts_with':
      return `Which word starts with the letter ${upper}?`;
    case 'contains':
      return `What word has the letter ${upper} in it?`;
    case 'sound':
      return `What sound does the letter ${upper} make?`;
    default:
      return `Which word starts with the letter ${upper}?`;
  }
}
