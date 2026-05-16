import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [wxmlSource, jsSource, scssSource] = await Promise.all([
  fs.readFile(
    new URL('../pages/write-wifi/write-wifi.wxml', import.meta.url),
    'utf8'
  ),
  fs.readFile(
    new URL('../pages/write-wifi/write-wifi.ts', import.meta.url),
    'utf8'
  ),
  fs.readFile(
    new URL('../pages/write-wifi/write-wifi.scss', import.meta.url),
    'utf8'
  ),
]);

assert.doesNotMatch(wxmlSource, /status-banner/);
assert.match(wxmlSource, /box--select/);
assert.match(wxmlSource, /picker-preview/);
assert.match(wxmlSource, /picker-preview__list/);
assert.match(wxmlSource, /password-box__toggle/);
assert.match(wxmlSource, /picker-preview__title-sweep\s+motion-scan-sweep/);
assert.match(wxmlSource, /picker-preview__refresh--scanning\s+motion-scan-processing/);
assert.match(wxmlSource, /writeRequest="\{\{writeRequest\}\}"/);
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
assert.match(jsSource, /motion-scan-lock/);
assert.doesNotMatch(wxmlSource, /wifi-list__item/);
assert.doesNotMatch(jsSource, /handleSelectNearbyWifi/);
assert.doesNotMatch(jsSource, /handleSelectCurrentWifi/);
assert.doesNotMatch(wxmlSource, /<pixel-toast/i);
assert.doesNotMatch(jsSource, /statusMessage/);
assert.match(scssSource, /\$wifi-field-height:\s*52px;/);
assert.match(scssSource, /\.box\s*\{[\s\S]*height:\s*\$wifi-field-height;/);
assert.match(scssSource, /\.password-box__toggle\s*\{[\s\S]*width:\s*30px;[\s\S]*height:\s*30px;/);
assert.match(scssSource, /\.picker-preview__title-shell/);
assert.match(scssSource, /\.picker-preview__refresh--scanning/);
assert.match(scssSource, /(?:\.picker-preview__item|&)--active/);
assert.doesNotMatch(wxmlSource, /class="password-box__toggle[^"]*motion-scan-/);
assert.doesNotMatch(wxmlSource, /class="box password-box[^"]*motion-scan-/);

console.log('PASS verify-write-wifi-page');
