import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const jsRoot = join(root, 'js');

assert.equal(existsSync(join(jsRoot, 'ShopManager.js')), false, 'ShopManager.js should stay removed');
assert.equal(existsSync(join(jsRoot, 'ShopUI.js')), false, 'ShopUI.js should stay removed');

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (/\.(js|html)$/.test(path)) files.push(path);
  }
  return files;
}

const forbidden = [
  "from './Shop",
  'ShopManager',
  'ShopUI',
  'SHOP_ITEMS',
  'PICKAXE_TIER_UPGRADES',
  'this.shop.',
];

for (const file of [...walk(jsRoot), join(root, 'index.html')]) {
  const text = readFileSync(file, 'utf8');
  for (const term of forbidden) {
    assert.equal(text.includes(term), false, `${term} should not appear in ${file}`);
  }
}

console.log('Progression regression checks passed');
