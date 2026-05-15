import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  const source = await fs.readFile(filePath, 'utf8');
  return JSON.parse(source);
}

const packageJson = await readJson('package.json');
assert.equal(packageJson.private, true, 'root package.json should mark the repository private');
assert.equal(packageJson.scripts.lint, 'npm run lint:code && npm run lint:styles');
assert.equal(
  packageJson.scripts.typecheck,
  'npm run typecheck:miniprogram && npm run typecheck:play-web-service && npm run typecheck:cloudfunctions'
);
assert.equal(packageJson.scripts.build, 'npm run build:cloudfunctions && npm run build:play-web-service');

const baseTsconfig = await readJson('tsconfig.base.json');
assert.equal(baseTsconfig.compilerOptions.strict, true, 'tsconfig.base.json should enable strict mode');
assert.equal(baseTsconfig.compilerOptions.esModuleInterop, true);
assert.equal(baseTsconfig.compilerOptions.resolveJsonModule, true);

console.log('PASS verify-modernization-foundation task1');
