import * as THREE from 'three';

const VERTEX_SHADER = `
  varying vec3 vWorldDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(worldPos.xyz - cameraPosition);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec4 gradientColors[4];
  uniform vec4 gradientPositions;
  uniform int numStops;

  uniform vec3 sunDir;
  uniform vec3 sunColor;
  uniform float sunStrength;
  uniform float sunSharpness;
  uniform float sunGlowStrength;
  uniform float sunDiscSize;

  uniform float nightVisibility;
  uniform float time;
  uniform float starEnabled;
  uniform float darkness;

  // Aurora uniforms
  uniform float auroraEnabled;
  uniform float auroraAlpha;
  uniform float auroraDensity;
  uniform float auroraSharpness;
  uniform int auroraNumSamples;
  uniform float auroraStartHeight;
  uniform float auroraEndHeight;
  uniform float auroraFlowScale;
  uniform float auroraFlowStrength;
  uniform float auroraFlowSpeed;
  uniform float auroraFlowXSpeed;
  uniform float auroraWiggleScale;
  uniform float auroraWiggleStrength;
  uniform float auroraWiggleSpeed;
  uniform vec3 auroraBottomColor;
  uniform vec3 auroraTopColor;
  uniform float auroraUndersparkleScale;
  uniform float auroraUndersparkleSpeed;
  uniform float auroraUndersparkleThreshold;
  uniform float auroraUndersparkleMaxHeight;
  uniform vec3 auroraUndersparkleColorPrimary;
  uniform vec3 auroraUndersparkleColorSecondary;
  uniform float auroraOpacityPerSample;

  varying vec3 vWorldDir;

  float snoise(vec3 v);

  vec4 sampleGradient(float t) {
    if (numStops <= 1) return gradientColors[0];
    vec4 baseColor = gradientColors[0];
    if (t <= gradientPositions[0]) {
      baseColor = gradientColors[0];
    } else if (t >= gradientPositions[numStops - 1]) {
      baseColor = gradientColors[numStops - 1];
    } else {
      for (int i = 1; i < 4; i++) {
        if (i >= numStops) break;
        float a = gradientPositions[i - 1];
        float b = gradientPositions[i];
        if (t >= a && t <= b) {
          float f = (t - a) / max(b - a, 0.0001);
          baseColor = mix(gradientColors[i - 1], gradientColors[i], f);
          break;
        }
      }
    }
    return baseColor;
  }

  vec3 computeSun(vec3 viewDir, vec3 sunDir, vec3 sunColor, float strength, float sharpness, float glowStrength, float discSize) {
    vec3 sdir = normalize(sunDir);
    float d = max(dot(viewDir, sdir), 0.0);
    float disc = smoothstep(1.0 - discSize, 1.0, d);
    float core = pow(d, sharpness);
    float glow = pow(d, sharpness * 0.6);
    float total = disc * 3.0 + core * strength + glow * glowStrength;
    return sunColor * total;
  }

  float computeStars(vec3 viewDir, float time) {
    float skyRot = time * 0.02;
    float c = cos(skyRot);
    float s = sin(skyRot);
    mat3 rot = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);
    vec3 rotDir = rot * viewDir;

    // Remap snoise from [-1,1] to [0,1]
    float starNoise = (snoise(rotDir * 28.0) + 1.0) * 0.5;
    float mask = (snoise(rotDir * 8.0) + 1.0) * 0.5;
    float blinkVar = (snoise(rotDir * 45.0) + 1.0) * 0.5;

    starNoise *= (1.0 - smoothstep(0.5, 1.0, mask));
    float baseBlink = time * 1.5;
    float speedVar = 1.0 + sin(blinkVar) * 0.5;
    float blink = cos(baseBlink * speedVar + blinkVar);
    float blinkThresh = blink * 0.12;
    return smoothstep(0.72 + blinkThresh, 1.0, starNoise);
  }

  // Aurora helpers
  float make_stripe(float x, float half_size_normalized) {
    float base_value = fract(x);
    float left = smoothstep(0.5 - half_size_normalized, 0.5, base_value);
    float right = smoothstep(0.5 + half_size_normalized, 0.5, base_value);
    return left * right;
  }

  vec4 computeAurora(vec3 viewDir, float globalTime) {
    if (viewDir.y < 0.001) return vec4(0.0);

    int samples = max(auroraNumSamples, 2);
    vec3 accumulated_color = vec3(0.0);
    float accumulated_alpha = 0.0;

    float flow_time = globalTime * auroraFlowSpeed;
    float wiggle_time = globalTime * auroraWiggleSpeed;

    for (int i = 0; i < 32; i++) {
      if (i >= samples) break;

      float height_factor = float(i) / max(float(samples - 1), 1.0);
      float height = auroraStartHeight + (auroraEndHeight - auroraStartHeight) * height_factor;

      float t = height / viewDir.y;
      vec3 p = viewDir * t;
      vec2 world_pos = p.xz;

      // Flow warping
      vec2 s_wp = world_pos * auroraFlowScale;
      vec2 flow = vec2(
        (snoise(vec3(s_wp.x, s_wp.y, flow_time)) + 1.0) * 0.5,
        (snoise(vec3(s_wp.x, s_wp.y, 0.5 + flow_time)) + 1.0) * 0.5
      );
      vec2 flow_dir = normalize(flow - 0.5);

      // Wiggle warping
      vec2 w_wo = world_pos * auroraWiggleScale;
      float time_offset = w_wo.x + w_wo.y;
      vec2 wiggle_noise = vec2(
        (snoise(vec3(w_wo.x, w_wo.y, wiggle_time + time_offset)) + 1.0) * 0.5,
        (snoise(vec3(w_wo.x, w_wo.y, 0.5 + wiggle_time + time_offset)) + 1.0) * 0.5
      );
      vec2 wiggle = (wiggle_noise - 0.5) * auroraWiggleStrength;

      vec2 warped_pos = world_pos + flow_dir * auroraFlowStrength + wiggle + vec2(auroraFlowXSpeed * globalTime, 0.0);

      // Bands
      float large_bands = make_stripe(warped_pos.x * auroraDensity, 0.2);
      float smaller_bands = make_stripe(warped_pos.x * auroraDensity * 1.7, 0.1);
      float base_bands = pow(max(large_bands, smaller_bands), auroraSharpness);

      // Vertical falloff
      float vertical_intensity = smoothstep(0.0, 0.15, height_factor) * smoothstep(1.0, 0.5, height_factor);

      // Undersparkles
      float undersparkle_intensity = 1.0 - smoothstep(0.0, auroraUndersparkleMaxHeight, height_factor);
      vec2 sn = warped_pos * auroraUndersparkleScale;
      float k = globalTime * auroraUndersparkleSpeed;
      float undersparkle_noise_val = (snoise(vec3(sn.x + k, sn.y + k, k * 0.3)) + 1.0) * 0.5;
      float undersparkle = smoothstep(auroraUndersparkleThreshold, 1.0, 1.0 - undersparkle_noise_val);
      float color_noise = (snoise(vec3(sn.x * 0.3 + 10.0, sn.y * 0.3 + 10.0, 0.0)) + 1.0) * 0.5;
      vec3 sparkle_color = mix(auroraUndersparkleColorPrimary, auroraUndersparkleColorSecondary, smoothstep(0.4, 1.0, color_noise));
      float undersparkle_visibility = smoothstep(0.5, 1.0, base_bands);
      vec3 sparkle = undersparkle_visibility * undersparkle_intensity * sparkle_color * undersparkle;

      float curtain = base_bands * vertical_intensity;
      float sample_alpha = curtain * auroraOpacityPerSample;
      float sample_weight = sample_alpha * (1.0 - accumulated_alpha);

      vec3 band_color = mix(auroraBottomColor, auroraTopColor, height_factor);
      accumulated_color += band_color * curtain * sample_weight + sparkle * vertical_intensity * sample_weight;
      accumulated_alpha += sample_alpha * (1.0 - accumulated_alpha);

      if (accumulated_alpha > 0.95) break;
    }

    float up_factor = smoothstep(0.05, 0.7, viewDir.y);
    float final_alpha = accumulated_alpha * up_factor * auroraAlpha;
    return vec4(accumulated_color * up_factor * auroraAlpha, final_alpha);
  }

  void main() {
    vec3 viewDir = normalize(vWorldDir);
    float t = clamp(viewDir.y * 0.5 + 0.5, 0.0, 1.0);
    vec4 grad = sampleGradient(t);
    vec3 color = grad.rgb;

    vec3 sun = computeSun(viewDir, sunDir, sunColor, sunStrength, sunSharpness, sunGlowStrength, sunDiscSize);
    float dayVis = max(1.0 - nightVisibility, 0.05);
    color += sun * dayVis;

    if (starEnabled > 0.5 && nightVisibility > 0.01) {
      float stars = computeStars(viewDir, time);
      color += vec3(stars) * nightVisibility;
    }

    // Aurora
    if (auroraEnabled > 0.5 && nightVisibility > 0.01) {
      vec4 aurora = computeAurora(viewDir, time);
      color = mix(color, aurora.rgb, aurora.a * nightVisibility);
    }

    color = mix(color, vec3(0.025, 0.035, 0.055), clamp(darkness, 0.0, 1.0));
    gl_FragColor = vec4(color, 1.0);
  }

  // Simplex 3D noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

export class SkyGradientMaterial extends THREE.ShaderMaterial {
  constructor(options = {}) {
    const defaults = {
      gradientColors: [
        new THREE.Vector4(1.0, 0.85, 0.5, 1.0),   // horizon: warm yellow
        new THREE.Vector4(0.6, 0.75, 0.95, 1.0),   // lower mid: light blue
        new THREE.Vector4(0.3, 0.55, 0.92, 1.0),   // upper mid: medium blue
        new THREE.Vector4(0.1, 0.25, 0.75, 1.0),   // zenith: deep blue
      ],
      gradientPositions: new THREE.Vector4(0.0, 0.30, 0.65, 1.0),
      numStops: 4,
      sunDir: new THREE.Vector3(-0.2, 0.6, -0.6),
      sunColor: new THREE.Vector3(1.0, 0.92, 0.6),
      sunStrength: 4.0,
      sunSharpness: 6.0,
      sunGlowStrength: 3.0,
      sunDiscSize: 0.06,
      nightVisibility: 0.0,
      time: 0.0,
      starEnabled: 1.0,
      darkness: 0.0,
      // Aurora defaults
      auroraEnabled: 1.0,
      auroraAlpha: 0.6,
      auroraDensity: 0.8,
      auroraSharpness: 1.5,
      auroraNumSamples: 8,
      auroraStartHeight: 0.1,
      auroraEndHeight: 0.5,
      auroraFlowScale: 0.4,
      auroraFlowStrength: 0.5,
      auroraFlowSpeed: 0.15,
      auroraFlowXSpeed: 0.05,
      auroraWiggleScale: 0.6,
      auroraWiggleStrength: 0.3,
      auroraWiggleSpeed: 0.2,
      auroraBottomColor: new THREE.Vector3(0.0, 0.4, 0.15),
      auroraTopColor: new THREE.Vector3(0.1, 0.6, 0.4),
      auroraUndersparkleScale: 3.0,
      auroraUndersparkleSpeed: 0.5,
      auroraUndersparkleThreshold: 0.6,
      auroraUndersparkleMaxHeight: 0.7,
      auroraUndersparkleColorPrimary: new THREE.Vector3(0.5, 1.0, 0.7),
      auroraUndersparkleColorSecondary: new THREE.Vector3(0.8, 0.9, 1.0),
      auroraOpacityPerSample: 0.15,
    };

    const opts = { ...defaults, ...options };

    super({
      uniforms: {
        gradientColors: { value: opts.gradientColors },
        gradientPositions: { value: opts.gradientPositions },
        numStops: { value: opts.numStops },
        sunDir: { value: opts.sunDir },
        sunColor: { value: opts.sunColor },
        sunStrength: { value: opts.sunStrength },
        sunSharpness: { value: opts.sunSharpness },
        sunGlowStrength: { value: opts.sunGlowStrength },
        sunDiscSize: { value: opts.sunDiscSize },
        nightVisibility: { value: opts.nightVisibility },
        time: { value: opts.time },
        starEnabled: { value: opts.starEnabled },
        darkness: { value: opts.darkness },
        // Aurora uniforms
        auroraEnabled: { value: opts.auroraEnabled },
        auroraAlpha: { value: opts.auroraAlpha },
        auroraDensity: { value: opts.auroraDensity },
        auroraSharpness: { value: opts.auroraSharpness },
        auroraNumSamples: { value: opts.auroraNumSamples },
        auroraStartHeight: { value: opts.auroraStartHeight },
        auroraEndHeight: { value: opts.auroraEndHeight },
        auroraFlowScale: { value: opts.auroraFlowScale },
        auroraFlowStrength: { value: opts.auroraFlowStrength },
        auroraFlowSpeed: { value: opts.auroraFlowSpeed },
        auroraFlowXSpeed: { value: opts.auroraFlowXSpeed },
        auroraWiggleScale: { value: opts.auroraWiggleScale },
        auroraWiggleStrength: { value: opts.auroraWiggleStrength },
        auroraWiggleSpeed: { value: opts.auroraWiggleSpeed },
        auroraBottomColor: { value: opts.auroraBottomColor },
        auroraTopColor: { value: opts.auroraTopColor },
        auroraUndersparkleScale: { value: opts.auroraUndersparkleScale },
        auroraUndersparkleSpeed: { value: opts.auroraUndersparkleSpeed },
        auroraUndersparkleThreshold: { value: opts.auroraUndersparkleThreshold },
        auroraUndersparkleMaxHeight: { value: opts.auroraUndersparkleMaxHeight },
        auroraUndersparkleColorPrimary: { value: opts.auroraUndersparkleColorPrimary },
        auroraUndersparkleColorSecondary: { value: opts.auroraUndersparkleColorSecondary },
        auroraOpacityPerSample: { value: opts.auroraOpacityPerSample },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
    });
  }

  setGradientColors(colors) {
    for (let i = 0; i < 4; i++) {
      if (colors[i]) {
        const c = colors[i];
        if (c.isColor) {
          this.uniforms.gradientColors.value[i].set(c.r, c.g, c.b, 1.0);
        } else {
          this.uniforms.gradientColors.value[i].set(c.r ?? c[0], c.g ?? c[1], c.b ?? c[2], 1.0);
        }
      }
    }
  }

  setGradientPositions(positions) {
    this.uniforms.gradientPositions.value.set(
      positions[0] ?? 0.0,
      positions[1] ?? 0.33,
      positions[2] ?? 0.66,
      positions[3] ?? 1.0
    );
  }

  setAuroraUniforms(opts) {
    const u = this.uniforms;
    if (opts.auroraEnabled !== undefined) u.auroraEnabled.value = opts.auroraEnabled ? 1.0 : 0.0;
    if (opts.auroraAlpha !== undefined) u.auroraAlpha.value = opts.auroraAlpha;
    if (opts.auroraDensity !== undefined) u.auroraDensity.value = opts.auroraDensity;
    if (opts.auroraSharpness !== undefined) u.auroraSharpness.value = opts.auroraSharpness;
    if (opts.auroraNumSamples !== undefined) u.auroraNumSamples.value = opts.auroraNumSamples;
    if (opts.auroraStartHeight !== undefined) u.auroraStartHeight.value = opts.auroraStartHeight;
    if (opts.auroraEndHeight !== undefined) u.auroraEndHeight.value = opts.auroraEndHeight;
    if (opts.auroraFlowScale !== undefined) u.auroraFlowScale.value = opts.auroraFlowScale;
    if (opts.auroraFlowStrength !== undefined) u.auroraFlowStrength.value = opts.auroraFlowStrength;
    if (opts.auroraFlowSpeed !== undefined) u.auroraFlowSpeed.value = opts.auroraFlowSpeed;
    if (opts.auroraFlowXSpeed !== undefined) u.auroraFlowXSpeed.value = opts.auroraFlowXSpeed;
    if (opts.auroraWiggleScale !== undefined) u.auroraWiggleScale.value = opts.auroraWiggleScale;
    if (opts.auroraWiggleStrength !== undefined) u.auroraWiggleStrength.value = opts.auroraWiggleStrength;
    if (opts.auroraWiggleSpeed !== undefined) u.auroraWiggleSpeed.value = opts.auroraWiggleSpeed;
    if (opts.auroraBottomColor !== undefined) u.auroraBottomColor.value.set(opts.auroraBottomColor.r, opts.auroraBottomColor.g, opts.auroraBottomColor.b);
    if (opts.auroraTopColor !== undefined) u.auroraTopColor.value.set(opts.auroraTopColor.r, opts.auroraTopColor.g, opts.auroraTopColor.b);
    if (opts.auroraUndersparkleScale !== undefined) u.auroraUndersparkleScale.value = opts.auroraUndersparkleScale;
    if (opts.auroraUndersparkleSpeed !== undefined) u.auroraUndersparkleSpeed.value = opts.auroraUndersparkleSpeed;
    if (opts.auroraUndersparkleThreshold !== undefined) u.auroraUndersparkleThreshold.value = opts.auroraUndersparkleThreshold;
    if (opts.auroraUndersparkleMaxHeight !== undefined) u.auroraUndersparkleMaxHeight.value = opts.auroraUndersparkleMaxHeight;
    if (opts.auroraUndersparkleColorPrimary !== undefined) u.auroraUndersparkleColorPrimary.value.set(opts.auroraUndersparkleColorPrimary.r, opts.auroraUndersparkleColorPrimary.g, opts.auroraUndersparkleColorPrimary.b);
    if (opts.auroraUndersparkleColorSecondary !== undefined) u.auroraUndersparkleColorSecondary.value.set(opts.auroraUndersparkleColorSecondary.r, opts.auroraUndersparkleColorSecondary.g, opts.auroraUndersparkleColorSecondary.b);
    if (opts.auroraOpacityPerSample !== undefined) u.auroraOpacityPerSample.value = opts.auroraOpacityPerSample;
  }
}
