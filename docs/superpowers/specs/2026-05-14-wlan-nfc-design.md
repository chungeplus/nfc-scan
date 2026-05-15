# WLAN NFC Write Design

**Date:** 2026-05-14

**Status:** Implemented on `master`

**Prototype:** `2026-05-15-wlan-nfc-prototype.md`

## Goal

Add a new WLAN write flow to the mini program so an Android user can:

1. Open a dedicated `WLAN` write page.
2. See the currently connected Wi-Fi first.
3. Optionally scan nearby Wi-Fi networks and switch the selected SSID.
4. Enter the password once.
5. Write a standards-based Wi-Fi NDEF record to an NFC tag.
6. Let another Android phone tap the tag and open the system Wi-Fi connection flow.

## Product Scope

### In Scope

- Android-targeted Wi-Fi NFC writing.
- One new `WLAN` entry on the write menu.
- One dedicated `write-wifi` page.
- Support for current connected SSID prefill.
- Support for nearby Wi-Fi scan on demand.
- Password entered by the user for the current write only.
- NFC write via the existing `scan-dialog` component.
- Standard MIME NDEF record using `application/vnd.wfa.wsc`.

### Out of Scope

- iPhone NFC connection flow.
- Hidden Wi-Fi, enterprise Wi-Fi, WEP, or open network handling.
- Password persistence, cloud sync, or local cache reuse.
- Editing previously written Wi-Fi records from `my-files`.
- Reading Wi-Fi credentials back from tags.

## Confirmed Assumptions

- The feature is intended for Android phones only.
- The first version should feel lightweight: user selects an SSID and only enters the password.
- The mini program should prefer the currently connected SSID and only ask for location permission when the user explicitly scans nearby Wi-Fi.
- The project should keep using the existing NFC write flow rather than introducing a separate NFC writer implementation.

## Research Summary

### WeChat Mini Program patterns seen on GitHub

- The official mini program demo uses `wx.startWifi()`, `wx.getWifiList()`, and `wx.onGetWifiList()` to scan nearby Wi-Fi and sort the list by signal strength.
- Existing Wi-Fi mini programs commonly use `wx.getConnectedWifi()` to prefill the current SSID and `scope.userLocation` authorization only for nearby scans.
- Existing Wi-Fi connection mini programs treat location permission, Wi-Fi enabled state, and GPS enabled state as separate failure cases on Android.

### NFC / Android behavior

- Android's Wi-Fi NFC parser accepts MIME records with type `application/vnd.wfa.wsc`.
- The Android parser looks for a top-level WSC `Credential` field and reads nested `SSID`, `Network Key`, and `Authentication Type` fields from that payload.
- For the current scope, the minimum viable record is a MIME media NDEF record whose payload is a WSC credential buffer.

## Functional Design

### Entry Point

- Add a new `WLAN 专区` card to the existing write menu.
- Keep the card style aligned with the current four entry cards.
- Reuse the same NFC support gating already present on the menu page.

### Prototype sync

- The write menu now shows five cards in total: `应用专区 / 音乐专区 / 网页专区 / WLAN 专区 / 本地音视频`.
- The `WLAN 专区` card is placed after the music/web row and before the local media card so the new capability is visible on the home screen.
- The dedicated prototype sync note lives in `2026-05-15-wlan-nfc-prototype.md`.

### Write Page

The new `write-wifi` page should contain:

- A current Wi-Fi section at the top.
- A nearby Wi-Fi section that is loaded only after the user taps a scan action.
- A password input.
- A compact scope note explaining that only WPA/WPA2 personal networks are supported.
- A primary action button that opens the existing `scan-dialog`.

### Current Wi-Fi behavior

- On page load, call `wx.startWifi()` and then try `wx.getConnectedWifi()`.
- If a current SSID is available, show it as the default selected network.
- If the call fails or no SSID is returned, keep the page usable and prompt the user to scan nearby Wi-Fi instead.

### Nearby Wi-Fi behavior

- Nearby scan is opt-in and only triggered by a button tap.
- Before scanning on Android, request `scope.userLocation` if it is not already granted.
- If the user has previously denied location permission, guide them to `wx.openSetting()`.
- After permission is available, call `wx.getWifiList()` and receive results from `wx.onGetWifiList()`.
- Deduplicate by SSID and keep the strongest signal entry.
- Sort the final list by signal strength descending.

### Password behavior

- The password lives only in page state.
- The password is cleared when the page is unloaded or the write dialog is closed.
- The write button stays disabled until both a selected SSID and a non-empty password are present.

## Technical Design

