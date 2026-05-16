# Web Service Independence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `web-service/` a self-contained TypeScript service project with its own tsconfig, Antfu-based ESLint config, and local verification scripts.

**Architecture:** Keep the service runtime behavior and CloudBase resource names stable, but remove the dependency on the deleted root ESLint and TypeScript config. The local directory becomes `web-service/`, local package scripts become the only supported command entrypoints, and service-specific verification scripts move under `web-service/tools/`.

**Tech Stack:** npm, TypeScript 5.9, ESLint flat config, `@antfu/eslint-config`, Express, CloudBase Node service deployment.

---

## File Structure

- Modify: `web-service/package.json`
- Modify: `web-service/tsconfig.json`
- Modify: `web-service/eslint.config.mjs`
- Create: `web-service/tools/`
- Move: `tools/verify-play-web-service-modernization.mjs` -> `web-service/tools/verify-play-web-service-modernization.mjs`
- Move: `tools/verify-play-theme-controls.mjs` -> `web-service/tools/verify-play-theme-controls.mjs`
- Preserve deployment config names: `web-service/cloudbaserc.json`

## Boundary Notes

- This plan assumes the foundation move already completed and the local directory is already `web-service/`.
- Keep CloudBase resource names such as `play-web-service` inside `cloudbaserc.json` and `wx-app/route-config.json`.
- Renaming the filesystem project does not require changing the public playback URL structure.

---

### Task 1: Replace root-dependent TypeScript ownership with a project-local service config

**Files:**
- Modify: `web-service/package.json`
- Modify: `web-service/tsconfig.json`

- [ ] **Step 1: Confirm the service still extends the root TypeScript base**

Run:

```powershell
Get-Content 'web-service/tsconfig.json' -Raw
```

Expected:

```text
... "extends": "../tsconfig.base.json" ...
```

- [ ] **Step 2: Replace `web-service/package.json` with project-local scripts**

```json
{
  "name": "web-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/server.ts",
    "lint": "eslint --config eslint.config.mjs \"src/**/*.ts\" \"tools/**/*.mjs\"",
    "lint:fix": "eslint --config eslint.config.mjs \"src/**/*.ts\" \"tools/**/*.mjs\" --fix",
    "start": "node ./dist/server.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "verify": "node tools/verify-play-web-service-modernization.mjs && node tools/verify-play-theme-controls.mjs && npm run lint && npm run typecheck && npm run build"
  },
  "dependencies": {
    "@cloudbase/node-sdk": "^3.18.1",
    "cors": "^2.8.5",
    "express": "~4.16.1",
    "morgan": "~1.9.1"
  },
  "devDependencies": {
    "@antfu/eslint-config": "^5.2.2",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.23",
    "@types/morgan": "^1.9.10",
    "@types/node": "^24.10.0",
    "eslint": "^9.26.0",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 3: Replace `web-service/tsconfig.json` with a standalone service config**

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
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules", "public"]
}
```

- [ ] **Step 4: Install dependencies and confirm local typecheck succeeds without the root base config**

Run:

```powershell
Push-Location 'web-service'
npm install
npm run typecheck
Pop-Location
```

Expected:

```text
up to date or added ... packages
... TypeScript exits successfully ...
```

- [ ] **Step 5: Commit**

```bash
git add web-service/package.json web-service/package-lock.json web-service/tsconfig.json
git commit -m "build: add local web service package and tsconfig"
```

---

### Task 2: Replace the root-importing ESLint config with a local Antfu config

**Files:**
- Modify: `web-service/eslint.config.mjs`

- [ ] **Step 1: Confirm the current ESLint config still imports the removed root config**

Run:

```powershell
Get-Content 'web-service/eslint.config.mjs' -Raw
```

Expected:

```text
... import rootConfig from '../eslint.config.mjs' ...
```

- [ ] **Step 2: Replace `web-service/eslint.config.mjs` with a project-local Antfu config**

```js
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
    lessOpinionated: true,
    ignores: [
      'dist/**',
      'public/**',
      'node_modules/**',
    ],
  },
  {
    files: ['src/**/*.ts', 'tools/**/*.mjs'],
    rules: {
      'no-console': 'off',
      'ts/no-misused-promises': 'off',
    },
  },
)
```

