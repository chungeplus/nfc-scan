# NFC Scan Repository Modernization Design

**Date:** 2026-05-16

**Status:** Draft for review

## Goal

Modernize the `nfc-scan` repository so that new and migrated code uses a stable, current baseline:

1. `TypeScript` for application and service logic.
2. `SCSS` for mini program styles.
3. modern stable JavaScript syntax and async patterns, especially `Promise`, `async`, and `await`.
4. unified static analysis through `ESLint` and `Stylelint`.
5. clear build and verification commands that do not change the current release paths.

The modernization must preserve the current project layout and the current WeChat mini program, cloud function, and web service release model.

## Scope

### In Scope

- repository-level tooling and conventions
- `miniprogram`
- `cloudfunctions/media-share-service`
- `play-web-service`
- shared verification commands and documentation
- migration sequencing and guardrails for legacy `js` to `ts`

### Out of Scope

- business feature changes
- visual redesign unrelated to the tooling shift
- moving to a monorepo workspace model
- changing the mini program root or cloud function root in `project.config.json`
- changing deployment platforms
- converting the repository to ESM everywhere in the first pass

## Confirmed Decisions

- The user chose a full-repository modernization rather than "new code only".
- The user chose a conservative upgrade path that preserves the current directory layout and release flow.
- The mini program should follow the WeChat official TypeScript compiler-plugin path rather than a custom same-directory `ts -> js` generation workflow.
- New and migrated async code should prefer `Promise` APIs and `async` / `await`, with callback style kept only where the platform does not provide a better option.
- `play-web-service` should keep its current `src -> dist` service model.
- `SCSS` remains the style authoring language for the mini program.

## Approaches Considered

### 1. Layered Conservative Upgrade

Keep the existing project roots and deployment flow, add a thin repository-level tooling layer, and modernize each subproject in place.

Result:
- chosen

Why:
- matches the user's requested risk level
- matches the current repository shape
- preserves compatibility with WeChat developer tooling and cloud deployment entry points

### 2. In-Place File-by-File Conversion Without Strong Tooling Boundaries

Convert `js` to `ts` directly in current folders with minimal new configuration.

Why not chosen:
- too easy to blur source-of-truth boundaries
- higher risk of committing or editing generated runtime files by mistake
- weaker long-term maintainability

### 3. Deep Monorepo Restructure

Rebuild the repository around workspaces and a centralized task runner.

Why not chosen:
- conflicts with the chosen conservative rollout
- introduces unnecessary release and onboarding risk

## Research Notes

### WeChat Mini Program Official Guidance

The WeChat developer tools officially support TypeScript compiler plugins for mini programs.

Key implications for this design:

- old projects can enable built-in compiler plugins through `project.config.json`
- `typescript` and `sass` compiler plugins can be enabled together
- the mini program project can be authored in `ts` without maintaining same-name `js` source files
- if same-name `ts` and `js` files both exist, the tool prioritizes `ts`
- the built-in TypeScript compilation removes type syntax but does not replace independent static type checking

Reference:
- <https://developers.weixin.qq.com/miniprogram/dev/devtools/compilets.html>

The WeChat developer tools CLI also preserves the existing project-based preview, upload, npm build, and cloud function deployment model.

Reference:
- <https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html>

### ESLint Official Guidance

The repository should standardize on ESLint flat config for long-term compatibility with ESLint 9 and newer tooling.

Reference:
- <https://eslint.org/docs/latest/use/configure/migration-guide>

### Stylelint Official Guidance

Stylelint's current recommended setup starts from a shared config and explicitly supports SCSS through the SCSS standard config path.

Reference:
- <https://stylelint.io/user-guide/get-started/>

## Architecture Overview

The modernization should introduce a thin root-level standards layer while preserving the three operational subprojects.

```text
nfc-scan/
- package.json
- eslint.config.mjs
- stylelint.config.mjs
- tsconfig.base.json
- miniprogram/
- cloudfunctions/
- play-web-service/
```

### Root-Level Responsibilities

The repository root becomes responsible for:

- shared scripts
- shared lint defaults
- shared TypeScript base options
- shared migration policy
- shared verification entry points

The root does not become a new runtime target and does not replace current deployment roots.

### Subproject Responsibilities

- `miniprogram`
  authoring, preview, and upload of the WeChat mini program
- `cloudfunctions/media-share-service`
  cloud function runtime and deployment package
- `play-web-service`
  hosted web playback service and API routes

## Directory and Source-of-Truth Design

### Repository Root

Add:

- `package.json`
- `eslint.config.mjs`
- `stylelint.config.mjs`
- `tsconfig.base.json`

Purpose:

- provide one command surface for development and verification
- keep configuration drift low across subprojects

### `miniprogram`

Keep:

- current root at `miniprogram/`
- current project-config ownership
- current `wxml`, `json`, and `scss` file placement

Add:

- `miniprogram/tsconfig.json`
- `miniprogram/global.scss`
- `miniprogram/typings/`

Change:

- keep the checked-in mini program project configs aligned on `["typescript", "sass"]`
- migrate runtime logic files from `*.js` to `*.ts`

