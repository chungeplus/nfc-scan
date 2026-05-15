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
assert.match(jsSource, /pickerVisible/);
assert.match(jsSource, /pendingSelectedSsid/);
assert.match(jsSource, /pickerWifiList/);
assert.match(jsSource, /handleOpenPicker/);
assert.match(jsSource, /handleRefreshNearbyWifi/);
assert.match(jsSource, /handleConfirmWifiSelection/);
assert.match(jsSource, /handleOpenWechatLocationSetting/);
assert.match(jsSource, /formMessage/);
assert.doesNotMatch(wxmlSource, /wifi-list__item/);
assert.doesNotMatch(jsSource, /handleSelectNearbyWifi/);
assert.doesNotMatch(jsSource, /handleSelectCurrentWifi/);
assert.doesNotMatch(wxmlSource, /<pixel-toast/i);
assert.doesNotMatch(jsSource, /statusMessage/);

console.log('PASS verify-write-wifi-page');
