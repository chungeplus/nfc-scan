# WLAN NFC Write Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Android-focused WLAN write flow that selects a Wi-Fi SSID, accepts a password, and writes a standard Wi-Fi NDEF record to an NFC tag.

**Architecture:** Create a dedicated `write-wifi` page, isolate WeChat Wi-Fi API behavior in a helper module, isolate Wi-Fi WSC payload encoding in a pure utility, and make the shared `scan-dialog` accept raw binary payloads so existing URI-based NFC writing keeps working unchanged.

**Tech Stack:** WeChat Mini Program pages/components, plain JavaScript utilities, existing `scan-dialog` NFC writer, Node.js for lightweight local verification scripts.

---

## File Structure

- Create: `docs/superpowers/specs/2026-05-14-wlan-nfc-design.md`
- Create: `docs/superpowers/plans/2026-05-14-wlan-nfc-implementation.md`
- Create: `miniprogram/utils/wifi-ndef.js`
- Create: `miniprogram/utils/wifi-manager.js`
- Create: `miniprogram/pages/write-wifi/write-wifi.js`
- Create: `miniprogram/pages/write-wifi/write-wifi.wxml`
- Create: `miniprogram/pages/write-wifi/write-wifi.scss`
- Create: `miniprogram/pages/write-wifi/write-wifi.json`
- Create: `tools/verify-wifi-ndef.mjs`
- Create: `tools/verify-wifi-manager.mjs`
- Modify: `miniprogram/components/scan-dialog/scan-dialog.js`
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/pages/write-menu/write-menu.js`
- Modify: `miniprogram/pages/write-menu/write-menu.wxml`
- Modify: `miniprogram/pages/write-menu/write-menu.scss`
- Modify: `README.md`

### Boundary Notes

- `wifi-ndef.js` must stay self-contained so it can be loaded by a simple Node verification script.
- `wifi-manager.js` should keep UI out of the helper. It returns data and normalized error text; the page decides how to render messages.
- `scan-dialog.js` should not gain Wi-Fi-specific branching beyond accepting a binary payload that is already encoded.

### Assumption Locked For V1

- The encoder writes `WPA2-PSK` auth type records only.
- The page copy must explicitly say the feature is intended for WPA2-Personal networks and not for open/WEP/enterprise networks.

---

### Task 1: Add the Wi-Fi NDEF payload encoder

**Files:**
- Create: `miniprogram/utils/wifi-ndef.js`
- Test: `tools/verify-wifi-ndef.mjs`

- [ ] **Step 1: Write the failing verification script**

```js
// tools/verify-wifi-ndef.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(
  new URL('../miniprogram/utils/wifi-ndef.js', import.meta.url),
  'utf8'
);
const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
const { WIFI_WSC_MIME_TYPE, buildWifiConfigPayload } = await import(moduleUrl);

function readTlv(view, offset) {
  const fieldId = (view[offset] << 8) | view[offset + 1];
  const length = (view[offset + 2] << 8) | view[offset + 3];
  const valueStart = offset + 4;
  const valueEnd = valueStart + length;
  return {
    fieldId,
    length,
    value: view.slice(valueStart, valueEnd),
    nextOffset: valueEnd
  };
}

function decodeUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

assert.equal(WIFI_WSC_MIME_TYPE, 'application/vnd.wfa.wsc');

const payload = new Uint8Array(
  buildWifiConfigPayload({
    ssid: '办公WiFi',
    password: 'Pixel12345678'
  })
);

const credential = readTlv(payload, 0);
assert.equal(credential.fieldId, 0x100e);

let innerOffset = 0;
const seen = new Map();
while (innerOffset < credential.value.length) {
  const field = readTlv(credential.value, innerOffset);
  seen.set(field.fieldId, field);
  innerOffset = field.nextOffset;
}

assert.equal(decodeUtf8(seen.get(0x1045).value), '办公WiFi');
assert.equal(decodeUtf8(seen.get(0x1027).value), 'Pixel12345678');
assert.equal((seen.get(0x1003).value[0] << 8) | seen.get(0x1003).value[1], 0x0020);

