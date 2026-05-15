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
assert.match(wxmlSource, /field__error/);
assert.match(jsSource, /currentWifiMessage/);
assert.match(jsSource, /nearbyWifiMessage/);
assert.match(jsSource, /formMessage/);
assert.doesNotMatch(wxmlSource, /<pixel-toast/i);
assert.doesNotMatch(jsSource, /statusMessage/);

console.log('PASS verify-write-wifi-page');
