# Project Independence Restructure Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the repository so `wx-app/` and `web-service/` become the real project roots while the repository root keeps only repository-level concerns.

**Architecture:** Execute the physical directory move first, then repair the WeChat root config and living documentation, and only then remove the shared root engineering layer after the project-local tooling plans have landed. Keep deployment resource names stable: the local folder becomes `web-service/`, but CloudBase resource names such as `play-web-service` stay unchanged unless a later dedicated infra plan says otherwise.

**Tech Stack:** Git moves, PowerShell, WeChat DevTools project config JSON, Markdown documentation.

---

## File Structure

- Create: `wx-app/`
- Move: `miniprogram/` -> `wx-app/miniprogram/`
- Move: `cloudfunctions/` -> `wx-app/cloudfunctions/`
- Move: `play-web-service/` -> `web-service/`
- Move: `project.config.json` -> `wx-app/project.config.json`
- Move: `project.private.config.json` -> `wx-app/project.private.config.json`
- Move: `route-config.json` -> `wx-app/route-config.json`
- Delete: `wx-app/miniprogram/project.config.json`
- Modify: `README.md`
- Modify: `docs/current-feature.md`
- Modify: `.gitignore`
- Delete later: `package.json`
- Delete later: `package-lock.json`
- Delete later: `eslint.config.mjs`
- Delete later: `stylelint.config.mjs`
- Delete later: `tsconfig.base.json`
- Delete later: `.eslintrc.js`
- Delete later: `tools/`

## Boundary Notes

- Run this plan before the miniprogram, cloudfunction, and web-service project-local tooling plans.
- `wx-app/project.config.json` becomes the single WeChat DevTools entrypoint. Do not keep `wx-app/miniprogram/project.config.json`.
- Historical specs and plans under `docs/superpowers/` are archival records. Update only living docs such as `README.md` and `docs/current-feature.md`.
- The final root should still keep `.gitignore`, `README.md`, `docs/`, `wx-app/`, and `web-service/`.

---

### Task 1: Move the physical project roots

**Files:**
- Create: `wx-app/`
- Move: `miniprogram/` -> `wx-app/miniprogram/`
- Move: `cloudfunctions/` -> `wx-app/cloudfunctions/`
- Move: `play-web-service/` -> `web-service/`
- Move: `project.config.json` -> `wx-app/project.config.json`
- Move: `project.private.config.json` -> `wx-app/project.private.config.json`
- Move: `route-config.json` -> `wx-app/route-config.json`
- Delete: `wx-app/miniprogram/project.config.json`

- [ ] **Step 1: Verify the target roots do not exist yet**

Run:

```powershell
@(
  'wx-app',
  'web-service',
  'wx-app\project.config.json'
) | ForEach-Object {
  "$_ -> $(Test-Path $_)"
}
```

Expected:

```text
wx-app -> False
web-service -> False
wx-app\project.config.json -> False
```

- [ ] **Step 2: Move the WeChat project, the web service, and the WeChat config files**

Run:

```powershell
New-Item -ItemType Directory -Path 'wx-app' | Out-Null
git mv miniprogram wx-app/miniprogram
git mv cloudfunctions wx-app/cloudfunctions
git mv play-web-service web-service
git mv project.config.json wx-app/project.config.json
git mv project.private.config.json wx-app/project.private.config.json
git mv route-config.json wx-app/route-config.json
git rm wx-app/miniprogram/project.config.json
```

- [ ] **Step 3: Normalize the new WeChat root config so it opens directly from `wx-app/`**

Run:

```powershell
$projectConfigPath = 'wx-app/project.config.json'
$projectConfig = Get-Content $projectConfigPath -Raw | ConvertFrom-Json
$projectConfig.miniprogramRoot = 'miniprogram/'
$projectConfig.cloudfunctionRoot = 'cloudfunctions'
$projectConfig.setting.sassSetting.sassCommonUseFilePath = 'global.sass'
$projectConfig.setting.sassSetting.scssCommonUseFilePath = 'global.scss'
$projectConfig | ConvertTo-Json -Depth 100 | Set-Content $projectConfigPath
```

- [ ] **Step 4: Verify the repository now exposes the new top-level project roots**

Run:

```powershell
@(
  'wx-app',
  'wx-app\miniprogram',
  'wx-app\cloudfunctions',
  'wx-app\project.config.json',
  'wx-app\project.private.config.json',
  'wx-app\route-config.json',
  'web-service'
) | ForEach-Object {
  "$_ -> $(Test-Path $_)"
}
```

Expected:

```text
wx-app -> True
wx-app\miniprogram -> True
wx-app\cloudfunctions -> True
wx-app\project.config.json -> True
wx-app\project.private.config.json -> True
wx-app\route-config.json -> True
web-service -> True
```

- [ ] **Step 5: Commit**

```bash
git add wx-app web-service
git commit -m "refactor: move projects into independent roots"
```

---

### Task 2: Update living repository navigation and ignore rules

**Files:**
- Modify: `README.md`
- Modify: `docs/current-feature.md`
- Modify: `.gitignore`

- [ ] **Step 1: Audit the living docs for old root paths**

Run:

```bash
rg -n "miniprogram/|cloudfunctions/media-share-service|play-web-service" README.md docs/current-feature.md
```

Expected:

```text
README.md:... miniprogram/
README.md:... cloudfunctions/media-share-service
README.md:... play-web-service
docs/current-feature.md:... cloudfunctions/media-share-service
docs/current-feature.md:... play-web-service
```

- [ ] **Step 2: Replace the repository structure and entrypoint section in `README.md`**

Write this section into `README.md`:

````md
## Project Structure

```text
nfc-scan/
|-- wx-app/
|   |-- project.config.json
|   |-- project.private.config.json
|   |-- route-config.json
|   |-- miniprogram/
|   `-- cloudfunctions/
|-- web-service/
|-- docs/
`-- README.md
```

## Working Directories

- WeChat DevTools root: `wx-app`
- Mini program source: `wx-app/miniprogram`
- Cloud function source: `wx-app/cloudfunctions/media-share-service`
- CloudBase web service source: `web-service`

## Repository Rules

- The repository root does not provide `npm run lint`, `npm run typecheck`, or `npm run build`.
- Enter the target project directory before installing dependencies or running verification.
- `play-web-service` remains the CloudBase resource name until a dedicated infra migration changes it.
````

- [ ] **Step 3: Update the top-level service paths in `docs/current-feature.md` and the root ignore rules**

Write these exact replacements:

```md
- `wx-app/cloudfunctions/media-share-service`
  Responsible for media upload preparation, file registration, share generation, file listing, and deletion.
- `web-service`
  Serves the themed playback pages and the playback detail API.
```

```gitignore
# Local dependencies
/wx-app/miniprogram/node_modules/
/wx-app/cloudfunctions/**/node_modules/
/web-service/node_modules/
```

Remove this obsolete ignore entry from `.gitignore`:

```gitignore
/play-web-service/node_modules/
```

- [ ] **Step 4: Verify the living docs reference only the new local paths**

Run:

```bash
rg -n "cloudfunctions/media-share-service|play-web-service" README.md docs/current-feature.md
```

Expected:

```text
README.md:... play-web-service remains the CloudBase resource name ...
```

Run:

```bash
rg -n "/play-web-service/node_modules/|/wx-app/miniprogram/node_modules/|/web-service/node_modules/" .gitignore
```

Expected:

```text
.gitignore:... /wx-app/miniprogram/node_modules/
.gitignore:... /web-service/node_modules/
```

- [ ] **Step 5: Commit**

```bash
git add README.md docs/current-feature.md .gitignore
git commit -m "docs: update repository navigation for independent projects"
```

---

### Task 3: Remove the shared root engineering layer after project-local tooling exists

**Files:**
- Delete: `package.json`
- Delete: `package-lock.json`
- Delete: `eslint.config.mjs`
- Delete: `stylelint.config.mjs`
- Delete: `tsconfig.base.json`
- Delete: `.eslintrc.js`
- Delete: `tools/`

- [ ] **Step 1: Confirm the three project-local tooling plans have landed**

Run:

```powershell
@(
  'wx-app\miniprogram\package.json',
  'wx-app\miniprogram\eslint.config.mjs',
  'wx-app\cloudfunctions\media-share-service\package.json',
  'wx-app\cloudfunctions\media-share-service\eslint.config.mjs',
  'web-service\package.json',
  'web-service\eslint.config.mjs'
) | ForEach-Object {
  "$_ -> $(Test-Path $_)"
}
```

Expected:

```text
wx-app\miniprogram\package.json -> True
wx-app\miniprogram\eslint.config.mjs -> True
wx-app\cloudfunctions\media-share-service\package.json -> True
wx-app\cloudfunctions\media-share-service\eslint.config.mjs -> True
web-service\package.json -> True
web-service\eslint.config.mjs -> True
```

- [ ] **Step 2: Run the independent project verification commands**

Run:

```powershell
npm run verify --prefix wx-app/miniprogram
npm run verify --prefix wx-app/cloudfunctions/media-share-service
npm run verify --prefix web-service
```

Expected:

```text
... all three verify commands exit successfully ...
```

- [ ] **Step 3: Remove the root engineering files and the old shared `tools/` directory**

Run:

```powershell
git rm package.json package-lock.json eslint.config.mjs stylelint.config.mjs tsconfig.base.json .eslintrc.js
git rm -r tools
if (Test-Path 'node_modules') {
  Remove-Item -Recurse -Force 'node_modules'
}
```

- [ ] **Step 4: Verify the root no longer behaves like a Node project**

Run:

```powershell
@(
  'package.json',
  'eslint.config.mjs',
  'stylelint.config.mjs',
  'tsconfig.base.json',
  'tools'
) | ForEach-Object {
  "$_ -> $(Test-Path $_)"
}
```

Expected:

```text
package.json -> False
eslint.config.mjs -> False
stylelint.config.mjs -> False
tsconfig.base.json -> False
tools -> False
```

- [ ] **Step 5: Commit**

```bash
git add -u
git commit -m "build: remove root shared tooling layer"
```

---

## Self-Review Notes

### Spec Coverage

- Physical move into `wx-app/` and `web-service/`: Task 1.
- Living documentation and root ignore updates: Task 2.
- Removal of the root engineering layer: Task 3.

### Placeholder Scan

- No `TODO`, `TBD`, or deferred references remain.
- Every move, delete, and verification step includes exact commands.

### Naming Consistency

- The CloudBase deployment resource stays `play-web-service` only where explicitly documented.
- The filesystem project names are consistently `wx-app` and `web-service`.
