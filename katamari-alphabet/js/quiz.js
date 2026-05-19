import { ALPHABET } from './levels.js';

const DRILL_ROOT = '../voidloop/audio/drill';

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

export const CONTAINS_WORDS = {
  X: ['box', 'fox', 'six', 'axe', 'ox', 'taxi', 'exit', 'next', 'text', 'mix'],
  Z: ['zebra', 'zoo', 'zero', 'zap', 'zip', 'zone', 'zoom', 'zigzag', 'zest', 'zany'],
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wordsFor(letter) {
  return CONTAINS_WORDS[letter] || STARTS_WITH_WORDS[letter] || [];
}

function makeWordQuestion(letter) {
  const contains = !!CONTAINS_WORDS[letter];
  const words = wordsFor(letter);
  const correctAnswer = words[0];
  const otherLetters = ALPHABET.filter(l => l !== letter && wordsFor(l).length);
  const distractors = [];
  while (distractors.length < 2 && otherLetters.length) {
    const other = otherLetters.splice(Math.floor(Math.random() * otherLetters.length), 1)[0];
    const list = wordsFor(other);
    const word = list[Math.floor(Math.random() * list.length)];
    if (word && word !== correctAnswer && !distractors.includes(word)) distractors.push(word);
  }
  return {
    type: contains ? 'contains' : 'starts_with',
    targetLetter: letter,
    promptText: contains
      ? `What word has the letter ${letter} in it?`
      : `Which word starts with the letter ${letter}?`,
    promptAudio: `${DRILL_ROOT}/${contains ? 'q_contains' : 'q_starts_with'}_${letter}.wav`,
    choices: shuffle([correctAnswer, ...distractors]),
    correctAnswer,
  };
}

function makeIdentifyQuestion(letter) {
  const pool = shuffle(ALPHABET.filter(l => l !== letter)).slice(0, 2);
  return {
    type: 'identify_letter',
    targetLetter: letter,
    promptText: 'What letter is this?',
    promptAudio: `${DRILL_ROOT}/q_identify_letter.wav`,
    choices: shuffle([letter, ...pool]),
    correctAnswer: letter,
  };
}

export class DrillSession {
  constructor(pendingLetters, minQuestions = 10) {
    this.originalPending = new Set(Array.from(pendingLetters).map(l => l.toUpperCase()));
    this.queue = [];
    this.index = 0;
    this.correct = 0;
    this.totalAnswered = 0;
    this._build(minQuestions);
  }

  _build(minQuestions) {
    const pending = Array.from(this.originalPending);
    for (const letter of pending) {
      this.queue.push(makeWordQuestion(letter));
      this.queue.push(makeIdentifyQuestion(letter));
      if (Math.random() < 0.5) {
        this.queue.push(Math.random() < 0.5 ? makeWordQuestion(letter) : makeIdentifyQuestion(letter));
      }
    }
    while (this.queue.length < minQuestions) {
      const letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      this.queue.push(Math.random() < 0.5 ? makeWordQuestion(letter) : makeIdentifyQuestion(letter));
    }
    this.queue = shuffle(this.queue).slice(0, Math.max(minQuestions, this.queue.length));
  }

  current() {
    if (this.index >= this.queue.length) return null;
    return {
      ...this.queue[this.index],
      index: this.index + 1,
      total: this.queue.length,
    };
  }

  answer(value) {
    const q = this.current();
    if (!q) return { correct: false, complete: true, question: null };
    const correct = value === q.correctAnswer;
    this.totalAnswered++;
    if (correct) this.correct++;
    this.index++;
    return { correct, complete: this.index >= this.queue.length, question: q };
  }
}