Source-of-truth rule:

- once a mini program module is migrated, `*.ts` is the maintained source
- same-name legacy `*.js` files should not remain as long-term authored files

### `cloudfunctions/media-share-service`

Keep:

- current function directory
- current function root deployment entry
- current `package.json` ownership within the function directory

Add:

- `cloudfunctions/media-share-service/tsconfig.json`
- `cloudfunctions/media-share-service/src/index.ts`

Build boundary:

- authored code lives in `src/`
- build output is emitted to the function root as `index.js`
- deployment keeps using the function root expected by the current WeChat cloud tooling

### `play-web-service`

Keep:

- current `src/`
- current `dist/`
- current package-local runtime ownership

Change:

- align its local config with the repository-wide standards
- reduce duplicated configuration where the root can act as the source of truth

## Tooling Design

### Package Management

Use `npm` as the repository-level package manager.

Why:

- the repository already contains npm lockfile usage
- this avoids introducing package-manager churn during the same migration

### TypeScript Strategy

#### Root Base Config

`tsconfig.base.json` should define the stable shared baseline:

- strict type checking enabled by default
- `esModuleInterop`
- `forceConsistentCasingInFileNames`
- `skipLibCheck`
- `resolveJsonModule`
- modern stable language target compatible with current runtime boundaries

The first pass should prefer compatibility over maximal novelty. "Latest stable" in this repository means current, widely supported TypeScript patterns, not experimental JavaScript proposals.

#### Mini Program TypeScript

The mini program must use two separate mechanisms:

1. WeChat compiler plugin for runtime compilation in developer tooling.
2. standalone `tsc --noEmit` for repository-controlled type checking.

This split is required because the WeChat built-in TypeScript transform is not a substitute for failing type checks.

Initial mini program policy:

- prefer `const`, `let`, destructuring, optional chaining, nullish coalescing, template strings, and `async` / `await`
- avoid experimental syntax not broadly supported by the current toolchain
- use explicit local typing on page data, event payloads, utility inputs, and cloud-response shapes

#### Cloud Function TypeScript

Cloud function TypeScript should compile to a conservative CommonJS target to preserve current deployment assumptions.

Initial policy:

- keep module output aligned with current function packaging
- prefer explicit request and response types
- wrap platform callback APIs in Promise-based utilities when practical

#### `play-web-service` TypeScript

The service should remain the strictest TypeScript environment in the repository.

Initial policy:

- keep `src -> dist`
- preserve strict type checking
- use the root base config where possible and local overrides only where service-specific behavior requires them

### ESLint Strategy

The repository should standardize on one root `eslint.config.mjs` using flat config.

The config should cover:

- root ignores
- TypeScript files
- JavaScript files that remain during migration
- WeChat mini program globals
- Node-specific rules for server and cloud code

Rule philosophy for phase one:

- errors for correctness, unsafe patterns, and obvious dead code
- limited warning-level style rules where auto-fix is helpful
- do not make the first rollout fail on every historical preference issue

Repository conventions to encode:

- prefer `async` / `await`
- avoid Promise chains where simple `await` is clearer
- avoid callback-style wrappers when a Promise path already exists
- no unused variables or imports
- no accidental floating promises in service and cloud code

### Stylelint Strategy

The repository should use one root `stylelint.config.mjs`.

Recommended baseline:

- extend `stylelint-config-standard-scss`
- lint `miniprogram/**/*.scss`
- keep room for a small number of local exceptions if WeChat-specific selectors or file patterns require them

Stylelint should enforce:

- valid SCSS and modern CSS usage
- consistent nesting and declaration hygiene
- fewer one-off style patterns across pages and components

### Scripts

The repository root should expose one stable script surface.

Recommended commands:

- `npm run lint`
- `npm run lint:code`
- `npm run lint:styles`
- `npm run typecheck`
- `npm run build`
- `npm run build:cloudfunctions`
- `npm run build:play-web-service`
- `npm run verify`

Behavior:

- `lint:code` runs root ESLint across active source files
- `lint:styles` runs Stylelint on SCSS
- `typecheck` runs mini program and service TypeScript checks
- `build` only builds artifacts that actually require repository-controlled emission
- mini program runtime compilation remains owned by WeChat tooling, not by a custom root build step

## Mini Program Design

### Compiler Plugin Configuration

The checked-in mini program project config files should stay aligned:

- `project.config.json`
- `miniprogram/project.config.json`

Both should use:

- `useCompilerPlugins: ["typescript", "sass"]`

This aligns the repository with the official WeChat recommendation for a TypeScript plus Sass mini program project.

### Global Style Entry

Add `miniprogram/global.scss` and move shared variables and mixins to the official global Sass entry path expected by the developer tools configuration.

Result:

- shared tokens become available through the current SCSS common-use configuration
- page and component styles stop depending on ad hoc import patterns for every shared symbol

### Type Definitions

The mini program should keep a dedicated local typing area:

- WeChat-related typings managed through the official mini program TypeScript project structure
- project-local declaration files for custom globals and module shims

### Migration Order

Mini program migration should move in this order:

