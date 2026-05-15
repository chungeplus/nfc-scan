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
  { SSID: '', signalStrength: 99 },
]);

assert.deepEqual(
  normalized.map((item) => [item.SSID, item.signalStrength]),
  [
    ['Office', 88],
    ['Cafe', 72],
  ]
);

assert.match(describeWifiError({ errCode: 12006 }), /GPS|定位/);
assert.match(describeWifiError({ errCode: 12007 }), /权限|位置/);
assert.match(describeWifiError({}, { platform: 'devtools' }), /开发者工具|真机|devtools/i);

console.log('PASS verify-wifi-manager');
