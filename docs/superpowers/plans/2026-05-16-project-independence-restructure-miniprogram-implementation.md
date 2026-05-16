# Miniprogram Independence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `wx-app/miniprogram/` into a self-contained WeChat mini program project with its own package, TypeScript config, ESLint, Stylelint, and local verification scripts.

**Architecture:** Keep the official WeChat compiler-plugin workflow inside `wx-app/project.config.json`, and use `wx-app/miniprogram/package.json` only for local lint, stylelint, typecheck, and verification. All mini program verification scripts live under `wx-app/miniprogram/tools/` and refer only to sibling source paths so the project can be checked without any root tooling.

**Tech Stack:** npm, TypeScript 5.9, ESLint flat config, `typescript-eslint`, `globals`, Stylelint 17, `miniprogram-api-typings`, WeChat mini program TypeScript compiler plugin.

---

## File Structure

- Create: `wx-app/miniprogram/package.json`
- Create: `wx-app/miniprogram/eslint.config.mjs`
- Create: `wx-app/miniprogram/stylelint.config.mjs`
- Create: `wx-app/miniprogram/tools/`
- Modify: `wx-app/miniprogram/tsconfig.json`
- Move: `tools/verify-app-config.mjs` -> `wx-app/miniprogram/tools/verify-app-config.mjs`
- Move: `tools/verify-client-platform.mjs` -> `wx-app/miniprogram/tools/verify-client-platform.mjs`
- Move: `tools/verify-ios-entry-gating.mjs` -> `wx-app/miniprogram/tools/verify-ios-entry-gating.mjs`
- Move: `tools/verify-miniprogram-typescript-migration.mjs` -> `wx-app/miniprogram/tools/verify-miniprogram-typescript-migration.mjs`
- Move: `tools/verify-motion-system.mjs` -> `wx-app/miniprogram/tools/verify-motion-system.mjs`
- Move: `tools/verify-scan-dialog-behavior.mjs` -> `wx-app/miniprogram/tools/verify-scan-dialog-behavior.mjs`
- Move: `tools/verify-wifi-manager.mjs` -> `wx-app/miniprogram/tools/verify-wifi-manager.mjs`
- Move: `tools/verify-wifi-ndef.mjs` -> `wx-app/miniprogram/tools/verify-wifi-ndef.mjs`
- Move: `tools/verify-write-app-android-only.mjs` -> `wx-app/miniprogram/tools/verify-write-app-android-only.mjs`
- Move: `tools/verify-write-local-media-behavior.mjs` -> `wx-app/miniprogram/tools/verify-write-local-media-behavior.mjs`
- Move: `tools/verify-write-wifi-behavior.mjs` -> `wx-app/miniprogram/tools/verify-write-wifi-behavior.mjs`
- Move: `tools/verify-write-wifi-page.mjs` -> `wx-app/miniprogram/tools/verify-write-wifi-page.mjs`

## Boundary Notes

- This plan assumes the foundation move already completed and `miniprogram/` now lives at `wx-app/miniprogram/`.
- Do not recreate `project.config.json` inside `wx-app/miniprogram/`; the WeChat project root is `wx-app/`.
- `verify-modernization-foundation.mjs` is intentionally not moved. It belongs to the removed root tooling layer.

---

### Task 1: Add a self-contained package and standalone TypeScript config

**Files:**
- Create: `wx-app/miniprogram/package.json`
- Modify: `wx-app/miniprogram/tsconfig.json`

- [ ] **Step 1: Confirm the mini program does not already own a package manifest**

Run:

```powershell
@(
  'wx-app\miniprogram\package.json',
  'wx-app\miniprogram\package-lock.json'
) | ForEach-Object {
  "$_ -> $(Test-Path $_)"
}
```

Expected:

```text
wx-app\miniprogram\package.json -> False
wx-app\miniprogram\package-lock.json -> False
```

- [ ] **Step 2: Create `wx-app/miniprogram/package.json` with local scripts only**

```json
{
  "name": "nfc-scan-miniprogram",
  "private": true,
  "scripts": {
    "lint": "eslint \"app.ts\" \"components/**/*.ts\" \"custom-tab-bar/**/*.ts\" \"pages/**/*.ts\" \"utils/**/*.ts\" \"tools/**/*.mjs\"",
    "lint:fix": "eslint \"app.ts\" \"components/**/*.ts\" \"custom-tab-bar/**/*.ts\" \"pages/**/*.ts\" \"utils/**/*.ts\" \"tools/**/*.mjs\" --fix",
    "lint:styles": "stylelint \"app.scss\" \"global.scss\" \"components/**/*.scss\" \"custom-tab-bar/**/*.scss\" \"pages/**/*.scss\" \"styles/**/*.scss\"",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "verify": "node tools/verify-app-config.mjs && node tools/verify-client-platform.mjs && node tools/verify-ios-entry-gating.mjs && node tools/verify-miniprogram-typescript-migration.mjs && node tools/verify-motion-system.mjs && node tools/verify-scan-dialog-behavior.mjs && node tools/verify-wifi-manager.mjs && node tools/verify-wifi-ndef.mjs && node tools/verify-write-app-android-only.mjs && node tools/verify-write-local-media-behavior.mjs && node tools/verify-write-wifi-behavior.mjs && node tools/verify-write-wifi-page.mjs && npm run lint && npm run lint:styles && npm run typecheck"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "eslint": "^10.4.0",
    "globals": "^17.6.0",
    "miniprogram-api-typings": "^5.2.1",
    "stylelint": "^17.11.1",
    "stylelint-config-standard-scss": "^17.0.0",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.59.3"
  }
}
```

