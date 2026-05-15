# Miniprogram Motion System Design

**Date:** 2026-05-15

**Status:** Approved for planning

## Goal

Refine the motion system of the WeChat mini program so that:

1. Similar interactions use similar animation language across the mini program.
2. Scan-style animation is reserved for interactions that represent discovery, target lock, NFC write, and write completion.
3. Page transitions, modal transitions, button feedback, and form interactions remain light, fast, and predictable.
4. Motion improves task completion, perceived smoothness, and confidence without becoming decorative noise.

## Scope

### In Scope

- `miniprogram` only.
- Existing write flows:
  - `pages/write-menu`
  - `pages/write-app`
  - `pages/write-music`
  - `pages/write-web`
  - `pages/write-wifi`
  - `pages/write-local-media`
  - `pages/my-files`
- Shared motion primitives in:
  - `styles/variables.scss`
  - `styles/animations.scss`
  - `components/scan-dialog`
- Motion behavior for:
  - page entry
  - modal / sheet transitions
  - button press states
  - field focus states
  - scan / search / write / success / error states

### Out of Scope

- `play-web-service`
- adding new product features or new NFC flows
- redesigning copy, layout hierarchy, or information architecture outside the needs of the motion system
- large-scale visual re-skin unrelated to motion

## Confirmed Decisions

- The user selected the `balanced` direction.
- Scan-style animation should be visible on the main scan chain, but should not spread across every control on every page.
- The mini program should keep its existing lightweight `motion-*` primitives and extend them rather than replacing them.
- The strongest scan-style language should appear in `write-wifi` and `scan-dialog`.
- `write-app`, `write-web`, and `write-music` should feel structurally identical where their flows are already identical.

## Motion Principles

This design follows four principles derived from official interface motion guidance:

1. Motion must carry information.
   Use animation to explain state change, guide attention, or confirm a result. Do not animate simply to decorate.
2. High-frequency interactions should stay productive.
   Buttons, form fields, sheets, and list transitions should feel fast and repeatable, not theatrical.
3. Scan-style animation is a semantic state language.
   It should communicate `discovering`, `locking`, `processing`, or `completing`, rather than appearing as a generic visual texture.
4. Motion must remain readable and reducible.
   Errors should not loop forever, content should stay legible, and strong motion should have a low-motion fallback path.

## Research Notes

### Apple Human Interface Guidelines

- Motion should support understanding, continuity, and feedback.
- Repeated interactions should not distract the user.

Reference:
- <https://developer.apple.com/design/human-interface-guidelines/motion>

### Carbon Design System

- Productive motion is appropriate for frequent UI actions.
- Expressive motion should be used selectively to emphasize key moments.

Reference:
- <https://carbondesignsystem.com/elements/motion/overview/>

### Material Motion

- Motion should be quick, clear, and cohesive.
- Similar transitions should use similar timing and easing.

Reference:
- <https://m1.material.io/motion/material-motion.html>

### Reduced Motion Guidance

- Non-essential movement should be removable or replaceable with low-motion feedback.

Reference:
- <https://web.dev/articles/prefers-reduced-motion>

## Motion Architecture

The mini program motion system should be split into two layers.

### 1. Base Motion Layer

Purpose:
- handle navigation and high-frequency interaction feedback
- keep the UI responsive and predictable

Reuses and normalizes the existing primitives:
- `motion-enter`
- `motion-fade`
- `motion-pop`
- `motion-sheet`
- `motion-pressable`

Applicable interactions:
- page entry
- dialog and bottom sheet entry
- button press feedback
- generic list item feedback
- generic field focus / active styling

Rules:
- short duration
- low amplitude
- no scan texture
- no long-running loops

### 2. Scan Semantic Layer

Purpose:
- indicate that the system is searching, locking onto a target, writing to NFC, or completing a write

This layer should be introduced as shared semantic motion classes rather than page-local one-off animations.

Recommended shared semantics:
- `motion-scan-sweep`
  one-time sweep for search kickoff or transition into scan mode
- `motion-scan-loop`
  repeating scan guidance for the wait-for-tag state
- `motion-scan-lock`
  one-time target lock confirmation for item selection
- `motion-scan-processing`
  stable processing feedback for writing or controlled loading
- `motion-scan-complete`
  one-time completion feedback for success
