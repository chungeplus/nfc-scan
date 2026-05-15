import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(relativePath) {
  const source = await fs.readFile(path.join(rootDir, relativePath), 'utf8');
  return JSON.parse(source);
}

const packageJson = await readJson('play-web-service/package.json');
assert.equal(packageJson.scripts.typecheck, 'tsc -p tsconfig.json --noEmit');

const tsconfig = await readJson('play-web-service/tsconfig.json');
assert.equal(tsconfig.extends, '../tsconfig.base.json');
assert.equal(tsconfig.compilerOptions.rootDir, 'src');
assert.equal(tsconfig.compilerOptions.outDir, 'dist');

console.log('PASS verify-play-web-service-modernization task1');
