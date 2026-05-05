import { FURNITURE_LEVELS } from './constants.js';

const STORAGE_KEY = 'furnicatch.collection.v1';

export class CollectionStore {
  constructor() {
    this.records = {};
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.records = JSON.parse(raw) || {};
      }
      if (!this.records.words) {
        this.records = {
          words: this.records,
          letters: {},
          props: {},
        };
      }
      this.records.words ||= {};
      this.records.letters ||= {};
      this.records.props ||= {};
    } catch (err) {
      console.warn('Could not load collection data:', err);
      this.records = { words: {}, letters: {} };
    }
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch (err) {
      console.warn('Could not save collection data:', err);
    }
  }

  getRecord(word) {
    if (!this.records.words[word]) {
      this.records.words[word] = {
        captures: 0,
        level: 1,
        bestStreak: 1,
        variantsSeen: [],
      };
    }
    return this.records.words[word];
  }

  getLetterRecord(letter) {
    const key = String(letter || '').toUpperCase();
    if (!this.records.letters[key]) {
      this.records.letters[key] = {
        captures: 0,
        level: 1,
        bestSpellingStreak: 1,
        wordsSolved: [],
      };
    }
    return this.records.letters[key];
  }

  getLevel(word) {
    return this.getRecord(word).level || 1;
  }

  getCaptureCount(word) {
    return this.getRecord(word).captures || 0;
  }

  getLetterLevel(letter) {
    return this.getLetterRecord(letter).level || 1;
  }

  recordCapture(word, streak = 1, variant = 'normal') {
    const record = this.getRecord(word);
    record.captures += 1;
    record.bestStreak = Math.max(record.bestStreak || 1, streak);
    if (variant && !record.variantsSeen.includes(variant)) {
      record.variantsSeen.push(variant);
    }
    record.level = this._levelForCaptures(record.captures);
    this._save();
    return record;
  }

  recordLetterCapture(letter, spellingWord = null, streak = 1) {
    const record = this.getLetterRecord(letter);
    record.captures += 1;
    record.bestSpellingStreak = Math.max(record.bestSpellingStreak || 1, streak);
    if (spellingWord && !record.wordsSolved.includes(spellingWord)) {
      record.wordsSolved.push(spellingWord);
    }
    record.level = this._levelForCaptures(record.captures);
    this._save();
    return record;
  }

  _levelForCaptures(captures) {
    let level = 1;
    for (const config of FURNITURE_LEVELS) {
      if (captures >= config.capturesRequired) level = config.level;
    }
    return level;
  }

  getUniqueCount() {
    return Object.values(this.records.words).filter(record => record.captures > 0).length;
  }

  getUniqueLetterCount() {
    return Object.values(this.records.letters).filter(record => record.captures > 0).length;
  }

  getAllRecords() {
    return this.records.words;
  }

  getAllLetterRecords() {
    return this.records.letters;
  }

  getPropRecord(propKey) {
    if (!this.records.props[propKey]) {
      this.records.props[propKey] = {
        captures: 0,
        level: 1,
        bestStreak: 1,
      };
    }
    return this.records.props[propKey];
  }

  getPropLevel(propKey) {
    return this.getPropRecord(propKey).level || 1;
  }

  recordPropCapture(propKey, streak = 1) {
    const record = this.getPropRecord(propKey);
    record.captures += 1;
    record.bestStreak = Math.max(record.bestStreak || 1, streak);
    record.level = this._levelForCaptures(record.captures);
    this._save();
    return record;
  }

  getUniquePropCount() {
    return Object.values(this.records.props).filter(record => record.captures > 0).length;
  }

  getAllPropRecords() {
    return this.records.props;
  }
}
