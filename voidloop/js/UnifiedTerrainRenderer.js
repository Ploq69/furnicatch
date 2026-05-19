/**
 * UnifiedTerrainRenderer — WebGL2 unified buffer terrain renderer.
 *
 * Eliminates void glitches by pre-allocating a fixed pool of chunk GPU slots.
 * Chunks are never disposed at runtime; hidden chunks simply stop being drawn.
 * Visible chunks render with a single VAO bind + (multi-)draw calls.
 */

import * as THREE from 'three';

const VERTEX_STRIDE_FLOATS = 7; // position(3) + normal(3) + isFluid(1)
const VERTEX_STRIDE_BYTES = VERTEX_STRIDE_FLOATS * 4;
const DEFAULT_SLOT_VERTICES = 32768; // enough for ~5461 quads (6 verts each)
const DEFAULT_SLOT_COUNT = 260;   // enough for independent levels with CHUNK_SIZE=16

const SLOT_FREE = 0;
const SLOT_READY = 1;
const SLOT_DIRTY = 2;

const ATTRIB_LOCATIONS = {
  aPosition: 0,
  aNormal: 1,
  aIsFluid: 2,
};

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aNormal;
in float aIsFluid;

out vec3 vNormal;
out vec3 vWorldPos;
out vec3 vBlockPos;
out float vFaceAxis;

uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform float time;

