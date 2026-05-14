import * as THREE from 'three';

const WATER_SEGMENTS = 48;
const MAX_RIPPLES = 8;
const FLOW_MARGIN = 4;
const WATER_CLEARANCE = 0.08;

const clamp01 = (value) => Math.max(0, Math.min(1, value));

function normalizeVolume(volume, zone) {
  return {
    ...volume,
    zoneId: zone?.id || volume.zoneId || null,
    zoneName: zone?.name || volume.zoneName || '',
    x: volume.x ?? 0,
    z: volume.z ?? 0,
    radiusX: Math.max(0.1, volume.radiusX ?? 4),
    radiusZ: Math.max(0.1, volume.radiusZ ?? 4),
    flowMargin: Math.max(0, volume.flowMargin ?? FLOW_MARGIN),
    surfaceY: volume.surfaceY ?? 1,
    bottomY: volume.bottomY ?? -1,
    tint: volume.tint ?? 0x2bb8a6,
    foamColor: volume.foamColor ?? 0xd8fff7,
  };
}

export class WaterSurfaceSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'water_surface_system';
    this.scene.add(this.group);
    this.meshes = [];
    this.volumes = [];
    this.ripples = [];
    this._time = 0;
    this._lastPlayerInWater = false;
    this._lastRippleAt = 0;
  }

  setVolumes(zones = []) {
    this.clear();
    for (const zone of zones) {
      for (const volume of zone.waterVolumes || []) {
        const normalized = normalizeVolume(volume, zone);
        const mesh = this._createWaterMesh(normalized);
        this.group.add(mesh);
        this.meshes.push(mesh);
        this.volumes.push(normalized);
      }
    }
  }

  clear() {
    for (const mesh of this.meshes) {
      this.group.remove(mesh);
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    }
    this.meshes = [];
    this.volumes = [];
    this.ripples = [];
    this._lastPlayerInWater = false;
  }

  update(dt, { player = null, camera = null, terrain = null, particles = null, flipbooks = null, sfx = null } = {}) {
    this._time += dt;
    for (const mesh of this.meshes) {
      this._refreshTerrainWater(mesh, terrain);
    }

    const playerPos = player?.position || null;
    const activeVolume = playerPos ? this.getVolumeAt(playerPos, { includeSurfaceMargin: true }) : null;
    const playerInWater = !!(player?.isSwimming && activeVolume);

    if (playerInWater && !this._lastPlayerInWater) {
      this._spawnContactEffect(player.position, activeVolume, particles, flipbooks, sfx, 1.0);
      this.addRipple(player.position, 1.0);
    } else if (!playerInWater && this._lastPlayerInWater && playerPos) {
      const exitVolume = this.getVolumeAt(playerPos, { includeSurfaceMargin: true }) || activeVolume;
      if (exitVolume) this._spawnContactEffect(player.position, exitVolume, particles, flipbooks, sfx, 0.65);
    }
    this._lastPlayerInWater = playerInWater;

    if (playerInWater && this._time - this._lastRippleAt > 0.32) {
      this.addRipple(player.position, 0.45);
      this._lastRippleAt = this._time;
      particles?.spawn?.({
        pos: player.position.clone().setY(activeVolume.surfaceY + 0.05),
        count: 2,
        color: 0xa7fff2,
        speed: 0.75,
        life: 0.45,
        size: 0.12,
        texture: 'circle',
      });
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.age += dt;
      if (ripple.age >= ripple.life) this.ripples.splice(i, 1);
    }

    const cameraPos = camera?.position || new THREE.Vector3(0, 20, 0);
    for (const mesh of this.meshes) {
      const volume = mesh.userData.waterVolume;
      const uniforms = mesh.material.uniforms;
      uniforms.time.value = this._time;
      uniforms.uCameraPosition.value.copy(cameraPos);
      uniforms.rippleCount.value = Math.min(MAX_RIPPLES, this.ripples.length);
      for (let i = 0; i < MAX_RIPPLES; i++) {
        const ripple = this.ripples[i];
        if (!ripple) {
          uniforms.ripples.value[i].set(0, 0, 0, 0);
          continue;
        }
        const t = clamp01(ripple.age / ripple.life);
        uniforms.ripples.value[i].set(
          ripple.x - volume.x,
          ripple.z - volume.z,
          t,
          ripple.strength * (1 - t)
        );
      }
    }
  }

  addRipple(position, strength = 0.7) {
    if (!position) return;
    this.ripples.unshift({
      x: position.x,
      z: position.z,
      age: 0,
      life: 1.25,
      strength,
    });
    if (this.ripples.length > MAX_RIPPLES) this.ripples.length = MAX_RIPPLES;
  }

  getVolumeAt(position, options = {}) {
    if (!position) return null;
    const margin = options.includeSurfaceMargin ? 0.45 : 0;
    for (const mesh of this.meshes) {
      const volume = mesh.userData.waterVolume;
      const sample = this._sampleWaterAt(mesh, position.x, position.z);
      if (!sample.wet) continue;
      if (position.y > volume.surfaceY + margin) continue;
      if (position.y < sample.bottomY - 1.25) continue;
      return {
        ...volume,
        bottomY: sample.bottomY,
        waterDepth: Math.max(0, volume.surfaceY - sample.bottomY),
      };
    }
    return null;
  }

  getStats() {
    return {
      waterMeshes: this.meshes.length,
      waterRipples: this.ripples.length,
    };
  }

  _refreshTerrainWater(mesh, terrain) {
    if (!mesh || !terrain?.getColumnTop) return;
    const sim = mesh.userData.waterSim;
    const volume = mesh.userData.waterVolume;
    if (!sim || sim.revision === terrain.revision) return;

    const n = sim.gridSize;
    const wetCandidates = new Uint8Array(n * n);
    const visited = new Uint8Array(n * n);
    const queue = [];
    const surfaceY = volume.surfaceY;
    const invBaseX = 1 / Math.max(0.1, volume.radiusX);
    const invBaseZ = 1 / Math.max(0.1, volume.radiusZ);
    const invFlowX = 1 / Math.max(0.1, sim.flowRadiusX);
    const invFlowZ = 1 / Math.max(0.1, sim.flowRadiusZ);

    for (let iz = 0; iz < n; iz++) {
      const tz = n === 1 ? 0.5 : iz / (n - 1);
      const localZ = (tz - 0.5) * sim.flowRadiusZ * 2;
      for (let ix = 0; ix < n; ix++) {
        const tx = n === 1 ? 0.5 : ix / (n - 1);
        const localX = (tx - 0.5) * sim.flowRadiusX * 2;
        const index = iz * n + ix;
        const wx = volume.x + localX;
        const wz = volume.z + localZ;
        const flowEllipse = (localX * invFlowX) ** 2 + (localZ * invFlowZ) ** 2;
        if (flowEllipse > 1.0) {
          sim.terrainTop[index] = surfaceY + 1;
          continue;
        }

        const terrainTop = terrain.getColumnTop(wx, wz, surfaceY + 4);
        sim.terrainTop[index] = terrainTop;
        const canHoldWater = terrainTop < surfaceY - WATER_CLEARANCE;
        if (!canHoldWater) continue;
        wetCandidates[index] = 1;

        const baseEllipse = (localX * invBaseX) ** 2 + (localZ * invBaseZ) ** 2;
        if (baseEllipse <= 1.0) {
          visited[index] = 1;
          queue.push(index);
        }
      }
    }

    for (let qi = 0; qi < queue.length; qi++) {
      const index = queue[qi];
      const ix = index % n;
      const iz = Math.floor(index / n);
      const neighbors = [
        [ix + 1, iz],
        [ix - 1, iz],
        [ix, iz + 1],
        [ix, iz - 1],
      ];
      for (const [nx, nz] of neighbors) {
        if (nx < 0 || nx >= n || nz < 0 || nz >= n) continue;
        const ni = nz * n + nx;
        if (!wetCandidates[ni] || visited[ni]) continue;
        visited[ni] = 1;
        queue.push(ni);
      }
    }

    sim.wet.set(visited);
    const maskAttr = mesh.geometry.getAttribute('waterMask');
    const depthAttr = mesh.geometry.getAttribute('waterDepth');
    const shoreAttr = mesh.geometry.getAttribute('shore');
    const flowAttr = mesh.geometry.getAttribute('flowDir');

    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const index = iz * n + ix;
        const wet = visited[index];
        let shore = 0;
        if (wet) {
          const neighbors = [
            [ix + 1, iz],
            [ix - 1, iz],
            [ix, iz + 1],
            [ix, iz - 1],
          ];
          for (const [nx, nz] of neighbors) {
            if (nx < 0 || nx >= n || nz < 0 || nz >= n || !visited[nz * n + nx]) {
              shore = 1;
              break;
            }
          }
        }
        const terrainTop = sim.terrainTop[index];
        maskAttr.array[index] = wet;
        depthAttr.array[index] = wet ? Math.max(0.04, Math.min(6, surfaceY - terrainTop)) : 0;
        shoreAttr.array[index] = shore;
      }
    }

    // Compute flow direction from terrain height gradient for subtle UV distortion
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const index = iz * n + ix;
        if (!visited[index]) {
          flowAttr.array[index * 2] = 0;
          flowAttr.array[index * 2 + 1] = 0;
          continue;
        }
        let dx = 0, dz = 0, count = 0;
        if (ix > 0 && visited[index - 1]) { dx += sim.terrainTop[index - 1] - sim.terrainTop[index]; count++; }
        if (ix < n - 1 && visited[index + 1]) { dx += sim.terrainTop[index + 1] - sim.terrainTop[index]; count++; }
        if (iz > 0 && visited[index - n]) { dz += sim.terrainTop[index - n] - sim.terrainTop[index]; count++; }
        if (iz < n - 1 && visited[index + n]) { dz += sim.terrainTop[index + n] - sim.terrainTop[index]; count++; }
        if (count > 0) {
          flowAttr.array[index * 2] = (dx / count) * 0.5;
          flowAttr.array[index * 2 + 1] = (dz / count) * 0.5;
        } else {
          flowAttr.array[index * 2] = 0;
          flowAttr.array[index * 2 + 1] = 0;
        }
      }
    }

    maskAttr.needsUpdate = true;
    depthAttr.needsUpdate = true;
    shoreAttr.needsUpdate = true;
    flowAttr.needsUpdate = true;
    sim.revision = terrain.revision;
  }

  _sampleWaterAt(mesh, x, z) {
    const sim = mesh?.userData?.waterSim;
    const volume = mesh?.userData?.waterVolume;
    if (!sim || !volume) return { wet: false, bottomY: -999 };

    const localX = x - volume.x;
    const localZ = z - volume.z;
    const u = localX / (sim.flowRadiusX * 2) + 0.5;
    const v = localZ / (sim.flowRadiusZ * 2) + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return { wet: false, bottomY: -999 };

    const n = sim.gridSize;
    const ix = Math.max(0, Math.min(n - 1, Math.round(u * (n - 1))));
    const iz = Math.max(0, Math.min(n - 1, Math.round(v * (n - 1))));
    const index = iz * n + ix;
    if (!sim.wet[index]) return { wet: false, bottomY: -999 };
    const terrainTop = sim.terrainTop[index];
    return {
      wet: true,
      bottomY: Number.isFinite(terrainTop) ? terrainTop : volume.bottomY,
    };
  }

  _spawnContactEffect(position, volume, particles, flipbooks, sfx, strength) {
    if (!position || !volume) return;
    const pos = position.clone();
    pos.y = volume.surfaceY + 0.08;
    particles?.spawn?.({
      pos,
      count: Math.max(4, Math.round(8 * strength)),
      color: 0xb8fff5,
      speed: 1.8 * strength,
      life: 0.55,
      size: 0.18,
      texture: 'circle',
    });
    flipbooks?.spawn?.({
      pos,
      sheetPath: 'Super Pixel Effects Gigapack (Free Version)/spritesheet/Fantasy Spells/spell_attack_up_001/spell_attack_up_001_large_blue/spritesheet.png',
      fps: 20,
      scale: 0.65 + strength * 0.35,
    });
    sfx?.waterSplash?.(strength);
  }

  _createWaterMesh(volume) {
    const flowRadiusX = volume.radiusX + volume.flowMargin;
    const flowRadiusZ = volume.radiusZ + volume.flowMargin;
    const geo = new THREE.PlaneGeometry(flowRadiusX * 2, flowRadiusZ * 2, WATER_SEGMENTS, WATER_SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const vertexCount = (WATER_SEGMENTS + 1) * (WATER_SEGMENTS + 1);
    const mask = new Float32Array(vertexCount);
    const depth = new Float32Array(vertexCount);
    const shore = new Float32Array(vertexCount);
    const flowDir = new Float32Array(vertexCount * 2);
    for (let i = 0; i < vertexCount; i++) {
      mask[i] = 1;
      depth[i] = Math.max(0.05, volume.surfaceY - volume.bottomY);
      shore[i] = 0;
      flowDir[i * 2] = 0;
      flowDir[i * 2 + 1] = 0;
    }
    geo.setAttribute('waterMask', new THREE.BufferAttribute(mask, 1));
    geo.setAttribute('waterDepth', new THREE.BufferAttribute(depth, 1));
    geo.setAttribute('shore', new THREE.BufferAttribute(shore, 1));
    geo.setAttribute('flowDir', new THREE.BufferAttribute(flowDir, 2));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        radius: { value: new THREE.Vector2(volume.radiusX, volume.radiusZ) },
        flowRadius: { value: new THREE.Vector2(flowRadiusX, flowRadiusZ) },
        tintColor: { value: new THREE.Color(volume.tint) },
        foamColor: { value: new THREE.Color(volume.foamColor) },
        uCameraPosition: { value: new THREE.Vector3() },
        rippleCount: { value: 0 },
        ripples: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4()) },
      },
      vertexShader: `
        uniform float time;
        uniform vec2 radius;
        attribute float waterMask;
        attribute float waterDepth;
        attribute float shore;
        attribute vec2 flowDir;
        varying vec2 vLocal;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vWaterMask;
        varying float vWaterDepth;
        varying float vShore;
        varying vec2 vFlowDir;

        void main() {
          vec3 transformed = position;
          vLocal = transformed.xz;
          vWaterMask = waterMask;
          vWaterDepth = waterDepth;
          vShore = shore;
          vFlowDir = flowDir;
          // Flat water pool — surface stays at surfaceY, no per-vertex terrain conforming
          float edgeFade = waterMask * (1.0 - shore * 0.35);
          float waveA = sin(transformed.x * 1.65 + time * 1.7);
          float waveB = sin((transformed.z * 1.9 + transformed.x * 0.35) - time * 1.25);
          float depthFade = smoothstep(0.12, 1.8, waterDepth);
          transformed.y += (waveA * 0.035 + waveB * 0.025) * edgeFade * depthFade;
          vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(normalMatrix * vec3(-waveA * 0.035, 1.0, -waveB * 0.025));
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        #define MAX_RIPPLES ${MAX_RIPPLES}
        uniform float time;
        uniform vec2 radius;
        uniform vec3 tintColor;
        uniform vec3 foamColor;
        uniform vec3 uCameraPosition;
        uniform int rippleCount;
        uniform vec4 ripples[MAX_RIPPLES];
        varying vec2 vLocal;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vWaterMask;
        varying float vWaterDepth;
        varying float vShore;
        varying vec2 vFlowDir;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
          vec2 ellipseCoord = vec2(vLocal.x / radius.x, vLocal.y / radius.y);
          float ellipse = length(ellipseCoord);
          if (vWaterMask < 0.06) discard;

          // Subtle flow distortion from terrain gradient
          vec2 flowOffset = vFlowDir * time * 0.08;
          vec2 flowA = vLocal * 0.18 + vec2(time * 0.045, -time * 0.032) + flowOffset;
          vec2 flowB = vec2(vLocal.y, vLocal.x) * 0.27 + vec2(-time * 0.055, time * 0.038) + flowOffset * 0.7;
          float bands = noise(flowA * 5.0) * 0.55 + noise(flowB * 4.0) * 0.45;

          vec3 viewDir = normalize(uCameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.8);
          float edgeFoam = vShore * (0.45 + bands * 0.55);
          float shimmer = smoothstep(0.68, 1.0, bands) * 0.18;

          // Cheap caustic shimmer on shallow areas
          float caustic = 0.0;
          if (vWaterDepth < 1.5) {
            vec2 causticUv = vLocal * 1.4 + vec2(time * 0.12, time * 0.09);
            caustic = abs(noise(causticUv) - noise(causticUv + 0.3)) * 2.0;
            caustic = smoothstep(0.25, 0.65, caustic) * (1.0 - smoothstep(0.0, 1.5, vWaterDepth));
          }

          float rippleFoam = 0.0;
          for (int i = 0; i < MAX_RIPPLES; i++) {
            if (i < rippleCount) {
              vec4 ripple = ripples[i];
              float age = ripple.z;
              float strength = ripple.w;
              float dist = distance(vLocal, ripple.xy);
              float ringRadius = mix(0.35, 3.3, age);
              float ring = 1.0 - smoothstep(0.0, 0.18 + age * 0.25, abs(dist - ringRadius));
              rippleFoam += ring * strength;
            }
          }
          rippleFoam = clamp(rippleFoam, 0.0, 1.0);

          vec3 color = tintColor;
          float depthTint = smoothstep(0.18, 4.5, vWaterDepth);
          // Deep-hole darkening: excavated areas get richer blue
          color = mix(color * 1.28, color * 0.48, depthTint);
          color = mix(color, vec3(0.56, 0.98, 0.92), fresnel * 0.55 + shimmer);
          // Caustic brighten on shallow bed
          color += vec3(0.55, 0.95, 0.88) * caustic * 0.22;
          float totalFoam = clamp(edgeFoam * 0.55 + rippleFoam * 0.75, 0.0, 1.0);
          color = mix(color, foamColor, totalFoam);

          float alpha = mix(0.28, 0.62, depthTint) + fresnel * 0.18 + edgeFoam * 0.12 + rippleFoam * 0.18;
          alpha *= clamp(vWaterMask, 0.0, 1.0);
          gl_FragColor = vec4(color, clamp(alpha, 0.18, 0.88));
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `water:${volume.id || volume.zoneId || 'volume'}`;
    mesh.position.set(volume.x, volume.surfaceY, volume.z);
    mesh.renderOrder = 4;
    mesh.frustumCulled = true;
    mesh.userData.waterVolume = volume;
    mesh.userData.waterSim = {
      revision: null,
      gridSize: WATER_SEGMENTS + 1,
      flowRadiusX,
      flowRadiusZ,
      wet: new Uint8Array(vertexCount),
      terrainTop: new Float32Array(vertexCount),
    };
    return mesh;
  }
}
