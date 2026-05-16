# Project Independence Restructure Design

## Summary

This repository should be treated as a code hosting container for three different projects, not as one shared Node.js workspace with multiple submodules.

The target structure is:

```text
/
  .gitignore
  docs/
  wx-app/
    project.config.json
    project.private.config.json
    route-config.json
    miniprogram/
    cloudfunctions/
  web-service/
```

Inside `wx-app/`, the official WeChat project directory names remain unchanged:

```text
wx-app/
  miniprogram/
  cloudfunctions/
```

This keeps the repository easier to understand, keeps each runtime independent, and avoids forcing shared lint, package, or TypeScript decisions across incompatible project types.

## Goals

- Make the repository reflect the real project boundaries.
- Keep the WeChat app and cloud functions grouped under one explicit WeChat project root.
- Rename the current web deployment service directory to a clearer standalone project name.
- Remove shared root engineering configuration that incorrectly treats the repository as one Node project.
- Let each project own its own `package.json`, `tsconfig`, and lint setup.
- Keep documentation and git ignore rules at the repository level.

## Non-Goals

- No business logic changes.
- No feature redesign.
- No refactor of runtime behavior for miniprogram, cloud functions, or web service beyond path and configuration updates required by the restructure.
- No attempt to unify lint rules across all projects.
- No new root-level package management layer.

## Design Principles

### Project boundaries are real boundaries

`miniprogram`, `cloudfunctions`, and `web-service` are independent projects with different runtime assumptions, release flows, and tooling needs. They should not share one root ESLint config, one root TypeScript base config, or one root package dependency graph simply for convenience.

### Official names should be preserved where the platform expects them

Inside the WeChat project, keep `miniprogram` and `cloudfunctions` as-is. This aligns with WeChat tooling, current project expectations, and existing documentation references.

### The repository root is for repository concerns only

The repository root should host:

- `.gitignore`
- `docs/`
- top-level repository guidance such as `README.md`

It should not act as the primary execution root for application linting, building, or type checking.

### Independent project configs are preferred over shared abstractions

Even if shared config reuse is technically possible, this restructure intentionally avoids coupling project configs together unless a platform requires it.

## Target Directory Structure

### Repository root

```text
/
  .gitignore
  README.md
  docs/
  wx-app/
  web-service/
```

### WeChat project root

```text
wx-app/
  project.config.json
  project.private.config.json
  route-config.json
  miniprogram/
  cloudfunctions/
```

This directory becomes the true root for opening and maintaining the WeChat-side project.

### Miniprogram project

```text
wx-app/miniprogram/
  app.json
  app.scss
  app.ts
  global.scss
  sitemap.json
  package.json
  tsconfig.json
  eslint.config.mjs
  stylelint.config.mjs
  components/
  custom-tab-bar/
  pages/
  styles/
  typings/
  utils/
```

### Cloud function project

The current first target remains the existing function service:

```text
wx-app/cloudfunctions/
  media-share-service/
    src/
    package.json
    tsconfig.json
    eslint.config.mjs
    index.js
    config.json
```

If more cloud functions are added later, each function continues to own its own package and build setup inside `wx-app/cloudfunctions/`.

### Web service project

```text
web-service/
  src/
  public/
  dist/
  package.json
  package-lock.json
  tsconfig.json
  eslint.config.mjs
  Dockerfile
  cloudbaserc.json
```

## Configuration Ownership

### Root-level shared engineering configs should be removed

The following files should no longer define shared project behavior for application code:

- `/package.json`
- `/package-lock.json`
- `/eslint.config.mjs`
- `/stylelint.config.mjs`
- `/tsconfig.base.json`

These files exist today because the repository was temporarily modernized as one shared engineering workspace. That model should be retired.

### Miniprogram owns its own config

`wx-app/miniprogram/` should own:

- `package.json`
- `tsconfig.json`
- `eslint.config.mjs`
- `stylelint.config.mjs`

This config should be purpose-built for WeChat miniprogram development, including:

- WeChat globals such as `wx`, `App`, `Page`, `Component`
- miniprogram TypeScript usage
- SCSS linting
- local script commands only for miniprogram needs

### Cloud function owns its own config

`wx-app/cloudfunctions/media-share-service/` should own:

- `package.json`
- `tsconfig.json`
- `eslint.config.mjs`

This config should reflect Node.js cloud function realities only, with no miniprogram or web-specific rule inheritance.

### Web service owns its own config

`web-service/` should own:

- `package.json`
- `tsconfig.json`
- `eslint.config.mjs`

This config may use `@antfu/eslint-config` or another service-oriented standard because it is a conventional TypeScript service project.

### Docs remain configuration-neutral

`docs/` does not belong to any application project. If documentation linting is needed later, it should be introduced as a separate, explicit documentation concern rather than attached to one of the runtime projects.

## Tooling Strategy

### No root execution layer

The repository root should not provide application lint, typecheck, or build commands.

After the restructure, developers should enter the relevant project directory and run local scripts there.

### Expected command model

Miniprogram:

```bash
cd wx-app/miniprogram
npm run lint
npm run lint:fix
npm run lint:styles
npm run typecheck
```

Cloud function:

```bash
cd wx-app/cloudfunctions/media-share-service
npm run lint
npm run lint:fix
npm run typecheck
npm run build
```

Web service:

```bash
cd web-service
npm run lint
npm run lint:fix
npm run typecheck
npm run build
npm run dev
```

### Why no root package scripts

Root forwarding scripts would reintroduce the same mental model this design is trying to remove. The goal is not just operational convenience. The goal is to make the project boundaries visible and explicit in daily development behavior.

## Lint Strategy

### Independence is more important than shared style

Lint configs should be independent across the three projects.

This means:

- `wx-app/miniprogram/eslint.config.mjs` is tailored to miniprogram semantics.
- `wx-app/cloudfunctions/media-share-service/eslint.config.mjs` is tailored to Node cloud function semantics.
- `web-service/eslint.config.mjs` is tailored to service-side TypeScript semantics.

### Miniprogram linting

The miniprogram config may still use modern ESLint flat config patterns and may even use a shared config package as a base if desired, but it must remain self-owned and miniprogram-specific. It must not depend on repository-root config composition.

### Cloud function linting

The cloud function config should remain conservative and Node-oriented, with rules selected for runtime safety and deployment stability.

### Web service linting

The web service may adopt `@antfu/eslint-config` because it is the closest to a standard modern TypeScript service project.

## TypeScript Strategy

### No root TypeScript inheritance

The repository should not rely on a shared `/tsconfig.base.json` for these three projects after the restructure.

Each project should own the TypeScript defaults it actually needs.

### Miniprogram

The miniprogram project keeps the official WeChat TypeScript compiler-plugin workflow and its own `tsconfig.json`.

### Cloud functions

Cloud functions keep function-local TypeScript compilation with their own `tsconfig.json`.

### Web service

The web service keeps its own service-local TypeScript setup and output contract.

## WeChat Project Boundary

`wx-app/` becomes the top-level directory a developer uses when interacting with WeChat-native tooling.

That means:

- `project.config.json` moves under `wx-app/`
- `project.private.config.json` moves under `wx-app/`
- `route-config.json` moves under `wx-app/`
- path references inside those files are updated to match the new directory structure

The success condition is that the WeChat project can still be opened directly from `wx-app/` without extra manual repair.

## Verification Assets

Existing verification scripts and path-sensitive tooling must be updated to match the new structure.

Any script that currently assumes root-level `miniprogram/`, `cloudfunctions/`, or `play-web-service/` paths must be adjusted to:

- `wx-app/miniprogram/...`
- `wx-app/cloudfunctions/...`
- `web-service/...`

Verification scripts may remain in the repository root temporarily if they are repository utilities, but they must point to the new locations. A later cleanup pass may choose to move project-specific verification scripts into their owning project directories.

## Migration Plan

### Phase 1: Directory move and rename

- Move `/miniprogram` to `/wx-app/miniprogram`
- Move `/cloudfunctions` to `/wx-app/cloudfunctions`
- Rename `/play-web-service` to `/web-service`
- Move WeChat root config files into `/wx-app`

### Phase 2: Path and config repair

- Update WeChat config path references
- Update project-local config references
- Update docs and verification scripts that reference old paths
- Update any deployment config paths impacted by the rename

### Phase 3: Project-local config completion

- Add project-local `package.json`, `eslint.config.mjs`, and `stylelint.config.mjs` to `wx-app/miniprogram`
- Add `eslint.config.mjs` to `wx-app/cloudfunctions/media-share-service`
- Finalize `web-service` local config strategy

### Phase 4: Root shared config removal

- Remove root package and shared engineering configs
- Ensure no project still depends on them
- Update root documentation to explain the new independent-project workflow

## Risks and Mitigations

### Risk: WeChat tooling path breakage

Mitigation:

- Move `project.config.json` into `wx-app/`
- Validate that WeChat DevTools can open `wx-app/` directly
- Update path-sensitive config references immediately after the move

### Risk: verification scripts silently point at stale paths

Mitigation:

- Explicitly audit repository scripts for old project paths
- Treat path updates as part of the same restructure task, not as a later cleanup

### Risk: root scripts are still assumed by contributors

Mitigation:

- Remove root engineering scripts instead of leaving stale partial tooling behind
- Replace them with clear repository documentation

### Risk: configuration drift during migration

Mitigation:

- Do not combine this restructure with feature work
- Migrate structure first, then validate each project independently

## Validation Criteria

The restructure is complete when all of the following are true:

- The repository root contains `docs/`, `.gitignore`, and repository-level guidance only.
- The WeChat-native project opens from `wx-app/`.
- `wx-app/miniprogram` can run its own lint, stylelint, and typecheck commands independently.
- `wx-app/cloudfunctions/media-share-service` can run its own lint, typecheck, and build commands independently.
- `web-service` can run its own lint, typecheck, and build commands independently.
- No application project depends on root-level shared ESLint, TypeScript, or package config.

## Open Decisions Resolved

- Use `wx-app/` as the parent directory for WeChat app concerns.
- Rename `play-web-service/` to `web-service/`.
- Keep official internal WeChat directory names: `miniprogram/` and `cloudfunctions/`.
- Keep `.gitignore` shared at the repository root.
- Do not keep root Node forwarding scripts.

## Recommendation

Proceed with the restructure as a repository architecture correction, not as an optional cleanup.

The current root-level shared configuration model helped bootstrap modernization quickly, but it is not the right long-term shape for this repository. The target structure should optimize for project truth, operational clarity, and independent maintenance rather than config reuse.