### File Responsibilities

- `miniprogram/pages/write-wifi/`
  New page for WLAN selection, password input, and NFC write handoff.
- `miniprogram/utils/wifi-manager.js`
  WeChat Wi-Fi API wrapper and pure list/error normalization helpers.
- `miniprogram/utils/wifi-ndef.js`
  Builds the Wi-Fi WSC binary payload for the NDEF MIME record.
- `miniprogram/components/scan-dialog/scan-dialog.js`
  Small enhancement so records can provide a prebuilt binary payload.
- `miniprogram/pages/write-menu/*`
  Adds the new menu card and navigation handler.
- `miniprogram/app.json`
  Registers the new page route and declares `scope.userLocation` copy for nearby Wi-Fi scanning.

### NDEF Record Shape

The Wi-Fi tag should be written as one record:

```js
{
  tnf: 2,
  id: 'wifi',
  type: 'application/vnd.wfa.wsc',
  payload: buildWifiConfigPayload({
    ssid: selectedSsid,
    password: wifiPassword
  })
}
```

### WSC Payload Strategy

The payload builder should generate:

- One top-level `Credential` TLV (`0x100E`).
- Nested `SSID` TLV (`0x1045`).
- Nested `Network Key` TLV (`0x1027`).
- Nested `Authentication Type` TLV (`0x1003`).

The first version should encode the authentication type as `WPA2-PSK` because:

- The current user flow does not expose an auth-type selector.
- The WeChat Wi-Fi APIs used for selection do not provide reliable WPA-vs-WPA2 discrimination for this project.
- Modern home and office routers are overwhelmingly WPA2-Personal compatible.

This means the first version is intentionally **WPA2-Personal focused**, even though the original product shorthand was "WPA/WPA2-Personal".

## Error Handling

### Wi-Fi module / platform

- If `wx.startWifi()` returns unsupported, show a non-blocking unsupported state on the page.
- If `wx.getConnectedWifi()` fails, show an inline hint and keep the nearby scan action available.

### Nearby scan

- `12005`: prompt the user to turn on Wi-Fi.
- `12006`: prompt the user to turn on GPS / location services.
- `12007`: prompt the user to allow location permission.
- `12011`: explain that scanning cannot proceed while the mini program is backgrounded.
- Unknown errors: use a generic retry message and leave the page interactive.

### NFC write

- Reuse the existing `scan-dialog` states for waiting, writing, success, and failure.
- The Wi-Fi page should reset the prepared record and password after a successful write if the user leaves the page.

## UX Notes

- Do not request location permission on first paint.
- Keep the "current Wi-Fi" card visually separate from the scanned list.
- Show a warning note such as `仅支持 WPA2-Personal 网络，请勿用于开放 / WEP / 企业网络`.
- Nearby Wi-Fi should be treated as a convenience selector, not as a trusted source of auth-type metadata.

## Verification Strategy

### Code-level verification

- Add a lightweight local verification script for `wifi-ndef.js` that inspects the generated TLV buffer.
- Add a lightweight local verification script for `wifi-manager.js` pure helpers such as list dedupe/sort and error copy mapping.

### Device QA

Use an Android phone with NFC enabled and WeChat installed:

1. Open the WLAN write page while connected to a Wi-Fi network.
2. Confirm the current SSID appears without scanning.
3. Trigger nearby scan and verify the list appears after location permission is granted.
4. Select one SSID, enter a password, and write to a blank NDEF-capable tag.
5. Tap the tag with another Android phone and confirm the system Wi-Fi connection UI appears for the written SSID.

## Risks and Mitigations

- **Risk:** WeChat scanning APIs do not tell us the exact personal auth subtype.
  **Mitigation:** Treat v1 as WPA2-Personal focused and say so in the UI.

- **Risk:** Nearby scan depends on both permission and device location services.
  **Mitigation:** Map the known Android error codes to specific user guidance.

- **Risk:** Binary NDEF payload writing could break existing URI writes if the shared dialog is changed carelessly.
  **Mitigation:** Keep the `scan-dialog` change narrow: support `ArrayBuffer` payloads while preserving current URI/string behavior.

## Source Notes

- WeChat official Wi-Fi APIs:
  - `wx.startWifi`
  - `wx.getConnectedWifi`
  - `wx.getWifiList`
- GitHub reference repos inspected during design:
  - `wechat-miniprogram/miniprogram-demo`
  - `330132662/ConnectWifiMiniprogram`
  - `Steven8427/wechat-free-wifi-miniprogram`
  - `mangk/NFCTools-MiniProgram`
