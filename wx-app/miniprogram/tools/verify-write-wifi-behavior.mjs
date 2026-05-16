import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';

const sourcePath = new URL('../pages/write-wifi/write-wifi.ts', import.meta.url);
const rawSource = await fs.readFile(sourcePath, 'utf8');

function stripImports(source) {
  return source
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];\s*/g, '')
    .replace(/import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];\s*/g, '');
}

function createPageHarness(stubs = {}) {
  let capturedPage = null;
  const context = {
    Page(config) {
      capturedPage = config;
    },
    ...stubs,
  };

  const transpiled = ts.transpileModule(stripImports(rawSource), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  vm.runInNewContext(transpiled, context, {
    filename: sourcePath.pathname,
  });

  assert.ok(capturedPage, 'Page config should be captured');

  return function instantiatePage() {
    const page = {
      ...capturedPage,
      data: JSON.parse(JSON.stringify(capturedPage.data || {})),
      setData(update, callback) {
        this.data = {
          ...this.data,
          ...update,
        };

        if (typeof callback === 'function') {
          callback.call(this);
        }
      },
    };

    Object.keys(capturedPage).forEach((key) => {
      if (typeof capturedPage[key] === 'function') {
        page[key] = capturedPage[key].bind(page);
      }
    });

    return page;
  };
}

{
  const createPage = createPageHarness({
    getNavMetrics: () => ({ navHeight: 64 }),
    describeWifiError: () => 'error',
    getConnectedWifiInfo: async () => null,
    getWifiRuntime: () => ({ platform: 'android' }),
    initWifiModule: async () => {},
    openWifiAppAuthorizeSetting: async () => true,
    readWifiScanIssue: () => null,
    scanNearbyWifi: async () => [{ SSID: 'Wifi-B' }],
    WIFI_WSC_MIME_TYPE: 'application/vnd.wfa.wsc',
    buildWifiConfigPayload: () => new Uint8Array(),
  });
  const page = createPage();

  page.setData({
    selectedSsid: 'Wifi-A',
    pendingSelectedSsid: 'Wifi-B',
    nearbyWifiList: [{ SSID: 'Wifi-B' }],
  });
  page.syncPickerWifiList('Wifi-B');

  assert.match(page.data.pickerWifiList[0].className, /motion-scan-lock/);

  page.handleConfirmWifiSelection();
  assert.equal(page.data.selectedSsid, 'Wifi-B');
  assert.doesNotMatch(page.data.pickerWifiList[0].className, /motion-scan-lock/);
}

{
  const createPage = createPageHarness({
    getNavMetrics: () => ({ navHeight: 64 }),
    describeWifiError: () => 'error',
    getConnectedWifiInfo: async () => null,
    getWifiRuntime: () => ({ platform: 'android' }),
    initWifiModule: async () => {},
    openWifiAppAuthorizeSetting: async () => true,
    readWifiScanIssue: () => null,
    scanNearbyWifi: async () => [],
    WIFI_WSC_MIME_TYPE: 'application/vnd.wfa.wsc',
    buildWifiConfigPayload: () => new Uint8Array(),
  });
  const page = createPage();

  page.setData({
    selectedSsid: 'Wifi-A',
    pendingSelectedSsid: 'Wifi-B',
    nearbyWifiList: [
      { SSID: 'Wifi-B' },
      { SSID: 'Wifi-B' },
      { SSID: 'Wifi-C' },
    ],
  });
  page.syncPickerWifiList('Wifi-B');

  assert.deepEqual(
    JSON.parse(JSON.stringify(page.data.pickerWifiList.map((item) => item.SSID))),
    ['Wifi-B', 'Wifi-C']
  );
  assert.equal(
    page.data.pickerWifiList.filter((item) => item.SSID === 'Wifi-B').length,
    1
  );
}

{
  const createPage = createPageHarness({
    getNavMetrics: () => ({ navHeight: 64 }),
    describeWifiError: () => 'error',
    getConnectedWifiInfo: async () => ({ SSID: 'CurrentWifi' }),
    getWifiRuntime: () => ({ platform: 'android' }),
    initWifiModule: async () => {},
    openWifiAppAuthorizeSetting: async () => true,
    readWifiScanIssue: () => null,
    scanNearbyWifi: async () => [],
    shouldShowConnectedWifiError: () => true,
    WIFI_WSC_MIME_TYPE: 'application/vnd.wfa.wsc',
    buildWifiConfigPayload: () => new Uint8Array(),
  });
  const page = createPage();

  await page.bootstrapWifiPage();

  assert.equal(page.data.selectedSsid, 'CurrentWifi');
  assert.equal(page.data.pendingSelectedSsid, 'CurrentWifi');
}

{
  let resolveCurrentWifi;
  const currentWifiPromise = new Promise((resolve) => {
    resolveCurrentWifi = resolve;
  });
  const createPage = createPageHarness({
    getNavMetrics: () => ({ navHeight: 64 }),
    describeWifiError: () => 'error',
    getConnectedWifiInfo: () => currentWifiPromise,
    getWifiRuntime: () => ({ platform: 'android' }),
    initWifiModule: async () => {},
    openWifiAppAuthorizeSetting: async () => true,
    readWifiScanIssue: () => null,
    scanNearbyWifi: async () => [],
    shouldShowConnectedWifiError: () => true,
    WIFI_WSC_MIME_TYPE: 'application/vnd.wfa.wsc',
    buildWifiConfigPayload: () => new Uint8Array(),
  });
  const page = createPage();

  const pendingBootstrap = page.bootstrapWifiPage();
  page.setData({
    selectedSsid: 'ManualWifi',
    pendingSelectedSsid: 'ManualWifi',
    pickerVisible: true,
  });
  resolveCurrentWifi({ SSID: 'CurrentWifi' });
  await pendingBootstrap;

  assert.equal(page.data.selectedSsid, 'ManualWifi');
  assert.equal(page.data.pendingSelectedSsid, 'ManualWifi');
}

{
  const createPage = createPageHarness({
    getNavMetrics: () => ({ navHeight: 64 }),
    describeWifiError: () => 'error',
    getConnectedWifiInfo: async () => null,
    getWifiRuntime: () => ({ platform: 'android' }),
    initWifiModule: async () => {},
    openWifiAppAuthorizeSetting: async () => true,
    readWifiScanIssue: () => null,
    scanNearbyWifi: async () => [],
    shouldShowConnectedWifiError: () => true,
    WIFI_WSC_MIME_TYPE: 'application/vnd.wfa.wsc',
    buildWifiConfigPayload: () => new Uint8Array(),
  });
  const page = createPage();

  page.setData({
    selectedSsid: 'Wifi-A',
    pendingSelectedSsid: 'Wifi-B',
    wifiPassword: 'old-password',
    pickerVisible: true,
  });
  page.handleConfirmWifiSelection();

  assert.equal(page.data.selectedSsid, 'Wifi-B');
  assert.equal(page.data.wifiPassword, '');
}

{
  const createPage = createPageHarness({
    getNavMetrics: () => ({ navHeight: 64 }),
    describeWifiError: () => 'error',
    getConnectedWifiInfo: async () => null,
    getWifiRuntime: () => ({ platform: 'android' }),
    initWifiModule: async () => {},
    openWifiAppAuthorizeSetting: async () => true,
    readWifiScanIssue: () => null,
    scanNearbyWifi: async () => [],
    WIFI_WSC_MIME_TYPE: 'application/vnd.wfa.wsc',
    buildWifiConfigPayload: () => new Uint8Array(),
  });
  const page = createPage();

  assert.equal(page.data.showPassword, false);
  page.setData({
    selectedSsid: 'Wifi-A',
  });

  page.handleTogglePassword();
  assert.equal(page.data.showPassword, true);

  page.handleTogglePassword();
  assert.equal(page.data.showPassword, false);
}

{
  const createPage = createPageHarness({
    getNavMetrics: () => ({ navHeight: 64 }),
    describeWifiError: () => 'error',
    getConnectedWifiInfo: async () => null,
    getWifiRuntime: () => ({ platform: 'android' }),
    initWifiModule: async () => {},
    openWifiAppAuthorizeSetting: async () => true,
    readWifiScanIssue: () => null,
    scanNearbyWifi: async () => [],
    WIFI_WSC_MIME_TYPE: 'application/vnd.wfa.wsc',
    buildWifiConfigPayload: () => new Uint8Array(),
  });
  const page = createPage();

  page.setData({
    selectedSsid: 'Wifi-A',
    pendingSelectedSsid: 'Wifi-B',
    wifiPassword: 'old-password',
    showPassword: true,
    pickerVisible: true,
  });
  page.handleConfirmWifiSelection();

  assert.equal(page.data.showPassword, false);
}

{
  const typeBuffer = new Uint8Array([0xaa, 0xbb]).buffer;
  const payloadBuffer = new Uint8Array([0x10, 0x0e]).buffer;
  const toHex = (buffer) =>
    Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  const createPage = createPageHarness({
    getNavMetrics: () => ({ navHeight: 64 }),
    describeWifiError: () => 'error',
    getConnectedWifiInfo: async () => null,
    getWifiRuntime: () => ({ platform: 'android' }),
    initWifiModule: async () => {},
    openWifiAppAuthorizeSetting: async () => true,
    readWifiScanIssue: () => null,
    scanNearbyWifi: async () => [],
    string2ArrayBuffer: () => typeBuffer,
    arrayBufferToHex: toHex,
    WIFI_WSC_MIME_TYPE: 'application/vnd.wfa.wsc',
    buildWifiConfigPayload: () => payloadBuffer,
  });
  const page = createPage();

  page.setData({
    selectedSsid: 'Wifi-A',
    wifiPassword: 'Pixel12345678',
  });
  page.handleOpenScanDialog();

  assert.equal(page.data.scanVisible, true);
  assert.equal(page.data.records.length, 0);
  assert.equal(page.data.writeRequest.recordStrategy, 'documented-records');
  assert.deepEqual(JSON.parse(JSON.stringify(page.data.writeRequest.records)), [
    {
      idHex: '',
      typeHex: 'aabb',
      payloadHex: '100e',
    },
  ]);
}

{
  const firstTypeBuffer = new Uint8Array([0xaa, 0xbb]).buffer;
  const payloadBySsid = {
    'Wifi-A': new Uint8Array([0x10, 0x0e]).buffer,
    'Wifi-B': new Uint8Array([0x20, 0x0f]).buffer,
  };
  const toHex = (buffer) =>
    Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  const createPage = createPageHarness({
    getNavMetrics: () => ({ navHeight: 64 }),
    describeWifiError: () => 'error',
    getConnectedWifiInfo: async () => null,
    getWifiRuntime: () => ({ platform: 'android' }),
    initWifiModule: async () => {},
    openWifiAppAuthorizeSetting: async () => true,
    readWifiScanIssue: () => null,
    scanNearbyWifi: async () => [],
    string2ArrayBuffer: () => firstTypeBuffer,
    arrayBufferToHex: toHex,
    WIFI_WSC_MIME_TYPE: 'application/vnd.wfa.wsc',
    buildWifiConfigPayload: ({ ssid }) => payloadBySsid[ssid],
  });
  const page = createPage();

  page.setData({
    selectedSsid: 'Wifi-A',
    wifiPassword: 'Pixel12345678',
  });
  page.handleOpenScanDialog();

  const firstRequest = JSON.parse(JSON.stringify(page.data.writeRequest));

  page.setData({
    selectedSsid: 'Wifi-B',
    wifiPassword: 'Pixel87654321',
    writeRequest: {
      recordStrategy: 'documented-records',
      records: [
        {
          idHex: 'stale-id',
          typeHex: 'stale-type',
          payloadHex: 'stale-payload',
        },
      ],
    },
  });
  page.handleOpenScanDialog();

  assert.notDeepEqual(
    JSON.parse(JSON.stringify(page.data.writeRequest)),
    firstRequest
  );
  assert.deepEqual(JSON.parse(JSON.stringify(page.data.writeRequest)), {
    recordStrategy: 'documented-records',
    records: [
      {
        idHex: '',
        typeHex: 'aabb',
        payloadHex: '200f',
      },
    ],
  });
}

{
  const typeBuffer = new Uint8Array([0xaa, 0xbb]).buffer;
  const payloadBuffer = new Uint8Array([0x30, 0x1f]).buffer;
  const toHex = (buffer) =>
    Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  const capturedPayloadInputs = [];
  const createPage = createPageHarness({
    getNavMetrics: () => ({ navHeight: 64 }),
    describeWifiError: () => 'error',
    getConnectedWifiInfo: async () => null,
    getWifiRuntime: () => ({ platform: 'android' }),
    initWifiModule: async () => {},
    openWifiAppAuthorizeSetting: async () => true,
    readWifiScanIssue: () => null,
    scanNearbyWifi: async () => [],
    string2ArrayBuffer: () => typeBuffer,
    arrayBufferToHex: toHex,
    WIFI_WSC_MIME_TYPE: 'application/vnd.wfa.wsc',
    buildWifiConfigPayload: ({ ssid, password }) => {
      capturedPayloadInputs.push({ ssid, password });
      return payloadBuffer;
    },
  });
  const page = createPage();

  page.setData({
    selectedSsid: '  Wifi-A  ',
    wifiPassword: '  Pixel12345678  ',
  });
  page.handleOpenScanDialog();

  assert.deepEqual(JSON.parse(JSON.stringify(capturedPayloadInputs)), [
    {
      ssid: '  Wifi-A  ',
      password: '  Pixel12345678  ',
    },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(page.data.writeRequest)), {
    recordStrategy: 'documented-records',
    records: [
      {
        idHex: '',
        typeHex: 'aabb',
        payloadHex: '301f',
      },
    ],
  });
}

console.log('PASS verify-write-wifi-behavior');
