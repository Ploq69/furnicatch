// ==========================================
// Weapon Animation Map — FurniCatch / Voidloop
// ==========================================
// Comprehensive mapping of every weapon/tool model to its recommended
// animation clips from the KayKit Character Animations 1.1 pack.
// Also includes Ultimate Animated Character Pack fallbacks.
//
// Skeleton: Rig_Medium (KayKit 2.0 characters + Mannequin)
// Attachment bones: handslot.r, handslot.l (+ spine for back items)
//
// Usage:
//   import { WEAPON_ANIMATION_MAP, getWeaponById, getWeaponsByCategory } from './WeaponAnimationMap.js';
//   const weapon = getWeaponById('sword_1handed');
//   const attackClip = weapon.animations.attack_light.primary; // => 'Melee_1H_Attack_Slice_Horizontal'

// ==========================================
// 1. CATEGORY DEFINITIONS
// ==========================================
// Each category defines the animation family and default hand calibration.

export const WEAPON_CATEGORIES = {
  '1h_melee': {
    label: '1H Melee',
    description: 'One-handed swords, axes, daggers',
    slot: 'rightHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    animFamily: 'Melee_1H',
    relevantAnimCategories: ['Combat Melee', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Melee_2H_Idle',           fallbacks: ['Idle_A', 'Idle_B'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B', 'Walking_C'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Melee_1H_Attack_Slice_Horizontal', fallbacks: ['Melee_1H_Attack_Chop', 'Melee_1H_Attack_Stab'] },
      attack_heavy: { primary: 'Melee_1H_Attack_Slice_Diagonal',   fallbacks: ['Melee_1H_Attack_Chop'] },
      attack_jump:  { primary: 'Melee_1H_Attack_Jump_Chop',        fallbacks: ['Melee_1H_Attack_Chop'] },
      attack_stab:  { primary: 'Melee_1H_Attack_Stab',             fallbacks: ['Melee_1H_Attack_Chop'] },
      block:        { primary: 'Melee_Blocking',          fallbacks: ['Melee_Block'] },
      block_hit:    { primary: 'Melee_Block_Hit',         fallbacks: ['Hit_A'] },
      block_attack: { primary: 'Melee_Block_Attack',      fallbacks: ['Melee_1H_Attack_Chop'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'Interact',                fallbacks: ['PickUp'] },
      dodge_fwd:    { primary: 'Dodge_Forward',           fallbacks: ['Dodge_Backward'] },
      dodge_back:   { primary: 'Dodge_Backward',          fallbacks: ['Dodge_Forward'] },
      dodge_left:   { primary: 'Dodge_Left',              fallbacks: ['Dodge_Right'] },
      dodge_right:  { primary: 'Dodge_Right',             fallbacks: ['Dodge_Left'] },
    },
  },

  '2h_melee': {
    label: '2H Melee',
    description: 'Two-handed swords, axes, great weapons',
    slot: 'rightHand',
    handConfig: { scale: 0.28, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    animFamily: 'Melee_2H',
    relevantAnimCategories: ['Combat Melee', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Melee_2H_Idle',           fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Melee_2H_Attack_Slice',   fallbacks: ['Melee_2H_Attack_Chop'] },
      attack_heavy: { primary: 'Melee_2H_Attack_Chop',    fallbacks: ['Melee_2H_Attack_Slice'] },
      attack_spin:  { primary: 'Melee_2H_Attack_Spin',    fallbacks: ['Melee_2H_Attack_Spinning'] },
      attack_spinning: { primary: 'Melee_2H_Attack_Spinning', fallbacks: ['Melee_2H_Attack_Spin'] },
      attack_stab:  { primary: 'Melee_2H_Attack_Stab',    fallbacks: ['Melee_2H_Attack_Chop'] },
      block:        { primary: 'Melee_Blocking',          fallbacks: ['Melee_Block'] },
      block_hit:    { primary: 'Melee_Block_Hit',         fallbacks: ['Hit_A'] },
      block_attack: { primary: 'Melee_Block_Attack',      fallbacks: ['Melee_2H_Attack_Chop'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'Interact',                fallbacks: ['PickUp'] },
      dodge_fwd:    { primary: 'Dodge_Forward',           fallbacks: ['Dodge_Backward'] },
      dodge_back:   { primary: 'Dodge_Backward',          fallbacks: ['Dodge_Forward'] },
    },
  },

  'dual_wield': {
    label: 'Dual Wield',
    description: 'Two weapons, one in each hand',
    slot: 'bothHands',
    handConfig: { scale: 0.22, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    animFamily: 'Melee_Dualwield',
    relevantAnimCategories: ['Combat Melee', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Melee_Unarmed_Idle',      fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Melee_Dualwield_Attack_Slice', fallbacks: ['Melee_Dualwield_Attack_Chop'] },
      attack_heavy: { primary: 'Melee_Dualwield_Attack_Chop',  fallbacks: ['Melee_Dualwield_Attack_Stab'] },
      attack_stab:  { primary: 'Melee_Dualwield_Attack_Stab',  fallbacks: ['Melee_Dualwield_Attack_Chop'] },
      block:        { primary: 'Melee_Blocking',          fallbacks: ['Melee_Block'] },
      block_hit:    { primary: 'Melee_Block_Hit',         fallbacks: ['Hit_A'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'Interact',                fallbacks: ['PickUp'] },
    },
  },

  'unarmed': {
    label: 'Unarmed',
    description: 'Fists, kicks, no weapon',
    slot: 'none',
    handConfig: null,
    animFamily: 'Melee_Unarmed',
    relevantAnimCategories: ['Combat Melee', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Melee_Unarmed_Idle',      fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Melee_Unarmed_Attack_Punch_A', fallbacks: ['Melee_Unarmed_Attack_Kick'] },
      attack_heavy: { primary: 'Melee_Unarmed_Attack_Kick',    fallbacks: ['Melee_Unarmed_Attack_Punch_A'] },
      block:        { primary: 'Melee_Blocking',          fallbacks: ['Melee_Block'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
    },
  },

  'bow': {
    label: 'Bow',
    description: 'Bows and arrow bundles',
    slot: 'leftHand',
    handConfig: { scale: 0.3, x: 0, y: 0, z: 0, rx: 0, ry: Math.PI / 2, rz: Math.PI / 2 },
    animFamily: 'Ranged_Bow',
    relevantAnimCategories: ['Combat Ranged', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Ranged_Bow_Idle',         fallbacks: ['Idle_A'] },
      aim_idle:     { primary: 'Ranged_Bow_Aiming_Idle',  fallbacks: ['Ranged_Bow_Idle'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_HoldingBow',      fallbacks: ['Running_A'] },
      draw:         { primary: 'Ranged_Bow_Draw',         fallbacks: ['Ranged_Bow_Draw_Up'] },
      draw_up:      { primary: 'Ranged_Bow_Draw_Up',      fallbacks: ['Ranged_Bow_Draw'] },
      attack_light: { primary: 'Ranged_Bow_Release',      fallbacks: ['Ranged_Bow_Release_Up'] },
      attack_heavy: { primary: 'Ranged_Bow_Release_Up',   fallbacks: ['Ranged_Bow_Release'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'Interact',                fallbacks: ['PickUp'] },
    },
  },

  'crossbow_1h': {
    label: '1H Crossbow',
    description: 'One-handed crossbows',
    slot: 'rightHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: Math.PI, rz: 0 },
    animFamily: 'Ranged_1H',
    relevantAnimCategories: ['Combat Ranged', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Ranged_1H_Aiming',        fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Ranged_1H_Shoot',         fallbacks: ['Ranged_1H_Shooting'] },
      attack_heavy: { primary: 'Ranged_1H_Shooting',      fallbacks: ['Ranged_1H_Shoot'] },
      reload:       { primary: 'Ranged_1H_Reload',        fallbacks: ['Interact'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'Interact',                fallbacks: ['PickUp'] },
    },
  },

  'crossbow_2h': {
    label: '2H Crossbow',
    description: 'Two-handed crossbows',
    slot: 'rightHand',
    handConfig: { scale: 0.28, x: 0, y: 0, z: 0, rx: 0, ry: Math.PI, rz: 0 },
    animFamily: 'Ranged_2H',
    relevantAnimCategories: ['Combat Ranged', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Ranged_2H_Aiming',        fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_HoldingRifle',    fallbacks: ['Running_A'] },
      attack_light: { primary: 'Ranged_2H_Shoot',         fallbacks: ['Ranged_2H_Shooting'] },
      attack_heavy: { primary: 'Ranged_2H_Shooting',      fallbacks: ['Ranged_2H_Shoot'] },
      reload:       { primary: 'Ranged_2H_Reload',        fallbacks: ['Interact'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'Interact',                fallbacks: ['PickUp'] },
    },
  },

  'gun_1h': {
    label: '1H Gun',
    description: 'Pistols, revolvers, SMGs',
    slot: 'rightHand',
    handConfig: { scale: 0.2, x: 0, y: 0, z: 0, rx: 0, ry: Math.PI, rz: 0 },
    animFamily: 'Ranged_1H',
    relevantAnimCategories: ['Combat Ranged', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Ranged_1H_Aiming',        fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Ranged_1H_Shoot',         fallbacks: ['Ranged_1H_Shooting'] },
      attack_heavy: { primary: 'Ranged_1H_Shooting',      fallbacks: ['Ranged_1H_Shoot'] },
      reload:       { primary: 'Ranged_1H_Reload',        fallbacks: ['Interact'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'Interact',                fallbacks: ['PickUp'] },
    },
  },

  'gun_2h': {
    label: '2H Gun',
    description: 'Rifles, shotguns, snipers, launchers',
    slot: 'rightHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: Math.PI, rz: 0 },
    animFamily: 'Ranged_2H',
    relevantAnimCategories: ['Combat Ranged', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Ranged_2H_Aiming',        fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_HoldingRifle',    fallbacks: ['Running_A'] },
      attack_light: { primary: 'Ranged_2H_Shoot',         fallbacks: ['Ranged_2H_Shooting'] },
      attack_heavy: { primary: 'Ranged_2H_Shooting',      fallbacks: ['Ranged_2H_Shoot'] },
      reload:       { primary: 'Ranged_2H_Reload',        fallbacks: ['Interact'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'Interact',                fallbacks: ['PickUp'] },
    },
  },

  'thrown': {
    label: 'Thrown',
    description: 'Grenades, bombs, smokebombs, mugs',
    slot: 'rightHand',
    handConfig: { scale: 0.15, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
    animFamily: 'Throw',
    relevantAnimCategories: ['General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Idle_A',                  fallbacks: ['Idle_B'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Throw',                   fallbacks: ['Use_Item'] },
      attack_heavy: { primary: 'Throw',                   fallbacks: ['Use_Item'] },
      use_item:     { primary: 'Use_Item',                fallbacks: ['Interact'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'PickUp',                  fallbacks: ['Interact'] },
    },
  },

  'magic': {
    label: 'Magic',
    description: 'Wands, staves, spellbooks',
    slot: 'rightHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    animFamily: 'Ranged_Magic',
    relevantAnimCategories: ['Combat Ranged', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Idle_A',                  fallbacks: ['Idle_B'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Ranged_Magic_Shoot',      fallbacks: ['Ranged_Magic_Raise'] },
      attack_heavy: { primary: 'Ranged_Magic_Spellcasting', fallbacks: ['Ranged_Magic_Spellcasting_Long'] },
      attack_channel: { primary: 'Ranged_Magic_Spellcasting_Long', fallbacks: ['Ranged_Magic_Spellcasting'] },
      summon:       { primary: 'Ranged_Magic_Summon',     fallbacks: ['Ranged_Magic_Raise'] },
      raise:        { primary: 'Ranged_Magic_Raise',      fallbacks: ['Ranged_Magic_Shoot'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'Interact',                fallbacks: ['PickUp'] },
    },
  },

  'shield': {
    label: 'Shield',
    description: 'Shields held in off-hand or on back',
    slot: 'leftHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
    animFamily: 'Melee_Block',
    relevantAnimCategories: ['Combat Melee', 'General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Melee_2H_Idle',           fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      block:        { primary: 'Melee_Blocking',          fallbacks: ['Melee_Block'] },
      block_hit:    { primary: 'Melee_Block_Hit',         fallbacks: ['Hit_A'] },
      block_attack: { primary: 'Melee_Block_Attack',      fallbacks: ['Melee_1H_Attack_Chop'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'Interact',                fallbacks: ['PickUp'] },
    },
  },

  'tool_pickaxe': {
    label: 'Pickaxe',
    description: 'Mining pickaxes',
    slot: 'rightHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    animFamily: 'Pickaxe',
    relevantAnimCategories: ['Tools', 'General', 'Movement Basic'],
    animations: {
      idle:         { primary: 'Holding_A',               fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Pickaxe',                 fallbacks: ['Pickaxing'] },
      attack_heavy: { primary: 'Pickaxing',               fallbacks: ['Pickaxe'] },
      dig:          { primary: 'Dig',                     fallbacks: ['Digging'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'PickUp',                  fallbacks: ['Interact'] },
    },
  },

  'tool_shovel': {
    label: 'Shovel',
    description: 'Digging shovels',
    slot: 'rightHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    animFamily: 'Shovel',
    relevantAnimCategories: ['Tools', 'General', 'Movement Basic'],
    animations: {
      idle:         { primary: 'Holding_B',               fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Dig',                     fallbacks: ['Digging'] },
      attack_heavy: { primary: 'Digging',                 fallbacks: ['Dig'] },
      chop:         { primary: 'Chop',                    fallbacks: ['Chopping'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'PickUp',                  fallbacks: ['Interact'] },
    },
  },

  'tool_axe': {
    label: 'Tool Axe',
    description: 'Chopping axes (tool use, not combat)',
    slot: 'rightHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    animFamily: 'Axe',
    relevantAnimCategories: ['Tools', 'General', 'Movement Basic'],
    animations: {
      idle:         { primary: 'Holding_A',               fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Chop',                    fallbacks: ['Chopping'] },
      attack_heavy: { primary: 'Chopping',                fallbacks: ['Chop'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'PickUp',                  fallbacks: ['Interact'] },
    },
  },

  'tool_hammer': {
    label: 'Hammer',
    description: 'Hammers for building/repair',
    slot: 'rightHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    animFamily: 'Hammer',
    relevantAnimCategories: ['Tools', 'General', 'Movement Basic'],
    animations: {
      idle:         { primary: 'Holding_C',               fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Hammer',                  fallbacks: ['Hammering'] },
      attack_heavy: { primary: 'Hammering',               fallbacks: ['Hammer'] },
      work:         { primary: 'Work_A',                  fallbacks: ['Working_A'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'PickUp',                  fallbacks: ['Interact'] },
    },
  },

  'tool_saw': {
    label: 'Saw',
    description: 'Saws for woodworking',
    slot: 'rightHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    animFamily: 'Saw',
    relevantAnimCategories: ['Tools', 'General', 'Movement Basic'],
    animations: {
      idle:         { primary: 'Holding_A',               fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Saw',                     fallbacks: ['Sawing'] },
      attack_heavy: { primary: 'Sawing',                  fallbacks: ['Saw'] },
      work:         { primary: 'Work_B',                  fallbacks: ['Working_B'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'PickUp',                  fallbacks: ['Interact'] },
    },
  },

  'tool_fishing': {
    label: 'Fishing Rod',
    description: 'Fishing rods',
    slot: 'rightHand',
    handConfig: { scale: 0.3, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2 },
    animFamily: 'Fishing',
    relevantAnimCategories: ['Tools', 'General', 'Movement Basic'],
    animations: {
      idle:         { primary: 'Fishing_Idle',            fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      cast:         { primary: 'Fishing_Cast',            fallbacks: ['Throw'] },
      reel:         { primary: 'Fishing_Reeling',         fallbacks: ['Working_A'] },
      catch:        { primary: 'Fishing_Catch',           fallbacks: ['PickUp'] },
      bite:         { primary: 'Fishing_Bite',            fallbacks: ['Fishing_Idle'] },
      struggle:     { primary: 'Fishing_Struggling',      fallbacks: ['Fishing_Reeling'] },
      tug:          { primary: 'Fishing_Tug',             fallbacks: ['Fishing_Reeling'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'PickUp',                  fallbacks: ['Interact'] },
    },
  },

  'tool_lockpick': {
    label: 'Lockpick',
    description: 'Lockpicking tools',
    slot: 'rightHand',
    handConfig: { scale: 0.15, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
    animFamily: 'Lockpick',
    relevantAnimCategories: ['Tools', 'General', 'Movement Basic'],
    animations: {
      idle:         { primary: 'Holding_C',               fallbacks: ['Idle_A'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      attack_light: { primary: 'Lockpick',                fallbacks: ['Lockpicking'] },
      attack_heavy: { primary: 'Lockpicking',             fallbacks: ['Lockpick'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'PickUp',                  fallbacks: ['Interact'] },
    },
  },

  'instrument': {
    label: 'Instrument',
    description: 'Lutes, musical instruments',
    slot: 'rightHand',
    handConfig: { scale: 0.25, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: -Math.PI / 4 },
    animFamily: 'Instrument',
    relevantAnimCategories: ['Simulation', 'General', 'Movement Basic'],
    animations: {
      idle:         { primary: 'Idle_A',                  fallbacks: ['Idle_B'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      play:         { primary: 'Cheering',                fallbacks: ['Interact'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
      equip:        { primary: 'PickUp',                  fallbacks: ['Interact'] },
    },
  },

  'accessory': {
    label: 'Accessory',
    description: 'Quiver, arrow bundles, non-weapon items',
    slot: 'back',
    handConfig: { scale: 0.3, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
    animFamily: null,
    relevantAnimCategories: ['General', 'Movement Basic', 'Movement Advanced'],
    animations: {
      idle:         { primary: 'Idle_A',                  fallbacks: ['Idle_B'] },
      walk:         { primary: 'Walking_A',               fallbacks: ['Walking_B'] },
      run:          { primary: 'Running_A',               fallbacks: ['Running_B'] },
      hit:          { primary: 'Hit_A',                   fallbacks: ['Hit_B'] },
      death:        { primary: 'Death_A',                 fallbacks: ['Death_B'] },
    },
  },
};

// ==========================================
// 2. INDIVIDUAL WEAPON ENTRIES
// ==========================================

export const WEAPON_ANIMATION_MAP = [
  // ──────────────────────────────────────────
  // KAYKIT ADVENTURERS 2.0 — WEAPONS
  // ──────────────────────────────────────────
  {
    id: 'kaykit_sword_1h',
    name: 'Sword (1H)',
    category: '1h_melee',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/sword_1handed.gltf',
    icon: '⚔️',
    notes: 'Standard one-handed sword. Good for Knight, Barbarian.',
  },
  {
    id: 'kaykit_sword_2h',
    name: 'Sword (2H)',
    category: '2h_melee',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/sword_2handed.gltf',
    icon: '🗡️',
    notes: 'Two-handed greatsword. High damage, slower swings.',
  },
  {
    id: 'kaykit_sword_2h_color',
    name: 'Sword (2H, Color)',
    category: '2h_melee',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/sword_2handed_color.gltf',
    icon: '🗡️',
    notes: 'Colored variant of the two-handed sword.',
  },
  {
    id: 'kaykit_axe_1h',
    name: 'Axe (1H)',
    category: '1h_melee',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/axe_1handed.gltf',
    icon: '🪓',
    notes: 'One-handed axe. Good for Barbarian, Viking.',
  },
  {
    id: 'kaykit_axe_2h',
    name: 'Axe (2H)',
    category: '2h_melee',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/axe_2handed.gltf',
    icon: '🪓',
    notes: 'Two-handed battle axe. Powerful chop attacks.',
  },
  {
    id: 'kaykit_dagger',
    name: 'Dagger',
    category: '1h_melee',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/dagger.gltf',
    icon: '🔪',
    notes: 'Fast, light melee. Good for Rogue.',
  },
  {
    id: 'kaykit_bow',
    name: 'Bow',
    category: 'bow',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/bow.gltf',
    icon: '🏹',
    notes: 'Standard bow. Uses Ranged_Bow animation family.',
  },
  {
    id: 'kaykit_bow_string',
    name: 'Bow (with String)',
    category: 'bow',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/bow_withString.gltf',
    icon: '🏹',
    notes: 'Bow with string rendered. Same animations as bow.',
  },
  {
    id: 'kaykit_crossbow_1h',
    name: 'Crossbow (1H)',
    category: 'crossbow_1h',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/crossbow_1handed.gltf',
    icon: '🎯',
    notes: 'One-handed crossbow. Quick to fire, lower damage.',
  },
  {
    id: 'kaykit_crossbow_2h',
    name: 'Crossbow (2H)',
    category: 'crossbow_2h',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/crossbow_2handed.gltf',
    icon: '🎯',
    notes: 'Two-handed crossbow. Slower, more powerful.',
  },
  {
    id: 'kaykit_staff',
    name: 'Staff',
    category: 'magic',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/staff.gltf',
    icon: '🪄',
    notes: 'Magic staff. Can also be used as 2H melee.',
  },
  {
    id: 'kaykit_wand',
    name: 'Wand',
    category: 'magic',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/wand.gltf',
    icon: '✨',
    notes: 'Magic wand. Fast casting, low damage. Good for Mage.',
  },
  {
    id: 'kaykit_smokebomb',
    name: 'Smokebomb',
    category: 'thrown',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/smokebomb.gltf',
    icon: '💨',
    notes: 'Thrown explosive. Good for Rogue stealth tactics.',
  },
  {
    id: 'kaykit_spellbook_closed',
    name: 'Spellbook (Closed)',
    category: 'magic',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/spellbook_closed.gltf',
    icon: '📖',
    notes: 'Closed spellbook. Can be used as off-hand accessory.',
  },
  {
    id: 'kaykit_spellbook_open',
    name: 'Spellbook (Open)',
    category: 'magic',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/spellbook_open.gltf',
    icon: '📖',
    notes: 'Open spellbook. Channeling magic animations.',
  },
  {
    id: 'kaykit_mug_empty',
    name: 'Mug (Empty)',
    category: 'thrown',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/mug_empty.gltf',
    icon: '🍺',
    notes: 'Empty mug. Can be thrown or used in tavern brawls.',
  },
  {
    id: 'kaykit_mug_full',
    name: 'Mug (Full)',
    category: 'thrown',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/mug_full.gltf',
    icon: '🍺',
    notes: 'Full mug. Throwable. Spills on impact.',
  },
  {
    id: 'kaykit_shield_badge',
    name: 'Shield (Badge)',
    category: 'shield',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_badge.gltf',
    icon: '🛡️',
    notes: 'Small badge shield. Light, fast block.',
  },
  {
    id: 'kaykit_shield_badge_color',
    name: 'Shield (Badge, Color)',
    category: 'shield',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_badge_color.gltf',
    icon: '🛡️',
    notes: 'Colored badge shield variant.',
  },
  {
    id: 'kaykit_shield_round',
    name: 'Shield (Round)',
    category: 'shield',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_round.gltf',
    icon: '🛡️',
    notes: 'Round wooden shield. Classic knight equipment.',
  },
  {
    id: 'kaykit_shield_round_barbarian',
    name: 'Shield (Round, Barbarian)',
    category: 'shield',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_round_barbarian.gltf',
    icon: '🛡️',
    notes: 'Barbarian-style round shield with spikes.',
  },
  {
    id: 'kaykit_shield_round_color',
    name: 'Shield (Round, Color)',
    category: 'shield',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_round_color.gltf',
    icon: '🛡️',
    notes: 'Colored round shield variant.',
  },
  {
    id: 'kaykit_shield_spikes',
    name: 'Shield (Spikes)',
    category: 'shield',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_spikes.gltf',
    icon: '🛡️',
    notes: 'Spiked shield. Can deal damage on block.',
  },
  {
    id: 'kaykit_shield_spikes_color',
    name: 'Shield (Spikes, Color)',
    category: 'shield',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_spikes_color.gltf',
    icon: '🛡️',
    notes: 'Colored spiked shield variant.',
  },
  {
    id: 'kaykit_shield_square',
    name: 'Shield (Square)',
    category: 'shield',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_square.gltf',
    icon: '🛡️',
    notes: 'Square tower shield. Heavy protection.',
  },
  {
    id: 'kaykit_shield_square_color',
    name: 'Shield (Square, Color)',
    category: 'shield',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_square_color.gltf',
    icon: '🛡️',
    notes: 'Colored square shield variant.',
  },
  {
    id: 'kaykit_quiver',
    name: 'Quiver',
    category: 'accessory',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/quiver.gltf',
    icon: '🏹',
    notes: 'Arrow quiver. Worn on back. Cosmetic with bow.',
  },
  {
    id: 'kaykit_arrow_bow',
    name: 'Arrow (Bow)',
    category: 'accessory',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/arrow_bow.gltf',
    icon: '➡️',
    notes: 'Single arrow. Can be held in off-hand with bow.',
  },
  {
    id: 'kaykit_arrow_bow_bundle',
    name: 'Arrow Bundle (Bow)',
    category: 'accessory',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/arrow_bow_bundle.gltf',
    icon: '➡️',
    notes: 'Bundle of arrows. Decorative.',
  },
  {
    id: 'kaykit_arrow_crossbow',
    name: 'Arrow (Crossbow)',
    category: 'accessory',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/arrow_crossbow.gltf',
    icon: '➡️',
    notes: 'Crossbow bolt. Held or decorative.',
  },
  {
    id: 'kaykit_arrow_crossbow_bundle',
    name: 'Arrow Bundle (Crossbow)',
    category: 'accessory',
    sourcePack: 'KayKit Adventurers 2.0',
    model: 'KayKit_Adventurers_2.0_FREE/Assets/gltf/arrow_crossbow_bundle.gltf',
    icon: '➡️',
    notes: 'Bundle of crossbow bolts. Decorative.',
  },

  // ──────────────────────────────────────────
  // CUBE WORLD — TOOLS
  // ──────────────────────────────────────────
  {
    id: 'cube_sword_wood',
    name: 'Sword (Wood)',
    category: '1h_melee',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Sword_Wood.gltf',
    icon: '🗡️',
    notes: 'Wooden training sword. Low tier starter weapon.',
  },
  {
    id: 'cube_sword_stone',
    name: 'Sword (Stone)',
    category: '1h_melee',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Sword_Stone.gltf',
    icon: '🗡️',
    notes: 'Stone sword. Early game melee.',
  },
  {
    id: 'cube_sword_gold',
    name: 'Sword (Gold)',
    category: '1h_melee',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Sword_Gold.gltf',
    icon: '🗡️',
    notes: 'Gold sword. Mid-tier melee.',
  },
  {
    id: 'cube_sword_diamond',
    name: 'Sword (Diamond)',
    category: '1h_melee',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Sword_Diamond.gltf',
    icon: '🗡️',
    notes: 'Diamond sword. High-tier melee.',
  },
  {
    id: 'cube_axe_wood',
    name: 'Axe (Wood)',
    category: 'tool_axe',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Axe_Wood.gltf',
    icon: '🪓',
    notes: 'Wooden axe. Tool/chopping use.',
  },
  {
    id: 'cube_axe_stone',
    name: 'Axe (Stone)',
    category: 'tool_axe',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Axe_Stone.gltf',
    icon: '🪓',
    notes: 'Stone axe. Better chopping.',
  },
  {
    id: 'cube_axe_gold',
    name: 'Axe (Gold)',
    category: 'tool_axe',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Axe_Gold.gltf',
    icon: '🪓',
    notes: 'Gold axe. Fast chopping.',
  },
  {
    id: 'cube_axe_diamond',
    name: 'Axe (Diamond)',
    category: 'tool_axe',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Axe_Diamond.gltf',
    icon: '🪓',
    notes: 'Diamond axe. Best chopping tool.',
  },
  {
    id: 'cube_pickaxe_wood',
    name: 'Pickaxe (Wood)',
    category: 'tool_pickaxe',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Pickaxe_Wood.gltf',
    icon: '⛏️',
    notes: 'Wooden pickaxe. Basic mining tool.',
  },
  {
    id: 'cube_pickaxe_stone',
    name: 'Pickaxe (Stone)',
    category: 'tool_pickaxe',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Pickaxe_Stone.gltf',
    icon: '⛏️',
    notes: 'Stone pickaxe. Improved mining.',
  },
  {
    id: 'cube_pickaxe_gold',
    name: 'Pickaxe (Gold)',
    category: 'tool_pickaxe',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Pickaxe_Gold.gltf',
    icon: '⛏️',
    notes: 'Gold pickaxe. Fast mining.',
  },
  {
    id: 'cube_pickaxe_diamond',
    name: 'Pickaxe (Diamond)',
    category: 'tool_pickaxe',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Pickaxe_Diamond.gltf',
    icon: '⛏️',
    notes: 'Diamond pickaxe. Best mining tool.',
  },
  {
    id: 'cube_shovel_wood',
    name: 'Shovel (Wood)',
    category: 'tool_shovel',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Shovel_Wood.gltf',
    icon: '🔨',
    notes: 'Wooden shovel. Basic digging tool.',
  },
  {
    id: 'cube_shovel_stone',
    name: 'Shovel (Stone)',
    category: 'tool_shovel',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Shovel_Stone.gltf',
    icon: '🔨',
    notes: 'Stone shovel. Improved digging.',
  },
  {
    id: 'cube_shovel_gold',
    name: 'Shovel (Gold)',
    category: 'tool_shovel',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Shovel_Gold.gltf',
    icon: '🔨',
    notes: 'Gold shovel. Fast digging.',
  },
  {
    id: 'cube_shovel_diamond',
    name: 'Shovel (Diamond)',
    category: 'tool_shovel',
    sourcePack: 'Cube World',
    model: 'Cube World - Aug 2023/Tools/glTF/Shovel_Diamond.gltf',
    icon: '🔨',
    notes: 'Diamond shovel. Best digging tool.',
  },

  // ──────────────────────────────────────────
  // TOON SHOOTER — GUNS
  // ──────────────────────────────────────────
  {
    id: 'toon_pistol',
    name: 'Pistol',
    category: 'gun_1h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Pistol.gltf',
    icon: '🔫',
    notes: 'Standard pistol. Semi-auto, moderate damage.',
  },
  {
    id: 'toon_revolver',
    name: 'Revolver',
    category: 'gun_1h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Revolver.gltf',
    icon: '🔫',
    notes: 'Heavy revolver. High damage, slow fire rate.',
  },
  {
    id: 'toon_revolver_small',
    name: 'Revolver (Small)',
    category: 'gun_1h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Revolver_Small.gltf',
    icon: '🔫',
    notes: 'Compact revolver. Fast draw, lower damage.',
  },
  {
    id: 'toon_smg',
    name: 'SMG',
    category: 'gun_1h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/SMG.gltf',
    icon: '🔫',
    notes: 'Submachine gun. Rapid fire, low per-shot damage.',
  },
  {
    id: 'toon_ak',
    name: 'AK Rifle',
    category: 'gun_2h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/AK.gltf',
    icon: '🔫',
    notes: 'Assault rifle. Two-handed, balanced stats.',
  },
  {
    id: 'toon_shotgun',
    name: 'Shotgun',
    category: 'gun_2h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Shotgun.gltf',
    icon: '🔫',
    notes: 'Pump shotgun. Spread damage, close range.',
  },
  {
    id: 'toon_sniper',
    name: 'Sniper',
    category: 'gun_2h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Sniper.gltf',
    icon: '🔫',
    notes: 'Sniper rifle. High damage, slow reload, long range.',
  },
  {
    id: 'toon_sniper_2',
    name: 'Sniper (Alt)',
    category: 'gun_2h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Sniper_2.gltf',
    icon: '🔫',
    notes: 'Alternative sniper rifle design.',
  },
  {
    id: 'toon_grenade_launcher',
    name: 'Grenade Launcher',
    category: 'gun_2h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/GrenadeLauncher.gltf',
    icon: '💣',
    notes: 'Launches explosive grenades. AoE damage.',
  },
  {
    id: 'toon_rocket_launcher',
    name: 'Rocket Launcher',
    category: 'gun_2h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/RocketLauncher.gltf',
    icon: '🚀',
    notes: 'Fires rockets. Massive AoE, slow fire rate.',
  },
  {
    id: 'toon_short_cannon',
    name: 'Short Cannon',
    category: 'gun_2h',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/ShortCannon.gltf',
    icon: '💣',
    notes: 'Compact cannon. High damage, short range.',
  },
  {
    id: 'toon_knife_1',
    name: 'Knife (1)',
    category: '1h_melee',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Knife_1.gltf',
    icon: '🔪',
    notes: 'Combat knife. Fast melee backup weapon.',
  },
  {
    id: 'toon_knife_2',
    name: 'Knife (2)',
    category: '1h_melee',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Knife_2.gltf',
    icon: '🔪',
    notes: 'Tactical knife. Slightly different design.',
  },
  {
    id: 'toon_grenade',
    name: 'Grenade',
    category: 'thrown',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Grenade.gltf',
    icon: '💣',
    notes: 'Frag grenade. Thrown explosive.',
  },
  {
    id: 'toon_fire_grenade',
    name: 'Fire Grenade',
    category: 'thrown',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/FireGrenade.gltf',
    icon: '🔥',
    notes: 'Incendiary grenade. Fire damage over time.',
  },
  {
    id: 'toon_shovel',
    name: 'Shovel (Toon)',
    category: 'tool_shovel',
    sourcePack: 'Toon Shooter',
    model: 'Toon Shooter Game Kit - Dec 2022/Guns/glTF/Shovel.gltf',
    icon: '🔨',
    notes: 'Military shovel. Can dig or melee.',
  },

  // ──────────────────────────────────────────
  // PIRATE KIT — WEAPONS
  // ──────────────────────────────────────────
  {
    id: 'pirate_axe',
    name: 'Pirate Axe',
    category: '1h_melee',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_Axe.gltf',
    icon: '🪓',
    notes: 'Boarding axe. Compact, brutal.',
  },
  {
    id: 'pirate_cutlass',
    name: 'Cutlass',
    category: '1h_melee',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_Cutlass.gltf',
    icon: '⚔️',
    notes: 'Curved pirate sword. Fast slashes.',
  },
  {
    id: 'pirate_dagger',
    name: 'Pirate Dagger',
    category: '1h_melee',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_Dagger.gltf',
    icon: '🔪',
    notes: 'Sneaky pirate dagger. Quick stabs.',
  },
  {
    id: 'pirate_double_axe',
    name: 'Double Axe',
    category: 'dual_wield',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_DoubleAxe.gltf',
    icon: '🪓',
    notes: 'Dual-wielded axes. Two weapons in one model.',
  },
  {
    id: 'pirate_sword_1',
    name: 'Pirate Sword (1)',
    category: '1h_melee',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_Sword_1.gltf',
    icon: '⚔️',
    notes: 'Straight pirate sword.',
  },
  {
    id: 'pirate_sword_2',
    name: 'Pirate Sword (2)',
    category: '1h_melee',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_Sword_2.gltf',
    icon: '⚔️',
    notes: 'Ornate pirate sword.',
  },
  {
    id: 'pirate_pistol',
    name: 'Flintlock Pistol',
    category: 'gun_1h',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_Pistol.gltf',
    icon: '🔫',
    notes: 'Flintlock pistol. Single shot, high damage.',
  },
  {
    id: 'pirate_rifle',
    name: 'Musket',
    category: 'gun_2h',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_Rifle.gltf',
    icon: '🔫',
    notes: 'Musket rifle. Two-handed, long reload.',
  },
  {
    id: 'pirate_axe_rifle',
    name: 'Axe Rifle',
    category: 'gun_2h',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_AxeRifle.gltf',
    icon: '🔫',
    notes: 'Axe-bayonet rifle. Melee + ranged hybrid.',
  },
  {
    id: 'pirate_double_shotgun',
    name: 'Double Shotgun',
    category: 'gun_2h',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_DoubleShotgun.gltf',
    icon: '🔫',
    notes: 'Double-barrel shotgun. Massive close-range damage.',
  },
  {
    id: 'pirate_lute',
    name: 'Lute',
    category: 'instrument',
    sourcePack: 'Pirate Kit',
    model: 'Pirate Kit - Nov 2023/glTF/Weapon_Lute.gltf',
    icon: '🎸',
    notes: 'Musical lute. Bard/support role.',
  },
];

// ==========================================
// 3. ULTIMATE ANIMATED CHARACTER PACK FALLBACKS
// ==========================================
// When using Ultimate Animated Character Pack characters (not KayKit),
// these generic fallbacks apply since that pack only has ~16 clips.

export const ULTIMATE_WEAPON_FALLBACKS = {
  idle:       { primary: 'Idle',        fallbacks: [] },
  walk:       { primary: 'Walk',        fallbacks: [] },
  run:        { primary: 'Run',         fallbacks: ['Walk'] },
  attack_light: { primary: 'Punch',     fallbacks: ['Attack', 'Shoot_OneHanded'] },
  attack_heavy: { primary: 'Attack',    fallbacks: ['Punch', 'Shoot_OneHanded'] },
  hit:        { primary: 'RecieveHit',  fallbacks: ['HitReact', 'Defeat'] },
  death:      { primary: 'Death',       fallbacks: ['Defeat'] },
  equip:      { primary: 'PickUp',      fallbacks: ['Idle'] },
  dodge:      { primary: 'Roll',        fallbacks: ['Duck', 'Jump'] },
  block:      { primary: 'Duck',        fallbacks: ['Idle'] }, // No block anim in Ultimate
};

// Per-category overrides for Ultimate pack
export const ULTIMATE_CATEGORY_OVERRIDES = {
  'gun_1h':   { attack_light: { primary: 'Shoot_OneHanded', fallbacks: ['Punch'] } },
  'gun_2h':   { attack_light: { primary: 'Shoot_OneHanded', fallbacks: ['Punch'] } },
  'crossbow_1h': { attack_light: { primary: 'Shoot_OneHanded', fallbacks: ['Punch'] } },
  'crossbow_2h': { attack_light: { primary: 'Shoot_OneHanded', fallbacks: ['Punch'] } },
  'bow':      { attack_light: { primary: 'Shoot_OneHanded', fallbacks: ['Punch'] } },
  'thrown':   { attack_light: { primary: 'Throw',           fallbacks: ['Shoot_OneHanded', 'Punch'] } },
  'magic':    { attack_light: { primary: 'Shoot_OneHanded', fallbacks: ['Punch'] } },
};

// ==========================================
// 4. CHARACTER-WEAPON AFFINITIES
// ==========================================
// Suggested weapon categories for each Ultimate Animated Character Pack character

export const CHARACTER_WEAPON_AFFINITIES = {
  // Fantasy
  Knight_Male:        ['1h_melee', '2h_melee', 'shield'],
  Knight_Golden_Male: ['1h_melee', '2h_melee', 'shield'],
  Knight_Golden_Female: ['1h_melee', '2h_melee', 'shield'],
  Viking_Male:        ['1h_melee', '2h_melee', 'tool_axe'],
  Viking_Female:      ['1h_melee', '2h_melee', 'tool_axe'],
  Barbarian:          ['2h_melee', '1h_melee', 'tool_axe'], // KayKit
  Ninja_Male:         ['1h_melee', 'thrown'],
  Ninja_Female:       ['1h_melee', 'thrown'],
  Ninja_Sand:         ['1h_melee', 'thrown'],
  Ninja_Sand_Female:  ['1h_melee', 'thrown'],
  Elf:                ['bow', 'magic'],
  Witch:              ['magic'],
  Wizard:             ['magic'],
  Mage:               ['magic', 'staff'], // KayKit

  // Military
  Soldier_Male:       ['gun_1h', 'gun_2h', 'thrown'],
  Soldier_Female:     ['gun_1h', 'gun_2h', 'thrown'],
  BlueSoldier_Male:   ['gun_1h', 'gun_2h'],
  BlueSoldier_Female: ['gun_1h', 'gun_2h'],

  // Western / Pirate
  Cowboy_Male:        ['gun_1h', 'gun_2h'],
  Cowboy_Female:      ['gun_1h', 'gun_2h'],
  Pirate_Male:        ['1h_melee', 'gun_1h', 'instrument'],
  Pirate_Female:      ['1h_melee', 'gun_1h', 'instrument'],

  // Modern
  Casual_Male:        ['1h_melee', 'gun_1h', 'thrown'],
  Casual_Female:      ['1h_melee', 'gun_1h', 'thrown'],
  Suit_Male:          ['gun_1h'],
  Suit_Female:        ['gun_1h'],
  Worker_Male:        ['tool_pickaxe', 'tool_shovel', 'tool_hammer'],
  Worker_Female:      ['tool_pickaxe', 'tool_shovel', 'tool_hammer'],
  Chef_Male:          ['tool_shovel', 'thrown'], // kitchen combat!
  Chef_Female:        ['tool_shovel', 'thrown'],

  // Monsters
  Zombie_Male:        ['unarmed', '1h_melee'],
  Zombie_Female:      ['unarmed', '1h_melee'],
  Goblin_Male:        ['1h_melee', 'thrown'],
  Goblin_Female:      ['1h_melee', 'thrown'],

  // Animals
  Pug:                ['unarmed'], // Doggo!
  Cow:                ['unarmed'], // Moo!
};

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================

export function getWeaponById(id) {
  const weapon = WEAPON_ANIMATION_MAP.find(w => w.id === id);
  if (!weapon) return null;
  const category = WEAPON_CATEGORIES[weapon.category];
  return { ...weapon, categoryDef: category };
}

export function getWeaponsByCategory(categoryKey) {
  return WEAPON_ANIMATION_MAP
    .filter(w => w.category === categoryKey)
    .map(w => ({ ...w, categoryDef: WEAPON_CATEGORIES[categoryKey] }));
}

export function getAllCategories() {
  return Object.entries(WEAPON_CATEGORIES).map(([key, def]) => ({ key, ...def }));
}

export function getWeaponsForCharacter(characterKey) {
  const affinities = CHARACTER_WEAPON_AFFINITIES[characterKey] || ['1h_melee'];
  return affinities.flatMap(cat => getWeaponsByCategory(cat));
}

export function getAnimationForWeapon(weaponId, action, useUltimate = false) {
  const weapon = getWeaponById(weaponId);
  if (!weapon) return null;

  if (useUltimate) {
    const override = ULTIMATE_CATEGORY_OVERRIDES[weapon.category]?.[action];
    if (override) return override;
    return ULTIMATE_WEAPON_FALLBACKS[action] || null;
  }

  const category = WEAPON_CATEGORIES[weapon.category];
  if (!category) return null;
  return category.animations[action] || null;
}

export function getRelevantAnimCategories(weaponId) {
  const weapon = getWeaponById(weaponId);
  if (!weapon) return [];
  return weapon.categoryDef?.relevantAnimCategories || [];
}

export function getRecommendedClips(weaponId) {
  const weapon = getWeaponById(weaponId);
  if (!weapon) return [];
  const cat = weapon.categoryDef;
  if (!cat) return [];
  const actions = Object.keys(cat.animations);
  return actions.map(action => ({
    action,
    clip: cat.animations[action].primary,
    fallbacks: cat.animations[action].fallbacks,
  }));
}

export function getHandConfig(weaponId) {
  const weapon = getWeaponById(weaponId);
  if (!weapon) return null;
  // Weapon-specific config overrides category default
  return weapon.handConfig || weapon.categoryDef?.handConfig || null;
}

// ==========================================
// 6. QUICK REFERENCE TABLES
// ==========================================

// Map animation clip name → which weapon categories use it
export const CLIP_TO_CATEGORIES = {};
for (const [catKey, catDef] of Object.entries(WEAPON_CATEGORIES)) {
  for (const [action, mapping] of Object.entries(catDef.animations || {})) {
    const clips = [mapping.primary, ...mapping.fallbacks];
    for (const clip of clips) {
      if (!CLIP_TO_CATEGORIES[clip]) CLIP_TO_CATEGORIES[clip] = new Set();
      CLIP_TO_CATEGORIES[clip].add(catKey);
    }
  }
}
// Convert Sets to arrays for JSON serialization
for (const clip in CLIP_TO_CATEGORIES) {
  CLIP_TO_CATEGORIES[clip] = [...CLIP_TO_CATEGORIES[clip]];
}

// Stats
export const WEAPON_STATS = {
  totalWeapons: WEAPON_ANIMATION_MAP.length,
  totalCategories: Object.keys(WEAPON_CATEGORIES).length,
  byCategory: Object.fromEntries(
    Object.keys(WEAPON_CATEGORIES).map(k => [
      k,
      WEAPON_ANIMATION_MAP.filter(w => w.category === k).length,
    ])
  ),
  byPack: Object.fromEntries(
    [...new Set(WEAPON_ANIMATION_MAP.map(w => w.sourcePack))].map(pack => [
      pack,
      WEAPON_ANIMATION_MAP.filter(w => w.sourcePack === pack).length,
    ])
  ),
};

export default {
  WEAPON_CATEGORIES,
  WEAPON_ANIMATION_MAP,
  ULTIMATE_WEAPON_FALLBACKS,
  ULTIMATE_CATEGORY_OVERRIDES,
  CHARACTER_WEAPON_AFFINITIES,
  CLIP_TO_CATEGORIES,
  WEAPON_STATS,
  getWeaponById,
  getWeaponsByCategory,
  getAllCategories,
  getWeaponsForCharacter,
  getAnimationForWeapon,
  getRelevantAnimCategories,
  getRecommendedClips,
  getHandConfig,
};
