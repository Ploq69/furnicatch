# Sky System Master Plan — Detailed Feature List

> This document tracks every feature that must be working in the sky/day-night/aurora system. Check items off as they are implemented and verified.

---

## 1. Sky Gradient (Day/Night Color Cycle)

### 1.1 Gradient Builders
- [x] **4-band gradient system** — Bottom horizon, lower-mid, upper-mid, zenith
- [x] **Per-band color stops** — sunrise → day → sunset → night → sunrise
- [x] **Zone-based presets** — `createSkyGradientPreset()` derives colors from zone atmosphere (top, horizon, fog, sunColor)
- [x] **Night color derivation** — fog darkened and desaturated
- [x] **Seamless horizon blending** — fogBase matches renderer clear color

### 1.2 Time-Based Sampling
- [x] **`_timePercent()`** maps cycle time to 0→1 gradient sample position
- [x] **Day percent** = `time / dayTimeSec` (clamped to 1)
- [x] **Night percent** = `(time - dayTimeSec) / nightTimeSec` (clamped to 0)
- [x] **Auto-tick** advances time by `dt * cycleSpeed`
- [x] **Wrap-around** when `time > dayTimeSec + nightTimeSec`
- [x] **Manual time set** via `setTime()` for debugging

### 1.3 Visibility & Darkness
- [x] **`setVisible(boolean)`** shows/hides sky dome
- [x] **`setDarkness(0–1)`** overlays dark tint for underground/cave zones
- [x] **Darkness uniform** mixes sky color toward `vec3(0.025, 0.035, 0.055)`

---

## 2. Sun

### 2.1 Sun Movement (Orbit)
- [x] **Sun rotates across sky** based on cycle time, not fixed position
- [x] **Orbit axis**: X-axis rotation starting from `(0, 0, -1)`
- [x] **Day arc** (0 → π): horizon → zenith → horizon
- [x] **Night arc** (π → 2π): below horizon (invisible)
- [x] **`getSunDirection()`** returns computed `THREE.Vector3`
- [x] **Updates every frame** in `SkyGradient.update()`

### 2.2 Sun Intensity
- [x] **Height-based modulation** = `max(0, sin(θ))²`
- [x] **Zero below horizon** — sun completely invisible at night
- [x] **Peak at midday** (θ = π/2)
- [x] **User intensity slider** sets *maximum* noon brightness
- [x] **`getSunIntensityFactor()`** returns 0→1 height factor

### 2.3 Sun Visual Appearance
- [x] **Disc** — `smoothstep(1.0 - discSize, 1.0, dot(viewDir, sunDir))`
- [x] **Core** — `pow(dot, sharpness)`
- [x] **Glow** — `pow(dot, sharpness * 0.6)`
- [x] **Color** — zone sunColor with optional blue lerp at night
- [x] **Size buttons** `+` / `-` adjust `sunDiscSize` uniform in real time
- [x] **Day visibility mask** — sun dimmed by `1.0 - nightVisibility` (not fully off, just reduced)

### 2.4 Scene Lighting Sync
- [x] **DirectionalLight position** follows `sunDir * 50`
- [x] **DirectionalLight intensity** = `userIntensity * 0.5 * sunFactor * (1.0 - darkness * 0.5)`
- [x] **DirectionalLight color** = zone sunColor, blue-tinted at night
- [x] **Terrain light direction** updates every frame via `setLightDir(sunDir)`
- [x] **Terrain light intensity** updates every frame via `setLightIntensity(...)`
- [x] **All updates in `_updateSky()`**, not just `_setSkyAtmosphere()`

---

## 3. Stars

### 3.1 Star Field
- [x] **Enabled/disabled** via `starEnabled` uniform + settings toggle
- [x] **Visible only at night** — multiplied by `nightVisibility`
- [x] **Sky rotation** — slow Z-axis spin over time