console.log('PASS verify-wifi-ndef');
```

- [ ] **Step 2: Run the verifier and confirm it fails before implementation**

Run:

```bash
node tools/verify-wifi-ndef.mjs
```

Expected:

```text
FAIL with ENOENT for miniprogram/utils/wifi-ndef.js
```

- [ ] **Step 3: Implement the encoder utility**

```js
// miniprogram/utils/wifi-ndef.js
const WIFI_WSC_MIME_TYPE = 'application/vnd.wfa.wsc';

const WSC_FIELD_ID = {
  AUTH_TYPE: 0x1003,
  CREDENTIAL: 0x100e,
  NETWORK_KEY: 0x1027,
  SSID: 0x1045,
};

const AUTH_TYPE_WPA2_PSK = 0x0020;

function assertNonEmptyString(value, fieldName) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function encodeUtf8(value) {
  const normalized = String(value);
  const bytes = [];

  for (const char of normalized) {
    const codePoint = char.codePointAt(0);

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
      continue;
    }

    if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6));
      bytes.push(0x80 | (codePoint & 0x3f));
      continue;
    }

    if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
      continue;
    }

    bytes.push(0xf0 | (codePoint >> 18));
    bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
    bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
    bytes.push(0x80 | (codePoint & 0x3f));
  }

  return new Uint8Array(bytes);
}

function encodeUint16(value) {
  return new Uint8Array([(value >> 8) & 0xff, value & 0xff]);
}

function concatBytes(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });

  return result;
}

function createTlv(fieldId, valueBytes) {
  return concatBytes([
    encodeUint16(fieldId),
    encodeUint16(valueBytes.length),
    valueBytes,
  ]);
}

function buildWifiConfigPayload({ ssid, password }) {
  const normalizedSsid = assertNonEmptyString(ssid, 'ssid');
  const normalizedPassword = assertNonEmptyString(password, 'password');

  const credentialValue = concatBytes([
    createTlv(WSC_FIELD_ID.SSID, encodeUtf8(normalizedSsid)),
    createTlv(WSC_FIELD_ID.NETWORK_KEY, encodeUtf8(normalizedPassword)),
    createTlv(WSC_FIELD_ID.AUTH_TYPE, encodeUint16(AUTH_TYPE_WPA2_PSK)),
  ]);

  return createTlv(WSC_FIELD_ID.CREDENTIAL, credentialValue).buffer;
}

export {
  AUTH_TYPE_WPA2_PSK,
  WIFI_WSC_MIME_TYPE,
  buildWifiConfigPayload,
};
```

- [ ] **Step 4: Run the verifier and confirm it passes**

Run:

```bash
node tools/verify-wifi-ndef.mjs
```

Expected:

```text
PASS verify-wifi-ndef
```

- [ ] **Step 5: Commit**

```bash
git add tools/verify-wifi-ndef.mjs miniprogram/utils/wifi-ndef.js
git commit -m "feat: add wifi ndef payload encoder"
```

---

### Task 2: Add a Wi-Fi helper for current SSID, nearby scan, and error normalization

**Files:**
- Create: `miniprogram/utils/wifi-manager.js`
- Test: `tools/verify-wifi-manager.mjs`

- [ ] **Step 1: Write the failing verification script**

```js
// tools/verify-wifi-manager.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile(
  new URL('../miniprogram/utils/wifi-manager.js', import.meta.url),
  'utf8'
);
const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
const { normalizeWifiList, describeWifiError } = await import(moduleUrl);

const normalized = normalizeWifiList([
  { SSID: 'Cafe', signalStrength: 32 },
  { SSID: 'Office', signalStrength: 88 },
  { SSID: 'Cafe', signalStrength: 72 },
  { SSID: '', signalStrength: 99 }
]);

assert.deepEqual(
  normalized.map((item) => [item.SSID, item.signalStrength]),
  [
    ['Office', 88],
    ['Cafe', 72]
  ]
);

assert.match(describeWifiError({ errCode: 12006 }), /GPS|定位/);
assert.match(describeWifiError({ errCode: 12007 }), /授权|位置/);

