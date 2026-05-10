import * as THREE from 'three';

export class ThaiModelPreview {
  constructor(container, thaiAssets, item) {
    this.container = container;
    this.thaiAssets = thaiAssets;
    this.item = item;
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    this.camera.position.set(0, 1.4, 4);
    this.camera.lookAt(0, 0.4, 0);
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(150, 120);
    this.renderer.domElement.className = 'thai-model-preview-canvas';
    this.renderer.domElement.dataset.thaiModelPreview = item.id;
    container.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x162033, 1.5));
    const key = new THREE.DirectionalLight(0xfff1b8, 1.3);
    key.position.set(2, 4, 3);
    this.scene.add(key);
    this.model = this.thaiAssets.cloneItem(item.id);
    this.model.userData.thaiModelRole = 'quizPreview';
    this.model.scale.multiplyScalar(1.15);
    this.scene.add(this.model);
    this._resize();
    this.render();
  }

  render() {
    if (this.model) this.model.rotation.z += 0.01;
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(() => this.render());
  }

  dispose() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(120, Math.floor(rect.width || 150));
    const height = 126;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
