/**
 * UnifiedTerrainRenderer — WebGL2 unified buffer terrain renderer.
 *
 * Eliminates void glitches by pre-allocating a fixed pool of chunk GPU slots.
 * Chunks are never disposed at runtime; hidden chunks simply stop being drawn.
 * Visible chunks render with a single VAO bind + (multi-)draw calls.
 */

const VERTEX_STRIDE_FLOATS = 14; // position(3) + color(3) + normal(3) + uv(2) + materialId(1) + faceKind(1) + tileIndex(1)
const VERTEX_STRIDE_BYTES = VERTEX_STRIDE_FLOATS * 4;
const DEFAULT_SLOT_VERTICES = 12288; // enough for ~2048 quads (6 verts each)
const DEFAULT_SLOT_COUNT = 520;   // match LIVE_CHUNK_CAP

const SLOT_FREE = 0;
const SLOT_READY = 1;
const SLOT_DIRTY = 2;

const ATTRIB_LOCATIONS = {
  aPosition: 0,
  aColor: 1,
  aNormal: 2,
  aUv: 3,
  aMaterialId: 4,
  aFaceKind: 5,
  aTileIndex: 6,
};

const VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aColor;
in vec3 aNormal;
in vec2 aUv;
in float aMaterialId;
in float aFaceKind;
in float aTileIndex;

out vec3 vNormal;
out vec2 vUv;
out float vMaterialId;
out float vFaceKind;
out float vTileIndex;
out vec3 vWorldPos;

uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;