console.log('PASS verify-wifi-manager');
```

- [ ] **Step 2: Run the verifier and confirm it fails before implementation**

Run:

```bash
node tools/verify-wifi-manager.mjs
```

Expected:

```text
FAIL with ENOENT for miniprogram/utils/wifi-manager.js
```

- [ ] **Step 3: Implement the helper module**

```js
// miniprogram/utils/wifi-manager.js
function normalizeWifiList(wifiList = []) {
  const strongestBySsid = new Map();

  wifiList.forEach((wifi) => {
    const ssid = wifi && typeof wifi.SSID === 'string' ? wifi.SSID.trim() : '';
    if (!ssid) {
      return;
    }

    const current = strongestBySsid.get(ssid);
    if (!current || Number(wifi.signalStrength || 0) > Number(current.signalStrength || 0)) {
      strongestBySsid.set(ssid, {
        SSID: ssid,
        signalStrength: Number(wifi.signalStrength || 0),
      });
    }
  });

  return Array.from(strongestBySsid.values()).sort(
    (left, right) => right.signalStrength - left.signalStrength
  );
}

function describeWifiError(error = {}) {
  switch (error.errCode) {
    case 12005:
      return '请先打开手机 Wi-Fi 开关后再重试。';
    case 12006:
      return '请先打开手机定位/GPS 开关后再扫描附近 WLAN。';
    case 12007:
      return '扫描附近 WLAN 需要位置权限，请在微信设置中允许。';
    case 12011:
      return '请回到前台后重试，后台状态下无法读取 WLAN 列表。';
    default:
      return '获取 WLAN 信息失败，请稍后重试。';
  }
}

function initWifiModule() {
  return new Promise((resolve, reject) => {
    wx.startWifi({
      success: resolve,
      fail: reject,
    });
  });
}

function getConnectedWifiInfo() {
  return new Promise((resolve, reject) => {
    wx.getConnectedWifi({
      success: (res) => resolve(res && res.wifi ? res.wifi : null),
      fail: reject,
    });
  });
}

function ensureLocationPermission() {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success: ({ authSetting = {} }) => {
        const authState = authSetting['scope.userLocation'];

        if (authState === true) {
          resolve();
          return;
        }

        if (authState === false) {
          wx.openSetting({
            success: (res) => {
              if (res.authSetting && res.authSetting['scope.userLocation']) {
                resolve();
                return;
              }
              reject({ errCode: 12007 });
            },
            fail: reject,
          });
          return;
        }

        wx.authorize({
          scope: 'scope.userLocation',
          success: resolve,
          fail: () => reject({ errCode: 12007 }),
        });
      },
      fail: reject,
    });
  });
}

function scanNearbyWifi() {
  return ensureLocationPermission().then(
    () =>
      new Promise((resolve, reject) => {
        const handleResult = (res) => {
          if (wx.offGetWifiList) {
            wx.offGetWifiList(handleResult);
          }
          resolve(normalizeWifiList(res && res.wifiList ? res.wifiList : []));
        };

        if (wx.offGetWifiList) {
          wx.offGetWifiList(handleResult);
        }

        wx.onGetWifiList(handleResult);
        wx.getWifiList({
          success: () => {},
          fail: (error) => {
            if (wx.offGetWifiList) {
              wx.offGetWifiList(handleResult);
            }
            reject(error);
          },
        });
      })
  );
}

export {
  describeWifiError,
  getConnectedWifiInfo,
  initWifiModule,
  normalizeWifiList,
  scanNearbyWifi,
};
```

- [ ] **Step 4: Run the verifier and confirm it passes**

Run:

```bash
node tools/verify-wifi-manager.mjs
```

Expected:

```text
PASS verify-wifi-manager
```

- [ ] **Step 5: Commit**

```bash
git add tools/verify-wifi-manager.mjs miniprogram/utils/wifi-manager.js
git commit -m "feat: add wifi manager helpers"
```

---

### Task 3: Build the WLAN write page and allow binary NFC payloads

**Files:**
- Create: `miniprogram/pages/write-wifi/write-wifi.js`
- Create: `miniprogram/pages/write-wifi/write-wifi.wxml`
- Create: `miniprogram/pages/write-wifi/write-wifi.scss`
- Create: `miniprogram/pages/write-wifi/write-wifi.json`
- Modify: `miniprogram/components/scan-dialog/scan-dialog.js`

- [ ] **Step 1: Write the page smoke checklist before implementation**

```md
1. The page loads even when current Wi-Fi cannot be read.
2. If a current SSID exists, it becomes the default selected network.
3. Tapping "扫描附近 WLAN" triggers permission flow only at that time.
4. Nearby results are deduped and sorted by signal strength.
5. The primary button stays disabled until SSID and password are both present.
6. Opening the scan dialog passes one MIME record with type application/vnd.wfa.wsc.
7. Existing URI-based write pages still write successfully.
```

- [ ] **Step 2: Run the smoke checklist against the unfinished app and confirm the route does not exist yet**

Manual:

1. Open the mini program in WeChat DevTools.
2. Try to navigate to `/pages/write-wifi/write-wifi`.

Expected:

```text
FAIL because the page route is not registered and the page files do not exist yet.
```

- [ ] **Step 3: Implement the page and binary payload support**

```js
// miniprogram/components/scan-dialog/scan-dialog.js
const payload = recordItem.payload instanceof ArrayBuffer
  ? recordItem.payload
  : recordItem.tnf === 1 && recordItem.type === 'U'
    ? encodeNdefUriPayload(recordItem.payload)
    : string2ArrayBuffer(recordItem.payload);