- [ ] **Step 3: Replace `wx-app/miniprogram/tsconfig.json` so it no longer extends the removed root base config**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["miniprogram-api-typings"],
    "lib": ["ES2020"]
  },
  "include": [
    "./**/*.ts",
    "./typings/**/*.d.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

- [ ] **Step 4: Install the local dependencies and confirm TypeScript resolves inside the mini program root**

Run:

```powershell
Push-Location 'wx-app/miniprogram'
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
git add wx-app/miniprogram/package.json wx-app/miniprogram/package-lock.json wx-app/miniprogram/tsconfig.json
git commit -m "build: add local miniprogram package and tsconfig"
```

---

### Task 2: Add miniprogram-local ESLint and Stylelint configs

**Files:**
- Create: `wx-app/miniprogram/eslint.config.mjs`
- Create: `wx-app/miniprogram/stylelint.config.mjs`

- [ ] **Step 1: Verify the local lint configs do not exist yet**

Run:

```powershell
@(
  'wx-app\miniprogram\eslint.config.mjs',
  'wx-app\miniprogram\stylelint.config.mjs'
) | ForEach-Object {
  "$_ -> $(Test-Path $_)"
}
```

Expected:

```text
wx-app\miniprogram\eslint.config.mjs -> False
wx-app\miniprogram\stylelint.config.mjs -> False
```

- [ ] **Step 2: Create `wx-app/miniprogram/eslint.config.mjs`**

```js
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const miniProgramGlobals = {
  App: 'readonly',
  Behavior: 'readonly',
  Component: 'readonly',
  Page: 'readonly',
  getApp: 'readonly',
  getCurrentPages: 'readonly',
  requireMiniProgram: 'readonly',
  requirePlugin: 'readonly',
  wx: 'readonly',
}

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'miniprogram_npm/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['app.ts', 'components/**/*.ts', 'custom-tab-bar/**/*.ts', 'pages/**/*.ts', 'utils/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...miniProgramGlobals,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['tools/**/*.mjs'],
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

- [ ] **Step 3: Create `wx-app/miniprogram/stylelint.config.mjs`**

```js
export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: [
    '**/node_modules/**',
  ],
  overrides: [
    {
      files: ['**/*.scss'],
      rules: {
        'alpha-value-notation': null,
        'color-function-alias-notation': null,
        'color-function-notation': null,
        'color-hex-length': null,
        'declaration-block-no-duplicate-properties': [true, {
          ignore: ['consecutive-duplicates-with-different-values'],
        }],
        'declaration-block-no-redundant-longhand-properties': null,
        'keyframes-name-pattern': '^[a-z][a-zA-Z0-9-]*$',
        'no-descending-specificity': null,
        'rule-empty-line-before': null,
        'scss/dollar-variable-empty-line-before': null,
        'scss/load-partial-extension': null,
        'selector-class-pattern': '^[a-z][a-zA-Z0-9-]*(?:__[a-zA-Z0-9-]+)*(?:--[a-zA-Z0-9-]+)*$',
        'selector-type-no-unknown': [true, {
          ignoreTypes: ['page', 'swiper', 'swiper-item', 'navigator', 'scroll-view'],
        }],
        'unit-no-unknown': [true, {
          ignoreUnits: ['rpx'],
        }],
        'value-keyword-case': null,
      },
    },
    {
      files: ['components/pixel-toast/pixel-toast.scss'],
      rules: {
        'declaration-block-no-duplicate-properties': null,
      },
    },
  ],
}
```

- [ ] **Step 4: Print both configs and run the local linters**

Run:

```powershell
Push-Location 'wx-app/miniprogram'
npx eslint --print-config app.ts
npx stylelint --print-config app.scss
npm run lint
npm run lint:styles
Pop-Location
```

Expected:

```text
... ESLint config JSON ...
... Stylelint config JSON ...
... lint commands exit successfully ...
```

- [ ] **Step 5: Commit**

```bash
git add wx-app/miniprogram/eslint.config.mjs wx-app/miniprogram/stylelint.config.mjs
git commit -m "build: add local miniprogram lint configuration"
```

---

### Task 3: Move the mini program verification scripts under the project root

**Files:**
- Create: `wx-app/miniprogram/tools/`
- Move: `tools/verify-app-config.mjs` -> `wx-app/miniprogram/tools/verify-app-config.mjs`
- Move: `tools/verify-client-platform.mjs` -> `wx-app/miniprogram/tools/verify-client-platform.mjs`
- Move: `tools/verify-ios-entry-gating.mjs` -> `wx-app/miniprogram/tools/verify-ios-entry-gating.mjs`
- Move: `tools/verify-miniprogram-typescript-migration.mjs` -> `wx-app/miniprogram/tools/verify-miniprogram-typescript-migration.mjs`
- Move: `tools/verify-motion-system.mjs` -> `wx-app/miniprogram/tools/verify-motion-system.mjs`
- Move: `tools/verify-scan-dialog-behavior.mjs` -> `wx-app/miniprogram/tools/verify-scan-dialog-behavior.mjs`
- Move: `tools/verify-wifi-manager.mjs` -> `wx-app/miniprogram/tools/verify-wifi-manager.mjs`
- Move: `tools/verify-wifi-ndef.mjs` -> `wx-app/miniprogram/tools/verify-wifi-ndef.mjs`
- Move: `tools/verify-write-app-android-only.mjs` -> `wx-app/miniprogram/tools/verify-write-app-android-only.mjs`
- Move: `tools/verify-write-local-media-behavior.mjs` -> `wx-app/miniprogram/tools/verify-write-local-media-behavior.mjs`
- Move: `tools/verify-write-wifi-behavior.mjs` -> `wx-app/miniprogram/tools/verify-write-wifi-behavior.mjs`
- Move: `tools/verify-write-wifi-page.mjs` -> `wx-app/miniprogram/tools/verify-write-wifi-page.mjs`

- [ ] **Step 1: Move the verification scripts into `wx-app/miniprogram/tools/`**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'wx-app/miniprogram/tools' | Out-Null
git mv tools/verify-app-config.mjs wx-app/miniprogram/tools/verify-app-config.mjs
git mv tools/verify-client-platform.mjs wx-app/miniprogram/tools/verify-client-platform.mjs
git mv tools/verify-ios-entry-gating.mjs wx-app/miniprogram/tools/verify-ios-entry-gating.mjs
git mv tools/verify-miniprogram-typescript-migration.mjs wx-app/miniprogram/tools/verify-miniprogram-typescript-migration.mjs
git mv tools/verify-motion-system.mjs wx-app/miniprogram/tools/verify-motion-system.mjs
git mv tools/verify-scan-dialog-behavior.mjs wx-app/miniprogram/tools/verify-scan-dialog-behavior.mjs
git mv tools/verify-wifi-manager.mjs wx-app/miniprogram/tools/verify-wifi-manager.mjs
git mv tools/verify-wifi-ndef.mjs wx-app/miniprogram/tools/verify-wifi-ndef.mjs
git mv tools/verify-write-app-android-only.mjs wx-app/miniprogram/tools/verify-write-app-android-only.mjs
git mv tools/verify-write-local-media-behavior.mjs wx-app/miniprogram/tools/verify-write-local-media-behavior.mjs
git mv tools/verify-write-wifi-behavior.mjs wx-app/miniprogram/tools/verify-write-wifi-behavior.mjs
git mv tools/verify-write-wifi-page.mjs wx-app/miniprogram/tools/verify-write-wifi-page.mjs
```

