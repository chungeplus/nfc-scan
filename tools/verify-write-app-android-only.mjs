import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [jsSource, wxmlSource] = await Promise.all([
  fs.readFile(
    new URL('../miniprogram/pages/write-app/write-app.ts', import.meta.url),
    'utf8'
  ),
  fs.readFile(
    new URL('../miniprogram/pages/write-app/write-app.wxml', import.meta.url),
    'utf8'
  ),
]);

assert.doesNotMatch(wxmlSource, /data-platform="ios"/);
assert.doesNotMatch(wxmlSource, />iOS</);
assert.doesNotMatch(jsSource, /iosChipClass/);
assert.doesNotMatch(jsSource, /handleSelectPlatform/);
assert.doesNotMatch(jsSource, /platform === 'ios'/);
assert.doesNotMatch(jsSource, /iOS 直达能力暂未接入/);
assert.match(jsSource, /type:\s*'android\.com:pkg'/);
assert.match(jsSource, /canWrite:\s*Boolean\(packageName\)\s*&&\s*!packageError/);

console.log('PASS verify-write-app-android-only');