```

```js
// miniprogram/pages/write-wifi/write-wifi.js
import { showPixelToast } from '../../utils/pixel-toast';
import { getNavMetrics } from '../../utils/system-info';
import {
  describeWifiError,
  getConnectedWifiInfo,
  initWifiModule,
  scanNearbyWifi,
} from '../../utils/wifi-manager';
import {
  WIFI_WSC_MIME_TYPE,
  buildWifiConfigPayload,
} from '../../utils/wifi-ndef';

Page({
  data: {
    navHeight: 64,
    currentWifi: null,
    selectedSsid: '',
    nearbyWifiList: [],
    wifiPassword: '',
    scanVisible: false,
    records: [],
    loadingCurrentWifi: true,
    scanningNearbyWifi: false,
    pageHint: '仅支持 WPA2-Personal 网络，请勿用于开放 / WEP / 企业网络。',
  },

  onLoad() {
    const { navHeight } = getNavMetrics();
    this.setData({ navHeight });
    this.bootstrapWifiPage();
  },

  async bootstrapWifiPage() {
    try {
      await initWifiModule();
      const currentWifi = await getConnectedWifiInfo();
      const selectedSsid = currentWifi && currentWifi.SSID ? currentWifi.SSID : '';
      this.setData({
        currentWifi,
        selectedSsid,
        loadingCurrentWifi: false,
      });
    } catch (error) {
      this.setData({ loadingCurrentWifi: false });
      showPixelToast({
        message: describeWifiError(error),
        theme: 'warning',
      });
    }
  },

  async handleScanNearbyWifi() {
    this.setData({ scanningNearbyWifi: true });

    try {
      const nearbyWifiList = await scanNearbyWifi();
      this.setData({ nearbyWifiList, scanningNearbyWifi: false });
    } catch (error) {
      this.setData({ scanningNearbyWifi: false });
      showPixelToast({
        message: describeWifiError(error),
        theme: 'warning',
      });
    }
  },

  handleSelectCurrentWifi() {
    const currentWifi = this.data.currentWifi;
    const ssid = currentWifi && currentWifi.SSID ? currentWifi.SSID : '';
    this.setData({ selectedSsid: ssid });
  },

  handleSelectNearbyWifi(event) {
    const ssid = event.currentTarget.dataset.ssid || '';
    this.setData({ selectedSsid: ssid });
  },

  handlePasswordInput(event) {
    this.setData({ wifiPassword: event.detail.value || '' });
  },

  handleOpenScanDialog() {
    const selectedSsid = (this.data.selectedSsid || '').trim();
    const wifiPassword = (this.data.wifiPassword || '').trim();

    if (!selectedSsid || !wifiPassword) {
      showPixelToast({
        message: '请先选择 WLAN 并输入密码。',
        theme: 'warning',
      });
      return;
    }

    this.setData({
      scanVisible: true,
      records: [
        {
          tnf: 2,
          id: 'wifi',
          type: WIFI_WSC_MIME_TYPE,
          payload: buildWifiConfigPayload({
            ssid: selectedSsid,
            password: wifiPassword,
          }),
        },
      ],
    });
  },

  handleCloseScanDialog() {
    this.setData({
      scanVisible: false,
      records: [],
    });
  },
});
```

```xml
<!-- miniprogram/pages/write-wifi/write-wifi.wxml -->
<pixel-navbar title="写入 WLAN" theme="web" showBack="{{true}}" showHome="{{false}}" />
<pixel-toast id="pixel-toast" />