void main() {
  vNormal = normalize(mat3(uViewMatrix) * aNormal);
  vBlockPos = aPosition;

  if (aNormal.x > 0.5) vFaceAxis = 0.0;
  else if (aNormal.x < -0.5) vFaceAxis = 1.0;
  else if (aNormal.y > 0.5) vFaceAxis = 2.0;
  else if (aNormal.y < -0.5) vFaceAxis = 3.0;
  else if (aNormal.z > 0.5) vFaceAxis = 4.0;
  else vFaceAxis = 5.0;

  vec4 worldPos = vec4(aPosition, 1.0);
  if (aIsFluid > 0.5) {
    float rippleA = sin((aPosition.x * 1.35 + aPosition.z * 0.95) + time * 1.55) * 0.025;
    float rippleB = cos((aPosition.x * -0.72 + aPosition.z * 1.48) - time * 1.15) * 0.018;
    worldPos.y += rippleA + rippleB;
  }
  vWorldPos = worldPos.xyz;
  gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp usampler3D;
precision highp usampler2D;

uniform float time;
uniform float renderMode;
uniform float shaderQuality;
uniform vec3 lightDir;
uniform float lightIntensity;
uniform vec3 cutawayCenter;
uniform vec2 cutawayForward;
uniform float cutawayRadius;
uniform float cutawayReach;
uniform float cutawayCeilingY;
uniform float cutawayAmount;
uniform sampler2D tileAtlas;
uniform vec4 atlasRects[256];
uniform usampler3D zoneBlockData;
uniform ivec3 zoneBlockDataOrigin;
uniform usampler2D tileIndexMap;
uniform vec3 uCameraPosition;
uniform mat4 uViewMatrix;
uniform float fogEnabled;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform int passMode;

// Pet point light
uniform vec3 pointLightPos;
uniform vec3 pointLightColor;
uniform float pointLightIntensity;
uniform float pointLightDistance;

in vec3 vNormal;
in vec3 vWorldPos;
in vec3 vBlockPos;
in float vFaceAxis;

out vec4 fragColor;

int getTileIndex(int materialId, int faceKind) {
  int idx = materialId * 3 + faceKind;
  uvec4 texel = texelFetch(tileIndexMap, ivec2(idx, 0), 0);
  return int(texel.r);
}

int getFaceKind(int faceAxis) {
  if (faceAxis == 2) return 0;
  if (faceAxis == 3) return 2;
  return 1;
}

vec2 getFaceUv(vec3 worldPos, int faceAxis) {
  if (faceAxis == 2 || faceAxis == 3) return worldPos.xz;
  if (faceAxis == 0 || faceAxis == 1) return worldPos.zy;
  return worldPos.xy;
}

vec4 sampleAtlas(int tileIndex, vec2 uv) {
  vec4 r = atlasRects[tileIndex];
  vec2 localUv = fract(uv);
  localUv = localUv * 0.96875 + vec2(0.015625);
  vec2 atlasUv = localUv * r.zw + r.xy;
  vec2 dx = dFdx(uv) * r.zw * 0.96875;
  vec2 dy = dFdy(uv) * r.zw * 0.96875;
  return textureGrad(tileAtlas, atlasUv, dx, dy);
}

// Voxel raymarched shadows with edge softness approximation.
// zoneBlockData stores 0 for air, matId+1 for solid blocks.
float voxelShadow(vec3 worldPos, vec3 normal, vec3 lDir, ivec3 origin) {
  if (shaderQuality < 0.55) return 1.0;

  vec3 ro = worldPos + normal * 0.05;
  vec3 rd = normalize(lDir);

  // Interleaved gradient noise for dithered step offset
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float t = 0.35 + dither * 0.7;

  int maxSteps = int(mix(10.0, 22.0, shaderQuality));
  float maxDist = mix(10.0, 26.0, shaderQuality);

  for (int i = 0; i < 20; i++) {
    if (i >= maxSteps || t > maxDist) break;
    vec3 p = ro + rd * t;
    ivec3 bp = ivec3(floor(p));
    uvec4 d = texelFetch(zoneBlockData, bp - origin, 0);
    if (d.r > 0u) {
      // Estimate edge proximity by checking 6 face neighbors.
      // More empty neighbors = closer to edge = softer shadow.
      float emptyNeighbors = 0.0;
      emptyNeighbors += float(texelFetch(zoneBlockData, bp + ivec3(1,0,0) - origin, 0).r == 0u);
      emptyNeighbors += float(texelFetch(zoneBlockData, bp + ivec3(-1,0,0) - origin, 0).r == 0u);
      emptyNeighbors += float(texelFetch(zoneBlockData, bp + ivec3(0,1,0) - origin, 0).r == 0u);
      emptyNeighbors += float(texelFetch(zoneBlockData, bp + ivec3(0,-1,0) - origin, 0).r == 0u);
      emptyNeighbors += float(texelFetch(zoneBlockData, bp + ivec3(0,0,1) - origin, 0).r == 0u);
      emptyNeighbors += float(texelFetch(zoneBlockData, bp + ivec3(0,0,-1) - origin, 0).r == 0u);
      float softness = emptyNeighbors / 6.0;
      return mix(0.04, 0.55, softness);
    }
    t += 0.92;
  }
  return 1.0;
}

void main() {
  ivec3 blockPos = ivec3(floor(vBlockPos));
  int faceAxis = int(floor(vFaceAxis + 0.5));

  // Faces on the positive axis are emitted at the max boundary of the block,
  // so we need to step back to sample the correct block.
  // Faces on the negative axis are emitted at the min boundary, so no offset.
  if (faceAxis == 0) blockPos.x -= 1;
  else if (faceAxis == 2) blockPos.y -= 1;
  else if (faceAxis == 4) blockPos.z -= 1;

  uvec4 blockData = texelFetch(zoneBlockData, blockPos - zoneBlockDataOrigin, 0);
  // Decode: 0 = air, solid = matId + 1
  int materialId = int(blockData.r) - 1;

  int faceKind = getFaceKind(faceAxis);
  int tileIdx = getTileIndex(materialId, faceKind);

  bool blendedMaterial = materialId == 4 || materialId == 7 || materialId == 9;
  bool cutoutMaterial =
    materialId == 19 || materialId == 21 || materialId == 23 || materialId == 25 || materialId == 27 ||
    materialId == 28 || materialId == 29 || materialId == 30 || materialId == 41 ||
    materialId == 42 || materialId == 43;

  if (passMode == 0 && blendedMaterial) discard;
  if (passMode == 1 && !blendedMaterial) discard;

  vec2 sampleUv = getFaceUv(vWorldPos, faceAxis);
  if (materialId == 9) {
    float waveA = sin(vWorldPos.x * 1.18 + vWorldPos.z * 0.63 + time * 1.65) * 0.028;
    float waveB = cos(vWorldPos.z * 1.07 - vWorldPos.x * 0.44 - time * 1.25) * 0.022;
    sampleUv += vec2(time * 0.075 + waveA, time * 0.045 + waveB);
  } else if (materialId == 4) {
    sampleUv += vec2(sin(time * 1.4 + vWorldPos.z * 0.8), cos(time * 1.1 + vWorldPos.x * 0.6)) * 0.018;
  }

  vec4 texel = sampleAtlas(tileIdx, sampleUv);
  if (cutoutMaterial && texel.a < 0.45) discard;
  vec3 color = texel.rgb;

  vec2 toPoint = vWorldPos.xz - cutawayCenter.xz;
  float corridorT = clamp(dot(toPoint, normalize(cutawayForward)), 0.0, cutawayReach);
  vec2 nearest = cutawayCenter.xz + normalize(cutawayForward) * corridorT;
  float horizontalDist = distance(vWorldPos.xz, nearest);
  float corridorBoost = smoothstep(0.0, max(0.001, cutawayReach), corridorT) * 1.5;
  float localRadius = cutawayRadius + corridorBoost;
  float radialMask = 1.0 - smoothstep(localRadius * 0.82, localRadius, horizontalDist);
  float heightMask = smoothstep(cutawayCeilingY - 0.10, cutawayCeilingY + 0.30, vWorldPos.y);
  float cutMask = clamp(radialMask * heightMask * cutawayAmount, 0.0, 1.0);
  if (cutMask > 0.42) discard;

  float alpha = 1.0;
  if (materialId == 9) {
    float topFace = 1.0 - step(0.5, abs(float(faceKind)));
    float shimmer = sin(time * 2.4 + vWorldPos.x * 0.58 + vWorldPos.z * 0.37) * 0.5 + 0.5;
    float crossing = sin((vWorldPos.x + vWorldPos.z) * 2.25 + time * 2.1) * 0.5 + 0.5;
    float flowLine = smoothstep(0.82, 1.0, crossing) * topFace;
    vec3 deepTint = vec3(0.08, 0.42, 0.56);
    vec3 brightTint = vec3(0.42, 0.88, 0.98);
    color = mix(color, deepTint, 0.36);
    color = mix(color, brightTint, 0.10 + flowLine * 0.18 + shimmer * 0.05);
    alpha = mix(0.32, 0.43, topFace) + shimmer * 0.035;
  } else if (materialId == 7) {
    alpha = 0.82;
    color = mix(color, vec3(0.68, 0.92, 1.0), 0.22);
  } else if (materialId == 4) {
    alpha = 0.92;
    color *= 1.25 + 0.08 * sin(time * 4.0 + vWorldPos.x * 0.7 + vWorldPos.z * 0.5);
  } else if (materialId == 19 || materialId == 21 || materialId == 23 || materialId == 25 || materialId == 27) {
    color = mix(color, vec3(0.4, 0.6, 0.25), 0.12);
  }

  // Lighting & shadows
  vec3 viewLightDir = normalize(mat3(uViewMatrix) * lightDir);
  float NdotL = max(dot(vNormal, viewLightDir), 0.0);
  float daylight = clamp(lightIntensity / 2.0, 0.0, 1.0);
  float skyAmbient = mix(0.24, 0.56, daylight);
  float faceAmbient = skyAmbient;
  if (faceAxis == 2) faceAmbient *= 1.15;
  else if (faceAxis == 3) faceAmbient *= 0.62;
  else faceAmbient *= 0.92;
  float diffuse = faceAmbient + NdotL * lightIntensity * 0.68;
  float shadow = voxelShadow(vWorldPos, normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos))), lightDir, zoneBlockDataOrigin);
  color *= faceAmbient + (diffuse - faceAmbient) * shadow;

  // Point light (pet) contribution — additive on top of sun lighting
  if (pointLightIntensity > 0.0) {
    float petDist = distance(vWorldPos, pointLightPos);
    if (petDist < pointLightDistance) {
      float petAtten = 1.0 / (1.0 + 0.1 * petDist + 0.02 * petDist * petDist);
      // Full 360° illumination — no normal dependence for close-range pet glow
      vec3 petLight = pointLightColor * pointLightIntensity * petAtten;
      color += texel.rgb * petLight;
    }
  }

  float fogT = smoothstep(fogNear, fogFar, distance(uCameraPosition, vWorldPos)) * fogEnabled;
  color = mix(color, fogColor, fogT);

  fragColor = vec4(color, alpha);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    console.error('Shader compile error:', info);
    gl.deleteShader(shader);
    throw new Error('Shader compile failed: ' + info);
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  for (const [name, location] of Object.entries(ATTRIB_LOCATIONS)) {
    gl.bindAttribLocation(program, location, name);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    console.error('Program link error:', info);
    gl.deleteProgram(program);
    throw new Error('Program link failed: ' + info);
  }
  return program;
}

