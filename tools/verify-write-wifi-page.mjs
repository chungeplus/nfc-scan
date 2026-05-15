import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [wxmlSource, jsSource] = await Promise.all([
  fs.readFile(
    new URL('../miniprogram/pages/write-wifi/write-wifi.wxml', import.meta.url),
    'utf8'
  ),
  fs.readFile(
    new URL('../miniprogram/pages/write-wifi/write-wifi.js', import.meta.url),
    'utf8'
  ),
]);

assert.doesNotMatch(wxmlSource, /status-banner/);
assert.match(wxmlSource, /box--select/);
assert.match(wxmlSource, /picker-preview/);
assert.match(wxmlSource, /picker-preview__list/);
assert.match(wxmlSource, /password-box__toggle/);
assert.doesNotMatch(wxmlSource, /support-chip/);
assert.doesNotMatch(wxmlSource, /box__meta/);
assert.doesNotMatch(wxmlSource, /picker-preview__badge/);
assert.doesNotMatch(wxmlSource, /picker-preview__signal/);
assert.doesNotMatch(jsSource, /pageHint/);
assert.doesNotMatch(jsSource, /寮€鍙戣€呭伐鍏峰彲鑳借涓嶅埌鐪熷疄 WLAN/);
assert.match(jsSource, /pickerVisible/);
assert.match(jsSource, /pendingSelectedSsid/);
assert.match(jsSource, /pickerWifiList/);
assert.match(jsSource, /handleOpenPicker/);
assert.match(jsSource, /handleRefreshNearbyWifi/);
assert.match(jsSource, /handleConfirmWifiSelection/);
assert.match(jsSource, /handleOpenWechatLocationSetting/);
assert.match(jsSource, /handleTogglePassword/);
assert.match(jsSource, /showPassword/);
assert.match(jsSource, /formMessage/);
assert.doesNotMatch(wxmlSource, /wifi-list__item/);
assert.doesNotMatch(jsSource, /handleSelectNearbyWifi/);
assert.doesNotMatch(jsSource, /handleSelectCurrentWifi/);
assert.doesNotMatch(wxmlSource, /<pixel-toast/i);
assert.doesNotMatch(jsSource, /statusMessage/);

console.log('PASS verify-write-wifi-page');
