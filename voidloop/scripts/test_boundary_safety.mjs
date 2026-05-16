import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const jsRoot = join(root, 'js');

const terrain = readFileSync(join(jsRoot, 'TerrainMesh.js'), 'utf8');
const world = readFileSync(join(jsRoot, 'World.js'), 'utf8');
const player = readFileSync(join(jsRoot, 'Player.js'), 'utf8');
const game = readFileSync(join(jsRoot, 'Game.js'), 'utf8');
const blockProps = readFileSync(join(jsRoot, 'BlockProperties.js'), 'utf8');
const atlas = readFileSync(join(jsRoot, 'TerrainAtlas.js'), 'utf8');

assert.match(blockProps, /boundary_bedrock:[\s\S]*?mineable:\s*false/, 'boundary_bedrock must be non-mineable');
assert.match(atlas, /boundary_bedrock/, 'boundary_bedrock must have a terrain atlas mapping');
assert.match(terrain, /BOUNDARY_SHELL_MARGIN/, 'terrain must define a boundary shell margin');
assert.match(terrain, /BOTTOM_SAFETY_Y/, 'terrain must define a bottom safety floor');
assert.match(terrain, /_isBoundaryCell\(x, y, z, zoneEntry\)/, 'dig brush must reject boundary cells');
assert.match(terrain, /return 'boundary_bedrock'/, 'boundary cells must resolve to boundary_bedrock');
assert.match(terrain, /if \(!zoneEntry\) return 'air'/, 'out-of-zone terrain must remain non-walkable air');

assert.match(world, /getPlayableBoundsForPosition/, 'world must expose playable bounds lookup');
assert.match(world, /isInsidePlayableBounds/, 'world must expose inside-bounds checks');
assert.match(world, /getNearestSafeSpawn/, 'world must expose a safe spawn fallback');
assert.match(world, /clampToPlayableBounds/, 'world must expose movement clamping');
assert.match(world, /getKillPlaneY/, 'world must expose a kill-plane height');

assert.match(player, /lastSafePosition/, 'player must track last safe position');
assert.match(player, /recordSafePosition/, 'player must record grounded safe positions');
assert.match(player, /_applyVoidSafety/, 'player must run void safety recovery');
assert.match(player, /_recoverToSafePosition/, 'player must recover to a safe position');
assert.match(player, /clampToPlayableBounds/, 'player movement must clamp against playable bounds');

assert.match(game, /import \{ Sky \}/, 'game atmosphere must use the Three.js Sky addon');
assert.match(game, /ZONE_ATMOSPHERE/, 'game must define zone atmosphere presets');
assert.match(game, /stylized_cloud_layer/, 'game must add a stylized cloud layer');
assert.match(game, /distant_boundary_environment/, 'game must add distant boundary environment geometry');
assert.match(game, /scene\.fog = new THREE\.Fog\(fogBase/, 'fog color must match the zone background/fog base');

console.log('Boundary safety and atmosphere checks passed');
