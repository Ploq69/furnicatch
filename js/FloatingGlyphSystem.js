import * as THREE from 'three';
import { glyph3D } from './Glyph3DManager.js';

const MAX_GROUPS = 3;
const MAX_GLYPHS = 28;

export class FloatingGlyphSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.groups = [];
    this.liveGroup = null;
    this.liveText = '';
    this.liveAnchor = null;
    this.liveWrongFlash = 0;
    this.loading = glyph3D.load();
  }

  spawnCapture({ position, reward = 0, streak = 1, levelUp = null }) {
    const origin = position.clone ? position.clone() : new THREE.Vector3(position.x, position.y, position.z);
    origin.y += 2.15;

    this.spawnText('CAPTURED', origin, 'combo', { life: 2.0, size: 0.52 });
    if (reward > 0) {
      this.spawnText(`+${reward}`, origin.clone().add(new THREE.Vector3(0, 0.64, 0)), 'reward', { life: 1.9, size: 0.56, delay: 0.08 });
    }
    if (streak > 1) {
      this.spawnText(`X${streak}`, origin.clone().add(new THREE.Vector3(0, 1.18, 0)), 'combo', { life: 1.75, size: 0.48, delay: 0.14 });
    }
    if (levelUp) {
      this.spawnText(`LV${levelUp}`, origin.clone().add(new THREE.Vector3(0, 1.72, 0)), 'level', { life: 2.1, size: 0.5, delay: 0.2 });
    }
  }

  async showLiveTypedWord(position, typed, hintedIndices = []) {
    const text = String(typed || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.liveAnchor = position;
    const hintKey = (hintedIndices || []).join(',');
    const cacheKey = `${text}|${hintKey}`;
    if (cacheKey === this.liveText) return;
    this.liveText = cacheKey;
    this._disposeLiveGroup();
    if (!text && !hintedIndices?.length) return;

    await this.loading;
    if (!glyph3D.ready || cacheKey !== this.liveText) return;

    const group = this._makeTextGroupWithHints(text, hintedIndices, 0.5);
    if (!group) return;
    group.userData.baseScale = 1;
    group.userData.bob = Math.random() * Math.PI * 2;
    this.liveGroup = group;
    this.scene.add(group);
    this._positionLiveGroup(0);
  }

  flashLiveWrong() {
    this.liveWrongFlash = 0.22;
  }

  hideLiveTypedWord() {
    this.liveText = '';
    this.liveAnchor = null;
    this.liveWrongFlash = 0;
    this._disposeLiveGroup();
  }

  async spawnText(text, position, style = 'combo', options = {}) {
    await this.loading;
    if (!glyph3D.ready) return null;

    this._trimGroups();
    const group = this._makeTextGroup(text, style, options.size || 0.32);
    if (!group) return null;

    group.position.copy(position);
    group.userData.life = options.life || 1.0;
    group.userData.maxLife = group.userData.life;
    group.userData.delay = options.delay || 0;
    group.userData.velocity = new THREE.Vector3(0, 0.8, 0);
    group.userData.baseScale = group.scale.x;
    group.userData.style = style;
    group.visible = group.userData.delay <= 0;

    this.scene.add(group);
    this.groups.push(group);
    return group;
  }

  update(dt) {
    this.liveWrongFlash = Math.max(0, this.liveWrongFlash - dt);
    this._positionLiveGroup(dt);

    for (let i = this.groups.length - 1; i >= 0; i--) {
      const group = this.groups[i];
      if (group.userData.delay > 0) {
        group.userData.delay -= dt;
        group.visible = group.userData.delay <= 0;
        continue;
      }

      group.userData.life -= dt;
      if (group.userData.life <= 0) {
        this._disposeGroup(group);
        this.groups.splice(i, 1);
        continue;
      }

      const t = 1 - group.userData.life / group.userData.maxLife;
      group.position.addScaledVector(group.userData.velocity, dt);
      this._faceCameraReadable(group);

      const pop = t < 0.18 ? THREE.MathUtils.lerp(0.35, 1.15, t / 0.18) : THREE.MathUtils.lerp(1.15, 0.88, (t - 0.18) / 0.82);
      this._setReadableScale(group, group.userData.baseScale * pop);
      const opacity = t > 0.68 ? THREE.MathUtils.lerp(1, 0, (t - 0.68) / 0.32) : 1;
      group.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = opacity;
          child.material.transparent = true;
          child.material.emissiveIntensity = child.userData.baseEmissive * (1 + Math.sin(t * Math.PI * 4) * 0.2);
        }
      });
    }
  }

  _makeTextGroupWithHints(text, hintedIndices = [], size) {
    const clean = String(text || '').toUpperCase().replace(/[^A-Z0-9+]/g, '');
    const hints = hintedIndices || [];
    const maxHinted = hints.length > 0 ? Math.max(...hints) : -1;
    if (!clean && maxHinted < 0) return null;

    const group = new THREE.Group();
    const spacing = 0.74;
    const totalLen = Math.max(clean.length, maxHinted + 1);
    const start = -((totalLen - 1) * spacing) / 2;
    let glyphCount = 0;

    for (let i = 0; i < totalLen; i++) {
      const isHinted = hints.includes(i);
      const isTyped = i < clean.length;
      const char = clean[i];
      if (!isTyped && !isHinted) continue;
      const style = isTyped ? 'correct' : 'combo';
      const glyph = char === '+' ? this._makePlusGlyph(style) : glyph3D.createGlyph(char || '?', style);
      if (!glyph) continue;
      glyph.position.set(start + i * spacing, 0, 0);
      glyph.scale.multiplyScalar(size * (isHinted && !isTyped ? 0.85 : 1));
      glyph.traverse((child) => {
        if (child.isMesh && child.material) {
          child.userData.baseEmissive = child.material.emissiveIntensity || 0.5;
          child.material.side = THREE.DoubleSide;
        }
      });
      group.add(glyph);
      glyphCount++;
    }

    if (!glyphCount) return null;
    return group;
  }

  _makeTextGroup(text, style, size) {
    const clean = String(text || '').toUpperCase().replace(/[^A-Z0-9+]/g, '');
    if (!clean) return null;

    const group = new THREE.Group();
    const spacing = 0.74;
    const start = -((clean.length - 1) * spacing) / 2;
    let glyphCount = 0;

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      const glyph = char === '+' ? this._makePlusGlyph(style) : glyph3D.createGlyph(char, style);
      if (!glyph) continue;
      glyph.position.set(start + i * spacing, 0, 0);
      glyph.scale.multiplyScalar(size);
      glyph.traverse((child) => {
        if (child.isMesh && child.material) {
          child.userData.baseEmissive = child.material.emissiveIntensity || 0.5;
          child.material.side = THREE.DoubleSide;
        }
      });
      group.add(glyph);
      glyphCount++;
    }

    if (!glyphCount) return null;
    return group;
  }

  _makePlusGlyph(style) {
    const mat = new THREE.MeshStandardMaterial({
      color: style === 'reward' ? 0xfacc15 : 0x7dd3fc,
      emissive: style === 'reward' ? 0xf59e0b : 0x0891b2,
      emissiveIntensity: 0.9,
      roughness: 0.48,
      transparent: true,
    });
    const group = new THREE.Group();
    const barA = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.16), mat);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.16), mat.clone());
    group.add(barA, barB);
    return group;
  }

  _trimGroups() {
    while (this.groups.length >= MAX_GROUPS || this._activeGlyphCount() >= MAX_GLYPHS) {
      const oldest = this.groups.shift();
      if (oldest) this._disposeGroup(oldest);
    }
  }

  _activeGlyphCount() {
    return this.groups.reduce((sum, group) => sum + group.children.length, 0);
  }

  _disposeGroup(group) {
    this.scene.remove(group);
    group.traverse((child) => {
      if (child.isMesh && child.material) child.material.dispose?.();
      if (child.geometry?.type?.includes('BoxGeometry')) child.geometry.dispose?.();
    });
  }

  _positionLiveGroup(dt) {
    if (!this.liveGroup || !this.liveAnchor) return;
    this.liveGroup.userData.bob = (this.liveGroup.userData.bob || 0) + dt * 2.2;
    this.liveGroup.position.copy(this.liveAnchor);
    this.liveGroup.position.y += 2.55 + Math.sin(this.liveGroup.userData.bob) * 0.08;
    this._faceCameraReadable(this.liveGroup);
    const shake = this.liveWrongFlash > 0 ? Math.sin(this.liveWrongFlash * 120) * 0.08 : 0;
    this.liveGroup.position.x += shake;
    const pulse = 1 + Math.sin(this.liveGroup.userData.bob * 2.4) * 0.035;
    this._setReadableScale(this.liveGroup, pulse);
  }

  _faceCameraReadable(group) {
    group.lookAt(this.camera.position);
    group.rotateY(Math.PI);
  }

  _setReadableScale(group, scale) {
    group.scale.set(-scale, scale, scale);
  }

  _disposeLiveGroup() {
    if (!this.liveGroup) return;
    this._disposeGroup(this.liveGroup);
    this.liveGroup = null;
  }
}
