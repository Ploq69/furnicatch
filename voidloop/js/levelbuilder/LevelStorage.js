// ==========================================
// Voidloop Level Builder — Persistence
// ==========================================

const PREFIX = 'voidloop_level_';

export class LevelStorage {
  static saveLevel(doc) {
    try {
      const key = PREFIX + (doc.id || 'draft');
      localStorage.setItem(key, JSON.stringify(doc));
      return true;
    } catch (e) {
      console.error('[LevelStorage] save failed:', e);
      return false;
    }
  }

  static loadLevel(id) {
    try {
      const raw = localStorage.getItem(PREFIX + id);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('[LevelStorage] load failed:', e);
      return null;
    }
  }

  static listLevels() {
    const levels = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        try {
          const doc = JSON.parse(localStorage.getItem(key));
          if (doc && doc.id) levels.push({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt });
        } catch (_) { /* skip corrupt */ }
      }
    }
    return levels.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  static deleteLevel(id) {
    try {
      localStorage.removeItem(PREFIX + id);
      return true;
    } catch (e) {
      return false;
    }
  }

  static clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  }
}
