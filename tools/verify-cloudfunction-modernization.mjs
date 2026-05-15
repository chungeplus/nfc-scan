import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(relativePath) {
  const source = await fs.readFile(path.join(rootDir, relativePath), 'utf8');
  return JSON.parse(source);
}

const packageJson = await readJson('cloudfunctions/media-share-service/package.json');
assert.equal(packageJson.main, 'index.js');
assert.equal(packageJson.scripts.build, 'tsc -p tsconfig.json');
assert.equal(packageJson.scripts.typecheck, 'tsc -p tsconfig.json --noEmit');

const tsconfig = await readJson('cloudfunctions/media-share-service/tsconfig.json');
assert.equal(tsconfig.extends, '../../tsconfig.base.json');
assert.equal(tsconfig.compilerOptions.rootDir, 'src');
assert.equal(tsconfig.compilerOptions.outDir, '.');

const sourceEntry = await fs.readFile(
  path.join(rootDir, 'cloudfunctions/media-share-service/src/index.ts'),
  'utf8',
);

assert.match(sourceEntry, /export async function main/, 'src/index.ts should export the typed main entrypoint');
assert.match(sourceEntry, /MediaShareServiceEvent/, 'src/index.ts should type the incoming event');

console.log('PASS verify-cloudfunction-modernization task1');