### 3.2 Noise Remapping (CRITICAL FIX)
- [x] **`snoise()` returns [-1, 1]`** — must remap to [0, 1]
- [x] **Star density noise** → `(snoise(rotDir * 28.0) + 1.0) * 0.5`
- [x] **Mask noise** → `(snoise(rotDir * 8.0) + 1.0) * 0.5`
- [x] **Blink variance noise** → `(snoise(rotDir * 45.0) + 1.0) * 0.5`
- [x] **Threshold** `smoothstep(0.72 + blinkThresh, 1.0, starNoise)` works correctly after remap
- [x] **Result**: sparse distinct pinpoints, not white-noise static pattern

### 3.3 Twinkle
- [x] **Base blink speed** = `time * 1.5`
- [x] **Speed variance** per star = `1.0 + sin(blinkVar) * 0.5` (50%–150%)
- [x] **Blink threshold offset** = `cos(baseBlink * speedVar + blinkVar) * 0.12`
- [x] **Smooth threshold** for soft on/off transitions

---

## 4. Aurora Borealis

### 4.1 Ray-Marching Structure
- [x] **Enabled/disabled** via `auroraEnabled` uniform + settings toggle
- [x] **Visible only at night** — multiplied by `nightVisibility`
- [x] **Num samples** (default 8, min 2) along view ray at height steps
- [x] **Height range** — `startHeight` to `endHeight` (e.g. 0.1 to 0.5)
- [x] **View ray calculation** — `t = height / viewDir.y`, `worldPos = viewDir * t` (XZ)
- [x] **Early exit below horizon** — `if (viewDir.y < 0.001) return vec4(0.0)`
- [x] **Early exit on alpha** — break when `accumulatedAlpha > 0.95`

### 4.2 Band Warping
- [x] **Flow noise** — sample `snoise(worldPos * flowScale, flowTime)` twice for 2D flow direction
- [x] **Flow direction** = `normalize(flowNoise)`
- [x] **Wiggle noise** — sample `snoise(worldPos * wiggleScale, wiggleTime + timeOffset)` twice
- [x] **Time offset** = `wiggleScalePos.x + wiggleScalePos.y` (desynchronizes wiggle)
- [x] **Warped position** = `worldPos + flowDir * flowStrength + wiggle + flowXSpeed * globalTime`

### 4.3 Band Generation
- [x] **`make_stripe(x, halfSize)`** — `smoothstep(0.5 - halfSize, 0.5, fract(x)) * smoothstep(0.5 + halfSize, 0.5, fract(x))`
- [x] **Large bands** — `make_stripe(warpedPos.x * density, 0.2)`
- [x] **Small bands** — `make_stripe(warpedPos.x * density * 1.7, 0.1)`
- [x] **Merged bands** — `pow(max(large, small), sharpness)`
- [x] **Vertical intensity** — `smoothstep(0, 0.15, heightFactor) * smoothstep(1, 0.5, heightFactor)`

### 4.4 Undersparkles
- [x] **Sparkle noise** — `smoothstep(threshold, 1.0, 1.0 - snoise(...))`
- [x] **Sparkle color noise** — two-tone mix between primary/secondary colors
- [x] **Visibility** — `smoothstep(0.5, 1.0, baseBands)` (sparkles in middle of bands)
- [x] **Max height clamp** — fade sparkles above `undersparkleMaxHeight`

### 4.5 Compositing
- [x] **Front-to-back alpha blending** per sample
- [x] **Sample alpha** = `curtain * opacityPerSample`
- [x] **Sample weight** = `sampleAlpha * (1.0 - accumulatedAlpha)`
- [x] **Color gradient** = `mix(bottomColor, topColor, heightFactor)`
- [x] **Accumulated color** += `bandColor * curtain * weight + sparkle * weight`
- [x] **Final fade by view angle** — `smoothstep(0.05, 0.7, viewDir.y)`
- [x] **Blend into sky** — `mix(skyColor, aurora.rgb, aurora.a * nightVisibility)`

### 4.6 Uniforms
- [x] `auroraEnabled`, `auroraAlpha`, `auroraDensity`, `auroraSharpness`
- [x] `auroraNumSamples`, `auroraStartHeight`, `auroraEndHeight`
- [x] `auroraFlowScale`, `auroraFlowStrength`, `auroraFlowSpeed`, `auroraFlowXSpeed`
- [x] `auroraWiggleScale`, `auroraWiggleStrength`, `auroraWiggleSpeed`
- [x] `auroraBottomColor`, `auroraTopColor`
- [x] `auroraUndersparkleScale`, `auroraUndersparkleSpeed`, `auroraUndersparkleThreshold`
- [x] `auroraUndersparkleMaxHeight`, `auroraUndersparkleColorPrimary`, `auroraUndersparkleColorSecondary`
- [x] `auroraOpacityPerSample`

---

## 5. Settings & UI

### 5.1 Settings Manager
- [x] `skyCycleEnabled` — toggle auto day/night cycle
- [x] `skyCycleSpeed` — multiplier for cycle speed
- [x] `starfieldEnabled` — toggle stars
- [x] `sunIntensity` — maximum noon sun brightness (0–10)
- [x] `sunDiscSize` — sun disc radius (0.01–0.20)
- [x] `auroraEnabled` — toggle aurora

### 5.2 UI Bindings
- [x] **Sun Size `+`/`-`** buttons call `onSunSizeChange(val)` with correct parameter
- [x] **Sun Intensity slider** updates `settings.sunIntensity`
- [x] **Cycle Speed slider** updates `settings.skyCycleSpeed`
- [x] **Stars toggle** updates `settings.starfieldEnabled`
- [x] **Aurora toggle** updates `settings.auroraEnabled`
- [x] **All changes** immediately update sky uniforms via `_setSkyAtmosphere()` or `_updateSky()`

---

## 6. Integration Points

### 6.1 Game.js
- [x] `_createSky()` — instantiate `SkyGradient` with all options
- [x] `_updateSky(dt)` — call `skyGradient.update()`, sync light position/dir/intensity
- [x] `_setSkyAtmosphere()` — sync zone colors, sun params, light params
- [x] Zone transition — smoothly blend atmosphere presets

### 6.2 World / Terrain
- [x] `setLightDir(x, y, z)` — directional light for terrain shading
- [x] `setLightIntensity(value)` — brightness for terrain shading
- [x] Updates every frame to match sun position

### 6.3 Performance
- [x] Aurora ray-marching kept lightweight (8 samples default)
- [x] Simplex noise reused for stars, aurora flow, aurora wiggle
- [x] Sky dome `renderOrder = -1000`, `depthWrite = false`

---

## Acceptance Criteria (Final Verification)

- [x] **Day cycle**: sky smoothly transitions sunrise → day → sunset → night → sunrise
- [x] **Sun movement**: sun rises from horizon, crosses overhead, sets, disappears below horizon
- [x] **Sun intensity**: brightest at noon, dim at horizon, completely off at night
- [x] **Terrain shadows**: rotate with sun, brighten/darken with sun intensity
- [x] **Stars**: appear as distinct pinpoints at night, twinkle gently, rotate slowly
- [x] **No cow spots**: star field is NOT a black-and-white noise pattern
- [x] **Aurora**: visible at night when looking up, green/blue curtain bands with sparkles
- [x] **Sun size buttons**: `+`/`-` visibly change sun disc in real time
- [x] **Sun intensity slider**: controls peak noon brightness
- [x] **Settings persist**: all toggles/values saved to `localStorage`