- [ ] **Step 2: Rewrite the verifier paths so they resolve within the mini program root**

Run:

```powershell
$files = Get-ChildItem 'wx-app/miniprogram/tools' -Filter '*.mjs' | Select-Object -ExpandProperty FullName
foreach ($file in $files) {
  $source = Get-Content $file -Raw
  $source = $source.Replace('../miniprogram/', '../')
  Set-Content $file $source
}
```

- [ ] **Step 3: Confirm no mini program verifier still points back to the old root path**

Run:

```bash
rg -n "\.\./miniprogram/" wx-app/miniprogram/tools
```

Expected:

```text
no matches
```

- [ ] **Step 4: Run the complete local mini program verification gate**

Run:

```powershell
Push-Location 'wx-app/miniprogram'
npm run verify
Pop-Location
```

Expected:

```text
... all verifier scripts pass ...
... eslint exits successfully ...
... stylelint exits successfully ...
... TypeScript exits successfully ...
```

- [ ] **Step 5: Commit**

```bash
git add wx-app/miniprogram/tools
git commit -m "test: localize miniprogram verification scripts"
```

---

## Self-Review Notes

### Spec Coverage

- Local `package.json` and `tsconfig.json`: Task 1.
- Local ESLint and Stylelint ownership: Task 2.
- Project-owned verification scripts: Task 3.

### Placeholder Scan

- Every script, dependency, and lint glob is spelled out.
- Every verification step has an exact command and expected result.

### Naming Consistency

- The project root is consistently `wx-app/miniprogram`.
- All moved verifiers now live under `wx-app/miniprogram/tools`.