export class UnifiedTerrainRenderer {
  constructor(threeRenderer, options = {}) {
    this.gl = threeRenderer.getContext();
    if (!this.gl) {
      throw new Error('UnifiedTerrainRenderer requires a WebGL2 context');
    }

    this.threeRenderer = threeRenderer;
    this.chunkSize = options.chunkSize || 8;
    this.chunkCenterOffset = this.chunkSize * 0.5;
    this.slotVertices = options.slotVertices || DEFAULT_SLOT_VERTICES;
    this.slotCount = options.slotCount || DEFAULT_SLOT_COUNT;

    // Compile shader
    this.program = createProgram(this.gl, VERTEX_SHADER, FRAGMENT_SHADER);
    this.gl.useProgram(this.program);
    this._validateAttributeLayout();

    // Cache uniform locations
    this.uProjectionMatrix = this.gl.getUniformLocation(this.program, 'uProjectionMatrix');
    this.uViewMatrix = this.gl.getUniformLocation(this.program, 'uViewMatrix');
    this.uCameraPosition = this.gl.getUniformLocation(this.program, 'uCameraPosition');
    this.uTime = this.gl.getUniformLocation(this.program, 'time');
    this.uRenderMode = this.gl.getUniformLocation(this.program, 'renderMode');
    this.uShaderQuality = this.gl.getUniformLocation(this.program, 'shaderQuality');
    this.uLightDir = this.gl.getUniformLocation(this.program, 'lightDir');
    this.uLightIntensity = this.gl.getUniformLocation(this.program, 'lightIntensity');
    this.uCutawayCenter = this.gl.getUniformLocation(this.program, 'cutawayCenter');
    this.uCutawayForward = this.gl.getUniformLocation(this.program, 'cutawayForward');
    this.uCutawayRadius = this.gl.getUniformLocation(this.program, 'cutawayRadius');
    this.uCutawayReach = this.gl.getUniformLocation(this.program, 'cutawayReach');
    this.uCutawayCeilingY = this.gl.getUniformLocation(this.program, 'cutawayCeilingY');
    this.uCutawayAmount = this.gl.getUniformLocation(this.program, 'cutawayAmount');
    this.uTileAtlas = this.gl.getUniformLocation(this.program, 'tileAtlas');
    this.uAtlasRects = this.gl.getUniformLocation(this.program, 'atlasRects');
    this.uZoneBlockData = this.gl.getUniformLocation(this.program, 'zoneBlockData');
    this.uZoneBlockDataOrigin = this.gl.getUniformLocation(this.program, 'zoneBlockDataOrigin');
    this.uTileIndexMap = this.gl.getUniformLocation(this.program, 'tileIndexMap');
    this.uFogEnabled = this.gl.getUniformLocation(this.program, 'fogEnabled');
    this.uFogColor = this.gl.getUniformLocation(this.program, 'fogColor');
    this.uFogNear = this.gl.getUniformLocation(this.program, 'fogNear');
    this.uFogFar = this.gl.getUniformLocation(this.program, 'fogFar');
    this.uPassMode = this.gl.getUniformLocation(this.program, 'passMode');
    this.uPointLightPos = this.gl.getUniformLocation(this.program, 'pointLightPos');
    this.uPointLightColor = this.gl.getUniformLocation(this.program, 'pointLightColor');
    this.uPointLightIntensity = this.gl.getUniformLocation(this.program, 'pointLightIntensity');
    this.uPointLightDistance = this.gl.getUniformLocation(this.program, 'pointLightDistance');

    // Chunk slots
    this.slots = [];
    for (let i = 0; i < this.slotCount; i++) {
      this.slots.push({
        index: i,
        state: SLOT_FREE,
        cx: 0, cy: 0, cz: 0,
        vertexOffset: i * this.slotVertices,
        vertexCount: 0,
        hasTransparent: false,
        truncated: false,
        lastUsed: 0,
      });
    }
    this.chunkKeyToSlot = new Map(); // "cx,cy,cz" -> slotIndex
    this.freeSlots = [];
    for (let i = 0; i < this.slotCount; i++) this.freeSlots.push(i);

    // Create VAO
    this.vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(this.vao);

    // Create VBO
    const totalVertices = this.slotCount * this.slotVertices;
    this.vbo = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, totalVertices * VERTEX_STRIDE_BYTES, this.gl.DYNAMIC_DRAW);

