// ==========================================
// Voidloop — Drill Session
// Manages a forced 10-question quiz session at camp.
// Two question types:
//   1. "Which word starts with letter X?" (audio word choices)
//   2. "What letter is this?" (audio "Letter A" choices)
// ==========================================

import { getWordsForLetter } from './DrillWordData.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(target, pool, count) {
  const filtered = pool.filter(l => l !== target);
  const shuffled = shuffle(filtered);
  return shuffled.slice(0, count);
}

export class DrillSession {
  constructor(pendingLetters) {
    this._queue = [];
    this._stars = 0;
    this._correct = 0;
    this._total = 0;
    this._currentIndex = 0;
    this._originalPending = new Set(pendingLetters);
    this._buildQueue(pendingLetters);
  }

  _buildQueue(pendingLetters) {
    const pending = Array.from(pendingLetters).map(l => l.toUpperCase());
    const questions = [];

    // Generate 2-3 questions per pending letter
    for (const letter of pending) {
      const types = ['starts_with', 'identify_letter'];
      // Ensure at least one of each type when possible
      questions.push(this._makeQuestion(letter, 'starts_with'));
      questions.push(this._makeQuestion(letter, 'identify_letter'));
      // 50% chance of a third question
      if (Math.random() < 0.5) {
        const extraType = types[Math.floor(Math.random() * types.length)];
        questions.push(this._makeQuestion(letter, extraType));
      }
    }

    // Fill up to minimum 10 with random letters
    while (questions.length < 10) {
      const letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      const type = Math.random() < 0.5 ? 'starts_with' : 'identify_letter';
      questions.push(this._makeQuestion(letter, type));
    }

    this._queue = shuffle(questions);
  }

  _makeQuestion(letter, type) {
    if (type === 'starts_with') {
      const { words } = getWordsForLetter(letter);
      const correctWord = words[0];
      const distractorWords = [];
      // Pick distractor words from other letters
      const otherLetters = ALPHABET.filter(l => l !== letter);
      for (let i = 0; i < 2; i++) {
        const dl = otherLetters[Math.floor(Math.random() * otherLetters.length)];
        const dw = getWordsForLetter(dl).words;
        if (dw && dw.length) {
          const w = dw[Math.floor(Math.random() * dw.length)];
          if (!distractorWords.includes(w) && w !== correctWord) {
            distractorWords.push(w);
          } else {
            i--; // try again
          }
        } else {
          i--; // try again
        }
      }
      const choices = shuffle([correctWord, ...distractorWords]);
      return {
        type: 'starts_with',
        targetLetter: letter,
        promptText: `Which word starts with the letter ${letter}?`,
        promptAudio: `audio/drill/q_starts_with_${letter}.wav`,
        choices,
        correctAnswer: correctWord,
      };
    }

    // type === 'identify_letter'
    const distractors = pickDistractors(letter, ALPHABET, 2);
    const choices = shuffle([letter, ...distractors]);
    return {
      type: 'identify_letter',
      targetLetter: letter,
      promptText: 'What letter is this?',
      promptAudio: 'audio/drill/q_identify_letter.wav',
      choices,
      correctAnswer: letter,
    };
  }

  nextQuestion() {
    if (this._currentIndex >= this._queue.length) return null;
    return {
      index: this._currentIndex + 1,
      total: this._queue.length,
      ...this._queue[this._currentIndex],
    };
  }

  advance() {
    this._currentIndex++;
  }

  recordAnswer(correct) {
    this._total++;
    if (correct) {
      this._correct++;
      this._stars++;
    }
  }

  getScore() {
    return { stars: this._stars, correct: this._correct, total: this._total };
  }

  isComplete() {
    return this._currentIndex >= this._queue.length;
  }


}
