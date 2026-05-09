export const KAYKIT_ANIMATION_PATHS = [
  'KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb',
  'KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_MovementAdvanced.glb',
  'KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_General.glb',
  'KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_CombatMelee.glb',
  'KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_CombatRanged.glb',
  'KayKit_Character_Animations_1.1/Animations/gltf/Rig_Medium/Rig_Medium_Tools.glb',
];

export const KAYKIT_ANIMATIONS = {
  Idle: 'Idle_A',
  Walk: 'Walking_A',
  Run: 'Running_A',
  Hit: 'Hit_A',
  HitHeavy: 'Hit_B',
  Death: 'Death_A',
  Use: 'Use_Item',
  Throw: 'Throw',
  Jump: 'Jump_Full_Short',
  // Dodge
  DodgeForward: 'Dodge_Forward',
  DodgeBack: 'Dodge_Backward',
  DodgeLeft: 'Dodge_Left',
  DodgeRight: 'Dodge_Right',
  // Block
  Block: 'Melee_Blocking',
  BlockHit: 'Melee_Block_Hit',
  BlockAttack: 'Melee_Block_Attack',
  // Melee attacks
  Melee1HSlice: 'Melee_1H_Attack_Slice_Horizontal',
  Melee1HChop: 'Melee_1H_Attack_Chop',
  Melee1HStab: 'Melee_1H_Attack_Stab',
  Melee2HSlice: 'Melee_2H_Attack_Slice',
  Melee2HChop: 'Melee_2H_Attack_Chop',
  // Ranged
  BowShoot: 'Ranged_Bow_Attack_Shoot',
  CrossbowShoot: 'Ranged_Crossbow_Attack_Shoot',
  // Tools
  PickaxeMine: 'Tool_Pickaxe_Mine',
  AxeChop: 'Tool_Axe_Chop',
};

// Map equipped item IDs to their attack animation key and raw duration (seconds)
export const WEAPON_ATTACK_ANIMS = {
  sword_1handed:  { animKey: 'Melee1HSlice',  duration: 0.67 },
  axe_1handed:    { animKey: 'Melee1HChop',   duration: 0.50 },
  dagger:         { animKey: 'Melee1HStab',   duration: 0.50 },
  sword_2handed:  { animKey: 'Melee2HSlice',  duration: 0.83 },
  sword_2handed_color: { animKey: 'Melee2HSlice', duration: 0.83 },
  axe_2handed:    { animKey: 'Melee2HChop',   duration: 0.67 },
  crossbow_1handed: { animKey: 'CrossbowShoot', duration: 0.40 },
  crossbow_2handed: { animKey: 'CrossbowShoot', duration: 0.40 },
  bow:            { animKey: 'BowShoot',      duration: 0.50 },
  bow_withString: { animKey: 'BowShoot',      duration: 0.50 },
  smokebomb:      { animKey: 'Throw',         duration: 0.50 },
  staff:          { animKey: 'Melee2HSlice',  duration: 0.83 },
};

