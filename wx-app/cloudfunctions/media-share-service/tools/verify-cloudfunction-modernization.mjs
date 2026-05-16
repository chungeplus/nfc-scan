import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readJson(relativePath) {
  const source = await fs.readFile(path.join(rootDir, relativePath), 'utf8')
  return JSON.parse(source)
}

const packageJson = await readJson('package.json')
assert.equal(packageJson.main, 'index.js')
assert.equal(packageJson.scripts.build, 'tsc -p tsconfig.json')
assert.equal(packageJson.scripts.lint, 'eslint --config eslint.config.mjs "src/**/*.ts" "tools/**/*.mjs"')
assert.equal(packageJson.scripts.verify, 'node tools/verify-cloudfunction-modernization.mjs && npm run lint && npm run typecheck && npm run build')

const tsconfig = await readJson('tsconfig.json')
assert.equal(tsconfig.compilerOptions.rootDir, 'src')
assert.equal(tsconfig.compilerOptions.outDir, '.')
assert.equal(tsconfig.compilerOptions.strict, true)

const eslintConfigSource = await fs.readFile(
  path.join(rootDir, 'eslint.config.mjs'),
  'utf8',
)
assert.match(eslintConfigSource, /typescript-eslint/, 'eslint config should use typescript-eslint')
assert.match(eslintConfigSource, /tools\/\*\*\/\*\.mjs/, 'eslint config should lint local verifier scripts')

const sourceEntry = await fs.readFile(
  path.join(rootDir, 'src/index.ts'),
  'utf8',
)
assert.match(sourceEntry, /export async function main/, 'src/index.ts should export the typed main entrypoint')
assert.match(sourceEntry, /MediaShareServiceEvent/, 'src/index.ts should type the incoming event')

const contractsSource = await fs.readFile(
  path.join(rootDir, 'src/contracts.ts'),
  'utf8',
)
assert.match(contractsSource, /export interface MediaShareServiceEvent/, 'contracts.ts should define the event contract')
assert.match(contractsSource, /export type MediaShareServiceResponse/, 'contracts.ts should define the response contract')
assert.match(sourceEntry, /from '\.\/contracts'/, 'src/index.ts should import the shared contracts')

console.log('PASS verify-cloudfunction-modernization task1')
