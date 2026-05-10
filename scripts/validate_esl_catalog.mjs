import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATCHABLE_CATALOG, ESL_BIOMES } from '../js/constants.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'scripts/tts_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const errors = [];

const biomeKeys = Object.keys(ESL_BIOMES);
if (biomeKeys.length !== 3) errors.push(`Expected 3 ESL biomes, found ${biomeKeys.length}.`);

for (const biome of biomeKeys) {
  const items = CATCHABLE_CATALOG.filter(item => item.biome === biome);
  const words = new Set(items.map(item => item.word));
  if (items.length !== 50) errors.push(`${biome} has ${items.length} catchables, expected 50.`);
  if (words.size !== 50) errors.push(`${biome} has ${words.size} unique words, expected 50.`);
}

for (const item of CATCHABLE_CATALOG) {
  if (!item.word) errors.push(`${item.key} is missing word.`);
  if (!item.ttsWord) errors.push(`${item.key} is missing ttsWord.`);
  if (!item.biome || !ESL_BIOMES[item.biome]) errors.push(`${item.key} has invalid biome.`);
  if (!item.assetPath) errors.push(`${item.key} is missing assetPath.`);
  if (!item.resourceDrops?.length) errors.push(`${item.key} is missing resourceDrops.`);
  if (item.assetPath && !/\.(gltf|glb|obj)$/i.test(item.assetPath)) {
    errors.push(`${item.key} must use a 3D asset (.gltf, .glb, or .obj), got: ${item.assetPath}`);
  }
  if (item.assetPath && !fs.existsSync(path.join(root, item.assetPath))) {
    errors.push(`${item.key} asset does not exist: ${item.assetPath}`);
  }
  const ttsEntry = manifest[item.ttsWord];
  if (!ttsEntry) {
    errors.push(`${item.key} tts word is missing from manifest: ${item.ttsWord}`);
  } else if (!fs.existsSync(path.join(root, ttsEntry.file))) {
    errors.push(`${item.key} tts file does not exist: ${ttsEntry.file}`);
  }
}

const wordsByBiome = new Map();
for (const item of CATCHABLE_CATALOG) {
  if (!wordsByBiome.has(item.word)) wordsByBiome.set(item.word, []);
  wordsByBiome.get(item.word).push(item.biome);
}
const repeated = [...wordsByBiome.entries()].filter(([, biomes]) => new Set(biomes).size > 1);
if (repeated.length) {
  console.log('Allowed repeated practical ESL words across biomes:');
  for (const [word, biomes] of repeated) console.log(`- ${word}: ${[...new Set(biomes)].join(', ')}`);
}

if (errors.length) {
  console.error(`ESL catalog validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`ESL catalog OK: ${CATCHABLE_CATALOG.length} catchables across ${biomeKeys.length} biomes.`);