    // Set up attributes
    const stride = VERTEX_STRIDE_BYTES;
    // aPosition
    this.gl.enableVertexAttribArray(ATTRIB_LOCATIONS.aPosition);
    this.gl.vertexAttribPointer(ATTRIB_LOCATIONS.aPosition, 3, this.gl.FLOAT, false, stride, 0);
    // aNormal
    this.gl.enableVertexAttribArray(ATTRIB_LOCATIONS.aNormal);
    this.gl.vertexAttribPointer(ATTRIB_LOCATIONS.aNormal, 3, this.gl.FLOAT, false, stride, 12);
    // aIsFluid
    this.gl.enableVertexAttribArray(ATTRIB_LOCATIONS.aIsFluid);
    this.gl.vertexAttribPointer(ATTRIB_LOCATIONS.aIsFluid, 1, this.gl.FLOAT, false, stride, 24);

    this.gl.bindVertexArray(null);

    // Multi-draw extension
    this.multiDrawExt = this.gl.getExtension('WEBGL_multi_draw');
    console.log('[UnifiedTerrainRenderer] Initialized with', this.slotCount, 'slots,', this.slotVertices, 'verts/slot. WebGL multi-draw:', !!this.multiDrawExt);

    // Uniform state cache
    this._lastProjection = new Float32Array(16);
    this._lastView = new Float32Array(16);
    this._lastCameraPos = new Float32Array(3);
    this._cutawayUniforms = {
      center: new Float32Array([0, 0, 0]),
      forward: new Float32Array([1, 0]),
      radius: 9,
      reach: 0,
      ceilingY: 2,
      amount: 0,
    };
    this._lightDir = new Float32Array([0.35, 0.85, 0.32]);
    this._lightIntensity = 1.0;
    this._pointLight = {
      pos: new Float32Array([0, -1000, 0]),
      color: new Float32Array([1, 1, 1]),
      intensity: 0,
      distance: 1,
    };
    this._renderMode = 0;
    this._shaderQuality = 1;
    this._time = 0;
    this._fogEnabled = 0;
    this._fogColor = new Float32Array([0.74, 0.9, 1.0]);
    this._fogNear = 80;
    this._fogFar = 260;
    this._atlasTexture = null;
    this._atlasRectsArray = null;
    this._zoneBlockTexture = null;
    this._zoneBlockOrigin = new THREE.Vector3(0, 0, 0);
    this._tileIndexMapTexture = null;

