import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(relativePath) {
  const source = await fs.readFile(path.join(rootDir, relativePath), 'utf8');
  return JSON.parse(source);
}

async function main() {
  const packageJson = await readJson('package.json');
  assert.equal(packageJson.name, 'web-service');
  assert.equal(packageJson.scripts.typecheck, 'tsc -p tsconfig.json --noEmit');
  assert.match(
    packageJson.scripts.verify,
    /node tools\/verify-play-web-service-modernization\.mjs/,
    'verify should execute the local modernization verifier',
  );
  assert.match(
    packageJson.scripts.verify,
    /node tools\/verify-play-theme-controls\.mjs/,
    'verify should execute the local theme-controls verifier',
  );
  assert.match(packageJson.scripts.verify, /npm run lint/, 'verify should include the project-owned lint step');
  assert.match(packageJson.scripts.verify, /npm run typecheck/, 'verify should include the project-owned typecheck step');
  assert.match(packageJson.scripts.verify, /npm run build/, 'verify should include the project-owned build step');

  const tsconfig = await readJson('tsconfig.json');
  assert.equal(tsconfig.compilerOptions.rootDir, 'src');
  assert.equal(tsconfig.compilerOptions.outDir, 'dist');
  assert.equal(tsconfig.compilerOptions.strict, true);

  const eslintConfigSource = await fs.readFile(
    path.join(rootDir, 'eslint.config.mjs'),
    'utf8',
  );
  assert.match(eslintConfigSource, /@antfu\/eslint-config/, 'eslint config should use the Antfu base preset');
  assert.match(eslintConfigSource, /ts\/no-misused-promises/, 'eslint config should keep the local promise override');
  assert.doesNotMatch(eslintConfigSource, /\.\.\/eslint\.config\.mjs/, 'eslint config should not import the removed root config');

  const [modernizationVerifierSource, themeVerifierSource] = await Promise.all([
    fs.readFile(new URL(import.meta.url), 'utf8'),
    fs.readFile(new URL('./verify-play-theme-controls.mjs', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(
    modernizationVerifierSource,
    /\.\.\/play-web-service\//,
    'modernization verifier should not point back to the old project path',
  );
  assert.doesNotMatch(
    themeVerifierSource,
    /\.\.\/play-web-service\//,
    'theme-controls verifier should not point back to the old project path',
  );

  console.log('PASS verify-play-web-service-modernization');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