- `motion-scan-alert`
  one-time alert feedback for error or unsupported states

Rules:
- only use scan-style motion when the interaction maps to a discovery or device-execution concept
- prefer one-time feedback over infinite loops
- reserve infinite looping almost entirely for the wait-for-tag state

## Interaction Mapping

### Interactions That Should Not Use Scan Animation

- page entry
- ordinary button press
- standard dialog entry
- bottom sheet entry
- input focus and blur
- generic list scrolling
- file management actions on `my-files`
- upload progress in `write-local-media` before the NFC write phase

Expected motion:
- fade / lift
- sheet rise
- press feedback
- border / shadow emphasis

### Interactions That Should Use Light Scan Animation

- refreshing nearby WLAN
- revealing WLAN discovery results
- confirming a WLAN item selection
- transitioning from a ready form into the NFC write phase

Expected motion:
- one-time sweep
- one-time lock confirmation
- stable processing state where needed

### Interactions That Should Use Strong Scan Animation

- waiting for the user to place an NFC tag near the device
- active NFC writing
- immediate write completion confirmation

Expected motion:
- guided scan loop in waiting
- centered processing motion in writing
- one-time completion pulse in success

### Interactions That Should Use One-Time Alert Motion

- NFC write failure
- unsupported NFC tag type
- permission-blocked scan state
- device capability failure dialogs

Expected motion:
- one-time alert emphasis only
- no continuous loop once the error message is visible

## Page-by-Page Design

### `pages/write-menu`

Role:
- entry selection, not scanning

Motion behavior:
- keep existing staggered page entry
- keep press feedback on cards
- do not add persistent scan texture to cards
- do not add scan-semantic accent motion to menu cards in the first implementation

### `pages/write-app`
### `pages/write-web`
### `pages/write-music`

Role:
- form completion followed by a direct handoff to the shared NFC write flow

Motion behavior:
- unify page entry timing and form rhythm across all three pages
- use the same button enable / disable behavior and press feedback
- avoid page-specific scan animation before `scan-dialog`
- let the semantic switch into scan mode happen only when the shared scan dialog opens

Result:
- users learn one interaction pattern and transfer it across three write flows

### `pages/write-wifi`

Role:
- discovery and selection of a nearby target before writing

This page should receive the strongest non-dialog scan semantics.

Motion behavior:
- the picker opening remains a standard sheet transition
- the refresh action enters a scan-processing state rather than a generic isolated spinner
- the picker title area uses a one-time sweep when a nearby WLAN refresh begins
- a selected WLAN item uses `motion-scan-lock` once, then remains statically highlighted
- the password field remains a normal form control with focus emphasis only
- confirming the selected network should lead cleanly into `scan-dialog` without extra decorative transitions

Reasoning:
- the page concept is `find target -> lock target -> write target`, which maps naturally to scan semantics

### `pages/write-local-media`

Role:
- upload / processing flow followed by the shared NFC write flow

Motion behavior:
- keep upload and share-generation states in the base productive layer
- do not treat upload progress as a scan state
- once the media is ready and the user enters NFC writing, switch into the shared scan semantics through `scan-dialog`

Reasoning:
- this flow contains two different tasks and the user should be able to distinguish them:
  - cloud processing
  - NFC writing

### `pages/my-files`

Role:
- management, reuse, deletion

Motion behavior:
- remain in the base motion layer
- keep list and dialog behavior lightweight
- only re-enter scan semantics when the user leaves the management context and starts a write flow again

## `scan-dialog` State Design

`scan-dialog` is the center of this motion redesign.

The component already exposes four core states:
- `waiting`
- `writing`
- `success`
- `error`

The redesign should make those states visually and kinetically distinct using one consistent semantic ladder.

### `waiting`

Intent:
- guide the user to place the NFC tag near the phone

Motion behavior:
- use the strongest loop in the system
- emphasize the relationship between phone and tag with a repeated directional scan band between the two elements and a subtle phone-side sensing halo

Rules:
- this is the main place where looping scan motion is acceptable
- keep the text readable

### `writing`

Intent:
- communicate active execution and ask the user not to move the tag

Motion behavior:
- transition from exploratory motion into stable centered processing
- reduce lateral travel
- focus motion toward the center