export const KAYKIT_CHARACTERS = [
  { id: 'barbarian', name: 'Barbarian', model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Barbarian.glb' },
  { id: 'knight', name: 'Knight', model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Knight.glb' },
  { id: 'mage', name: 'Mage', model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Mage.glb' },
  { id: 'ranger', name: 'Ranger', model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Ranger.glb', bakedBackItem: 'quiver' },
  { id: 'rogue', name: 'Rogue', model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue.glb' },
  { id: 'rogue_hooded', name: 'Rogue Hooded', model: 'KayKit_Adventurers_2.0_FREE/Characters/gltf/Rogue_Hooded.glb' },
];

const A = 'KayKit_Adventurers_2.0_FREE/Assets/gltf/';

const HANDHELD = ['rightHand', 'leftHand'];
const LONG_BACK = ['rightHand', 'leftHand', 'back'];
const BACK_ONLY = ['back'];

export const KAYKIT_ITEMS = [
  { id: 'arrow_bow', name: 'Bow Arrow', model: A + 'arrow_bow.gltf', slots: BACK_ONLY, kind: 'ammo' },
  { id: 'arrow_bow_bundle', name: 'Bow Arrows', model: A + 'arrow_bow_bundle.gltf', slots: BACK_ONLY, kind: 'ammo' },
  { id: 'arrow_crossbow', name: 'Crossbolt', model: A + 'arrow_crossbow.gltf', slots: BACK_ONLY, kind: 'ammo' },
  { id: 'arrow_crossbow_bundle', name: 'Crossbolts', model: A + 'arrow_crossbow_bundle.gltf', slots: BACK_ONLY, kind: 'ammo' },
  { id: 'axe_1handed', name: 'Hand Axe', model: A + 'axe_1handed.gltf', slots: HANDHELD, kind: 'melee' },
  { id: 'axe_2handed', name: 'Great Axe', model: A + 'axe_2handed.gltf', slots: LONG_BACK, kind: 'melee' },
  { id: 'bow', name: 'Bow', model: A + 'bow.gltf', slots: LONG_BACK, kind: 'ranged' },
  { id: 'bow_withString', name: 'Bow String', model: A + 'bow_withString.gltf', slots: LONG_BACK, kind: 'ranged' },
  { id: 'crossbow_1handed', name: 'Hand Crossbow', model: A + 'crossbow_1handed.gltf', slots: LONG_BACK, kind: 'ranged' },
  { id: 'crossbow_2handed', name: 'Crossbow', model: A + 'crossbow_2handed.gltf', slots: LONG_BACK, kind: 'ranged' },
  { id: 'dagger', name: 'Dagger', model: A + 'dagger.gltf', slots: HANDHELD, kind: 'melee' },
  { id: 'mug_empty', name: 'Empty Mug', model: A + 'mug_empty.gltf', slots: HANDHELD, kind: 'prop' },
  { id: 'mug_full', name: 'Full Mug', model: A + 'mug_full.gltf', slots: HANDHELD, kind: 'prop' },
  { id: 'quiver', name: 'Quiver', model: A + 'quiver.gltf', slots: BACK_ONLY, kind: 'back' },
  { id: 'shield_badge', name: 'Badge Shield', model: A + 'shield_badge.gltf', slots: HANDHELD, kind: 'shield' },
  { id: 'shield_badge_color', name: 'Badge Shield Color', model: A + 'shield_badge_color.gltf', slots: HANDHELD, kind: 'shield' },
  { id: 'shield_round', name: 'Round Shield', model: A + 'shield_round.gltf', slots: HANDHELD, kind: 'shield' },
  { id: 'shield_round_barbarian', name: 'Barbarian Shield', model: A + 'shield_round_barbarian.gltf', slots: HANDHELD, kind: 'shield' },
  { id: 'shield_round_color', name: 'Round Shield Color', model: A + 'shield_round_color.gltf', slots: HANDHELD, kind: 'shield' },
  { id: 'shield_spikes', name: 'Spike Shield', model: A + 'shield_spikes.gltf', slots: HANDHELD, kind: 'shield' },
  { id: 'shield_spikes_color', name: 'Spike Shield Color', model: A + 'shield_spikes_color.gltf', slots: HANDHELD, kind: 'shield' },
  { id: 'shield_square', name: 'Square Shield', model: A + 'shield_square.gltf', slots: HANDHELD, kind: 'shield' },
  { id: 'shield_square_color', name: 'Square Shield Color', model: A + 'shield_square_color.gltf', slots: HANDHELD, kind: 'shield' },
  { id: 'smokebomb', name: 'Smokebomb', model: A + 'smokebomb.gltf', slots: HANDHELD, kind: 'thrown' },
  { id: 'spellbook_closed', name: 'Spellbook', model: A + 'spellbook_closed.gltf', slots: HANDHELD, kind: 'magic' },
  { id: 'spellbook_open', name: 'Open Spellbook', model: A + 'spellbook_open.gltf', slots: HANDHELD, kind: 'magic' },
  { id: 'staff', name: 'Staff', model: A + 'staff.gltf', slots: LONG_BACK, kind: 'magic' },
  { id: 'sword_1handed', name: 'Sword', model: A + 'sword_1handed.gltf', slots: HANDHELD, kind: 'melee' },
  { id: 'sword_2handed', name: 'Great Sword', model: A + 'sword_2handed.gltf', slots: LONG_BACK, kind: 'melee' },
  { id: 'sword_2handed_color', name: 'Great Sword Color', model: A + 'sword_2handed_color.gltf', slots: LONG_BACK, kind: 'melee' },
  { id: 'wand', name: 'Wand', model: A + 'wand.gltf', slots: HANDHELD, kind: 'magic' },
];

export const DEFAULT_LOADOUT = {
  characterId: 'ranger',
  rightHand: 'sword_1handed',
  leftHand: null,
  back: null,
};

export const HOTBAR_LOADOUTS = {
  pickaxe: { rightHand: 'axe_1handed', leftHand: null, back: null },
  sword: { rightHand: 'sword_1handed', leftHand: null, back: null },
  pistol: { rightHand: 'crossbow_1handed', leftHand: null, back: 'arrow_crossbow_bundle' },
  grenade: { rightHand: 'smokebomb', leftHand: null, back: null },
};

export const SLOT_LABELS = {
  rightHand: 'Right Hand',
  leftHand: 'Left Hand',
  back: 'Back',
};

export const KAYKIT_SOCKET_PRESETS = {
  rightHand: {
    anchor: 'handslotr',
    offset: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
  },
  leftHand: {
    anchor: 'handslotl',
    offset: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
  },
  back: {
    anchor: 'chest',
    offset: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
  },
};

const ZERO_OFFSET = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 };

export const KAYKIT_ITEM_GRIP_PRESETS = {
  default: {
    rightHand: { ...ZERO_OFFSET },
    leftHand: { ...ZERO_OFFSET },
    back: { ...ZERO_OFFSET },
  },
  sword_1handed: {
    rightHand: { x: 0, y: -0.08, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
    leftHand: { x: 0, y: -0.08, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
  },
  dagger: {
    rightHand: { x: 0, y: -0.05, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
    leftHand: { x: 0, y: -0.05, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
  },
  axe_1handed: {
    rightHand: { x: 0, y: -0.1, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
    leftHand: { x: 0, y: -0.1, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
  },
  crossbow_1handed: {
    rightHand: { x: 0, y: 0, z: -0.18, rx: 0, ry: 0, rz: 0, scale: 1 },
    leftHand: { x: 0, y: 0, z: -0.18, rx: 0, ry: 0, rz: 0, scale: 1 },
  },
  crossbow_2handed: {
    rightHand: { x: 0, y: 0, z: -0.18, rx: 0, ry: 0, rz: 0, scale: 1 },
    leftHand: { x: 0, y: 0, z: -0.18, rx: 0, ry: 0, rz: 0, scale: 1 },
  },
  bow: {
    rightHand: { x: 0.06, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
    leftHand: { x: 0.06, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
  },
  bow_withString: {
    rightHand: { x: 0.06, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
    leftHand: { x: 0.06, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
  },
  staff: {
    rightHand: { x: 0, y: -0.12, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
    leftHand: { x: 0, y: -0.12, z: 0, rx: 0, ry: 0, rz: 0, scale: 1 },
    back: { ...ZERO_OFFSET },
  },
};

const DEFAULT_SOCKET_ANCHORS = {
  rightHand: 'handslotr',
  leftHand: 'handslotl',
  back: 'chest',
};
const SOCKET_PRESET_STORAGE_KEY = 'voidloopKayKitSocketPresetsV2';
const ITEM_GRIP_STORAGE_KEY = 'voidloopKayKitItemGripPresetsV1';

const REAL_SOCKET_ANCHORS = new Set([
  'handslotr', 'handr', 'wristr', 'lowerarmr', 'upperarmr',
  'handslotl', 'handl', 'wristl', 'lowerarml', 'upperarml',
  'chest', 'spine',
]);

restoreKayKitSocketPresets();
restoreKayKitItemGripPresets();

export function applyKayKitSocketPreset(snapshot) {
  if (!snapshot?.slot || !snapshot?.anchor || !KAYKIT_SOCKET_PRESETS[snapshot.slot]) return;
  KAYKIT_SOCKET_PRESETS[snapshot.slot] = {
    anchor: snapshot.anchor,
    offset: {
      x: snapshot.offset?.x || 0,
      y: snapshot.offset?.y || 0,
      z: snapshot.offset?.z || 0,
      rx: snapshot.offset?.rx || 0,
      ry: snapshot.offset?.ry || 0,
      rz: snapshot.offset?.rz || 0,
      scale: snapshot.offset?.scale || 1,
    },
  };
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(SOCKET_PRESET_STORAGE_KEY, JSON.stringify(KAYKIT_SOCKET_PRESETS));
    }
  } catch {
    // localStorage may be unavailable in some browser privacy modes.
  }
}

export function applyKayKitItemGripPreset(snapshot) {
  const itemId = snapshot?.itemId;
  const slot = snapshot?.slot;
  if (!itemId || !slot || !snapshot?.itemGripPreset?.offset) return;
  KAYKIT_ITEM_GRIP_PRESETS[itemId] ||= {};
  KAYKIT_ITEM_GRIP_PRESETS[itemId][slot] = normalizeSocketOffset(snapshot.itemGripPreset.offset);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(ITEM_GRIP_STORAGE_KEY, JSON.stringify(KAYKIT_ITEM_GRIP_PRESETS));
    }
  } catch {
    // localStorage may be unavailable in some browser privacy modes.
  }
}

export function clearKayKitItemGripPreset(itemId, slot) {
  if (!itemId || !slot) return;
  if (KAYKIT_ITEM_GRIP_PRESETS[itemId]) {
    delete KAYKIT_ITEM_GRIP_PRESETS[itemId][slot];
    if (Object.keys(KAYKIT_ITEM_GRIP_PRESETS[itemId]).length === 0) {
      delete KAYKIT_ITEM_GRIP_PRESETS[itemId];
    }
  }
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(ITEM_GRIP_STORAGE_KEY, JSON.stringify(KAYKIT_ITEM_GRIP_PRESETS));
    }
  } catch {
    // localStorage may be unavailable in some browser privacy modes.
  }
}

function _migrateAnchorName(name) {
  // Migrate old dotted bone names to Three.js sanitized names.
  if (!name || typeof name !== 'string') return name;
  const migrated = name
    .replace(/^handslot\.r$/, 'handslotr')
    .replace(/^handslot\.l$/, 'handslotl')
    .replace(/^hand\.r$/, 'handr')
    .replace(/^hand\.l$/, 'handl')
    .replace(/^wrist\.r$/, 'wristr')
    .replace(/^wrist\.l$/, 'wristl')
    .replace(/^lowerarm\.r$/, 'lowerarmr')
    .replace(/^lowerarm\.l$/, 'lowerarml')
    .replace(/^upperarm\.r$/, 'upperarmr')
    .replace(/^upperarm\.l$/, 'upperarml')
    .replace(/^upperleg\.r$/, 'upperlegr')
    .replace(/^upperleg\.l$/, 'upperlegl')
    .replace(/^lowerleg\.r$/, 'lowerlegr')
    .replace(/^lowerleg\.l$/, 'lowerlegl')
    .replace(/^foot\.r$/, 'footr')
    .replace(/^foot\.l$/, 'footl')
    .replace(/^toes\.r$/, 'toesr')
    .replace(/^toes\.l$/, 'toesl');
  return migrated;
}

export function restoreKayKitSocketPresets() {
  try {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage?.getItem(SOCKET_PRESET_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const slot of Object.keys(KAYKIT_SOCKET_PRESETS)) {
      const savedSlot = saved?.[slot];
      if (savedSlot?.anchor && savedSlot?.offset) {
        const anchor = _migrateAnchorName(savedSlot.anchor);
        KAYKIT_SOCKET_PRESETS[slot] = {
          anchor: REAL_SOCKET_ANCHORS.has(anchor) ? anchor : DEFAULT_SOCKET_ANCHORS[slot],
          offset: normalizeSocketOffset(savedSlot.offset),
        };
      } else if (savedSlot?.candidate && savedSlot?.offset) {
        const candidate = _migrateAnchorName(savedSlot.candidate);
        KAYKIT_SOCKET_PRESETS[slot] = {
          anchor: REAL_SOCKET_ANCHORS.has(candidate) ? candidate : DEFAULT_SOCKET_ANCHORS[slot],
          offset: REAL_SOCKET_ANCHORS.has(candidate)
            ? normalizeSocketOffset(savedSlot.offset)
            : KAYKIT_SOCKET_PRESETS[slot].offset,
        };
      }
    }
  } catch {
    // Ignore malformed or inaccessible saved calibration data.
  }
}

export function restoreKayKitItemGripPresets() {
  try {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage?.getItem(ITEM_GRIP_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    for (const [itemId, slots] of Object.entries(saved || {})) {
      if (!slots || typeof slots !== 'object') continue;
      KAYKIT_ITEM_GRIP_PRESETS[itemId] ||= {};
      for (const [slot, offset] of Object.entries(slots)) {
        if (offset && typeof offset === 'object') {
          KAYKIT_ITEM_GRIP_PRESETS[itemId][slot] = normalizeSocketOffset(offset);
        }
      }
    }
  } catch {
    // Ignore malformed or inaccessible saved calibration data.
  }
}

function normalizeSocketOffset(offset = {}) {
  return {
    x: Number(offset.x) || 0,
    y: Number(offset.y) || 0,
    z: Number(offset.z) || 0,
    rx: Number(offset.rx) || 0,
    ry: Number(offset.ry) || 0,
    rz: Number(offset.rz) || 0,
    scale: Number(offset.scale) || 1,
  };
}

export function getKayKitCharacter(id) {
  return KAYKIT_CHARACTERS.find(character => character.id === id) || KAYKIT_CHARACTERS[0];
}

export function getKayKitItem(id) {
  if (!id) return null;
  return KAYKIT_ITEMS.find(item => item.id === id) || null;
}

export function getKayKitItemsForSlot(slot) {
  return KAYKIT_ITEMS.filter(item => item.slots.includes(slot));
}

export function getKayKitPaths() {
  return [
    ...KAYKIT_ANIMATION_PATHS,
    ...KAYKIT_CHARACTERS.map(character => character.model),
    ...KAYKIT_ITEMS.map(item => item.model),
  ];
}

export function cloneLoadout(loadout = DEFAULT_LOADOUT) {
  return {
    characterId: loadout.characterId || DEFAULT_LOADOUT.characterId,
    rightHand: loadout.rightHand ?? null,
    leftHand: loadout.leftHand ?? null,
    back: loadout.back ?? null,
  };
}
