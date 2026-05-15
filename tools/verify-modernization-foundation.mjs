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

const eslintConfigSource = await fs.readFile(path.join(rootDir, 'eslint.config.mjs'), 'utf8');
assert.match(eslintConfigSource, /typescript-eslint/, 'eslint.config.mjs should use typescript-eslint flat config');
assert.match(eslintConfigSource, /wx: 'readonly'/, 'eslint.config.mjs should register mini program globals');
assert.match(eslintConfigSource, /play-web-service\/src\/\*\*\/\*\.ts/, 'eslint.config.mjs should cover the web service source');

const stylelintConfigSource = await fs.readFile(path.join(rootDir, 'stylelint.config.mjs'), 'utf8');
assert.match(stylelintConfigSource, /stylelint-config-standard-scss/, 'stylelint config should extend the SCSS standard config');
assert.match(stylelintConfigSource, /miniprogram\/\*\*\/\*\.scss/, 'stylelint config should target mini program scss files');

const projectConfig = await readJson('project.config.json');
const miniProgramProjectConfig = await readJson('miniprogram/project.config.json');

assert.deepEqual(
  projectConfig.setting.useCompilerPlugins,
  ['typescript', 'sass'],
  'root project.config.json should enable both typescript and sass compiler plugins'
);
assert.deepEqual(
  miniProgramProjectConfig.setting.useCompilerPlugins,
  ['typescript', 'sass'],
  'miniprogram/project.config.json should enable both typescript and sass compiler plugins'
);

const miniProgramTsconfig = await readJson('miniprogram/tsconfig.json');
assert.equal(miniProgramTsconfig.extends, '../tsconfig.base.json');
assert.match(
  JSON.stringify(miniProgramTsconfig.include),
  /typings/,
  'miniprogram tsconfig should include the local typings directory'
);

const globalScssSource = await fs.readFile(path.join(rootDir, 'miniprogram/global.scss'), 'utf8');
assert.match(globalScssSource, /styles\/variables\.scss/, 'global.scss should expose shared variables');

const typingsSource = await fs.readFile(path.join(rootDir, 'miniprogram/typings/index.d.ts'), 'utf8');
assert.match(typingsSource, /interface IAppOption/, 'mini program typings should declare IAppOption');

console.log('PASS verify-modernization-foundation task1');