void main() {
  vMaterialId = aMaterialId;
  vFaceKind = aFaceKind;
  vTileIndex = aTileIndex;
  vNormal = normalize(mat3(uViewMatrix) * aNormal);
  vUv = aUv;
  vec4 worldPos = vec4(aPosition, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float time;
uniform float renderMode;
uniform float shaderQuality;
uniform vec3 lightDir;
uniform vec3 cutawayCenter;
uniform vec2 cutawayForward;
uniform float cutawayRadius;
uniform float cutawayReach;
uniform float cutawayCeilingY;
uniform float cutawayAmount;
uniform sampler2D tileAtlas;
uniform vec4 atlasRects[96];
uniform vec3 uCameraPosition;
uniform float fogEnabled;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

in vec3 vNormal;
in vec2 vUv;
in float vMaterialId;
in float vFaceKind;
in float vTileIndex;
in vec3 vWorldPos;

out vec4 fragColor;

vec3 getBaseColor(float tileIndex, vec2 uv) {
  int idx = int(floor(tileIndex + 0.5));
  vec4 r = atlasRects[idx];
  vec2 localUv = fract(uv);
  return texture(tileAtlas, localUv * r.zw + r.xy).rgb;
}

void main() {
  vec3 color = getBaseColor(vTileIndex, vUv);

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

  float fogT = smoothstep(fogNear, fogFar, distance(uCameraPosition, vWorldPos)) * fogEnabled;
  color = mix(color, fogColor, fogT);

  fragColor = vec4(color, 1.0);
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
    this.uCutawayCenter = this.gl.getUniformLocation(this.program, 'cutawayCenter');
    this.uCutawayForward = this.gl.getUniformLocation(this.program, 'cutawayForward');
    this.uCutawayRadius = this.gl.getUniformLocation(this.program, 'cutawayRadius');
    this.uCutawayReach = this.gl.getUniformLocation(this.program, 'cutawayReach');
    this.uCutawayCeilingY = this.gl.getUniformLocation(this.program, 'cutawayCeilingY');
    this.uCutawayAmount = this.gl.getUniformLocation(this.program, 'cutawayAmount');
    this.uTileAtlas = this.gl.getUniformLocation(this.program, 'tileAtlas');
    this.uAtlasRects = this.gl.getUniformLocation(this.program, 'atlasRects');
    this.uFogEnabled = this.gl.getUniformLocation(this.program, 'fogEnabled');
    this.uFogColor = this.gl.getUniformLocation(this.program, 'fogColor');
    this.uFogNear = this.gl.getUniformLocation(this.program, 'fogNear');
    this.uFogFar = this.gl.getUniformLocation(this.program, 'fogFar');

    // Chunk slots
    this.slots = [];
    for (let i = 0; i < this.slotCount; i++) {
      this.slots.push({
        index: i,
        state: SLOT_FREE,
        cx: 0, cy: 0, cz: 0,
        vertexOffset: i * this.slotVertices,
        vertexCount: 0,
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
    // aColor
    this.gl.enableVertexAttribArray(ATTRIB_LOCATIONS.aColor);
    this.gl.vertexAttribPointer(ATTRIB_LOCATIONS.aColor, 3, this.gl.FLOAT, false, stride, 12);
    // aNormal
    this.gl.enableVertexAttribArray(ATTRIB_LOCATIONS.aNormal);
    this.gl.vertexAttribPointer(ATTRIB_LOCATIONS.aNormal, 3, this.gl.FLOAT, false, stride, 24);
    // aUv
    this.gl.enableVertexAttribArray(ATTRIB_LOCATIONS.aUv);
    this.gl.vertexAttribPointer(ATTRIB_LOCATIONS.aUv, 2, this.gl.FLOAT, false, stride, 36);
    // aMaterialId
    this.gl.enableVertexAttribArray(ATTRIB_LOCATIONS.aMaterialId);
    this.gl.vertexAttribPointer(ATTRIB_LOCATIONS.aMaterialId, 1, this.gl.FLOAT, false, stride, 44);
    // aFaceKind
    this.gl.enableVertexAttribArray(ATTRIB_LOCATIONS.aFaceKind);
    this.gl.vertexAttribPointer(ATTRIB_LOCATIONS.aFaceKind, 1, this.gl.FLOAT, false, stride, 48);
    // aTileIndex
    this.gl.enableVertexAttribArray(ATTRIB_LOCATIONS.aTileIndex);
    this.gl.vertexAttribPointer(ATTRIB_LOCATIONS.aTileIndex, 1, this.gl.FLOAT, false, stride, 52);

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
    this._renderMode = 0;
    this._shaderQuality = 1;
    this._time = 0;
    this._fogEnabled = 0;
    this._fogColor = new Float32Array([0.74, 0.9, 1.0]);
    this._fogNear = 80;
    this._fogFar = 260;
    this._atlasTexture = null;
    this._atlasRectsArray = null;

    // Draw list buffers for multi-draw
    this._firsts = new Int32Array(this.slotCount);
    this._counts = new Int32Array(this.slotCount);

    // Stats
    this.stats = {
      drawCalls: 0,
      visibleChunks: 0,
      slotUtilization: 0,
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
    this.freeSlots.push(slotIndex);
  }

  /** Upload vertex data for a chunk slot. data is Float32Array of interleaved vertices. */
  uploadSlot(slotIndex, data) {
    const slot = this.slots[slotIndex];
    const vertCount = Math.floor(data.length / VERTEX_STRIDE_FLOATS);
    if (vertCount > this.slotVertices) {
      console.warn(`[UnifiedTerrainRenderer] Chunk ${slot.cx},${slot.cy},${slot.cz} exceeds slot capacity: ${vertCount} > ${this.slotVertices}. Truncating.`);
    }
    slot.vertexCount = Math.min(vertCount, this.slotVertices);
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
    // Flatten to Float32Array[96*4]
    if (!this._atlasRectsArray) {
      this._atlasRectsArray = new Float32Array(96 * 4);
    }
    for (let i = 0; i < Math.min(rects.length, 96); i++) {
      const r = rects[i];
      this._atlasRectsArray[i * 4 + 0] = r.x;
      this._atlasRectsArray[i * 4 + 1] = r.y;
      this._atlasRectsArray[i * 4 + 2] = r.z;
      this._atlasRectsArray[i * 4 + 3] = r.w;
    }
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
    const prevViewport = gl.getParameter(gl.VIEWPORT);

    // Build draw list from visible keys
    let drawCount = 0;
    for (const key of visibleKeys) {
      const slotIndex = this.chunkKeyToSlot.get(key);
      if (slotIndex === undefined) continue;
      const slot = this.slots[slotIndex];
      if (slot.state !== SLOT_READY || slot.vertexCount === 0) continue;
      this._firsts[drawCount] = slot.vertexOffset;
      this._counts[drawCount] = slot.vertexCount;
      drawCount++;
    }
    this.stats.slotUtilization = this.chunkKeyToSlot.size;

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

    const camPos = camera.position;
    gl.uniform3f(this.uCameraPosition, camPos.x, camPos.y, camPos.z);
    gl.uniform1f(this.uTime, this._time);
    gl.uniform1f(this.uRenderMode, this._renderMode);
    gl.uniform1f(this.uShaderQuality, this._shaderQuality);
    gl.uniform3f(this.uLightDir, this._lightDir[0], this._lightDir[1], this._lightDir[2]);
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

    // Depth test & culling
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.disable(gl.BLEND);

    // Render
    if (this.multiDrawExt && drawCount > 1) {
      this.multiDrawExt.multiDrawArraysWEBGL(
        gl.TRIANGLES,
        this._firsts, 0,
        this._counts, 0,
        drawCount
      );
      this.stats.drawCalls = 1;
    } else {
      for (let i = 0; i < drawCount; i++) {
        gl.drawArrays(gl.TRIANGLES, this._firsts[i], this._counts[i]);
      }
      this.stats.drawCalls = drawCount;
    }

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
    gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
    if (this.threeRenderer.resetState) {
      this.threeRenderer.resetState();
    } else {
      this.threeRenderer.state?.reset?.();
    }
  }
}
