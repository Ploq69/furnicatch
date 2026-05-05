import * as THREE from 'three';
import { glyph3D } from './Glyph3DManager.js';

export class TypingGlyphView {
  constructor() {
    this.container = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.wordGroup = null;
    this.slotGroup = null;
    this.word = '';
    this.typed = '';
    this.hintedIndices = [];
    this.revealPending = true;
    this.active = false;
    this.ready = false;
    this.wrongFlash = 0;
    this.completePulse = 0;
    this.slotGeometry = new THREE.BoxGeometry(0.74, 0.08, 0.12);
    this.clock = 0;
  }

  async show(container, word, revealPending = true) {
    this.container = container;
    this.word = String(word || '').toUpperCase();
    this.typed = '';
    this.hintedIndices = [];
    this.revealPending = revealPending;
    this.active = true;
    this.ready = false;

    await glyph3D.load();
    if (!this.active || !glyph3D.ready) return false;

    this._ensureRenderer();
    this.ready = true;
    this._rebuild();
    return true;
  }

  updateTyped(typed, revealPending = this.revealPending, hintedIndices = []) {
    this.typed = String(typed || '').toUpperCase();
    this.revealPending = revealPending;
    this.hintedIndices = hintedIndices || [];
    if (this.ready) this._rebuild();
  }

  flashWrong() {
    this.wrongFlash = 0.22;
    if (this.ready) this._rebuild();
  }

  pulseComplete() {
    this.completePulse = 0.45;
  }

  hide() {
    this.active = false;
    this.ready = false;
    this.word = '';
    this.typed = '';
    this.hintedIndices = [];
    this._clearGroups();
    if (this.renderer?.domElement?.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }

  update(dt) {
    if (!this.active || !this.renderer || !this.scene || !this.camera) return;
    this.clock += dt;
    this.wrongFlash = Math.max(0, this.wrongFlash - dt);
    this.completePulse = Math.max(0, this.completePulse - dt);

    if (this.wordGroup) {
      const pulse = this.completePulse > 0 ? Math.sin(this.completePulse * 32) * 0.06 : 0;
      this.wordGroup.scale.setScalar((this.wordGroup.userData.baseScale || 1) * (1 + pulse));
      this.wordGroup.rotation.y = Math.sin(this.clock * 1.2) * 0.06;
    }

    if (this.slotGroup && this.wrongFlash > 0) {
      const index = Math.min(this.typed.length, Math.max(0, this.word.length - 1));
      const slot = this.slotGroup.children[index];
      if (slot) slot.position.x = slot.userData.baseX + Math.sin(this.wrongFlash * 90) * 0.018;
    } else if (this.slotGroup) {
      for (const slot of this.slotGroup.children) {
        if (slot.userData.baseX !== undefined) slot.position.x = slot.userData.baseX;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  _ensureRenderer() {
    if (!this.container) return;

    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
      this.camera.position.set(0, 1.05, 7.5);
      this.camera.lookAt(0, 0.55, 0);

      this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const key = new THREE.DirectionalLight(0xffffff, 1.4);
      key.position.set(2.5, 4, 5);
      this.scene.add(key);
      const rim = new THREE.DirectionalLight(0x93c5fd, 0.6);
      rim.position.set(-3, 2, -2);
      this.scene.add(rim);
    }

    this.container.innerHTML = '';
    this.container.classList.add('vocab-preview-3d');
    this.container.appendChild(this.renderer.domElement);
    this._resize();
  }

  _resize() {
    if (!this.renderer || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(240, Math.floor(rect.width || 360));
    const height = Math.max(130, Math.floor(rect.height || 150));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  _rebuild() {
    this._clearGroups();
    if (!this.word) return;

    this.wordGroup = new THREE.Group();
    this.slotGroup = new THREE.Group();
    const spacing = this.word.length > 8 ? 0.72 : 0.82;
    const start = -((this.word.length - 1) * spacing) / 2;

    for (let i = 0; i < this.word.length; i++) {
      const x = start + i * spacing;
      const slot = new THREE.Mesh(this.slotGeometry, glyph3D._getMaterial('slot').clone());
      slot.position.set(x, 0.05, -0.15);
      slot.userData.baseX = x;
      if (this.wrongFlash > 0 && i === Math.min(this.typed.length, this.word.length - 1)) {
        glyph3D.applyStyle(slot, 'wrong');
      }
      this.slotGroup.add(slot);

      const target = this.word[i];
      if (!/[A-Z0-9]/.test(target)) continue;

      const isHinted = this.hintedIndices.includes(i);
      const isTyped = i < this.typed.length && this.typed[i] === target;

      if (isTyped) {
        const typedGlyph = glyph3D.createGlyph(target, 'correct');
        if (typedGlyph) {
          const ageBoost = i === this.typed.length - 1 ? 0.12 : 0;
          typedGlyph.position.set(x, 0.12 + ageBoost, 0.04);
          typedGlyph.scale.multiplyScalar(0.72 + ageBoost);
          this.wordGroup.add(typedGlyph);
        }
      } else if (isHinted) {
        const hintedGlyph = glyph3D.createGlyph(target, 'combo');
        if (hintedGlyph) {
          hintedGlyph.position.set(x, 0.12, 0.04);
          hintedGlyph.scale.multiplyScalar(0.65);
          this.wordGroup.add(hintedGlyph);
        }
      } else if (this.revealPending && i >= this.typed.length) {
        const preview = glyph3D.createGlyph(target, 'preview');
        if (preview) {
          preview.position.set(x, 0.13, -0.08);
          preview.scale.multiplyScalar(0.55);
          this.wordGroup.add(preview);
        }
      }
    }

    const width = Math.max(1, this.word.length * spacing);
    const fit = Math.min(1.25, 6.4 / width);
    this.wordGroup.userData.baseScale = fit;
    this.slotGroup.userData.baseScale = fit;
    this.wordGroup.scale.setScalar(fit);
    this.slotGroup.scale.setScalar(fit);
    this.scene.add(this.slotGroup);
    this.scene.add(this.wordGroup);
  }

  _clearGroups() {
    for (const group of [this.wordGroup, this.slotGroup]) {
      if (!group) continue;
      group.traverse((child) => {
        if (child.isMesh && child.material) child.material.dispose?.();
      });
      this.scene?.remove(group);
    }
    this.wordGroup = null;
    this.slotGroup = null;
  }
}
