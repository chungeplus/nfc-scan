# Cloud Function Independence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `wx-app/cloudfunctions/media-share-service/` a self-contained cloud function project with its own TypeScript config, ESLint config, package scripts, and local verification script.

**Architecture:** Keep the current `src/*.ts -> *.js` function-local compilation model, but remove the dependency on the deleted root `tsconfig.base.json` and root ESLint config. The cloud function owns its runtime package, its lint rules, and its verification script under `tools/`.

**Tech Stack:** npm, TypeScript 5.9, ESLint flat config, `typescript-eslint`, Node.js globals, WeChat Cloud Functions (`wx-server-sdk`).

---

## File Structure

- Modify: `wx-app/cloudfunctions/media-share-service/package.json`
- Modify: `wx-app/cloudfunctions/media-share-service/tsconfig.json`
- Create: `wx-app/cloudfunctions/media-share-service/eslint.config.mjs`
- Create: `wx-app/cloudfunctions/media-share-service/tools/`
- Move: `tools/verify-cloudfunction-modernization.mjs` -> `wx-app/cloudfunctions/media-share-service/tools/verify-cloudfunction-modernization.mjs`
- Preserve build outputs: `wx-app/cloudfunctions/media-share-service/index.js`
- Preserve build outputs: `wx-app/cloudfunctions/media-share-service/contracts.js`

## Boundary Notes

- This plan assumes the foundation move already completed and `cloudfunctions/` now lives under `wx-app/`.
- Keep the cloud function runtime entry as `index.js`.
- Keep generated `contracts.js` alongside `index.js`, because `index.js` imports `./contracts` after TypeScript compilation.

---

### Task 1: Remove the cloud function's dependency on root TypeScript config

**Files:**
- Modify: `wx-app/cloudfunctions/media-share-service/package.json`
- Modify: `wx-app/cloudfunctions/media-share-service/tsconfig.json`

- [ ] **Step 1: Confirm the current cloud function still depends on the root TypeScript base**

Run:

```powershell
Get-Content 'wx-app/cloudfunctions/media-share-service/tsconfig.json' -Raw
```

Expected:

```text
... "extends": "../../tsconfig.base.json" ...
```

- [ ] **Step 2: Replace `package.json` with local lint, build, typecheck, and verify scripts**

```json
{
  "name": "media-share-service",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint --config eslint.config.mjs \"src/**/*.ts\" \"tools/**/*.mjs\"",
    "lint:fix": "eslint --config eslint.config.mjs \"src/**/*.ts\" \"tools/**/*.mjs\" --fix",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "verify": "node tools/verify-cloudfunction-modernization.mjs && npm run lint && npm run typecheck && npm run build"
  },
  "dependencies": {
    "wx-server-sdk": "3.0.4"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.0.0",
    "eslint": "^10.4.0",
    "globals": "^17.6.0",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.59.3"
  }
}
```

- [ ] **Step 3: Replace `tsconfig.json` with a standalone cloud function config**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "rootDir": "src",
    "outDir": ".",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "index.js", "contracts.js"]
}
```

- [ ] **Step 4: Install the local dependencies and confirm typecheck succeeds without the root base config**

Run:

```powershell
Push-Location 'wx-app/cloudfunctions/media-share-service'
npm install
npm run typecheck
Pop-Location
```

Expected:

```text
added ... packages
... TypeScript exits successfully ...
```

- [ ] **Step 5: Commit**

```bash
git add wx-app/cloudfunctions/media-share-service/package.json wx-app/cloudfunctions/media-share-service/package-lock.json wx-app/cloudfunctions/media-share-service/tsconfig.json
git commit -m "build: add local cloud function package and tsconfig"
```

---

### Task 2: Add local ESLint and move the cloud function verifier

**Files:**
- Create: `wx-app/cloudfunctions/media-share-service/eslint.config.mjs`
- Create: `wx-app/cloudfunctions/media-share-service/tools/`
- Move: `tools/verify-cloudfunction-modernization.mjs` -> `wx-app/cloudfunctions/media-share-service/tools/verify-cloudfunction-modernization.mjs`

- [ ] **Step 1: Create `wx-app/cloudfunctions/media-share-service/eslint.config.mjs`**

```js
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'index.js',
      'contracts.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tools/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
)
```

- [ ] **Step 2: Move the modernization verifier into the cloud function project**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'wx-app/cloudfunctions/media-share-service/tools' | Out-Null
git mv tools/verify-cloudfunction-modernization.mjs wx-app/cloudfunctions/media-share-service/tools/verify-cloudfunction-modernization.mjs
```

- [ ] **Step 3: Replace the verifier with project-local assertions**

```js
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
```

- [ ] **Step 4: Run the project-owned verification gate**

Run:

```powershell
Push-Location 'wx-app/cloudfunctions/media-share-service'
npm run verify
Pop-Location
```

Expected:

```text
PASS verify-cloudfunction-modernization task1
... eslint exits successfully ...
... TypeScript exits successfully ...
... build emits index.js and contracts.js ...
```

- [ ] **Step 5: Commit**

```bash
git add wx-app/cloudfunctions/media-share-service/eslint.config.mjs wx-app/cloudfunctions/media-share-service/tools/verify-cloudfunction-modernization.mjs wx-app/cloudfunctions/media-share-service/index.js wx-app/cloudfunctions/media-share-service/contracts.js
git commit -m "build: localize cloud function lint and verification"
```

---

### Task 3: Lock in the independent command model

**Files:**
- Modify: `wx-app/cloudfunctions/media-share-service/package.json`

- [ ] **Step 1: Confirm the cloud function can now be worked on without any root scripts**

Run:

```powershell
Push-Location 'wx-app/cloudfunctions/media-share-service'
npm run lint
npm run typecheck
npm run build
Pop-Location
```

Expected:

```text
... all commands exit successfully ...
```

- [ ] **Step 2: Verify no remaining file still points at the removed root tooling**

Run:

```bash
rg -n "tsconfig\\.base|eslint\\.config\\.mjs|\\.\\./cloudfunctions/media-share-service/" wx-app/cloudfunctions/media-share-service
```

Expected:

```text
no matches
```

- [ ] **Step 3: Record the project-local command model in `package.json`**

Keep this exact scripts block:

```json
"scripts": {
  "build": "tsc -p tsconfig.json",
  "lint": "eslint --config eslint.config.mjs \"src/**/*.ts\" \"tools/**/*.mjs\"",
  "lint:fix": "eslint --config eslint.config.mjs \"src/**/*.ts\" \"tools/**/*.mjs\" --fix",
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "verify": "node tools/verify-cloudfunction-modernization.mjs && npm run lint && npm run typecheck && npm run build"
}
```

- [ ] **Step 4: Re-run the single-command project verify**

Run:

```powershell
Push-Location 'wx-app/cloudfunctions/media-share-service'
npm run verify
Pop-Location
```

Expected:

```text
... verify exits successfully ...
```

- [ ] **Step 5: Commit**

```bash
git add wx-app/cloudfunctions/media-share-service/package.json
git commit -m "docs: finalize cloud function command ownership"
```

---

## Self-Review Notes

### Spec Coverage

- Standalone `package.json` and `tsconfig.json`: Task 1.
- Local ESLint and local verifier ownership: Task 2.
- Independent command model: Task 3.

### Placeholder Scan

- All dependencies, scripts, and TypeScript options are spelled out.
- The emitted `contracts.js` output is explicitly included instead of implied.

### Naming Consistency

- The project path is consistently `wx-app/cloudfunctions/media-share-service`.
- The local verifier path is consistently `tools/verify-cloudfunction-modernization.mjs`.
