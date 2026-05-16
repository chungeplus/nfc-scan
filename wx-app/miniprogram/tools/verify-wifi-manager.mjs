import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

const source = await fs.readFile(
  new URL('../utils/wifi-manager.ts', import.meta.url),
  'utf8'
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(transpiled)}`;
const {
  describeWifiError,
  getWifiScanIssue,
  normalizeWifiList,
  shouldShowConnectedWifiError,
} = await import(moduleUrl);

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
assert.match(
  describeWifiError(
    { errCode: 12010, errMsg: 'system internal error: gps not turned on' },
    {},
    { context: 'scan' }
  ),
  /GPS|定位/
);
assert.match(
  describeWifiError({ errMsg: 'getConnectedWifi:fail wifi not turned on' }),
  /Wi-Fi/
);
assert.match(
  describeWifiError({}, { platform: 'devtools' }),
  /开发者工具|真机|devtools/i
);
assert.equal(describeWifiError({}, {}, { context: 'current' }), '');
assert.match(
  describeWifiError({}, {}, { context: 'scan' }),
  /扫描失败|Wi-Fi|定位|权限/
);

assert.deepEqual(
  getWifiScanIssue({
    systemSetting: { wifiEnabled: false, locationEnabled: true },
    appAuthorizeSetting: { locationAuthorized: 'authorized' },
  }),
  {
    code: 'wifi_disabled',
    message: '请先打开手机 Wi-Fi 开关后再重试。',
  }
);
assert.deepEqual(
  getWifiScanIssue({
    systemSetting: { wifiEnabled: true, locationEnabled: false },
    appAuthorizeSetting: { locationAuthorized: 'authorized' },
  }),
  {
    code: 'location_disabled',
    message: '请先打开手机定位/GPS 开关后再扫描附近 WLAN。',
  }
);
assert.deepEqual(
  getWifiScanIssue({
    systemSetting: { wifiEnabled: true, locationEnabled: true },
    appAuthorizeSetting: { locationAuthorized: 'denied' },
  }),
  {
    code: 'app_location_denied',
    message: '请在系统设置中允许微信使用定位。',
    action: 'open_app_authorize_setting',
  }
);

assert.equal(shouldShowConnectedWifiError({}), false);
assert.equal(shouldShowConnectedWifiError({ errCode: 12005 }), true);
assert.equal(
  shouldShowConnectedWifiError({ errCode: 12010, errMsg: 'system internal error: gps not turned on' }),
  true
);
assert.equal(
  shouldShowConnectedWifiError({ errCode: 12010, errMsg: 'system internal error' }),
  false
);
assert.equal(shouldShowConnectedWifiError({ errMsg: 'unexpected failure' }), false);

console.log('PASS verify-wifi-manager');
