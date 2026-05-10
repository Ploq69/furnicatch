// ==========================================
// Voidloop Level Builder — Schema & Factory
// ==========================================

export const CURRENT_SCHEMA_VERSION = 2;

export function createBlankLevel() {
  const now = Date.now();
  const id = `lvl_${now.toString(36)}`;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    title: 'Untitled Level',
    themeId: 'forest',
    author: '',
    createdAt: now,
    updatedAt: now,
    grid: {
      width: 24,
      depth: 24,
      maxHeight: 8,
      floorY: -1,
    },
    tiles: [],
    props: [],
    floatingBlocks: [],
    enemies: [],
    tokens: [],
    lights: [],
    start: { x: 2, z: 2, rotation: 0 },
    exit: { x: 21, z: 21, rotation: 0 },
    gameplay: {
      timerSeconds: 120,
      targetWord: '',
      scoring: { letter: 100, block: 10, enemy: 50, token: 200, timeRemaining: 5 },
      difficulty: 'normal',
    },
    audio: {
      ambienceTrack: 'forest_ambience',
      musicIntensity: 0.5,
    },
  };
}

export function validateLevel(doc) {
  const errors = [];
  if (!doc || typeof doc !== 'object') { errors.push('Not an object'); return errors; }
  if (doc.schemaVersion !== CURRENT_SCHEMA_VERSION) errors.push(`Schema version mismatch (expected ${CURRENT_SCHEMA_VERSION})`);
  if (!doc.id) errors.push('Missing id');
  if (!Array.isArray(doc.tiles)) errors.push('tiles must be an array');
  if (!Array.isArray(doc.props)) errors.push('props must be an array');
  if (!Array.isArray(doc.enemies)) errors.push('enemies must be an array');
  if (!Array.isArray(doc.tokens)) errors.push('tokens must be an array');
  if (!Array.isArray(doc.lights)) errors.push('lights must be an array');
  if (!doc.start || typeof doc.start.x !== 'number') errors.push('Missing start position');
  if (!doc.exit || typeof doc.exit.x !== 'number') errors.push('Missing exit position');
  if (!doc.grid || typeof doc.grid.width !== 'number') errors.push('Missing grid config');

  for (const t of doc.tiles || []) {
    if (typeof t.x !== 'number' || typeof t.z !== 'number') errors.push(`Tile missing x/z: ${JSON.stringify(t)}`);
    if (typeof t.height !== 'number' || t.height < 1) errors.push(`Tile invalid height: ${JSON.stringify(t)}`);
  }

  for (const e of doc.enemies || []) {
    if (typeof e.x !== 'number' || typeof e.z !== 'number') errors.push(`Enemy missing x/z`);
    if (!e.kind) errors.push(`Enemy missing kind`);
  }

  for (const p of doc.props || []) {
    if (typeof p.x !== 'number' || typeof p.z !== 'number') errors.push(`Prop missing x/z`);
    if (!p.assetId) errors.push(`Prop missing assetId`);
  }

  for (const fb of doc.floatingBlocks || []) {
    if (typeof fb.x !== 'number' || typeof fb.z !== 'number') errors.push(`Floating block missing x/z`);
    if (!fb.type) errors.push(`Floating block missing type`);
  }

  for (const t of doc.tokens || []) {
    if (typeof t.x !== 'number' || typeof t.z !== 'number') errors.push(`Token missing x/z`);
    if (!t.value) errors.push(`Token missing value`);
  }

  return errors;
}

export function upgradeSchema(doc) {
  if (!doc) return null;
  if (doc.schemaVersion === CURRENT_SCHEMA_VERSION) return doc;
  // Migration v1 → v2: add floatingBlocks array
  if (doc.schemaVersion === 1) {
    doc.floatingBlocks = doc.floatingBlocks || [];
  }
  doc.schemaVersion = CURRENT_SCHEMA_VERSION;
  return doc;
}