    // Draw list buffers for multi-draw
    this._firsts = new Int32Array(this.slotCount);
    this._counts = new Int32Array(this.slotCount);
    this._transparentFirsts = new Int32Array(this.slotCount);
    this._transparentCounts = new Int32Array(this.slotCount);
    this._transparentSlots = [];

    // Stats
    this.stats = {
      drawCalls: 0,
      visibleChunks: 0,
      slotUtilization: 0,
      truncatedSlots: 0,
      maxUploadedVertices: 0,
    };
  }

  _validateAttributeLayout() {
    for (const [name, expected] of Object.entries(ATTRIB_LOCATIONS)) {
      const actual = this.gl.getAttribLocation(this.program, name);
      if (actual !== -1 && actual !== expected) {
        console.warn(`[UnifiedTerrainRenderer] Attribute ${name} linked at ${actual}, expected ${expected}`);
      }
    }
  }

  /** Acquire a slot for a chunk. Returns slot index or -1 if full. */
  acquireSlot(cx, cy, cz) {
    const key = `${cx},${cy},${cz}`;
    const existing = this.chunkKeyToSlot.get(key);
    if (existing !== undefined) {
      const slot = this.slots[existing];
      slot.state = SLOT_DIRTY;
      slot.lastUsed = performance.now();
      return existing;
    }

    if (this.freeSlots.length === 0) {
      // Evict least-recently-used non-visible slot
      let lruIdx = -1;
      let lruTime = Infinity;
      for (let i = 0; i < this.slotCount; i++) {
        const s = this.slots[i];
        if (s.state === SLOT_READY && s.lastUsed < lruTime) {
          lruTime = s.lastUsed;
          lruIdx = i;
        }
      }
      if (lruIdx < 0) return -1;
      this._evictSlot(lruIdx);
    }

    const slotIndex = this.freeSlots.pop();
    const slot = this.slots[slotIndex];
    slot.state = SLOT_DIRTY;
    slot.cx = cx;
    slot.cy = cy;
    slot.cz = cz;
    slot.vertexCount = 0;
    slot.lastUsed = performance.now();
    this.chunkKeyToSlot.set(key, slotIndex);
    return slotIndex;
  }

  _evictSlot(slotIndex) {
    const slot = this.slots[slotIndex];
    const key = `${slot.cx},${slot.cy},${slot.cz}`;
    this.chunkKeyToSlot.delete(key);
    slot.state = SLOT_FREE;
    slot.cx = slot.cy = slot.cz = 0;
    slot.vertexCount = 0;
    slot.hasTransparent = false;
    slot.truncated = false;
    this.freeSlots.push(slotIndex);
  }

  /** Upload vertex data for a chunk slot. data is Float32Array of interleaved vertices. */
  uploadSlot(slotIndex, data, hasTransparent = false) {
    const slot = this.slots[slotIndex];
    const vertCount = Math.floor(data.length / VERTEX_STRIDE_FLOATS);
    if (vertCount > this.slotVertices) {
      console.warn(`[UnifiedTerrainRenderer] Chunk ${slot.cx},${slot.cy},${slot.cz} exceeds slot capacity: ${vertCount} > ${this.slotVertices}. Truncating.`);
    }
    slot.vertexCount = Math.min(vertCount, this.slotVertices);
    slot.hasTransparent = hasTransparent;
    slot.truncated = vertCount > this.slotVertices;
    this.stats.maxUploadedVertices = Math.max(this.stats.maxUploadedVertices || 0, vertCount);
    slot.state = SLOT_READY;
    slot.lastUsed = performance.now();

    const byteOffset = slot.vertexOffset * VERTEX_STRIDE_BYTES;
    const byteLength = slot.vertexCount * VERTEX_STRIDE_BYTES;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, byteOffset, data, 0, Math.floor(byteLength / 4));
  }

  /** Mark a chunk slot as dirty so it gets rebuilt. */
  markSlotDirty(cx, cy, cz) {
    const key = `${cx},${cy},${cz}`;
    const slotIndex = this.chunkKeyToSlot.get(key);
    if (slotIndex !== undefined) {
      this.slots[slotIndex].state = SLOT_DIRTY;
    }
  }

  /** Return true when a chunk currently has uploaded, drawable vertex data. */
  hasReadySlot(cx, cy, cz) {
    const key = `${cx},${cy},${cz}`;
    const slotIndex = this.chunkKeyToSlot.get(key);
    if (slotIndex === undefined) return false;
    const slot = this.slots[slotIndex];
    return slot.state === SLOT_READY && slot.vertexCount > 0;
  }

  /** Release a slot (e.g. when terrain is cleared). */
  releaseSlotByChunk(cx, cy, cz) {
    const key = `${cx},${cy},${cz}`;
    const slotIndex = this.chunkKeyToSlot.get(key);
    if (slotIndex !== undefined) {
      this._evictSlot(slotIndex);
    }
  }

  /** Release all slots. */
  clear() {
    this.chunkKeyToSlot.clear();
    this.freeSlots = [];
    for (let i = 0; i < this.slotCount; i++) {
      this.slots[i].state = SLOT_FREE;
      this.slots[i].vertexCount = 0;
      this.slots[i].hasTransparent = false;
      this.slots[i].truncated = false;
      this.slots[i].cx = this.slots[i].cy = this.slots[i].cz = 0;
      this.freeSlots.push(i);
    }
  }

  /** Set atlas texture (THREE.Texture). */
  setAtlasTexture(texture) {
    this._atlasTexture = texture;
  }

  /** Set atlas rects uniform array. */
  setAtlasRects(rects) {
    // rects is array of THREE.Vector4 or plain {x,y,z,w}
    if (!this._atlasRectsArray) {
      this._atlasRectsArray = new Float32Array(256 * 4);
    }
    for (let i = 0; i < Math.min(rects.length, 256); i++) {
      const r = rects[i];
      this._atlasRectsArray[i * 4 + 0] = r.x;
      this._atlasRectsArray[i * 4 + 1] = r.y;
      this._atlasRectsArray[i * 4 + 2] = r.z;
      this._atlasRectsArray[i * 4 + 3] = r.w;
    }
  }

  /** Set zone block data 3D texture. */
  setZoneBlockTexture(texture, origin) {
    this._zoneBlockTexture = texture;
    this._zoneBlockOrigin.copy(origin);
  }

  /** Set tile index map 1D texture. */
  setTileIndexMapTexture(texture) {
    this._tileIndexMapTexture = texture;
  }

  /** Update cutaway uniforms. */
  setCutaway(center, forward, radius, reach, ceilingY, amount) {
    this._cutawayUniforms.center[0] = center.x;
    this._cutawayUniforms.center[1] = center.y;
    this._cutawayUniforms.center[2] = center.z;
    this._cutawayUniforms.forward[0] = forward.x;
    this._cutawayUniforms.forward[1] = forward.y;
    this._cutawayUniforms.radius = radius;
    this._cutawayUniforms.reach = reach;
    this._cutawayUniforms.ceilingY = ceilingY;
    this._cutawayUniforms.amount = amount;
  }

  /** Update render mode (0 = iso, 1 = thirdPerson). */
  setRenderMode(mode) {
    this._renderMode = mode === 'thirdPerson' ? 1 : 0;
  }

  setShaderQuality(quality) {
    this._shaderQuality = quality;
  }

  setLightDir(x, y, z) {
    this._lightDir[0] = x;
    this._lightDir[1] = y;
    this._lightDir[2] = z;
  }

  setLightIntensity(v) {
    this._lightIntensity = v;
  }

  setPointLight(x, y, z, color, intensity, distance) {
    this._pointLight.pos[0] = x;
    this._pointLight.pos[1] = y;
    this._pointLight.pos[2] = z;
    if (typeof color === 'number') {
      this._pointLight.color[0] = ((color >> 16) & 255) / 255;
      this._pointLight.color[1] = ((color >> 8) & 255) / 255;
      this._pointLight.color[2] = (color & 255) / 255;
    } else if (color && color.r != null) {
      this._pointLight.color[0] = color.r;
      this._pointLight.color[1] = color.g;
      this._pointLight.color[2] = color.b;
    }
    this._pointLight.intensity = intensity;
    this._pointLight.distance = distance;
  }

  setFog(options = {}) {
    this._fogEnabled = options.enabled ? 1 : 0;
    if (options.color != null) {
      if (typeof options.color === 'number') {
        this._fogColor[0] = ((options.color >> 16) & 255) / 255;
        this._fogColor[1] = ((options.color >> 8) & 255) / 255;
        this._fogColor[2] = (options.color & 255) / 255;
      } else if (options.color.r != null) {
        this._fogColor[0] = options.color.r;
        this._fogColor[1] = options.color.g;
        this._fogColor[2] = options.color.b;
      }
    }
    if (Number.isFinite(options.near)) this._fogNear = options.near;
    if (Number.isFinite(options.far)) this._fogFar = Math.max(this._fogNear + 0.001, options.far);
  }

  setTime(t) {
    this._time = t;
  }

  /** Render all visible chunks. visibleKeys is a Set/Array of "cx,cy,cz" strings. */
  render(camera, visibleKeys) {
    if (!this._atlasTexture) return;

    const gl = this.gl;
    const program = this.program;

    // Save current GL state
    const prevVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    const prevProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    const prevBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    const prevDepthTest = gl.getParameter(gl.DEPTH_TEST);
    const prevCullFace = gl.getParameter(gl.CULL_FACE);
    const prevFrontFace = gl.getParameter(gl.FRONT_FACE);
    const prevBlend = gl.getParameter(gl.BLEND);
    const prevDepthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
    const prevViewport = gl.getParameter(gl.VIEWPORT);

    // Build draw list from visible keys
    let drawCount = 0;
    this._transparentSlots.length = 0;
    for (const key of visibleKeys) {
      const slotIndex = this.chunkKeyToSlot.get(key);
      if (slotIndex === undefined) continue;
      const slot = this.slots[slotIndex];
      if (slot.state !== SLOT_READY || slot.vertexCount === 0) continue;
      this._firsts[drawCount] = slot.vertexOffset;
      this._counts[drawCount] = slot.vertexCount;
      drawCount++;
      if (slot.hasTransparent) {
        this._transparentSlots.push(slot);
      }
    }
    const camPos = camera.position;
    this._transparentSlots.sort((a, b) => {
      const adx = a.cx * this.chunkSize + this.chunkCenterOffset - camPos.x;
      const ady = a.cy * this.chunkSize + this.chunkCenterOffset - camPos.y;
      const adz = a.cz * this.chunkSize + this.chunkCenterOffset - camPos.z;
      const bdx = b.cx * this.chunkSize + this.chunkCenterOffset - camPos.x;
      const bdy = b.cy * this.chunkSize + this.chunkCenterOffset - camPos.y;
      const bdz = b.cz * this.chunkSize + this.chunkCenterOffset - camPos.z;
      return (bdx * bdx + bdy * bdy + bdz * bdz) - (adx * adx + ady * ady + adz * adz);
    });
    let transparentDrawCount = 0;
    for (const slot of this._transparentSlots) {
      this._transparentFirsts[transparentDrawCount] = slot.vertexOffset;
      this._transparentCounts[transparentDrawCount] = slot.vertexCount;
      transparentDrawCount++;
    }
    this.stats.slotUtilization = this.chunkKeyToSlot.size;
    this.stats.truncatedSlots = this.slots.reduce((sum, slot) => sum + (slot.truncated ? 1 : 0), 0);

    if (drawCount === 0) {
      this.stats.drawCalls = 0;
      this.stats.visibleChunks = 0;
      return;
    }

    // Use our program
    gl.useProgram(program);
    gl.bindVertexArray(this.vao);

    // Upload uniforms
    const proj = camera.projectionMatrix.elements;
    const view = camera.matrixWorldInverse.elements;
    gl.uniformMatrix4fv(this.uProjectionMatrix, false, proj);
    gl.uniformMatrix4fv(this.uViewMatrix, false, view);

    gl.uniform3f(this.uCameraPosition, camPos.x, camPos.y, camPos.z);
    gl.uniform1f(this.uTime, this._time);
    gl.uniform1f(this.uRenderMode, this._renderMode);
    gl.uniform1f(this.uShaderQuality, this._shaderQuality);
    gl.uniform3f(this.uLightDir, this._lightDir[0], this._lightDir[1], this._lightDir[2]);
    gl.uniform1f(this.uLightIntensity, this._lightIntensity);
    gl.uniform3f(this.uPointLightPos, this._pointLight.pos[0], this._pointLight.pos[1], this._pointLight.pos[2]);
    gl.uniform3f(this.uPointLightColor, this._pointLight.color[0], this._pointLight.color[1], this._pointLight.color[2]);
    gl.uniform1f(this.uPointLightIntensity, this._pointLight.intensity);
    gl.uniform1f(this.uPointLightDistance, this._pointLight.distance);
    gl.uniform1f(this.uFogEnabled, this._fogEnabled);
    gl.uniform3f(this.uFogColor, this._fogColor[0], this._fogColor[1], this._fogColor[2]);
    gl.uniform1f(this.uFogNear, this._fogNear);
    gl.uniform1f(this.uFogFar, this._fogFar);
    gl.uniform3f(this.uCutawayCenter, this._cutawayUniforms.center[0], this._cutawayUniforms.center[1], this._cutawayUniforms.center[2]);
    gl.uniform2f(this.uCutawayForward, this._cutawayUniforms.forward[0], this._cutawayUniforms.forward[1]);
    gl.uniform1f(this.uCutawayRadius, this._cutawayUniforms.radius);
    gl.uniform1f(this.uCutawayReach, this._cutawayUniforms.reach);
    gl.uniform1f(this.uCutawayCeilingY, this._cutawayUniforms.ceilingY);
    gl.uniform1f(this.uCutawayAmount, this._cutawayUniforms.amount);

    // Bind atlas texture to unit 0
    // Ensure texture is uploaded to GPU
    if (this._atlasTexture && !this._atlasTexture.__webglTexture && this.threeRenderer.initTexture) {
      this.threeRenderer.initTexture(this._atlasTexture);
    }
    const texProperties = this.threeRenderer.properties.get(this._atlasTexture);
    const glTexture = texProperties && texProperties.__webglTexture ? texProperties.__webglTexture : this._atlasTexture?.__webglTexture;
    if (glTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glTexture);
      gl.uniform1i(this.uTileAtlas, 0);
    }

    if (this._atlasRectsArray) {
      gl.uniform4fv(this.uAtlasRects, this._atlasRectsArray);
    }

    // Bind zone block data texture to unit 2
    if (this._zoneBlockTexture) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_3D, this._zoneBlockTexture);
      gl.uniform1i(this.uZoneBlockData, 2);
      gl.uniform3i(this.uZoneBlockDataOrigin, this._zoneBlockOrigin.x, this._zoneBlockOrigin.y, this._zoneBlockOrigin.z);
    }

    // Bind tile index map texture to unit 1
    if (this._tileIndexMapTexture) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this._tileIndexMapTexture);
      gl.uniform1i(this.uTileIndexMap, 1);
    }

    // Depth test & culling
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);

    const drawPass = (firsts, counts, count) => {
      if (count <= 0) return 0;
      if (this.multiDrawExt && count > 1) {
        this.multiDrawExt.multiDrawArraysWEBGL(
          gl.TRIANGLES,
          firsts, 0,
          counts, 0,
          count
        );
        return 1;
      }
      for (let i = 0; i < count; i++) {
        gl.drawArrays(gl.TRIANGLES, firsts[i], counts[i]);
      }
      return count;
    };

    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.uniform1i(this.uPassMode, 0);
    const opaqueCalls = drawPass(this._firsts, this._counts, drawCount);

    let transparentCalls = 0;
    if (transparentDrawCount > 0) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.uniform1i(this.uPassMode, 1);
      transparentCalls = drawPass(this._transparentFirsts, this._transparentCounts, transparentDrawCount);
      gl.depthMask(true);
    }

    this.stats.drawCalls = opaqueCalls + transparentCalls;

    this.stats.visibleChunks = drawCount;

    // Restore GL state
    gl.bindVertexArray(prevVAO);
    gl.useProgram(prevProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, prevBuffer);
    if (!prevDepthTest) gl.disable(gl.DEPTH_TEST);
    if (prevCullFace) gl.enable(gl.CULL_FACE);
    else gl.disable(gl.CULL_FACE);
    gl.frontFace(prevFrontFace);
    if (prevBlend) gl.enable(gl.BLEND);
    else gl.disable(gl.BLEND);
    gl.depthMask(prevDepthMask);
    gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
    if (this.threeRenderer.resetState) {
      this.threeRenderer.resetState();
    } else {
      this.threeRenderer.state?.reset?.();
    }
  }
}
