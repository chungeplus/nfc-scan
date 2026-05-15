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

assert.match(wxmlSource, /status-banner/);
assert.doesNotMatch(wxmlSource, /<pixel-toast/i);
assert.doesNotMatch(jsSource, /showPixelToast/);

console.log('PASS verify-write-wifi-page');