<view class="write-wifi" style="height: calc(100vh - {{navHeight}}px);">
  <view class="notice">{{pageHint}}</view>

  <view class="field">
    <view class="label">当前 WLAN</view>
    <view
      class="wifi-card {{selectedSsid === currentWifi.SSID ? 'wifi-card--active' : ''}}"
      wx:if="{{currentWifi && currentWifi.SSID}}"
      bindtap="handleSelectCurrentWifi"
    >
      <view class="wifi-name">{{currentWifi.SSID}}</view>
      <view class="wifi-meta">已连接网络，点按可直接使用</view>
    </view>
    <view class="hint" wx:else>当前未读取到已连接 WLAN，可改为扫描附近网络。</view>
  </view>

  <view class="field">
    <button class="btn" bindtap="handleScanNearbyWifi" loading="{{scanningNearbyWifi}}">
      扫描附近 WLAN
    </button>
    <scroll-view class="wifi-list" scroll-y="{{true}}" wx:if="{{nearbyWifiList.length}}">
      <view
        wx:for="{{nearbyWifiList}}"
        wx:key="SSID"
        class="wifi-list__item {{selectedSsid === item.SSID ? 'wifi-list__item--active' : ''}}"
        data-ssid="{{item.SSID}}"
        bindtap="handleSelectNearbyWifi"
      >
        <view class="wifi-name">{{item.SSID}}</view>
        <view class="wifi-meta">信号强度 {{item.signalStrength}}</view>
      </view>
    </scroll-view>
  </view>

  <view class="field">
    <view class="label">Wi-Fi 密码</view>
    <input
      class="box"
      password="{{true}}"
      value="{{wifiPassword}}"
      placeholder="请输入 WLAN 密码"
      bindinput="handlePasswordInput"
    />
  </view>

  <button
    class="primary-btn"
    disabled="{{!selectedSsid || !wifiPassword}}"
    bindtap="handleOpenScanDialog"
  >
    写入 NFC 标签
  </button>
</view>

<scan-dialog visible="{{scanVisible}}" records="{{records}}" bind:close="handleCloseScanDialog" />
```

```json
// miniprogram/pages/write-wifi/write-wifi.json
{
  "navigationStyle": "custom",
  "usingComponents": {
    "pixel-navbar": "/components/pixel-navbar/pixel-navbar",
    "pixel-toast": "/components/pixel-toast/pixel-toast",
    "scan-dialog": "/components/scan-dialog/scan-dialog"
  }
}
```

```scss
@import "../../styles/variables.scss";

.write-wifi {
  box-sizing: border-box;
  padding: $spacing-md $spacing-sm;
  padding-bottom: 90px;
  background: $color-paper;
  overflow: hidden;
}

.notice {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fff3bf;
  border: $border-width-sm solid $color-ink;
  box-shadow: $shadow-sm;
  font-size: 11px;
  line-height: 1.6;
}

.wifi-card,
.wifi-list__item,
.box {
  width: 100%;
  padding: 10px 12px;
  background: $color-paper-2;
  border: $border-width-sm solid $color-ink;
  box-shadow: $shadow-inset, $shadow-sm;
  box-sizing: border-box;
}

.wifi-card--active,
.wifi-list__item--active {
  background: #d4efc8;
}

.wifi-list {
  max-height: 220px;
  margin-top: 10px;
}
```

- [ ] **Step 4: Run the smoke checklist and confirm the page works**

Manual:

1. Open `/pages/write-wifi/write-wifi` in WeChat DevTools on an Android-capable profile/device.
2. Verify current SSID prefill behavior.
3. Trigger nearby scan and verify the list appears after permission.
4. Enter a password and confirm the primary action becomes enabled.
5. Open the scan dialog and confirm the dialog enters the waiting state.
6. Re-open `write-web` and confirm URL writes still work.

Expected:

```text
PASS for all seven checklist items from Step 1.
```

- [ ] **Step 5: Commit**

```bash
git add miniprogram/components/scan-dialog/scan-dialog.js miniprogram/pages/write-wifi/write-wifi.js miniprogram/pages/write-wifi/write-wifi.wxml miniprogram/pages/write-wifi/write-wifi.scss miniprogram/pages/write-wifi/write-wifi.json
git commit -m "feat: add wlan nfc write page"
```

---

### Task 4: Register the route, add the menu entry, and document the feature

**Files:**
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/pages/write-menu/write-menu.js`
- Modify: `miniprogram/pages/write-menu/write-menu.wxml`
- Modify: `miniprogram/pages/write-menu/write-menu.scss`
- Modify: `README.md`