Rules:
- no bounce or playful spring behavior
- should feel precise and controlled

### `success`

Intent:
- confirm completion and close the scan narrative

Motion behavior:
- one-time completion feedback
- apply the completion feedback to the success icon and let the title bar settle through color only, without a separate second motion
- immediately settle into a static readable state

Rules:
- no continuing loop
- no repeated flashing

### `error`

Intent:
- communicate failure clearly and let the user decide the next action

Motion behavior:
- one-time alert feedback
- then full stillness for readability

Rules:
- no ongoing warning loop
- prioritize the message and retry / confirm controls

## Shared Tokens

To avoid page-specific hard-coded values, the scan semantic layer should add shared timing tokens in `styles/variables.scss`.

Recommended timing groups:

- `scan-loop`
  `1400ms - 1800ms`
- `scan-sweep`
  `320ms - 520ms`
- `scan-process`
  `700ms - 900ms`
- `scan-complete`
  `220ms - 320ms`
- `scan-alert`
  `160ms - 240ms`

Recommended easing approach:

- keep current easing for base productive motion
- avoid spring / bounce easing for scanning and writing semantics
- use smoother controlled curves for scan states so they read as device behavior rather than playful ornament

## Component and File Responsibilities

- `miniprogram/styles/variables.scss`
  define motion tokens for scan semantic timings and any shared opacity / intensity values
- `miniprogram/styles/animations.scss`
  define reusable scan semantic keyframes and classes
- `miniprogram/components/scan-dialog/scan-dialog.scss`
  consume shared scan semantics for the four dialog states
- `miniprogram/components/scan-dialog/scan-dialog.wxml`
  expose the visual structure needed for distinct state-specific motion
- `miniprogram/pages/write-wifi/write-wifi.scss`
  apply scan semantic classes to refresh, discovery, and selection moments
- other write pages
  normalize base timing and keep flows consistent without adding page-specific scan loops

## Guardrails

The implementation must follow these guardrails:

- do not loop error animations
- do not add permanent scan or glow effects to ordinary buttons
- do not stack three different concurrent motion systems inside one small component
- do not reduce readability of labels, hints, or error copy
- do not use scan semantics as generic page decoration

## Low-Motion Fallback Requirement

The design should keep a low-motion fallback path in mind even if the first implementation is still manual.

Fallback strategy:
- replace repeated scan movement with opacity or color emphasis where possible
- keep completion and alert states as one-time feedback only
- prefer a single state transition over layered movement when motion intensity needs to be reduced

## Verification Strategy

### Consistency Checks

Verify that:

1. `write-app`, `write-web`, and `write-music` feel structurally identical.
2. `write-wifi` clearly communicates `discover -> select -> write`.
3. `scan-dialog` states are immediately distinguishable without reading all copy.
4. success and error states settle quickly and remain readable.

### UX Checks

Verify that:

1. users understand when they are still editing versus when they have entered the scan chain
2. animation helps attention and does not slow repeated use
3. important actions remain responsive on tap

### Performance Checks

Verify that:

1. loops are limited to the few states that truly need them
2. no screen shows unnecessary simultaneous animation on multiple independent elements
3. lower-end Android devices do not show obvious dropped frames during the write flow

## Risks and Mitigations

- **Risk:** scan semantics spread too broadly and make the UI noisy.
  **Mitigation:** keep scan semantics tied to discovery, lock, write, and completion only.

- **Risk:** `scan-dialog` states remain visually inconsistent because of page-local overrides.
  **Mitigation:** define semantic classes in shared styles first and consume them from the component.

- **Risk:** `write-wifi` becomes over-animated because it is the most scan-relevant page.
  **Mitigation:** limit scan emphasis to refresh, selection, and transition into writing; keep the password field and picker shell in the base layer.

- **Risk:** success or error motion competes with copy readability.
  **Mitigation:** use one-time state confirmation and settle quickly into stillness.

## Acceptance Criteria

The motion redesign is ready for implementation planning when the following are true:

1. The team has a documented split between base motion and scan semantic motion.
2. Each main interaction type has a single assigned animation language.
3. `scan-dialog` has a clear four-state motion model.
4. `write-wifi` has a defined scan-oriented interaction path without turning the entire page into a scan surface.
5. Non-scan pages keep lightweight productive motion.