- [ ] **Step 3: Print the config and run the service linter locally**

Run:

```powershell
Push-Location 'web-service'
npx eslint --print-config src/server.ts
npm run lint
Pop-Location
```

Expected:

```text
... ESLint config JSON ...
... lint exits successfully ...
```

- [ ] **Step 4: Verify no file in `web-service/` still references the deleted root ESLint config**

Run:

```bash
rg -n "\.\./eslint\.config\.mjs|tsconfig\.base" web-service
```

Expected:

```text
no matches
```

- [ ] **Step 5: Commit**

```bash
git add web-service/eslint.config.mjs
git commit -m "build: make web service lint config self-contained"
```

---

### Task 3: Move service verification scripts into the project and wire the local verify command

**Files:**
- Create: `web-service/tools/`
- Move: `tools/verify-play-web-service-modernization.mjs` -> `web-service/tools/verify-play-web-service-modernization.mjs`
- Move: `tools/verify-play-theme-controls.mjs` -> `web-service/tools/verify-play-theme-controls.mjs`

- [ ] **Step 1: Move the verification scripts into `web-service/tools/`**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'web-service/tools' | Out-Null
git mv tools/verify-play-web-service-modernization.mjs web-service/tools/verify-play-web-service-modernization.mjs
git mv tools/verify-play-theme-controls.mjs web-service/tools/verify-play-theme-controls.mjs
```

- [ ] **Step 2: Replace `verify-play-web-service-modernization.mjs` with project-local assertions and localize the theme verifier path**

```js
// web-service/tools/verify-play-web-service-modernization.mjs
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
assert.equal(packageJson.name, 'web-service')
assert.equal(packageJson.scripts.typecheck, 'tsc -p tsconfig.json --noEmit')
assert.equal(packageJson.scripts.verify, 'node tools/verify-play-web-service-modernization.mjs && node tools/verify-play-theme-controls.mjs && npm run lint && npm run typecheck && npm run build')

const tsconfig = await readJson('tsconfig.json')
assert.equal(tsconfig.compilerOptions.rootDir, 'src')
assert.equal(tsconfig.compilerOptions.outDir, 'dist')
assert.equal(tsconfig.compilerOptions.strict, true)

const eslintConfigSource = await fs.readFile(
  path.join(rootDir, 'eslint.config.mjs'),
  'utf8',
)
assert.match(eslintConfigSource, /@antfu\/eslint-config/, 'eslint config should use the Antfu base preset')
assert.match(eslintConfigSource, /ts\/no-misused-promises/, 'eslint config should keep the local promise override')
assert.doesNotMatch(eslintConfigSource, /\.\.\/eslint\.config\.mjs/, 'eslint config should not import the removed root config')

console.log('PASS verify-play-web-service-modernization task1')
```

Run:

```powershell
$themeVerifier = 'web-service/tools/verify-play-theme-controls.mjs'
$source = Get-Content $themeVerifier -Raw
$source = $source.Replace('../play-web-service/', '../')
Set-Content $themeVerifier $source
```

- [ ] **Step 3: Confirm the moved service verifiers no longer reference the old directory**

Run:

```bash
rg -n "\.\./play-web-service/" web-service/tools
```

Expected:

```text
no matches
```

- [ ] **Step 4: Run the full project-owned verification gate**

Run:

```powershell
Push-Location 'web-service'
npm run verify
Pop-Location
```

Expected:

```text
PASS verify-play-web-service-modernization task1
... play theme controls verification passes ...
... lint exits successfully ...
... TypeScript exits successfully ...
... build exits successfully ...
```

- [ ] **Step 5: Commit**

```bash
git add web-service/tools web-service/package.json
git commit -m "test: localize web service verification scripts"
```

---

## Self-Review Notes

### Spec Coverage

- Local package and local tsconfig: Task 1.
- Antfu-based local ESLint config: Task 2.
- Project-owned verification scripts: Task 3.

### Placeholder Scan

- All scripts, config content, and search commands are explicit.
- CloudBase resource-name stability is stated directly instead of implied.

### Naming Consistency

- Filesystem project name is consistently `web-service`.
- Deployment resource names remain `play-web-service` only where infra expects them.