- [ ] **Step 1: Write the failing integration checklist**

```md
1. The write menu shows a new WLAN card.
2. Tapping the card uses the existing NFC support gate.
3. The new route exists in app.json.
4. README mentions Android-only WLAN NFC writing and the WPA2-Personal limitation.
```

- [ ] **Step 2: Confirm the checklist currently fails before registration**

Manual:

1. Open the current write menu.
2. Confirm there is no WLAN card yet.

Expected:

```text
FAIL because the menu still only shows app, music, web, and local media.
```

- [ ] **Step 3: Register the route and add the menu entry**

```json
// miniprogram/app.json
{
  "pages": [
    "pages/write-menu/write-menu",
    "pages/my-files/my-files",
    "pages/write-app/write-app",
    "pages/write-music/write-music",
    "pages/write-web/write-web",
    "pages/write-wifi/write-wifi",
    "pages/write-local-media/write-local-media"
  ],
  "permission": {
    "scope.userLocation": {
      "desc": "Used to scan nearby WLANs before writing Wi-Fi credentials to NFC"
    }
  }
}
```

```js
// miniprogram/pages/write-menu/write-menu.js
handleWriteWifi() {
  if (!this.ensureNfcSupport()) {
    return;
  }

  wx.navigateTo({
    url: `${ROOT_PAGE_PREFIX}/write-wifi/write-wifi`,
  });
},
```

```xml
<!-- miniprogram/pages/write-menu/write-menu.wxml -->
<view class="card card--blue card--pixel-cut home-sub" bindtap="handleWriteWifi">
  <view class="card__bite card__bite--tl"></view>
  <view class="row">
    <view class="home-sub__visual">
      <pixel-icon name="nfc" size="48" />
    </view>
    <view class="body">
      <view class="card__title">WLAN 专区</view>
      <view class="meta">自动带出当前网络，或扫描附近 WLAN，再把配网信息写入 NFC。</view>
    </view>
  </view>
</view>
```

```scss
// miniprogram/pages/write-menu/write-menu.scss
.card--blue {
  background: linear-gradient(180deg, #cfe2ff 0%, #b9d0f2 100%);
}
```

```md
<!-- README.md -->
- 新增 `WLAN` NFC 写入能力（Android 目标场景）
- 支持读取当前连接 WLAN，并按需扫描附近 WLAN
- 当前版本聚焦 `WPA2-Personal`，不支持开放 / WEP / 企业网络
```

- [ ] **Step 4: Run the integration checklist and device QA**

Manual:

1. Open the write menu and confirm the WLAN card appears.
2. Tap the card and confirm it opens the WLAN page.
3. Complete one successful tag write on Android.
4. Tap the tag with another Android phone and confirm the system Wi-Fi flow opens for the written SSID.

Expected:

```text
PASS for all four integration checks.
```

- [ ] **Step 5: Commit**

```bash
git add miniprogram/app.json miniprogram/pages/write-menu/write-menu.js miniprogram/pages/write-menu/write-menu.wxml miniprogram/pages/write-menu/write-menu.scss README.md
git commit -m "feat: expose wlan nfc write flow"
```

---

## Self-Review Notes

- The plan covers all approved scope items from the spec:
  - new WLAN entry
  - current Wi-Fi prefill
  - nearby scan on demand
  - one-shot password input
  - `application/vnd.wfa.wsc` record writing
  - Android-focused copy and QA
- The plan intentionally excludes hidden/open/WEP/enterprise support to match the approved scope.
- The plan keeps the most fragile behavior in pure helper modules with lightweight Node verification scripts so execution can stay incremental even without an existing mini program test framework.
