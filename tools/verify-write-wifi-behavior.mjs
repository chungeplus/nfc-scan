import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const sourcePath = new URL('../miniprogram/pages/write-wifi/write-wifi.js', import.meta.url);
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

  vm.runInNewContext(stripImports(rawSource), context, {
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

console.log('PASS verify-write-wifi-behavior');
