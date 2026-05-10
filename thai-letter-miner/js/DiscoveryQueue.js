import { GAME_CONFIG } from './config.js';

const CATEGORY_LABEL = {
  consonant: 'Consonant Cache',
  vowel: 'Vowel Cache',
  symbol: 'Symbol Cache',
  tone: 'Tone Cache',
  number: 'Number Cache',
};

export class DiscoveryQueue {
  constructor(saveStore) {
    this.saveStore = saveStore;
    this.items = [];
    this.lastForcedQuizAt = -9999;
  }

  enqueue(item) {
    this.items.push({ itemId: item.id, category: item.category, at: performance.now() });
    this.saveStore.recordDiscovery(item);
    this._overflowToStudyChests();
  }

  size() {
    return this.items.length;
  }

  shouldForceQuiz(gameSeconds) {
    if (this.items.length < 3) return false;
    return gameSeconds - this.lastForcedQuizAt >= GAME_CONFIG.discovery.forcedQuizMinSeconds;
  }

  buildForcedBundle(gameSeconds, manifestById) {
    const bundle = this._takeBestBundle(manifestById, 1);
    if (bundle) this.lastForcedQuizAt = gameSeconds;
    return bundle;
  }

  buildSurveyReport(manifestById) {
    const bundles = [];
    const max = GAME_CONFIG.discovery.surveyReportMaxQuizzes;
    for (let i = 0; i < max && this.items.length > 0; i++) {
      const bundle = this._takeBestBundle(manifestById, i === 0 ? 1 : 2);
      if (bundle) bundles.push(bundle);
    }
    if (this.items.length > 0) this._flushRemainingToStudyChests(manifestById);
    return bundles;
  }

  _takeBestBundle(manifestById, minCount = 1) {
    if (!this.items.length) return null;
    const byId = new Map();
    for (const entry of this.items) {
      if (!byId.has(entry.itemId)) byId.set(entry.itemId, []);
      byId.get(entry.itemId).push(entry);
    }

    const duplicate = [...byId.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    if (duplicate && duplicate[1].length >= minCount) {
      const [itemId, entries] = duplicate;
      this._removeEntries(entries);
      const item = manifestById[itemId];
      return {
        kind: 'duplicate',
        title: `${item.glyph} x${entries.length}`,
        targetId: itemId,
        itemIds: entries.map((entry) => entry.itemId),
        category: item.category,
        rewardCount: entries.length,
      };
    }

    const first = this.items[0];
    const sameCategory = this.items.filter((entry) => entry.category === first.category).slice(0, 5);
    this._removeEntries(sameCategory);
    return {
      kind: 'category',
      title: CATEGORY_LABEL[first.category] || 'Study Cache',
      targetId: sameCategory[0].itemId,
      itemIds: sameCategory.map((entry) => entry.itemId),
      category: first.category,
      rewardCount: sameCategory.length,
    };
  }

  _overflowToStudyChests() {
    const satchelBonus = this.saveStore.upgradeLevel('study_satchel') * 4;
    const threshold = GAME_CONFIG.discovery.studyChestThreshold + satchelBonus;
    if (this.items.length <= threshold) return;
    const overflow = this.items.splice(0, this.items.length - threshold);
    const byCategory = Map.groupBy ? Map.groupBy(overflow, (entry) => entry.category) : this._groupByCategory(overflow);
    for (const [category, entries] of byCategory.entries()) {
      this.saveStore.addStudyChest({
        title: CATEGORY_LABEL[category] || 'Study Chest',
        category,
        itemIds: entries.map((entry) => entry.itemId),
        rewardCount: entries.length,
      });
    }
  }

  _flushRemainingToStudyChests() {
    const remaining = this.items.splice(0);
    const byCategory = this._groupByCategory(remaining);
    for (const [category, entries] of byCategory.entries()) {
      this.saveStore.addStudyChest({
        title: CATEGORY_LABEL[category] || 'Study Chest',
        category,
        itemIds: entries.map((entry) => entry.itemId),
        rewardCount: entries.length,
      });
    }
  }

  _groupByCategory(entries) {
    const map = new Map();
    for (const entry of entries) {
      if (!map.has(entry.category)) map.set(entry.category, []);
      map.get(entry.category).push(entry);
    }
    return map;
  }

  _removeEntries(entries) {
    const remove = new Set(entries);
    this.items = this.items.filter((entry) => !remove.has(entry));
  }
}
