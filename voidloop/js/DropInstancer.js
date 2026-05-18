import * as THREE from 'three';

const _tmpMatrix = new THREE.Matrix4();
const _tmpPos = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpScale = new THREE.Vector3();
const _zeroScaleMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * DropInstancer — GPU-instanced drop pool manager.
 * Each registered type gets one InstancedMesh. Instances are allocated from a
 * free list and hidden via scale-to-zero when unused.
 */
export class DropInstancer {
  constructor(scene) {
    this.scene = scene;
    this.types = new Map(); // key -> { mesh, capacity, freeList, activeCount, dirty }
  }

  /**
   * Register a drop type with a geometry + material + capacity.
   * @param {string} key
   * @param {THREE.BufferGeometry} geometry
   * @param {THREE.Material} material
   * @param {number} capacity max simultaneous instances
   */
  registerType(key, geometry, material, capacity) {
    if (this.types.has(key)) return;
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false; // drops can appear anywhere; overdraw is cheap
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    // Hide all slots initially
    for (let i = 0; i < capacity; i++) {
      mesh.setMatrixAt(i, _zeroScaleMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.scene.add(mesh);

    const freeList = new Array(capacity);
    for (let i = 0; i < capacity; i++) freeList[i] = capacity - 1 - i;

    this.types.set(key, {
      key,
      mesh,
      capacity,
      freeList,
      activeCount: 0,
      dirty: false,
    });
  }

  /**
   * Allocate an instance slot for type. Returns instance index or -1 if full.
   */
  alloc(key) {
    const type = this.types.get(key);
    if (!type || type.freeList.length === 0) return -1;
    type.activeCount++;
    return type.freeList.pop();
  }

  /**
   * Free an instance slot back to the pool.
   */
  free(key, index) {
    const type = this.types.get(key);
    if (!type) return;
    type.freeList.push(index);
    type.activeCount = Math.max(0, type.activeCount - 1);
    type.mesh.setMatrixAt(index, _zeroScaleMatrix);
    type.dirty = true;
  }

  /**
   * Write a matrix directly for an instance.
   */
  setMatrix(key, index, matrix) {
    const type = this.types.get(key);
    if (!type) return;
    type.mesh.setMatrixAt(index, matrix);
    type.dirty = true;
  }

  /**
   * Compose and write position/rotation/scale for an instance.
   */
  setTransform(key, index, position, quaternion, scale) {
    _tmpMatrix.compose(position, quaternion, scale);
    this.setMatrix(key, index, _tmpMatrix);
  }

  /**
   * Call once per frame after all instance transforms are written.
   */
  upload() {
    for (const type of this.types.values()) {
      if (type.dirty) {
        type.mesh.instanceMatrix.needsUpdate = true;
        type.dirty = false;
      }
    }
  }

  /**
   * Reset all pools to empty.
   */
  clear() {
    for (const type of this.types.values()) {
      type.freeList.length = 0;
      for (let i = type.capacity - 1; i >= 0; i--) {
        type.freeList.push(i);
        type.mesh.setMatrixAt(i, _zeroScaleMatrix);
      }
      type.activeCount = 0;
      type.dirty = true;
    }
  }

  /**
   * Dispose all GPU resources.
   */
  dispose() {
    for (const type of this.types.values()) {
      this.scene.remove(type.mesh);
      type.mesh.geometry?.dispose?.();
      const mats = Array.isArray(type.mesh.material) ? type.mesh.material : [type.mesh.material];
      mats.forEach(m => m?.dispose?.());
    }
    this.types.clear();
  }

  getActiveCount(key) {
    const type = this.types.get(key);
    return type ? type.activeCount : 0;
  }

  getTotalActiveCount() {
    let total = 0;
    for (const type of this.types.values()) total += type.activeCount;
    return total;
  }
}