1. `utils`
2. `components`
3. `pages`
4. `app`

Why:

- stabilizes shared data shapes first
- reduces duplicate event and data typing during page migration

## Cloud Function Design

### Build Shape

The cloud function should adopt:

```text
cloudfunctions/media-share-service/
- package.json
- tsconfig.json
- src/
  - index.ts
- index.js
```

Meaning:

- `src/index.ts` is the authored source
- `index.js` is emitted output kept for deployment compatibility

### Runtime Conventions

- keep current packaging semantics
- continue using current cloud SDK boundaries
- prefer typed helper functions for validation, normalization, and response shaping
- keep the public entry signature stable during the migration

## `play-web-service` Design

### Build and Runtime

Keep:

- `src/**/*.ts`
- `dist/**/*.js`
- local build ownership in `play-web-service`

Adjust:

- align lint and TypeScript options with the new root baseline
- reduce rule drift between service and the rest of the repository
- keep service-specific exceptions local and explicit

### Code Style Expectations

- prefer `async` / `await`
- use narrow request and response typing
- avoid unsafe escape hatches unless there is a documented reason

## Migration Plan

### Phase 1. Tooling Foundation

- add root `package.json`
- add root `eslint.config.mjs`
- add root `stylelint.config.mjs`
- add root `tsconfig.base.json`
- add root scripts and ignore patterns
- enable mini program `typescript` compiler plugin beside `sass`
- add `miniprogram/tsconfig.json`
- add `miniprogram/global.scss`

Deliverable:

- the new standard can run before business files are deeply migrated

### Phase 2. Service Alignment

- align `play-web-service` with the repository-wide lint and typecheck model
- keep service runtime behavior unchanged

Deliverable:

- service remains deployable with less config drift

### Phase 3. Cloud Function TypeScript Scaffold

- add function-local TypeScript build structure
- migrate the function entry from authored `js` to authored `ts`
- keep root deployment file shape intact

Deliverable:

- cloud code gains typed source without changing deployment entry points

### Phase 4. Mini Program Scaffolding

- add mini program typings and base TypeScript structure
- validate the WeChat compiler-plugin flow
- validate `tsc --noEmit`

Deliverable:

- mini program can support real TS migration safely

### Phase 5. Mini Program Logic Migration

- migrate shared utils
- migrate components
- migrate pages
- migrate `app`

Deliverable:

- core mini program logic authored in TypeScript

### Phase 6. Cleanup and Standardization

- remove obsolete same-name legacy source files
- finalize lint severities
- document the stable development commands

Deliverable:

- the repository no longer has unclear "old vs new" authoring paths

## Error Handling and Failure Modes

### Type Errors

- mini program type errors must fail `tsc --noEmit` even if developer tools preview still runs
- service and cloud function type errors must fail repository verification

### Lint Errors

- correctness and unsafe-runtime rules should fail verification
- non-critical style issues may begin as warnings if necessary for migration velocity

### Build Errors

- `play-web-service` and cloud function builds must fail fast on TypeScript emission errors
- mini program preview and upload remain controlled by WeChat tooling, so root verification must catch as much as possible before that step

## Verification Strategy

### Repository-Level Verification

Run:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify`

### Mini Program Verification

Verify:

- `tsc --noEmit -p miniprogram/tsconfig.json`
- ESLint across migrated mini program source
- Stylelint across mini program SCSS
- successful compilation in WeChat developer tools
- manual smoke checks for:
  - `write-menu`
  - `write-wifi`
  - `write-local-media`
  - `my-files`

### Cloud Function Verification

Verify:

- TypeScript build passes
- lint passes
- function entry behavior is unchanged in smoke testing

### `play-web-service` Verification

Verify:

- TypeScript build passes
- lint passes
- existing route smoke tests or manual API checks still pass

## Risks and Mitigations

- **Risk:** mini program TypeScript compilation appears successful while real type problems still exist.
  **Mitigation:** require standalone `tsc --noEmit` in repository verification.

- **Risk:** migration generates too many historical lint failures at once.
  **Mitigation:** start with correctness-focused blocking rules and tighten style rules in phases.

- **Risk:** developers continue editing legacy generated or transitional files.
  **Mitigation:** document source-of-truth ownership and remove stale duplicates as each slice is completed.

- **Risk:** cloud function deployment breaks because runtime entry expectations change.
  **Mitigation:** keep deployment-facing file shape unchanged and confine authored source to `src/`.

- **Risk:** root tooling becomes too invasive for a conservative migration.
  **Mitigation:** keep the root as a thin standards layer only; do not move runtime ownership out of subprojects.

## Acceptance Criteria

This modernization design is ready for implementation planning when all of the following are true:

1. The repository has one documented standards layer for TypeScript, ESLint, Stylelint, and shared scripts.
2. The mini program is aligned with the official WeChat `typescript` plus `sass` compiler-plugin model.
3. The cloud function has a typed source structure without changing its deployment root.
4. `play-web-service` remains deployable while aligning with shared standards.
5. New and migrated async code defaults to `Promise` and `async` / `await`.
6. Verification commands are defined clearly enough to gate future implementation work.
